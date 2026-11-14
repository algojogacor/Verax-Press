// POST /api/internal/v1/ai-submissions: Internal Content Ingestion API (Fase 3).
//
// - Autentikasi: `Authorization: Bearer <CLIENT_ID>.<CLIENT_SECRET>` - scope "submit" ONLY.
// - TIDAK ADA endpoint publish untuk API client di seluruh aplikasi.
// - Wajib: aiInvolvement, idempotencyKey, desk aktif, format naskah valid, sumber ber-URL.
// - Idempotent: key sama + payload sama → receipt sama (200); key sama + payload beda → 409.
// - Status awal artikel selalu DRAFT; sumber selalu masuk berstatus UNVERIFIED.
// - Dilengkapi pencatatan log permintaan, korelasi Request ID, dan durasi eksekusi.

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { verifyApiClientDetailed } from "@/lib/api-key";
import { getClientIp, rateLimit, sweepRateLimits, checkNewsDailyRateLimit } from "@/lib/rate-limit";
import { AI_PLACEHOLDER_BYLINE } from "@/lib/domain/constants";
import { writeAudit } from "@/lib/domain/audit";
import { serializeContent } from "@/lib/domain/content";
import { uniqueArticleSlug } from "@/lib/domain/slug";
import { createArticleVersion } from "@/lib/domain/serializers";
import {
  parseOptionalIsoDate,
  validateIngestionPayload,
} from "@/lib/domain/ingestion";
import { searchStockPhoto, type StockPhotoResult } from "@/lib/stock-photos";
import { generateRequestId, logApiRequest } from "@/lib/request-logger";

export async function POST(request: Request) {
  const startTime = Date.now();
  const requestId = request.headers.get("x-request-id") || generateRequestId();
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get("user-agent");

  try {
    sweepRateLimits();

    // 1. Pembatasan laju permintaan SEBELUM autentikasi (12 req/menit per IP)
    // Mencegah brute-force token tak terbatas oleh pemanggil tak terautentikasi.
    const limit = rateLimit(`ingest:${ipAddress}`, 12, 60_000);
    if (!limit.allowed) {
      const durationMs = Date.now() - startTime;
      await logApiRequest({
        requestId,
        method: "POST",
        endpoint: "/api/internal/v1/ai-submissions",
        statusCode: 429,
        durationMs,
        ipAddress,
        userAgent,
        errorCode: "RATE_LIMITED",
        errorMessage: "Terlalu banyak submission.",
      });

      return NextResponse.json(
        {
          error: "Batas laju permintaan terlampaui. Silakan coba kembali setelah jeda waktu yang ditentukan.",
          code: "RATE_LIMITED",
          requestId,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(limit.retryAfterSeconds),
            "x-request-id": requestId,
          },
        },
      );
    }

    // 2. Autentikasi API client (scope submit-only)
    const proxyToken = request.headers.get("x-verax-proxy-token");
    const proxyClientId = request.headers.get("x-verax-proxy-client-id");
    const authRes = await verifyApiClientDetailed(request.headers.get("authorization"), proxyToken, proxyClientId);
    if (!authRes.client) {
      const durationMs = Date.now() - startTime;
      const errorCode = authRes.errorCode || "UNAUTHORIZED";
      const errorMessage = authRes.errorMessage || "Kredensial API client tidak valid.";
      await logApiRequest({
        requestId,
        method: "POST",
        endpoint: "/api/internal/v1/ai-submissions",
        statusCode: 401,
        durationMs,
        ipAddress,
        userAgent,
        errorCode,
        errorMessage,
      });

      return NextResponse.json(
        {
          error: errorMessage,
          code: errorCode,
          requestId,
        },
        {
          status: 401,
          headers: { "x-request-id": requestId },
        },
      );
    }
    const client = authRes.client;

    // 3. Baca dan parsing JSON
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      const durationMs = Date.now() - startTime;
      await logApiRequest({
        requestId,
        apiClientId: client.id,
        method: "POST",
        endpoint: "/api/internal/v1/ai-submissions",
        statusCode: 400,
        durationMs,
        ipAddress,
        userAgent,
        errorCode: "MALFORMED_JSON",
        errorMessage: "Format JSON tidak terbaca.",
      });

      return NextResponse.json(
        {
          error: "Payload harus berupa JSON yang valid.",
          code: "MALFORMED_JSON",
          requestId,
        },
        {
          status: 400,
          headers: { "x-request-id": requestId },
        },
      );
    }

    // 4. Validasi payload komprehensif
    const validation = await validateIngestionPayload(rawBody);
    if (!validation.valid) {
      const durationMs = Date.now() - startTime;
      await logApiRequest({
        requestId,
        apiClientId: client.id,
        method: "POST",
        endpoint: "/api/internal/v1/ai-submissions",
        statusCode: 422,
        durationMs,
        ipAddress,
        userAgent,
        errorCode: validation.code,
        errorMessage: validation.error,
      });

      return NextResponse.json(
        {
          error: validation.error,
          code: validation.code,
          details: validation.details,
          requestId,
        },
        {
          status: 422,
          headers: { "x-request-id": requestId },
        },
      );
    }

    const { payload, desk } = validation;

    // 5. Idempotency Check
    const payloadForHash = { ...payload };
    delete (payloadForHash as { idempotencyKey?: string }).idempotencyKey;
    const payloadHash = createHash("sha256").update(JSON.stringify(payloadForHash)).digest("hex");

    const existing = await db.submission.findUnique({
      where: {
        apiClientId_idempotencyKey: {
          apiClientId: client.id,
          idempotencyKey: payload.idempotencyKey,
        },
      },
      include: {
        article: {
          select: { status: true },
        },
      },
    });

    if (existing) {
      if (existing.payloadHash === payloadHash) {
        // Replay idempotent: kembalikan receipt yang sama persis
        const durationMs = Date.now() - startTime;
        await logApiRequest({
          requestId,
          apiClientId: client.id,
          method: "POST",
          endpoint: "/api/internal/v1/ai-submissions",
          statusCode: 200,
          durationMs,
          ipAddress,
          userAgent,
          submissionId: existing.id,
        });

        const isExistingPublished = existing.article.status === "PUBLISHED";
        return NextResponse.json(
          {
            submissionId: existing.id,
            articleId: existing.articleId,
            submissionStatus: existing.status,
            articleStatus: existing.article.status,
            status: existing.status,
            received: true,
            receivedAt: existing.submittedAt.toISOString(),
            idempotentReplay: true,
            ...(isExistingPublished ? { isPublished: true } : {}),
            requestId,
          },
          {
            status: 200,
            headers: { "x-request-id": requestId },
          },
        );
      }

      const durationMs = Date.now() - startTime;
      await logApiRequest({
        requestId,
        apiClientId: client.id,
        method: "POST",
        endpoint: "/api/internal/v1/ai-submissions",
        statusCode: 409,
        durationMs,
        ipAddress,
        userAgent,
        errorCode: "IDEMPOTENCY_CONFLICT",
        errorMessage: "Idempotency key sudah digunakan untuk payload berbeda.",
      });

      return NextResponse.json(
        {
          error: "Idempotency key sudah digunakan sebelumnya untuk payload yang berbeda.",
          code: "IDEMPOTENCY_CONFLICT",
          requestId,
        },
        {
          status: 409,
          headers: { "x-request-id": requestId },
        },
      );
    }

    const isDirectPublish = client.publishMode === "direct";

    // 5a. Validasi khusus mode Direct Publish (Deck wajib diisi)
    if (isDirectPublish && (!payload.deck || payload.deck.trim().length === 0)) {
      const durationMs = Date.now() - startTime;
      await logApiRequest({
        requestId,
        apiClientId: client.id,
        method: "POST",
        endpoint: "/api/internal/v1/ai-submissions",
        statusCode: 422,
        durationMs,
        ipAddress,
        userAgent,
        errorCode: "DECK_REQUIRED",
        errorMessage: "Bidang deck (ringkasan naskah) wajib disertakan untuk submission mode direct publish.",
      });

      return NextResponse.json(
        {
          error: "Bidang deck (ringkasan naskah) wajib disertakan untuk submission mode direct publish.",
          code: "DECK_REQUIRED",
          requestId,
        },
        {
          status: 422,
          headers: { "x-request-id": requestId },
        },
      );
    }

    // 5b. Pembatasan kuota harian khusus format NEWS (maksimal 5 naskah per hari per akun)
    if (payload.format === "NEWS") {
      const newsLimit = checkNewsDailyRateLimit(client.id);
      if (!newsLimit.allowed) {
        const durationMs = Date.now() - startTime;
        await logApiRequest({
          requestId,
          apiClientId: client.id,
          method: "POST",
          endpoint: "/api/internal/v1/ai-submissions",
          statusCode: 429,
          durationMs,
          ipAddress,
          userAgent,
          errorCode: "RATE_LIMITED",
          errorMessage: "Batas kuota harian submission format NEWS terlampaui.",
        });

        return NextResponse.json(
          {
            error: "Batas kuota harian submission format NEWS terlampaui. Format NEWS dibatasi maksimal 5 naskah per hari per akun.",
            code: "RATE_LIMITED",
            reason: "NEWS_DAILY_LIMIT_EXCEEDED",
            requestId,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(newsLimit.retryAfterSeconds),
              "x-request-id": requestId,
            },
          },
        );
      }
    }

    // 5c. Verifikasi sumber naskah (HTTP Check jika mode direct publish)
    interface ProcessedSource {
      title: string;
      publisher?: string | null;
      url: string;
      sourceType: string;
      publishedAt?: string | null;
      accessedAt?: string | null;
      supports?: string | null;
      isKeySource: boolean;
      verificationStatus: string;
    }

    let sourcesToPersist: ProcessedSource[] = [];

    if (isDirectPublish) {
      const sourceChecks = await Promise.all(
        payload.sources.map(async (source) => {
          if (!source.url) return { source, ok: false };
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            const res = await fetch(source.url, {
              method: "GET",
              redirect: "follow",
              signal: controller.signal,
              headers: {
                "User-Agent": "VeraxPress-SourceVerifier/1.0 (+https://veraxpress.org)",
              },
            });
            clearTimeout(timeoutId);
            return { source, ok: res.status >= 200 && res.status < 300 };
          } catch {
            return { source, ok: false };
          }
        }),
      );

      const surviving = sourceChecks
        .filter((item) => item.ok)
        .map((item) => ({
          title: item.source.title,
          publisher: item.source.publisher ?? null,
          url: item.source.url,
          sourceType: item.source.sourceType,
          publishedAt: item.source.publishedAt ?? null,
          accessedAt: item.source.accessedAt ?? null,
          supports: item.source.supports ?? null,
          isKeySource: item.source.isKeySource ?? false,
          verificationStatus: "VERIFIED",
        }));

      if (surviving.length === 0) {
        const durationMs = Date.now() - startTime;
        await logApiRequest({
          requestId,
          apiClientId: client.id,
          method: "POST",
          endpoint: "/api/internal/v1/ai-submissions",
          statusCode: 422,
          durationMs,
          ipAddress,
          userAgent,
          errorCode: "DIRECT_PUBLISH_SOURCES_FAILED",
          errorMessage:
            "Seluruh sumber referensi gagal diakses (tidak mengembalikan status HTTP 2xx). Naskah direct publish membutuhkan minimal 1 sumber yang valid dan dapat diakses.",
        });

        return NextResponse.json(
          {
            error:
              "Seluruh sumber referensi gagal diakses (tidak mengembalikan status HTTP 2xx). Naskah direct publish membutuhkan minimal 1 sumber yang valid dan dapat diakses.",
            code: "DIRECT_PUBLISH_SOURCES_FAILED",
            requestId,
          },
          {
            status: 422,
            headers: { "x-request-id": requestId },
          },
        );
      }

      if (!surviving.some((s) => s.isKeySource)) {
        surviving[0].isKeySource = true;
      }

      sourcesToPersist = surviving;
    } else {
      sourcesToPersist = payload.sources.map((s) => ({
        title: s.title,
        publisher: s.publisher ?? null,
        url: s.url,
        sourceType: s.sourceType,
        publishedAt: s.publishedAt ?? null,
        accessedAt: s.accessedAt ?? null,
        supports: s.supports ?? null,
        isKeySource: s.isKeySource ?? false,
        verificationStatus: "UNVERIFIED",
      }));
    }

    // 5d. Pengambilan foto stok berlisensi secara aman di sisi server (jika diminta)
    let stockPhoto: StockPhotoResult | null = null;
    if (payload.imageQuery) {
      try {
        stockPhoto = await searchStockPhoto(payload.imageQuery);
      } catch (stockErr) {
        console.warn("[Ingestion API] Galat pencarian foto stok:", stockErr);
      }
    }

    // 6. Persistensi Atomik: Article + Version + Sources + Images + Review + Submission + Audit
    const contentJson = serializeContent(payload.content);
    const slug = await uniqueArticleSlug(payload.title);
    const now = new Date();

    const { submission, article } = await db.$transaction(async (tx) => {
      let chiefUser: { id: string; name: string } | null = null;
      let chiefPerson: { id: string } | null = null;

      if (isDirectPublish) {
        chiefUser = await tx.staffUser.findFirst({
          where: { role: "CHIEF_EDITOR", status: "ACTIVE" },
          select: { id: true, name: true },
        }) ?? await tx.staffUser.findFirst({
          where: { role: "CHIEF_EDITOR" },
          select: { id: true, name: true },
        });

        if (chiefUser) {
          chiefPerson = await tx.person.findFirst({
            where: { staffUserId: chiefUser.id },
            select: { id: true },
          });
          if (!chiefPerson) {
            chiefPerson = await tx.person.create({
              data: {
                accountType: "STAFF",
                staffUserId: chiefUser.id,
                publicName: chiefUser.name || "Pemimpin Redaksi",
                anonymityMode: "REAL_NAME",
              },
              select: { id: true },
            });
          }
        } else {
          chiefPerson = await tx.person.findFirst({
            where: { publicName: "Pemimpin Redaksi" },
            select: { id: true },
          });
          if (!chiefPerson) {
            chiefPerson = await tx.person.create({
              data: {
                accountType: "STAFF",
                publicName: "Pemimpin Redaksi",
                anonymityMode: "REAL_NAME",
              },
              select: { id: true },
            });
          }
        }
      }

      const article = await tx.article.create({
        data: {
          slug,
          title: payload.title,
          deck: payload.deck?.trim() || null,
          deskId: desk.id,
          format: payload.format,
          status: isDirectPublish ? "PUBLISHED" : "DRAFT",
          contentJson,
          origin: "INGESTION_API",
          byline: isDirectPublish ? "Disunting oleh Redaksi Verax Press" : AI_PLACEHOLDER_BYLINE,
          aiInvolvement: payload.aiInvolvement,
          aiDisclosurePublic: false,
          aiDisclosureNote: payload.aiUsageNote?.trim() || null,
          publishedAt: isDirectPublish ? now : null,
          firstPublishedAt: isDirectPublish ? now : null,
          createdById: null,
        },
      });

      await createArticleVersion(
        {
          articleId: article.id,
          title: article.title,
          deck: article.deck,
          contentJson,
          versionType: "ingestion",
          createdByLabel: `api-client:${client.name}`,
        },
        tx,
      );

      for (const source of sourcesToPersist) {
        await tx.sourceReference.create({
          data: {
            articleId: article.id,
            title: source.title,
            publisher: source.publisher ?? null,
            url: source.url,
            sourceType: source.sourceType,
            publishedAt: parseOptionalIsoDate(source.publishedAt),
            accessedAt: parseOptionalIsoDate(source.accessedAt) ?? now,
            supports: source.supports ?? null,
            isKeySource: source.isKeySource,
            verificationStatus: source.verificationStatus,
            verifiedById: isDirectPublish ? chiefUser?.id ?? null : null,
            verifiedAt: isDirectPublish ? now : null,
            verificationNote: isDirectPublish ? `Diverifikasi otomatis melalui Direct Publish API Client (${client.name}).` : null,
          },
        });
      }

      if (isDirectPublish && chiefPerson) {
        await tx.articleContribution.create({
          data: {
            articleId: article.id,
            personId: chiefPerson.id,
            role: "EDITOR",
            displayOrder: 0,
            publicCredit: true,
          },
        });
      }

      if (isDirectPublish) {
        await tx.editorialReview.create({
          data: {
            articleId: article.id,
            reviewerId: chiefUser?.id ?? null,
            fromStatus: "DRAFT",
            toStatus: "PUBLISHED",
            decision: "DIRECT_PUBLISH",
            notes: `Dipublikasikan langsung melalui API Client (${client.name}) bermode direct.`,
          },
        });
      }

      // Penyimpanan aset gambar utama (hero image)
      let heroMediaAssetId: string | null = null;
      if (stockPhoto) {
        const heroAsset = await tx.mediaAsset.create({
          data: {
            articleId: article.id,
            url: stockPhoto.url,
            creator: stockPhoto.creator,
            license: stockPhoto.license,
            caption: payload.imageCaption?.trim() || stockPhoto.caption,
            sourceUrl: stockPhoto.sourceUrl,
            mediaType: "PHOTO",
            isGeneric: payload.imageIsGeneric ?? true,
            uploadedByLabel: `api-client:${client.name}`,
          },
        });
        heroMediaAssetId = heroAsset.id;
      } else if (payload.imageUrl) {
        const heroAsset = await tx.mediaAsset.create({
          data: {
            articleId: article.id,
            url: payload.imageUrl,
            creator: payload.imageCredit?.trim() || null,
            license: payload.imageLicense?.trim() || null,
            caption: payload.imageCaption?.trim() || null,
            mediaType: "PHOTO",
            isGeneric: payload.imageIsGeneric ?? true,
            uploadedByLabel: `api-client:${client.name}`,
          },
        });
        heroMediaAssetId = heroAsset.id;
      }

      if (heroMediaAssetId) {
        await tx.article.update({
          where: { id: article.id },
          data: { heroMediaId: heroMediaAssetId },
        });
      }

      if (payload.images?.length) {
        for (const image of payload.images) {
          await tx.mediaAsset.create({
            data: {
              articleId: article.id,
              url: image.url,
              creator: image.creator ?? null,
              license: image.license ?? null,
              permissionEvidence: image.permissionEvidence ?? null,
              caption: image.caption ?? null,
              isGeneric: true,
              uploadedByLabel: `api-client:${client.name}`,
            },
          });
        }
      }

      const submission = await tx.submission.create({
        data: {
          origin: "INGESTION_API",
          articleId: article.id,
          apiClientId: client.id,
          agentId: payload.agentId,
          status: isDirectPublish ? "RESOLVED" : "SUBMITTED",
          aiInvolvementDeclared: payload.aiInvolvement,
          aiUsageNote: payload.aiUsageNote?.trim() || null,
          verificationNotes: payload.verificationNotes?.trim() || null,
          idempotencyKey: payload.idempotencyKey,
          payloadHash,
          tagsJson: payload.tags ? JSON.stringify(payload.tags) : null,
        },
      });

      await writeAudit(
        {
          actorType: "API_CLIENT",
          actorId: client.id,
          actorLabel: client.name,
          action: "submission.ingested",
          targetType: "SUBMISSION",
          targetId: submission.id,
          correlationId: payload.idempotencyKey,
          metadata: {
            articleId: article.id,
            agentId: payload.agentId,
            aiInvolvement: payload.aiInvolvement,
            hasImage: Boolean(heroMediaAssetId || payload.images?.length),
            heroMediaId: heroMediaAssetId,
            stockProvider: stockPhoto?.provider ?? null,
            requestId,
          },
        },
        tx,
      );

      if (isDirectPublish) {
        await writeAudit(
          {
            actorType: "API_CLIENT",
            actorId: client.id,
            actorLabel: client.name,
            action: "article.direct_published",
            targetType: "ARTICLE",
            targetId: article.id,
            correlationId: payload.idempotencyKey,
            metadata: {
              submissionId: submission.id,
              publishMode: "direct",
              requestId,
            },
          },
          tx,
        );
      }

      return { submission, article };
    });

    const durationMs = Date.now() - startTime;
    await logApiRequest({
      requestId,
      apiClientId: client.id,
      method: "POST",
      endpoint: "/api/internal/v1/ai-submissions",
      statusCode: 201,
      durationMs,
      ipAddress,
      userAgent,
      submissionId: submission.id,
    });

    return NextResponse.json(
      {
        submissionId: submission.id,
        articleId: article.id,
        submissionStatus: submission.status,
        articleStatus: article.status,
        status: submission.status,
        received: true,
        receivedAt: submission.submittedAt.toISOString(),
        idempotentReplay: false,
        ...(isDirectPublish ? { isPublished: true } : {}),
        requestId,
      },
      {
        status: 201,
        headers: { "x-request-id": requestId },
      },
    );
  } catch (error) {
    const durationMs = Date.now() - startTime;
    await logApiRequest({
      requestId,
      method: "POST",
      endpoint: "/api/internal/v1/ai-submissions",
      statusCode: 500,
      durationMs,
      ipAddress,
      userAgent,
      errorCode: "INTERNAL_ERROR",
      errorMessage: error instanceof Error ? error.message : "Internal error",
    });

    console.error("[Ingestion API] Galat internal:", error);
    return NextResponse.json(
      {
        error: "Terjadi galat pada pemrosesan internal server.",
        code: "INTERNAL_ERROR",
        requestId,
      },
      {
        status: 500,
        headers: { "x-request-id": requestId },
      },
    );
  }
}

async function methodNotAllowed(request: Request, method: string) {
  const startTime = Date.now();
  const requestId = request.headers.get("x-request-id") || generateRequestId();
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get("user-agent");
  const message = `Metode ${method} tidak diizinkan pada endpoint ini. Gunakan POST untuk mengirim naskah.`;

  try {
    await logApiRequest({
      requestId,
      method,
      endpoint: "/api/internal/v1/ai-submissions",
      statusCode: 405,
      durationMs: Date.now() - startTime,
      ipAddress,
      userAgent,
      errorCode: "METHOD_NOT_ALLOWED",
      errorMessage: message,
    });
  } catch {
    // Abaikan kegagalan pencatatan log method 405
  }

  return new NextResponse(
    method === "HEAD"
      ? null
      : JSON.stringify({
          error: message,
          code: "METHOD_NOT_ALLOWED",
          requestId,
        }),
    {
      status: 405,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Allow": "POST",
        "x-request-id": requestId,
      },
    },
  );
}

export async function GET(request: Request) { return methodNotAllowed(request, "GET"); }
export async function HEAD(request: Request) { return methodNotAllowed(request, "HEAD"); }
export async function PUT(request: Request) { return methodNotAllowed(request, "PUT"); }
export async function PATCH(request: Request) { return methodNotAllowed(request, "PATCH"); }
export async function DELETE(request: Request) { return methodNotAllowed(request, "DELETE"); }

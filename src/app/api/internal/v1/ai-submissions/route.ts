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
import { getClientIp, rateLimit, sweepRateLimits } from "@/lib/rate-limit";
import { AI_PLACEHOLDER_BYLINE } from "@/lib/domain/constants";
import { writeAudit } from "@/lib/domain/audit";
import { serializeContent } from "@/lib/domain/content";
import { uniqueArticleSlug } from "@/lib/domain/slug";
import { createArticleVersion } from "@/lib/domain/serializers";
import {
  parseOptionalIsoDate,
  validateIngestionPayload,
} from "@/lib/domain/ingestion";
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
        // Replay idempotent — kembalikan receipt yang sama persis
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

        return NextResponse.json(
          {
            submissionId: existing.id,
            articleId: existing.articleId,
            submissionStatus: existing.status,
            articleStatus: existing.article.status,
            status: existing.status,
            receivedAt: existing.submittedAt.toISOString(),
            idempotentReplay: true,
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

    // 6. Persistensi Atomik: Article DRAFT + Version + Sources (UNVERIFIED) + Images + Submission
    const contentJson = serializeContent(payload.content);
    const slug = await uniqueArticleSlug(payload.title);

    const { submission, article } = await db.$transaction(async (tx) => {
      const article = await tx.article.create({
        data: {
          slug,
          title: payload.title,
          deck: payload.deck?.trim() || null,
          deskId: desk.id,
          format: payload.format,
          status: "DRAFT",
          contentJson,
          origin: "INGESTION_API",
          byline: AI_PLACEHOLDER_BYLINE, // Byline final wajib ditetapkan editor manusia sebelum terbit
          aiInvolvement: payload.aiInvolvement,
          aiDisclosureNote: payload.aiUsageNote?.trim() || null,
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

      for (const source of payload.sources) {
        await tx.sourceReference.create({
          data: {
            articleId: article.id,
            title: source.title,
            publisher: source.publisher ?? null,
            url: source.url,
            sourceType: source.sourceType,
            publishedAt: parseOptionalIsoDate(source.publishedAt),
            accessedAt: parseOptionalIsoDate(source.accessedAt) ?? new Date(),
            supports: source.supports ?? null,
            isKeySource: source.isKeySource ?? false,
            verificationStatus: "UNVERIFIED", // Selalu UNVERIFIED walau agen mengklaim verifikasi
          },
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
          status: "SUBMITTED",
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
            requestId,
          },
        },
        tx,
      );

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
        receivedAt: submission.submittedAt.toISOString(),
        idempotentReplay: false,
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

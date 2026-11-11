// POST /api/internal/v1/ai-submissions — Internal Content Ingestion API (TA §9).
//
// - Auth: `Authorization: Bearer vrtc_<clientId>.<secret>` — scope "submit" ONLY.
// - TIDAK ADA endpoint publish untuk API client di seluruh aplikasi (hard rule #1/#2).
// - Wajib: ai_involvement, idempotency_key, desk/format valid (format NEWS ditolak),
//   sumber ber-URL. Format News hanya newsroom (D2 LOCKED).
// - Idempotent: key sama + payload sama → receipt sama (200); key sama + payload beda → 409.
// - Response hanya receipt; tanpa data privat. Sumber selalu masuk UNVERIFIED (TA §10).
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { jsonError, ok, parseJsonBody } from "@/lib/api";
import { verifyApiClient } from "@/lib/api-key";
import { rateLimit, sweepRateLimits } from "@/lib/rate-limit";
import { writeAudit } from "@/lib/domain/audit";
import { articleContentSchema, serializeContent } from "@/lib/domain/content";
import { uniqueArticleSlug } from "@/lib/domain/slug";
import { createArticleVersion } from "@/lib/domain/serializers";
import { CONTRIBUTOR_ALLOWED_FORMATS, AI_INVOLVEMENTS, SOURCE_TYPES } from "@/lib/domain/constants";

const ingestionSchema = z.object({
  title: z.string().min(8).max(200),
  deck: z.string().max(400).optional(),
  desk: z.string().min(1).max(60),
  format: z.string(),
  content: articleContentSchema,
  sources: z
    .array(
      z.object({
        title: z.string().min(3).max(300),
        publisher: z.string().max(200).optional(),
        url: z.string().url().max(2_000),
        sourceType: z.enum(SOURCE_TYPES as [string, ...string[]]).default("SECONDARY"),
        publishedAt: z.string().optional(),
        accessedAt: z.string().optional(),
        supports: z.string().max(600).optional(),
        isKeySource: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(40),
  images: z
    .array(
      z.object({
        url: z.string().url().max(2_000),
        creator: z.string().max(200).optional(),
        license: z.string().max(200).optional(),
        permissionEvidence: z.string().max(600).optional(),
        caption: z.string().max(500).optional(),
      }),
    )
    .max(20)
    .optional(),
  tags: z.array(z.string().min(2).max(40)).max(10).optional(),
  verificationNotes: z.string().max(3_000).optional(),
  aiInvolvement: z.enum(AI_INVOLVEMENTS as [string, ...string[]]),
  aiUsageNote: z.string().max(1_000).optional(),
  agentId: z.string().min(2).max(120),
  idempotencyKey: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  try {
    sweepRateLimits();

    // 1) Autentikasi API client (scope submit-only).
    const client = await verifyApiClient(request.headers.get("authorization"));
    if (!client) {
      return NextResponse.json(
        { error: "Kredensial API client tidak valid.", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    // 2) Rate limit per client.
    const limit = rateLimit(`ingest:${client.id}`, 12, 60_000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak submission. Coba lagi nanti.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    // 3) Validasi payload.
    const body = await parseJsonBody(request, ingestionSchema);

    if (!CONTRIBUTOR_ALLOWED_FORMATS.includes(body.format as never)) {
      return NextResponse.json(
        { error: `Format "${body.format}" tidak diterima. News hanya diproduksi newsroom.`, code: "FORMAT_REJECTED" },
        { status: 422 },
      );
    }

    const desk = await db.desk.findUnique({ where: { slug: body.desk } });
    if (!desk || !desk.isActive) {
      return NextResponse.json({ error: "Desk tidak valid.", code: "DESK_REJECTED" }, { status: 422 });
    }

    // 4) Idempotency.
    const payloadForHash = { ...body };
    delete (payloadForHash as { idempotencyKey?: string }).idempotencyKey;
    const payloadHash = createHash("sha256").update(JSON.stringify(payloadForHash)).digest("hex");

    const existing = await db.submission.findUnique({ where: { idempotencyKey: body.idempotencyKey } });
    if (existing) {
      if (existing.payloadHash === payloadHash) {
        // Replay idempotent — kembalikan receipt yang sama.
        return ok({
          submissionId: existing.id,
          articleId: existing.articleId,
          status: existing.status,
          receivedAt: existing.submittedAt.toISOString(),
          idempotentReplay: true,
        });
      }
      return NextResponse.json(
        { error: "Idempotency key sudah dipakai untuk payload yang berbeda.", code: "IDEMPOTENCY_CONFLICT" },
        { status: 409 },
      );
    }

    // 5) Buat artikel DRAFT + sumber (UNVERIFIED) + aset + submission secara atomik.
    const contentJson = serializeContent(body.content);
    const slug = await uniqueArticleSlug(body.title);

    const { submission, article } = await db.$transaction(async (tx) => {
      const article = await tx.article.create({
        data: {
          slug,
          title: body.title,
          deck: body.deck ?? null,
          deskId: desk.id,
          format: body.format,
          status: "DRAFT",
          contentJson,
          origin: "INGESTION_API",
          byline: "Redaksi Verax Press", // byline final diputuskan manusia di CMS (TA §9.1)
          aiInvolvement: body.aiInvolvement,
          aiDisclosureNote: body.aiUsageNote ?? null,
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

      for (const source of body.sources) {
        await tx.sourceReference.create({
          data: {
            articleId: article.id,
            title: source.title,
            publisher: source.publisher ?? null,
            url: source.url,
            sourceType: source.sourceType,
            publishedAt: source.publishedAt ? new Date(source.publishedAt) : null,
            accessedAt: source.accessedAt ? new Date(source.accessedAt) : new Date(),
            supports: source.supports ?? null,
            isKeySource: source.isKeySource ?? false, // petunjuk agent; final ditetapkan editor
            verificationStatus: "UNVERIFIED", // deklarasi agent tidak sama dengan verifikasi (TA §6.1)
          },
        });
      }

      if (body.images?.length) {
        for (const image of body.images) {
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
          agentId: body.agentId,
          status: "SUBMITTED",
          aiInvolvementDeclared: body.aiInvolvement,
          aiUsageNote: body.aiUsageNote ?? null,
          verificationNotes: body.verificationNotes ?? null,
          idempotencyKey: body.idempotencyKey,
          payloadHash,
          tagsJson: body.tags ? JSON.stringify(body.tags) : null,
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
          correlationId: body.idempotencyKey,
          metadata: { articleId: article.id, agentId: body.agentId, aiInvolvement: body.aiInvolvement },
        },
        tx,
      );

      return { submission, article };
    });

    // 6) Receipt saja: tanpa informasi privat lain (TA §9.2).
    return ok(
      {
        submissionId: submission.id,
        articleId: article.id,
        status: "DRAFT",
        receivedAt: submission.submittedAt.toISOString(),
        idempotentReplay: false,
      },
      201,
    );
  } catch (error) {
    return jsonError(error);
  }
}

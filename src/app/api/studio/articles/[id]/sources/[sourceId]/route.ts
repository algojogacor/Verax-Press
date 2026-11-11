// PATCH  /api/studio/articles/[id]/sources/[sourceId]: edit metadata / verifikasi / penanda kunci.
// DELETE /api/studio/articles/[id]/sources/[sourceId]: hapus sumber.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, parseJsonBody, requireSession } from "@/lib/api";
import { articleDetailInclude, toArticleDetail } from "@/lib/domain/serializers";
import { canEditArticleContent, canReadArticle } from "@/lib/domain/permissions";
import { writeAudit } from "@/lib/domain/audit";
import { SOURCE_TYPES, VERIFICATION_STATUSES } from "@/lib/domain/constants";
import type { SessionUser } from "@/types/verity";

type Params = { params: Promise<{ id: string; sourceId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireSession();
    const { id, sourceId } = await params;
    const body = await parseJsonBody(
      request,
      z.object({
        title: z.string().min(3).max(300).optional(),
        publisher: z.string().max(200).nullable().optional(),
        url: z.string().url().max(2_000).optional(),
        sourceType: z.enum(SOURCE_TYPES as [string, ...string[]]).optional(),
        publishedAt: z.string().datetime().nullable().optional(),
        accessedAt: z.string().datetime().nullable().optional(),
        supports: z.string().max(600).nullable().optional(),
        isKeySource: z.boolean().optional(),
        verificationStatus: z.enum(VERIFICATION_STATUSES as [string, ...string[]]).optional(),
        verificationNote: z.string().max(600).nullable().optional(),
      }),
    );

    const article = await db.article.findUnique({ where: { id }, include: articleDetailInclude });
    if (!article) throw new ApiError(404, "NOT_FOUND", "Artikel tidak ditemukan.");
    const source = article.sources.find((s) => s.id === sourceId);
    if (!source) throw new ApiError(404, "NOT_FOUND", "Sumber tidak ditemukan.");

    const authorStaffIds = article.contributions
      .filter((c) => c.role === "AUTHOR")
      .map((c) => c.person.staffUserId)
      .filter((s): s is string => Boolean(s));
    if (!canReadArticle(user, article, authorStaffIds)) {
      throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke artikel ini.");
    }

    const isEditorPlus = user.role === "CHIEF_EDITOR" || user.role === "EDITOR";

    // Verifikasi sumber: hanya editor/chief (source:verify) sesuai acceptance criteria TA §12.1.
    if (body.verificationStatus !== undefined || body.verificationNote !== undefined) {
      if (!isEditorPlus) {
        throw new ApiError(403, "FORBIDDEN", "Hanya editor yang dapat mengubah status verifikasi sumber.");
      }
    }
    // Penandaan sumber kunci: hanya editor/chief (TA §10).
    if (body.isKeySource !== undefined && !isEditorPlus) {
      throw new ApiError(403, "FORBIDDEN", "Penandaan sumber kunci hanya dapat dilakukan editor.");
    }
    // Perubahan metadata lain mengikuti aturan edit konten.
    const metadataFields = ["title", "publisher", "url", "sourceType", "publishedAt", "accessedAt", "supports"] as const;
    const touchesMetadata = metadataFields.some((f) => body[f] !== undefined);
    if (touchesMetadata && !canEditArticleContent(user, article, authorStaffIds)) {
      throw new ApiError(403, "FORBIDDEN", "Metadata sumber tidak dapat diubah pada status artikel ini.");
    }

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.publisher !== undefined) data.publisher = body.publisher;
    if (body.url !== undefined) data.url = body.url;
    if (body.sourceType !== undefined) data.sourceType = body.sourceType;
    if (body.publishedAt !== undefined) data.publishedAt = body.publishedAt ? new Date(body.publishedAt) : null;
    if (body.accessedAt !== undefined) data.accessedAt = body.accessedAt ? new Date(body.accessedAt) : null;
    if (body.supports !== undefined) data.supports = body.supports;
    if (body.isKeySource !== undefined) data.isKeySource = body.isKeySource;
    if (body.verificationNote !== undefined) data.verificationNote = body.verificationNote;
    if (body.verificationStatus !== undefined) {
      data.verificationStatus = body.verificationStatus;
      data.verifiedById = user.id;
      data.verifiedAt = new Date();
    }

    await db.sourceReference.update({ where: { id: sourceId }, data });

    if (body.verificationStatus !== undefined) {
      await writeAudit({
        actorType: "STAFF",
        actorId: user.id,
        actorLabel: user.email,
        action: "source.verified",
        targetType: "SOURCE",
        targetId: sourceId,
        reason: body.verificationNote ?? null,
        metadata: { articleId: article.id, status: body.verificationStatus },
      });
    } else {
      await writeAudit({
        actorType: "STAFF",
        actorId: user.id,
        actorLabel: user.email,
        action: "source.updated",
        targetType: "SOURCE",
        targetId: sourceId,
        metadata: { articleId: article.id },
      });
    }

    const fresh = await db.article.findUnique({ where: { id: article.id }, include: articleDetailInclude });
    return ok(toArticleDetail(fresh!, user));
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireSession();
    const { id, sourceId } = await params;
    const article = await db.article.findUnique({ where: { id }, include: articleDetailInclude });
    if (!article) throw new ApiError(404, "NOT_FOUND", "Artikel tidak ditemukan.");
    const source = article.sources.find((s) => s.id === sourceId);
    if (!source) throw new ApiError(404, "NOT_FOUND", "Sumber tidak ditemukan.");

    const authorStaffIds = article.contributions
      .filter((c) => c.role === "AUTHOR")
      .map((c) => c.person.staffUserId)
      .filter((s): s is string => Boolean(s));
    if (!canReadArticle(user, article, authorStaffIds)) {
      throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke artikel ini.");
    }
    if (!canEditArticleContent(user, article, authorStaffIds)) {
      throw new ApiError(403, "FORBIDDEN", "Sumber tidak dapat dihapus pada status artikel ini.");
    }

    await db.sourceReference.delete({ where: { id: sourceId } });
    await writeAudit({
      actorType: "STAFF",
      actorId: user.id,
      actorLabel: user.email,
      action: "source.deleted",
      targetType: "SOURCE",
      targetId: sourceId,
      metadata: { articleId: article.id, title: source.title },
    });

    const fresh = await db.article.findUnique({ where: { id: article.id }, include: articleDetailInclude });
    return ok(toArticleDetail(fresh!, user));
  } catch (error) {
    return jsonError(error);
  }
}

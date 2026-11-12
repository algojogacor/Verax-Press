// POST /api/studio/articles/[id]/sources/verify-all — verifikasi massal semua sumber referensi.
// Hanya Pemimpin Redaksi (CHIEF_EDITOR) yang memiliki kewenangan memverifikasi sumber.
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, parseJsonBody, requireSession } from "@/lib/api";
import { articleDetailInclude, toArticleDetail } from "@/lib/domain/serializers";
import { canReadArticle } from "@/lib/domain/permissions";
import { writeAudit } from "@/lib/domain/audit";
import { VERIFICATION_STATUSES } from "@/lib/domain/constants";

type Params = { params: Promise<{ id: string }> };

const batchVerifySchema = z.object({
  status: z.enum(VERIFICATION_STATUSES as [string, ...string[]]).default("VERIFIED"),
  note: z.string().max(600).optional(),
  markAsKeySources: z.boolean().optional(),
});

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const body = await parseJsonBody(request, batchVerifySchema);

    if (user.role !== "CHIEF_EDITOR") {
      throw new ApiError(403, "FORBIDDEN", "Hanya Pemimpin Redaksi yang dapat memverifikasi sumber.");
    }

    const article = await db.article.findUnique({ where: { id }, include: articleDetailInclude });
    if (!article) throw new ApiError(404, "NOT_FOUND", "Artikel tidak ditemukan.");

    const authorStaffIds = article.contributions
      .filter((c) => c.role === "AUTHOR")
      .map((c) => c.person.staffUserId)
      .filter((s): s is string => Boolean(s));
    if (!canReadArticle(user, article, authorStaffIds)) {
      throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke artikel ini.");
    }

    if (article.sources.length === 0) {
      throw new ApiError(400, "BAD_REQUEST", "Artikel belum memiliki sumber referensi untuk diverifikasi.");
    }

    const now = new Date();
    const note = body.note?.trim() || null;

    const dataToUpdate: {
      verificationStatus: string;
      verificationNote?: string | null;
      verifiedById: string;
      verifiedAt: Date;
      isKeySource?: boolean;
    } = {
      verificationStatus: body.status,
      verifiedById: user.id,
      verifiedAt: now,
    };
    if (note !== null) {
      dataToUpdate.verificationNote = note;
    }
    if (body.markAsKeySources) {
      dataToUpdate.isKeySource = true;
    }

    if (body.markAsKeySources) {
      await db.sourceReference.updateMany({
        where: { articleId: article.id },
        data: dataToUpdate,
      });
    } else {
      await db.sourceReference.updateMany({
        where: {
          articleId: article.id,
          verificationStatus: { not: body.status },
        },
        data: dataToUpdate,
      });
    }

    await writeAudit({
      actorType: "STAFF",
      actorId: user.id,
      actorLabel: user.username || user.email || user.name,
      action: "source.batch_verified",
      targetType: "ARTICLE",
      targetId: article.id,
      reason:
        note ??
        (body.markAsKeySources
          ? "Verifikasi massal dan penetapan sumber kunci"
          : "Verifikasi massal sumber referensi"),
      metadata: {
        articleId: article.id,
        status: body.status,
        markedKeySources: Boolean(body.markAsKeySources),
        totalSources: article.sources.length,
      },
    });

    const fresh = await db.article.findUnique({ where: { id: article.id }, include: articleDetailInclude });
    return ok(toArticleDetail(fresh!, user));
  } catch (error) {
    return jsonError(error);
  }
}

// POST /api/studio/corrections: terbitkan koreksi artikel (correction:create).
// Efek: CorrectionRecord + versi editorial + status artikel -> CORRECTED + audit
// + (opsional) tautkan ke complaint -> RESOLVED.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, parseJsonBody, requireStaffPermission } from "@/lib/api";
import { articleDetailInclude, createArticleVersion, toArticleDetail } from "@/lib/domain/serializers";
import { writeAudit } from "@/lib/domain/audit";

export async function POST(request: Request) {
  try {
    const user = await requireStaffPermission("correction:create");
    const body = await parseJsonBody(
      request,
      z.object({
        articleId: z.string().min(1),
        summary: z.string().min(10).max(2_000),
        publicNote: z.string().min(10).max(2_000),
        correctedContent: z.string().max(200_000).optional(), // konten baru (JSON blocks) bila diperbaiki
        complaintId: z.string().optional(),
      }),
    );

    const article = await db.article.findUnique({ where: { id: body.articleId }, include: articleDetailInclude });
    if (!article) throw new ApiError(404, "NOT_FOUND", "Artikel tidak ditemukan.");
    if (article.status !== "PUBLISHED" && article.status !== "CORRECTED") {
      throw new ApiError(422, "NOT_PUBLISHED", "Koreksi hanya dapat dibuat untuk artikel yang telah terbit.");
    }

    const { correction } = await db.$transaction(async (tx) => {
      const now = new Date();
      const correction = await tx.correctionRecord.create({
        data: {
          articleId: article.id,
          summary: body.summary,
          publicNote: body.publicNote,
          approvedById: user.id,
          correctedAt: now,
        },
      });

      // Versi koreksi (editorial_copyedit): tidak ada overwrite diam-diam.
      await createArticleVersion(
        {
          articleId: article.id,
          title: article.title,
          deck: article.deck,
          contentJson: body.correctedContent ?? article.contentJson,
          versionType: "editorial_copyedit",
          changeReason: `Koreksi: ${body.summary}`,
          createdById: user.id,
          createdByLabel: user.email,
        },
        tx,
      );

      await tx.article.update({
        where: { id: article.id },
        data: {
          status: "CORRECTED",
          ...(body.correctedContent ? { contentJson: body.correctedContent } : {}),
          updatedAt: now,
        },
      });

      // Tautkan complaint bila ada -> RESOLVED
      if (body.complaintId) {
        const complaint = await tx.complaint.findUnique({ where: { id: body.complaintId } });
        if (complaint && (complaint.status === "RECEIVED" || complaint.status === "IN_REVIEW")) {
          await tx.complaint.update({
            where: { id: complaint.id },
            data: {
              status: "RESOLVED",
              decision: `Koreksi diterbitkan: ${body.publicNote}`,
              decidedAt: now,
              correctionRecordId: correction.id,
            },
          });
        }
      }

      await writeAudit(
        {
          actorType: "STAFF",
          actorId: user.id,
          actorLabel: user.email,
          action: "correction.created",
          targetType: "CORRECTION",
          targetId: correction.id,
          reason: body.summary,
          metadata: { articleId: article.id, complaintId: body.complaintId ?? null },
        },
        tx,
      );

      return { correction };
    });

    const fresh = await db.article.findUnique({ where: { id: article.id }, include: articleDetailInclude });
    return ok({ correctionId: correction.id, article: toArticleDetail(fresh!, user) }, 201);
  } catch (error) {
    return jsonError(error);
  }
}

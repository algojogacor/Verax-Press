// POST /api/contributor/articles/[id]/transition — Transisi status naskah oleh kontributor.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, parseJsonBody, requireContributorSession } from "@/lib/api";
import { getRule, canExecuteRule } from "@/lib/domain/workflow";
import { writeAudit } from "@/lib/domain/audit";
import type { ArticleStatus, TransitionAction } from "@/types/verity";

type Params = { params: Promise<{ id: string }> };

const transitionSchema = z.object({
  action: z.string().min(1),
  reason: z.string().max(1000).optional(),
});

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireContributorSession();
    const { id } = await params;
    const body = await parseJsonBody(request, transitionSchema);

    // Otorisasi kewenangan peran: hanya aksi pengajuan dan penarikan yang diizinkan untuk kontributor
    const ALLOWED_CONTRIBUTOR_ACTIONS = ["SUBMIT_REVIEW", "RESUBMIT_REVIEW", "WITHDRAW"];
    if (!ALLOWED_CONTRIBUTOR_ACTIONS.includes(body.action)) {
      throw new ApiError(
        403,
        "FORBIDDEN",
        `Peran Kontributor tidak memiliki kewenangan untuk mengeksekusi aksi ${body.action}.`
      );
    }

    const article = await db.article.findUnique({
      where: { id },
      include: { desk: true },
    });

    if (!article) {
      throw new ApiError(404, "NOT_FOUND", "Naskah tidak ditemukan.");
    }

    // Penegakan kepemilikan server-side: hanya kontributor pemilik naskah yang boleh bertransisi
    if (article.contributorId !== user.id) {
      throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke naskah ini.");
    }

    const currentStatus = article.status as ArticleStatus;
    const rule = getRule(body.action as TransitionAction, currentStatus);

    if (!rule) {
      throw new ApiError(
        422,
        "INVALID_TRANSITION",
        `Aksi ${body.action} tidak diizinkan dari status ${currentStatus}.`
      );
    }

    // Evaluasi aturan kewenangan alur kerja
    const isAllowed = canExecuteRule(rule, "CONTRIBUTOR", true);
    if (!isAllowed) {
      throw new ApiError(
        403,
        "FORBIDDEN",
        `Peran Kontributor tidak memiliki kewenangan untuk mengeksekusi aksi ${body.action}.`
      );
    }

    if (rule.requiresReason && !body.reason?.trim()) {
      throw new ApiError(422, "REASON_REQUIRED", "Alasan wajib diisi untuk aksi ini.");
    }

    const now = new Date();
    const reasonText = body.reason?.trim() || null;

    // Eksekusi pembaruan status dan pencatatan riwayat review
    const updated = await db.$transaction(async (tx) => {
      const art = await tx.article.update({
        where: { id },
        data: { status: rule.to },
      });

      // Catat riwayat keputusan editorial/pengajuan
      await tx.editorialReview.create({
        data: {
          articleId: article.id,
          reviewerId: null, // Dikirim oleh kontributor eksternal
          fromStatus: currentStatus,
          toStatus: rule.to,
          decision: body.action,
          notes: reasonText,
        },
      });

      // Sinkronkan status pada tabel intake Submission
      await tx.submission.updateMany({
        where: { articleId: article.id },
        data: {
          status: rule.to === "PENDING_REVIEW" ? "SUBMITTED" : "RESOLVED",
        },
      });

      return art;
    });

    await writeAudit({
      actorType: "CONTRIBUTOR",
      actorId: user.id,
      actorLabel: user.username || user.email,
      action: `article.transition.${body.action.toLowerCase()}`,
      targetType: "ARTICLE",
      targetId: article.id,
      reason: reasonText,
      metadata: {
        fromStatus: currentStatus,
        toStatus: rule.to,
        action: body.action,
      },
    });

    return ok({
      success: true,
      status: updated.status,
      fromStatus: currentStatus,
      toStatus: updated.status,
      message:
        body.action === "SUBMIT_REVIEW" || body.action === "RESUBMIT_REVIEW"
          ? "Naskah berhasil dikirim ke meja redaksi untuk penelaahan."
          : "Naskah berhasil ditarik.",
    });
  } catch (error) {
    return jsonError(error);
  }
}

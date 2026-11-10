// POST /api/public/complaints — formulir keluhan/hak jawab/hak koreksi publik.
// Rate-limited per IP. refCode dibuat server-side. Deadline tetap NULL (LEGAL REVIEW REQUIRED).
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { jsonError, ok, parseJsonBody } from "@/lib/api";
import { makeComplaintRefCode } from "@/lib/domain/slug";
import { writeAudit } from "@/lib/domain/audit";
import { rateLimit, sweepRateLimits } from "@/lib/rate-limit";
import { COMPLAINT_TYPES } from "@/lib/domain/constants";

export async function POST(request: Request) {
  try {
    sweepRateLimits();
    const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
    const limit = rateLimit(`public-complaint:${ip}`, 5, 60 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Coba lagi nanti.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    const body = await parseJsonBody(
      request,
      z.object({
        type: z.string().transform((s) => s.toUpperCase()),
        articleSlug: z.string().max(200).optional(),
        senderName: z.string().max(120).optional().default("Publik"),
        senderEmail: z.string().email().max(200),
        senderPhone: z.string().max(40).optional(),
        message: z.string().min(20).max(5_000).optional(),
        summary: z.string().min(20).max(5_000).optional(),
      }).refine((d) => COMPLAINT_TYPES.includes(d.type as never), {
        message: "Tipe keluhan tidak valid.",
      }).refine((d) => Boolean(d.message || d.summary), {
        message: "Pesan keluhan wajib diisi (minimal 20 karakter).",
      }),
    );

    const messageText = (body.message ?? body.summary)!;

    let articleId: string | null = null;
    if (body.articleSlug) {
      const article = await db.article.findUnique({
        where: { slug: body.articleSlug },
        select: { id: true, status: true },
      });
      if (article && (article.status === "PUBLISHED" || article.status === "CORRECTED")) {
        articleId = article.id;
      }
    }

    const year = new Date().getFullYear();
    const sequence = (await db.complaint.count({ where: { refCode: { startsWith: `KEL-${year}-` } } })) + 1;

    const complaint = await db.complaint.create({
      data: {
        refCode: makeComplaintRefCode(year, sequence),
        type: body.type,
        articleId,
        senderName: body.senderName || "Publik",
        senderEmail: body.senderEmail,
        senderPhone: body.senderPhone ?? null,
        message: messageText,
        status: "RECEIVED",
      },
    });

    await writeAudit({
      actorType: "PUBLIC",
      action: "complaint.created",
      targetType: "COMPLAINT",
      targetId: complaint.id,
      metadata: { refCode: complaint.refCode, type: complaint.type },
    });

    return ok({
      refCode: complaint.refCode,
      complaintId: complaint.id,
      status: complaint.status,
      receivedAt: complaint.createdAt.toISOString(),
    }, 201);
  } catch (error) {
    return jsonError(error);
  }
}

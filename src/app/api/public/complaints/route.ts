// POST /api/public/complaints: formulir keluhan/hak jawab/hak koreksi publik.
// GET /api/public/complaints: pelacakan status permohonan terbuka (sanitasi ketat tanpa membocorkan data pribadi).
// Rate-limited per IP. refCode dibuat server-side. Deadline tetap NULL (LEGAL REVIEW REQUIRED).
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, parseJsonBody } from "@/lib/api";
import { createComplaintWithRetry, getPublicComplaintStatus } from "@/lib/domain/complaint";
import { writeAudit } from "@/lib/domain/audit";
import { getClientIp, rateLimit, sweepRateLimits } from "@/lib/rate-limit";
import { COMPLAINT_TYPES } from "@/lib/domain/constants";

export async function GET(request: Request) {
  try {
    sweepRateLimits();
    const ip = getClientIp(request);
    const limit = rateLimit(`public-complaint-status:${ip}`, 30, 10 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan pelacakan status. Silakan coba beberapa saat lagi.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    const { searchParams } = new URL(request.url);
    const rawRefCode = searchParams.get("refCode") || searchParams.get("ref");

    if (!rawRefCode || !rawRefCode.trim()) {
      return jsonError(new ApiError(400, "MISSING_REF_CODE", "Parameter refCode wajib diisi (contoh: KEL-2026-0001)."));
    }

    const refCode = rawRefCode.trim();
    if (refCode.length > 50 || !/^KEL-\d{4}-\d+$/i.test(refCode)) {
      return jsonError(
        new ApiError(
          422,
          "INVALID_REF_CODE",
          "Format nomor antrean tidak valid. Gunakan format KEL-YYYY-NNNN (contoh: KEL-2026-0001).",
        ),
      );
    }

    const result = await getPublicComplaintStatus(db, refCode);
    if (!result) {
      return jsonError(
        new ApiError(
          404,
          "NOT_FOUND",
          "Permohonan dengan nomor antrean tersebut tidak ditemukan. Periksa kembali nomor yang Anda masukkan.",
        ),
      );
    }

    return ok(result);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    sweepRateLimits();
    const ip = getClientIp(request);
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

    const complaint = await createComplaintWithRetry(db, {
      type: body.type,
      articleId,
      senderName: body.senderName,
      senderEmail: body.senderEmail,
      senderPhone: body.senderPhone,
      message: messageText,
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

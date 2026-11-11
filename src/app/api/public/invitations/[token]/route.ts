// GET  /api/public/invitations/[token] — verifikasi status token undangan aktivasi staf (Publik).
// POST /api/public/invitations/[token]/accept — aktivasi akun dan pembuatan kata sandi (Publik).
import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, parseJsonBody } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import { writeAudit } from "@/lib/domain/audit";
import { rateLimit, sweepRateLimits } from "@/lib/rate-limit";

type Params = { params: Promise<{ token: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    sweepRateLimits();
    const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const limit = rateLimit(`public-staff-invite-get:${ip}`, 30, 60 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan verifikasi undangan. Coba lagi nanti.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    const { token } = await params;
    if (!token || token.trim().length < 16) {
      throw new ApiError(404, "INVALID_TOKEN", "Tautan undangan tidak valid.");
    }

    const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");

    const invitation = await db.staffInvitation.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        expiresAt: true,
        acceptedAt: true,
        revokedAt: true,
      },
    });

    if (!invitation || invitation.revokedAt) {
      throw new ApiError(404, "INVITATION_NOT_FOUND", "Tautan undangan tidak ditemukan atau telah dicabut.");
    }

    if (invitation.acceptedAt) {
      throw new ApiError(410, "ALREADY_ACCEPTED", "Undangan ini telah digunakan untuk mengaktifkan akun.");
    }

    if (new Date() > invitation.expiresAt) {
      throw new ApiError(410, "INVITATION_EXPIRED", "Tautan undangan telah kedaluwarsa. Silakan hubungi Pemimpin Redaksi untuk tautan baru.");
    }

    return ok({
      valid: true,
      invitation: {
        name: invitation.name,
        username: invitation.username,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

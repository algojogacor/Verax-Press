// GET /api/public/contributor/invitations/[token] — Verifikasi keabsahan token aktivasi Volunteer.
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok } from "@/lib/api";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { token } = await params;
    if (!token || token.trim().length < 32) {
      throw new ApiError(404, "INVITATION_NOT_FOUND", "Tautan aktivasi tidak valid.");
    }

    const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");

    const invitation = await db.contributorInvitation.findUnique({
      where: { tokenHash },
      include: {
        application: {
          select: {
            name: true,
            bio: true,
            interests: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new ApiError(404, "INVITATION_NOT_FOUND", "Tautan aktivasi tidak ditemukan atau tidak valid.");
    }

    if (invitation.revokedAt) {
      throw new ApiError(410, "INVITATION_REVOKED", "Tautan aktivasi ini telah dicabut oleh redaksi.");
    }

    if (invitation.expiresAt < new Date()) {
      throw new ApiError(
        410,
        "INVITATION_EXPIRED",
        "Tautan aktivasi ini telah kedaluwarsa. Silakan hubungi redaksi untuk mendapatkan undangan baru."
      );
    }

    if (invitation.acceptedAt) {
      throw new ApiError(
        410,
        "ALREADY_ACCEPTED",
        "Tautan aktivasi ini sudah pernah digunakan. Silakan masuk menggunakan nama pengguna dan kata sandi Anda."
      );
    }

    return ok({
      valid: true,
      email: invitation.email,
      name: invitation.name,
      invitation: {
        email: invitation.email,
        name: invitation.name,
        bio: invitation.application?.bio ?? null,
        interests: invitation.application?.interests ?? null,
        expiresAt: invitation.expiresAt.toISOString(),
      },
      bio: invitation.application?.bio ?? null,
      interests: invitation.application?.interests ?? null,
      expiresAt: invitation.expiresAt.toISOString(),
    });
  } catch (error) {
    return jsonError(error);
  }
}

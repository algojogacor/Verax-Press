// POST /api/public/contributor/invitations/[token]/accept — Aktivasi akun Volunteer dan penetapan kata sandi.
import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, parseJsonBody } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import { writeAudit } from "@/lib/domain/audit";
import { rateLimit, sweepRateLimits } from "@/lib/rate-limit";

type Params = { params: Promise<{ token: string }> };

const acceptSchema = z.object({
  username: z
    .string()
    .min(3, "Nama pengguna minimal 3 karakter.")
    .max(50, "Nama pengguna maksimal 50 karakter.")
    .regex(
      /^[a-zA-Z0-9_.-]+$/,
      "Nama pengguna hanya boleh berisi huruf, angka, garis bawah, titik, atau tanda hubung."
    ),
  password: z
    .string()
    .min(8, "Kata sandi minimal 8 karakter.")
    .max(100, "Kata sandi maksimal 100 karakter."),
  publicName: z.string().max(100).optional(),
  bio: z.string().max(1000).optional(),
});

export async function POST(request: Request, { params }: Params) {
  try {
    sweepRateLimits();
    const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const limit = rateLimit(`public-contrib-invite-accept:${ip}`, 20, 60 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan aktivasi akun. Coba lagi nanti.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    const { token } = await params;
    if (!token || token.trim().length < 32) {
      throw new ApiError(404, "INVITATION_NOT_FOUND", "Tautan aktivasi tidak valid.");
    }

    const body = await parseJsonBody(request, acceptSchema);
    const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");

    // 1. Validasi undangan
    const invitation = await db.contributorInvitation.findUnique({
      where: { tokenHash },
      include: { application: true },
    });

    if (!invitation) {
      throw new ApiError(404, "INVITATION_NOT_FOUND", "Tautan aktivasi tidak ditemukan atau tidak valid.");
    }

    if (invitation.revokedAt) {
      throw new ApiError(410, "INVITATION_REVOKED", "Tautan aktivasi ini telah dicabut.");
    }

    if (invitation.expiresAt < new Date()) {
      throw new ApiError(410, "INVITATION_EXPIRED", "Tautan aktivasi ini telah kedaluwarsa.");
    }

    if (invitation.acceptedAt) {
      throw new ApiError(410, "ALREADY_ACCEPTED", "Tautan aktivasi ini sudah pernah digunakan.");
    }

    const cleanUsername = body.username.trim();

    // 2. Periksa keunikan nama pengguna pada StaffUser dan Contributor (case-insensitive)
    const existingStaff =
      (await db.staffUser.findFirst({
        where: {
          OR: [{ username: cleanUsername }, { username: cleanUsername.toLowerCase() }],
        },
        select: { id: true },
      })) ??
      (
        await db.$queryRaw<Array<{ id: string }>>`SELECT id FROM StaffUser WHERE username = ${cleanUsername} COLLATE NOCASE LIMIT 1`
      )[0];

    if (existingStaff) {
      throw new ApiError(409, "USERNAME_IN_USE", "Nama pengguna sudah digunakan oleh pengguna lain.");
    }

    const existingContributor =
      (await db.contributor.findFirst({
        where: {
          OR: [{ username: cleanUsername }, { username: cleanUsername.toLowerCase() }],
        },
        select: { id: true },
      })) ??
      (
        await db.$queryRaw<Array<{ id: string }>>`SELECT id FROM Contributor WHERE username = ${cleanUsername} COLLATE NOCASE LIMIT 1`
      )[0];

    if (existingContributor) {
      throw new ApiError(409, "USERNAME_IN_USE", "Nama pengguna sudah digunakan oleh kontributor lain.");
    }

    // 3. Hash password dengan scrypt
    const passwordHash = hashPassword(body.password);
    const resolvedPublicName = body.publicName?.trim() || invitation.name;
    const resolvedBio = body.bio?.trim() || invitation.application.bio || null;

    // 4. Eksekusi transaksi atomik
    const result = await db.$transaction(async (tx) => {
      // a. Buat akun Contributor aktif
      const newContributor = await tx.contributor.create({
        data: {
          username: cleanUsername,
          email: invitation.email,
          passwordHash,
          adultConfirmedAt: invitation.application.adultConfirmedAt,
          status: "ACTIVE",
        },
      });

      // b. Buat identitas publik Person terhubung
      const person = await tx.person.create({
        data: {
          accountType: "EXTERNAL",
          contributorId: newContributor.id,
          publicName: resolvedPublicName,
          bio: resolvedBio,
        },
      });

      // c. Tandai undangan sudah digunakan
      await tx.contributorInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      // d. Hubungkan permohonan ke kontributor
      await tx.contributorApplication.update({
        where: { id: invitation.applicationId },
        data: { contributorId: newContributor.id },
      });

      return { contributor: newContributor, person };
    });

    // 5. Catat jejak audit
    await writeAudit({
      actorType: "CONTRIBUTOR",
      actorId: result.contributor.id,
      actorLabel: result.contributor.username || result.contributor.email,
      action: "contributor.activated",
      targetType: "AUTH",
      targetId: result.contributor.id,
      metadata: {
        username: result.contributor.username,
        email: result.contributor.email,
        publicName: result.person.publicName,
      },
    });

    return ok({
      success: true,
      message: "Akun kontributor berhasil diaktifkan. Silakan masuk ke Portal Kontributor.",
      username: result.contributor.username,
      email: result.contributor.email,
    });
  } catch (error) {
    return jsonError(error);
  }
}

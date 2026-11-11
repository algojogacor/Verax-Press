// POST /api/public/invitations/[token]/accept — aktivasi akun penulis dan penentuan password baru.
import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, parseJsonBody } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import { writeAudit } from "@/lib/domain/audit";

type Params = { params: Promise<{ token: string }> };

const acceptSchema = z.object({
  password: z
    .string()
    .min(8, "Kata sandi minimal 8 karakter.")
    .max(128, "Kata sandi maksimal 128 karakter."),
});

export async function POST(request: Request, { params }: Params) {
  try {
    const { token } = await params;
    if (!token || token.trim().length < 16) {
      throw new ApiError(404, "INVALID_TOKEN", "Tautan undangan tidak valid.");
    }

    const body = await parseJsonBody(request, acceptSchema);
    const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");

    const passwordHash = hashPassword(body.password);

    const result = await db.$transaction(async (tx) => {
      const invitation = await tx.staffInvitation.findUnique({
        where: { tokenHash },
      });

      if (!invitation || invitation.revokedAt) {
        throw new ApiError(404, "INVITATION_NOT_FOUND", "Tautan undangan tidak ditemukan atau telah dicabut.");
      }

      if (invitation.acceptedAt) {
        throw new ApiError(410, "ALREADY_ACCEPTED", "Undangan ini telah digunakan untuk mengaktifkan akun.");
      }

      if (new Date() > invitation.expiresAt) {
        throw new ApiError(410, "INVITATION_EXPIRED", "Tautan undangan telah kedaluwarsa.");
      }

      // Pastikan username belum dipakai
      const existingUser = await tx.staffUser.findFirst({
        where: {
          OR: [
            { username: invitation.username },
            { username: invitation.username.toLowerCase() },
          ],
        },
      });

      if (existingUser) {
        throw new ApiError(409, "USERNAME_IN_USE", "Nama pengguna sudah terdaftar pada akun lain.");
      }

      // Buat StaffUser dengan peran kanonis WRITER
      const newStaff = await tx.staffUser.create({
        data: {
          username: invitation.username,
          name: invitation.name,
          email: invitation.email,
          role: "WRITER",
          status: "ACTIVE",
          passwordHash,
        },
      });

      // Buat Person identitas publik terhubung
      await tx.person.create({
        data: {
          accountType: "STAFF",
          staffUserId: newStaff.id,
          publicName: invitation.name,
          anonymityMode: "REAL_NAME",
        },
      });

      // Tandai undangan sebagai telah diterima
      await tx.staffInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      return newStaff;
    });

    await writeAudit({
      actorType: "STAFF",
      actorId: result.id,
      actorLabel: result.username,
      action: "staff.invitation_accepted",
      targetType: "AUTH",
      targetId: result.id,
      metadata: {
        username: result.username,
        role: result.role,
      },
    });

    return ok({
      success: true,
      message: "Akun berhasil diaktifkan. Silakan masuk menggunakan nama pengguna dan kata sandi Anda.",
      username: result.username,
    });
  } catch (error) {
    return jsonError(error);
  }
}

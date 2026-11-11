// GET  /api/studio/staff/invitations — daftar undangan tim redaksi (Chief Editor only).
// POST /api/studio/staff/invitations — buat undangan baru untuk Penulis (Chief Editor only).
import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, parseJsonBody, requireRole } from "@/lib/api";
import { toStaffInvitationDTO } from "@/lib/domain/serializers";
import { writeAudit } from "@/lib/domain/audit";

export async function GET() {
  try {
    await requireRole("CHIEF_EDITOR");

    const invitations = await db.staffInvitation.findMany({
      include: {
        invitedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return ok({
      invitations: invitations.map(toStaffInvitationDTO),
    });
  } catch (error) {
    return jsonError(error);
  }
}

const inviteSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter.").max(100, "Nama maksimal 100 karakter."),
  username: z
    .string()
    .min(3, "Nama pengguna minimal 3 karakter.")
    .max(50, "Nama pengguna maksimal 50 karakter.")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Nama pengguna hanya boleh berisi huruf, angka, garis bawah, titik, atau tanda hubung."),
  email: z.string().email("Format alamat email kontak tidak valid.").max(200).optional(),
  role: z.literal("WRITER", { message: "Hanya role Penulis (WRITER) yang dapat diundang." }).default("WRITER"),
});

export async function POST(request: Request) {
  try {
    const chief = await requireRole("CHIEF_EDITOR");
    const body = await parseJsonBody(request, inviteSchema);

    const cleanUsername = body.username.trim();
    const cleanEmail = body.email?.trim() || null;

    // 1. Periksa apakah nama pengguna sudah digunakan oleh akun staf (case-insensitive)
    const existingStaff =
      (await db.staffUser.findFirst({
        where: {
          OR: [
            { username: cleanUsername },
            { username: cleanUsername.toLowerCase() },
          ],
        },
      })) ??
      (
        await db.$queryRaw<Array<{ id: string }>>`SELECT id FROM StaffUser WHERE username = ${cleanUsername} COLLATE NOCASE LIMIT 1`
      )[0];

    if (existingStaff) {
      throw new ApiError(409, "USERNAME_IN_USE", "Nama pengguna sudah terdaftar pada akun staf lain.");
    }

    // 2. Periksa apakah ada undangan aktif yang belum kedaluwarsa dengan nama pengguna sama
    const activeInvitation = await db.staffInvitation.findFirst({
      where: {
        username: cleanUsername,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (activeInvitation) {
      throw new ApiError(409, "INVITATION_PENDING", "Sudah ada undangan aktif yang menunggu aktivasi untuk nama pengguna ini.");
    }

    // 3. Periksa keunikan email kontak bila diberikan
    if (cleanEmail) {
      const emailInUse = await db.staffUser.findFirst({
        where: { email: cleanEmail },
      });
      if (emailInUse) {
        throw new ApiError(409, "EMAIL_IN_USE", "Alamat email kontak sudah terdaftar pada akun staf lain.");
      }
    }

    // 4. Generate token acak kriptografis (32 byte hex = 64 karakter)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 hari

    const invitation = await db.staffInvitation.create({
      data: {
        name: body.name.trim(),
        username: cleanUsername,
        email: cleanEmail,
        role: "WRITER",
        tokenHash,
        expiresAt,
        invitedById: chief.id,
      },
      include: {
        invitedBy: { select: { name: true } },
      },
    });

    // 5. Catat audit trail tanpa mencatat rawToken atau secret
    await writeAudit({
      actorType: "STAFF",
      actorId: chief.id,
      actorLabel: chief.username || chief.email || chief.name,
      action: "staff.invited",
      targetType: "AUTH",
      targetId: invitation.id,
      metadata: {
        username: invitation.username,
        role: invitation.role,
        expiresAt: invitation.expiresAt.toISOString(),
      },
    });

    return ok(
      {
        invitation: toStaffInvitationDTO(invitation),
        activationToken: rawToken,
        activationUrl: `/studio/invitasi/${rawToken}`,
      },
      201
    );
  } catch (error) {
    return jsonError(error);
  }
}

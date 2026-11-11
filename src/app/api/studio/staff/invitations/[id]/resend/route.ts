// POST /api/studio/staff/invitations/[id]/resend — kirim ulang undangan dengan token baru (Chief Editor only).
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, requireRole } from "@/lib/api";
import { toStaffInvitationDTO } from "@/lib/domain/serializers";
import { writeAudit } from "@/lib/domain/audit";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const chief = await requireRole("CHIEF_EDITOR");
    const { id } = await params;

    const oldInvitation = await db.staffInvitation.findUnique({
      where: { id },
    });

    if (!oldInvitation) {
      throw new ApiError(404, "NOT_FOUND", "Undangan tidak ditemukan.");
    }

    if (oldInvitation.acceptedAt) {
      throw new ApiError(422, "ALREADY_ACCEPTED", "Undangan ini telah digunakan untuk aktivasi akun.");
    }

    // Cabut undangan lama dan terbitkan token baru dalam satu transaksi
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const newInvitation = await db.$transaction(async (tx) => {
      await tx.staffInvitation.update({
        where: { id: oldInvitation.id },
        data: { revokedAt: new Date() },
      });

      return tx.staffInvitation.create({
        data: {
          name: oldInvitation.name,
          username: oldInvitation.username,
          email: oldInvitation.email,
          role: "WRITER",
          tokenHash,
          expiresAt,
          invitedById: chief.id,
        },
        include: {
          invitedBy: { select: { name: true } },
        },
      });
    });

    await writeAudit({
      actorType: "STAFF",
      actorId: chief.id,
      actorLabel: chief.username || chief.email || chief.name,
      action: "staff.invitation_resent",
      targetType: "AUTH",
      targetId: newInvitation.id,
      metadata: {
        username: newInvitation.username,
        previousInvitationId: oldInvitation.id,
        expiresAt: newInvitation.expiresAt.toISOString(),
      },
    });

    return ok({
      invitation: toStaffInvitationDTO(newInvitation),
      activationToken: rawToken,
      activationUrl: `/studio/invitasi/${rawToken}`,
    });
  } catch (error) {
    return jsonError(error);
  }
}

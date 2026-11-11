// POST /api/studio/staff/invitations/[id]/revoke — cabut undangan tim redaksi (Chief Editor only).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, requireRole } from "@/lib/api";
import { writeAudit } from "@/lib/domain/audit";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const chief = await requireRole("CHIEF_EDITOR");
    const { id } = await params;

    const invitation = await db.staffInvitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      throw new ApiError(404, "NOT_FOUND", "Undangan tidak ditemukan.");
    }

    if (invitation.acceptedAt) {
      throw new ApiError(422, "ALREADY_ACCEPTED", "Undangan ini telah digunakan untuk aktivasi akun.");
    }

    if (invitation.revokedAt) {
      throw new ApiError(422, "ALREADY_REVOKED", "Undangan ini sudah dicabut sebelumnya.");
    }

    const updated = await db.staffInvitation.update({
      where: { id: invitation.id },
      data: { revokedAt: new Date() },
    });

    await writeAudit({
      actorType: "STAFF",
      actorId: chief.id,
      actorLabel: chief.username || chief.email || chief.name,
      action: "staff.invitation_revoked",
      targetType: "AUTH",
      targetId: invitation.id,
      metadata: {
        username: invitation.username,
        revokedAt: updated.revokedAt?.toISOString(),
      },
    });

    return ok({ success: true, message: "Undangan berhasil dicabut." });
  } catch (error) {
    return jsonError(error);
  }
}

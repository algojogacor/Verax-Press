// PATCH /api/studio/volunteers/[id] — Tangguhkan atau aktifkan kembali akun Volunteer (Chief Editor only).
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, parseJsonBody, requireRole } from "@/lib/api";
import { toContributorUserDTO } from "@/lib/domain/serializers";
import { writeAudit } from "@/lib/domain/audit";

type Params = { params: Promise<{ id: string }> };

const updateVolunteerSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

export async function PATCH(request: Request, { params }: Params) {
  try {
    const chief = await requireRole("CHIEF_EDITOR");
    const { id } = await params;
    const body = await parseJsonBody(request, updateVolunteerSchema);

    const contributor = await db.contributor.findUnique({
      where: { id },
      include: { person: true },
    });

    if (!contributor) {
      throw new ApiError(404, "NOT_FOUND", "Akun kontributor tidak ditemukan.");
    }

    const updated = await db.contributor.update({
      where: { id },
      data: { status: body.status },
      include: {
        person: { select: { publicName: true, bio: true } },
        _count: { select: { articles: true } },
      },
    });

    await writeAudit({
      actorType: "STAFF",
      actorId: chief.id,
      actorLabel: chief.username || chief.email || chief.name,
      action: body.status === "SUSPENDED" ? "contributor.suspended" : "contributor.reactivated",
      targetType: "AUTH",
      targetId: contributor.id,
      metadata: {
        contributorUsername: contributor.username,
        contributorEmail: contributor.email,
        newStatus: body.status,
      },
    });

    return ok({
      volunteer: toContributorUserDTO(updated),
      message: `Status kontributor berhasil diubah menjadi ${body.status === "ACTIVE" ? "Aktif" : "Ditangguhkan"}.`,
    });
  } catch (error) {
    return jsonError(error);
  }
}

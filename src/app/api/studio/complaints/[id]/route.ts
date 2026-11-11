// PATCH /api/studio/complaints/[id]: status dan keputusan keluhan (complaint:manage).
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, parseJsonBody, requireStaffPermission } from "@/lib/api";
import { toComplaintDTO } from "@/lib/domain/serializers";
import { writeAudit } from "@/lib/domain/audit";

type Params = { params: Promise<{ id: string }> };

const ALLOWED_STATUS_FLOWS: Record<string, string[]> = {
  RECEIVED: ["IN_REVIEW", "RESOLVED", "REJECTED"],
  IN_REVIEW: ["RESOLVED", "REJECTED"],
  RESOLVED: [],
  REJECTED: [],
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireStaffPermission("complaint:manage");
    const { id } = await params;
    const body = await parseJsonBody(
      request,
      z.object({
        status: z.enum(["RECEIVED", "IN_REVIEW", "RESOLVED", "REJECTED"]).optional(),
        decision: z.string().max(2_000).optional(),
      }),
    );

    const complaint = await db.complaint.findUnique({ where: { id } });
    if (!complaint) throw new ApiError(404, "NOT_FOUND", "Keluhan tidak ditemukan.");

    if (body.status && body.status !== complaint.status) {
      const allowed = ALLOWED_STATUS_FLOWS[complaint.status] ?? [];
      if (!allowed.includes(body.status)) {
        throw new ApiError(422, "INVALID_STATUS", `Transisi ${complaint.status} → ${body.status} tidak valid.`);
      }
      if ((body.status === "RESOLVED" || body.status === "REJECTED") && !body.decision?.trim()) {
        throw new ApiError(422, "DECISION_REQUIRED", "Keputusan wajib diisi untuk menyelesaikan/menolak keluhan.");
      }
    }

    const updated = await db.complaint.update({
      where: { id },
      data: {
        status: body.status ?? complaint.status,
        decision: body.decision ?? complaint.decision,
        decidedAt: body.status === "RESOLVED" || body.status === "REJECTED" ? new Date() : complaint.decidedAt,
      },
      include: { article: { select: { title: true, slug: true } } },
    });

    await writeAudit({
      actorType: "STAFF",
      actorId: user.id,
      actorLabel: user.email,
      action: "complaint.updated",
      targetType: "COMPLAINT",
      targetId: complaint.id,
      reason: body.decision ?? null,
      metadata: { from: complaint.status, to: updated.status, refCode: complaint.refCode },
    });

    return ok(toComplaintDTO(updated));
  } catch (error) {
    return jsonError(error);
  }
}

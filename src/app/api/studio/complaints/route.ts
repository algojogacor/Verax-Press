// GET /api/studio/complaints — register keluhan (complaint:manage).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, ok, requireSession } from "@/lib/api";
import { toComplaintDTO } from "@/lib/domain/serializers";
import { userHasPermission } from "@/lib/domain/permissions";

export async function GET(request: Request) {
  try {
    const user = await requireSession();
    if (!userHasPermission({ role: user.role, canRiskEdit: false, canManageComplaints: false }, "complaint:manage")) {
      // Chief Editor selalu boleh; editor butuh grant eksplisit.
      if (user.role !== "CHIEF_EDITOR") {
        return Response.json({ error: "Anda tidak memiliki izin complaint:manage.", code: "FORBIDDEN" }, { status: 403 });
      }
    }
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? undefined;
    const complaints = await db.complaint.findMany({
      where: status ? { status } : undefined,
      include: { article: { select: { title: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return ok({ complaints: complaints.map(toComplaintDTO) });
  } catch (error) {
    return jsonError(error);
  }
}

// GET /api/studio/complaints: register keluhan (complaint:manage).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, ok, requireStaffPermission } from "@/lib/api";
import { toComplaintDTO } from "@/lib/domain/serializers";

export async function GET(request: Request) {
  try {
    await requireStaffPermission("complaint:manage");
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

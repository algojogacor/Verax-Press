// GET /api/studio/audit — log audit global (Chief Editor only; audit:read).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, ok, requireRole } from "@/lib/api";
import { toAuditDTO } from "@/lib/domain/serializers";

export async function GET(request: Request) {
  try {
    await requireRole("CHIEF_EDITOR");
    const url = new URL(request.url);
    const action = url.searchParams.get("action") ?? undefined;
    const targetType = url.searchParams.get("targetType") ?? undefined;
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);

    const events = await db.auditEvent.findMany({
      where: {
        ...(action ? { action: { contains: action } } : {}),
        ...(targetType ? { targetType } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    const total = await db.auditEvent.count();
    return ok({ events: events.map(toAuditDTO), total });
  } catch (error) {
    return jsonError(error);
  }
}

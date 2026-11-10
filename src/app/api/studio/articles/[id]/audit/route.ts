// GET /api/studio/articles/[id]/audit — jejak audit artikel (editor+).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, requireRole } from "@/lib/api";
import { toAuditDTO } from "@/lib/domain/serializers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireRole("CHIEF_EDITOR", "EDITOR");
    const { id } = await params;
    const article = await db.article.findUnique({ where: { id }, select: { id: true } });
    if (!article) throw new ApiError(404, "NOT_FOUND", "Artikel tidak ditemukan.");
    // Event sumber memakai targetId = id sumber; kumpulkan dulu agar jejak audit artikel lengkap.
    const sourceIds = await db.sourceReference.findMany({
      where: { articleId: id },
      select: { id: true },
    });
    const events = await db.auditEvent.findMany({
      where: {
        OR: [
          { targetType: "ARTICLE", targetId: id },
          { targetType: "SOURCE", targetId: { in: sourceIds.map((s) => s.id) } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return ok({ events: events.map(toAuditDTO) });
  } catch (error) {
    return jsonError(error);
  }
}

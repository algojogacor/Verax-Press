// GET /api/studio/dashboard: ringkasan newsroom (role-scoped).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, requireSession } from "@/lib/api";
import { toAuditDTO } from "@/lib/domain/serializers";

export async function GET() {
  try {
    const user = await requireSession();
    const isChief = user.role === "CHIEF_EDITOR";

    // Penulis hanya melihat naskahnya sendiri. Pemimpin Redaksi melihat seluruh naskah.
    const articleFilter = isChief
      ? {}
      : {
          OR: [
            { createdById: user.id },
            { contributions: { some: { person: { staffUserId: user.id }, role: "AUTHOR" } } },
          ],
        };

    const [statusCounts, openComplaints, recentAudit, pendingGate] = await Promise.all([
      db.article.groupBy({ by: ["status"], where: articleFilter, _count: { _all: true } }),
      isChief
        ? db.complaint.count({ where: { status: { in: ["RECEIVED", "IN_REVIEW"] } } })
        : Promise.resolve(null),
      isChief
        ? db.auditEvent.findMany({ orderBy: { createdAt: "desc" }, take: 12 }).then((rows) => rows.map(toAuditDTO))
        : Promise.resolve([]),
      db.article.findMany({
        where: { ...articleFilter, status: "PENDING_APPROVAL" },
        select: {
          id: true,
          title: true,
          sources: { select: { isKeySource: true, verificationStatus: true } },
        },
      }),
    ]);

    const counts: Record<string, number> = {};
    for (const row of statusCounts) counts[row.status] = row._count._all;

    const gateWarnings = pendingGate.map((a) => {
      const unverified = a.sources.filter(
        (s) => s.isKeySource && (s.verificationStatus === "UNVERIFIED" || s.verificationStatus === "DISPUTED"),
      ).length;
      return { id: a.id, title: a.title, unverifiedKeySources: unverified };
    });

    return NextResponse.json({
      user,
      statusCounts: counts,
      openComplaints,
      recentAudit,
      gateWarnings,
      permissions: {
        canPublish: isChief,
        canReview: isChief,
        canVerifySources: isChief,
        canManageApiClients: isChief,
        canReadAudit: isChief,
        canManageStaff: isChief,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

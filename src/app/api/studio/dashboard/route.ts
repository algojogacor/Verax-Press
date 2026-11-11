// GET /api/studio/dashboard: ringkasan newsroom (role-scoped).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, requireSession } from "@/lib/api";
import { toAuditDTO } from "@/lib/domain/serializers";
import { userHasPermission } from "@/lib/domain/permissions";

export async function GET() {
  try {
    const user = await requireSession();
    const isEditorPlus = user.role === "CHIEF_EDITOR" || user.role === "EDITOR";
    const canSeeAudit = user.role === "CHIEF_EDITOR";

    // Grant eksplisit dari profil staf DB terverifikasi
    const canManageComplaints = userHasPermission(
      { role: user.role, canRiskEdit: user.canRiskEdit ?? false, canManageComplaints: user.canManageComplaints ?? false },
      "complaint:manage"
    );

    // Internal Author hanya melihat naskahnya sendiri.
    const articleFilter = isEditorPlus
      ? {}
      : {
          OR: [
            { createdById: user.id },
            { contributions: { some: { person: { staffUserId: user.id }, role: "AUTHOR" } } },
          ],
        };

    const [statusCounts, openComplaints, recentAudit, pendingGate] = await Promise.all([
      db.article.groupBy({ by: ["status"], where: articleFilter, _count: { _all: true } }),
      canManageComplaints
        ? db.complaint.count({ where: { status: { in: ["RECEIVED", "IN_REVIEW"] } } })
        : Promise.resolve(null),
      canSeeAudit
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
        canPublish: user.role === "CHIEF_EDITOR",
        canReview: isEditorPlus,
        canVerifySources: isEditorPlus,
        canManageComplaints,
        canManageApiClients: user.role === "CHIEF_EDITOR",
        canReadAudit: canSeeAudit,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

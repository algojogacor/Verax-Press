// GET /api/studio/api-clients/overview — Metrik Ringkasan Integrasi API (Chief Editor only).
// Menghitung statistik aktual dari basis data tanpa angka tiruan.

import { db } from "@/lib/db";
import { jsonError, ok, requireRole } from "@/lib/api";
import { getPublicBaseUrl, getSystemEnvironment } from "@/lib/domain/constants";
import type { ApiOverviewMetricsDTO } from "@/types/verity";

export async function GET() {
  try {
    await requireRole("CHIEF_EDITOR");

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalClients,
      activeClients,
      revokedClients,
      requestsToday,
      successfulSubmissionsToday,
      failedSubmissionsToday,
      latestLog,
      recentLogs,
    ] = await Promise.all([
      db.apiClient.count(),
      db.apiClient.count({ where: { status: "ACTIVE" } }),
      db.apiClient.count({ where: { status: "REVOKED" } }),
      db.apiRequestLog.count({ where: { createdAt: { gte: oneDayAgo } } }),
      db.apiRequestLog.count({
        where: {
          createdAt: { gte: oneDayAgo },
          endpoint: "/api/internal/v1/ai-submissions",
          statusCode: { in: [200, 201] },
        },
      }),
      db.apiRequestLog.count({
        where: {
          createdAt: { gte: oneDayAgo },
          endpoint: "/api/internal/v1/ai-submissions",
          statusCode: { gte: 400 },
        },
      }),
      db.apiRequestLog.findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      db.apiRequestLog.findMany({
        where: { createdAt: { gte: oneDayAgo } },
        select: { durationMs: true },
        take: 100,
      }),
    ]);

    const averageDurationMs =
      recentLogs.length > 0
        ? Math.round(recentLogs.reduce((acc, l) => acc + l.durationMs, 0) / recentLogs.length)
        : 0;

    const data: ApiOverviewMetricsDTO = {
      totalClients,
      activeClients,
      revokedClients,
      requestsToday,
      successfulSubmissionsToday,
      failedSubmissionsToday,
      lastRequestAt: latestLog?.createdAt.toISOString() ?? null,
      averageDurationMs,
      environment: getSystemEnvironment(),
      baseUrl: getPublicBaseUrl(),
    };

    return ok(data);
  } catch (error) {
    return jsonError(error);
  }
}

// GET /api/studio/api-clients/logs — Daftar log permintaan API (Chief Editor only).
// Dilengkapi paginasi dan filter status/klien/pencarian request ID.

import { db } from "@/lib/db";
import { jsonError, ok, requireRole } from "@/lib/api";
import { toApiRequestLogDTO } from "@/lib/domain/serializers";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    await requireRole("CHIEF_EDITOR");

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25", 10)));
    const clientId = url.searchParams.get("client") || undefined;
    const statusCode = url.searchParams.get("status") ? parseInt(url.searchParams.get("status")!, 10) : undefined;
    const search = url.searchParams.get("search")?.trim() || undefined;

    const where: Prisma.ApiRequestLogWhereInput = {};

    if (clientId) {
      where.apiClientId = clientId;
    }

    if (statusCode) {
      where.statusCode = statusCode;
    }

    if (search) {
      where.OR = [
        { requestId: { contains: search } },
        { submissionId: { contains: search } },
        { endpoint: { contains: search } },
      ];
    }

    const [total, logs] = await Promise.all([
      db.apiRequestLog.count({ where }),
      db.apiRequestLog.findMany({
        where,
        include: {
          apiClient: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return ok({
      logs: logs.map(toApiRequestLogDTO),
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    return jsonError(error);
  }
}

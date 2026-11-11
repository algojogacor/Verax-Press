// GET /api/studio/staff — daftar tim redaksi + statistik overview (Chief Editor only).
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { jsonError, ok, requireRole } from "@/lib/api";
import { toStaffUserDTO } from "@/lib/domain/serializers";
import type { Prisma } from "@prisma/client";

const querySchema = z.object({
  q: z.string().max(100).optional(),
  role: z.enum(["ALL", "CHIEF_EDITOR", "WRITER"]).default("ALL"),
  status: z.enum(["ALL", "ACTIVE", "SUSPENDED"]).default("ALL"),
  sortBy: z.enum(["name", "createdAt", "lastLoginAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(15),
});

export async function GET(request: Request) {
  try {
    await requireRole("CHIEF_EDITOR");
    const url = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(url.searchParams.entries()));

    const where: Prisma.StaffUserWhereInput = {};

    if (query.role !== "ALL") {
      where.role = query.role;
    }
    if (query.status !== "ALL") {
      where.status = query.status;
    }
    if (query.q && query.q.trim().length > 0) {
      const search = query.q.trim();
      where.OR = [
        { name: { contains: search } },
        { username: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const now = new Date();

    const [total, activeCount, suspendedCount, pendingInvitations, staffRecords] =
      await Promise.all([
        db.staffUser.count(),
        db.staffUser.count({ where: { status: "ACTIVE" } }),
        db.staffUser.count({ where: { status: "SUSPENDED" } }),
        db.staffInvitation.count({
          where: {
            acceptedAt: null,
            revokedAt: null,
            expiresAt: { gt: now },
          },
        }),
        db.staffUser.findMany({
          where,
          include: { person: { select: { bio: true } } },
          orderBy: { [query.sortBy]: query.sortOrder },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
      ]);

    const filteredTotal = await db.staffUser.count({ where });

    return ok({
      staff: staffRecords.map(toStaffUserDTO),
      overview: {
        total,
        active: activeCount,
        suspended: suspendedCount,
        pendingInvitations,
      },
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: filteredTotal,
        totalPages: Math.ceil(filteredTotal / query.pageSize) || 1,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

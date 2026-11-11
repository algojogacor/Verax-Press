// GET /api/studio/volunteers — Daftar akun Volunteer terdaftar (Chief Editor only).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, requireRole } from "@/lib/api";
import { toContributorUserDTO } from "@/lib/domain/serializers";
import type { ContributorOverviewDTO } from "@/types/verity";

export async function GET(request: Request) {
  try {
    await requireRole("CHIEF_EDITOR");

    const url = new URL(request.url);
    const search = url.searchParams.get("q")?.trim() || "";
    const statusFilter = url.searchParams.get("status") || "ALL";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get("pageSize") || "15", 10)));

    const [total, active, suspended, pendingApplications] = await Promise.all([
      db.contributor.count(),
      db.contributor.count({ where: { status: "ACTIVE" } }),
      db.contributor.count({ where: { status: "SUSPENDED" } }),
      db.contributorApplication.count({ where: { status: "PENDING" } }),
    ]);

    const overview: ContributorOverviewDTO = {
      total,
      active,
      suspended,
      pendingApplications,
    };

    const whereClause: any = {};
    if (statusFilter !== "ALL") {
      whereClause.status = statusFilter;
    }
    if (search) {
      whereClause.OR = [
        { username: { contains: search } },
        { email: { contains: search } },
        { person: { publicName: { contains: search } } },
      ];
    }

    const [volunteers, totalFiltered] = await Promise.all([
      db.contributor.findMany({
        where: whereClause,
        include: {
          person: { select: { publicName: true, bio: true } },
          _count: { select: { articles: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.contributor.count({ where: whereClause }),
    ]);

    return ok({
      volunteers: volunteers.map(toContributorUserDTO),
      overview,
      pagination: {
        page,
        pageSize,
        total: totalFiltered,
        totalPages: Math.ceil(totalFiltered / pageSize),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

// GET /api/studio/applications — Daftar permohonan Volunteer eksternal (Chief Editor only).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, requireRole } from "@/lib/api";
import { toContributorApplicationDTO } from "@/lib/domain/serializers";
import type { ContributorApplicationOverviewDTO } from "@/types/verity";

export async function GET(request: Request) {
  try {
    await requireRole("CHIEF_EDITOR");

    const url = new URL(request.url);
    const search = url.searchParams.get("q")?.trim() || "";
    const statusFilter = url.searchParams.get("status") || "ALL";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get("pageSize") || "15", 10)));

    // Overview counters
    const [total, pending, approved, rejected] = await Promise.all([
      db.contributorApplication.count(),
      db.contributorApplication.count({ where: { status: "PENDING" } }),
      db.contributorApplication.count({ where: { status: "APPROVED" } }),
      db.contributorApplication.count({ where: { status: "REJECTED" } }),
    ]);

    const overview: ContributorApplicationOverviewDTO = {
      total,
      pending,
      approved,
      rejected,
    };

    // Build filter
    const whereClause: any = {};
    if (statusFilter !== "ALL") {
      whereClause.status = statusFilter;
    }
    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { interests: { contains: search } },
        { bio: { contains: search } },
      ];
    }

    const [applications, totalFiltered] = await Promise.all([
      db.contributorApplication.findMany({
        where: whereClause,
        include: {
          decidedBy: { select: { name: true } },
          invitation: {
            select: {
              tokenHash: true,
              expiresAt: true,
              acceptedAt: true,
              revokedAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.contributorApplication.count({ where: whereClause }),
    ]);

    return ok({
      applications: applications.map(toContributorApplicationDTO),
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

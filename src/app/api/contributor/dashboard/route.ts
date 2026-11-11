// GET /api/contributor/dashboard — Ringkasan metrik portal kontributor.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError, ok, requireContributorSession } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireContributorSession();

    const [
      totalArticles,
      draftCount,
      pendingReviewCount,
      revisionNeededCount,
      publishedCount,
      recentArticles,
    ] = await Promise.all([
      db.article.count({ where: { contributorId: user.id } }),
      db.article.count({ where: { contributorId: user.id, status: "DRAFT" } }),
      db.article.count({
        where: {
          contributorId: user.id,
          status: { in: ["PENDING_REVIEW", "FACT_CHECK", "PENDING_APPROVAL"] },
        },
      }),
      db.article.count({ where: { contributorId: user.id, status: "REVISION_NEEDED" } }),
      db.article.count({ where: { contributorId: user.id, status: "PUBLISHED" } }),
      db.article.findMany({
        where: { contributorId: user.id },
        select: {
          id: true,
          title: true,
          slug: true,
          format: true,
          status: true,
          updatedAt: true,
          desk: { select: { name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

    return ok({
      totalArticles,
      draftCount,
      inReviewCount: pendingReviewCount,
      revisionCount: revisionNeededCount,
      publishedCount,
      metrics: {
        totalArticles,
        draftCount,
        pendingReviewCount,
        revisionNeededCount,
        publishedCount,
      },
      recentArticles: recentArticles.map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        format: a.format,
        status: a.status,
        deskName: a.desk.name,
        updatedAt: a.updatedAt.toISOString(),
      })),
      user: {
        name: user.name,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

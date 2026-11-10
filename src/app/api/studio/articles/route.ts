// GET  /api/studio/articles — daftar artikel (role-scoped + filter).
// POST /api/studio/articles — buat artikel baru (article:create).
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, parseJsonBody, requireSession } from "@/lib/api";
import { articleListInclude, createArticleVersion, toArticleListItem } from "@/lib/domain/serializers";
import { userHasPermission } from "@/lib/domain/permissions";
import { articleContentSchema, serializeContent } from "@/lib/domain/content";
import { uniqueArticleSlug } from "@/lib/domain/slug";
import { writeAudit } from "@/lib/domain/audit";
import { ARTICLE_FORMATS, AI_INVOLVEMENTS } from "@/lib/domain/constants";
import type { Prisma } from "@prisma/client";

const listQuerySchema = z.object({
  status: z.string().optional(),
  desk: z.string().optional(),
  format: z.string().optional(),
  q: z.string().max(120).optional(),
  scope: z.enum(["all", "own"]).optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireSession();
    const url = new URL(request.url);
    const query = listQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));

    const isEditorPlus = user.role === "CHIEF_EDITOR" || user.role === "EDITOR";

    const where: Prisma.ArticleWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.desk) where.desk = { slug: query.desk };
    if (query.format) where.format = query.format;
    if (query.q) where.title = { contains: query.q };

    if (!isEditorPlus || query.scope === "own") {
      where.OR = [
        { createdById: user.id },
        { contributions: { some: { person: { staffUserId: user.id }, role: "AUTHOR" } } },
      ];
    }

    const articles = await db.article.findMany({
      where,
      include: articleListInclude,
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    return ok({ articles: articles.map((a) => toArticleListItem(a, user)) });
  } catch (error) {
    return jsonError(error);
  }
}

const createSchema = z.object({
  title: z.string().min(8).max(200),
  deck: z.string().max(400).optional(),
  deskSlug: z.string().min(1),
  format: z.enum(ARTICLE_FORMATS as [string, ...string[]]),
  aiInvolvement: z.enum(AI_INVOLVEMENTS as [string, ...string[]]).default("none"),
  content: articleContentSchema.default([]),
});

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    if (!userHasPermission({ role: user.role, canRiskEdit: false, canManageComplaints: false }, "article:create")) {
      throw new ApiError(403, "FORBIDDEN", "Role Anda tidak dapat membuat artikel.");
    }
    const body = await parseJsonBody(request, createSchema);

    const desk = await db.desk.findUnique({ where: { slug: body.deskSlug } });
    if (!desk || !desk.isActive) throw new ApiError(422, "DESK_NOT_FOUND", "Desk tidak ditemukan atau tidak aktif.");

    const slug = await uniqueArticleSlug(body.title);
    const contentJson = serializeContent(body.content);

    const article = await db.article.create({
      data: {
        slug,
        title: body.title,
        deck: body.deck ?? null,
        deskId: desk.id,
        format: body.format,
        status: "DRAFT",
        contentJson,
        origin: "NEWSROOM",
        byline: `Oleh ${user.name}`,
        aiInvolvement: body.aiInvolvement,
        createdById: user.id,
      },
    });

    await createArticleVersion({
      articleId: article.id,
      title: article.title,
      deck: article.deck,
      contentJson,
      versionType: "author",
      createdById: user.id,
    });

    await writeAudit({
      actorType: "STAFF",
      actorId: user.id,
      actorLabel: user.email,
      action: "article.created",
      targetType: "ARTICLE",
      targetId: article.id,
      metadata: { title: article.title, format: article.format },
    });

    return ok({ id: article.id, slug: article.slug }, 201);
  } catch (error) {
    return jsonError(error);
  }
}

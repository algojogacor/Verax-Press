// GET  /api/studio/articles/[id]/comments — daftar komentar (internal note + author-visible).
// POST /api/studio/articles/[id]/comments — tambah komentar. authorVisible=false default (internal).
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, parseJsonBody, requireSession } from "@/lib/api";
import { articleDetailInclude, toArticleDetail } from "@/lib/domain/serializers";
import { canReadArticle } from "@/lib/domain/permissions";
import { writeAudit } from "@/lib/domain/audit";

type Params = { params: Promise<{ id: string }> };

async function loadAndAuthorize(id: string, userId: string, role: string) {
  const article = await db.article.findUnique({ where: { id }, include: articleDetailInclude });
  if (!article) throw new ApiError(404, "NOT_FOUND", "Artikel tidak ditemukan.");
  const authorStaffIds = article.contributions
    .filter((c) => c.role === "AUTHOR")
    .map((c) => c.person.staffUserId)
    .filter((s): s is string => Boolean(s));
  if (!canReadArticle({ id: userId, role: role as never }, article, authorStaffIds)) {
    throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke artikel ini.");
  }
  return article;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireSession();
    const { id } = await params;
    await loadAndAuthorize(id, user.id, user.role);
    const fresh = await db.article.findUnique({ where: { id }, include: articleDetailInclude });
    return ok({ comments: toArticleDetail(fresh!, user).comments });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const article = await loadAndAuthorize(id, user.id, user.role);
    const body = await parseJsonBody(
      request,
      z.object({
        body: z.string().min(2).max(4_000).optional(),
        comment: z.string().min(2).max(4_000).optional(),
        authorVisible: z.boolean().default(false),
      }).refine((d) => d.body || d.comment, { message: "Isi komentar wajib diisi." }),
    );

    const commentText = (body.body ?? body.comment)!;

    await db.reviewComment.create({
      data: {
        articleId: article.id,
        authorId: user.id,
        authorVisible: body.authorVisible,
        body: commentText,
      },
    });

    await writeAudit({
      actorType: "STAFF",
      actorId: user.id,
      actorLabel: user.email,
      action: "comment.added",
      targetType: "ARTICLE",
      targetId: article.id,
      metadata: { authorVisible: body.authorVisible },
    });

    const fresh = await db.article.findUnique({ where: { id: article.id }, include: articleDetailInclude });
    return ok({ comments: toArticleDetail(fresh!, user).comments }, 201);
  } catch (error) {
    return jsonError(error);
  }
}

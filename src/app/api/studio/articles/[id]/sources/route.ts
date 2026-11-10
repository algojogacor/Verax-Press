// POST /api/studio/articles/[id]/sources — tambah referensi sumber.
// verificationStatus SELALU dimulai UNVERIFIED; isKeySource hanya boleh ditetapkan editor+ (TA §10).
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, parseJsonBody, requireSession } from "@/lib/api";
import { articleDetailInclude, toArticleDetail } from "@/lib/domain/serializers";
import { canEditArticleContent, canReadArticle } from "@/lib/domain/permissions";
import { writeAudit } from "@/lib/domain/audit";
import { SOURCE_TYPES } from "@/lib/domain/constants";

type Params = { params: Promise<{ id: string }> };

const sourceSchema = z.object({
  title: z.string().min(3).max(300),
  publisher: z.string().max(200).optional(),
  url: z.string().url().max(2_000),
  sourceType: z.enum(SOURCE_TYPES as [string, ...string[]]),
  publishedAt: z.string().datetime().optional().nullable(),
  accessedAt: z.string().datetime().optional().nullable(),
  supports: z.string().max(600).optional(),
  isKeySource: z.boolean().optional(),
});

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const body = await parseJsonBody(request, sourceSchema);

    const article = await db.article.findUnique({ where: { id }, include: articleDetailInclude });
    if (!article) throw new ApiError(404, "NOT_FOUND", "Artikel tidak ditemukan.");

    const authorStaffIds = article.contributions
      .filter((c) => c.role === "AUTHOR")
      .map((c) => c.person.staffUserId)
      .filter((s): s is string => Boolean(s));
    if (!canReadArticle(user, article, authorStaffIds)) {
      throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke artikel ini.");
    }
    if (!canEditArticleContent(user, article, authorStaffIds)) {
      throw new ApiError(403, "FORBIDDEN", "Sumber tidak dapat diubah pada status artikel ini.");
    }

    const isEditorPlus = user.role === "CHIEF_EDITOR" || user.role === "EDITOR";

    await db.sourceReference.create({
      data: {
        articleId: article.id,
        title: body.title,
        publisher: body.publisher ?? null,
        url: body.url,
        sourceType: body.sourceType,
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
        accessedAt: body.accessedAt ? new Date(body.accessedAt) : new Date(),
        supports: body.supports ?? null,
        isKeySource: isEditorPlus ? (body.isKeySource ?? false) : false, // penanda kunci hanya editor
        verificationStatus: "UNVERIFIED", // selalu; hanya editor yang mengubah via PATCH
      },
    });

    await writeAudit({
      actorType: "STAFF",
      actorId: user.id,
      actorLabel: user.email,
      action: "source.added",
      targetType: "SOURCE",
      targetId: article.id,
      metadata: { title: body.title, isKeySource: body.isKeySource ?? false },
    });

    const fresh = await db.article.findUnique({ where: { id: article.id }, include: articleDetailInclude });
    return ok(toArticleDetail(fresh!, user), 201);
  } catch (error) {
    return jsonError(error);
  }
}

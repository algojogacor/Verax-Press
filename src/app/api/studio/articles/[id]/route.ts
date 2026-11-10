// GET   /api/studio/articles/[id] — detail (ownership/role check).
// PATCH /api/studio/articles/[id] — simpan konten/metadata (versi baru otomatis).
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, parseJsonBody, requireSession } from "@/lib/api";
import {
  articleDetailInclude,
  createArticleVersion,
  isOwnerOf,
  toArticleDetail,
} from "@/lib/domain/serializers";
import { canEditArticleContent, canReadArticle } from "@/lib/domain/permissions";
import { articleContentSchema, serializeContent } from "@/lib/domain/content";
import { writeAudit } from "@/lib/domain/audit";
import { ARTICLE_FORMATS, AI_INVOLVEMENTS } from "@/lib/domain/constants";
import type { VersionType } from "@/types/verity";

type Params = { params: Promise<{ id: string }> };

async function loadArticle(id: string) {
  const article = await db.article.findUnique({ where: { id }, include: articleDetailInclude });
  if (!article) throw new ApiError(404, "NOT_FOUND", "Artikel tidak ditemukan.");
  return article;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const article = await loadArticle(id);
    const authorStaffIds = article.contributions
      .filter((c) => c.role === "AUTHOR")
      .map((c) => c.person.staffUserId)
      .filter((s): s is string => Boolean(s));
    if (!canReadArticle(user, article, authorStaffIds)) {
      throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke artikel ini.");
    }
    return ok(toArticleDetail(article, user));
  } catch (error) {
    return jsonError(error);
  }
}

const patchSchema = z.object({
  title: z.string().min(8).max(200).optional(),
  deck: z.string().max(400).nullable().optional(),
  deskSlug: z.string().optional(),
  format: z.enum(ARTICLE_FORMATS as [string, ...string[]]).optional(),
  byline: z.string().max(200).optional(),
  aiInvolvement: z.enum(AI_INVOLVEMENTS as [string, ...string[]]).optional(),
  aiDisclosurePublic: z.boolean().optional(),
  aiDisclosureNote: z.string().max(600).nullable().optional(),
  content: articleContentSchema.optional(),
  changeReason: z.string().max(600).optional(),
  versionType: z.enum(["author", "editorial_copyedit"]).optional(),
  contributions: z
    .array(
      z.object({
        personName: z.string().min(2).max(120),
        role: z.enum(["AUTHOR", "EDITOR", "REPORTER", "REVIEWER", "VISUAL"]),
        publicCredit: z.boolean().default(true),
      }),
    )
    .max(12)
    .optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const article = await loadArticle(id);
    const body = await parseJsonBody(request, patchSchema);

    const own = isOwnerOf(article, user.id);
    const authorStaffIds = article.contributions
      .filter((c) => c.role === "AUTHOR")
      .map((c) => c.person.staffUserId)
      .filter((s): s is string => Boolean(s));

    if (!canReadArticle(user, article, authorStaffIds)) {
      throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke artikel ini.");
    }
    if (!canEditArticleContent(user, article, authorStaffIds)) {
      throw new ApiError(
        403,
        "EDIT_NOT_ALLOWED",
        "Artikel tidak dapat disunting pada status ini oleh role Anda. Perubahan pasca-terbit harus melalui jalur koreksi.",
      );
    }

    // Kontribusi terstruktur hanya boleh diatur editor/chief.
    if (body.contributions && user.role !== "CHIEF_EDITOR" && user.role !== "EDITOR") {
      throw new ApiError(403, "FORBIDDEN", "Kredit kontribusi hanya dapat diatur editor.");
    }

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.deck !== undefined) data.deck = body.deck;
    if (body.byline !== undefined) data.byline = body.byline;
    if (body.aiInvolvement !== undefined) data.aiInvolvement = body.aiInvolvement;
    if (body.aiDisclosurePublic !== undefined) {
      data.aiDisclosurePublic = body.aiDisclosurePublic;
      data.disclosureDecidedById = user.id;
      data.disclosureDecidedAt = new Date();
    }
    if (body.aiDisclosureNote !== undefined) data.aiDisclosureNote = body.aiDisclosureNote;
    if (body.format !== undefined) data.format = body.format;
    if (body.deskSlug !== undefined) {
      const desk = await db.desk.findUnique({ where: { slug: body.deskSlug } });
      if (!desk || !desk.isActive) throw new ApiError(422, "DESK_NOT_FOUND", "Desk tidak ditemukan.");
      data.deskId = desk.id;
    }

    const contentChanged = body.content !== undefined;
    if (contentChanged) data.contentJson = serializeContent(body.content!);

    const updated = await db.article.update({ where: { id: article.id }, data });

    // Simpan versi baru bila konten berubah (bukan hanya metadata disclosure).
    if (contentChanged) {
      const isEditorial = (user.role === "EDITOR" || user.role === "CHIEF_EDITOR") && !own;
      const versionType: VersionType =
        body.versionType ?? (isEditorial ? "editorial_copyedit" : "author");
      await createArticleVersion({
        articleId: article.id,
        title: updated.title,
        deck: updated.deck,
        contentJson: updated.contentJson,
        versionType,
        changeReason: body.changeReason ?? null,
        createdById: user.id,
        createdByLabel: user.email,
      });
    }

    if (body.contributions) {
      await db.articleContribution.deleteMany({ where: { articleId: article.id } });
      for (let i = 0; i < body.contributions.length; i += 1) {
        const c = body.contributions[i];
        // find-or-create identitas publik BYLINE_ONLY
        let person = await db.person.findFirst({ where: { publicName: c.personName } });
        if (!person) {
          person = await db.person.create({
            data: { accountType: "BYLINE_ONLY", publicName: c.personName },
          });
        }
        await db.articleContribution.create({
          data: {
            articleId: article.id,
            personId: person.id,
            role: c.role,
            displayOrder: i,
            publicCredit: c.publicCredit,
          },
        });
      }
    }

    await writeAudit({
      actorType: "STAFF",
      actorId: user.id,
      actorLabel: user.email,
      action: contentChanged ? "article.content_updated" : "article.metadata_updated",
      targetType: "ARTICLE",
      targetId: article.id,
      reason: body.changeReason ?? null,
      metadata: { versionSaved: contentChanged },
    });

    const fresh = await loadArticle(article.id);
    return ok(toArticleDetail(fresh, user));
  } catch (error) {
    return jsonError(error);
  }
}

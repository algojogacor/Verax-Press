// GET  /api/contributor/articles — Daftar naskah milik kontributor.
// POST /api/contributor/articles — Buat naskah baru kontributor (status DRAFT).
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, parseJsonBody, requireContributorSession } from "@/lib/api";
import { articleContentSchema, serializeContent } from "@/lib/domain/content";
import { uniqueArticleSlug } from "@/lib/domain/slug";
import { createArticleVersion } from "@/lib/domain/serializers";
import { writeAudit } from "@/lib/domain/audit";
import { AI_INVOLVEMENTS } from "@/lib/domain/constants";

// Format yang diizinkan untuk kontributor eksternal (Charter & Contributor Policy V1.1)
// Format NEWS dilarang untuk naskah kontributor eksternal.
const CONTRIBUTOR_ALLOWED_FORMATS = [
  "OPINION",
  "ANALYSIS",
  "EXPLAINER",
  "FEATURE",
  "INTERVIEW",
] as const;

export async function GET(request: Request) {
  try {
    const user = await requireContributorSession();

    const url = new URL(request.url);
    const search = url.searchParams.get("q")?.trim() || "";
    const statusFilter = url.searchParams.get("status") || "ALL";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get("pageSize") || "15", 10)));

    const whereClause: any = {
      contributorId: user.id,
    };

    if (statusFilter !== "ALL") {
      whereClause.status = statusFilter;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search } },
        { deck: { contains: search } },
      ];
    }

    const [articles, totalFiltered] = await Promise.all([
      db.article.findMany({
        where: whereClause,
        include: {
          desk: { select: { slug: true, name: true } },
          sources: { select: { id: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.article.count({ where: whereClause }),
    ]);

    return ok({
      articles: articles.map((a) => ({
        id: a.id,
        slug: a.slug,
        title: a.title,
        deck: a.deck,
        deskSlug: a.desk.slug,
        deskName: a.desk.name,
        format: a.format,
        status: a.status,
        sourceCount: a.sources.length,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
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

const createContributorArticleSchema = z.object({
  title: z.string().min(5, "Judul naskah minimal 5 karakter.").max(200, "Judul naskah maksimal 200 karakter."),
  deck: z.string().max(400, "Ringkasan naskah maksimal 400 karakter.").optional(),
  deskSlug: z.string().min(1, "Desk wajib dipilih."),
  format: z.string().refine((f) => {
    if (f === "NEWS") return false;
    return (CONTRIBUTOR_ALLOWED_FORMATS as readonly string[]).includes(f);
  }, {
    message: "Format Berita (NEWS) hanya dapat diproduksi oleh redaksi internal Verax Press.",
  }),
  aiInvolvement: z.enum(AI_INVOLVEMENTS as [string, ...string[]]).default("none"),
  content: articleContentSchema.default([]),
});

export async function POST(request: Request) {
  try {
    const user = await requireContributorSession();
    const body = await parseJsonBody(request, createContributorArticleSchema);

    // 1. Verifikasi desk aktif
    const desk = await db.desk.findUnique({ where: { slug: body.deskSlug } });
    if (!desk || !desk.isActive) {
      throw new ApiError(422, "DESK_NOT_FOUND", "Desk yang dipilih tidak ditemukan atau tidak aktif.");
    }

    // 2. Buat slug unik
    const slug = await uniqueArticleSlug(body.title);
    const contentJson = serializeContent(body.content);

    // 3. Pastikan record Person kontributor tersedia
    let person = await db.person.findUnique({ where: { contributorId: user.id } });
    if (!person) {
      person = await db.person.create({
        data: {
          accountType: "EXTERNAL",
          contributorId: user.id,
          publicName: user.name,
        },
      });
    }

    // 4. Buat Article dalam transaksi atomik
    const article = await db.$transaction(async (tx) => {
      const art = await tx.article.create({
        data: {
          slug,
          title: body.title,
          deck: body.deck ?? null,
          deskId: desk.id,
          format: body.format,
          status: "DRAFT",
          contentJson,
          origin: "CONTRIBUTOR",
          byline: `Oleh ${person.publicName}`,
          aiInvolvement: body.aiInvolvement,
          contributorId: user.id,
        },
      });

      // Kredit penulis
      await tx.articleContribution.create({
        data: {
          articleId: art.id,
          personId: person.id,
          role: "AUTHOR",
          displayOrder: 0,
          publicCredit: true,
        },
      });

      // Versi awal
      await tx.articleVersion.create({
        data: {
          articleId: art.id,
          versionNo: 1,
          title: art.title,
          deck: art.deck,
          contentJson,
          versionType: "author",
          createdByLabel: `kontributor:${user.username || user.email}`,
        },
      });

      // Rekaman intake submission
      await tx.submission.create({
        data: {
          origin: "CONTRIBUTOR",
          articleId: art.id,
          contributorId: user.id,
          status: "SUBMITTED",
          aiInvolvementDeclared: body.aiInvolvement,
        },
      });

      return art;
    });

    // 5. Catat jejak audit
    await writeAudit({
      actorType: "CONTRIBUTOR",
      actorId: user.id,
      actorLabel: user.username || user.email,
      action: "contributor.article_created",
      targetType: "ARTICLE",
      targetId: article.id,
      metadata: {
        title: article.title,
        format: article.format,
        deskSlug: desk.slug,
      },
    });

    return ok({ id: article.id, slug: article.slug }, 201);
  } catch (error) {
    return jsonError(error);
  }
}

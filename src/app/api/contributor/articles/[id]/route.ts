// GET   /api/contributor/articles/[id] — Detail naskah milik kontributor.
// PATCH /api/contributor/articles/[id] — Perbarui draf/revisi naskah kontributor.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, parseJsonBody, requireContributorSession } from "@/lib/api";
import { articleContentSchema, serializeContent } from "@/lib/domain/content";
import { createArticleVersion } from "@/lib/domain/serializers";
import { writeAudit } from "@/lib/domain/audit";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireContributorSession();
    const { id } = await params;

    const article = await db.article.findUnique({
      where: { id },
      include: {
        desk: { select: { id: true, slug: true, name: true } },
        sources: { orderBy: { createdAt: "desc" } },
        versions: { orderBy: { versionNo: "desc" } },
        reviews: {
          orderBy: { createdAt: "desc" },
          include: { reviewer: { select: { name: true } } },
        },
        comments: {
          where: { authorVisible: true }, // Hanya komentar yang diizinkan untuk penulis/kontributor
          orderBy: { createdAt: "desc" },
          include: { author: { select: { name: true } } },
        },
      },
    });

    if (!article) {
      throw new ApiError(404, "NOT_FOUND", "Naskah tidak ditemukan.");
    }

    // Penegakan kepemilikan server-side: hanya kontributor pemilik yang boleh membaca
    if (article.contributorId !== user.id) {
      throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke naskah ini.");
    }

    let parsedContent = [];
    try {
      parsedContent = JSON.parse(article.contentJson || "[]");
    } catch {}

    // Transisi yang diizinkan untuk kontributor
    const allowedTransitions = [];
    if (article.status === "DRAFT") {
      allowedTransitions.push({ action: "SUBMIT_REVIEW", label: "Kirim untuk Ditinjau" });
      allowedTransitions.push({ action: "WITHDRAW", label: "Tarik Naskah" });
    } else if (article.status === "REVISION_NEEDED") {
      allowedTransitions.push({ action: "RESUBMIT_REVIEW", label: "Kirim Ulang Revisi" });
      allowedTransitions.push({ action: "WITHDRAW", label: "Tarik Naskah" });
    }

    return ok({
      article: {
        id: article.id,
        slug: article.slug,
        title: article.title,
        deck: article.deck,
        format: article.format,
        status: article.status,
        origin: article.origin,
        byline: article.byline,
        aiInvolvement: article.aiInvolvement,
        desk: article.desk,
        content: parsedContent,
        sources: article.sources.map((s) => ({
          id: s.id,
          title: s.title,
          publisher: s.publisher,
          url: s.url,
          sourceType: s.sourceType,
          verificationStatus: s.verificationStatus,
          createdAt: s.createdAt.toISOString(),
        })),
        versions: article.versions.map((v) => ({
          id: v.id,
          versionNo: v.versionNo,
          versionType: v.versionType,
          title: v.title,
          deck: v.deck,
          createdAt: v.createdAt.toISOString(),
        })),
        reviews: article.reviews.map((r) => ({
          id: r.id,
          decision: r.decision,
          fromStatus: r.fromStatus,
          toStatus: r.toStatus,
          notes: r.notes, // Catatan editorial revisi/keputusan
          reviewerName: r.reviewer?.name ?? "Redaksi Verax",
          createdAt: r.createdAt.toISOString(),
        })),
        comments: article.comments.map((c) => ({
          id: c.id,
          body: c.body,
          authorName: c.author.name,
          createdAt: c.createdAt.toISOString(),
        })),
        allowedTransitions,
        createdAt: article.createdAt.toISOString(),
        updatedAt: article.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

const updateContributorArticleSchema = z.object({
  title: z.string().min(5, "Judul naskah minimal 5 karakter.").max(200).optional(),
  deck: z.string().max(400).optional().nullable(),
  deskSlug: z.string().min(1).optional(),
  // Kebijakan Kontributor V1.1 (/editorial/context?channel=CONTRIBUTOR): hanya "none" atau "assistive"
  aiInvolvement: z.enum(["none", "assistive"]).optional(),
  content: articleContentSchema.optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireContributorSession();
    const { id } = await params;
    const body = await parseJsonBody(request, updateContributorArticleSchema);

    const article = await db.article.findUnique({ where: { id } });
    if (!article) {
      throw new ApiError(404, "NOT_FOUND", "Naskah tidak ditemukan.");
    }

    // Penegakan kepemilikan server-side
    if (article.contributorId !== user.id) {
      throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke naskah ini.");
    }

    // Penegakan status: hanya DRAFT atau REVISION_NEEDED yang dapat diubah oleh kontributor
    if (article.status !== "DRAFT" && article.status !== "REVISION_NEEDED") {
      throw new ApiError(
        403,
        "FORBIDDEN",
        `Naskah berstatus ${article.status} tidak dapat diubah. Hanya draf atau naskah dengan permintaan revisi yang dapat diperbarui.`
      );
    }

    const dataToUpdate: any = {};
    if (body.title !== undefined) dataToUpdate.title = body.title.trim();
    if (body.deck !== undefined) dataToUpdate.deck = body.deck?.trim() || null;
    if (body.aiInvolvement !== undefined) dataToUpdate.aiInvolvement = body.aiInvolvement;

    if (body.deskSlug) {
      const desk = await db.desk.findUnique({ where: { slug: body.deskSlug } });
      if (!desk || !desk.isActive) {
        throw new ApiError(422, "DESK_NOT_FOUND", "Desk tidak ditemukan atau tidak aktif.");
      }
      dataToUpdate.deskId = desk.id;
    }

    let serializedJson = article.contentJson;
    if (body.content !== undefined) {
      serializedJson = serializeContent(body.content);
      dataToUpdate.contentJson = serializedJson;
    }

    const updated = await db.article.update({
      where: { id },
      data: dataToUpdate,
    });

    // Simpan riwayat versi bila judul, deck, atau konten diperbarui
    if (body.title || body.deck !== undefined || body.content !== undefined) {
      await createArticleVersion({
        articleId: article.id,
        title: updated.title,
        deck: updated.deck,
        contentJson: serializedJson,
        versionType: "author",
        createdByLabel: `kontributor:${user.username || user.email}`,
      });
    }

    await writeAudit({
      actorType: "CONTRIBUTOR",
      actorId: user.id,
      actorLabel: user.username || user.email,
      action: "contributor.article_updated",
      targetType: "ARTICLE",
      targetId: article.id,
      metadata: {
        title: updated.title,
        status: updated.status,
      },
    });

    return ok({
      id: updated.id,
      title: updated.title,
      deck: updated.deck,
      status: updated.status,
      message: "Naskah berhasil disimpan.",
    });
  } catch (error) {
    return jsonError(error);
  }
}

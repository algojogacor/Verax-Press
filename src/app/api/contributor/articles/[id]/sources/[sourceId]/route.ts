// DELETE /api/contributor/articles/[id]/sources/[sourceId] — hapus sumber oleh kontributor.
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, requireContributorSession } from "@/lib/api";
import { writeAudit } from "@/lib/domain/audit";

type Params = { params: Promise<{ id: string; sourceId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireContributorSession();
    const { id, sourceId } = await params;

    const article = await db.article.findUnique({
      where: { id },
      select: { id: true, contributorId: true, status: true },
    });
    if (!article) throw new ApiError(404, "NOT_FOUND", "Artikel tidak ditemukan.");

    if (article.contributorId !== user.id) {
      throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke naskah ini.");
    }

    if (article.status !== "DRAFT" && article.status !== "REVISION_NEEDED") {
      throw new ApiError(
        403,
        "FORBIDDEN",
        `Sumber tidak dapat dihapus saat naskah berstatus ${article.status}.`,
      );
    }

    const source = await db.sourceReference.findUnique({ where: { id: sourceId } });
    if (!source || source.articleId !== article.id) {
      throw new ApiError(404, "NOT_FOUND", "Sumber rujukan tidak ditemukan.");
    }

    await db.sourceReference.delete({ where: { id: sourceId } });

    await writeAudit({
      actorType: "CONTRIBUTOR",
      actorId: user.id,
      actorLabel: user.username || user.email || user.name,
      action: "source.deleted",
      targetType: "SOURCE",
      targetId: sourceId,
      metadata: { articleId: article.id, title: source.title },
    });

    return ok({ success: true, deletedId: sourceId });
  } catch (error) {
    return jsonError(error);
  }
}

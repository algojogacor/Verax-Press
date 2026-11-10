// Media asset management: delete media asset with bidirectional synchronization
// to Azure VM persistent media storage service.
import { db } from "@/lib/db";
import { requireSession, ok, jsonError, ApiError } from "@/lib/api";
import { writeAudit } from "@/lib/domain/audit";
import { deleteFromMediaStorage } from "@/lib/media-client";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSession();
    if (user.role !== "CHIEF_EDITOR" && user.role !== "EDITOR") {
      throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki izin menghapus aset media.");
    }

    const { id } = await params;
    const asset = await db.mediaAsset.findUnique({
      where: { id },
      include: {
        heroForArticles: { select: { id: true, title: true } },
      },
    });

    if (!asset) {
      throw new ApiError(404, "NOT_FOUND", "Aset media tidak ditemukan.");
    }

    // Check if actively used as hero in published/draft articles
    if (asset.heroForArticles.length > 0) {
      const titles = asset.heroForArticles.map((a) => `"${a.title}"`).join(", ");
      throw new ApiError(
        409,
        "CONFLICT",
        `Aset media masih digunakan sebagai gambar utama pada artikel: ${titles}. Lepaskan terlebih dahulu sebelum menghapus.`
      );
    }

    // If stored on Azure VM media storage, quarantine remote asset
    if (process.env.VERAX_MEDIA_API_URL && asset.storageKey?.startsWith("media/")) {
      const mediaId = asset.storageKey.replace(/^media\//, "");
      try {
        await deleteFromMediaStorage(mediaId, user.id);
      } catch (err: any) {
        console.warn(`[Media Delete] Warning: Remote storage quarantine failed for ${mediaId}:`, err.message);
      }
    }

    await db.mediaAsset.delete({
      where: { id },
    });

    await writeAudit({
      actorType: "STAFF",
      actorId: user.id,
      actorLabel: user.name,
      action: "media.delete",
      targetType: "ARTICLE",
      targetId: asset.id,
      reason: `Deleted asset ${asset.id} (${asset.url})`,
    });

    return ok({ message: "Aset media berhasil dihapus dan dikarantina.", id });
  } catch (error) {
    return jsonError(error);
  }
}

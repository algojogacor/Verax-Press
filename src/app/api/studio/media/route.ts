// Media library API: upload + list. Enforces attribution (creator, license, caption).
// AI/synthetic images must be flagged. (Editorial Charter §3.4)
import { db } from "@/lib/db";
import { requireSession, ok, jsonError, ApiError } from "@/lib/api";
import { writeAudit } from "@/lib/domain/audit";
import { uploadToMediaStorage, deleteFromMediaStorage } from "@/lib/media-client";
import crypto from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
// MIME → allowed extension mapping. Extension is derived from MIME, NOT from user filename,
// to prevent path traversal and extension spoofing.
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const ALLOWED_MIME = Object.keys(MIME_TO_EXT);
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

// Magic byte signatures for image validation (defense against MIME spoofing).
function detectImageMime(buf: Buffer): string | null {
  if (buf.length < 4) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  // WebP: RIFF....WEBP
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "image/webp";
  return null;
}

export async function GET() {
  try {
    const user = await requireSession();
    if (user.role !== "CHIEF_EDITOR" && user.role !== "EDITOR" && user.role !== "INTERNAL_AUTHOR") {
      throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki izin melihat media.");
    }
    const assets = await db.mediaAsset.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return ok({ assets });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireSession();
    if (user.role !== "CHIEF_EDITOR" && user.role !== "EDITOR" && user.role !== "INTERNAL_AUTHOR") {
      throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki izin mengunggah media.");
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const creator = (formData.get("creator") as string)?.trim();
    const license = (formData.get("license") as string)?.trim();
    const caption = (formData.get("caption") as string)?.trim();
    const sourceUrl = (formData.get("sourceUrl") as string)?.trim();
    const permissionEvidence = (formData.get("permissionEvidence") as string)?.trim();
    const isSynthetic = formData.get("isSynthetic") === "true";
    const title = (formData.get("title") as string)?.trim();

    if (!file) throw new ApiError(400, "BAD_REQUEST", "Berkas gambar wajib disertakan.");
    if (file.size > MAX_SIZE) {
      throw new ApiError(400, "BAD_REQUEST", `Ukuran berkas maksimal ${MAX_SIZE / 1024 / 1024}MB.`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Validate actual file content via magic bytes (defense against MIME spoofing).
    const detectedMime = detectImageMime(buffer);
    if (!detectedMime || !ALLOWED_MIME.includes(detectedMime)) {
      throw new ApiError(
        400,
        "BAD_REQUEST",
        `Format berkas tidak sesuai. Terdeteksi: ${detectedMime ?? "tidak dikenal"}. Format yang diizinkan: ${ALLOWED_MIME.join(", ")}`,
      );
    }
    const finalMime = detectedMime;

    // Attribution is required (Editorial Charter §3.4). Creator + caption mandatory.
    if (!creator || !caption) {
      throw new ApiError(400, "BAD_REQUEST", "Nama pembuat dan keterangan gambar (caption) wajib diisi sesuai kebijakan atribusi.");
    }

    // Save file: Use remote persistent VM storage when configured, fallback to local uploads for dev.
    let url: string;
    let storageKey: string;

    if (process.env.VERAX_MEDIA_API_URL) {
      const ext = MIME_TO_EXT[finalMime];
      const remote = await uploadToMediaStorage({
        buffer,
        filename: file.name || `asset.${ext}`,
        mimeType: finalMime,
        visibility: "public",
        category: "articles",
        uploadedBy: user.id,
      });
      url = remote.publicUrl || `/uploads/${remote.storedFilename}`;
      storageKey = `media/${remote.id}`;

      try {
        const asset = await db.mediaAsset.create({
          data: {
            storageKey,
            url,
            mimeType: finalMime,
            mediaType: "PHOTO",
            title: title || null,
            creator,
            license: license || null,
            caption,
            isSynthetic,
            uploadedById: user.id,
          },
        });

        await writeAudit({
          actorType: "STAFF",
          actorId: user.id,
          actorLabel: user.name,
          action: "media.upload",
          targetType: "ARTICLE",
          targetId: asset.id,
          reason: `${finalMime} ${file.size}b synthetic=${isSynthetic} creator=${creator.slice(0, 40)}`,
        });

        return ok({ asset }, 201);
      } catch (dbErr) {
        // Compensating action: quarantine remote asset if database insert fails
        try {
          await deleteFromMediaStorage(remote.id, user.id);
        } catch (compErr) {
          console.error("Failed to compensate remote media upload after DB error:", compErr);
        }
        throw dbErr;
      }
    } else {
      if (!existsSync(UPLOAD_DIR)) await mkdir(UPLOAD_DIR, { recursive: true });
      const ext = MIME_TO_EXT[finalMime];
      const filename = `${crypto.randomBytes(12).toString("hex")}.${ext}`;
      const filepath = path.join(UPLOAD_DIR, filename);
      await writeFile(filepath, buffer);
      url = `/uploads/${filename}`;
      storageKey = `uploads/${filename}`;

      const asset = await db.mediaAsset.create({
        data: {
          storageKey,
          url,
          mimeType: finalMime,
          mediaType: "PHOTO",
          title: title || null,
          creator,
          license: license || null,
          caption,
          isSynthetic,
          uploadedById: user.id,
        },
      });

      await writeAudit({
        actorType: "STAFF",
        actorId: user.id,
        actorLabel: user.name,
        action: "media.upload",
        targetType: "ARTICLE",
        targetId: asset.id,
        reason: `${finalMime} ${file.size}b synthetic=${isSynthetic} creator=${creator.slice(0, 40)}`,
      });

      return ok({ asset }, 201);
    }
  } catch (error) {
    return jsonError(error);
  }
}

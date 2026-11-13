// Helper bersama unggah foto Studio: validasi kuota 10 foto/sesi, batas ukuran,
// dan pengiriman biner asli tanpa kompresi atau perubahan resolusi di peramban.
"use client";

export const MAX_BULK_PHOTOS = 10;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
const ACCEPTED_EXT_RE = /\.(jpe?g|png|webp)$/i;

export interface UploadedMediaAsset {
  id: string;
  url: string;
  title: string | null;
  caption: string | null;
  creator: string | null;
  license: string | null;
  isSynthetic: boolean;
  isGeneric?: boolean;
  createdAt: string;
}

export function formatFileBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function isSupportedImageFile(file: File): boolean {
  if (ACCEPTED_IMAGE_MIME.includes(file.type as (typeof ACCEPTED_IMAGE_MIME)[number])) {
    return true;
  }
  return !file.type && ACCEPTED_EXT_RE.test(file.name);
}

export function validateAndQueuePhotos(
  incomingFiles: FileList | File[],
  existingCount: number,
): {
  accepted: File[];
  rejectedReasons: string[];
  overflowCount: number;
} {
  const candidates = Array.from(incomingFiles);
  const remainingSlots = Math.max(0, MAX_BULK_PHOTOS - existingCount);
  const accepted: File[] = [];
  const rejectedReasons: string[] = [];
  let overflowCount = 0;

  for (const file of candidates) {
    if (!isSupportedImageFile(file)) {
      rejectedReasons.push(`${file.name}: format harus JPEG, PNG, atau WebP.`);
      continue;
    }
    if (file.size <= 0) {
      rejectedReasons.push(`${file.name}: berkas kosong.`);
      continue;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      rejectedReasons.push(`${file.name}: ukuran melebihi batas 5 MB.`);
      continue;
    }
    if (accepted.length >= remainingSlots) {
      overflowCount += 1;
      continue;
    }
    accepted.push(file);
  }

  return { accepted, rejectedReasons, overflowCount };
}

/** Mengirim berkas File mentah via FormData tanpa resize atau re-encoding. */
export async function uploadOriginalPhotoAsset(params: {
  file: File;
  creator: string;
  caption: string;
  title?: string;
  license?: string;
  isSynthetic?: boolean;
}): Promise<UploadedMediaAsset> {
  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("creator", params.creator.trim());
  formData.append("caption", params.caption.trim());
  if (params.title?.trim()) formData.append("title", params.title.trim());
  if (params.license?.trim()) formData.append("license", params.license.trim());
  formData.append("isSynthetic", String(Boolean(params.isSynthetic)));

  let res: Response;
  try {
    res = await fetch("/api/studio/media", {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new Error("Gagal menghubungi server. Periksa koneksi Anda.");
  }

  if (res.status === 413) {
    throw new Error(
      `Ukuran ${params.file.name} (${formatFileBytes(params.file.size)}) melebihi batas payload upload server (±4,5 MB per foto).`,
    );
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      (data && typeof data.error === "string" && data.error) ||
        `Gagal mengunggah (${res.status}).`,
    );
  }

  const asset = data?.asset as UploadedMediaAsset | undefined;
  if (!asset || typeof asset.url !== "string" || !asset.url) {
    throw new Error("Server tidak mengembalikan URL aset media.");
  }

  return asset;
}

// Layanan publikasi Instagram Karosel untuk Verax Press.
// Mengelola pengunggahan slide visual ke penyimpanan media, orkestrasi kontainer Meta,
// mekanisme coba ulang otomatis (auto-retry), serta persistensi status ke basis data.

import { db } from "@/lib/db";
import { isMediaConfigured, uploadToMediaStorage } from "@/lib/media-client";
import {
  createCarouselItemContainer,
  createCarouselParentContainer,
  getMediaPermalink,
  InstagramError,
  publishCarousel,
  waitForContainer,
} from "@/lib/instagram";
import path from "node:path";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";

export interface PublishInstagramOptions {
  articleId: string;
  caption: string;
  slideBuffers?: Buffer[];
  imageUrls?: string[];
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface PublishInstagramResult {
  instagramPostId: string;
  status: "POSTED" | "FAILED";
  postUrl?: string | null;
  instagramMediaId?: string | null;
  carouselMediaUrls: string[];
  attempts: number;
  lastError?: string | null;
}

/**
 * Menentukan URL dasar publik untuk akses aset media oleh Meta Graph API.
 */
export function getPublicBaseUrl(): string {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    return configured.replace(/\/+$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/+$/, "")}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/+$/, "")}`;
  }
  return "https://veraxpress.vercel.app";
}

/**
 * Mengunggah satu slide gambar PNG ke penyimpanan media publik.
 * Menggunakan Media Storage jarak jauh bila dikonfigurasi,
 * atau beralih ke penyimpanan lokal public/uploads/instagram pada lingkungan pengembangan.
 */
export async function uploadSlideImage(
  buffer: Buffer,
  filename: string,
  articleId?: string
): Promise<string> {
  if (isMediaConfigured()) {
    try {
      const remote = await uploadToMediaStorage({
        buffer,
        filename,
        mimeType: "image/png",
        category: "infographics",
        uploadedBy: "instagram-worker",
        visibility: "public",
      });

      if (
        remote.publicUrl &&
        (remote.publicUrl.startsWith("http://") || remote.publicUrl.startsWith("https://"))
      ) {
        return remote.publicUrl;
      }

      const baseUrl = getPublicBaseUrl();
      return `${baseUrl}/uploads/${remote.storedFilename}`;
    } catch (err) {
      if (process.env.NODE_ENV === "production" && process.env.VERCEL === "1") {
        throw err;
      }
      console.warn(
        "[instagram-service] Gagal mengunggah ke penyimpanan media jarak jauh, beralih ke direktori lokal:",
        err instanceof Error ? err.message : err
      );
    }
  }

  // Penyimpanan lokal cadangan untuk pengembangan lokal dan pengujian
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "instagram");
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true });
  }

  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = path.join(uploadsDir, safeFilename);
  await writeFile(filePath, buffer);

  const baseUrl = getPublicBaseUrl();
  return `${baseUrl}/uploads/instagram/${safeFilename}`;
}

/**
 * Mengunggah seluruh slide gambar ke media storage dan mengembalikan daftar URL publik.
 */
export async function uploadSlideImages(
  slideBuffers: Buffer[],
  articleId: string
): Promise<string[]> {
  const urls: string[] = [];
  const timestamp = Date.now();

  for (let i = 0; i < slideBuffers.length; i++) {
    const filename = `instagram_${articleId}_slide_${i + 1}_${timestamp}.png`;
    const url = await uploadSlideImage(slideBuffers[i], filename, articleId);
    urls.push(url);
  }

  return urls;
}

/**
 * Menjalankan alur publikasi karosel ke Instagram Graph API:
 * 1. Membuat child item container untuk setiap gambar.
 * 2. Menunggu seluruh child container berstatus FINISHED.
 * 3. Membuat parent CAROUSEL container dengan caption.
 * 4. Menunggu parent container berstatus FINISHED.
 * 5. Mempublikasikan parent container ke feed Instagram.
 * 6. Mengambil permalink postingan yang diterbitkan.
 */
export async function executeCarouselPublish(
  imageUrls: string[],
  caption: string
): Promise<{ instagramMediaId: string; postUrl?: string }> {
  if (imageUrls.length < 2 || imageUrls.length > 10) {
    throw new InstagramError(
      `Jumlah slide karosel harus antara 2 hingga 10 (diterima: ${imageUrls.length}).`
    );
  }

  // Langkah 1: Buat container untuk setiap slide gambar
  const childContainerIds: string[] = [];
  for (const url of imageUrls) {
    const childId = await createCarouselItemContainer(url);
    childContainerIds.push(childId);
  }

  // Langkah 2: Tunggu setiap slide selesai diproses
  for (const childId of childContainerIds) {
    await waitForContainer(childId);
  }

  // Langkah 3: Buat parent CAROUSEL container
  const parentContainerId = await createCarouselParentContainer(
    childContainerIds,
    caption
  );

  // Langkah 4: Tunggu parent container selesai diproses
  await waitForContainer(parentContainerId);

  // Langkah 5: Publikasikan container karosel
  const instagramMediaId = await publishCarousel(parentContainerId);

  // Langkah 6: Ambil tautan permalink publik
  const postUrl = await getMediaPermalink(instagramMediaId);

  return {
    instagramMediaId,
    postUrl,
  };
}

/**
 * Alur terpadu penerbitan artikel ke Instagram dengan coba ulang otomatis (auto-retry).
 * Menyimpan dan memperbarui status pada model basis data InstagramPost.
 */
export async function publishArticleToInstagram(
  options: PublishInstagramOptions
): Promise<PublishInstagramResult> {
  const { articleId, caption } = options;
  const maxRetries = options.maxRetries ?? 3;
  const retryDelayMs =
    options.retryDelayMs ??
    (process.env.INSTAGRAM_RETRY_DELAY_MS
      ? parseInt(process.env.INSTAGRAM_RETRY_DELAY_MS, 10)
      : 2000);

  // 1. Verifikasi keberadaan dan status artikel
  const article = await db.article.findUnique({
    where: { id: articleId },
    select: { id: true, title: true, status: true },
  });

  if (!article) {
    throw new InstagramError(`Artikel dengan ID "${articleId}" tidak ditemukan.`);
  }

  if (article.status !== "PUBLISHED") {
    throw new InstagramError(
      `Artikel "${article.title}" belum berstatus PUBLISHED (status saat ini: ${article.status}).`
    );
  }

  // 2. Pemeriksaan Idempotensi: tolak bila artikel sudah berhasil diposting
  const existingPosted = await db.instagramPost.findFirst({
    where: {
      articleId,
      status: "POSTED",
    },
  });

  if (existingPosted) {
    const err = new InstagramError(
      "Artikel ini sudah berhasil dipublikasikan ke Instagram sebelumnya."
    );
    (err as unknown as { code: string }).code = "ALREADY_POSTED";
    (err as unknown as { statusCode: number }).statusCode = 409;
    throw err;
  }

  // 3. Siapkan URL gambar slide (dari buffer atau larik URL langsung)
  let imageUrls = options.imageUrls ?? [];
  if (imageUrls.length === 0 && options.slideBuffers && options.slideBuffers.length > 0) {
    imageUrls = await uploadSlideImages(options.slideBuffers, articleId);
  }

  if (imageUrls.length < 2 || imageUrls.length > 10) {
    const err = new InstagramError(
      `Jumlah slide karosel harus antara 2 hingga 10 item (diterima: ${imageUrls.length}).`
    );
    (err as unknown as { statusCode: number }).statusCode = 400;
    throw err;
  }

  // 4. Cari catatan tertunda atau buat catatan baru di tabel InstagramPost
  let postRecord = await db.instagramPost.findFirst({
    where: {
      articleId,
      status: { not: "POSTED" },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!postRecord) {
    postRecord = await db.instagramPost.create({
      data: {
        articleId,
        status: "PENDING",
        caption,
        carouselMediaUrls: JSON.stringify(imageUrls),
        slideCount: imageUrls.length,
        attempts: 0,
      },
    });
  } else {
    postRecord = await db.instagramPost.update({
      where: { id: postRecord.id },
      data: {
        caption,
        carouselMediaUrls: JSON.stringify(imageUrls),
        slideCount: imageUrls.length,
      },
    });
  }

  // 5. Eksekusi alur penerbitan dengan toleransi kesalahan dan coba ulang hingga 3 kali
  let lastError: string | null = null;
  let attempts = 0;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    attempts = attempt;
    try {
      const publishRes = await executeCarouselPublish(imageUrls, caption);

      const updated = await db.instagramPost.update({
        where: { id: postRecord.id },
        data: {
          status: "POSTED",
          attempts,
          postUrl: publishRes.postUrl ?? null,
          instagramMediaId: publishRes.instagramMediaId,
          carouselMediaUrls: JSON.stringify(imageUrls),
          slideCount: imageUrls.length,
          postedAt: new Date(),
          lastError: null,
        },
      });

      return {
        instagramPostId: updated.id,
        status: "POSTED",
        postUrl: updated.postUrl,
        instagramMediaId: updated.instagramMediaId,
        carouselMediaUrls: imageUrls,
        attempts,
        lastError: null,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.warn(
        `[instagram-service] Percobaan ke-${attempt} gagal untuk artikel ${articleId}: ${lastError}`
      );

      await db.instagramPost.update({
        where: { id: postRecord.id },
        data: {
          attempts,
          lastError,
          status: attempt >= maxRetries ? "FAILED" : "PENDING",
        },
      });

      if (attempt < maxRetries && retryDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
      }
    }
  }

  // 6. Seluruh percobaan gagal setelah batas maksimal coba ulang tercapai
  return {
    instagramPostId: postRecord.id,
    status: "FAILED",
    postUrl: null,
    instagramMediaId: null,
    carouselMediaUrls: imageUrls,
    attempts,
    lastError,
  };
}

/**
 * Mengambil daftar artikel yang gagal dipublikasikan ke Instagram untuk pemberitahuan Studio.
 */
export async function getFailedInstagramPosts(limit = 10) {
  return db.instagramPost.findMany({
    where: { status: "FAILED" },
    include: {
      article: {
        select: {
          id: true,
          title: true,
          slug: true,
          publishedAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}

/**
 * Mencoba ulang publikasi postingan Instagram yang sebelumnya berstatus FAILED.
 */
export async function retryFailedInstagramPost(
  postId: string,
  options?: { maxRetries?: number; retryDelayMs?: number }
): Promise<PublishInstagramResult> {
  const post = await db.instagramPost.findUnique({
    where: { id: postId },
    include: { article: true },
  });

  if (!post) {
    throw new InstagramError(`Postingan Instagram dengan ID ${postId} tidak ditemukan.`);
  }

  if (post.status === "POSTED") {
    throw new InstagramError("Postingan ini sudah berhasil dipublikasikan sebelumnya.");
  }

  let imageUrls: string[] = [];
  if (post.carouselMediaUrls) {
    try {
      imageUrls = JSON.parse(post.carouselMediaUrls);
    } catch {
      imageUrls = [];
    }
  }

  if (imageUrls.length < 2) {
    throw new InstagramError(
      "Data URL slide tidak ditemukan atau kurang dari 2. Silakan publikasikan ulang dengan render slide baru."
    );
  }

  return publishArticleToInstagram({
    articleId: post.articleId,
    caption: post.caption || post.article.title,
    imageUrls,
    maxRetries: options?.maxRetries ?? 3,
    retryDelayMs: options?.retryDelayMs ?? 2000,
  });
}

/**
 * Mengambil status publikasi Instagram terkini untuk artikel tertentu.
 */
export async function getInstagramPostStatus(articleId: string) {
  return db.instagramPost.findFirst({
    where: { articleId },
    orderBy: { createdAt: "desc" },
  });
}

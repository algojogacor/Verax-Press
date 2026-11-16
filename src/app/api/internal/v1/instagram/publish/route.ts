// POST /api/internal/v1/instagram/publish: Menerbitkan naskah artikel ke feed Instagram sebagai karosel multi-slide.
//
// Alur:
// 1. Autentikasi API Client (wajib clientType: "INSTAGRAM_WORKER")
// 2. Validasi payload: articleId, caption, slides (2-10 slide)
// 3. Verifikasi artikel ada dan status === "PUBLISHED"
// 4. Idempotensi: tolak bila artikel sudah memiliki InstagramPost berstatus "POSTED" (409 ALREADY_POSTED)
// 5. Render slide menjadi berkas PNG melalui @/lib/instagram-renderer
// 6. Unggah dan publikasikan ke Instagram Graph API melalui @/lib/instagram-service
// 7. Kembalikan respons 200 dengan status, postUrl, dan instagramPostId
//
// Sesuai dengan pedoman docs/editorial/VERAX_WRITING_STANDARDS.md.

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyApiClientDetailed } from "@/lib/api-key";
import { renderCarouselSlides, type SlideData } from "@/lib/instagram-renderer";
import { publishArticleToInstagram } from "@/lib/instagram-service";
import { InstagramError } from "@/lib/instagram";

const slideSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1, "Konten slide wajib diisi."),
  kicker: z.string().optional(),
  slideType: z.enum(["cover", "content", "quote", "closing"]).optional(),
  sourceNotes: z.string().optional(),
  keyTakeaways: z.array(z.string()).optional(),
  callToAction: z.string().optional(),
  quoteAuthor: z.string().optional(),
  quoteAuthorTitle: z.string().optional(),
});

const publishBodySchema = z.object({
  articleId: z.string().min(1, "articleId wajib diisi."),
  caption: z.string().min(1, "caption wajib diisi."),
  slides: z
    .array(slideSchema)
    .min(2, "Minimal 2 slide diperlukan untuk publikasi karosel Instagram.")
    .max(10, "Maksimal 10 slide diperbolehkan untuk publikasi karosel Instagram."),
});

export async function POST(request: Request) {
  try {
    // 1. Autentikasi API Client
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        {
          error: "Header Authorization Bearer diperlukan.",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    const proxyToken = request.headers.get("x-verax-proxy-token");
    const proxyClientId = request.headers.get("x-verax-proxy-client-id");
    const authRes = await verifyApiClientDetailed(authHeader, proxyToken, proxyClientId);

    if (!authRes.client) {
      return NextResponse.json(
        {
          error: authRes.errorMessage || "Kredensial API client tidak valid.",
          code: authRes.errorCode || "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    if (authRes.client.clientType !== "INSTAGRAM_WORKER") {
      return NextResponse.json(
        {
          error: "API Client ini tidak memiliki izin mengakses endpoint Instagram Worker.",
          code: "INVALID_CLIENT_SCOPE",
        },
        { status: 403 }
      );
    }

    // 2. Baca dan validasi payload JSON
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Payload harus berupa JSON yang valid.",
          code: "MALFORMED_JSON",
        },
        { status: 400 }
      );
    }

    const parseResult = publishBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: parseResult.error.issues[0]?.message || "Payload tidak valid.",
          code: "VALIDATION_ERROR",
          details: parseResult.error.issues,
        },
        { status: 422 }
      );
    }

    const body = parseResult.data;

    // 3. Verifikasi artikel ada dan status === "PUBLISHED"
    const article = await db.article.findUnique({
      where: { id: body.articleId },
      include: {
        desk: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        heroMedia: {
          select: {
            id: true,
            url: true,
            caption: true,
            creator: true,
          },
        },
      },
    });

    if (!article) {
      return NextResponse.json(
        {
          error: "Artikel tidak ditemukan.",
          code: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    if (article.status !== "PUBLISHED") {
      return NextResponse.json(
        {
          error: `Hanya artikel berstatus PUBLISHED yang dapat dipublikasikan ke Instagram (status saat ini: ${article.status}).`,
          code: "INVALID_ARTICLE_STATUS",
        },
        { status: 400 }
      );
    }

    // 4. Pemeriksaan Idempotensi: tolak bila artikel sudah berhasil dipublikasikan
    const existingPosted = await db.instagramPost.findFirst({
      where: {
        articleId: body.articleId,
        status: "POSTED",
      },
    });

    if (existingPosted) {
      return NextResponse.json(
        {
          error: "Artikel ini sudah pernah dipublikasikan ke Instagram sebelumnya.",
          code: "ALREADY_POSTED",
          instagramPostId: existingPosted.id,
          postUrl: existingPosted.postUrl,
        },
        { status: 409 }
      );
    }

    // 5. Render slide menjadi gambar PNG
    let slideBuffers: Buffer[];
    try {
      slideBuffers = await renderCarouselSlides(
        {
          id: article.id,
          title: article.title,
          deck: article.deck,
          slug: article.slug,
          desk: article.desk ? { name: article.desk.name, slug: article.desk.slug } : null,
          byline: article.byline,
          publishedAt: article.publishedAt,
          heroMedia: article.heroMedia
            ? {
                url: article.heroMedia.url,
                caption: article.heroMedia.caption ?? undefined,
              }
            : null,
          contentJson: article.contentJson,
        },
        body.slides as SlideData[]
      );
    } catch (renderError) {
      console.error("[instagram/publish] Gagal merender slide:", renderError);
      return NextResponse.json(
        {
          error: "Gagal merender slide visual Instagram.",
          code: "RENDER_ERROR",
          details: renderError instanceof Error ? renderError.message : String(renderError),
        },
        { status: 500 }
      );
    }

    // 6. Publikasikan ke Instagram melalui instagram-service
    const publishResult = await publishArticleToInstagram({
      articleId: article.id,
      caption: body.caption,
      slideBuffers,
    });

    return NextResponse.json(
      {
        status: publishResult.status,
        postUrl: publishResult.postUrl,
        instagramPostId: publishResult.instagramPostId,
        attempts: publishResult.attempts,
        lastError: publishResult.lastError,
      },
      { status: 200 }
    );
  } catch (error) {
    if (
      error instanceof InstagramError ||
      (error && typeof error === "object" && "code" in error)
    ) {
      const err = error as { statusCode?: number; code?: string; message?: string };
      if (err.statusCode === 409 || err.code === "ALREADY_POSTED") {
        return NextResponse.json(
          {
            error: err.message || "Artikel ini sudah pernah dipublikasikan ke Instagram sebelumnya.",
            code: "ALREADY_POSTED",
          },
          { status: 409 }
        );
      }
    }

    console.error("[instagram/publish] Galat internal:", error);
    return NextResponse.json(
      {
        error: "Terjadi kesalahan internal saat memublikasikan karosel ke Instagram.",
        code: "INTERNAL",
      },
      { status: 500 }
    );
  }
}

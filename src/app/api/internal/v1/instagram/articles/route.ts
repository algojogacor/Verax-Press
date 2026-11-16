// GET /api/internal/v1/instagram/articles: Mengambil naskah yang siap dipublikasikan ke Instagram.
//
// Akses terbatas:
// - API Client dengan tipe "INSTAGRAM_WORKER"
// - Sesi staf redaksi yang sah (CHIEF_EDITOR atau WRITER)
//
// Filter:
// - Status naskah harus PUBLISHED
// - Belum memiliki catatan InstagramPost dengan status POSTED
//
// Sesuai dengan docs/editorial/VERAX_WRITING_STANDARDS.md.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyApiClientDetailed } from "@/lib/api-key";
import { requireSession } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (authHeader) {
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
    } else {
      // Jika tidak ada header Authorization, periksa sesi masuk staf
      try {
        await requireSession();
      } catch {
        return NextResponse.json(
          {
            error: "Kredensial autentikasi diperlukan.",
            code: "UNAUTHORIZED",
          },
          { status: 401 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const rawLimit = searchParams.get("limit");
    const limit = rawLimit ? Math.min(Math.max(1, parseInt(rawLimit, 10) || 10), 100) : 10;

    const articles = await db.article.findMany({
      where: {
        status: "PUBLISHED",
        instagramPosts: {
          none: {
            status: "POSTED",
          },
        },
      },
      take: limit,
      orderBy: { publishedAt: "desc" },
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
            title: true,
            mimeType: true,
            isSynthetic: true,
            isGeneric: true,
          },
        },
      },
    });

    const formatted = articles.map((article) => {
      let tags: string[] = [];
      try {
        tags = JSON.parse(article.topics || "[]");
      } catch {
        tags = [];
      }

      return {
        id: article.id,
        title: article.title,
        deck: article.deck,
        contentJson: article.contentJson,
        content: article.contentJson,
        slug: article.slug,
        desk: article.desk,
        tags,
        byline: article.byline,
        publishedAt: article.publishedAt ? article.publishedAt.toISOString() : null,
        heroMedia: article.heroMedia,
      };
    });

    return NextResponse.json({ articles: formatted });
  } catch (error) {
    console.error("[instagram/articles] Galat:", error);
    return NextResponse.json(
      {
        error: "Terjadi kesalahan internal saat mengambil daftar artikel.",
        code: "INTERNAL",
      },
      { status: 500 }
    );
  }
}

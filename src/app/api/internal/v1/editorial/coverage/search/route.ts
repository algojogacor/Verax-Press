// GET /api/internal/v1/editorial/coverage/search
// Endpoint pencarian artikel terbit untuk kebutuhan Verax Editorial Intelligence (VEI).
// Memerlukan otentikasi coverage:read melalui header Authorization atau X-API-Key.
// Kueri terparameterisasi pada judul, topik, entitas, pertanyaan inti, dan sudut pandang editorial.
// Menjamin isolasi predikat publikasi: hanya artikel PUBLISHED/CORRECTED dengan publishedAt != null.

import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { enforceEditorialCoverageAuth } from "@/lib/editorial-auth";
import {
  PUBLISHED_ARTICLE_FILTER,
  resolveArticleCanonicalUrl,
  safeParseJsonArray,
} from "@/lib/domain/coverage";
import { generateRequestId } from "@/lib/request-logger";

export async function GET(request: Request) {
  const requestId = request.headers.get("x-request-id") || generateRequestId();

  // 1. Verifikasi otentikasi cakupan coverage:read
  const authError = enforceEditorialCoverageAuth(request, requestId);
  if (authError) {
    return authError;
  }

  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim();
    const deskParam = url.searchParams.get("desk")?.trim();
    const fromParam = url.searchParams.get("from")?.trim();
    const toParam = url.searchParams.get("to")?.trim();
    const cursor = url.searchParams.get("cursor")?.trim();

    // Validasi parameter batas hasil (limit)
    let limit = 20;
    const rawLimit = url.searchParams.get("limit");
    if (rawLimit !== null) {
      const trimmed = rawLimit.trim();
      const parsed = parseInt(trimmed, 10);
      if (isNaN(parsed) || parsed <= 0 || !/^\d+$/.test(trimmed)) {
        return NextResponse.json(
          {
            error: "Parameter limit harus berupa bilangan bulat positif antara 1 dan 100.",
            code: "INVALID_PARAMETER",
            requestId,
          },
          {
            status: 400,
            headers: {
              "x-request-id": requestId,
            },
          },
        );
      }
      limit = Math.min(parsed, 100);
    }

    // Validasi parameter tanggal from
    let fromDate: Date | undefined;
    if (fromParam) {
      fromDate = new Date(fromParam);
      if (isNaN(fromDate.getTime())) {
        return NextResponse.json(
          {
            error: "Format tanggal parameter from tidak valid. Gunakan format ISO 8601 (misalnya YYYY-MM-DD).",
            code: "INVALID_PARAMETER",
            requestId,
          },
          {
            status: 400,
            headers: {
              "x-request-id": requestId,
            },
          },
        );
      }
    }

    // Validasi parameter tanggal to
    let toDate: Date | undefined;
    if (toParam) {
      toDate = new Date(toParam);
      if (isNaN(toDate.getTime())) {
        return NextResponse.json(
          {
            error: "Format tanggal parameter to tidak valid. Gunakan format ISO 8601 (misalnya YYYY-MM-DD).",
            code: "INVALID_PARAMETER",
            requestId,
          },
          {
            status: 400,
            headers: {
              "x-request-id": requestId,
            },
          },
        );
      }
    }

    // 2. Bangun klausa pencarian Prisma yang aman dan terparameterisasi
    const where: Prisma.ArticleWhereInput = {
      ...PUBLISHED_ARTICLE_FILTER,
    };

    // Pencarian kata kunci lintas 5 atribut editorial
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { topics: { contains: q } },
        { entities: { contains: q } },
        { centralQuestion: { contains: q } },
        { editorialAngle: { contains: q } },
      ];
    }

    // Penyaringan desk editorial (mendukung slug atau nama desk)
    if (deskParam) {
      where.desk = {
        OR: [
          { slug: deskParam },
          { name: deskParam },
        ],
      };
    }

    // Penyaringan rentang tanggal penerbitan
    const dateFilter: { not: null; gte?: Date; lte?: Date } = { not: null };
    if (fromDate) {
      dateFilter.gte = fromDate;
    }
    if (toDate) {
      dateFilter.lte = toDate;
    }
    where.publishedAt = dateFilter;

    // 3. Validasi cursor jika disediakan
    if (cursor) {
      const cursorExists = await db.article.findUnique({
        where: { id: cursor },
        select: { id: true },
      });
      if (!cursorExists) {
        return NextResponse.json(
          {
            error: "Cursor paginasi tidak valid atau data sudah tidak ditemukan.",
            code: "INVALID_CURSOR",
            requestId,
          },
          {
            status: 400,
            headers: {
              "x-request-id": requestId,
            },
          },
        );
      }
    }

    // 4. Hitung jumlah total artikel yang cocok
    const total = await db.article.count({ where });

    // 5. Ambil data dengan paginasi berbasis cursor
    const items = await db.article.findMany({
      where,
      include: {
        desk: true,
      },
      orderBy: [
        { publishedAt: "desc" },
        { id: "desc" },
      ],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = items.length > limit;
    const sliced = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore && sliced.length > 0 ? sliced[sliced.length - 1].id : null;

    const data = sliced.map((art) => ({
      id: art.id,
      articleId: art.id,
      slug: art.slug,
      title: art.title,
      desk: art.desk?.name ?? "",
      format: art.format,
      status: art.status,
      topics: safeParseJsonArray(art.topics),
      entities: safeParseJsonArray(art.entities),
      centralQuestion: art.centralQuestion,
      editorialAngle: art.editorialAngle,
      metadataStatus: art.metadataStatus,
      publishedAt: art.publishedAt?.toISOString() ?? null,
      canonicalUrl: resolveArticleCanonicalUrl(art.slug),
    }));

    return NextResponse.json(
      {
        data,
        pagination: {
          hasMore,
          nextCursor,
          total,
        },
      },
      {
        status: 200,
        headers: {
          "x-request-id": requestId,
        },
      },
    );
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === "P2025") {
      return NextResponse.json(
        {
          error: "Cursor paginasi tidak valid atau data sudah tidak ditemukan.",
          code: "INVALID_CURSOR",
          requestId,
        },
        {
          status: 400,
          headers: {
            "x-request-id": requestId,
          },
        },
      );
    }

    return NextResponse.json(
      {
        error: "Terjadi kesalahan internal saat memproses pencarian cakupan.",
        code: "INTERNAL_ERROR",
        requestId,
      },
      {
        status: 500,
        headers: {
          "x-request-id": requestId,
        },
      },
    );
  }
}

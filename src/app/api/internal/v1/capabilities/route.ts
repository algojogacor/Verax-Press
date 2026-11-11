// GET /api/internal/v1/capabilities: Capabilities Discovery Endpoint (Fase 3).
// Menyediakan informasi metadata kapabilitas API yang ramah agen kecerdasan buatan.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { INGESTION_ALLOWED_FORMATS, getSystemEnvironment } from "@/lib/domain/constants";

export async function GET() {
  try {
    const activeDesks = await db.desk.findMany({
      where: { isActive: true },
      select: {
        name: true,
        slug: true,
      },
      orderBy: { name: "asc" },
    });

    const environment = getSystemEnvironment();

    return NextResponse.json(
      {
        apiVersion: "1.0.0",
        platform: "Verax Press",
        environment,
        capabilities: {
          submission: true,
          validation: true,
          submissionStatus: true,
          publication: false,
          editorialApproval: false,
        },
        allowedFormats: INGESTION_ALLOWED_FORMATS,
        desks: activeDesks,
        documentation: {
          developers: "/developers",
          openapi: "/openapi.json",
          llms: "/llms.txt",
          llmsFull: "/llms-full.txt",
          discovery: "/.well-known/verax-agent.json",
        },
        limits: {
          rateLimitPerMinute: 12,
          maxTitleLength: 200,
          maxSourcesCount: 40,
          maxImagesCount: 20,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=300",
        },
      },
    );
  } catch (error) {
    console.error("[Capabilities API] Gagal memuat metadata:", error);
    return NextResponse.json(
      {
        error: "Gagal memuat kapabilitas sistem.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}

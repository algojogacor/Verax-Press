// POST /api/internal/v1/ai-submissions/validate — Dry-Run Validation Endpoint (Fase 3).
// Memungkinkan agen AI menguji validitas payload naskah tanpa membuat rekaman di basis data.

import { NextResponse } from "next/server";
import { verifyApiClientDetailed } from "@/lib/api-key";
import { rateLimit, sweepRateLimits } from "@/lib/rate-limit";
import { validateIngestionPayload } from "@/lib/domain/ingestion";
import { generateRequestId, logApiRequest } from "@/lib/request-logger";

export async function POST(request: Request) {
  const startTime = Date.now();
  const requestId = request.headers.get("x-request-id") || generateRequestId();
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");
  const userAgent = request.headers.get("user-agent");

  try {
    sweepRateLimits();

    // 1. Autentikasi API client
    const proxyToken = request.headers.get("x-verax-proxy-token");
    const proxyClientId = request.headers.get("x-verax-proxy-client-id");
    const authRes = await verifyApiClientDetailed(request.headers.get("authorization"), proxyToken, proxyClientId);
    if (!authRes.client) {
      const durationMs = Date.now() - startTime;
      const errorCode = authRes.errorCode || "UNAUTHORIZED";
      const errorMessage = authRes.errorMessage || "Kredensial API client tidak valid.";
      await logApiRequest({
        requestId,
        method: "POST",
        endpoint: "/api/internal/v1/ai-submissions/validate",
        statusCode: 401,
        durationMs,
        ipAddress,
        userAgent,
        errorCode,
        errorMessage,
      });

      return NextResponse.json(
        {
          error: errorMessage,
          code: errorCode,
          requestId,
        },
        {
          status: 401,
          headers: { "x-request-id": requestId },
        },
      );
    }
    const client = authRes.client;

    // 2. Rate limit (30 per menit untuk validasi dry-run)
    const limit = rateLimit(`validate:${client.id}`, 30, 60_000);
    if (!limit.allowed) {
      const durationMs = Date.now() - startTime;
      await logApiRequest({
        requestId,
        apiClientId: client.id,
        method: "POST",
        endpoint: "/api/internal/v1/ai-submissions/validate",
        statusCode: 429,
        durationMs,
        ipAddress,
        userAgent,
        errorCode: "RATE_LIMITED",
        errorMessage: "Terlalu banyak permintaan validasi.",
      });

      return NextResponse.json(
        {
          error: "Batas laju permintaan validasi terlampaui. Coba beberapa saat lagi.",
          code: "RATE_LIMITED",
          requestId,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(limit.retryAfterSeconds),
            "x-request-id": requestId,
          },
        },
      );
    }

    // 3. Baca JSON
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      const durationMs = Date.now() - startTime;
      await logApiRequest({
        requestId,
        apiClientId: client.id,
        method: "POST",
        endpoint: "/api/internal/v1/ai-submissions/validate",
        statusCode: 400,
        durationMs,
        ipAddress,
        userAgent,
        errorCode: "MALFORMED_JSON",
        errorMessage: "Format JSON tidak terbaca.",
      });

      return NextResponse.json(
        {
          error: "Payload harus berupa JSON yang valid.",
          code: "MALFORMED_JSON",
          requestId,
        },
        {
          status: 400,
          headers: { "x-request-id": requestId },
        },
      );
    }

    // 4. Validasi payload murni tanpa efek samping ke basis data
    const validation = await validateIngestionPayload(rawBody);

    const durationMs = Date.now() - startTime;
    if (!validation.valid) {
      await logApiRequest({
        requestId,
        apiClientId: client.id,
        method: "POST",
        endpoint: "/api/internal/v1/ai-submissions/validate",
        statusCode: 422,
        durationMs,
        ipAddress,
        userAgent,
        errorCode: validation.code,
        errorMessage: validation.error,
      });

      return NextResponse.json(
        {
          valid: false,
          error: validation.error,
          code: validation.code,
          details: validation.details,
          warnings: validation.warnings,
          requestId,
        },
        {
          status: 422,
          headers: { "x-request-id": requestId },
        },
      );
    }

    await logApiRequest({
      requestId,
      apiClientId: client.id,
      method: "POST",
      endpoint: "/api/internal/v1/ai-submissions/validate",
      statusCode: 200,
      durationMs,
      ipAddress,
      userAgent,
    });

    return NextResponse.json(
      {
        valid: true,
        desk: {
          id: validation.desk.id,
          name: validation.desk.name,
          slug: validation.desk.slug,
        },
        warnings: validation.warnings,
        requestId,
      },
      {
        status: 200,
        headers: { "x-request-id": requestId },
      },
    );
  } catch (error) {
    const durationMs = Date.now() - startTime;
    await logApiRequest({
      requestId,
      method: "POST",
      endpoint: "/api/internal/v1/ai-submissions/validate",
      statusCode: 500,
      durationMs,
      ipAddress,
      userAgent,
      errorCode: "INTERNAL_ERROR",
      errorMessage: error instanceof Error ? error.message : "Internal error",
    });

    return NextResponse.json(
      {
        error: "Terjadi galat pada pemrosesan validasi.",
        code: "INTERNAL_ERROR",
        requestId,
      },
      {
        status: 500,
        headers: { "x-request-id": requestId },
      },
    );
  }
}

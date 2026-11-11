// GET /api/internal/v1/ai-submissions/[submissionId] — Submission Status Endpoint (Fase 3).
// Memungkinkan agen AI memantau status editorial atas naskah yang dikirimkannya.
// Keamanan ketat: Hanya pemilik submission yang dapat mengakses rekaman miliknya.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyApiClientDetailed } from "@/lib/api-key";
import { generateRequestId, logApiRequest } from "@/lib/request-logger";

type Params = { params: Promise<{ submissionId: string }> };

export async function GET(request: Request, { params }: Params) {
  const startTime = Date.now();
  const requestId = request.headers.get("x-request-id") || generateRequestId();
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");
  const userAgent = request.headers.get("user-agent");
  const { submissionId } = await params;

  try {
    // 1. Autentikasi API client
    const authRes = await verifyApiClientDetailed(request.headers.get("authorization"));
    if (!authRes.client) {
      const durationMs = Date.now() - startTime;
      const errorCode = authRes.errorCode || "UNAUTHORIZED";
      const errorMessage = authRes.errorMessage || "Kredensial API client tidak valid.";
      await logApiRequest({
        requestId,
        method: "GET",
        endpoint: `/api/internal/v1/ai-submissions/${submissionId}`,
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

    // 2. Cari submission dengan artikel terkait
    const submission = await db.submission.findUnique({
      where: { id: submissionId },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            format: true,
            status: true,
            updatedAt: true,
          },
        },
      },
    });

    // 3. Isolasi Kepemilikan (Ownership Isolation)
    // Cegah enumerasi ID submission klien lain dengan mengembalikan 404
    const isOwner =
      submission &&
      (submission.apiClientId === client.id ||
        (!submission.apiClientId &&
          (submission.agentId === client.name || submission.agentId === client.clientId)));

    if (!submission || !isOwner) {
      const durationMs = Date.now() - startTime;
      await logApiRequest({
        requestId,
        apiClientId: client.id,
        method: "GET",
        endpoint: `/api/internal/v1/ai-submissions/${submissionId}`,
        statusCode: 404,
        durationMs,
        ipAddress,
        userAgent,
        errorCode: "NOT_FOUND",
        errorMessage: "Submission tidak ditemukan atau bukan milik klien ini.",
      });

      return NextResponse.json(
        {
          error: "Naskah submission tidak ditemukan dalam lingkup akun integrasi Anda.",
          code: "NOT_FOUND",
          requestId,
        },
        {
          status: 404,
          headers: { "x-request-id": requestId },
        },
      );
    }

    const durationMs = Date.now() - startTime;
    await logApiRequest({
      requestId,
      apiClientId: client.id,
      method: "GET",
      endpoint: `/api/internal/v1/ai-submissions/${submissionId}`,
      statusCode: 200,
      durationMs,
      ipAddress,
      userAgent,
      submissionId: submission.id,
    });

    // 4. Kembalikan data status yang aman tanpa membocorkan catatan telaah internal
    return NextResponse.json(
      {
        submissionId: submission.id,
        articleId: submission.articleId,
        submissionStatus: submission.status,
        editorialStatus: submission.article.status,
        format: submission.article.format,
        title: submission.article.title,
        receivedAt: submission.submittedAt.toISOString(),
        lastUpdatedAt: submission.article.updatedAt.toISOString(),
        idempotencyKey: submission.idempotencyKey,
        editorialDecision: {
          status: submission.article.status,
          isPublished: submission.article.status === "PUBLISHED",
        },
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
      method: "GET",
      endpoint: `/api/internal/v1/ai-submissions/${submissionId}`,
      statusCode: 500,
      durationMs,
      ipAddress,
      userAgent,
      errorCode: "INTERNAL_ERROR",
      errorMessage: error instanceof Error ? error.message : "Internal error",
    });

    return NextResponse.json(
      {
        error: "Terjadi kesalahan internal saat memeriksa status submission.",
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

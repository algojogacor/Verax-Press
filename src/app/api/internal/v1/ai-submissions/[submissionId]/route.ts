// GET / HEAD /api/internal/v1/ai-submissions/[submissionId] — Submission Status Endpoint (Fase 3).
// Memungkinkan agen AI memantau status editorial atas naskah yang dikirimkannya.
// Keamanan ketat: Hanya pemilik submission yang dapat mengakses rekaman miliknya.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyApiClientDetailed } from "@/lib/api-key";
import { getClientIp } from "@/lib/rate-limit";
import { generateRequestId, logApiRequest } from "@/lib/request-logger";

type Params = { params: Promise<{ submissionId: string }> };

async function handleRead(request: Request, { params }: Params, isHead: boolean) {
  const startTime = Date.now();
  const requestId = request.headers.get("x-request-id") || generateRequestId();
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get("user-agent");
  const { submissionId } = await params;
  const method = isHead ? "HEAD" : "GET";

  try {
    // 1. Autentikasi API client
    const authRes = await verifyApiClientDetailed(request.headers.get("authorization"));
    if (!authRes.client) {
      const durationMs = Date.now() - startTime;
      const errorCode = authRes.errorCode || "UNAUTHORIZED";
      const errorMessage = authRes.errorMessage || "Kredensial API client tidak valid.";
      await logApiRequest({
        requestId,
        method,
        endpoint: `/api/internal/v1/ai-submissions/${submissionId}`,
        statusCode: 401,
        durationMs,
        ipAddress,
        userAgent,
        errorCode,
        errorMessage,
      });

      return new NextResponse(
        isHead ? null : JSON.stringify({ error: errorMessage, code: errorCode, requestId }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "x-request-id": requestId,
          },
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
        (!submission.apiClientId && submission.agentId === client.clientId));

    if (!submission || !isOwner) {
      const durationMs = Date.now() - startTime;
      await logApiRequest({
        requestId,
        apiClientId: client.id,
        method,
        endpoint: `/api/internal/v1/ai-submissions/${submissionId}`,
        statusCode: 404,
        durationMs,
        ipAddress,
        userAgent,
        errorCode: "NOT_FOUND",
        errorMessage: "Submission tidak ditemukan atau bukan milik klien ini.",
      });

      return new NextResponse(
        isHead
          ? null
          : JSON.stringify({
              error: "Naskah submission tidak ditemukan dalam lingkup akun integrasi Anda.",
              code: "NOT_FOUND",
              requestId,
            }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "x-request-id": requestId,
          },
        },
      );
    }

    const durationMs = Date.now() - startTime;
    await logApiRequest({
      requestId,
      apiClientId: client.id,
      method,
      endpoint: `/api/internal/v1/ai-submissions/${submissionId}`,
      statusCode: 200,
      durationMs,
      ipAddress,
      userAgent,
      submissionId: submission.id,
    });

    const body = {
      submissionId: submission.id,
      articleId: submission.articleId,
      submissionStatus: submission.status,
      articleStatus: submission.article.status,
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
    };

    // 4. Kembalikan data status yang aman tanpa membocorkan catatan telaah internal
    return new NextResponse(isHead ? null : JSON.stringify(body), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "x-request-id": requestId,
      },
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    await logApiRequest({
      requestId,
      method,
      endpoint: `/api/internal/v1/ai-submissions/${submissionId}`,
      statusCode: 500,
      durationMs,
      ipAddress,
      userAgent,
      errorCode: "INTERNAL_ERROR",
      errorMessage: error instanceof Error ? error.message : "Internal error",
    });

    return new NextResponse(
      isHead
        ? null
        : JSON.stringify({
            error: "Terjadi kesalahan internal saat memeriksa status submission.",
            code: "INTERNAL_ERROR",
            requestId,
          }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "x-request-id": requestId,
        },
      },
    );
  }
}

async function methodNotAllowed(request: Request, { params }: Params, method: string) {
  const startTime = Date.now();
  const requestId = request.headers.get("x-request-id") || generateRequestId();
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get("user-agent");
  const { submissionId } = await params;
  const message = `Metode ${method} tidak diizinkan pada endpoint status submission. Gunakan GET atau HEAD.`;

  try {
    await logApiRequest({
      requestId,
      method,
      endpoint: `/api/internal/v1/ai-submissions/${submissionId}`,
      statusCode: 405,
      durationMs: Date.now() - startTime,
      ipAddress,
      userAgent,
      errorCode: "METHOD_NOT_ALLOWED",
      errorMessage: message,
    });
  } catch {
    // Abaikan kegagalan pencatatan log method 405
  }

  return NextResponse.json(
    {
      error: message,
      code: "METHOD_NOT_ALLOWED",
      requestId,
    },
    {
      status: 405,
      headers: {
        "Allow": "GET, HEAD",
        "x-request-id": requestId,
      },
    },
  );
}

export async function GET(request: Request, ctx: Params) {
  return handleRead(request, ctx, false);
}

export async function HEAD(request: Request, ctx: Params) {
  return handleRead(request, ctx, true);
}

export async function POST(request: Request, ctx: Params) { return methodNotAllowed(request, ctx, "POST"); }
export async function PUT(request: Request, ctx: Params) { return methodNotAllowed(request, ctx, "PUT"); }
export async function PATCH(request: Request, ctx: Params) { return methodNotAllowed(request, ctx, "PATCH"); }
export async function DELETE(request: Request, ctx: Params) { return methodNotAllowed(request, ctx, "DELETE"); }

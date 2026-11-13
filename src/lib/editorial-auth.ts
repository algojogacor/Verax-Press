// Autentikasi API untuk modul Verax Editorial Intelligence (VEI).
// Kredensial statis dikonfigurasi melalui variabel lingkungan VERAX_COVERAGE_API_KEY (scope coverage:read).
// Mendukung header Authorization: Bearer <key> dan X-API-Key: <key>.
// Menolak kredensial submission (vrtc_...) dengan status 403 Forbidden.
// Menolak kredensial tidak valid atau tidak lengkap dengan status 401 Unauthorized secara konstan-waktu.

import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export interface EditorialAuthSuccess {
  ok: true;
  scope: "coverage:read";
}

export interface EditorialAuthFailure {
  ok: false;
  status: 401 | 403;
  errorCode: "UNAUTHORIZED" | "FORBIDDEN_SCOPE";
  errorMessage: string;
}

export type EditorialAuthResult = EditorialAuthSuccess | EditorialAuthFailure;

/**
 * Mengekstrak kunci API coverage dari header Authorization (Bearer) atau X-API-Key.
 */
export function extractCoverageApiKey(request: Request): {
  key: string | null;
  source: "bearer" | "x-api-key" | null;
} {
  const authHeader = request.headers.get("authorization")?.trim();
  if (authHeader) {
    const match = /^bearer\s+(.+)$/i.exec(authHeader);
    if (match && match[1]) {
      return { key: match[1].trim(), source: "bearer" };
    }
  }

  const xApiKey = request.headers.get("x-api-key")?.trim();
  if (xApiKey) {
    return { key: xApiKey, source: "x-api-key" };
  }

  return { key: null, source: null };
}

/**
 * Memverifikasi otentikasi API key coverage secara konstan-waktu.
 */
export function verifyEditorialCoverageAuth(request: Request): EditorialAuthResult {
  const { key } = extractCoverageApiKey(request);

  if (!key) {
    return {
      ok: false,
      status: 401,
      errorCode: "UNAUTHORIZED",
      errorMessage: "Kredensial API coverage diperlukan.",
    };
  }

  // Tolak kredensial submission (vrtc_...) agar tidak disalahgunakan untuk coverage
  if (key.startsWith("vrtc_") || key.includes("vrtc_")) {
    return {
      ok: false,
      status: 403,
      errorCode: "FORBIDDEN_SCOPE",
      errorMessage: "Kredensial submission tidak memiliki izin untuk cakupan coverage:read.",
    };
  }

  const expectedKey = process.env.VERAX_COVERAGE_API_KEY?.trim();

  // Fail-closed: tolak dengan 401 jika konfigurasi kunci belum disetel di lingkungan server
  if (!expectedKey) {
    return {
      ok: false,
      status: 401,
      errorCode: "UNAUTHORIZED",
      errorMessage: "Kredensial API tidak valid.",
    };
  }

  // Verifikasi konstan-waktu dengan SHA-256 digest untuk mencegah serangan waktu
  const expectedHash = createHash("sha256").update(expectedKey).digest();
  const candidateHash = createHash("sha256").update(key).digest();

  if (!timingSafeEqual(expectedHash, candidateHash)) {
    return {
      ok: false,
      status: 401,
      errorCode: "UNAUTHORIZED",
      errorMessage: "Kredensial API tidak valid.",
    };
  }

  return {
    ok: true,
    scope: "coverage:read",
  };
}

/**
 * Penjaga rute HTTP untuk memastikan permintaan memiliki izin coverage:read.
 * Mengembalikan NextResponse galat terstruktur jika tidak sah, atau null jika valid.
 */
export function enforceEditorialCoverageAuth(
  request: Request,
  requestId: string,
): NextResponse | null {
  const authResult = verifyEditorialCoverageAuth(request);
  if (!authResult.ok) {
    return NextResponse.json(
      {
        error: authResult.errorMessage,
        code: authResult.errorCode,
        requestId,
      },
      {
        status: authResult.status,
        headers: {
          "x-request-id": requestId,
        },
      },
    );
  }
  return null;
}

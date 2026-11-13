// POST /api/internal/v1/editorial/coverage/check
// Endpoint evaluasi tumpang tindih liputan (coverage check) Verax Editorial Intelligence (VEI).
// Memerlukan otentikasi coverage:read melalui header Authorization atau X-API-Key.
// Bersifat murni baca (read-only) dan tidak pernah menulis atau memodifikasi data di basis data.
// Mengembalikan tingkat tumpang tindih maksimum tunggal dan daftar rincian artikel yang cocok.
// Tidak pernah menyertakan klasifikasi putusan atau saran tindakan.

import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceEditorialCoverageAuth } from "@/lib/editorial-auth";
import { calculateEditorialCoverage } from "@/lib/domain/coverage";
import { generateRequestId } from "@/lib/request-logger";

const checkPayloadSchema = z.object({
  proposedTitle: z.string().optional().nullable(),
  topic: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  topics: z.union([z.string(), z.array(z.string())]).optional().nullable(),
  centralQuestion: z.string().optional().nullable(),
  proposedAngle: z.string().optional().nullable(),
  entities: z.union([z.string(), z.array(z.any())]).optional().nullable(),
});

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") || generateRequestId();

  // 1. Verifikasi otentikasi cakupan coverage:read
  const authError = enforceEditorialCoverageAuth(request, requestId);
  if (authError) {
    return authError;
  }

  // 2. Baca dan validasi format tubuh permintaan
  let bodyJson: unknown;
  try {
    bodyJson = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Isi permintaan harus berupa format JSON yang valid.",
        code: "INVALID_JSON",
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

  const parsed = checkPayloadSchema.safeParse(bodyJson);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Data usulan liputan tidak valid.",
        code: "VALIDATION_ERROR",
        details: parsed.error.issues,
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

  try {
    // 3. Eksekusi evaluasi tumpang tindih liputan (murni baca)
    const result = await calculateEditorialCoverage(parsed.data);

    return NextResponse.json(
      {
        overlapLevel: result.overlapLevel,
        matches: result.matches,
      },
      {
        status: 200,
        headers: {
          "x-request-id": requestId,
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        error: "Terjadi kesalahan internal saat mengevaluasi tumpang tindih liputan.",
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

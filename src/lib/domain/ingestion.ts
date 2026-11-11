// Skema dan validasi Intake Submission untuk Agen AI (Fase 3).
// Menjadi satu-satunya sumber kebenaran (Single Source of Truth) untuk:
// 1. POST /api/internal/v1/ai-submissions (ingestion nyata)
// 2. POST /api/internal/v1/ai-submissions/validate (dry run)
// 3. OpenAPI specification dan dokumentasi machine-readable

import { z } from "zod";
import { db } from "@/lib/db";
import { articleContentSchema } from "@/lib/domain/content";
import { httpUrlSchema, mediaUrlSchema } from "@/lib/url";
import {
  INGESTION_ALLOWED_FORMATS,
  AI_INVOLVEMENTS,
  SOURCE_TYPES,
} from "@/lib/domain/constants";

export const sourceItemSchema = z.object({
  title: z.string().min(3, "Judul sumber minimal 3 karakter.").max(300),
  publisher: z.string().max(200).optional(),
  url: httpUrlSchema("URL sumber harus berupa tautan http:// atau https:// yang valid.", 2_000),
  sourceType: z.enum(SOURCE_TYPES as [string, ...string[]]).default("SECONDARY"),
  publishedAt: z.string().optional(),
  accessedAt: z.string().optional(),
  supports: z.string().max(600).optional(),
  isKeySource: z.boolean().optional(),
});

export const imageItemSchema = z.object({
  url: mediaUrlSchema("URL gambar harus berupa URL http(s) atau path lokal yang diawali /.", 2_000),
  creator: z.string().max(200).optional(),
  license: z.string().max(200).optional(),
  permissionEvidence: z.string().max(600).optional(),
  caption: z.string().max(500).optional(),
});

export const ingestionSchema = z.object({
  title: z.string().min(8, "Judul naskah minimal 8 karakter.").max(200, "Judul naskah maksimal 200 karakter."),
  deck: z.string().max(400, "Ringkasan naskah maksimal 400 karakter.").optional(),
  desk: z.string().min(1, "Slug desk wajib disertakan.").max(60),
  format: z.string().min(1, "Format artikel wajib disertakan."),
  content: articleContentSchema,
  sources: z.array(sourceItemSchema).min(1, "Minimal sertakan 1 rujukan sumber.").max(40, "Maksimal 40 rujukan sumber."),
  images: z.array(imageItemSchema).max(20, "Maksimal 20 aset gambar.").optional(),
  tags: z.array(z.string().min(2).max(40)).max(10, "Maksimal 10 tag.").optional(),
  verificationNotes: z.string().max(3_000).optional(),
  aiInvolvement: z.enum(AI_INVOLVEMENTS as [string, ...string[]]),
  aiUsageNote: z.string().max(1_000).optional(),
  agentId: z.string().min(2, "ID agen minimal 2 karakter.").max(120),
  idempotencyKey: z.string().min(8, "Idempotency key minimal 8 karakter.").max(128),
});

export type IngestionPayload = z.infer<typeof ingestionSchema>;

export interface ValidationErrorDetail {
  path: string;
  code: string;
  message: string;
}

export interface ValidationSuccess {
  valid: true;
  payload: IngestionPayload;
  desk: { id: string; name: string; slug: string };
  warnings: string[];
}

export interface ValidationFailure {
  valid: false;
  code: string;
  error: string;
  details: ValidationErrorDetail[];
  warnings: string[];
}

export type ValidationOutcome = ValidationSuccess | ValidationFailure;

/**
 * Validasi naskah ingestion secara komprehensif.
 * Menguji skema data, validitas format artikel yang didukung, dan keberadaan desk aktif.
 */
export async function validateIngestionPayload(rawInput: unknown): Promise<ValidationOutcome> {
  const warnings: string[] = [];

  // 1. Validasi struktur JSON dan batasan karakter
  const parseResult = ingestionSchema.safeParse(rawInput);
  if (!parseResult.success) {
    const details: ValidationErrorDetail[] = parseResult.error.issues.map((issue) => ({
      path: issue.path.join("."),
      code: issue.code.toUpperCase(),
      message: issue.message,
    }));
    return {
      valid: false,
      code: "VALIDATION_ERROR",
      error: "Payload naskah tidak memenuhi spesifikasi skema.",
      details,
      warnings,
    };
  }

  const payload = parseResult.data;

  // 2. Validasi format artikel yang didukung (termasuk format NEWS)
  if (!INGESTION_ALLOWED_FORMATS.includes(payload.format as never)) {
    return {
      valid: false,
      code: "FORMAT_REJECTED",
      error: `Format "${payload.format}" tidak dikenali oleh sistem Verax Press.`,
      details: [
        {
          path: "format",
          code: "FORMAT_NOT_ALLOWED",
          message: `Format yang diizinkan untuk agen AI: ${INGESTION_ALLOWED_FORMATS.join(", ")}.`,
        },
      ],
      warnings,
    };
  }

  // 3. Validasi keberadaan desk aktif di basis data
  const desk = await db.desk.findUnique({
    where: { slug: payload.desk },
    select: { id: true, name: true, slug: true, isActive: true },
  });

  if (!desk || !desk.isActive) {
    return {
      valid: false,
      code: "DESK_REJECTED",
      error: `Desk "${payload.desk}" tidak ditemukan atau sedang tidak aktif.`,
      details: [
        {
          path: "desk",
          code: "DESK_NOT_FOUND",
          message: "Desk tidak valid. Periksa daftar desk aktif melalui GET /api/internal/v1/capabilities.",
        },
      ],
      warnings,
    };
  }

  // 4. Catatan peringatan non-blocking
  if (!payload.sources.some((s) => s.isKeySource)) {
    warnings.push("Tidak ada sumber rujukan yang ditandai sebagai sumber kunci (isKeySource). Redaktur akan menetapkannya secara manual.");
  }

  if (payload.aiInvolvement === "substantive" && !payload.aiUsageNote) {
    warnings.push("Keterlibatan AI substantif dianjurkan menyertakan penjelasan metodologi pada aiUsageNote.");
  }

  return {
    valid: true,
    payload,
    desk,
    warnings,
  };
}

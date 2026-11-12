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
  INGESTION_CONDITIONAL_FORMAT_RULES,
  INGESTION_PENDING_FORMATS,
  AI_INVOLVEMENTS,
  SOURCE_TYPES,
} from "@/lib/domain/constants";

const ISO_DATE_OR_DATETIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2}))?$/;

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function parseOptionalIsoDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const match = ISO_DATE_OR_DATETIME_RE.exec(trimmed);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return null;
  }

  if (match[4] !== undefined) {
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const second = Number(match[6]);
    if (hour > 23 || minute > 59 || second > 59) return null;
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const optionalIsoDateSchema = z
  .string()
  .max(40, "Format tanggal maksimal 40 karakter.")
  .refine((val) => parseOptionalIsoDate(val) !== null, {
    message: "Tanggal harus memakai format ISO 8601 yang valid (YYYY-MM-DD atau YYYY-MM-DDTHH:mm:ssZ).",
  })
  .optional();

export const sourceItemSchema = z.object({
  title: z.string().trim().min(3, "Judul sumber minimal 3 karakter.").max(300),
  publisher: z.string().max(200).optional(),
  url: httpUrlSchema("URL sumber harus berupa tautan http:// atau https:// yang valid.", 2_000),
  sourceType: z.enum(SOURCE_TYPES as [string, ...string[]]).default("SECONDARY"),
  publishedAt: optionalIsoDateSchema,
  accessedAt: optionalIsoDateSchema,
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

// Validasi teks non-spasi tanpa memodifikasi pemformatan atau indentasi isi artikel
const ingestionContentSchema = articleContentSchema
  .min(1, "Minimal sertakan 1 blok konten terstruktur.")
  .superRefine((blocks, ctx) => {
    blocks.forEach((block, index) => {
      if (
        block.type === "paragraph" ||
        block.type === "heading" ||
        block.type === "quote" ||
        block.type === "note"
      ) {
        if (block.text.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index, "text"],
            message: `Teks blok ${block.type} pada indeks ${index} tidak boleh hanya berisi spasi.`,
          });
        }
        return;
      }
      if (block.type === "list") {
        block.items.forEach((item, itemIdx) => {
          if (item.trim().length === 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [index, "items", itemIdx],
              message: `Butir daftar indeks ${itemIdx} pada blok list indeks ${index} tidak boleh hanya berisi spasi.`,
            });
          }
        });
        return;
      }
      if (block.type === "qa") {
        if (block.question.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index, "question"],
            message: `Pertanyaan pada blok qa indeks ${index} tidak boleh hanya berisi spasi.`,
          });
        }
        if (block.answer.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index, "answer"],
            message: `Jawaban pada blok qa indeks ${index} tidak boleh hanya berisi spasi.`,
          });
        }
      }
    });
  });

export const ingestionSchema = z.object({
  title: z.string().trim().min(8, "Judul naskah minimal 8 karakter.").max(200, "Judul naskah maksimal 200 karakter."),
  deck: z.string().max(400, "Ringkasan naskah maksimal 400 karakter.").optional(),
  desk: z.string().trim().min(1, "Slug desk wajib disertakan.").max(60),
  format: z.string().trim().min(1, "Format artikel wajib disertakan."),
  content: ingestionContentSchema,
  sources: z.array(sourceItemSchema).min(1, "Minimal sertakan 1 rujukan sumber.").max(40, "Maksimal 40 rujukan sumber."),
  images: z.array(imageItemSchema).max(20, "Maksimal 20 aset gambar.").optional(),
  tags: z.array(z.string().trim().min(2, "Tag minimal 2 karakter.").max(40, "Tag maksimal 40 karakter.")).max(10, "Maksimal 10 tag.").optional(),
  verificationNotes: z.string().max(3_000).optional(),
  aiInvolvement: z.enum(AI_INVOLVEMENTS as [string, ...string[]]),
  aiUsageNote: z.string().max(1_000).optional(),
  agentId: z.string().trim().min(2, "ID agen minimal 2 karakter.").max(120),
  idempotencyKey: z.string().trim().min(8, "Idempotency key minimal 8 karakter.").max(128),
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

  // 2. Validasi format artikel (NEWS ditahan sementara menunggu otorisasi; format lain diperiksa keabsahannya)
  if (INGESTION_PENDING_FORMATS.includes(payload.format as never)) {
    return {
      valid: false,
      code: "FORMAT_REJECTED",
      error: `Format "${payload.format}" sedang ditahan sementara pada jalur Ingestion API hingga Pemimpin Redaksi mengesahkan otorisasi format AI NEWS.`,
      details: [
        {
          path: "format",
          code: "FORMAT_PENDING_AUTHORIZATION",
          message: `Standar editorial AI masih berstatus PROPOSED sehingga pengiriman format ${payload.format} melalui Ingestion API belum diaktifkan. Format aktif saat ini: ${INGESTION_ALLOWED_FORMATS.join(", ")}.`,
        },
      ],
      warnings,
    };
  }

  if (!INGESTION_ALLOWED_FORMATS.includes(payload.format as never)) {
    return {
      valid: false,
      code: "FORMAT_REJECTED",
      error: `Format "${payload.format}" tidak dikenali oleh sistem Verax Press.`,
      details: [
        {
          path: "format",
          code: "FORMAT_NOT_ALLOWED",
          message: `Format yang diizinkan untuk agen AI saat ini: ${INGESTION_ALLOWED_FORMATS.join(", ")}.`,
        },
      ],
      warnings,
    };
  }

  if (payload.format in INGESTION_CONDITIONAL_FORMAT_RULES) {
    const rule =
      INGESTION_CONDITIONAL_FORMAT_RULES[
        payload.format as keyof typeof INGESTION_CONDITIONAL_FORMAT_RULES
      ];
    const hasQualifyingSource = payload.sources.some(
      (s) =>
        rule.requiredSourceTypes.includes(s.sourceType) &&
        (s.supports?.trim().length ?? 0) >= rule.minSupportsLength,
    );
    const hasVerificationNotes =
      (payload.verificationNotes?.trim().length ?? 0) >= rule.minVerificationNotesLength;

    if (!hasQualifyingSource || !hasVerificationNotes) {
      const details: ValidationErrorDetail[] = [];
      if (!hasQualifyingSource) {
        details.push({
          path: "sources",
          code: "FORMAT_PRECONDITION_FAILED",
          message: `Format ${payload.format} pada Ingestion API wajib menyertakan minimal 1 sumber rujukan bertipe ${rule.requiredSourceTypes.join(" atau ")} dengan keterangan supports spesifik (>= ${rule.minSupportsLength} karakter) yang menunjuk transkrip atau berkas peliputan nyata.`,
        });
      }
      if (!hasVerificationNotes) {
        details.push({
          path: "verificationNotes",
          code: "FORMAT_PRECONDITION_FAILED",
          message: `Format ${payload.format} pada Ingestion API wajib mengisi verificationNotes (>= ${rule.minVerificationNotesLength} karakter) yang menerangkan asal transkrip atau berkas penugasan manusia.`,
        });
      }
      return {
        valid: false,
        code: "FORMAT_REJECTED",
        error: `Format "${payload.format}" tidak memenuhi prasyarat bukti peliputan nyata pada jalur Ingestion API.`,
        details,
        warnings,
      };
    }
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

  // 4. Catatan peringatan non-blocking (membantu agen lolos gerbang redaksi pra-publikasi)
  if (!payload.deck?.trim()) {
    warnings.push("Bidang deck kosong; naskah tetap masuk sebagai DRAFT, namun wajib dilengkapi sebelum persetujuan terbit (GATE_NO_DECK).");
  }

  const hasPublishableText = payload.content.some((block) => {
    if (block.type === "paragraph" || block.type === "quote" || block.type === "list") {
      if ("text" in block) return block.text.trim().length > 0;
      return block.items.some((item) => item.trim().length > 0);
    }
    if (block.type === "qa") {
      return block.question.trim().length > 0 && block.answer.trim().length > 0;
    }
    return false;
  });
  if (!hasPublishableText) {
    warnings.push("Belum ada blok teks bernilai isi (paragraph, quote, list, atau qa); gerbang publikasi mewajibkan isi teks non-kosong (GATE_EMPTY_CONTENT).");
  }

  if (!payload.sources.some((s) => s.isKeySource)) {
    warnings.push("Tidak ada sumber rujukan yang ditandai sebagai sumber kunci (isKeySource). Redaktur akan menetapkannya secara manual (GATE_NO_KEY_SOURCES).");
  }

  if (payload.aiInvolvement === "substantive" && !payload.aiUsageNote?.trim()) {
    warnings.push("Keterlibatan AI substantif dianjurkan menyertakan penjelasan metodologi yang layak baca publik pada aiUsageNote (maks 600 karakter disarankan agar selaras dengan batas catatan publik redaksi).");
  } else if ((payload.aiUsageNote?.trim().length ?? 0) > 600) {
    warnings.push("Panjang aiUsageNote melebihi 600 karakter; catatan keterbukaan publik pada ruang redaksi dibatasi maksimal 600 karakter sehingga teks lebih panjang perlu diringkas saat penyuntingan.");
  }

  return {
    valid: true,
    payload,
    desk,
    warnings,
  };
}

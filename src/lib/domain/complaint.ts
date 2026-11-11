// Domain helper for public complaint creation with bounded retry and concurrency protection.
import type { PrismaClient } from "@prisma/client";
import { makeComplaintRefCode } from "@/lib/domain/slug";
import { ApiError } from "@/lib/api";

export interface CreateComplaintInput {
  type: string;
  articleId?: string | null;
  senderName?: string;
  senderEmail: string;
  senderPhone?: string | null;
  message: string;
}

export interface CreateComplaintOptions {
  maxAttempts?: number;
  year?: number;
}

/**
 * Creates a complaint with bounded retry on unique constraint collision for refCode.
 * Concurrency-safe across libSQL/Turso and SQLite.
 */
export async function createComplaintWithRetry(
  prisma: PrismaClient,
  input: CreateComplaintInput,
  options?: CreateComplaintOptions,
) {
  const maxAttempts = options?.maxAttempts ?? 5;
  const year = options?.year ?? new Date().getFullYear();
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const latest = await prisma.complaint.findFirst({
        where: { refCode: { startsWith: `KEL-${year}-` } },
        orderBy: { refCode: "desc" },
        select: { refCode: true },
      });

      let nextSeq = 1;
      if (latest?.refCode) {
        const match = latest.refCode.match(/^KEL-\d{4}-(\d+)/);
        if (match) {
          nextSeq = parseInt(match[1], 10) + 1;
        }
      }

      const count = await prisma.complaint.count({
        where: { refCode: { startsWith: `KEL-${year}-` } },
      });

      const sequence = Math.max(nextSeq, count + 1);
      const refCode = makeComplaintRefCode(year, sequence);

      const created = await prisma.complaint.create({
        data: {
          refCode,
          type: input.type,
          articleId: input.articleId ?? null,
          senderName: input.senderName || "Publik",
          senderEmail: input.senderEmail,
          senderPhone: input.senderPhone ?? null,
          message: input.message,
          status: "RECEIVED",
        },
      });

      return created;
    } catch (err: any) {
      if (err?.code === "P2002" && attempts < maxAttempts) {
        // Exponential jittered backoff before retrying
        await new Promise((resolve) =>
          setTimeout(resolve, 15 * attempts + Math.floor(Math.random() * 25)),
        );
        continue;
      }
      if (attempts >= maxAttempts && err?.code === "P2002") {
        throw new ApiError(
          409,
          "REF_CODE_CONFLICT",
          "Nomor referensi keluhan bertabrakan karena lalu lintas padat. Silakan coba kembali.",
        );
      }
      throw err;
    }
  }

  throw new ApiError(500, "INTERNAL_ERROR", "Gagal menyimpan keluhan.");
}

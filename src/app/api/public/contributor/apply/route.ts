// POST /api/public/contributor/apply — Formulir pengajuan Volunteer eksternal.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, parseJsonBody } from "@/lib/api";
import { writeAudit } from "@/lib/domain/audit";
import { getClientIp, rateLimit, sweepRateLimits } from "@/lib/rate-limit";
import { httpUrlSchema } from "@/lib/url";

const applySchema = z.object({
  name: z.string().min(2, "Nama lengkap minimal 2 karakter.").max(100, "Nama maksimal 100 karakter."),
  email: z.string().email("Format alamat email tidak valid.").max(200),
  bio: z.string().max(1000, "Deskripsi singkat maksimal 1.000 karakter.").optional(),
  interests: z.string().max(500, "Bidang minat maksimal 500 karakter.").optional(),
  portfolioUrl: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    httpUrlSchema("Tautan portofolio harus berupa URL http:// atau https:// yang valid.", 500).optional(),
  ),
  sampleArticle: z.string().max(10000, "Contoh tulisan maksimal 10.000 karakter.").optional(),
  adultConfirmed: z.boolean().refine((val) => val === true, {
    message: "Deklarasi usia 18 tahun atau lebih wajib dikonfirmasi.",
  }),
  guidelinesAccepted: z.boolean().refine((val) => val === true, {
    message: "Persetujuan terhadap pedoman kontributor wajib dicentang.",
  }),
});

export async function POST(request: Request) {
  try {
    sweepRateLimits();
    const ip = getClientIp(request);
    const limit = rateLimit(`public-contributor-apply:${ip}`, 20, 60 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak pengajuan dari jaringan ini. Coba lagi nanti.", code: "RATE_LIMITED" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    const body = await parseJsonBody(request, applySchema);
    const cleanEmail = body.email.trim().toLowerCase();
    const cleanName = body.name.trim();

    // 1. Periksa ketersediaan email tanpa membocorkan jenis akun (staf, kontributor, atau antrean)
    const [existingStaff, existingContributor, pendingApplication] = await Promise.all([
      db.staffUser.findFirst({
        where: { email: cleanEmail },
        select: { id: true },
      }),
      db.contributor.findFirst({
        where: { email: cleanEmail },
        select: { id: true },
      }),
      db.contributorApplication.findFirst({
        where: { email: cleanEmail, status: "PENDING" },
        select: { id: true },
      }),
    ]);

    if (existingStaff || existingContributor || pendingApplication) {
      throw new ApiError(
        409,
        "APPLICATION_PENDING",
        "Permohonan untuk alamat email ini tidak dapat diajukan saat ini karena sedang dalam peninjauan atau tidak memenuhi syarat pendaftaran baru.",
      );
    }

    // 3. Catat permohonan kontributor ke basis data
    const application = await db.contributorApplication.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        bio: body.bio?.trim() || null,
        interests: body.interests?.trim() || null,
        portfolioUrl: body.portfolioUrl?.trim() || null,
        sampleArticle: body.sampleArticle?.trim() || null,
        adultConfirmedAt: new Date(),
        guidelinesAccepted: true,
        status: "PENDING",
      },
    });

    // 4. Catat jejak audit
    await writeAudit({
      actorType: "PUBLIC",
      actorLabel: cleanEmail,
      action: "contributor.application_submitted",
      targetType: "AUTH",
      targetId: application.id,
      metadata: {
        name: application.name,
        email: application.email,
        hasPortfolio: Boolean(application.portfolioUrl),
      },
    });

    return ok(
      {
        success: true,
        applicationId: application.id,
        message: "Permohonan Anda berhasil diajukan dan sedang menunggu peninjauan Pemimpin Redaksi.",
      },
      201
    );
  } catch (error) {
    return jsonError(error);
  }
}

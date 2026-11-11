// POST /api/studio/applications/[id]/decide — Keputusan permohonan Volunteer (Chief Editor only).
import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, parseJsonBody, requireRole } from "@/lib/api";
import { toContributorApplicationDTO } from "@/lib/domain/serializers";
import { writeAudit } from "@/lib/domain/audit";

type Params = { params: Promise<{ id: string }> };

const decideSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"], {
    message: "Keputusan harus berupa APPROVE atau REJECT.",
  }),
  note: z.string().max(1000).optional(),
});

export async function POST(request: Request, { params }: Params) {
  try {
    const chief = await requireRole("CHIEF_EDITOR");
    const { id } = await params;
    const body = await parseJsonBody(request, decideSchema);

    const application = await db.contributorApplication.findUnique({
      where: { id },
      include: { invitation: true },
    });

    if (!application) {
      throw new ApiError(404, "NOT_FOUND", "Permohonan kontributor tidak ditemukan.");
    }

    if (application.status !== "PENDING") {
      throw new ApiError(
        409,
        "ALREADY_DECIDED",
        `Permohonan ini sudah diputuskan sebelumnya dengan status ${application.status}.`
      );
    }

    const decisionNote = body.note?.trim() || null;
    const now = new Date();

    if (body.decision === "REJECT") {
      // Tolak permohonan
      const updated = await db.contributorApplication.update({
        where: { id },
        data: {
          status: "REJECTED",
          decidedById: chief.id,
          decidedAt: now,
          decisionNote,
        },
        include: { decidedBy: { select: { name: true } } },
      });

      await writeAudit({
        actorType: "STAFF",
        actorId: chief.id,
        actorLabel: chief.username || chief.email || chief.name,
        action: "contributor.application_rejected",
        targetType: "AUTH",
        targetId: application.id,
        metadata: {
          applicantName: application.name,
          applicantEmail: application.email,
          reason: decisionNote,
        },
      });

      return ok({
        application: toContributorApplicationDTO(updated),
        message: "Permohonan kontributor berhasil ditolak.",
      });
    }

    // Terima permohonan (APPROVE) dan buat undangan aktivasi
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 hari

    const result = await db.$transaction(async (tx) => {
      const updatedApp = await tx.contributorApplication.update({
        where: { id },
        data: {
          status: "APPROVED",
          decidedById: chief.id,
          decidedAt: now,
          decisionNote,
        },
        include: { decidedBy: { select: { name: true } } },
      });

      const invitation = await tx.contributorInvitation.create({
        data: {
          tokenHash,
          email: application.email,
          name: application.name,
          expiresAt,
          applicationId: application.id,
          invitedById: chief.id,
        },
      });

      return { app: updatedApp, invitation };
    });

    await writeAudit({
      actorType: "STAFF",
      actorId: chief.id,
      actorLabel: chief.username || chief.email || chief.name,
      action: "contributor.application_approved",
      targetType: "AUTH",
      targetId: application.id,
      metadata: {
        applicantName: application.name,
        applicantEmail: application.email,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return ok({
      application: toContributorApplicationDTO(result.app),
      activationToken: rawToken,
      activationUrl: `/kontributor/aktivasi/${rawToken}`,
      message: "Permohonan kontributor disetujui. Tautan aktivasi berhasil diterbitkan.",
    });
  } catch (error) {
    return jsonError(error);
  }
}

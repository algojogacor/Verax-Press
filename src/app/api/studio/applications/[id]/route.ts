// GET /api/studio/applications/[id] — Detail permohonan Volunteer (Chief Editor only).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, requireRole } from "@/lib/api";
import { toContributorApplicationDTO } from "@/lib/domain/serializers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireRole("CHIEF_EDITOR");
    const { id } = await params;

    const application = await db.contributorApplication.findUnique({
      where: { id },
      include: {
        decidedBy: { select: { name: true } },
        invitation: {
          select: {
            id: true,
            expiresAt: true,
            acceptedAt: true,
            revokedAt: true,
            createdAt: true,
          },
        },
        contributor: {
          select: {
            id: true,
            username: true,
            status: true,
          },
        },
      },
    });

    if (!application) {
      throw new ApiError(404, "NOT_FOUND", "Permohonan kontributor tidak ditemukan.");
    }

    return ok({
      application: {
        ...toContributorApplicationDTO(application),
        invitation: application.invitation
          ? {
              ...application.invitation,
              expiresAt: application.invitation.expiresAt.toISOString(),
              acceptedAt: application.invitation.acceptedAt?.toISOString() ?? null,
              revokedAt: application.invitation.revokedAt?.toISOString() ?? null,
              createdAt: application.invitation.createdAt.toISOString(),
            }
          : null,
        contributor: application.contributor,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

// GET   /api/studio/staff/[id] — detail anggota staf (Chief Editor only).
// PATCH /api/studio/staff/[id] — ubah profil / status anggota (Chief Editor only).
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, parseJsonBody, requireRole } from "@/lib/api";
import { toStaffUserDTO } from "@/lib/domain/serializers";
import { writeAudit } from "@/lib/domain/audit";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireRole("CHIEF_EDITOR");
    const { id } = await params;

    const staff = await db.staffUser.findUnique({
      where: { id },
      include: {
        person: true,
        _count: {
          select: {
            createdArticles: true,
            reviews: true,
            comments: true,
          },
        },
      },
    });

    if (!staff) {
      throw new ApiError(404, "NOT_FOUND", "Anggota staf tidak ditemukan.");
    }

    return ok({
      staff: {
        ...toStaffUserDTO(staff),
        stats: {
          createdArticlesCount: staff._count.createdArticles,
          reviewsCount: staff._count.reviews,
          commentsCount: staff._count.comments,
        },
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

const patchSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().max(200).nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  try {
    const chief = await requireRole("CHIEF_EDITOR");
    const { id } = await params;
    const body = await parseJsonBody(request, patchSchema);

    const target = await db.staffUser.findUnique({
      where: { id },
      include: { person: true },
    });

    if (!target) {
      throw new ApiError(404, "NOT_FOUND", "Anggota staf tidak ditemukan.");
    }

    // Perlindungan mutlak: akun Pemimpin Redaksi terakhir yang aktif tidak boleh ditangguhkan
    if (body.status === "SUSPENDED" && target.role === "CHIEF_EDITOR") {
      const activeChiefCount = await db.staffUser.count({
        where: { role: "CHIEF_EDITOR", status: "ACTIVE" },
      });
      if (activeChiefCount <= 1) {
        throw new ApiError(
          422,
          "LAST_CHIEF_CANNOT_BE_SUSPENDED",
          "Akun Pemimpin Redaksi terakhir yang aktif tidak dapat ditangguhkan demi menjaga akses administratif organisasi."
        );
      }
    }

    // Validasi keunikan email kontak baru jika diubah
    if (body.email !== undefined && body.email !== null && body.email !== target.email) {
      const existingEmail = await db.staffUser.findFirst({
        where: {
          email: body.email,
          NOT: { id: target.id },
        },
      });
      if (existingEmail) {
        throw new ApiError(409, "EMAIL_IN_USE", "Alamat email kontak sudah digunakan oleh akun staf lain.");
      }
    }

    const updated = await db.$transaction(async (tx) => {
      const staffUpdateData: Record<string, unknown> = {};
      if (body.name !== undefined) staffUpdateData.name = body.name;
      if (body.email !== undefined) staffUpdateData.email = body.email;
      if (body.status !== undefined) staffUpdateData.status = body.status;

      const updatedStaff = await tx.staffUser.update({
        where: { id: target.id },
        data: staffUpdateData,
        include: { person: true },
      });

      if (body.name !== undefined || body.bio !== undefined) {
        if (target.person) {
          await tx.person.update({
            where: { id: target.person.id },
            data: {
              publicName: body.name ?? target.person.publicName,
              bio: body.bio !== undefined ? body.bio : target.person.bio,
            },
          });
        } else {
          await tx.person.create({
            data: {
              accountType: "STAFF",
              staffUserId: target.id,
              publicName: body.name ?? target.name,
              bio: body.bio ?? null,
            },
          });
        }
      }

      return updatedStaff;
    });

    // Catat audit trail
    let auditAction = "staff.updated";
    if (body.status === "SUSPENDED") auditAction = "staff.suspended";
    else if (body.status === "ACTIVE" && target.status === "SUSPENDED") auditAction = "staff.reactivated";

    await writeAudit({
      actorType: "STAFF",
      actorId: chief.id,
      actorLabel: chief.username || chief.email || chief.name,
      action: auditAction,
      targetType: "AUTH",
      targetId: target.id,
      metadata: {
        targetUsername: target.username,
        targetRole: target.role,
        previousStatus: target.status,
        newStatus: body.status ?? target.status,
      },
    });

    const fresh = await db.staffUser.findUnique({
      where: { id: target.id },
      include: { person: true },
    });

    return ok({ staff: toStaffUserDTO(fresh!) });
  } catch (error) {
    return jsonError(error);
  }
}

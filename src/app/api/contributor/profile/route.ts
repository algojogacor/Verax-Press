// GET & PATCH /api/contributor/profile — kelola profil kontributor
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, parseJsonBody, requireContributorSession } from "@/lib/api";
import { writeAudit } from "@/lib/domain/audit";

const profileSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter.").max(120),
  bio: z.string().max(1000).optional().nullable(),
});

export async function GET() {
  try {
    const user = await requireContributorSession();

    const contributor = await db.contributor.findUnique({
      where: { id: user.id },
      include: {
        person: true,
      },
    });

    if (!contributor) {
      throw new ApiError(404, "NOT_FOUND", "Profil kontributor tidak ditemukan.");
    }

    return ok({
      id: contributor.id,
      name: contributor.person?.publicName ?? user.name,
      username: contributor.username,
      email: contributor.email,
      bio: contributor.person?.bio ?? null,
      status: contributor.status,
      personId: contributor.person?.id ?? null,
      lastLoginAt: contributor.lastLoginAt?.toISOString() ?? null,
      createdAt: contributor.createdAt.toISOString(),
      updatedAt: contributor.updatedAt.toISOString(),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireContributorSession();
    const body = await parseJsonBody(request, profileSchema);

    const contributor = await db.contributor.findUnique({
      where: { id: user.id },
      include: { person: true },
    });

    if (!contributor) {
      throw new ApiError(404, "NOT_FOUND", "Profil kontributor tidak ditemukan.");
    }

    const updatedPerson = await db.$transaction(async (tx) => {
      if (contributor.person) {
        return tx.person.update({
          where: { id: contributor.person.id },
          data: {
            publicName: body.name,
            bio: body.bio ?? null,
          },
        });
      } else {
        return tx.person.create({
          data: {
            accountType: "EXTERNAL",
            contributorId: contributor.id,
            publicName: body.name,
            bio: body.bio ?? null,
          },
        });
      }
    });

    await writeAudit({
      actorType: "CONTRIBUTOR",
      actorId: user.id,
      actorLabel: user.username || user.email || user.name,
      action: "contributor.profile_updated",
      targetType: "AUTH",
      targetId: user.id,
      metadata: { name: body.name },
    });

    return ok({
      id: contributor.id,
      name: updatedPerson.publicName,
      username: contributor.username,
      email: contributor.email,
      bio: updatedPerson.bio,
      status: contributor.status,
      updatedAt: contributor.updatedAt.toISOString(),
    });
  } catch (error) {
    return jsonError(error);
  }
}

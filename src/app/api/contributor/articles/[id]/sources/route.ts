// POST /api/contributor/articles/[id]/sources — tambah referensi sumber oleh kontributor.
// verificationStatus SELALU UNVERIFIED; isKeySource SELALU false.
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, parseJsonBody, requireContributorSession } from "@/lib/api";
import { writeAudit } from "@/lib/domain/audit";
import { SOURCE_TYPES } from "@/lib/domain/constants";
import { httpUrlSchema } from "@/lib/url";

type Params = { params: Promise<{ id: string }> };

const sourceSchema = z.object({
  title: z.string().min(3).max(300),
  publisher: z.string().max(200).optional(),
  url: httpUrlSchema("URL sumber harus berupa tautan http:// atau https:// yang valid.", 2_000),
  sourceType: z.enum(SOURCE_TYPES as [string, ...string[]]),
  publishedAt: z.string().datetime().optional().nullable(),
  accessedAt: z.string().datetime().optional().nullable(),
  supports: z.string().max(600).optional(),
});

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireContributorSession();
    const { id } = await params;
    const body = await parseJsonBody(request, sourceSchema);

    const article = await db.article.findUnique({
      where: { id },
      select: { id: true, contributorId: true, status: true },
    });
    if (!article) throw new ApiError(404, "NOT_FOUND", "Artikel tidak ditemukan.");

    if (article.contributorId !== user.id) {
      throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses ke naskah ini.");
    }

    if (article.status !== "DRAFT" && article.status !== "REVISION_NEEDED") {
      throw new ApiError(
        403,
        "FORBIDDEN",
        `Sumber tidak dapat ditambahkan saat naskah berstatus ${article.status}.`,
      );
    }

    const source = await db.sourceReference.create({
      data: {
        articleId: article.id,
        title: body.title,
        publisher: body.publisher ?? null,
        url: body.url,
        sourceType: body.sourceType,
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
        accessedAt: body.accessedAt ? new Date(body.accessedAt) : new Date(),
        supports: body.supports ?? null,
        isKeySource: false,
        verificationStatus: "UNVERIFIED",
      },
    });

    await writeAudit({
      actorType: "CONTRIBUTOR",
      actorId: user.id,
      actorLabel: user.username || user.email || user.name,
      action: "source.added",
      targetType: "SOURCE",
      targetId: source.id,
      metadata: { articleId: article.id, title: body.title },
    });

    return ok(source, 201);
  } catch (error) {
    return jsonError(error);
  }
}

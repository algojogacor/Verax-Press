// GET  /api/studio/api-clients — daftar client (Chief Editor only).
// POST /api/studio/api-clients — buat client baru; secret ditampilkan SEKALI saja.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { jsonError, ok, parseJsonBody, requireRole } from "@/lib/api";
import { generateClientCredential, hashClientSecret } from "@/lib/api-key";
import { toApiClientDTO } from "@/lib/domain/serializers";
import { writeAudit } from "@/lib/domain/audit";

export async function GET() {
  try {
    await requireRole("CHIEF_EDITOR");
    const clients = await db.apiClient.findMany({ orderBy: { createdAt: "desc" } });
    return ok({ clients: clients.map(toApiClientDTO) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole("CHIEF_EDITOR");
    const body = await parseJsonBody(
      request,
      z.object({
        name: z.string().min(3).max(120),
        expiresInDays: z.number().int().min(1).max(730).optional(),
      }),
    );

    const { clientId, secret } = generateClientCredential();
    const client = await db.apiClient.create({
      data: {
        clientId,
        name: body.name,
        secretHash: hashClientSecret(secret),
        scopes: "submit", // scope submit-only, tidak dapat diubah (hard rule TA §9)
        expiresAt: body.expiresInDays
          ? new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000)
          : null,
      },
    });

    await writeAudit({
      actorType: "STAFF",
      actorId: user.id,
      actorLabel: user.email,
      action: "apiclient.created",
      targetType: "API_CLIENT",
      targetId: client.id,
      metadata: { clientId, scopes: "submit" },
    });

    // Secret hanya muncul sekali di respons ini — tidak pernah disimpan plaintext.
    return ok({ ...toApiClientDTO(client), secret }, 201);
  } catch (error) {
    return jsonError(error);
  }
}

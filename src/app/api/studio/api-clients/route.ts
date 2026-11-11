// GET  /api/studio/api-clients — daftar client lengkap dengan kredensial & metrik (Chief Editor only).
// POST /api/studio/api-clients — buat client baru; secret ditampilkan SEKALI saja.

import { z } from "zod";
import { db } from "@/lib/db";
import { jsonError, ok, parseJsonBody, requireRole } from "@/lib/api";
import { generateClientCredential, hashClientSecret } from "@/lib/api-key";
import { toApiClientDTO } from "@/lib/domain/serializers";
import { writeAudit } from "@/lib/domain/audit";
import { API_CLIENT_ENVIRONMENTS } from "@/lib/domain/constants";

export async function GET() {
  try {
    await requireRole("CHIEF_EDITOR");
    const clients = await db.apiClient.findMany({
      include: {
        credentials: {
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            requestLogs: true,
            credentials: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

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
        name: z.string().min(3, "Nama client minimal 3 karakter.").max(120),
        description: z.string().max(500).optional(),
        ownerName: z.string().max(120).optional(),
        environment: z.enum(API_CLIENT_ENVIRONMENTS).default("DEVELOPMENT"),
        expiresInDays: z.number().int().min(1).max(730).optional(),
      }),
    );

    const { clientId, secret } = generateClientCredential();
    const secretHash = hashClientSecret(secret);
    const keyPrefix = secret.slice(0, 10);
    const expiresAt = body.expiresInDays
      ? new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const client = await db.$transaction(async (tx) => {
      const createdClient = await tx.apiClient.create({
        data: {
          clientId,
          name: body.name,
          description: body.description ?? null,
          ownerName: body.ownerName ?? null,
          environment: body.environment,
          secretHash, // Pertahankan untuk kompatibilitas
          scopes: "submit", // Scope submit-only mutlak (tidak dapat diubah)
          expiresAt,
        },
      });

      // Buat rekaman kredensial pertama
      await tx.apiClientCredential.create({
        data: {
          apiClientId: createdClient.id,
          name: "Kredensial Utama (Awal)",
          keyPrefix,
          secretHash,
          status: "ACTIVE",
          expiresAt,
        },
      });

      await writeAudit(
        {
          actorType: "STAFF",
          actorId: user.id,
          actorLabel: user.email,
          action: "apiclient.created",
          targetType: "API_CLIENT",
          targetId: createdClient.id,
          metadata: {
            clientId,
            name: body.name,
            environment: body.environment,
            scopes: "submit",
          },
        },
        tx,
      );

      return tx.apiClient.findUniqueOrThrow({
        where: { id: createdClient.id },
        include: {
          credentials: true,
          _count: { select: { requestLogs: true, credentials: true } },
        },
      });
    });

    // Secret hanya muncul sekali di respons ini — tidak pernah disimpan plaintext.
    return ok({ ...toApiClientDTO(client), secret }, 201);
  } catch (error) {
    return jsonError(error);
  }
}

// POST /api/studio/api-clients/[id]/rotate — Rotasi Kredensial API Client (Chief Editor only).
// Mengaktifkan secret baru dan memindahkan kunci aktif lama ke status GRACE_PERIOD.

import { z } from "zod";
import { jsonError, ok, parseJsonBody, requireRole } from "@/lib/api";
import { rotateClientCredential } from "@/lib/api-key";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireRole("CHIEF_EDITOR");
    const { id } = await params;

    const body = await parseJsonBody(
      request,
      z.object({
        gracePeriodHours: z.number().int().min(0).max(720).default(24),
        expiresInDays: z.number().int().min(1).max(730).optional(),
        name: z.string().max(120).optional(),
      }),
    );

    const result = await rotateClientCredential({
      apiClientId: id,
      gracePeriodHours: body.gracePeriodHours,
      expiresInDays: body.expiresInDays,
      name: body.name,
      actorUserId: user.id,
      actorEmail: user.email ?? user.username,
    });

    // Secret baru dikembalikan satu kali saja di respons ini
    return ok({
      secret: result.secret,
      credentialId: result.credentialId,
      keyPrefix: result.keyPrefix,
      gracePeriodHours: body.gracePeriodHours,
      message: "Kredensial berhasil dirotasi. Segera salin secret baru ke konfigurasi agen Anda.",
    });
  } catch (error) {
    return jsonError(error);
  }
}

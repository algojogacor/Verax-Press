// POST /api/studio/api-clients/[id]/revoke-credential — Cabut kredensial tertentu (Chief Editor only).

import { z } from "zod";
import { jsonError, ok, parseJsonBody, requireRole } from "@/lib/api";
import { revokeClientCredential } from "@/lib/api-key";
import { toApiClientCredentialDTO } from "@/lib/domain/serializers";

export async function POST(request: Request) {
  try {
    const user = await requireRole("CHIEF_EDITOR");
    const body = await parseJsonBody(
      request,
      z.object({
        credentialId: z.string().min(1, "ID kredensial wajib disertakan."),
      }),
    );

    const revoked = await revokeClientCredential({
      credentialId: body.credentialId,
      actorUserId: user.id,
      actorEmail: user.email ?? user.username,
    });

    return ok(toApiClientCredentialDTO(revoked));
  } catch (error) {
    return jsonError(error);
  }
}

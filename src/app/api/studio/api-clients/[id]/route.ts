// PATCH /api/studio/api-clients/[id] — revoke/aktifkan kembali (Chief Editor only).
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, parseJsonBody, requireRole } from "@/lib/api";
import { toApiClientDTO } from "@/lib/domain/serializers";
import { writeAudit } from "@/lib/domain/audit";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireRole("CHIEF_EDITOR");
    const { id } = await params;
    const body = await parseJsonBody(
      request,
      z.object({ status: z.enum(["ACTIVE", "REVOKED"]) }),
    );

    const client = await db.apiClient.findUnique({ where: { id } });
    if (!client) throw new ApiError(404, "NOT_FOUND", "API client tidak ditemukan.");

    const updated = await db.apiClient.update({ where: { id }, data: { status: body.status } });

    await writeAudit({
      actorType: "STAFF",
      actorId: user.id,
      actorLabel: user.email,
      action: "apiclient.status_changed",
      targetType: "API_CLIENT",
      targetId: client.id,
      metadata: { from: client.status, to: body.status, clientId: client.clientId },
    });

    return ok(toApiClientDTO(updated));
  } catch (error) {
    return jsonError(error);
  }
}

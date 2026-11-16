// PATCH /api/studio/api-clients/[id] : kelola status atau publishMode (Chief Editor only).
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
      z
        .object({
          status: z.enum(["ACTIVE", "REVOKED"]).optional(),
          publishMode: z.enum(["standard", "direct"]).optional(),
          clientType: z.enum(["INGESTION", "INSTAGRAM_WORKER"]).optional(),
        })
        .refine(
          (data) =>
            data.status !== undefined ||
            data.publishMode !== undefined ||
            data.clientType !== undefined,
          {
            message:
              "Minimal salah satu bidang (status, publishMode, atau clientType) harus disertakan.",
          },
        ),
    );

    const client = await db.apiClient.findUnique({ where: { id } });
    if (!client) throw new ApiError(404, "NOT_FOUND", "API client tidak ditemukan.");

    const dataToUpdate: { status?: string; publishMode?: string; clientType?: string } = {};
    if (body.status !== undefined) dataToUpdate.status = body.status;
    if (body.publishMode !== undefined) dataToUpdate.publishMode = body.publishMode;
    if (body.clientType !== undefined) dataToUpdate.clientType = body.clientType;

    const updated = await db.apiClient.update({
      where: { id },
      data: dataToUpdate,
    });

    const isClientTypeChanged =
      body.clientType !== undefined && body.clientType !== client.clientType;
    const isPublishModeChanged =
      body.publishMode !== undefined && body.publishMode !== client.publishMode;
    const isStatusChanged =
      body.status !== undefined && body.status !== client.status;

    const action = isClientTypeChanged
      ? "apiclient.client_type_changed"
      : isPublishModeChanged
        ? "apiclient.publish_mode_changed"
        : isStatusChanged
          ? "apiclient.status_changed"
          : "apiclient.updated";

    const metadata: Record<string, unknown> = {
      clientId: client.clientId,
    };
    if (body.status !== undefined) {
      metadata.from = client.status;
      metadata.to = body.status;
      metadata.statusFrom = client.status;
      metadata.statusTo = body.status;
    }
    if (body.publishMode !== undefined) {
      metadata.publishModeFrom = client.publishMode;
      metadata.publishModeTo = body.publishMode;
      if (isPublishModeChanged && !isStatusChanged && !isClientTypeChanged) {
        metadata.from = client.publishMode;
        metadata.to = body.publishMode;
      }
    }
    if (body.clientType !== undefined) {
      metadata.clientTypeFrom = client.clientType;
      metadata.clientTypeTo = body.clientType;
      if (isClientTypeChanged && !isStatusChanged && !isPublishModeChanged) {
        metadata.from = client.clientType;
        metadata.to = body.clientType;
      }
    }

    await writeAudit({
      actorType: "STAFF",
      actorId: user.id,
      actorLabel: user.email,
      action,
      targetType: "API_CLIENT",
      targetId: client.id,
      metadata,
    });

    return ok(toApiClientDTO(updated));
  } catch (error) {
    return jsonError(error);
  }
}

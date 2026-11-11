// POST /api/studio/api-clients/playground/run — Server-Side Playground Execution Proxy (Fase 3).
// Mengeksekusi permintaan uji coba atas nama API Client tanpa mengekspos secret ke browser.

import { z } from "zod";
import { jsonError, ok, parseJsonBody, requireRole } from "@/lib/api";
import { getInternalProxyToken } from "@/lib/api-key";
import { POST as handleSubmission } from "@/app/api/internal/v1/ai-submissions/route";
import { POST as handleValidation } from "@/app/api/internal/v1/ai-submissions/validate/route";
import { generateRequestId } from "@/lib/request-logger";

export async function POST(request: Request) {
  try {
    await requireRole("CHIEF_EDITOR");

    const body = await parseJsonBody(
      request,
      z.object({
        clientId: z.string().min(1, "Client ID wajib dipilih."),
        endpoint: z.enum([
          "/api/internal/v1/ai-submissions/validate",
          "/api/internal/v1/ai-submissions",
        ]),
        payload: z.record(z.string(), z.unknown()),
      }),
    );

    const startTime = Date.now();
    const requestId = generateRequestId();

    // Buat objek Request in-process dengan token proxy terisolasi
    const internalRequest = new Request(`http://localhost${body.endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-verax-proxy-token": getInternalProxyToken(),
        "x-verax-proxy-client-id": body.clientId,
        "x-request-id": requestId,
      },
      body: JSON.stringify(body.payload),
    });

    let targetResponse: Response;
    if (body.endpoint === "/api/internal/v1/ai-submissions/validate") {
      targetResponse = await handleValidation(internalRequest);
    } else {
      targetResponse = await handleSubmission(internalRequest);
    }

    const durationMs = Date.now() - startTime;
    let responseBody: unknown;
    try {
      responseBody = await targetResponse.json();
    } catch {
      responseBody = await targetResponse.text();
    }

    const headersRecord: Record<string, string> = {};
    targetResponse.headers.forEach((val, key) => {
      headersRecord[key] = val;
    });

    return ok({
      statusCode: targetResponse.status,
      durationMs,
      headers: headersRecord,
      body: responseBody,
      requestId,
    });
  } catch (error) {
    return jsonError(error);
  }
}

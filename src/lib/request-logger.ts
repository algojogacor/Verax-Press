// Utilitas pencatatan log permintaan API Client (Fase 3).
// Menyimpan metadata tersanitasi untuk audit dan monitoring tanpa menyimpan rahasia.

import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";

export function generateRequestId(): string {
  return `req_${randomBytes(12).toString("hex")}`;
}

export function sanitizeIpAddress(ip: string | null | undefined): string | null {
  if (!ip) return null;
  // Jika IPv4, samarkan oktet terakhir (mis. 192.168.1.xxx) demi privasi
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
  }
  // Jika IPv6, ambil segmen awal saja
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return parts.slice(0, 3).join(":") + "::xxxx";
  }
  return ip.slice(0, 16);
}

export interface LogRequestParams {
  requestId: string;
  apiClientId?: string | null;
  method: string;
  endpoint: string;
  statusCode: number;
  durationMs: number;
  ipAddress?: string | null;
  userAgent?: string | null;
  submissionId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export async function logApiRequest(params: LogRequestParams): Promise<void> {
  try {
    await db.apiRequestLog.create({
      data: {
        requestId: params.requestId,
        apiClientId: params.apiClientId ?? null,
        method: params.method,
        endpoint: params.endpoint,
        statusCode: params.statusCode,
        durationMs: params.durationMs,
        ipAddress: sanitizeIpAddress(params.ipAddress),
        userAgent: params.userAgent ? params.userAgent.slice(0, 255) : null,
        submissionId: params.submissionId ?? null,
        errorCode: params.errorCode ?? null,
        errorMessage: params.errorMessage ? params.errorMessage.slice(0, 500) : null,
      },
    });
  } catch (error) {
    // Logging kegagalan internal tidak boleh menggagalkan respons permintaan utama
    console.error("[ApiRequestLog] Gagal mencatat log permintaan:", error);
  }
}

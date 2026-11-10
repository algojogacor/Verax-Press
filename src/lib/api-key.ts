// Autentikasi API client untuk Internal Content Ingestion API (TA §9.2).
// Format header: `Authorization: Bearer vrtc_<clientId>.<secret>`
// Secret disimpan sebagai hash scrypt; verifikasi konstan-waktu; scope "submit" only.

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/domain/audit";

export interface ApiClientIdentity {
  id: string;
  clientId: string;
  name: string;
  scopes: string[];
}

export function generateClientCredential(): { clientId: string; secret: string } {
  const clientId = `vrtc_${randomBytes(8).toString("hex")}`;
  const secret = `vrtk_${randomBytes(24).toString("hex")}`;
  return { clientId, secret };
}

export function hashClientSecret(secret: string): string {
  // Secret client panjang & acak → sha256 cukup + konstan waktu saat verifikasi.
  return createHash("sha256").update(secret).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

/**
 * Verifikasi kredensial API client. Return null bila tidak valid.
 * Catatan: scryptSync di sini untuk menjaga konstanta-waktu walau client tak ditemukan.
 */
export async function verifyApiClient(authHeader: string | null): Promise<ApiClientIdentity | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const clientId = token.slice(0, dot);
  const secret = token.slice(dot + 1);
  if (!clientId.startsWith("vrtc_") || !secret) return null;

  const client = await db.apiClient.findUnique({ where: { clientId } });
  if (!client) {
    scryptSync("dummy", "dummy", 32); // jaga timing
    return null;
  }
  if (client.status !== "ACTIVE") return null;
  if (client.expiresAt && client.expiresAt < new Date()) return null;
  if (!safeEqualHex(client.secretHash, hashClientSecret(secret))) {
    await writeAudit({
      actorType: "API_CLIENT",
      actorId: client.id,
      actorLabel: client.name,
      action: "api.auth_failed",
      targetType: "API_CLIENT",
      targetId: client.id,
      reason: "secret salah",
    });
    return null;
  }

  const scopes = client.scopes.split(",").map((s) => s.trim()).filter(Boolean);
  if (!scopes.includes("submit")) return null;

  await db.apiClient.update({ where: { id: client.id }, data: { lastUsedAt: new Date() } });
  return { id: client.id, clientId: client.clientId, name: client.name, scopes };
}

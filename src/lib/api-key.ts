// Autentikasi API client untuk Internal Content Ingestion API (Fase 3).
// Format header resmi: `Authorization: Bearer <CLIENT_ID>.<CLIENT_SECRET>`
// Secret diverifikasi menggunakan SHA-256 konstan-waktu; scope "submit" only.

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/domain/audit";

// Token in-memory acak yang hanya diketahui oleh proses server lokal (untuk Server-Side Playground Proxy)
const IN_PROCESS_PROXY_KEY = randomBytes(32).toString("hex");

export function getInternalProxyToken(): string {
  return IN_PROCESS_PROXY_KEY;
}

export function isInternalProxyTokenValid(token: string | null | undefined): boolean {
  return Boolean(token && token === IN_PROCESS_PROXY_KEY);
}

export interface ApiClientIdentity {
  id: string;
  clientId: string;
  name: string;
  scopes: string[];
  environment?: string;
  credentialId?: string;
}

export function generateClientCredential(): { clientId: string; secret: string } {
  const clientId = `vrtc_${randomBytes(8).toString("hex")}`;
  const secret = `vrtk_${randomBytes(24).toString("hex")}`;
  return { clientId, secret };
}

export function generateSecretOnly(): string {
  return `vrtk_${randomBytes(24).toString("hex")}`;
}

export function hashClientSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

export type ApiClientAuthError = "UNAUTHORIZED" | "CREDENTIAL_EXPIRED" | "CLIENT_INACTIVE" | "FORBIDDEN_SCOPE";

export interface ApiClientVerifyResult {
  client: ApiClientIdentity | null;
  errorCode?: ApiClientAuthError;
  errorMessage?: string;
}

/**
 * Verifikasi kredensial API client secara mendalam dengan pelaporan kode galat spesifik.
 */
export async function verifyApiClientDetailed(
  authHeader: string | null,
  proxyToken?: string | null,
  proxyClientId?: string | null,
): Promise<ApiClientVerifyResult> {
  const now = new Date();

  // Jalur khusus Server-Side Playground Proxy (hanya berlaku jika proxyToken cocok secara kriptografis)
  if (isInternalProxyTokenValid(proxyToken) && proxyClientId) {
    const client = await db.apiClient.findUnique({
      where: { clientId: proxyClientId },
    });
    if (!client) {
      return { client: null, errorCode: "UNAUTHORIZED", errorMessage: "Klien API tidak ditemukan." };
    }
    if (client.status !== "ACTIVE") {
      return { client: null, errorCode: "CLIENT_INACTIVE", errorMessage: "Klien API dinonaktifkan." };
    }
    if (client.expiresAt && client.expiresAt < now) {
      return { client: null, errorCode: "CREDENTIAL_EXPIRED", errorMessage: "Klien API telah kedaluwarsa." };
    }
    const scopes = client.scopes.split(",").map((s) => s.trim()).filter(Boolean);
    if (!scopes.includes("submit")) {
      return { client: null, errorCode: "FORBIDDEN_SCOPE", errorMessage: "Klien tidak memiliki izin submit." };
    }

    return {
      client: {
        id: client.id,
        clientId: client.clientId,
        name: client.name,
        scopes,
        environment: client.environment,
      },
    };
  }

  if (!authHeader?.startsWith("Bearer ")) {
    return { client: null, errorCode: "UNAUTHORIZED", errorMessage: "Header Authorization Bearer diperlukan." };
  }
  const token = authHeader.slice("Bearer ".length).trim();
  const dot = token.lastIndexOf(".");
  if (dot <= 0) {
    return { client: null, errorCode: "UNAUTHORIZED", errorMessage: "Format kredensial tidak valid." };
  }
  const clientId = token.slice(0, dot);
  const secret = token.slice(dot + 1);
  if (!clientId.startsWith("vrtc_") || !secret) {
    return { client: null, errorCode: "UNAUTHORIZED", errorMessage: "Format kredensial tidak valid." };
  }

  const client = await db.apiClient.findUnique({
    where: { clientId },
    include: {
      credentials: true,
    },
  });

  if (!client) {
    scryptSync("dummy", "dummy", 32); // Menjaga waktu respons konstan
    return { client: null, errorCode: "UNAUTHORIZED", errorMessage: "Klien API tidak ditemukan." };
  }

  // Validasi status klien utama
  if (client.status !== "ACTIVE") {
    return { client: null, errorCode: "CLIENT_INACTIVE", errorMessage: "Klien API dinonaktifkan." };
  }
  if (client.expiresAt && client.expiresAt < now) {
    return { client: null, errorCode: "CREDENTIAL_EXPIRED", errorMessage: "Klien API telah kedaluwarsa." };
  }

  const candidateHash = hashClientSecret(secret);
  let matchedCredentialId: string | undefined;

  // 1. Periksa kredensial di tabel ApiClientCredential
  for (const cred of client.credentials) {
    if (safeEqualHex(cred.secretHash, candidateHash)) {
      if (cred.status === "REVOKED") {
        return { client: null, errorCode: "UNAUTHORIZED", errorMessage: "Kredensial API telah dicabut." };
      }
      if (cred.expiresAt && cred.expiresAt < now) {
        return { client: null, errorCode: "CREDENTIAL_EXPIRED", errorMessage: "Kredensial API telah kedaluwarsa." };
      }
      if (cred.status === "GRACE_PERIOD" && cred.gracePeriodEndsAt && cred.gracePeriodEndsAt < now) {
        return { client: null, errorCode: "CREDENTIAL_EXPIRED", errorMessage: "Masa tenggang kredensial telah berakhir." };
      }
      if (cred.status !== "ACTIVE" && cred.status !== "GRACE_PERIOD") {
        return { client: null, errorCode: "UNAUTHORIZED", errorMessage: "Status kredensial tidak aktif." };
      }
      matchedCredentialId = cred.id;
      break;
    }
  }

  // 2. Fallback untuk klien warisan HANYA jika klien belum memiliki rekaman di ApiClientCredential
  if (!matchedCredentialId && client.credentials.length === 0 && client.secretHash) {
    if (safeEqualHex(client.secretHash, candidateHash)) {
      matchedCredentialId = "legacy";
    }
  }

  if (!matchedCredentialId) {
    await writeAudit({
      actorType: "API_CLIENT",
      actorId: client.id,
      actorLabel: client.name,
      action: "api.auth_failed",
      targetType: "API_CLIENT",
      targetId: client.id,
      reason: "secret salah atau kredensial kedaluwarsa",
    });
    return { client: null, errorCode: "UNAUTHORIZED", errorMessage: "Kredensial API tidak cocok." };
  }

  const scopes = client.scopes.split(",").map((s) => s.trim()).filter(Boolean);
  if (!scopes.includes("submit")) {
    return { client: null, errorCode: "FORBIDDEN_SCOPE", errorMessage: "Klien tidak memiliki izin submit." };
  }

  // Perbarui metadata pemakaian terakhir
  await db.apiClient.update({
    where: { id: client.id },
    data: { lastUsedAt: now },
  });

  if (matchedCredentialId !== "legacy") {
    await db.apiClientCredential.update({
      where: { id: matchedCredentialId },
      data: { lastUsedAt: now },
    });
  }

  return {
    client: {
      id: client.id,
      clientId: client.clientId,
      name: client.name,
      scopes,
      environment: client.environment,
      credentialId: matchedCredentialId !== "legacy" ? matchedCredentialId : undefined,
    },
  };
}

/**
 * Verifikasi kredensial API client. Mengembalikan null bila tidak valid.
 * Mendukung rotasi kredensial (status ACTIVE dan GRACE_PERIOD yang belum kedaluwarsa).
 */
export async function verifyApiClient(
  authHeader: string | null,
  proxyToken?: string | null,
  proxyClientId?: string | null,
): Promise<ApiClientIdentity | null> {
  const result = await verifyApiClientDetailed(authHeader, proxyToken, proxyClientId);
  return result.client;
}

/**
 * Melakukan rotasi kredensial API Client.
 * Kredensial aktif lama dipindahkan ke status GRACE_PERIOD dengan masa tenggang yang ditentukan.
 * Kredensial baru dibuat dan secret plaintext dikembalikan satu kali saja.
 */
export async function rotateClientCredential(options: {
  apiClientId: string;
  gracePeriodHours?: number;
  expiresInDays?: number;
  name?: string;
  actorUserId?: string;
  actorEmail?: string;
}): Promise<{ secret: string; credentialId: string; keyPrefix: string }> {
  const client = await db.apiClient.findUnique({
    where: { id: options.apiClientId },
    include: { credentials: true },
  });

  if (!client) {
    throw new Error("API Client tidak ditemukan.");
  }

  const now = new Date();
  const graceHours = options.gracePeriodHours && options.gracePeriodHours > 0 ? options.gracePeriodHours : 24;
  const gracePeriodEndsAt = new Date(now.getTime() + graceHours * 3600 * 1000);

  const newSecret = generateSecretOnly();
  const newSecretHash = hashClientSecret(newSecret);
  const keyPrefix = newSecret.slice(0, 10);
  const expiresAt = options.expiresInDays
    ? new Date(now.getTime() + options.expiresInDays * 24 * 3600 * 1000)
    : null;

  const result = await db.$transaction(async (tx) => {
    // Pindahkan kredensial ACTIVE lama ke GRACE_PERIOD
    await tx.apiClientCredential.updateMany({
      where: {
        apiClientId: client.id,
        status: "ACTIVE",
      },
      data: {
        status: "GRACE_PERIOD",
        gracePeriodEndsAt,
      },
    });

    // Buat kredensial baru
    const newCred = await tx.apiClientCredential.create({
      data: {
        apiClientId: client.id,
        name: options.name ?? `Kredensial Rotasi (${now.toISOString().slice(0, 10)})`,
        keyPrefix,
        secretHash: newSecretHash,
        status: "ACTIVE",
        expiresAt,
      },
    });

    // Perbarui secretHash pada ApiClient agar selaras dengan kredensial aktif terbaru
    await tx.apiClient.update({
      where: { id: client.id },
      data: { secretHash: newSecretHash },
    });

    await writeAudit(
      {
        actorType: "STAFF",
        actorId: options.actorUserId ?? null,
        actorLabel: options.actorEmail ?? "Chief Editor",
        action: "apiclient.rotated",
        targetType: "API_CLIENT",
        targetId: client.id,
        metadata: {
          apiClientId: client.id,
          credentialId: newCred.id,
          keyPrefix,
          gracePeriodHours: graceHours,
        },
      },
      tx,
    );

    return newCred;
  });

  return {
    secret: newSecret,
    credentialId: result.id,
    keyPrefix,
  };
}

/**
 * Mencabut sebuah kredensial spesifik secara langsung.
 */
export async function revokeClientCredential(options: {
  credentialId: string;
  actorUserId?: string;
  actorEmail?: string;
}) {
  const cred = await db.apiClientCredential.findUnique({
    where: { id: options.credentialId },
  });

  if (!cred) {
    throw new Error("Kredensial tidak ditemukan.");
  }

  const updated = await db.apiClientCredential.update({
    where: { id: options.credentialId },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
    },
  });

  await writeAudit({
    actorType: "STAFF",
    actorId: options.actorUserId ?? null,
    actorLabel: options.actorEmail ?? "Chief Editor",
    action: "apiclient.credential_revoked",
    targetType: "API_CLIENT",
    targetId: cred.apiClientId,
    metadata: {
      credentialId: cred.id,
      keyPrefix: cred.keyPrefix,
    },
  });

  return updated;
}

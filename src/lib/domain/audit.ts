// Audit append-only helper (TA §6 audit_events). Tidak pernah menyimpan secret/token.
import { db } from "@/lib/db";

export interface AuditInput {
  actorType: "STAFF" | "API_CLIENT" | "SYSTEM" | "PUBLIC";
  actorId?: string | null;
  actorLabel?: string | null;
  action: string;
  targetType: "ARTICLE" | "SOURCE" | "SUBMISSION" | "COMPLAINT" | "CORRECTION" | "API_CLIENT" | "AUTH";
  targetId?: string | null;
  reason?: string | null;
  correlationId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await db.auditEvent.create({
      data: {
        actorType: input.actorType,
        actorId: input.actorId ?? null,
        actorLabel: input.actorLabel ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        reason: input.reason ?? null,
        correlationId: input.correlationId ?? null,
        metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  } catch (error) {
    // Audit tidak boleh menjatuhkan operasi utama; catat ke stderr untuk observability.
    console.error("[audit] gagal menulis audit event", input.action, error);
  }
}

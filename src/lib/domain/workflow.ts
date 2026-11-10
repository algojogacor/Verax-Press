// State machine alur kerja editorial naskah (Tahap A).
// Transisi HANYA terjadi melalui modul ini; route API tidak boleh menulis status secara langsung.
// Setiap transisi menghasilkan EditorialReview + AuditEvent (dipanggil di route handler).

import type { ArticleStatus, Role, TransitionAction } from "@/types/verity";

export interface TransitionRule {
  action: TransitionAction;
  from: ArticleStatus;
  to: ArticleStatus;
  /** Role yang boleh melakukan. "AUTHOR" berarti internal author pemilik naskah. */
  allowedRoles: Array<Role | "AUTHOR">;
  /** Catatan alasan wajib (feedback revisi / alasan tolak / dsb). */
  requiresReason: boolean;
  /** Gate khusus sebelum boleh dieksekusi (dipakai untuk PUBLISH). */
  gate: "NONE" | "PUBLISH";
}

const EDITOR_RULE_ROLES: Array<Role | "AUTHOR"> = ["CHIEF_EDITOR", "EDITOR"];
const AUTHOR_RULE_ROLES: Array<Role | "AUTHOR"> = ["CHIEF_EDITOR", "EDITOR", "AUTHOR"];

export const TRANSITION_RULES: TransitionRule[] = [
  // DRAFT
  { action: "SUBMIT_REVIEW", from: "DRAFT", to: "PENDING_REVIEW", allowedRoles: AUTHOR_RULE_ROLES, requiresReason: false, gate: "NONE" },
  { action: "WITHDRAW", from: "DRAFT", to: "WITHDRAWN", allowedRoles: AUTHOR_RULE_ROLES, requiresReason: true, gate: "NONE" },
  // PENDING_REVIEW (Editor)
  { action: "START_FACT_CHECK", from: "PENDING_REVIEW", to: "FACT_CHECK", allowedRoles: EDITOR_RULE_ROLES, requiresReason: false, gate: "NONE" },
  { action: "REQUEST_REVISION", from: "PENDING_REVIEW", to: "REVISION_NEEDED", allowedRoles: EDITOR_RULE_ROLES, requiresReason: true, gate: "NONE" },
  { action: "REJECT", from: "PENDING_REVIEW", to: "REJECTED", allowedRoles: EDITOR_RULE_ROLES, requiresReason: true, gate: "NONE" },
  // FACT_CHECK (Editor)
  { action: "SUBMIT_FOR_APPROVAL", from: "FACT_CHECK", to: "PENDING_APPROVAL", allowedRoles: EDITOR_RULE_ROLES, requiresReason: false, gate: "NONE" },
  { action: "REQUEST_REVISION", from: "FACT_CHECK", to: "REVISION_NEEDED", allowedRoles: EDITOR_RULE_ROLES, requiresReason: true, gate: "NONE" },
  { action: "REJECT", from: "FACT_CHECK", to: "REJECTED", allowedRoles: EDITOR_RULE_ROLES, requiresReason: true, gate: "NONE" },
  // REVISION_NEEDED (kembali ke author)
  { action: "RESUBMIT_REVIEW", from: "REVISION_NEEDED", to: "PENDING_REVIEW", allowedRoles: AUTHOR_RULE_ROLES, requiresReason: false, gate: "NONE" },
  { action: "WITHDRAW", from: "REVISION_NEEDED", to: "WITHDRAWN", allowedRoles: AUTHOR_RULE_ROLES, requiresReason: true, gate: "NONE" },
  // PENDING_APPROVAL: HANYA Pemimpin Redaksi (aturan baku: persetujuan akhir terpusat)
  { action: "PUBLISH", from: "PENDING_APPROVAL", to: "PUBLISHED", allowedRoles: ["CHIEF_EDITOR"], requiresReason: false, gate: "PUBLISH" },
  { action: "REJECT", from: "PENDING_APPROVAL", to: "REJECTED", allowedRoles: ["CHIEF_EDITOR"], requiresReason: true, gate: "NONE" },
  // PUBLISHED (pasca-publikasi; CORRECTED dibuat lewat jalur koreksi dengan CorrectionRecord)
  { action: "RETRACT", from: "PUBLISHED", to: "RETRACTED", allowedRoles: ["CHIEF_EDITOR"], requiresReason: true, gate: "NONE" },
  { action: "ARCHIVE", from: "PUBLISHED", to: "ARCHIVED", allowedRoles: ["CHIEF_EDITOR"], requiresReason: false, gate: "NONE" },
  // CORRECTED
  { action: "RETRACT", from: "CORRECTED", to: "RETRACTED", allowedRoles: ["CHIEF_EDITOR"], requiresReason: true, gate: "NONE" },
  { action: "ARCHIVE", from: "CORRECTED", to: "ARCHIVED", allowedRoles: ["CHIEF_EDITOR"], requiresReason: false, gate: "NONE" },
];

export function getRule(action: TransitionAction, from: ArticleStatus): TransitionRule | undefined {
  return TRANSITION_RULES.find((rule) => rule.action === action && rule.from === from);
}

export function allowedTransitionsFrom(from: ArticleStatus): TransitionRule[] {
  return TRANSITION_RULES.filter((rule) => rule.from === from);
}

/** Apakah role (dengan kepemilikan naskah) boleh mengeksekusi rule? */
export function canExecuteRule(
  rule: TransitionRule,
  role: Role,
  isOwner: boolean,
): boolean {
  if (rule.allowedRoles.includes("CHIEF_EDITOR") && role === "CHIEF_EDITOR") return true;
  if (rule.allowedRoles.includes("EDITOR") && role === "EDITOR") return true;
  if (rule.allowedRoles.includes("AUTHOR") && role === "INTERNAL_AUTHOR" && isOwner) return true;
  return false;
}

export const TRANSITION_LABELS: Record<TransitionAction, string> = {
  SUBMIT_REVIEW: "Ajukan Penelaahan",
  WITHDRAW: "Tarik Naskah",
  START_FACT_CHECK: "Mulai Uji Fakta",
  REQUEST_REVISION: "Minta Revisi",
  REJECT: "Tolak",
  SUBMIT_FOR_APPROVAL: "Ajukan Persetujuan",
  RESUBMIT_REVIEW: "Kirim Ulang Penelaahan",
  PUBLISH: "Setujui dan Terbitkan",
  RETRACT: "Cabut Artikel",
  ARCHIVE: "Arsipkan",
};

/** Status yang tidak bisa lagi bertransisi (kecuali koreksi/cabut/arsip dari PUBLISHED/CORRECTED). */
export const TERMINAL_STATUSES: ArticleStatus[] = ["REJECTED", "WITHDRAWN", "RETRACTED", "ARCHIVED"];

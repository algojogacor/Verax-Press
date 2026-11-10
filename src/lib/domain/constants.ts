// Konstanta domain + label bahasa Indonesia. Murni (aman client & server).
import type {
  AiInvolvement,
  ArticleFormat,
  ArticleStatus,
  ComplaintType,
  ContributionRole,
  Role,
  SourceType,
  VerificationStatus,
  VersionType,
} from "@/types/verity";

export const ROLES: Role[] = ["CHIEF_EDITOR", "EDITOR", "INTERNAL_AUTHOR", "VOLUNTEER"];

export const ARTICLE_STATUSES: ArticleStatus[] = [
  "DRAFT",
  "PENDING_REVIEW",
  "FACT_CHECK",
  "REVISION_NEEDED",
  "PENDING_APPROVAL",
  "PUBLISHED",
  "REJECTED",
  "WITHDRAWN",
  "CORRECTED",
  "RETRACTED",
  "ARCHIVED",
];

export const ARTICLE_FORMATS: ArticleFormat[] = ["NEWS", "OPINION", "ANALYSIS", "EXPLAINER", "FEATURE", "INTERVIEW"];

/** D2 LOCKED: format News hanya diproduksi newsroom — tidak boleh dari kontributor/agent. */
export const CONTRIBUTOR_ALLOWED_FORMATS: ArticleFormat[] = [
  "OPINION",
  "ANALYSIS",
  "EXPLAINER",
  "FEATURE",
  "INTERVIEW",
];

export const AI_INVOLVEMENTS: AiInvolvement[] = ["none", "assistive", "substantive"];

export const SOURCE_TYPES: SourceType[] = ["PRIMARY", "SECONDARY", "DOCUMENT", "INTERVIEW", "DATA", "OFFICIAL"];

export const VERIFICATION_STATUSES: VerificationStatus[] = ["UNVERIFIED", "VERIFIED", "DISPUTED"];

export const VERSION_TYPES: VersionType[] = ["author", "editorial_copyedit", "risk_edit", "ingestion"];

export const COMPLAINT_TYPES: ComplaintType[] = [
  "HAK_JAWAB",
  "HAK_KOREKSI",
  "KELUHAN",
  "PERMINTAAN_PENGHAPUSAN",
];

export const CONTRIBUTION_ROLES: ContributionRole[] = ["AUTHOR", "EDITOR", "REPORTER", "REVIEWER", "VISUAL"];

export const ROLE_LABELS: Record<Role, string> = {
  CHIEF_EDITOR: "Chief Editor",
  EDITOR: "Editor",
  INTERNAL_AUTHOR: "Internal Author",
  VOLUNTEER: "Volunteer",
};

export const STATUS_LABELS: Record<ArticleStatus, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Menunggu Review",
  FACT_CHECK: "Fact-Check",
  REVISION_NEEDED: "Perlu Revisi",
  PENDING_APPROVAL: "Menunggu Persetujuan",
  PUBLISHED: "Terbit",
  REJECTED: "Ditolak",
  WITHDRAWN: "Ditarik",
  CORRECTED: "Dikoreksi",
  RETRACTED: "Dicabut",
  ARCHIVED: "Diarsipkan",
};

export const FORMAT_LABELS: Record<ArticleFormat, string> = {
  NEWS: "News",
  OPINION: "Opini",
  ANALYSIS: "Analisis",
  EXPLAINER: "Explainer",
  FEATURE: "Feature",
  INTERVIEW: "Wawancara",
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  PRIMARY: "Primer",
  SECONDARY: "Sekunder",
  DOCUMENT: "Dokumen",
  INTERVIEW: "Wawancara",
  DATA: "Data",
  OFFICIAL: "Resmi",
};

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  UNVERIFIED: "Belum diverifikasi",
  VERIFIED: "Terverifikasi",
  DISPUTED: "Dipertanyakan",
};

export const COMPLAINT_TYPE_LABELS: Record<ComplaintType, string> = {
  HAK_JAWAB: "Hak Jawab",
  HAK_KOREKSI: "Hak Koreksi",
  KELUHAN: "Keluhan",
  PERMINTAAN_PENGHAPUSAN: "Permintaan Penurunan",
};

export const COMPLAINT_STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Diterima",
  IN_REVIEW: "Sedang Ditinjau",
  RESOLVED: "Selesai",
  REJECTED: "Ditolak",
};

export const VERSION_TYPE_LABELS: Record<VersionType, string> = {
  author: "Penulis",
  editorial_copyedit: "Copyedit Redaksi",
  risk_edit: "Risk-Edit",
  ingestion: "Ingestion API",
};

export const CONTRIBUTION_ROLE_LABELS: Record<ContributionRole, string> = {
  AUTHOR: "Penulis",
  EDITOR: "Editor",
  REPORTER: "Reporter",
  REVIEWER: "Peninjau",
  VISUAL: "Visual",
};

export const AI_INVOLVEMENT_LABELS: Record<AiInvolvement, string> = {
  none: "Tanpa AI",
  assistive: "AI Asistif",
  substantive: "AI Substantif",
};

export const ORIGIN_LABELS: Record<string, string> = {
  NEWSROOM: "Newsroom",
  INGESTION_API: "AI Agent (API)",
  CONTRIBUTOR: "Kontributor",
};

/** Template struktur yang disarankan per format (Contributor Policy §4.2) — dipakai sebagai panduan di editor. */
export const FORMAT_STRUCTURE_HINTS: Record<ArticleFormat, string> = {
  NEWS: "Pemberitaan faktual: lead faktual → konteks → detail terverifikasi → kutipan beratribusi.",
  OPINION: "Pendahuluan → Argumen utama → Argumen pendukung → Anti-argumen (opsional) → Kesimpulan.",
  ANALYSIS: "Latar belakang → Bukti → Analisis → Implikasi → Kesimpulan.",
  EXPLAINER: "Pertanyaan utama → Penjelasan → Poin kunci → Konteks → Sumber.",
  FEATURE: "Pembuka naratif → Perspektif manusia → Konteks → Narasi utama → Penutup.",
  INTERVIEW: "Pendahuluan → Profil narasumber → Tanya jawab → Penutup.",
};

/** Disclaimer wajib artikel Opini (Contributor Policy §8). */
export const OPINION_DISCLAIMER =
  "Pendapat dalam tulisan ini merupakan tanggung jawab penulis dan tidak otomatis mewakili pandangan resmi Redaksi Verax Press.";

/** Catatan proses standar untuk ai_involvement=substantive (Charter §4.3). */
export const AI_SUBSTANTIVE_NOTE_DEFAULT =
  "Draf awal artikel ini disusun dengan bantuan AI, lalu diperiksa terhadap sumber dan disunting oleh redaksi.";

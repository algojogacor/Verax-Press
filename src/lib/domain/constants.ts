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

/** Format Berita hanya diproduksi ruang redaksi internal, tertutup bagi kontributor luar atau agen AI. */
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
  PENDING_REVIEW: "Menunggu Penelaahan",
  FACT_CHECK: "Uji Fakta",
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
  NEWS: "Berita",
  OPINION: "Opini",
  ANALYSIS: "Analisis",
  EXPLAINER: "Penjelas",
  FEATURE: "Kisah Khas",
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
  editorial_copyedit: "Penyuntingan Redaksi",
  risk_edit: "Penyuntingan Risiko",
  ingestion: "Pemasukan API",
};

export const CONTRIBUTION_ROLE_LABELS: Record<ContributionRole, string> = {
  AUTHOR: "Penulis",
  EDITOR: "Redaktur",
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
  NEWSROOM: "Ruang Redaksi",
  INGESTION_API: "Agen AI (API)",
  CONTRIBUTOR: "Kontributor",
};

/** Panduan susunan tulisan per format (Pedoman Kontributor §4.2) sebagai acuan di editor. */
export const FORMAT_STRUCTURE_HINTS: Record<ArticleFormat, string> = {
  NEWS: "Pemberitaan faktual: teras berita faktual → konteks → rincian terverifikasi → kutipan beratribusi.",
  OPINION: "Pendahuluan → Argumen utama → Argumen pendukung → Anti-argumen (opsional) → Kesimpulan.",
  ANALYSIS: "Latar belakang → Bukti → Analisis → Implikasi → Kesimpulan.",
  EXPLAINER: "Pertanyaan utama → Penjelasan → Poin kunci → Konteks → Sumber.",
  FEATURE: "Pembuka naratif → Perspektif manusia → Konteks → Narasi utama → Penutup.",
  INTERVIEW: "Pendahuluan → Profil narasumber → Tanya jawab → Penutup.",
};

/** Pernyataan sanggahan wajib artikel Opini (Pedoman Kontributor §8). */
export const OPINION_DISCLAIMER =
  "Pendapat dalam tulisan ini merupakan tanggung jawab penulis dan tidak otomatis mewakili pandangan resmi Redaksi Verax Press.";

/** Catatan proses standar untuk ai_involvement=substantive (Piagam Redaksi §4.3). */
export const AI_SUBSTANTIVE_NOTE_DEFAULT =
  "Draf awal artikel ini disusun dengan bantuan AI, lalu diperiksa terhadap sumber dan disunting oleh redaksi.";

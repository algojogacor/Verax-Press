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

export const ROLES: Role[] = ["CHIEF_EDITOR", "WRITER"];

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

/** Format Berita (NEWS) ditahan sementara pada jalur Ingestion API hingga Pemimpin Redaksi mengesahkan otorisasi format AI NEWS. */
export const INGESTION_PENDING_FORMATS: ArticleFormat[] = ["NEWS"];

/** Format aktif yang diizinkan untuk intake ingestion agen AI (NEWS sementara ditahan fail-closed). */
export const INGESTION_ALLOWED_FORMATS: ArticleFormat[] = [
  "OPINION",
  "ANALYSIS",
  "EXPLAINER",
  "FEATURE",
  "INTERVIEW",
];

export interface ConditionalFormatRule {
  format: ArticleFormat;
  requiredSourceTypes: string[];
  minSupportsLength: number;
  minVerificationNotesLength: number;
  requirementSummary: string;
}

/** Aturan prasyarat bersyarat untuk format berisiko tinggi klaim peliputan pada jalur Ingestion API. */
export const INGESTION_CONDITIONAL_FORMAT_RULES: Record<"FEATURE" | "INTERVIEW", ConditionalFormatRule> = {
  FEATURE: {
    format: "FEATURE",
    requiredSourceTypes: ["INTERVIEW", "PRIMARY"],
    minSupportsLength: 20,
    minVerificationNotesLength: 20,
    requirementSummary:
      "Wajib menyertakan minimal satu sumber rujukan bertipe INTERVIEW atau PRIMARY dengan keterangan supports spesifik (>= 20 karakter) yang menunjuk transkrip atau berkas peliputan nyata serta mengisi verificationNotes (>= 20 karakter).",
  },
  INTERVIEW: {
    format: "INTERVIEW",
    requiredSourceTypes: ["INTERVIEW"],
    minSupportsLength: 20,
    minVerificationNotesLength: 20,
    requirementSummary:
      "Wajib menyertakan minimal satu sumber rujukan bertipe INTERVIEW dengan keterangan supports spesifik (>= 20 karakter) yang menunjuk transkrip/rekaman wawancara nyata serta mengisi verificationNotes (>= 20 karakter).",
  },
};

/** Batas usia maksimal sumber primer atau resmi untuk format NEWS (48 jam dalam milidetik). */
export const NEWS_MAX_SOURCE_AGE_MS = 48 * 60 * 60 * 1000;

/** Panjang minimal catatan verifikasi untuk format NEWS (80 karakter). */
export const NEWS_MIN_VERIFICATION_NOTES_LENGTH = 80;

/** Batas kuota harian penerimaan naskah format NEWS per akun API client. */
export const NEWS_DAILY_SUBMISSION_LIMIT = 5;

/** Jendela waktu pembatasan laju harian format NEWS (24 jam dalam milidetik). */
export const NEWS_DAILY_RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Penanda byline sementara bagi draf asal Ingestion API sebelum penetapan atribusi oleh editor manusia. */
export const AI_PLACEHOLDER_BYLINE = "Draf Agen AI (Menunggu Penetapan Byline)";

/** Byline kolektif ruang redaksi untuk karya internal yang telah disunting dan diverifikasi manusia. */
export const COLLECTIVE_NEWSROOM_BYLINE = "Redaksi Verax Press";

/** Format Berita (NEWS) diproduksi ruang redaksi internal, tertutup bagi kontributor relawan eksternal. */
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
  CHIEF_EDITOR: "Pemimpin Redaksi",
  WRITER: "Penulis",
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

export const API_CLIENT_ENVIRONMENTS = ["DEVELOPMENT", "PREVIEW", "PRODUCTION"] as const;

import { getCanonicalBaseUrl, isLocalDevelopmentHost, normalizeHostname } from "@/lib/seo/constants";

export function getPublicBaseUrl(): string {
  const isVercelProduction =
    typeof process !== "undefined" && process.env.VERCEL_ENV === "production";

  if (typeof process !== "undefined" && process.env.VERAX_PUBLIC_BASE_URL) {
    const candidate = process.env.VERAX_PUBLIC_BASE_URL.trim().replace(/\/+$/, "");
    if (!isVercelProduction) return candidate;
    try {
      const host = normalizeHostname(new URL(candidate).hostname);
      if (host && !isLocalDevelopmentHost(host)) return candidate;
    } catch {
      // Abaikan URL tidak valid di produksi
    }
  }
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL) {
    const candidate = process.env.NEXT_PUBLIC_SITE_URL.trim().replace(/\/+$/, "");
    if (!isVercelProduction) return candidate;
    try {
      const host = normalizeHostname(new URL(candidate).hostname);
      if (host && !isLocalDevelopmentHost(host)) return candidate;
    } catch {
      // Abaikan URL tidak valid di produksi
    }
  }
  if (isVercelProduction) {
    return getCanonicalBaseUrl();
  }
  if (typeof process !== "undefined" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/+$/, "")}`;
  }
  return "http://localhost:3000";
}

const SAFE_LOCAL_HOST_PORT_RE = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d{1,5})?$/i;

export function resolveBaseUrlFromHeaders(
  headerSource: Pick<Headers, "get">,
  fallbackUrl?: string,
): string {
  if (typeof process !== "undefined" && process.env.VERCEL_ENV === "production") {
    return getPublicBaseUrl();
  }
  const rawHost =
    headerSource.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    headerSource.get("host")?.split(",")[0]?.trim();
  if (rawHost && SAFE_LOCAL_HOST_PORT_RE.test(rawHost)) {
    const protoHeader = headerSource.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
    let protocol = "http";
    if (protoHeader === "https") {
      protocol = "https";
    } else if (fallbackUrl) {
      try {
        protocol = new URL(fallbackUrl).protocol.replace(/:$/, "") || "http";
      } catch {
        protocol = "http";
      }
    }
    return `${protocol}://${rawHost}`.replace(/\/+$/, "");
  }
  return getPublicBaseUrl();
}

/**
 * Menyelaraskan origin loopback lokal (`http://localhost:3000` vs `http://127.0.0.1:3000`)
 * untuk endpoint mesin & editorial saat tidak berjalan pada lingkungan produksi Vercel.
 */
export function resolveRequestBaseUrl(request?: Request): string {
  if (!request) {
    return getPublicBaseUrl();
  }
  return resolveBaseUrlFromHeaders(request.headers, request.url);
}

export function getSystemEnvironment(): "production" | "preview" | "development" {
  if (typeof process !== "undefined") {
    if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
      return "production";
    }
    if (process.env.VERCEL_ENV === "preview") {
      return "preview";
    }
  }
  return "development";
}

// Util format tanggal Indonesia + helper kecil untuk UI (client & server safe).
import type { ArticleStatus, VerificationStatus } from "@/types/verity";

const TZ = "Asia/Jakarta";

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  }).format(d);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(d);
}

export function formatShortDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  }).format(d);
}

/** Tanggal panjang untuk masthead, mis. "Senin, 9 November 2026". */
export function formatMastheadDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  }).format(date);
}

/** Stempel relatif untuk rail "Terbaru" (identitas pembaruan: hari ini atau kemarin beserta jam). */
export function formatRailTimestamp(date: Date | string | null | undefined, now: Date = new Date()): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  const time = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(d);
  const day = (x: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(x); // YYYY-MM-DD
  if (day(d) === day(now)) return `Hari ini · ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (day(d) === day(yesterday)) return `Kemarin · ${time}`;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: TZ,
  }).format(d);
}

export function formatISODate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString();
}

/** Warna semantik status verifikasi (fungsi, bukan dekorasi). */
export function verificationColor(status: VerificationStatus): string {
  switch (status) {
    case "VERIFIED":
      return "text-[#1E6B45]";
    case "DISPUTED":
      return "text-[#9E2B25]";
    default:
      return "text-[#8A6D1A]";
  }
}

export function statusDotClass(status: ArticleStatus): string {
  switch (status) {
    case "PUBLISHED":
    case "CORRECTED":
      return "bg-[#1E6B45]";
    case "REJECTED":
    case "RETRACTED":
      return "bg-[#9E2B25]";
    case "PENDING_REVIEW":
    case "FACT_CHECK":
    case "PENDING_APPROVAL":
      return "bg-[#8A6D1A]";
    case "REVISION_NEEDED":
      return "bg-[#B45309]";
    default:
      return "bg-neutral-400";
  }
}

export const formatDateShort = formatShortDate;

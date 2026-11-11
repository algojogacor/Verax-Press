// Validasi dan sanitasi URL aman untuk tautan eksternal dan aset media.
// Mencegah skema berbahaya (javascript:, data:, vbscript:, file:) maupun path protocol-relative (//).
import { z } from "zod";

const SAFE_RELATIVE_ORIGIN = "https://verax.invalid";
const CONTROL_CHAR_RE = /[\u0000-\u001F\u007F]/;

/** Mengembalikan URL http/https yang valid atau null jika tidak aman/tidak valid. */
export function safeExternalHttpUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || CONTROL_CHAR_RE.test(trimmed)) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (!parsed.hostname) return null;
    return trimmed;
  } catch {
    return null;
  }
}

/** Mengembalikan sumber media aman: path lokal (/uploads/...) atau URL http/https. */
export function safeMediaSrcUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || CONTROL_CHAR_RE.test(trimmed)) return null;
  if (trimmed.startsWith("/")) {
    if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return null;
    try {
      const parsed = new URL(trimmed, SAFE_RELATIVE_ORIGIN);
      if (parsed.origin !== SAFE_RELATIVE_ORIGIN) return null;
      return trimmed;
    } catch {
      return null;
    }
  }
  return safeExternalHttpUrl(trimmed);
}

export function httpUrlSchema(
  message = "URL harus berupa tautan http:// atau https:// yang valid.",
  maxLength = 1_000,
) {
  return z
    .string()
    .trim()
    .max(maxLength, { message: `URL maksimal ${maxLength} karakter.` })
    .refine((value) => safeExternalHttpUrl(value) !== null, { message });
}

export function mediaUrlSchema(
  message = "URL media harus berupa URL http(s) atau path lokal yang diawali /.",
  maxLength = 1_000,
) {
  return z
    .string()
    .trim()
    .min(1, { message: "URL media wajib diisi." })
    .max(maxLength, { message: `URL maksimal ${maxLength} karakter.` })
    .refine((value) => safeMediaSrcUrl(value) !== null, { message });
}

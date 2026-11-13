// Rate limiter in-memory (fixed window). Catatan: cocok untuk single-instance;
// saat scale-out ganti ke penyimpanan terdistribusi (lihat worklog §11).

import {
  NEWS_DAILY_SUBMISSION_LIMIT,
  NEWS_DAILY_RATE_LIMIT_WINDOW_MS,
} from "@/lib/domain/constants";

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }
  existing.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  if (existing.count > limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }
  return { allowed: true, remaining: Math.max(0, limit - existing.count), retryAfterSeconds };
}

/** Bersihkan bucket kedaluwarsa berkala agar memori tidak bocor. */
export function sweepRateLimits(): void {
  const now = Date.now();
  for (const [key, window] of buckets) {
    if (window.resetAt <= now) buckets.delete(key);
  }
}

/** Bersihkan seluruh bucket rate limiter (terutama untuk isolasi pengujian otomatis). */
export function resetRateLimits(): void {
  buckets.clear();
}

/**
 * Pengecekan laju harian terpisah khusus format NEWS per API client.
 * Membatasi volume pengiriman artikel berita demi integritas dan verifikasi ketat.
 */
export function checkNewsDailyRateLimit(clientId: string, limit = NEWS_DAILY_SUBMISSION_LIMIT): RateLimitResult {
  return rateLimit(`news-daily:${clientId}`, limit, NEWS_DAILY_RATE_LIMIT_WINDOW_MS);
}

/**
 * Ekstrak IP klien dengan mengutamakan header yang ditetapkan platform deployment (Vercel).
 * Di Vercel edge, `x-vercel-forwarded-for` dan `x-real-ip` diisi/ditimpa oleh proxy terpercaya.
 * `x-forwarded-for` hanya dipakai sebagai fallback pada lingkungan dev/reverse-proxy lokal karena
 * nilainya dapat dipalsukan oleh klien jika aplikasi diekspos langsung tanpa proxy pembersih header.
 */
export function getClientIp(request: Request): string {
  const vercelIp = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercelIp) return vercelIp;

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwardedIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwardedIp) return forwardedIp;

  return "unknown";
}

// Konfigurasi domain kanonik, daftar alias produksi non-kanonik,
// serta kontrol HTTP X-Robots-Tag untuk seluruh rute Verax Press.

export const CANONICAL_PUBLIC_ORIGIN = "https://veraxpress.vercel.app";
export const CANONICAL_PUBLIC_HOSTNAME = "veraxpress.vercel.app";

/** Alias produksi yang wajib di-redirect 308 ke origin kanonik `https://veraxpress.vercel.app`. */
export const NON_CANONICAL_PRODUCTION_HOSTS = new Set<string>([
  "verax-press.vercel.app",
  "veraxp.vercel.app",
  "vrxp.vercel.app",
  "vpid.vercel.app",
  "vrxid.vercel.app",
  "vp-press.vercel.app",
  "vrx-press.vercel.app",
  "vpnews.vercel.app",
  "vrxnews.vercel.app",
  "veraxpress-arya-rizkys-projects.vercel.app",
  "verax-press-arya-rizkys-projects.vercel.app",
  "veraxpress-git-main-arya-rizkys-projects.vercel.app",
  "verax-press-git-main-arya-rizkys-projects.vercel.app",
]);

/** Menormalkan header Host / X-Forwarded-Host menjadi nama host huruf kecil tanpa port. */
export function normalizeHostname(rawHost: string | null | undefined): string | null {
  if (!rawHost) return null;
  const first = rawHost.split(",")[0]?.trim().toLowerCase();
  if (!first) return null;

  if (first.startsWith("[")) {
    const closingIdx = first.indexOf("]");
    return closingIdx > 0 ? first.slice(0, closingIdx + 1) : first;
  }

  const colonIdx = first.indexOf(":");
  const withoutPort = colonIdx >= 0 ? first.slice(0, colonIdx) : first;
  return withoutPort.replace(/\.+$/, "") || null;
}

export function isLocalDevelopmentHost(hostname: string | null): boolean {
  if (!hostname) return true;
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname === "[::1]"
  ) {
    return true;
  }
  return hostname.endsWith(".local") || hostname.endsWith(".localhost");
}

function isPreviewOrAliasHostname(hostname: string): boolean {
  return (
    NON_CANONICAL_PRODUCTION_HOSTS.has(hostname) ||
    hostname.endsWith("-arya-rizkys-projects.vercel.app")
  );
}

/**
 * Mengembalikan URL origin kanonik publik (`https://veraxpress.vercel.app`) untuk metadata,
 * tag canonical, JSON-LD, sitemap.xml, dan robots.txt.
 * Menolak URL localhost atau host alias/preview walaupun disetel di env build.
 */
export function getCanonicalBaseUrl(): string {
  if (typeof process === "undefined") {
    return CANONICAL_PUBLIC_ORIGIN;
  }

  const candidates = [
    process.env.VERAX_CANONICAL_URL,
    process.env.VERAX_PUBLIC_BASE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    try {
      const parsed = new URL(raw.trim());
      const host = normalizeHostname(parsed.hostname);
      if (
        parsed.protocol === "https:" &&
        host &&
        !isLocalDevelopmentHost(host) &&
        !isPreviewOrAliasHostname(host)
      ) {
        return `${parsed.protocol}//${parsed.host}`.replace(/\/+$/, "");
      }
    } catch {
      // Abaikan nilai env yang tidak valid
    }
  }

  return CANONICAL_PUBLIC_ORIGIN;
}

export function canonicalUrl(pathname: string, search = ""): string {
  const cleanPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const cleanSearch = search ? (search.startsWith("?") ? search : `?${search}`) : "";
  return `${getCanonicalBaseUrl()}${cleanPath}${cleanSearch}`;
}

/**
 * Menentukan target pengalihan permanen (308) jika permintaan masuk melalui salah satu
 * domain alias produksi. Menggunakan origin konstan agar aman dari injeksi Host / open redirect.
 */
export function resolveCanonicalRedirectTarget(input: {
  forwardedHostHeader: string | null | undefined;
  hostHeader: string | null | undefined;
  pathname: string;
  search?: string;
}): string | null {
  const host =
    normalizeHostname(input.forwardedHostHeader) ?? normalizeHostname(input.hostHeader);

  if (!host || isLocalDevelopmentHost(host) || host === CANONICAL_PUBLIC_HOSTNAME) {
    return null;
  }

  if (!NON_CANONICAL_PRODUCTION_HOSTS.has(host)) {
    return null;
  }

  const rawPath = input.pathname.startsWith("/") ? input.pathname : `/${input.pathname}`;
  const collapsedPath = rawPath.replace(/^\/+/, "/");
  const target = new URL(CANONICAL_PUBLIC_ORIGIN);
  target.pathname = collapsedPath;
  if (input.search) {
    target.search = input.search.startsWith("?") ? input.search : `?${input.search}`;
  }

  return target.origin === CANONICAL_PUBLIC_ORIGIN ? target.toString() : null;
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

const NOINDEX_NOFOLLOW_PREFIXES = [
  "/studio",
  "/cms",
  "/kontributor/portal",
  "/kontributor/login",
  "/kontributor/aktivasi",
  "/api",
  "/openapi.json",
  "/llms.txt",
  "/llms-full.txt",
  "/.well-known",
] as const;

/** Menentukan nilai header X-Robots-Tag untuk rute non-indeks / privat / mesin. */
export function resolveXRobotsTag(pathname: string): string | null {
  if (NOINDEX_NOFOLLOW_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) {
    return "noindex, nofollow";
  }
  if (matchesPrefix(pathname, "/kontributor/daftar")) {
    return "noindex, follow";
  }
  return null;
}

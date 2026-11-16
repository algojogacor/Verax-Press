// Klien Instagram Graph API untuk penerbitan karosel otomatis Verax Press.
// Menggunakan Graph API v21.0 untuk pemeriksaan batas kuota, pembuatan kontainer, dan publikasi.

export const IG_GRAPH_URL = "https://graph.facebook.com/v21.0";

const INVISIBLE_ENV_CHARS_RE = /[\uFEFF\u200B-\u200D\u2060]/g;

function sanitizeEnvValue(raw: string | undefined): string {
  let val = (raw ?? "").replace(INVISIBLE_ENV_CHARS_RE, "").trim();
  while (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1).trim();
  }
  return val;
}

export class InstagramError extends Error {
  readonly fbCode?: number;
  readonly fbSubcode?: number;
  readonly fbType?: string;
  readonly statusCode?: number;

  constructor(
    message: string,
    opts?: { fbCode?: number; fbSubcode?: number; fbType?: string; statusCode?: number }
  ) {
    super(message);
    this.name = "InstagramError";
    this.fbCode = opts?.fbCode;
    this.fbSubcode = opts?.fbSubcode;
    this.fbType = opts?.fbType;
    this.statusCode = opts?.statusCode;
  }

  get isMediaFetchFailure(): boolean {
    return (
      this.fbCode === 9004 ||
      Boolean(this.message?.includes("media could not be fetched")) ||
      Boolean(this.message?.includes("Only photo or video"))
    );
  }

  get isTransient(): boolean {
    if (this.isMediaFetchFailure) return true;
    if (this.statusCode && (this.statusCode >= 500 || this.statusCode === 429)) return true;
    if (
      this.fbCode === 1 ||
      this.fbCode === 2 ||
      this.fbCode === 4 ||
      this.fbCode === 17 ||
      this.fbCode === 341 ||
      this.fbCode === 9007
    ) {
      return true;
    }
    if (this.fbSubcode === 2207001 || this.fbSubcode === 2207003) {
      return true;
    }
    return false;
  }
}

export function isInstagramConfigured(): boolean {
  return Boolean(
    sanitizeEnvValue(process.env.IG_ACCESS_TOKEN) &&
      sanitizeEnvValue(process.env.IG_USER_ID)
  );
}

export function getInstagramConfig(): { accessToken: string; userId: string } {
  const accessToken = sanitizeEnvValue(process.env.IG_ACCESS_TOKEN);
  const userId = sanitizeEnvValue(process.env.IG_USER_ID);

  if (!accessToken || !userId) {
    throw new InstagramError(
      "Kredensial Instagram Graph API belum dikonfigurasi (IG_ACCESS_TOKEN dan IG_USER_ID wajib disetel)."
    );
  }

  return { accessToken, userId };
}

interface GraphErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
}

async function graphFetch<T>(
  path: string,
  init: RequestInit & { query?: Record<string, string> } = {}
): Promise<T> {
  const cleanPath = path.replace(/^\/+/, "");
  const url = new URL(`${IG_GRAPH_URL}/${cleanPath}`);
  for (const [key, value] of Object.entries(init.query ?? {})) {
    url.searchParams.set(key, value);
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      ...init,
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    throw new InstagramError(
      `Gagal menghubungi Instagram Graph API: ${
        err instanceof Error ? err.message : "network error"
      }`
    );
  }

  const body = (await res.json().catch(() => ({}))) as
    | (T & GraphErrorBody)
    | GraphErrorBody;

  if (!res.ok || body.error) {
    const e = body.error;
    throw new InstagramError(
      e?.message ?? `Instagram Graph API merespons status ${res.status}`,
      {
        fbCode: e?.code,
        fbSubcode: e?.error_subcode,
        fbType: e?.type,
        statusCode: res.status,
      }
    );
  }

  return body as T;
}

export interface InstagramQuota {
  total: number;
  remaining: number;
  used: number;
}

interface ContentPublishingLimitResponse {
  data?: Array<{
    config?: {
      quota_total?: number;
      quota_duration?: number;
    };
    quota_usage?: number;
  }>;
}

/**
 * Cek kuota batas publikasi Instagram (content_publishing_limit) dalam 24 jam terakhir.
 */
export async function checkPublishingLimit(): Promise<InstagramQuota> {
  const { userId, accessToken } = getInstagramConfig();
  const res = await graphFetch<ContentPublishingLimitResponse>(
    `${userId}/content_publishing_limit`,
    {
      query: {
        fields: "config,quota_usage",
        access_token: accessToken,
      },
    }
  );

  const entry = res.data?.[0];
  const total = entry?.config?.quota_total ?? 25;
  const used = entry?.quota_usage ?? 0;
  const remaining = Math.max(0, total - used);
  return { total, remaining, used };
}

/**
 * Buat item container anak untuk slide gambar karosel Instagram.
 * Mengembalikan ID container (creation_id).
 */
export async function createCarouselItemContainer(imageUrl: string): Promise<string> {
  const { userId, accessToken } = getInstagramConfig();
  const body = new URLSearchParams({
    image_url: imageUrl,
    is_carousel_item: "true",
    access_token: accessToken,
  });

  const data = await graphFetch<{ id: string }>(`${userId}/media`, {
    method: "POST",
    body: body.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return data.id;
}

/**
 * Buat container induk untuk postingan karosel Instagram dari daftar ID slide anak.
 */
export async function createCarouselParentContainer(
  childContainerIds: string[],
  caption: string
): Promise<string> {
  if (childContainerIds.length < 2 || childContainerIds.length > 10) {
    throw new InstagramError(
      `Jumlah slide karosel harus antara 2 hingga 10 item (diterima: ${childContainerIds.length}).`
    );
  }

  const { userId, accessToken } = getInstagramConfig();
  const body = new URLSearchParams({
    media_type: "CAROUSEL",
    children: childContainerIds.join(","),
    caption,
    access_token: accessToken,
  });

  const data = await graphFetch<{ id: string }>(`${userId}/media`, {
    method: "POST",
    body: body.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return data.id;
}

export interface ContainerStatusResponse {
  id: string;
  status_code?: "EXPIRED" | "ERROR" | "FINISHED" | "IN_PROGRESS" | "PUBLISHED";
  status?: string;
}

/**
 * Cek status pemrosesan container media di server Meta.
 */
export async function getContainerStatus(containerId: string): Promise<ContainerStatusResponse> {
  const { accessToken } = getInstagramConfig();
  return graphFetch<ContainerStatusResponse>(containerId, {
    query: {
      fields: "status_code,status",
      access_token: accessToken,
    },
  });
}

/**
 * Menunggu media container Instagram selesai diproses (status_code: FINISHED atau PUBLISHED).
 * Meta memproses media secara asinkron sebelum dapat dipublikasikan.
 */
export async function waitForContainer(
  containerId: string,
  maxAttempts = 15,
  delayMs = 1200
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await getContainerStatus(containerId);
    if (res.status_code === "FINISHED" || res.status_code === "PUBLISHED") {
      return;
    }

    if (res.status_code === "ERROR") {
      throw new InstagramError(
        `Media container Instagram gagal diproses (${res.status ?? "ERROR"}).`,
        { fbCode: 9007 }
      );
    }

    if (res.status_code === "EXPIRED") {
      throw new InstagramError("Media container Instagram sudah kedaluwarsa.", {
        fbCode: 9007,
      });
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.warn(
    `[instagram] Container ${containerId} belum berstatus FINISHED setelah ${maxAttempts} pemeriksaan.`
  );
}

/**
 * Publikasikan container karosel yang sudah selesai diproses.
 * Mengembalikan ID media Instagram yang telah terbit.
 */
export async function publishCarousel(creationId: string): Promise<string> {
  const { userId, accessToken } = getInstagramConfig();
  const body = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken,
  });

  const data = await graphFetch<{ id: string }>(`${userId}/media_publish`, {
    method: "POST",
    body: body.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return data.id;
}

/**
 * Ambil tautan publik (permalink) postingan Instagram setelah terbit.
 */
export async function getMediaPermalink(mediaId: string): Promise<string | undefined> {
  try {
    const { accessToken } = getInstagramConfig();
    const data = await graphFetch<{ permalink?: string }>(mediaId, {
      query: { fields: "permalink", access_token: accessToken },
    });
    return data.permalink;
  } catch {
    return undefined;
  }
}

// Kompatibilitas alias fungsi
export const checkLimit = checkPublishingLimit;
export const createCarouselItem = createCarouselItemContainer;
export const createCarouselContainer = createCarouselParentContainer;
export const publishMedia = publishCarousel;
export const getPermalink = getMediaPermalink;

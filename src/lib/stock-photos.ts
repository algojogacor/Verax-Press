// Integrasi penyedia foto stok berlisensi (Unsplash & Pexels).
// Berjalan di sisi server untuk mengamankan kredensial API dan menjamin kepatuhan atribusi.
// Sesuai Piagam Redaksi: gambar stok selalu ditandai sebagai foto suasana generik (isGeneric: true).

export interface StockPhotoResult {
  url: string;
  creator: string;
  license: string;
  caption: string;
  sourceUrl: string;
  isGeneric: true;
  provider: "unsplash" | "pexels" | "mock";
}

export interface SearchStockPhotoOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 4_000;

/**
 * Mencari satu foto stok yang relevan berdasarkan kata kunci query.
 * Memeriksa ketersediaan kredensial Unsplash, kemudian Pexels, atau mock di lingkungan pengujian.
 * Mengembalikan null jika hasil pencarian nihil atau layanan tidak merespons (graceful fallback).
 */
export async function searchStockPhoto(
  query: string,
  options?: SearchStockPhotoOptions,
): Promise<StockPhotoResult | null> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery || trimmedQuery.length < 2) {
    return null;
  }

  // Jalur khusus mock untuk pengujian otomatis deterministik
  if (process.env.VERAX_MOCK_STOCK_PHOTOS === "true") {
    return handleMockStockSearch(trimmedQuery);
  }

  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY?.trim();
  const pexelsKey = process.env.PEXELS_API_KEY?.trim();

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  if (unsplashKey) {
    try {
      const result = await searchUnsplash(trimmedQuery, unsplashKey, timeoutMs, options?.signal);
      if (result) return result;
    } catch (err) {
      console.warn("[StockPhoto] Gagal mengambil foto dari Unsplash:", err instanceof Error ? err.message : String(err));
    }
  }

  if (pexelsKey) {
    try {
      const result = await searchPexels(trimmedQuery, pexelsKey, timeoutMs, options?.signal);
      if (result) return result;
    } catch (err) {
      console.warn("[StockPhoto] Gagal mengambil foto dari Pexels:", err instanceof Error ? err.message : String(err));
    }
  }

  // Jika tidak ada penyedia yang dikonfigurasi atau semua pencarian nihil
  return null;
}

async function searchUnsplash(
  query: string,
  accessKey: string,
  timeoutMs: number,
  userSignal?: AbortSignal,
): Promise<StockPhotoResult | null> {
  const endpoint = new URL("https://api.unsplash.com/search/photos");
  endpoint.searchParams.set("query", query);
  endpoint.searchParams.set("per_page", "1");
  endpoint.searchParams.set("orientation", "landscape");

  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const combinedSignal = userSignal ? AbortSignal.any([timeoutSignal, userSignal]) : timeoutSignal;

  const res = await fetch(endpoint.toString(), {
    method: "GET",
    headers: {
      "Authorization": `Client-ID ${accessKey}`,
      "Accept-Version": "v1",
      "User-Agent": "VeraxPress/1.0 (Editorial Content Ingestion)",
    },
    signal: combinedSignal,
  });

  if (!res.ok) {
    console.warn(`[StockPhoto.Unsplash] Status respons tidak diharapkan: ${res.status}`);
    return null;
  }

  const data = (await res.json()) as {
    results?: Array<{
      urls?: { regular?: string; small?: string };
      links?: { html?: string; download_location?: string };
      user?: { name?: string; username?: string; links?: { html?: string } };
      description?: string;
      alt_description?: string;
    }>;
  };

  const item = data.results?.[0];
  if (!item || !item.urls?.regular) {
    return null;
  }

  const photographer = item.user?.name || item.user?.username || "Fotografer Unsplash";
  const profileUrl = item.user?.links?.html
    ? `${item.user.links.html}?utm_source=verax_press&utm_medium=referral`
    : "https://unsplash.com/?utm_source=verax_press&utm_medium=referral";
  const sourceUrl = item.links?.html
    ? `${item.links.html}?utm_source=verax_press&utm_medium=referral`
    : profileUrl;

  const captionText =
    item.description?.trim() ||
    item.alt_description?.trim() ||
    `Foto suasana ilustratif terkait topik ${query}`;

  // Memicu download location Unsplash di latar belakang (persyaratan kepatuhan API Unsplash)
  if (item.links?.download_location) {
    fetch(item.links.download_location, {
      headers: { "Authorization": `Client-ID ${accessKey}` },
    }).catch(() => {
      // Abaikan kegagalan penandaan statistik unduhan
    });
  }

  return {
    url: item.urls.regular,
    creator: `Foto oleh ${photographer} di Unsplash`,
    license: "Unsplash License",
    caption: captionText,
    sourceUrl,
    isGeneric: true,
    provider: "unsplash",
  };
}

async function searchPexels(
  query: string,
  apiKey: string,
  timeoutMs: number,
  userSignal?: AbortSignal,
): Promise<StockPhotoResult | null> {
  const endpoint = new URL("https://api.pexels.com/v1/search");
  endpoint.searchParams.set("query", query);
  endpoint.searchParams.set("per_page", "1");
  endpoint.searchParams.set("orientation", "landscape");

  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const combinedSignal = userSignal ? AbortSignal.any([timeoutSignal, userSignal]) : timeoutSignal;

  const res = await fetch(endpoint.toString(), {
    method: "GET",
    headers: {
      "Authorization": apiKey,
      "User-Agent": "VeraxPress/1.0 (Editorial Content Ingestion)",
    },
    signal: combinedSignal,
  });

  if (!res.ok) {
    console.warn(`[StockPhoto.Pexels] Status respons tidak diharapkan: ${res.status}`);
    return null;
  }

  const data = (await res.json()) as {
    photos?: Array<{
      url?: string;
      photographer?: string;
      photographer_url?: string;
      src?: { large?: string; medium?: string };
      alt?: string;
    }>;
  };

  const photo = data.photos?.[0];
  const photoUrl = photo?.src?.large || photo?.src?.medium;
  if (!photo || !photoUrl) {
    return null;
  }

  const photographer = photo.photographer?.trim() || "Fotografer Pexels";
  const sourceUrl = photo.url || photo.photographer_url || "https://www.pexels.com";
  const captionText = photo.alt?.trim() || `Foto suasana ilustratif terkait topik ${query}`;

  return {
    url: photoUrl,
    creator: `Foto oleh ${photographer} di Pexels`,
    license: "Pexels License",
    caption: captionText,
    sourceUrl,
    isGeneric: true,
    provider: "pexels",
  };
}

function handleMockStockSearch(query: string): StockPhotoResult | null {
  const normalized = query.toLowerCase().trim();
  if (
    normalized.includes("kosong") ||
    normalized.includes("notfound") ||
    normalized.includes("nihil") ||
    normalized.includes("empty")
  ) {
    return null;
  }

  return {
    url: `https://images.unsplash.com/mock-photo-${encodeURIComponent(normalized)}`,
    creator: "Foto oleh Fotografer Percontohan di Unsplash",
    license: "Unsplash License",
    caption: `Foto suasana ilustratif terkait ${query}`,
    sourceUrl: "https://unsplash.com/photos/mock-test-item",
    isGeneric: true,
    provider: "mock",
  };
}

// Domain logic untuk modul Verax Editorial Intelligence (VEI) cakupan coverage.
// Menghitung overlap topik dan entitas secara deterministik terhadap artikel terbit.
// Mematuhi standar predikat artikel terbit: strictly PUBLISHED | CORRECTED dan publishedAt != null.
// Tanpa bidang rekomendasi, klasifikasi, atau suggestedAction.

import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { canonicalUrl } from "@/lib/seo/constants";

export type OverlapLevel = "none" | "partial" | "high";

export interface CoverageMatch {
  articleId: string;
  title: string;
  desk: string;
  overlapLevel: OverlapLevel;
  matchedTopics: string[];
  matchedEntities: string[];
  topics: string[];
  entities: string[];
  centralQuestion: string | null;
  editorialAngle: string | null;
  metadataStatus: string;
  publishedAt: string | null;
  canonicalUrl: string;
}

export interface CoverageCheckInput {
  proposedTitle?: string | null;
  topic?: string | string[] | null;
  topics?: string | string[] | null;
  centralQuestion?: string | null;
  proposedAngle?: string | null;
  entities?: string | string[] | unknown[] | null;
}

export interface CoverageCheckResult {
  overlapLevel: OverlapLevel;
  matches: CoverageMatch[];
}

/**
 * Status artikel yang sah dianggap sebagai artikel terpublikasi.
 * Dilarang memasukkan DRAFT, PENDING_REVIEW, FACT_CHECK, REVISION_NEEDED,
 * PENDING_APPROVAL, REJECTED, WITHDRAWN, RETRACTED, maupun ARCHIVED.
 */
export const PUBLISHED_ARTICLE_STATUSES: string[] = ["PUBLISHED", "CORRECTED"];

export const PUBLISHED_ARTICLE_FILTER: Prisma.ArticleWhereInput = {
  status: { in: ["PUBLISHED", "CORRECTED"] },
  publishedAt: { not: null },
};

/**
 * Memeriksa apakah naskah memenuhi predikat artikel terpublikasi.
 */
export function isPublishedArticle(article: {
  status?: string | null;
  publishedAt?: Date | string | null;
}): boolean {
  if (!article.status || !article.publishedAt) return false;
  return (
    (article.status === "PUBLISHED" || article.status === "CORRECTED") &&
    article.publishedAt !== null
  );
}

/**
 * Menyelesaikan URL kanonik publik artikel berdasarkan slug.
 */
export function resolveArticleCanonicalUrl(slug: string): string {
  const cleanSlug = encodeURIComponent(slug.trim().replace(/^\/+|\/+$/g, ""));
  return canonicalUrl(`/artikel/${cleanSlug}`);
}

/**
 * Parsing aman untuk array JSON dari topik atau entitas.
 * Menangani string JSON, format array langsung, maupun string terpisah koma.
 */
export function safeParseJsonArray(input: unknown): string[] {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (typeof item === "number" || typeof item === "boolean") return String(item);
        if (item && typeof item === "object") {
          const val =
            (item as Record<string, unknown>).name ??
            (item as Record<string, unknown>).value ??
            (item as Record<string, unknown>).title;
          return typeof val === "string" ? val.trim() : "";
        }
        return "";
      })
      .filter((item) => item.length > 0);
  }

  if (typeof input !== "string") {
    return [];
  }

  const trimmed = input.trim();
  if (!trimmed || trimmed === "[]" || trimmed === "null" || trimmed === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (typeof item === "string") return item.trim();
          if (typeof item === "number" || typeof item === "boolean") return String(item);
          if (item && typeof item === "object") {
            const val =
              (item as Record<string, unknown>).name ??
              (item as Record<string, unknown>).value ??
              (item as Record<string, unknown>).title;
            return typeof val === "string" ? val.trim() : "";
          }
          return "";
        })
        .filter((item) => item.length > 0);
    }
  } catch {
    // Jika bukan JSON array melainkan daftar terpisah koma
    if (trimmed.includes(",")) {
      return trimmed
        .split(",")
        .map((s) => s.trim())
        .filter((item) => item.length > 0);
    }
    return [trimmed];
  }

  return [];
}

/**
 * Daftar kata henti (stopwords) umum bahasa Indonesia dan bahasa Inggris.
 */
export const COMMON_STOPWORDS = new Set<string>([
  // Bahasa Indonesia
  "ada", "adalah", "adanya", "adapun", "agak", "agar", "akan", "akankah", "akhir",
  "akhiri", "akhirnya", "aku", "akulah", "amat", "amatlah", "anda", "andalah",
  "antar", "antara", "antaranya", "apa", "apaan", "apabila", "apakah", "apalagi",
  "arti", "artinya", "asal", "asalkan", "atas", "atau", "ataukah", "ataupun",
  "awal", "awalnya", "baca", "bagai", "bagaikan", "bagaimana", "bagaimanakah",
  "bagaimanapun", "bagi", "bahkan", "bahwa", "bahwasanya", "banyak", "bapak",
  "baru", "bawah", "beberapa", "begini", "begitu", "belum", "bisa", "boleh",
  "bukan", "dan", "dari", "daripada", "demi", "demikian", "dengan", "depan",
  "di", "dia", "diri", "dirinya", "guna", "hanya", "hari", "harus", "ia",
  "ialah", "ibu", "ikut", "ini", "inikah", "inilah", "itu", "itukah", "itulah",
  "jadi", "jangan", "jika", "jikalau", "juga", "kala", "kalau", "kami", "kamu",
  "karena", "ke", "kecil", "kemudian", "kepada", "kita", "lagi", "lalu", "lama",
  "lebih", "luar", "maka", "mana", "manakala", "masih", "mata", "mau", "melalui",
  "memang", "mengapa", "mereka", "mungkin", "nah", "namun", "nanti", "oleh",
  "pada", "padahal", "paling", "para", "pasti", "pula", "pun", "saat", "saja",
  "salah", "sama", "sampai", "sana", "sangat", "satu", "saya", "sebab", "sebagai",
  "sebelum", "sebuah", "secara", "sedang", "sedangkan", "sehingga", "sejak",
  "sekali", "sekarang", "sekitar", "selain", "selalu", "selama", "seluruh",
  "sementara", "semua", "seperti", "sering", "serta", "sesuatu", "sesudah",
  "setelah", "setiap", "siapa", "sini", "sudah", "supaya", "tahu", "tahun",
  "tak", "tanpa", "tapi", "telah", "tentang", "tentu", "terhadap", "terjadi",
  "tersebut", "terus", "tidak", "tiap", "untuk", "utama", "waktu", "walau",
  "walaupun", "ya", "yaitu", "yakni", "yang",
  // Bahasa Inggris
  "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "of", "with",
  "is", "are", "was", "were", "by", "as", "from", "that", "this", "it", "its",
  "be", "has", "have", "had", "not", "but", "so", "into", "about",
]);

/**
 * Normalisasi teks: huruf kecil, hilangkan tanda baca, gabungkan spasi ganda.
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Ekstraksi token teks ternormalisasi tanpa kata henti.
 */
export function extractNormalizedTokens(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];
  return normalized
    .split(" ")
    .map((word) => word.trim())
    .filter((word) => word.length > 1 && !COMMON_STOPWORDS.has(word));
}

/**
 * Membandingkan kecocokan dua istilah (topik atau entitas) berdasarkan kesamaan persis,
 * inklusi frasa, atau tumpang tindih token yang dominan.
 */
export function termsMatch(termA: string, termB: string): boolean {
  const normA = normalizeText(termA);
  const normB = normalizeText(termB);
  if (!normA || !normB) return false;

  // Kecocokan persis setelah normalisasi
  if (normA === normB) return true;

  // Inklusi frasa (panjang minimal 4 karakter)
  if (normA.length >= 4 && normB.length >= 4) {
    if (normA.includes(normB) || normB.includes(normA)) {
      return true;
    }
  }

  // Tumpang tindih token substantif
  const tokensA = extractNormalizedTokens(termA);
  const tokensB = extractNormalizedTokens(termB);
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  const setB = new Set(tokensB);
  const intersection = tokensA.filter((token) => setB.has(token));
  if (intersection.length === 0) return false;

  const minTokens = Math.min(tokensA.length, tokensB.length);
  if (minTokens <= 2) {
    return intersection.length === minTokens;
  }
  return intersection.length / minTokens >= 0.6;
}

/**
 * Mencocokkan daftar istilah usulan dengan daftar istilah artikel terbit.
 * Mengembalikan daftar istilah unik yang cocok.
 */
export function matchTermList(proposed: string[], candidate: string[]): string[] {
  const matched: string[] = [];
  for (const prop of proposed) {
    for (const cand of candidate) {
      if (termsMatch(prop, cand)) {
        matched.push(cand);
        break;
      }
    }
  }
  return Array.from(new Set(matched));
}

/**
 * Menghitung rasio kesamaan token judul.
 */
export function calculateTitleOverlapRatio(titleA: string, titleB: string): number {
  const tokensA = extractNormalizedTokens(titleA);
  const tokensB = extractNormalizedTokens(titleB);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const setB = new Set(tokensB);
  const intersection = tokensA.filter((token) => setB.has(token));
  if (intersection.length === 0) return 0;

  const minTokens = Math.min(tokensA.length, tokensB.length);
  return intersection.length / minTokens;
}

/**
 * Menentukan tingkat overlap PER ARTIKEL (none, partial, high) secara deterministik.
 */
export function evaluateArticleOverlap(params: {
  matchedTopics: string[];
  matchedEntities: string[];
  proposedTopicsCount: number;
  proposedEntitiesCount: number;
  titleOverlapRatio: number;
}): OverlapLevel {
  const {
    matchedTopics,
    matchedEntities,
    proposedTopicsCount,
    proposedEntitiesCount,
    titleOverlapRatio,
  } = params;

  const topicCount = matchedTopics.length;
  const entityCount = matchedEntities.length;
  const totalMatches = topicCount + entityCount;

  if (totalMatches === 0 && titleOverlapRatio < 0.6) {
    return "none";
  }

  const totalProposed = proposedTopicsCount + proposedEntitiesCount;

  // Syarat HIGH overlap untuk satu artikel:
  // 1. Minimal 2 entitas cocok
  // 2. Kombinasi minimal 1 topik dan minimal 1 entitas cocok
  // 3. Minimal 2 topik cocok
  // 4. Seluruh topik dan entitas yang diajukan cocok (jika usulan memiliki minimal 1 item)
  // 5. Kemiripan judul sangat kuat (>= 0.6) dengan minimal 1 topik atau entitas cocok
  // 6. Kemiripan judul hampir identik (>= 0.8)
  if (
    entityCount >= 2 ||
    (topicCount >= 1 && entityCount >= 1) ||
    topicCount >= 2 ||
    (totalProposed > 1 && totalMatches >= totalProposed) ||
    (titleOverlapRatio >= 0.6 && totalMatches >= 1) ||
    titleOverlapRatio >= 0.8
  ) {
    return "high";
  }

  // Syarat PARTIAL overlap: terdapat minimal satu kecocokan topik/entitas atau judul
  if (totalMatches >= 1 || titleOverlapRatio >= 0.35) {
    return "partial";
  }

  return "none";
}

/**
 * Mengambil tingkat overlap tertinggi dari daftar artikel yang cocok.
 * Mengikuti aturan: nilai maksimum dari satu artikel paling cocok
 * (bukan penjumlahan kecocokan lemah dari beberapa artikel).
 */
export function getMaxOverlapLevel(matches: Array<{ overlapLevel: OverlapLevel }>): OverlapLevel {
  let hasPartial = false;
  for (const m of matches) {
    if (m.overlapLevel === "high") {
      return "high";
    }
    if (m.overlapLevel === "partial") {
      hasPartial = true;
    }
  }
  return hasPartial ? "partial" : "none";
}

/**
 * Menjalankan perhitungan evaluasi cakupan editorial terhadap basis data artikel terbit.
 * Bersifat murni read-only dan tidak melakukan penulisan ke basis data.
 */
export async function calculateEditorialCoverage(
  input: CoverageCheckInput,
  prismaClient: PrismaClient = db as unknown as PrismaClient,
): Promise<CoverageCheckResult> {
  const proposedTopics = safeParseJsonArray(input.topic ?? input.topics);
  const proposedEntities = safeParseJsonArray(input.entities);
  const proposedTitle = input.proposedTitle?.trim() || "";

  const candidateArticles = await prismaClient.article.findMany({
    where: PUBLISHED_ARTICLE_FILTER,
    include: {
      desk: true,
    },
    orderBy: {
      publishedAt: "desc",
    },
  });

  const matches: CoverageMatch[] = [];

  for (const article of candidateArticles) {
    const articleTopics = safeParseJsonArray(article.topics);
    const articleEntities = safeParseJsonArray(article.entities);

    const matchedTopics = matchTermList(proposedTopics, articleTopics);
    const matchedEntities = matchTermList(proposedEntities, articleEntities);

    const titleOverlapRatio = proposedTitle
      ? calculateTitleOverlapRatio(proposedTitle, article.title)
      : 0;

    const overlapLevel = evaluateArticleOverlap({
      matchedTopics,
      matchedEntities,
      proposedTopicsCount: proposedTopics.length,
      proposedEntitiesCount: proposedEntities.length,
      titleOverlapRatio,
    });

    if (overlapLevel !== "none") {
      matches.push({
        articleId: article.id,
        title: article.title,
        desk: article.desk?.name ?? article.deskId,
        overlapLevel,
        matchedTopics,
        matchedEntities,
        topics: articleTopics,
        entities: articleEntities,
        centralQuestion: article.centralQuestion,
        editorialAngle: article.editorialAngle,
        metadataStatus: article.metadataStatus,
        publishedAt: article.publishedAt ? article.publishedAt.toISOString() : null,
        canonicalUrl: resolveArticleCanonicalUrl(article.slug),
      });
    }
  }

  // Urutkan artikel cocok: level high di atas partial, kemudian berdasarkan jumlah kecocokan
  matches.sort((a, b) => {
    if (a.overlapLevel === "high" && b.overlapLevel !== "high") return -1;
    if (a.overlapLevel !== "high" && b.overlapLevel === "high") return 1;
    const countA = a.matchedTopics.length + a.matchedEntities.length;
    const countB = b.matchedTopics.length + b.matchedEntities.length;
    return countB - countA;
  });

  const topLevelOverlap = getMaxOverlapLevel(matches);

  return {
    overlapLevel: topLevelOverlap,
    matches,
  };
}

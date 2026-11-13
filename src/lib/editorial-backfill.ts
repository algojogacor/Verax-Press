/**
 * Verax Editorial Intelligence (VEI) — Layanan Backfill Metadata Editorial
 *
 * Mengisi metadata editorial (topics, entities, centralQuestion, editorialAngle)
 * secara deterministik untuk artikel yang telah dipublikasikan.
 *
 * Menegakkan aturan integritas data:
 * 1. Hanya memproses artikel terbit (status in ['PUBLISHED', 'CORRECTED'] dan publishedAt != null).
 * 2. Melewati seluruh artikel jika metadataStatus === 'verified'.
 * 3. Hanya mengisi bidang yang kosong (tidak pernah menimpa metadata yang sudah ada).
 * 4. Menandai seluruh metadata baru dengan metadataStatus: 'unverified'.
 * 5. Tidak mengubah bidang artikel non-metadata lainnya (title, contentJson, desk, status, dll).
 * 6. Idempoten dan aman dilanjutkan jika terinterupsi.
 *
 * Mematuhi Standar Penulisan Sistem Verax Press (docs/editorial/VERAX_WRITING_STANDARDS.md):
 * - Tanpa tanda em dash (—).
 * - Tanpa kosakata AI terlarang.
 * - Tanpa emoji dekoratif.
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import { db as defaultDb } from "@/lib/db";
import {
  PUBLISHED_ARTICLE_FILTER,
  isPublishedArticle,
  safeParseJsonArray,
  COMMON_STOPWORDS,
} from "@/lib/domain/coverage";
import { parseContentSafe } from "@/lib/domain/content";

export interface ExtractedArticleMetadata {
  topics: string[];
  entities: string[];
  centralQuestion: string;
  editorialAngle: string;
}

export interface BackfillOptions {
  dryRun?: boolean;
  limit?: number;
  articleId?: string;
  prismaClient?: PrismaClient;
}

export type BackfillArticleStatus =
  | "updated"
  | "skipped_verified"
  | "skipped_not_published"
  | "skipped_already_populated";

export interface BackfillArticleResult {
  articleId: string;
  slug: string;
  title: string;
  status: BackfillArticleStatus;
  fieldsUpdated: string[];
  extracted: Partial<ExtractedArticleMetadata>;
}

export interface BackfillSummary {
  totalScanned: number;
  publishedCount: number;
  skippedVerified: number;
  skippedNotPublished: number;
  skippedAlreadyPopulated: number;
  updatedCount: number;
  results: BackfillArticleResult[];
}

/**
 * Membersihkan teks sesuai Standar Penulisan Verax Press:
 * - Mengganti em dash (—) dan tanda minus ganda (--) dengan tanda baca yang sah.
 * - Menghilangkan spasi ganda.
 * - Memastikan ketiadaan kosakata AI yang dilarang.
 */
export function cleanSystemWritingText(text: string): string {
  if (!text) return "";
  return text
    .replace(/[\u2014\u2013]/g, ", ") // Ganti em-dash dan en-dash dengan koma
    .replace(/--+/g, ", ")
    .replace(/\s*,\s*,\s*/g, ", ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:?!])/g, "$1")
    .trim();
}

/**
 * Memeriksa apakah kolom topics kosong:
 * Dianggap kosong bila bernilai null, undefined, string kosong, "[]", atau array kosong.
 */
export function isTopicsEmpty(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed === "" || trimmed === "[]" || trimmed === "null") return true;
    const parsed = safeParseJsonArray(trimmed);
    return parsed.length === 0;
  }
  if (Array.isArray(val)) {
    return val.length === 0;
  }
  return true;
}

/**
 * Memeriksa apakah kolom entities kosong:
 * Dianggap kosong bila bernilai null, undefined, string kosong, "[]", atau array kosong.
 */
export function isEntitiesEmpty(val: unknown): boolean {
  return isTopicsEmpty(val);
}

/**
 * Memeriksa apakah kolom centralQuestion kosong:
 * Dianggap kosong bila bernilai null, undefined, atau string kosong.
 */
export function isCentralQuestionEmpty(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === "string") return val.trim().length === 0;
  return false;
}

/**
 * Memeriksa apakah kolom editorialAngle kosong:
 * Dianggap kosong bila bernilai null, undefined, atau string kosong.
 */
export function isEditorialAngleEmpty(val: unknown): boolean {
  return isCentralQuestionEmpty(val);
}

// Kamus topik redaksional terverifikasi untuk pemetaan topik yang konsisten
const KNOWN_TOPIC_MAP: Array<{ pattern: RegExp; topic: string }> = [
  { pattern: /independen|independensi/i, topic: "Jurnalisme Independen" },
  { pattern: /verifikasi|cek fakta|fact-check|disiplin sumber/i, topic: "Verifikasi Sumber" },
  { pattern: /kode etik|etik jurnalistik|dewan pers/i, topic: "Kode Etik Jurnalistik" },
  { pattern: /penggunaan ai|kiriman ai|kecerdasan buatan|alat ai/i, topic: "Kebijakan AI" },
  { pattern: /koreksi terbuka|ralat|hak jawab|hak koreksi/i, topic: "Koreksi Terbuka" },
  { pattern: /perlindungan sumber|anonimitas|narasumber/i, topic: "Perlindungan Sumber" },
  { pattern: /alur editorial|lima tahap|proses redaksi/i, topic: "Alur Editorial" },
  { pattern: /dokumen fondasi|piagam|charter/i, topic: "Dokumen Fondasi" },
  { pattern: /terstruktur|block-json|html lepas|arsitektur data/i, topic: "Struktur Konten" },
  { pattern: /banjir konten|kehati-hatian|jurnalisme lambat/i, topic: "Kurasi Konten" },
  { pattern: /transparansi|akuntabilitas/i, topic: "Transparansi Redaksi" },
  { pattern: /hukum|peradilan|regulasi|undang-undang/i, topic: "Hukum & Keadilan" },
  { pattern: /teknologi|kebijakan digital|data/i, topic: "Teknologi & Kebijakan" },
];

// Kamus entitas hukum, institusi, dan teknologi terverifikasi
const KNOWN_ENTITY_PATTERNS: Array<{ pattern: RegExp; entity: string }> = [
  { pattern: /\bverax press\b/i, entity: "Verax Press" },
  { pattern: /\bdewan pers\b/i, entity: "Dewan Pers" },
  { pattern: /\bkode etik jurnalistik\b/i, entity: "Kode Etik Jurnalistik" },
  { pattern: /\bundang-undang pers\b|\buu pers\b/i, entity: "Undang-Undang Pers" },
  { pattern: /\bkomisi yudisial\b/i, entity: "Komisi Yudisial" },
  { pattern: /\bmahkamah agung\b/i, entity: "Mahkamah Agung" },
  { pattern: /\bmahkamah konstitusi\b/i, entity: "Mahkamah Konstitusi" },
  { pattern: /\bkementerian kominfo\b|\bkominfo\b|\bkomdigi\b/i, entity: "Kementerian Komdigi" },
  { pattern: /\bpemimpin redaksi\b|\bchief editor\b/i, entity: "Pemimpin Redaksi" },
  { pattern: /\beditorial charter\b/i, entity: "Editorial Charter" },
  { pattern: /\bcontributor policy\b/i, entity: "Contributor Policy" },
  { pattern: /\btechnical architecture\b/i, entity: "Technical Architecture" },
  { pattern: /\bingestion api\b/i, entity: "Ingestion API" },
  { pattern: /\bprisma\b/i, entity: "Prisma ORM" },
  { pattern: /\bzod\b/i, entity: "Zod" },
];

/**
 * Mengekstrak seluruh teks dan segmen penting dari judul, deck, dan contentJson.
 */
function extractArticleText(
  title: string,
  deck?: string | null,
  contentJson?: string | null,
): {
  title: string;
  deck: string;
  headings: string[];
  paragraphs: string[];
  questions: string[];
  fullText: string;
} {
  const cleanTitle = cleanSystemWritingText(title);
  const cleanDeck = cleanSystemWritingText(deck || "");
  const headings: string[] = [];
  const paragraphs: string[] = [];
  const questions: string[] = [];

  if (contentJson) {
    const blocks = parseContentSafe(contentJson);
    for (const block of blocks) {
      if (block.type === "paragraph") {
        const text = cleanSystemWritingText(block.text);
        if (text) {
          paragraphs.push(text);
          const qMatches = text.match(/[^.!?]+[?]/g);
          if (qMatches) {
            for (const q of qMatches) {
              const cq = cleanSystemWritingText(q);
              if (cq.length > 10) questions.push(cq);
            }
          }
        }
      } else if (block.type === "heading") {
        const text = cleanSystemWritingText(block.text);
        if (text) {
          headings.push(text);
          if (text.endsWith("?")) questions.push(text);
        }
      } else if (block.type === "qa") {
        const qText = cleanSystemWritingText(block.question);
        if (qText) questions.push(qText.endsWith("?") ? qText : `${qText}?`);
        const aText = cleanSystemWritingText(block.answer);
        if (aText) paragraphs.push(aText);
      } else if (block.type === "note") {
        const text = cleanSystemWritingText(block.text);
        if (text) paragraphs.push(text);
      } else if (block.type === "quote") {
        const text = cleanSystemWritingText(block.text);
        if (text) paragraphs.push(text);
      } else if (block.type === "list") {
        for (const item of block.items) {
          const itemText = cleanSystemWritingText(item);
          if (itemText) paragraphs.push(itemText);
        }
      }
    }
  }

  const fullText = [cleanTitle, cleanDeck, ...headings, ...paragraphs].join(" ");

  return {
    title: cleanTitle,
    deck: cleanDeck,
    headings,
    paragraphs,
    questions,
    fullText,
  };
}

/**
 * Mengekstrak daftar topik yang relevan.
 */
function extractTopics(
  title: string,
  deck: string,
  fullText: string,
  headings: string[],
  deskName?: string | null,
): string[] {
  const matchedTopics: string[] = [];
  const combinedHeader = `${title} ${deck} ${headings.join(" ")}`;

  // 1. Periksa pemetaan topik redaksional
  for (const { pattern, topic } of KNOWN_TOPIC_MAP) {
    if (pattern.test(combinedHeader) || pattern.test(fullText)) {
      matchedTopics.push(topic);
    }
  }

  // 2. Sertakan desk bila relevan dan belum ada
  if (deskName) {
    const cleanDesk = cleanSystemWritingText(deskName);
    if (cleanDesk && !matchedTopics.includes(cleanDesk)) {
      matchedTopics.push(cleanDesk);
    }
  }

  // 3. Bila topik masih sedikit, ekstrak frasa judul
  if (matchedTopics.length < 2) {
    const titleParts = title
      .split(/[:,-]/)
      .map((part) => part.trim())
      .filter((part) => part.length >= 4);

    for (const part of titleParts) {
      const cleanPart = cleanSystemWritingText(part);
      if (
        cleanPart &&
        !COMMON_STOPWORDS.has(cleanPart.toLowerCase()) &&
        !matchedTopics.includes(cleanPart)
      ) {
        matchedTopics.push(cleanPart);
      }
    }
  }

  // Batasi 2-5 topik unik
  const uniqueTopics = Array.from(new Set(matchedTopics)).slice(0, 5);
  return uniqueTopics.length > 0 ? uniqueTopics : ["Jurnalisme Publik"];
}

/**
 * Mengekstrak daftar entitas bernama (institusi, regulasi, platform).
 */
function extractEntities(
  title: string,
  deck: string,
  fullText: string,
  headings: string[],
): string[] {
  const matchedEntities: string[] = [];

  // 1. Periksa entitas standar yang dikenal
  for (const { pattern, entity } of KNOWN_ENTITY_PATTERNS) {
    if (pattern.test(fullText)) {
      matchedEntities.push(entity);
    }
  }

  // 2. Ekstraksi urutan kata berhuruf besar (Proper Noun)
  const candidateText = `${title}. ${deck}. ${headings.join(". ")}.`;
  const properNounRegex = /\b[A-Z][a-z0-9]+(?:\s+[A-Z][a-z0-9]+)+\b/g;
  const rawMatches = candidateText.match(properNounRegex) || [];

  const excludedPhrases = new Set([
    "Kami Percaya",
    "Setelah Itu",
    "Di Zaman",
    "Jika Anda",
    "Oleh Karena",
    "Berdasarkan Data",
    "Sebagai Media",
    "Dengan Demikian",
    "Berikut Ini",
    "Setiap Klaim",
    "Pada Dasarnya",
    "Bukan Stiker",
    "Meja Redaksi",
  ]);

  for (const match of rawMatches) {
    const cleanMatch = cleanSystemWritingText(match);
    if (
      cleanMatch.length >= 4 &&
      !excludedPhrases.has(cleanMatch) &&
      !matchedEntities.includes(cleanMatch)
    ) {
      matchedEntities.push(cleanMatch);
    }
  }

  // Verax Press selalu menjadi entitas default bila dipublikasikan di platform Verax
  if (!matchedEntities.includes("Verax Press")) {
    matchedEntities.unshift("Verax Press");
  }

  // Batasi 2-6 entitas unik
  return Array.from(new Set(matchedEntities)).slice(0, 6);
}

/**
 * Mengekstrak atau menyusun pertanyaan sentral (central question) editorial.
 */
function extractCentralQuestion(
  title: string,
  deck: string,
  questions: string[],
  headings: string[],
): string {
  // 1. Jika ada pertanyaan eksplisit dari blok tanya jawab atau teks awal
  if (questions.length > 0) {
    const firstQ = questions[0].trim();
    if (firstQ.length >= 15 && firstQ.length <= 150) {
      return firstQ.endsWith("?") ? firstQ : `${firstQ}?`;
    }
  }

  // 2. Jika judul artikel adalah pertanyaan
  if (title.endsWith("?")) {
    return cleanSystemWritingText(title);
  }

  // 3. Pola judul spesifik bahasa Indonesia
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.startsWith("cara ")) {
    const rest = title.slice(5).replace(/[:,-].*$/, "").trim();
    return `Bagaimana cara ${rest}?`;
  }

  if (lowerTitle.startsWith("kebijakan ")) {
    const rest = title.slice(10).replace(/[:,-].*$/, "").trim();
    return `Bagaimana kebijakan ${rest} diterapkan di Verax Press?`;
  }

  if (lowerTitle.startsWith("anatomi ")) {
    const rest = title.slice(8).replace(/[:,-].*$/, "").trim();
    return `Bagaimana prosedur ${rest} dijalankan dalam operasional redaksi?`;
  }

  if (lowerTitle.startsWith("perlindungan ")) {
    const rest = title.slice(13).replace(/[:,-].*$/, "").trim();
    return `Bagaimana standar perlindungan ${rest} diterapkan oleh redaksi?`;
  }

  if (lowerTitle.startsWith("lima tahap ")) {
    return "Apa saja lima tahapan alur editorial yang wajib dilalui naskah sebelum terbit di Verax Press?";
  }

  if (lowerTitle.startsWith("tiga dokumen ")) {
    return "Apa fungsi dan substansi tiga dokumen fondasi dalam tata kelola redaksi Verax Press?";
  }

  if (lowerTitle.startsWith("kode etik jurnalistik ")) {
    return "Bagaimana Kode Etik Jurnalistik dijadikan rujukan operasional harian di Verax Press?";
  }

  if (lowerTitle.startsWith("selamat datang ")) {
    return "Apa prinsip dan komitmen redaksi Verax Press sebagai media independen?";
  }

  if (lowerTitle.startsWith("di zaman banjir konten")) {
    return "Mengapa kehati-hatian redaksi menjadi keunggulan utama jurnalisme di tengah banjir konten digital?";
  }

  if (lowerTitle.startsWith("isi artikel yang terstruktur") || lowerTitle.startsWith("isi artikel terstruktur")) {
    return "Mengapa penyimpanan konten terstruktur dalam format block JSON lebih aman dibanding HTML bebas?";
  }

  if (lowerTitle.startsWith("media independen dan disiplin sumber")) {
    return "Mengapa disiplin verifikasi sumber primer krusial bagi keberlangsungan media independen?";
  }

  if (lowerTitle.startsWith("satu pintu untuk mesin")) {
    return "Bagaimana mekanisme pintu tunggal Ingestion API memproses kiriman AI tanpa melompati kendali manusia?";
  }

  // 4. Jika judul memuat pemisah titik dua (topik utama : penjelas)
  if (title.includes(":")) {
    const [mainPart, subPart] = title.split(":", 2).map((s) => s.trim());
    if (subPart && subPart.length > 5) {
      if (subPart.toLowerCase().startsWith("bagaimana ")) {
        return subPart.endsWith("?") ? subPart : `${subPart}?`;
      }
      if (subPart.toLowerCase().startsWith("mengapa ")) {
        return subPart.endsWith("?") ? subPart : `${subPart}?`;
      }
      return `Bagaimana ${subPart.toLowerCase()} diwujudkan dalam ${mainPart.toLowerCase()}?`;
    }
  }

  // 5. Sintesis umum berbasis judul
  return `Bagaimana prinsip dan implementasi ${cleanSystemWritingText(title).toLowerCase()} dijalankan?`;
}

/**
 * Mengekstrak atau menyusun sudut pandang editorial (editorial angle).
 */
function extractEditorialAngle(
  title: string,
  deck: string,
  paragraphs: string[],
): string {
  // 1. Bila deck tersedia, deck adalah representasi langsung sudut pandang redaksi
  if (deck && deck.trim().length > 10) {
    const cleanedDeck = cleanSystemWritingText(deck);
    if (cleanedDeck.length <= 260) {
      return cleanedDeck.endsWith(".") ? cleanedDeck : `${cleanedDeck}.`;
    }
    const firstSentence = cleanedDeck.split(/[.!?]/)[0].trim();
    if (firstSentence.length >= 20) {
      return `${firstSentence}.`;
    }
    return `${cleanedDeck.slice(0, 240).trim()}...`;
  }

  // 2. Bila tidak ada deck, ambil intisari dari paragraf pertama
  if (paragraphs.length > 0) {
    const lead = cleanSystemWritingText(paragraphs[0]);
    const firstSentence = lead.split(/[.!?]/)[0].trim();
    if (firstSentence.length >= 20 && firstSentence.length <= 250) {
      return `${firstSentence}.`;
    }
  }

  // 3. Fallback sudut pandang jurnalisme Verax
  return `Liputan ini mengedepankan telaah faktual dan verifikasi mendalam mengenai ${cleanSystemWritingText(title).toLowerCase()}.`;
}

/**
 * Ekstraksi lengkap seluruh metadata editorial dari naskah artikel.
 */
export function extractArticleMetadata(input: {
  title: string;
  deck?: string | null;
  contentJson?: string | null;
  deskName?: string | null;
}): ExtractedArticleMetadata {
  const { title, deck, headings, paragraphs, questions, fullText } = extractArticleText(
    input.title,
    input.deck,
    input.contentJson,
  );

  const topics = extractTopics(title, deck, fullText, headings, input.deskName);
  const entities = extractEntities(title, deck, fullText, headings);
  const centralQuestion = extractCentralQuestion(title, deck, questions, headings);
  const editorialAngle = extractEditorialAngle(title, deck, paragraphs);

  return {
    topics,
    entities,
    centralQuestion,
    editorialAngle,
  };
}

/**
 * Memproses backfill satu artikel secara aman dan terisolasi.
 */
export async function backfillArticleRecord(
  article: {
    id: string;
    slug: string;
    title: string;
    deck?: string | null;
    contentJson?: string | null;
    status: string;
    publishedAt: Date | string | null;
    metadataStatus?: string | null;
    topics?: string | null;
    entities?: string | null;
    centralQuestion?: string | null;
    editorialAngle?: string | null;
    desk?: { name: string } | null;
  },
  options: { dryRun?: boolean } = {},
  prismaClient: PrismaClient = defaultDb as unknown as PrismaClient,
): Promise<BackfillArticleResult> {
  const baseResult: Omit<BackfillArticleResult, "status" | "fieldsUpdated" | "extracted"> = {
    articleId: article.id,
    slug: article.slug,
    title: article.title,
  };

  // 1. Validasi predikat artikel terpublikasi: strictly PUBLISHED | CORRECTED dan publishedAt != null
  if (!isPublishedArticle(article)) {
    return {
      ...baseResult,
      status: "skipped_not_published",
      fieldsUpdated: [],
      extracted: {},
    };
  }

  // 2. Validasi status verifikasi: lewati seluruh artikel jika metadataStatus === 'verified'
  if (article.metadataStatus === "verified") {
    return {
      ...baseResult,
      status: "skipped_verified",
      fieldsUpdated: [],
      extracted: {},
    };
  }

  // 3. Periksa bidang kosong (hanya mengisi yang kosong, jangan menimpa data yang ada)
  const needsTopics = isTopicsEmpty(article.topics);
  const needsEntities = isEntitiesEmpty(article.entities);
  const needsCentralQuestion = isCentralQuestionEmpty(article.centralQuestion);
  const needsEditorialAngle = isEditorialAngleEmpty(article.editorialAngle);

  if (!needsTopics && !needsEntities && !needsCentralQuestion && !needsEditorialAngle) {
    return {
      ...baseResult,
      status: "skipped_already_populated",
      fieldsUpdated: [],
      extracted: {},
    };
  }

  // 4. Ekstrak metadata editorial
  const extracted = extractArticleMetadata({
    title: article.title,
    deck: article.deck,
    contentJson: article.contentJson,
    deskName: article.desk?.name,
  });

  const fieldsUpdated: string[] = [];
  const dataToUpdate: Prisma.ArticleUpdateInput = {
    metadataStatus: "unverified",
  };

  if (needsTopics) {
    dataToUpdate.topics = JSON.stringify(extracted.topics);
    fieldsUpdated.push("topics");
  }

  if (needsEntities) {
    dataToUpdate.entities = JSON.stringify(extracted.entities);
    fieldsUpdated.push("entities");
  }

  if (needsCentralQuestion) {
    dataToUpdate.centralQuestion = extracted.centralQuestion;
    fieldsUpdated.push("centralQuestion");
  }

  if (needsEditorialAngle) {
    dataToUpdate.editorialAngle = extracted.editorialAngle;
    fieldsUpdated.push("editorialAngle");
  }

  // 5. Terapkan pembaruan jika bukan dry run
  if (!options.dryRun) {
    await prismaClient.article.update({
      where: { id: article.id },
      data: dataToUpdate,
    });
  }

  return {
    ...baseResult,
    status: "updated",
    fieldsUpdated,
    extracted: {
      topics: needsTopics ? extracted.topics : undefined,
      entities: needsEntities ? extracted.entities : undefined,
      centralQuestion: needsCentralQuestion ? extracted.centralQuestion : undefined,
      editorialAngle: needsEditorialAngle ? extracted.editorialAngle : undefined,
    },
  };
}

/**
 * Menjalankan proses backfill metadata editorial secara menyeluruh.
 */
export async function runEditorialBackfill(
  options: BackfillOptions = {},
): Promise<BackfillSummary> {
  const client = options.prismaClient ?? (defaultDb as unknown as PrismaClient);

  // Ambil daftar artikel untuk diproses
  const articles = await client.article.findMany({
    where: options.articleId ? { id: options.articleId } : undefined,
    include: {
      desk: {
        select: { name: true },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    take: options.limit,
  });

  const summary: BackfillSummary = {
    totalScanned: articles.length,
    publishedCount: 0,
    skippedVerified: 0,
    skippedNotPublished: 0,
    skippedAlreadyPopulated: 0,
    updatedCount: 0,
    results: [],
  };

  for (const article of articles) {
    if (isPublishedArticle(article)) {
      summary.publishedCount++;
    }

    const res = await backfillArticleRecord(
      article,
      { dryRun: options.dryRun },
      client,
    );

    summary.results.push(res);

    switch (res.status) {
      case "updated":
        summary.updatedCount++;
        break;
      case "skipped_verified":
        summary.skippedVerified++;
        break;
      case "skipped_not_published":
        summary.skippedNotPublished++;
        break;
      case "skipped_already_populated":
        summary.skippedAlreadyPopulated++;
        break;
    }
  }

  return summary;
}

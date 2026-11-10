// Skema konten artikel: block-based JSON tervalidasi Zod.
// Prinsip TA §1: "Isi artikel disimpan sebagai JSON terstruktur yang divalidasi; bukan HTML mentah bebas."
// Tidak ada HTML yang pernah masuk atau keluar dari layer ini.

import { z } from "zod";

const textBlock = z.object({ type: z.literal("paragraph"), text: z.string().min(1).max(20_000) });

const headingBlock = z.object({
  type: z.literal("heading"),
  level: z.union([z.literal(2), z.literal(3)]),
  text: z.string().min(1).max(300),
});

const quoteBlock = z.object({
  type: z.literal("quote"),
  text: z.string().min(1).max(5_000),
  attribution: z.string().max(300).optional(),
});

const listBlock = z.object({
  type: z.literal("list"),
  style: z.union([z.literal("bullet"), z.literal("number")]),
  items: z.array(z.string().min(1).max(2_000)).min(1).max(50),
});

const imageBlock = z.object({
  type: z.literal("image"),
  url: z.string().url().max(2_000),
  alt: z.string().max(500).optional(),
  caption: z.string().max(500).optional(),
  credit: z.string().max(300).optional(),
});

const noteBlock = z.object({
  type: z.literal("note"),
  label: z.string().max(120).optional(),
  text: z.string().min(1).max(3_000),
});

const qaBlock = z.object({
  type: z.literal("qa"),
  question: z.string().min(1).max(1_000),
  answer: z.string().min(1).max(10_000),
});

export const contentBlockSchema = z.discriminatedUnion("type", [
  textBlock,
  headingBlock,
  quoteBlock,
  listBlock,
  imageBlock,
  noteBlock,
  qaBlock,
]);

export const articleContentSchema = z.array(contentBlockSchema).max(300);

export type ContentBlock = z.infer<typeof contentBlockSchema>;
export type ArticleContent = z.infer<typeof articleContentSchema>;

/** Serialize untuk disimpan ke kolom String di Prisma. */
export function serializeContent(content: ArticleContent): string {
  return JSON.stringify(content);
}

/** Parse + validasi dari kolom String. Melempar ZodError bila korup/tidak valid. */
export function parseContent(json: string | null | undefined): ArticleContent {
  if (!json) return [];
  const raw = JSON.parse(json) as unknown;
  return articleContentSchema.parse(raw);
}

/** Parse toleran untuk render publik: blok tidak valid dibuang, bukan crash halaman. */
export function parseContentSafe(json: string | null | undefined): ArticleContent {
  if (!json) return [];
  try {
    const raw = JSON.parse(json) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((block) => {
      const result = contentBlockSchema.safeParse(block);
      return result.success ? [result.data] : [];
    });
  } catch {
    return [];
  }
}

/** Perkiraan waktu baca (menit) dari total teks blok. */
export function estimateReadingMinutes(content: ArticleContent): number {
  const words = content.reduce((sum, block) => {
    const texts: string[] = [];
    if (block.type === "paragraph" || block.type === "heading" || block.type === "quote" || block.type === "note") {
      texts.push(block.text);
    } else if (block.type === "list") {
      texts.push(...block.items);
    } else if (block.type === "qa") {
      texts.push(block.question, block.answer);
    } else if (block.type === "image") {
      if (block.caption) texts.push(block.caption);
    }
    return sum + texts.join(" ").split(/\s+/).filter(Boolean).length;
  }, 0);
  return Math.max(1, Math.round(words / 200));
}

/** Teks gabungan (untuk preview/excerpt). */
export function contentToPlainText(content: ArticleContent, maxChars = 220): string {
  const parts: string[] = [];
  for (const block of content) {
    if (block.type === "paragraph" || block.type === "quote" || block.type === "note") parts.push(block.text);
    else if (block.type === "heading") parts.push(block.text);
    else if (block.type === "list") parts.push(block.items.join(" "));
    else if (block.type === "qa") parts.push(`${block.question} ${block.answer}`);
  }
  const joined = parts.join(" ").replace(/\s+/g, " ").trim();
  return joined.length > maxChars ? `${joined.slice(0, maxChars - 1).trimEnd()}…` : joined;
}

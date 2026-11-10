// Slug generator untuk bahasa Indonesia (ascii-fold manual + strip diakritik umum).
import { db } from "@/lib/db";

const REPLACEMENTS: Record<string, string> = {
  à: "a", á: "a", â: "a", ä: "a", ã: "a", å: "a",
  è: "e", é: "e", ê: "e", ë: "e",
  ì: "i", í: "i", î: "i", ï: "i",
  ò: "o", ó: "o", ô: "o", ö: "o", õ: "o",
  ù: "u", ú: "u", û: "u", ü: "u",
  ç: "c", ñ: "n",
};

export function slugify(input: string): string {
  const lowered = input
    .toLowerCase()
    .replace(/[àáâäãåèéêëìíîïòóôöõùúûüçñ]/g, (char) => REPLACEMENTS[char] ?? char);
  return lowered
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96)
    .replace(/-+$/g, "");
}

/** Slug artikel unik (abaikan artikel yang sedang diedit). */
export async function uniqueArticleSlug(title: string, exceptId?: string): Promise<string> {
  const base = slugify(title) || "artikel";
  let candidate = base;
  let counter = 2;
  for (;;) {
    const existing = await db.article.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === exceptId) return candidate;
    candidate = `${base}-${counter++}`;
    if (counter > 300) return `${base}-${Date.now()}`;
  }
}

/** RefCode complaint: KEL-{tahun}-{urut 4 digit}. */
export function makeComplaintRefCode(year: number, sequence: number): string {
  return `KEL-${year}-${String(sequence).padStart(4, "0")}`;
}

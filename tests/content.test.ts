import { describe, expect, it } from "bun:test";
import {
  estimateReadingMinutes,
  contentToPlainText,
  parseContent,
  parseContentSafe,
  serializeContent,
  type ArticleContent,
} from "../src/lib/domain/content";

describe("Content Domain (Structured Block JSON)", () => {
  const sampleBlocks: ArticleContent = [
    { type: "heading", level: 2, text: "Bab I: Konteks Hukum" },
    { type: "paragraph", text: "Regulasi privasi data telah diberlakukan secara nasional sejak 2024." },
    { type: "quote", text: "Penegakan hukum memerlukan integritas tanpa kompromi.", attribution: "Ketua Dewan" },
    { type: "list", style: "bullet", items: ["Poin verifikasi 1", "Poin verifikasi 2"] },
    { type: "note", label: "Catatan Editor", text: "Sumber primer dokumen telah diverifikasi." },
  ];

  it("serializes and parses valid article content accurately", () => {
    const jsonStr = serializeContent(sampleBlocks);
    expect(typeof jsonStr).toBe("string");

    const parsed = parseContent(jsonStr);
    expect(parsed.length).toBe(5);
    expect(parsed[0].type).toBe("heading");
    expect(parsed[1].type).toBe("paragraph");
  });

  it("safely filters out corrupted or invalid blocks without crashing", () => {
    const corruptedJson = JSON.stringify([
      { type: "paragraph", text: "Valid block" },
      { type: "unknown_weird_block", text: "Should be dropped" },
      { type: "heading", level: 5, text: "Invalid level 5" },
    ]);

    const safe = parseContentSafe(corruptedJson);
    expect(safe.length).toBe(1);
    expect(safe[0].type).toBe("paragraph");
  });

  it("computes estimated reading time correctly", () => {
    const readingTime = estimateReadingMinutes(sampleBlocks);
    expect(readingTime).toBeGreaterThanOrEqual(1);
  });

  it("generates accurate plain text excerpt", () => {
    const plain = contentToPlainText(sampleBlocks, 50);
    expect(plain.length).toBeLessThanOrEqual(50);
    expect(plain.endsWith("…")).toBe(true);
  });
});

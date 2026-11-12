import { describe, expect, it } from "bun:test";
import {
  estimateReadingMinutes,
  contentToPlainText,
  parseContent,
  parseContentSafe,
  serializeContent,
  type ArticleContent,
} from "../src/lib/domain/content";
import { ingestionSchema } from "../src/lib/domain/ingestion";
import { isBindingStatus } from "../src/lib/editorial/standards";

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

  it("rejects whitespace-only ingestion titles, identifiers, and block text while preserving intentional body whitespace", () => {
    const baseValid = {
      title: "  Analisis Kebijakan Perlindungan Data Nasional 2026  ",
      desk: "  hukum-keadilan  ",
      format: "  ANALYSIS  ",
      content: [
        { type: "paragraph" as const, text: "  Paragraf berindentasi awal.\n  Baris lanjutan tetap utuh.  " },
        { type: "quote" as const, text: "  Kutipan verbatim dengan spasi tepi.  " },
        { type: "list" as const, style: "bullet" as const, items: ["  Butir satu  "] },
        { type: "qa" as const, question: "Apa dampaknya?", answer: "  Penegakan menjadi terukur.  " },
      ],
      sources: [
        {
          title: "  Undang-Undang Nomor 27 Tahun 2022  ",
          url: "https://example.com/uu-pdp",
          sourceType: "OFFICIAL" as const,
        },
      ],
      tags: ["  privasi  ", "  regulasi  "],
      aiInvolvement: "assistive" as const,
      agentId: "  agent-reg-01  ",
      idempotencyKey: "  idem-key-123456  ",
    };

    const parsedValid = ingestionSchema.safeParse(baseValid);
    expect(parsedValid.success).toBe(true);
    if (parsedValid.success) {
      expect(parsedValid.data.title).toBe("Analisis Kebijakan Perlindungan Data Nasional 2026");
      expect(parsedValid.data.desk).toBe("hukum-keadilan");
      expect(parsedValid.data.format).toBe("ANALYSIS");
      expect(parsedValid.data.agentId).toBe("agent-reg-01");
      expect(parsedValid.data.idempotencyKey).toBe("idem-key-123456");
      expect(parsedValid.data.sources[0]?.title).toBe("Undang-Undang Nomor 27 Tahun 2022");
      expect(parsedValid.data.tags).toEqual(["privasi", "regulasi"]);
      // Pemformatan spasi tepi pada isi artikel tidak dipangkas paksa
      expect((parsedValid.data.content[0] as { text: string }).text).toBe(
        "  Paragraf berindentasi awal.\n  Baris lanjutan tetap utuh.  ",
      );
    }

    const whitespaceTitle = ingestionSchema.safeParse({ ...baseValid, title: "        \t\n" });
    expect(whitespaceTitle.success).toBe(false);

    const whitespaceAgent = ingestionSchema.safeParse({ ...baseValid, agentId: " \t " });
    expect(whitespaceAgent.success).toBe(false);

    const whitespaceIdem = ingestionSchema.safeParse({ ...baseValid, idempotencyKey: "   \t   \n  " });
    expect(whitespaceIdem.success).toBe(false);

    const whitespaceDesk = ingestionSchema.safeParse({ ...baseValid, desk: "   " });
    expect(whitespaceDesk.success).toBe(false);

    const whitespaceSourceTitle = ingestionSchema.safeParse({
      ...baseValid,
      sources: [{ ...baseValid.sources[0], title: "\t  \n" }],
    });
    expect(whitespaceSourceTitle.success).toBe(false);

    const whitespaceParagraph = ingestionSchema.safeParse({
      ...baseValid,
      content: [{ type: "paragraph", text: "   \t\n  " }],
    });
    expect(whitespaceParagraph.success).toBe(false);

    const whitespaceListItem = ingestionSchema.safeParse({
      ...baseValid,
      content: [{ type: "list", style: "bullet", items: ["Valid item", " \t "] }],
    });
    expect(whitespaceListItem.success).toBe(false);

    const whitespaceQa = ingestionSchema.safeParse({
      ...baseValid,
      content: [{ type: "qa", question: "   ", answer: "Jawaban" }],
    });
    expect(whitespaceQa.success).toBe(false);
  });

  it("evaluates isBindingStatus consistently across PROPOSED, APPROVED, and ACTIVE with effectiveDate", () => {
    expect(isBindingStatus("PROPOSED", null)).toBe(false);
    expect(isBindingStatus("APPROVED", null)).toBe(false);
    expect(isBindingStatus("APPROVED", "2026-11-12")).toBe(true);
    expect(isBindingStatus("ACTIVE", "2026-11-12")).toBe(true);
  });
});

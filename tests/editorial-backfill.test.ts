/**
 * Verax Editorial Intelligence (VEI) — Automated Test Suite: Backfill Editorial Metadata
 *
 * Verifies all 8 required cases from testing_wajib_otomatis:
 * 1. Published article with empty metadata gets extracted metadata marked 'unverified'.
 * 2. Article with partial metadata only gets missing fields filled; existing fields remain unchanged.
 * 3. Article with metadataStatus === 'verified' is NOT modified at all.
 * 4. Non-published articles (draft, pending_review, fact_check, revision_needed,
 *    pending_approval, rejected, withdrawn, retracted, archived, and null publishedAt)
 *    are completely untouched.
 * 5. Backfill run twice consecutively is idempotent and produces no duplicates or overwrites.
 * 6. Resuming interrupted backfill works cleanly.
 * 7. Non-metadata fields (title, content, desk, status, publishedAt, slug, etc.)
 *    remain 100% identical before and after backfill.
 * 8. Edge cases and robustness: corrupted contentJson, empty string fields, and dryRun safety.
 */

import { test, describe, beforeAll, afterAll, expect } from "bun:test";
import {
  getTestDb,
  DB_URL,
  assertApprovedTestDatabase,
} from "./lib/test-db";
import {
  runEditorialBackfill,
  backfillArticleRecord,
  extractArticleMetadata,
  isTopicsEmpty,
  isEntitiesEmpty,
  isCentralQuestionEmpty,
  isEditorialAngleEmpty,
} from "@/lib/editorial-backfill";
import {
  safeParseJsonArray,
  resolveArticleCanonicalUrl,
} from "@/lib/domain/coverage";

describe("Phase 3: Backfill Editorial Metadata for Published Articles", () => {
  const db = getTestDb();
  const createdArticleIds: string[] = [];
  let testDeskId: string;
  const testRunMarker = `backfill-test-${Date.now()}`;

  beforeAll(async () => {
    assertApprovedTestDatabase(DB_URL);

    // Pastikan desk uji tersedia
    const desk = await db.desk.upsert({
      where: { slug: "hukum-keadilan" },
      update: { name: "Hukum & Keadilan", isActive: true },
      create: {
        slug: "hukum-keadilan",
        name: "Hukum & Keadilan",
        description: "Regulasi, peradilan, penegakan hukum.",
        sortOrder: 1,
        isActive: true,
      },
    });
    testDeskId = desk.id;
  });

  afterAll(async () => {
    if (createdArticleIds.length > 0) {
      await db.article.deleteMany({
        where: { id: { in: createdArticleIds } },
      });
    }
  });

  // =========================================================================
  // Case 1: Published article with empty metadata gets extracted metadata marked 'unverified'
  // =========================================================================
  test("1. Published article with empty metadata gets extracted metadata marked 'unverified'", async () => {
    const art = await db.article.create({
      data: {
        slug: `art-empty-meta-${testRunMarker}`,
        title: `Verifikasi Penegakan Hukum dan Transparansi Peradilan ${testRunMarker}`,
        deck: `Laporan mendalam mengenai disiplin verifikasi dokumen primer dalam sidang pengadilan terbuka.`,
        contentJson: JSON.stringify([
          {
            type: "paragraph",
            text: "Verax Press meneliti bagaimana sidang peradilan keterbukaan informasi publik berjalan di Mahkamah Agung.",
          },
        ]),
        format: "ANALYSIS",
        status: "PUBLISHED",
        publishedAt: new Date("2026-11-10T10:00:00Z"),
        deskId: testDeskId,
        topics: "[]",
        entities: "[]",
        centralQuestion: null,
        editorialAngle: null,
        metadataStatus: "unverified",
      },
    });
    createdArticleIds.push(art.id);

    const summary = await runEditorialBackfill({
      prismaClient: db,
      articleId: art.id,
    });

    expect(summary.totalScanned).toBe(1);
    expect(summary.updatedCount).toBe(1);
    expect(summary.results[0].status).toBe("updated");
    expect(summary.results[0].fieldsUpdated).toContain("topics");
    expect(summary.results[0].fieldsUpdated).toContain("entities");
    expect(summary.results[0].fieldsUpdated).toContain("centralQuestion");
    expect(summary.results[0].fieldsUpdated).toContain("editorialAngle");

    const updated = await db.article.findUniqueOrThrow({
      where: { id: art.id },
    });

    expect(updated.metadataStatus).toBe("unverified");

    const parsedTopics = safeParseJsonArray(updated.topics);
    expect(parsedTopics.length).toBeGreaterThanOrEqual(1);

    const parsedEntities = safeParseJsonArray(updated.entities);
    expect(parsedEntities.length).toBeGreaterThanOrEqual(1);
    expect(parsedEntities).toContain("Verax Press");

    expect(updated.centralQuestion).not.toBeNull();
    expect(typeof updated.centralQuestion).toBe("string");
    expect(updated.centralQuestion?.endsWith("?")).toBe(true);
    // Standar Penulisan: Tanpa em dash
    expect(updated.centralQuestion?.includes("—")).toBe(false);

    expect(updated.editorialAngle).not.toBeNull();
    expect(typeof updated.editorialAngle).toBe("string");
    expect(updated.editorialAngle?.includes("—")).toBe(false);
  });

  // =========================================================================
  // Case 2: Article with partial metadata only gets missing fields filled; existing unchanged
  // =========================================================================
  test("2. Article with partial metadata only gets missing fields filled; existing fields remain unchanged", async () => {
    const existingTopics = ["Topik Manual Tetap", "Keadilan Substantif"];
    const existingQuestion = "Bagaimana manual question ini dipertahankan?";

    const art = await db.article.create({
      data: {
        slug: `art-partial-meta-${testRunMarker}`,
        title: `Kebijakan Khusus Regulasi Digital ${testRunMarker}`,
        deck: `Ulasan regulasi baru perlindungan data dan keterbukaan informasi.`,
        contentJson: JSON.stringify([
          {
            type: "paragraph",
            text: "Analisis implementasi standar kepatuhan hukum siber di Indonesia bersama Kementerian Komdigi.",
          },
        ]),
        format: "EXPLAINER",
        status: "PUBLISHED",
        publishedAt: new Date("2026-11-10T11:00:00Z"),
        deskId: testDeskId,
        topics: JSON.stringify(existingTopics), // Sudah terisi
        entities: "[]", // Kosong
        centralQuestion: existingQuestion, // Sudah terisi
        editorialAngle: null, // Kosong
        metadataStatus: "unverified",
      },
    });
    createdArticleIds.push(art.id);

    const summary = await runEditorialBackfill({
      prismaClient: db,
      articleId: art.id,
    });

    expect(summary.updatedCount).toBe(1);
    const result = summary.results[0];
    expect(result.status).toBe("updated");
    // Hanya entities dan editorialAngle yang diperbarui
    expect(result.fieldsUpdated).toContain("entities");
    expect(result.fieldsUpdated).toContain("editorialAngle");
    expect(result.fieldsUpdated).not.toContain("topics");
    expect(result.fieldsUpdated).not.toContain("centralQuestion");

    const updated = await db.article.findUniqueOrThrow({
      where: { id: art.id },
    });

    // Topik dan centralQuestion lama harus 100% utuh tidak tersentuh
    expect(safeParseJsonArray(updated.topics)).toEqual(existingTopics);
    expect(updated.centralQuestion).toBe(existingQuestion);

    // Bidang kosong berhasil diisi
    const parsedEntities = safeParseJsonArray(updated.entities);
    expect(parsedEntities.length).toBeGreaterThanOrEqual(1);
    expect(updated.editorialAngle).not.toBeNull();
    expect(updated.metadataStatus).toBe("unverified");
  });

  // =========================================================================
  // Case 3: Article with metadataStatus === 'verified' is NOT modified at all
  // =========================================================================
  test("3. Article with metadataStatus === 'verified' is NOT modified at all", async () => {
    const art = await db.article.create({
      data: {
        slug: `art-verified-skip-${testRunMarker}`,
        title: `Artikel Terverifikasi Redaksi Penuh ${testRunMarker}`,
        deck: `Artikel yang telah diverifikasi oleh Chief Editor secara manual.`,
        contentJson: JSON.stringify([
          {
            type: "paragraph",
            text: "Isi teks naskah terverifikasi.",
          },
        ]),
        format: "ANALYSIS",
        status: "PUBLISHED",
        publishedAt: new Date("2026-11-09T09:00:00Z"),
        deskId: testDeskId,
        topics: "[]", // Sengaja dikosongkan untuk membuktikan status verified menjaga naskah
        entities: "[]",
        centralQuestion: null,
        editorialAngle: null,
        metadataStatus: "verified", // STATUS VERIFIED
      },
    });
    createdArticleIds.push(art.id);

    const summary = await runEditorialBackfill({
      prismaClient: db,
      articleId: art.id,
    });

    expect(summary.skippedVerified).toBe(1);
    expect(summary.updatedCount).toBe(0);
    expect(summary.results[0].status).toBe("skipped_verified");
    expect(summary.results[0].fieldsUpdated).toEqual([]);

    const afterCheck = await db.article.findUniqueOrThrow({
      where: { id: art.id },
    });

    // Terbukti sama sekali tidak dimodifikasi
    expect(afterCheck.metadataStatus).toBe("verified");
    expect(afterCheck.topics).toBe("[]");
    expect(afterCheck.entities).toBe("[]");
    expect(afterCheck.centralQuestion).toBeNull();
    expect(afterCheck.editorialAngle).toBeNull();
  });

  // =========================================================================
  // Case 4: Non-published articles are completely untouched
  // =========================================================================
  test("4. Non-published articles across all non-published statuses are completely untouched", async () => {
    const nonPublishedCases = [
      { status: "DRAFT", publishedAt: null },
      { status: "PENDING_REVIEW", publishedAt: null },
      { status: "FACT_CHECK", publishedAt: null },
      { status: "REVISION_NEEDED", publishedAt: null },
      { status: "PENDING_APPROVAL", publishedAt: null },
      { status: "REJECTED", publishedAt: null },
      { status: "WITHDRAWN", publishedAt: null },
      { status: "RETRACTED", publishedAt: null },
      { status: "ARCHIVED", publishedAt: null },
      { status: "PUBLISHED", publishedAt: null }, // Status PUBLISHED tanpa publishedAt
      { status: "CORRECTED", publishedAt: null }, // Status CORRECTED tanpa publishedAt
    ];

    for (let i = 0; i < nonPublishedCases.length; i++) {
      const item = nonPublishedCases[i];
      const art = await db.article.create({
        data: {
          slug: `art-nonpub-${i}-${testRunMarker}`,
          title: `Naskah Status Non Terbit ${item.status} ${i} ${testRunMarker}`,
          deck: `Naskah belum berhak dipublikasikan.`,
          contentJson: JSON.stringify([
            { type: "paragraph", text: "Teks naskah yang belum terbit." },
          ]),
          format: "NEWS",
          status: item.status,
          publishedAt: item.publishedAt,
          deskId: testDeskId,
          topics: "[]",
          entities: "[]",
          centralQuestion: null,
          editorialAngle: null,
          metadataStatus: "unverified",
        },
      });
      createdArticleIds.push(art.id);

      const summary = await runEditorialBackfill({
        prismaClient: db,
        articleId: art.id,
      });

      expect(summary.skippedNotPublished).toBe(1);
      expect(summary.updatedCount).toBe(0);
      expect(summary.results[0].status).toBe("skipped_not_published");
      expect(summary.results[0].fieldsUpdated).toEqual([]);

      const check = await db.article.findUniqueOrThrow({
        where: { id: art.id },
      });

      expect(check.status).toBe(item.status);
      expect(check.topics).toBe("[]");
      expect(check.entities).toBe("[]");
      expect(check.centralQuestion).toBeNull();
      expect(check.editorialAngle).toBeNull();
    }
  });

  // =========================================================================
  // Case 5: Backfill run twice consecutively is idempotent
  // =========================================================================
  test("5. Backfill run twice consecutively is idempotent and produces no duplicates or overwrites", async () => {
    const art = await db.article.create({
      data: {
        slug: `art-idempotent-${testRunMarker}`,
        title: `Uji Idempotensi Alur Redaksi Terbuka ${testRunMarker}`,
        deck: `Memastikan eksekusi ganda tidak merusak atau menduplikasi metadata.`,
        contentJson: JSON.stringify([
          {
            type: "paragraph",
            text: "Prosedur pengujian idempotensi pada backfill metadata artikel terbit.",
          },
        ]),
        format: "ANALYSIS",
        status: "PUBLISHED",
        publishedAt: new Date("2026-11-08T14:00:00Z"),
        deskId: testDeskId,
        topics: "[]",
        entities: "[]",
        centralQuestion: null,
        editorialAngle: null,
        metadataStatus: "unverified",
      },
    });
    createdArticleIds.push(art.id);

    // Eksekusi Pertama
    const run1 = await runEditorialBackfill({
      prismaClient: db,
      articleId: art.id,
    });
    expect(run1.updatedCount).toBe(1);

    const snap1 = await db.article.findUniqueOrThrow({
      where: { id: art.id },
    });

    // Eksekusi Kedua (Berturut-turut)
    const run2 = await runEditorialBackfill({
      prismaClient: db,
      articleId: art.id,
    });
    expect(run2.updatedCount).toBe(0);
    expect(run2.skippedAlreadyPopulated).toBe(1);
    expect(run2.results[0].status).toBe("skipped_already_populated");
    expect(run2.results[0].fieldsUpdated).toEqual([]);

    const snap2 = await db.article.findUniqueOrThrow({
      where: { id: art.id },
    });

    // Seluruh bidang metadata 100% identik antara Run 1 dan Run 2
    expect(snap2.topics).toBe(snap1.topics);
    expect(snap2.entities).toBe(snap1.entities);
    expect(snap2.centralQuestion).toBe(snap1.centralQuestion);
    expect(snap2.editorialAngle).toBe(snap1.editorialAngle);
    expect(snap2.metadataStatus).toBe(snap1.metadataStatus);
  });

  // =========================================================================
  // Case 6: Resuming interrupted backfill works cleanly
  // =========================================================================
  test("6. Resuming interrupted backfill works cleanly without corrupting previous articles", async () => {
    // Buat 3 artikel terbit
    const art1 = await db.article.create({
      data: {
        slug: `art-resume-1-${testRunMarker}`,
        title: `Artikel Pertama Sebelum Interupsi ${testRunMarker}`,
        deck: `Naskah batch 1.`,
        contentJson: JSON.stringify([{ type: "paragraph", text: "Konten naskah satu." }]),
        format: "ANALYSIS",
        status: "PUBLISHED",
        publishedAt: new Date("2026-11-07T10:00:00Z"),
        deskId: testDeskId,
        topics: "[]",
        entities: "[]",
        centralQuestion: null,
        editorialAngle: null,
        metadataStatus: "unverified",
      },
    });
    const art2 = await db.article.create({
      data: {
        slug: `art-resume-2-${testRunMarker}`,
        title: `Artikel Kedua Saat Interupsi ${testRunMarker}`,
        deck: `Naskah batch 2.`,
        contentJson: JSON.stringify([{ type: "paragraph", text: "Konten naskah dua." }]),
        format: "ANALYSIS",
        status: "PUBLISHED",
        publishedAt: new Date("2026-11-07T11:00:00Z"),
        deskId: testDeskId,
        topics: "[]",
        entities: "[]",
        centralQuestion: null,
        editorialAngle: null,
        metadataStatus: "unverified",
      },
    });
    createdArticleIds.push(art1.id, art2.id);

    // Langkah 1: Hanya art1 yang diproses (simulasi interupsi proses setelah art1)
    const runBatch1 = await runEditorialBackfill({
      prismaClient: db,
      articleId: art1.id,
    });
    expect(runBatch1.updatedCount).toBe(1);

    const art1Snap = await db.article.findUniqueOrThrow({ where: { id: art1.id } });
    expect(isTopicsEmpty(art1Snap.topics)).toBe(false);

    // Langkah 2: Proses dilanjutkan untuk art1 dan art2
    const resumeRun = await runEditorialBackfill({
      prismaClient: db,
      articleId: art1.id,
    });
    expect(resumeRun.skippedAlreadyPopulated).toBe(1);
    expect(resumeRun.updatedCount).toBe(0);

    const art2Run = await runEditorialBackfill({
      prismaClient: db,
      articleId: art2.id,
    });
    expect(art2Run.updatedCount).toBe(1);

    // Verifikasi: art1 tetap tidak berubah, art2 kini terisi lengkap
    const art1After = await db.article.findUniqueOrThrow({ where: { id: art1.id } });
    const art2After = await db.article.findUniqueOrThrow({ where: { id: art2.id } });

    expect(art1After.topics).toBe(art1Snap.topics);
    expect(art1After.centralQuestion).toBe(art1Snap.centralQuestion);
    expect(isTopicsEmpty(art2After.topics)).toBe(false);
    expect(isEntitiesEmpty(art2After.entities)).toBe(false);
    expect(isCentralQuestionEmpty(art2After.centralQuestion)).toBe(false);
  });

  // =========================================================================
  // Case 7: Non-metadata fields remain 100% identical before and after backfill
  // =========================================================================
  test("7. Non-metadata fields remain 100% identical before and after backfill", async () => {
    const rawContent = JSON.stringify([
      {
        type: "paragraph",
        text: "Klaim penting dalam penyelidikan keterbukaan dokumen persidangan.",
      },
      {
        type: "heading",
        level: 2,
        text: "Disiplin Pembuktian",
      },
    ]);

    const initialDate = new Date("2026-11-06T15:30:00.000Z");

    const art = await db.article.create({
      data: {
        slug: `art-non-meta-integrity-${testRunMarker}`,
        title: `Integritas Bidang Non Metadata Verax ${testRunMarker}`,
        deck: `Deck pengujian integritas bidang dasar artikel.`,
        contentJson: rawContent,
        format: "ANALYSIS",
        status: "PUBLISHED",
        publishedAt: initialDate,
        deskId: testDeskId,
        byline: "Tim Investigasi Independen",
        origin: "NEWSROOM",
        aiInvolvement: "assistive",
        aiDisclosurePublic: true,
        aiDisclosureNote: "Pemeriksaan tata bahasa dibantu piranti lunak pembaca teks.",
        topics: "[]",
        entities: "[]",
        centralQuestion: null,
        editorialAngle: null,
        metadataStatus: "unverified",
      },
    });
    createdArticleIds.push(art.id);

    // Ambil rekam jejak persis sebelum backfill
    const before = await db.article.findUniqueOrThrow({ where: { id: art.id } });

    // Jalankan backfill
    const summary = await runEditorialBackfill({
      prismaClient: db,
      articleId: art.id,
    });
    expect(summary.updatedCount).toBe(1);

    // Ambil rekam jejak sesudah backfill
    const after = await db.article.findUniqueOrThrow({ where: { id: art.id } });

    // Seluruh bidang non-metadata wajib 100% identik
    expect(after.title).toBe(before.title);
    expect(after.slug).toBe(before.slug);
    expect(after.deck).toBe(before.deck);
    expect(after.contentJson).toBe(before.contentJson);
    expect(after.format).toBe(before.format);
    expect(after.status).toBe(before.status);
    expect(after.publishedAt?.getTime()).toBe(before.publishedAt?.getTime());
    expect(after.deskId).toBe(before.deskId);
    expect(after.byline).toBe(before.byline);
    expect(after.origin).toBe(before.origin);
    expect(after.aiInvolvement).toBe(before.aiInvolvement);
    expect(after.aiDisclosurePublic).toBe(before.aiDisclosurePublic);
    expect(after.aiDisclosureNote).toBe(before.aiDisclosureNote);

    // URL kanonik publik artikel tetap konsisten
    expect(resolveArticleCanonicalUrl(after.slug)).toBe(
      resolveArticleCanonicalUrl(before.slug),
    );
  });

  // =========================================================================
  // Case 8: Robustness and edge case handling
  // =========================================================================
  test("8. Robustness: handles corrupted contentJson, empty string values, and dryRun safety", async () => {
    // 8a. Corrupted contentJson
    const artCorrupt = await db.article.create({
      data: {
        slug: `art-corrupt-json-${testRunMarker}`,
        title: `Artikel dengan Konten Rusak ${testRunMarker}`,
        deck: `Deck tetap terbaca meskipun JSON isi naskah korup.`,
        contentJson: "{invalid-json-data: not-a-json",
        format: "NEWS",
        status: "PUBLISHED",
        publishedAt: new Date("2026-11-05T12:00:00Z"),
        deskId: testDeskId,
        topics: "[]",
        entities: "[]",
        centralQuestion: null,
        editorialAngle: null,
        metadataStatus: "unverified",
      },
    });
    createdArticleIds.push(artCorrupt.id);

    // Backfill tidak boleh crash meskipun contentJson korup
    const corruptSummary = await runEditorialBackfill({
      prismaClient: db,
      articleId: artCorrupt.id,
    });
    expect(corruptSummary.updatedCount).toBe(1);

    const updatedCorrupt = await db.article.findUniqueOrThrow({
      where: { id: artCorrupt.id },
    });
    expect(isTopicsEmpty(updatedCorrupt.topics)).toBe(false);
    expect(isEntitiesEmpty(updatedCorrupt.entities)).toBe(false);
    expect(isCentralQuestionEmpty(updatedCorrupt.centralQuestion)).toBe(false);

    // 8b. Empty string fields detection
    expect(isTopicsEmpty("")).toBe(true);
    expect(isTopicsEmpty("   ")).toBe(true);
    expect(isTopicsEmpty("[]")).toBe(true);
    expect(isTopicsEmpty(null)).toBe(true);
    expect(isEntitiesEmpty("")).toBe(true);
    expect(isEntitiesEmpty("[]")).toBe(true);
    expect(isCentralQuestionEmpty("")).toBe(true);
    expect(isCentralQuestionEmpty("   ")).toBe(true);
    expect(isCentralQuestionEmpty(null)).toBe(true);
    expect(isEditorialAngleEmpty("")).toBe(true);
    expect(isEditorialAngleEmpty(null)).toBe(true);

    // 8c. Dry run safety guarantee: tidak mengubah baris basis data sama sekali
    const artDry = await db.article.create({
      data: {
        slug: `art-dryrun-guard-${testRunMarker}`,
        title: `Artikel Simulasi Dry Run ${testRunMarker}`,
        deck: `Deck pengujian simulasi tanpa penulisan.`,
        contentJson: JSON.stringify([{ type: "paragraph", text: "Teks simulasi." }]),
        format: "ANALYSIS",
        status: "PUBLISHED",
        publishedAt: new Date("2026-11-04T12:00:00Z"),
        deskId: testDeskId,
        topics: "[]",
        entities: "[]",
        centralQuestion: null,
        editorialAngle: null,
        metadataStatus: "unverified",
      },
    });
    createdArticleIds.push(artDry.id);

    const drySummary = await runEditorialBackfill({
      prismaClient: db,
      articleId: artDry.id,
      dryRun: true,
    });

    expect(drySummary.updatedCount).toBe(1);
    expect(drySummary.results[0].status).toBe("updated");
    expect(drySummary.results[0].extracted.topics).toBeDefined();

    // Pastikan basis data sama sekali tidak berubah saat dryRun
    const dryCheck = await db.article.findUniqueOrThrow({
      where: { id: artDry.id },
    });
    expect(dryCheck.topics).toBe("[]");
    expect(dryCheck.entities).toBe("[]");
    expect(dryCheck.centralQuestion).toBeNull();
    expect(dryCheck.editorialAngle).toBeNull();
  });
});

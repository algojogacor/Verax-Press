/**
 * Verax Editorial Intelligence (VEI) API — Independent Verification Test Suite
 *
 * Requirements verified:
 * 1. Publication Isolation (Most Critical):
 *    - Articles for EVERY status: PUBLISHED, CORRECTED, DRAFT, PENDING_REVIEW,
 *      FACT_CHECK, REVISION_NEEDED, PENDING_APPROVAL, REJECTED, WITHDRAWN,
 *      RETRACTED, ARCHIVED, plus PUBLISHED/CORRECTED with publishedAt: null.
 *    - Verify ONLY PUBLISHED and CORRECTED (with publishedAt != null) appear in
 *      GET search and POST check responses.
 * 2. Auth Isolation:
 *    - VERAX_COVERAGE_API_KEY succeeds on search and check.
 *    - VERAX_COVERAGE_API_KEY is rejected (401/403) on /api/internal/v1/ai-submissions.
 *    - Submission API keys (vrtc_...) rejected on search and check.
 *    - Missing or incorrect key rejected with 401 without leaking configuration or expected key.
 *    - Fail-closed when VERAX_COVERAGE_API_KEY is not set.
 * 3. Read-Only Guarantee:
 *    - Calling POST check multiple times does not insert, update, or delete rows in any table.
 * 4. API Contract & Overlap Precision:
 *    - Required fields in search and check responses (articleId, title, desk, topics,
 *      entities, centralQuestion, editorialAngle, metadataStatus, publishedAt, canonicalUrl).
 *    - Zero forbidden fields: NO classification, recommendation, or suggestedAction.
 *    - Multi-article overlap: 5 articles sharing 1 weak entity each do not accumulate into 'high'.
 *    - Invalid query parameters and request bodies return 400 with helpful errors, never 500.
 */

import { test, describe, beforeAll, afterAll, expect } from "bun:test";
import {
  getTestDb,
  DB_URL,
  assertApprovedTestDatabase,
} from "./lib/test-db";
import { GET as coverageSearchGet } from "@/app/api/internal/v1/editorial/coverage/search/route";
import { POST as coverageCheckPost } from "@/app/api/internal/v1/editorial/coverage/check/route";
import { POST as aiSubmissionsPost } from "@/app/api/internal/v1/ai-submissions/route";

const VERIFIER_COVERAGE_KEY = "verax-coverage-test-secret-key-998877";
const ORIGINAL_ENV_KEY = process.env.VERAX_COVERAGE_API_KEY;

describe("Verax Editorial Intelligence (VEI) Independent Verification", () => {
  const db = getTestDb();
  const createdArticleIds: string[] = [];
  let testDeskId: string;

  beforeAll(async () => {
    assertApprovedTestDatabase(DB_URL);
    process.env.VERAX_COVERAGE_API_KEY = VERIFIER_COVERAGE_KEY;

    // Pastikan desk uji stabil tersedia
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

    // Kata kunci penanda khusus untuk isolasi artikel pengujian verifier
    const marker = `verifier-iso-${Date.now()}`;

    // 1. Publikasi Sah: PUBLISHED dengan publishedAt sah
    const artPublished = await db.article.create({
      data: {
        slug: `art-published-${marker}`,
        title: `Artikel Terbit Resmi Pengawasan Peradilan ${marker}`,
        format: "ANALYSIS",
        status: "PUBLISHED",
        deskId: testDeskId,
        publishedAt: new Date("2026-11-01T10:00:00Z"),
        topics: JSON.stringify(["peradilan-bersih", "integritas-hakim", marker]),
        entities: JSON.stringify(["Komisi Yudisial", "Mahkamah Agung", marker]),
        centralQuestion: "Bagaimana reformasi pengawasan internal hakim berjalan?",
        editorialAngle: "Analisis empiris penegakan etik peradilan",
        metadataStatus: "verified",
      },
    });
    createdArticleIds.push(artPublished.id);

    // 2. Publikasi Sah: CORRECTED dengan publishedAt sah
    const artCorrected = await db.article.create({
      data: {
        slug: `art-corrected-${marker}`,
        title: `Artikel Koreksi Terbuka Regulasi Digital ${marker}`,
        format: "EXPLAINER",
        status: "CORRECTED",
        deskId: testDeskId,
        publishedAt: new Date("2026-11-02T12:00:00Z"),
        topics: JSON.stringify(["tata-kelola-data", "koreksi-kebijakan", marker]),
        entities: JSON.stringify(["Kementerian Komdigi", marker]),
        centralQuestion: "Apa saja pasal yang dikoreksi dalam regulasi perlindungan data?",
        editorialAngle: "Penjelasan korektif atas dampak regulasi baru",
        metadataStatus: "verified",
      },
    });
    createdArticleIds.push(artCorrected.id);

    // 3. Status Dilarang: DRAFT (tanpa publishedAt)
    const artDraft = await db.article.create({
      data: {
        slug: `art-draft-${marker}`,
        title: `Draf Naskah Rahasia Belum Terbit ${marker}`,
        format: "NEWS",
        status: "DRAFT",
        deskId: testDeskId,
        publishedAt: null,
        topics: JSON.stringify(["peradilan-bersih", marker]),
        entities: JSON.stringify(["Komisi Yudisial", marker]),
        centralQuestion: "Apakah investigasi draf akan diterbitkan?",
        editorialAngle: "Draf awal belum final",
        metadataStatus: "unverified",
      },
    });
    createdArticleIds.push(artDraft.id);

    // 4. Status Dilarang: PENDING_REVIEW
    const artPendingReview = await db.article.create({
      data: {
        slug: `art-pending-review-${marker}`,
        title: `Naskah Menunggu Peninjauan Editor ${marker}`,
        format: "NEWS",
        status: "PENDING_REVIEW",
        deskId: testDeskId,
        publishedAt: new Date("2026-11-03T08:00:00Z"),
        topics: JSON.stringify(["peradilan-bersih", marker]),
        entities: JSON.stringify(["Komisi Yudisial", marker]),
        metadataStatus: "unverified",
      },
    });
    createdArticleIds.push(artPendingReview.id);

    // 5. Status Dilarang: FACT_CHECK
    const artFactCheck = await db.article.create({
      data: {
        slug: `art-fact-check-${marker}`,
        title: `Naskah Dalam Proses Uji Fakta ${marker}`,
        format: "NEWS",
        status: "FACT_CHECK",
        deskId: testDeskId,
        publishedAt: new Date("2026-11-03T09:00:00Z"),
        topics: JSON.stringify(["peradilan-bersih", marker]),
        entities: JSON.stringify(["Komisi Yudisial", marker]),
        metadataStatus: "unverified",
      },
    });
    createdArticleIds.push(artFactCheck.id);

    // 6. Status Dilarang: REVISION_NEEDED
    const artRevisionNeeded = await db.article.create({
      data: {
        slug: `art-revision-needed-${marker}`,
        title: `Naskah Membutuhkan Revisi Lapangan ${marker}`,
        format: "NEWS",
        status: "REVISION_NEEDED",
        deskId: testDeskId,
        publishedAt: new Date("2026-11-03T10:00:00Z"),
        topics: JSON.stringify(["peradilan-bersih", marker]),
        entities: JSON.stringify(["Komisi Yudisial", marker]),
        metadataStatus: "unverified",
      },
    });
    createdArticleIds.push(artRevisionNeeded.id);

    // 7. Status Dilarang: PENDING_APPROVAL
    const artPendingApproval = await db.article.create({
      data: {
        slug: `art-pending-approval-${marker}`,
        title: `Naskah Menunggu Persetujuan Chief Editor ${marker}`,
        format: "NEWS",
        status: "PENDING_APPROVAL",
        deskId: testDeskId,
        publishedAt: new Date("2026-11-03T11:00:00Z"),
        topics: JSON.stringify(["peradilan-bersih", marker]),
        entities: JSON.stringify(["Komisi Yudisial", marker]),
        metadataStatus: "unverified",
      },
    });
    createdArticleIds.push(artPendingApproval.id);

    // 8. Status Dilarang: REJECTED
    const artRejected = await db.article.create({
      data: {
        slug: `art-rejected-${marker}`,
        title: `Naskah Ditolak Dewan Redaksi ${marker}`,
        format: "NEWS",
        status: "REJECTED",
        deskId: testDeskId,
        publishedAt: new Date("2026-11-03T12:00:00Z"),
        topics: JSON.stringify(["peradilan-bersih", marker]),
        entities: JSON.stringify(["Komisi Yudisial", marker]),
        metadataStatus: "unverified",
      },
    });
    createdArticleIds.push(artRejected.id);

    // 9. Status Dilarang: WITHDRAWN
    const artWithdrawn = await db.article.create({
      data: {
        slug: `art-withdrawn-${marker}`,
        title: `Naskah Ditarik Penulis Sebelum Terbit ${marker}`,
        format: "NEWS",
        status: "WITHDRAWN",
        deskId: testDeskId,
        publishedAt: new Date("2026-11-03T13:00:00Z"),
        topics: JSON.stringify(["peradilan-bersih", marker]),
        entities: JSON.stringify(["Komisi Yudisial", marker]),
        metadataStatus: "unverified",
      },
    });
    createdArticleIds.push(artWithdrawn.id);

    // 10. Status Dilarang: RETRACTED
    const artRetracted = await db.article.create({
      data: {
        slug: `art-retracted-${marker}`,
        title: `Naskah Retraksi Karena Masalah Kredibilitas ${marker}`,
        format: "NEWS",
        status: "RETRACTED",
        deskId: testDeskId,
        publishedAt: new Date("2026-11-03T14:00:00Z"),
        topics: JSON.stringify(["peradilan-bersih", marker]),
        entities: JSON.stringify(["Komisi Yudisial", marker]),
        metadataStatus: "unverified",
      },
    });
    createdArticleIds.push(artRetracted.id);

    // 11. Status Dilarang: ARCHIVED
    const artArchived = await db.article.create({
      data: {
        slug: `art-archived-${marker}`,
        title: `Naskah Telah Diarsipkan Non-Publik ${marker}`,
        format: "NEWS",
        status: "ARCHIVED",
        deskId: testDeskId,
        publishedAt: new Date("2026-11-03T15:00:00Z"),
        topics: JSON.stringify(["peradilan-bersih", marker]),
        entities: JSON.stringify(["Komisi Yudisial", marker]),
        metadataStatus: "unverified",
      },
    });
    createdArticleIds.push(artArchived.id);

    // 12. Cacat Publikasi: PUBLISHED tetapi publishedAt null
    const artPublishedNoDate = await db.article.create({
      data: {
        slug: `art-pub-nodate-${marker}`,
        title: `Artikel Status Terbit Tetapi Tanggal Publikasi Kosong ${marker}`,
        format: "NEWS",
        status: "PUBLISHED",
        deskId: testDeskId,
        publishedAt: null,
        topics: JSON.stringify(["peradilan-bersih", marker]),
        entities: JSON.stringify(["Komisi Yudisial", marker]),
        metadataStatus: "unverified",
      },
    });
    createdArticleIds.push(artPublishedNoDate.id);

    // 13. Cacat Publikasi: CORRECTED tetapi publishedAt null
    const artCorrectedNoDate = await db.article.create({
      data: {
        slug: `art-corr-nodate-${marker}`,
        title: `Artikel Status Koreksi Tetapi Tanggal Publikasi Kosong ${marker}`,
        format: "NEWS",
        status: "CORRECTED",
        deskId: testDeskId,
        publishedAt: null,
        topics: JSON.stringify(["peradilan-bersih", marker]),
        entities: JSON.stringify(["Komisi Yudisial", marker]),
        metadataStatus: "unverified",
      },
    });
    createdArticleIds.push(artCorrectedNoDate.id);
  });

  afterAll(async () => {
    // Kembalikan variabel lingkungan
    if (ORIGINAL_ENV_KEY !== undefined) {
      process.env.VERAX_COVERAGE_API_KEY = ORIGINAL_ENV_KEY;
    } else {
      delete process.env.VERAX_COVERAGE_API_KEY;
    }

    // Bersihkan semua artikel uji
    if (createdArticleIds.length > 0) {
      await db.article.deleteMany({
        where: { id: { in: createdArticleIds } },
      });
    }
  });

  // =========================================================================
  // 1. PUBLICATION ISOLATION (Most Critical)
  // =========================================================================
  describe("1. Publication Isolation", () => {
    test("GET /search hanya mengembalikan artikel berstatus PUBLISHED atau CORRECTED dengan publishedAt valid", async () => {
      const req = new Request(
        `http://localhost/api/internal/v1/editorial/coverage/search?q=verifier-iso&limit=100`,
        {
          headers: {
            authorization: `Bearer ${VERIFIER_COVERAGE_KEY}`,
          },
        },
      );

      const res = await coverageSearchGet(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(Array.isArray(json.data)).toBe(true);

      // Hanya 2 artikel yang sah: PUBLISHED (artPublished) dan CORRECTED (artCorrected)
      expect(json.data.length).toBe(2);

      const returnedStatuses = json.data.map((a: any) => a.status);
      expect(returnedStatuses).toContain("PUBLISHED");
      expect(returnedStatuses).toContain("CORRECTED");

      // Pastikan seluruh status dilarang TIDAK PERNAH muncul
      const forbiddenStatuses = [
        "DRAFT",
        "PENDING_REVIEW",
        "FACT_CHECK",
        "REVISION_NEEDED",
        "PENDING_APPROVAL",
        "REJECTED",
        "WITHDRAWN",
        "RETRACTED",
        "ARCHIVED",
      ];
      for (const status of forbiddenStatuses) {
        expect(returnedStatuses).not.toContain(status);
      }

      // Pastikan setiap artikel yang kembali memiliki publishedAt tidak null
      for (const item of json.data) {
        expect(item.publishedAt).not.toBeNull();
        expect(typeof item.publishedAt).toBe("string");
      }
    });

    test("POST /check sama sekali tidak mencocokkan artikel non-terpublikasi (DRAFT, PENDING_*, ARCHIVED, dll)", async () => {
      // Usulkan topik dan entitas yang ada di artikel DRAFT dan ARCHIVED
      const req = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/check",
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${VERIFIER_COVERAGE_KEY}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            proposedTitle: "Draf Naskah Rahasia Belum Terbit verifier-iso",
            topic: ["peradilan-bersih"],
            entities: ["Komisi Yudisial"],
          }),
        },
      );

      const res = await coverageCheckPost(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(Array.isArray(json.matches)).toBe(true);

      // Cari artikel non-terpublikasi di daftar matches
      const nonPublishedIds = createdArticleIds.slice(2); // ID artikel 3 sampai 13 (semua non-terbit)
      for (const match of json.matches) {
        expect(nonPublishedIds).not.toContain(match.articleId);
      }

      // Artikel yang cocok hanya boleh artikel terbit yang sah (artPublished)
      const matchedIds = json.matches.map((m: any) => m.articleId);
      expect(matchedIds).toContain(createdArticleIds[0]); // artPublished
    });
  });

  // =========================================================================
  // 2. AUTH ISOLATION
  // =========================================================================
  describe("2. Auth Isolation", () => {
    test("VERAX_COVERAGE_API_KEY berhasil pada GET search dan POST check via Bearer", async () => {
      const searchReq = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/search?limit=1",
        {
          headers: { authorization: `Bearer ${VERIFIER_COVERAGE_KEY}` },
        },
      );
      const searchRes = await coverageSearchGet(searchReq);
      expect(searchRes.status).toBe(200);

      const checkReq = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/check",
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${VERIFIER_COVERAGE_KEY}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            proposedTitle: "Uji Validitas Kunci Coverage",
            topic: ["hukum"],
            entities: ["Mahkamah"],
          }),
        },
      );
      const checkRes = await coverageCheckPost(checkReq);
      expect(checkRes.status).toBe(200);
    });

    test("VERAX_COVERAGE_API_KEY berhasil pada GET search dan POST check via X-API-Key", async () => {
      const searchReq = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/search?limit=1",
        {
          headers: { "x-api-key": VERIFIER_COVERAGE_KEY },
        },
      );
      const searchRes = await coverageSearchGet(searchReq);
      expect(searchRes.status).toBe(200);

      const checkReq = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/check",
        {
          method: "POST",
          headers: {
            "x-api-key": VERIFIER_COVERAGE_KEY,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            proposedTitle: "Uji Validitas Kunci Coverage via X-API-Key",
          }),
        },
      );
      const checkRes = await coverageCheckPost(checkReq);
      expect(checkRes.status).toBe(200);
    });

    test("VERAX_COVERAGE_API_KEY DITOLAK (401/403) saat mengakses /api/internal/v1/ai-submissions", async () => {
      const req = new Request(
        "http://localhost/api/internal/v1/ai-submissions",
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${VERIFIER_COVERAGE_KEY}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            title: "Percobaan Penyerobotan Ingestion Menggunakan Kunci Coverage",
            format: "NEWS",
          }),
        },
      );

      const res = await aiSubmissionsPost(req);
      // Ingestion API memerlukan format clientId.clientSecret (scope submit)
      expect([401, 403]).toContain(res.status);

      const json = await res.json();
      expect(json.error).toBeDefined();
      // Pastikan kunci coverage tidak bocor di pesan galat
      expect(JSON.stringify(json)).not.toContain(VERIFIER_COVERAGE_KEY);
    });

    test("Kredensial Submission (vrtc_...) DITOLAK pada GET search dan POST check", async () => {
      const submissionKey = "vrtc_demo_client_secret_999";

      const searchReq = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/search",
        {
          headers: { authorization: `Bearer ${submissionKey}` },
        },
      );
      const searchRes = await coverageSearchGet(searchReq);
      expect(searchRes.status).toBe(403);
      const searchJson = await searchRes.json();
      expect(searchJson.code).toBe("FORBIDDEN_SCOPE");

      const checkReq = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/check",
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${submissionKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ proposedTitle: "Percobaan dengan Kunci Submission" }),
        },
      );
      const checkRes = await coverageCheckPost(checkReq);
      expect(checkRes.status).toBe(403);
      const checkJson = await checkRes.json();
      expect(checkJson.code).toBe("FORBIDDEN_SCOPE");
    });

    test("Permintaan tanpa kunci atau dengan kunci salah ditolak 401 tanpa membocorkan kunci yang diharapkan", async () => {
      // 1. Tanpa header
      const noAuthReq = new Request("http://localhost/api/internal/v1/editorial/coverage/search");
      const noAuthRes = await coverageSearchGet(noAuthReq);
      expect(noAuthRes.status).toBe(401);
      const noAuthJson = await noAuthRes.json();
      expect(noAuthJson.code).toBe("UNAUTHORIZED");
      expect(JSON.stringify(noAuthJson)).not.toContain(VERIFIER_COVERAGE_KEY);

      // 2. Kunci salah
      const wrongKeyReq = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/search",
        {
          headers: { authorization: "Bearer invalid-wrong-key-secret" },
        },
      );
      const wrongKeyRes = await coverageSearchGet(wrongKeyReq);
      expect(wrongKeyRes.status).toBe(401);
      const wrongKeyJson = await wrongKeyRes.json();
      expect(wrongKeyJson.code).toBe("UNAUTHORIZED");
      expect(JSON.stringify(wrongKeyJson)).not.toContain(VERIFIER_COVERAGE_KEY);
    });

    test("Fail-closed: Jika variabel VERAX_COVERAGE_API_KEY tidak disetel di server, permintaan ditolak 401", async () => {
      delete process.env.VERAX_COVERAGE_API_KEY;

      const req = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/search",
        {
          headers: { authorization: `Bearer ${VERIFIER_COVERAGE_KEY}` },
        },
      );
      const res = await coverageSearchGet(req);
      expect(res.status).toBe(401);

      // Pulihkan kunci untuk pengujian selanjutnya
      process.env.VERAX_COVERAGE_API_KEY = VERIFIER_COVERAGE_KEY;
    });
  });

  // =========================================================================
  // 3. READ-ONLY GUARANTEE
  // =========================================================================
  describe("3. Read-Only Guarantee", () => {
    test("POST /check dieksekusi berulang kali dengan berbagai payload: nol mutasi di seluruh tabel basis data", async () => {
      // Snapshot jumlah baris di seluruh tabel terkait
      const countSnapshot = async () => ({
        article: await db.article.count(),
        articleVersion: await db.articleVersion.count(),
        auditEvent: await db.auditEvent.count(),
        desk: await db.desk.count(),
        staffUser: await db.staffUser.count(),
        submission: await db.submission.count(),
        sourceReference: await db.sourceReference.count(),
        apiRequestLog: await db.apiRequestLog.count(),
        apiClient: await db.apiClient.count(),
        apiClientCredential: await db.apiClientCredential.count(),
        reviewComment: await db.reviewComment.count(),
        editorialReview: await db.editorialReview.count(),
        articleContribution: await db.articleContribution.count(),
        complaint: await db.complaint.count(),
      });

      const before = await countSnapshot();

      // Eksekusi panggilan berulang dengan muatan beragam
      const testPayloads = [
        // 1. Payload cocok persis (high overlap)
        {
          proposedTitle: "Artikel Terbit Resmi Pengawasan Peradilan",
          topic: ["peradilan-bersih", "integritas-hakim"],
          entities: ["Komisi Yudisial", "Mahkamah Agung"],
          centralQuestion: "Bagaimana reformasi pengawasan?",
          proposedAngle: "Analisis empiris",
        },
        // 2. Payload cocok sebagian (partial overlap)
        {
          proposedTitle: "Transformasi Digital Lembaga Publik",
          topic: ["tata-kelola-data"],
          entities: ["Bappenas"],
        },
        // 3. Payload tanpa irisan (none overlap)
        {
          proposedTitle: "Konservasi Hayati Satwa Langka",
          topic: ["keanekaragaman-hayati"],
          entities: ["Taman Nasional Ujung Kulon"],
        },
        // 4. Payload kosong
        {},
        // 5. Payload dengan entitas array object
        {
          proposedTitle: "Ekosistem AI Terbuka",
          topic: "ai",
          entities: [{ name: "OpenAI" }, { name: "Komisi Yudisial" }],
        },
      ];

      for (const payload of testPayloads) {
        const req = new Request(
          "http://localhost/api/internal/v1/editorial/coverage/check",
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${VERIFIER_COVERAGE_KEY}`,
              "content-type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        );
        const res = await coverageCheckPost(req);
        expect(res.status).toBe(200);
      }

      const after = await countSnapshot();

      // Verifikasi seluruh tabel sama persis jumlah barisnya
      expect(after.article).toBe(before.article);
      expect(after.articleVersion).toBe(before.articleVersion);
      expect(after.auditEvent).toBe(before.auditEvent);
      expect(after.desk).toBe(before.desk);
      expect(after.staffUser).toBe(before.staffUser);
      expect(after.submission).toBe(before.submission);
      expect(after.sourceReference).toBe(before.sourceReference);
      expect(after.apiRequestLog).toBe(before.apiRequestLog);
      expect(after.apiClient).toBe(before.apiClient);
      expect(after.apiClientCredential).toBe(before.apiClientCredential);
      expect(after.reviewComment).toBe(before.reviewComment);
      expect(after.editorialReview).toBe(before.editorialReview);
      expect(after.articleContribution).toBe(before.articleContribution);
      expect(after.complaint).toBe(before.complaint);
    });
  });

  // =========================================================================
  // 4. API CONTRACT & OVERLAP PRECISION
  // =========================================================================
  describe("4. API Contract & Overlap Precision", () => {
    test("Kontrak respons GET /search memuat semua bidang wajib dan bebas bidang terlarang", async () => {
      const req = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/search?q=Pengawasan&limit=10",
        {
          headers: { authorization: `Bearer ${VERIFIER_COVERAGE_KEY}` },
        },
      );
      const res = await coverageSearchGet(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.length).toBeGreaterThanOrEqual(1);

      const requiredFields = [
        "articleId",
        "title",
        "desk",
        "topics",
        "entities",
        "centralQuestion",
        "editorialAngle",
        "metadataStatus",
        "publishedAt",
        "canonicalUrl",
      ];

      for (const item of json.data) {
        for (const field of requiredFields) {
          expect(item[field] !== undefined).toBe(true);
        }

        // Pastikan TIDAK ADA bidang klasifikasi atau rekomendasi tindakan
        expect(item.classification).toBeUndefined();
        expect(item.recommendation).toBeUndefined();
        expect(item.suggestedAction).toBeUndefined();
      }

      // Pastikan metadata paginasi lengkap
      expect(json.pagination).toBeDefined();
      expect(typeof json.pagination.total).toBe("number");
      expect(typeof json.pagination.hasMore).toBe("boolean");
    });

    test("Kontrak respons POST /check memuat bidang wajib di matches dan bebas bidang terlarang", async () => {
      const req = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/check",
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${VERIFIER_COVERAGE_KEY}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            proposedTitle: "Analisis Etik Pengawasan Peradilan",
            topic: ["peradilan-bersih"],
            entities: ["Komisi Yudisial"],
          }),
        },
      );
      const res = await coverageCheckPost(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(["none", "partial", "high"]).toContain(json.overlapLevel);
      expect(Array.isArray(json.matches)).toBe(true);
      expect(json.matches.length).toBeGreaterThanOrEqual(1);

      // Verifikasi tingkat teratas BEBAS bidang terlarang
      expect(json.classification).toBeUndefined();
      expect(json.recommendation).toBeUndefined();
      expect(json.suggestedAction).toBeUndefined();

      const requiredMatchFields = [
        "articleId",
        "title",
        "desk",
        "topics",
        "entities",
        "centralQuestion",
        "editorialAngle",
        "metadataStatus",
        "publishedAt",
        "canonicalUrl",
        "overlapLevel",
        "matchedTopics",
        "matchedEntities",
      ];

      for (const match of json.matches) {
        for (const field of requiredMatchFields) {
          expect(match[field] !== undefined).toBe(true);
        }

        // Verifikasi pada setiap match BEBAS bidang terlarang
        expect(match.classification).toBeUndefined();
        expect(match.recommendation).toBeUndefined();
        expect(match.suggestedAction).toBeUndefined();
      }
    });

    test("Uji Multi-Artikel: 5 artikel masing-masing hanya berbagi 1 entitas lemah TIDAK BOLEH menjadi high", async () => {
      // Buat 5 artikel terbit berbeda, masing-masing berbagi 1 entitas lemah dengan usulan
      const multiMarker = `multi-weak-${Date.now()}`;
      const weakArticleIds: string[] = [];

      const weakEntities = [
        `Kementerian BUMN ${multiMarker}`,
        `Badan Pengawas Obat ${multiMarker}`,
        `Otoritas Jasa Keuangan ${multiMarker}`,
        `Lembaga Penjamin Simpanan ${multiMarker}`,
        `Komisi Pengawas Persaingan Usaha ${multiMarker}`,
      ];

      for (let i = 0; i < 5; i++) {
        const art = await db.article.create({
          data: {
            slug: `art-weak-${i}-${multiMarker}`,
            title: `Laporan Tahunan Kinerja Lembaga Sektor ${i} ${multiMarker}`,
            format: "NEWS",
            status: "PUBLISHED",
            deskId: testDeskId,
            publishedAt: new Date(`2026-11-0${i + 1}T08:00:00Z`),
            topics: JSON.stringify([`topik-independen-${i}`]),
            entities: JSON.stringify([weakEntities[i]]),
            centralQuestion: `Bagaimana efisiensi anggaran lembaga sektor ${i}?`,
            editorialAngle: `Tinjauan anggaran lembaga independen`,
            metadataStatus: "verified",
          },
        });
        weakArticleIds.push(art.id);
        createdArticleIds.push(art.id);
      }

      // Usulan artikel memuat kelima entitas lemah tersebut + topik dan judul berbeda
      const req = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/check",
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${VERIFIER_COVERAGE_KEY}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            proposedTitle: `Analisis Tata Kelola Entitas Lembaga Nasional ${multiMarker}`,
            topics: ["tata-kelola-kelembagaan", "reformasi-birokrasi"],
            entities: weakEntities,
          }),
        },
      );

      const res = await coverageCheckPost(req);
      expect(res.status).toBe(200);

      const json = await res.json();

      // Kelima artikel harus terdeteksi sebagai kecocokan parsial (partial), BUKAN high
      const weakMatches = json.matches.filter((m: any) => weakArticleIds.includes(m.articleId));
      expect(weakMatches.length).toBe(5);

      for (const m of weakMatches) {
        expect(m.overlapLevel).toBe("partial");
        expect(m.matchedEntities.length).toBe(1);
      }

      // Overlap tingkat atas (top-level) HARUS partial, BUKAN high
      // Ini membuktikan perhitungan overlap dihitung per artikel (aturan MAX) dan tidak diakumulasi
      expect(json.overlapLevel).toBe("partial");
    });

    test("Parameter query atau body tidak valid mengembalikan 400 dengan pesan bermanfaat, tidak crash 500", async () => {
      // 1. GET search dengan limit bukan angka
      const badLimitReq = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/search?limit=bukan_angka",
        {
          headers: { authorization: `Bearer ${VERIFIER_COVERAGE_KEY}` },
        },
      );
      const badLimitRes = await coverageSearchGet(badLimitReq);
      expect(badLimitRes.status).toBe(400);
      const badLimitJson = await badLimitRes.json();
      expect(badLimitJson.code).toBe("INVALID_PARAMETER");
      expect(badLimitJson.error).toContain("limit");

      // 2. GET search dengan limit negatif
      const negLimitReq = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/search?limit=-10",
        {
          headers: { authorization: `Bearer ${VERIFIER_COVERAGE_KEY}` },
        },
      );
      const negLimitRes = await coverageSearchGet(negLimitReq);
      expect(negLimitRes.status).toBe(400);

      // 3. GET search dengan tanggal from cacat
      const badFromReq = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/search?from=bukan-tanggal-valid",
        {
          headers: { authorization: `Bearer ${VERIFIER_COVERAGE_KEY}` },
        },
      );
      const badFromRes = await coverageSearchGet(badFromReq);
      expect(badFromRes.status).toBe(400);
      const badFromJson = await badFromRes.json();
      expect(badFromJson.code).toBe("INVALID_PARAMETER");
      expect(badFromJson.error).toContain("from");

      // 4. GET search dengan tanggal to cacat
      const badToReq = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/search?to=99-99-9999-salah",
        {
          headers: { authorization: `Bearer ${VERIFIER_COVERAGE_KEY}` },
        },
      );
      const badToRes = await coverageSearchGet(badToReq);
      expect(badToRes.status).toBe(400);
      const badToJson = await badToRes.json();
      expect(badToJson.code).toBe("INVALID_PARAMETER");
      expect(badToJson.error).toContain("to");

      // 5. GET search dengan cursor palsu yang tidak ada
      const badCursorReq = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/search?cursor=cuid_palsu_tidak_ada_999",
        {
          headers: { authorization: `Bearer ${VERIFIER_COVERAGE_KEY}` },
        },
      );
      const badCursorRes = await coverageSearchGet(badCursorReq);
      expect(badCursorRes.status).toBe(400);
      const badCursorJson = await badCursorRes.json();
      expect(badCursorJson.code).toBe("INVALID_CURSOR");

      // 6. POST check dengan body format JSON rusak
      const malformedJsonReq = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/check",
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${VERIFIER_COVERAGE_KEY}`,
            "content-type": "application/json",
          },
          body: "{ this is broken json :: -- ",
        },
      );
      const malformedJsonRes = await coverageCheckPost(malformedJsonReq);
      expect(malformedJsonRes.status).toBe(400);
      const malformedJson = await malformedJsonRes.json();
      expect(malformedJson.code).toBe("INVALID_JSON");

      // 7. POST check dengan tipe payload tidak sah (bukan objek / tipe data keliru)
      const invalidTypeReq = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/check",
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${VERIFIER_COVERAGE_KEY}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            proposedTitle: 1234567, // seharusnya string
          }),
        },
      );
      const invalidTypeRes = await coverageCheckPost(invalidTypeReq);
      expect(invalidTypeRes.status).toBe(400);
      const invalidTypeJson = await invalidTypeRes.json();
      expect(invalidTypeJson.code).toBe("VALIDATION_ERROR");
    });
  });
});

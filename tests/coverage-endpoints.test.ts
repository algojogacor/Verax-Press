// Test suite untuk Fase 2: Verax Editorial Intelligence (VEI) API endpoints and shared libraries.
// Menguji autentikasi cakupan (coverage:read), predikat artikel terpublikasi,
// normalisasi teks, kalkulasi deterministik overlap level (aturan MAX),
// serta endpoint HTTP internal GET /search dan POST /check.

import { test, describe, beforeAll, afterAll, expect } from "bun:test";
import { getTestDb, DB_URL, assertApprovedTestDatabase } from "./lib/test-db";
import {
  verifyEditorialCoverageAuth,
  enforceEditorialCoverageAuth,
  extractCoverageApiKey,
} from "@/lib/editorial-auth";
import {
  isPublishedArticle,
  PUBLISHED_ARTICLE_FILTER,
  PUBLISHED_ARTICLE_STATUSES,
  resolveArticleCanonicalUrl,
  safeParseJsonArray,
  normalizeText,
  COMMON_STOPWORDS,
  termsMatch,
  calculateTitleOverlapRatio,
  evaluateArticleOverlap,
  getMaxOverlapLevel,
  calculateEditorialCoverage,
  type CoverageMatch,
} from "@/lib/domain/coverage";
import { GET as coverageSearchGet } from "@/app/api/internal/v1/editorial/coverage/search/route";
import { POST as coverageCheckPost } from "@/app/api/internal/v1/editorial/coverage/check/route";

const TEST_COVERAGE_KEY = "test-coverage-api-key-secure-random-2026";
const ORIGINAL_ENV_KEY = process.env.VERAX_COVERAGE_API_KEY;

describe("Phase 2: Verax Editorial Intelligence (VEI)", () => {
  const db = getTestDb();
  const createdArticleIds: string[] = [];

  beforeAll(async () => {
    assertApprovedTestDatabase(DB_URL);
    process.env.VERAX_COVERAGE_API_KEY = TEST_COVERAGE_KEY;

    // Pastikan desk uji tersedia
    await db.desk.upsert({
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

    await db.desk.upsert({
      where: { slug: "teknologi-kebijakan" },
      update: { name: "Teknologi & Kebijakan", isActive: true },
      create: {
        slug: "teknologi-kebijakan",
        name: "Teknologi & Kebijakan",
        description: "AI, inovasi digital, regulasi teknologi.",
        sortOrder: 2,
        isActive: true,
      },
    });

    const hukumDesk = await db.desk.findUniqueOrThrow({ where: { slug: "hukum-keadilan" } });
    const teknoDesk = await db.desk.findUniqueOrThrow({ where: { slug: "teknologi-kebijakan" } });

    // Seed artikel terbit 1: PUBLISHED
    const art1 = await db.article.create({
      data: {
        slug: `vei-uji-publikasi-1-${Date.now()}`,
        title: "Reformasi Pengawasan Peradilan dan Akuntabilitas Hakim",
        format: "ANALYSIS",
        status: "PUBLISHED",
        deskId: hukumDesk.id,
        publishedAt: new Date("2026-11-01T10:00:00Z"),
        topics: JSON.stringify(["reformasi-peradilan", "transparansi", "pengawasan-hakim"]),
        entities: JSON.stringify(["Mahkamah Agung", "Komisi Yudisial"]),
        centralQuestion: "Bagaimana efektivitas sanksi etik terhadap integritas putusan hakim?",
        editorialAngle: "Analisis data kepatuhan kode etik hakim lima tahun terakhir",
        metadataStatus: "verified",
      },
    });
    createdArticleIds.push(art1.id);

    // Seed artikel terbit 2: CORRECTED (sah sebagai terbit)
    const art2 = await db.article.create({
      data: {
        slug: `vei-uji-koreksi-2-${Date.now()}`,
        title: "Regulasi Tata Kelola Kecerdasan Buatan Nasional",
        format: "EXPLAINER",
        status: "CORRECTED",
        deskId: teknoDesk.id,
        publishedAt: new Date("2026-11-05T12:00:00Z"),
        topics: JSON.stringify(["kecerdasan-buatan", "etika-ai", "tata-kelola-data"]),
        entities: JSON.stringify(["Kementerian Komdigi", "BSSN"]),
        centralQuestion: "Apakah pedoman etika AI mengikat penyedia model bahasa besar?",
        editorialAngle: "Tinjauan kepatuhan industri teknologi terhadap surat edaran kementerian",
        metadataStatus: "verified",
      },
    });
    createdArticleIds.push(art2.id);

    // Seed artikel non-terbit (DRAFT): dilarang masuk hasil coverage
    const draftArt = await db.article.create({
      data: {
        slug: `vei-uji-draft-${Date.now()}`,
        title: "Draf Investigasi Dugaan Suap Perkara Perdata",
        format: "NEWS",
        status: "DRAFT",
        deskId: hukumDesk.id,
        publishedAt: null,
        topics: JSON.stringify(["reformasi-peradilan", "suap", "pengadilan"]),
        entities: JSON.stringify(["Mahkamah Agung", "KPK"]),
        centralQuestion: "Bagaimana aliran dana putusan kasasi?",
        editorialAngle: "Investigasi transaksi mencurigakan",
        metadataStatus: "unverified",
      },
    });
    createdArticleIds.push(draftArt.id);

    // Seed artikel RETRACTED: dilarang masuk hasil coverage
    const retractedArt = await db.article.create({
      data: {
        slug: `vei-uji-retracted-${Date.now()}`,
        title: "Berita Ditarik Soal Konflik Kepentingan Pejabat",
        format: "NEWS",
        status: "RETRACTED",
        deskId: hukumDesk.id,
        publishedAt: new Date("2026-10-01T08:00:00Z"),
        topics: JSON.stringify(["konflik-kepentingan", "etika"]),
        entities: JSON.stringify(["Mahkamah Agung"]),
        metadataStatus: "unverified",
      },
    });
    createdArticleIds.push(retractedArt.id);

    // Seed artikel PUBLISHED tetapi publishedAt null (cacat, dilarang masuk)
    const invalidPublishedArt = await db.article.create({
      data: {
        slug: `vei-uji-null-publishedat-${Date.now()}`,
        title: "Artikel Status Terbit Tanpa Tanggal Publikasi",
        format: "NEWS",
        status: "PUBLISHED",
        deskId: hukumDesk.id,
        publishedAt: null,
        topics: JSON.stringify(["reformasi-peradilan"]),
        entities: JSON.stringify(["Mahkamah Agung"]),
        metadataStatus: "unverified",
      },
    });
    createdArticleIds.push(invalidPublishedArt.id);
  });

  afterAll(async () => {
    // Pulihkan variabel lingkungan
    if (ORIGINAL_ENV_KEY !== undefined) {
      process.env.VERAX_COVERAGE_API_KEY = ORIGINAL_ENV_KEY;
    } else {
      delete process.env.VERAX_COVERAGE_API_KEY;
    }

    // Bersihkan artikel uji
    if (createdArticleIds.length > 0) {
      await db.article.deleteMany({
        where: { id: { in: createdArticleIds } },
      });
    }
  });

  describe("1. Autentikasi API Coverage (src/lib/editorial-auth.ts)", () => {
    test("Mengekstrak kunci dari Authorization Bearer secara benar", () => {
      const req = new Request("http://localhost/api", {
        headers: { authorization: `Bearer ${TEST_COVERAGE_KEY}` },
      });
      const { key, source } = extractCoverageApiKey(req);
      expect(key).toBe(TEST_COVERAGE_KEY);
      expect(source).toBe("bearer");
    });

    test("Mengekstrak kunci dari X-API-Key secara benar", () => {
      const req = new Request("http://localhost/api", {
        headers: { "x-api-key": TEST_COVERAGE_KEY },
      });
      const { key, source } = extractCoverageApiKey(req);
      expect(key).toBe(TEST_COVERAGE_KEY);
      expect(source).toBe("x-api-key");
    });

    test("Menolak permintaan tanpa kunci dengan status 401 UNAUTHORIZED", () => {
      const req = new Request("http://localhost/api");
      const res = verifyEditorialCoverageAuth(req);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.status).toBe(401);
        expect(res.errorCode).toBe("UNAUTHORIZED");
        expect(res.errorMessage).toBe("Kredensial API coverage diperlukan.");
      }
    });

    test("Menolak kunci salah dengan status 401 UNAUTHORIZED", () => {
      const req = new Request("http://localhost/api", {
        headers: { authorization: "Bearer invalid-secret-token" },
      });
      const res = verifyEditorialCoverageAuth(req);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.status).toBe(401);
        expect(res.errorCode).toBe("UNAUTHORIZED");
        expect(res.errorMessage).toBe("Kredensial API tidak valid.");
      }
    });

    test("Menolak kredensial submission (vrtc_...) dengan status 403 FORBIDDEN_SCOPE", () => {
      const reqBearer = new Request("http://localhost/api", {
        headers: { authorization: "Bearer vrtc_testclient.vrtk_secret" },
      });
      const resBearer = verifyEditorialCoverageAuth(reqBearer);
      expect(resBearer.ok).toBe(false);
      if (!resBearer.ok) {
        expect(resBearer.status).toBe(403);
        expect(resBearer.errorCode).toBe("FORBIDDEN_SCOPE");
        expect(resBearer.errorMessage).toContain("submission");
      }

      const reqHeader = new Request("http://localhost/api", {
        headers: { "x-api-key": "vrtc_client_key" },
      });
      const resHeader = verifyEditorialCoverageAuth(reqHeader);
      expect(resHeader.ok).toBe(false);
      if (!resHeader.ok) {
        expect(resHeader.status).toBe(403);
        expect(resHeader.errorCode).toBe("FORBIDDEN_SCOPE");
      }
    });

    test("Menolak dengan 401 secara aman ketika env VERAX_COVERAGE_API_KEY tidak disetel", () => {
      delete process.env.VERAX_COVERAGE_API_KEY;
      const req = new Request("http://localhost/api", {
        headers: { authorization: `Bearer ${TEST_COVERAGE_KEY}` },
      });
      const res = verifyEditorialCoverageAuth(req);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.status).toBe(401);
        expect(res.errorCode).toBe("UNAUTHORIZED");
      }
      process.env.VERAX_COVERAGE_API_KEY = TEST_COVERAGE_KEY;
    });

    test("Menerima kunci sah baik via Bearer maupun X-API-Key", () => {
      const reqBearer = new Request("http://localhost/api", {
        headers: { authorization: `Bearer ${TEST_COVERAGE_KEY}` },
      });
      const resBearer = verifyEditorialCoverageAuth(reqBearer);
      expect(resBearer.ok).toBe(true);
      if (resBearer.ok) {
        expect(resBearer.scope).toBe("coverage:read");
      }

      const reqHeader = new Request("http://localhost/api", {
        headers: { "x-api-key": TEST_COVERAGE_KEY },
      });
      const resHeader = verifyEditorialCoverageAuth(reqHeader);
      expect(resHeader.ok).toBe(true);
      if (resHeader.ok) {
        expect(resHeader.scope).toBe("coverage:read");
      }
    });

    test("enforceEditorialCoverageAuth mengembalikan NextResponse dengan header x-request-id jika gagal", () => {
      const req = new Request("http://localhost/api");
      const resp = enforceEditorialCoverageAuth(req, "req-test-123");
      expect(resp).not.toBeNull();
      expect(resp?.status).toBe(401);
      expect(resp?.headers.get("x-request-id")).toBe("req-test-123");
    });
  });

  describe("2. Predikat Artikel Terbit & Utilitas Domain (src/lib/domain/coverage.ts)", () => {
    test("isPublishedArticle memvalidasi hanya status PUBLISHED dan CORRECTED dengan publishedAt tidak null", () => {
      const now = new Date();

      expect(isPublishedArticle({ status: "PUBLISHED", publishedAt: now })).toBe(true);
      expect(isPublishedArticle({ status: "CORRECTED", publishedAt: now })).toBe(true);

      // Harus ditolak mutlak jika publishedAt null
      expect(isPublishedArticle({ status: "PUBLISHED", publishedAt: null })).toBe(false);
      expect(isPublishedArticle({ status: "CORRECTED", publishedAt: null })).toBe(false);

      // Status lain wajib ditolak
      const excludedStatuses = [
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

      for (const st of excludedStatuses) {
        expect(isPublishedArticle({ status: st, publishedAt: now })).toBe(false);
      }
    });

    test("PUBLISHED_ARTICLE_FILTER mencakup hanya PUBLISHED dan CORRECTED", () => {
      expect(PUBLISHED_ARTICLE_STATUSES).toEqual(["PUBLISHED", "CORRECTED"]);
      expect(PUBLISHED_ARTICLE_FILTER.status).toEqual({ in: ["PUBLISHED", "CORRECTED"] });
      expect(PUBLISHED_ARTICLE_FILTER.publishedAt).toEqual({ not: null });
    });

    test("resolveArticleCanonicalUrl menghasilkan URL kanonik sesuai standar", () => {
      const url = resolveArticleCanonicalUrl("reformasi-hukum-2026");
      expect(url).toContain("/artikel/reformasi-hukum-2026");
      expect(url.startsWith("https://")).toBe(true);
    });

    test("safeParseJsonArray mengurai berbagai format input secara aman tanpa crash", () => {
      expect(safeParseJsonArray('["hukum", "peradilan"]')).toEqual(["hukum", "peradilan"]);
      expect(safeParseJsonArray("[]")).toEqual([]);
      expect(safeParseJsonArray("")).toEqual([]);
      expect(safeParseJsonArray(null)).toEqual([]);
      expect(safeParseJsonArray(undefined)).toEqual([]);
      expect(safeParseJsonArray(["ai", "teknologi"])).toEqual(["ai", "teknologi"]);
      expect(safeParseJsonArray("hukum, peradilan, tata kelola")).toEqual([
        "hukum",
        "peradilan",
        "tata kelola",
      ]);
      expect(safeParseJsonArray('[{"name": "KPK"}, {"name": "Polri"}]')).toEqual(["KPK", "Polri"]);
      // Malformed json
      expect(safeParseJsonArray("[malformed json string")).toEqual(["[malformed json string"]);
    });

    test("normalizeText dan pembersihan kata henti (stopwords)", () => {
      const raw = "Pengawasan dan Akuntabilitas Hakim di Indonesia!";
      const tokens = normalizeText(raw);
      expect(tokens).toBe("pengawasan dan akuntabilitas hakim di indonesia");

      const stopwords = COMMON_STOPWORDS;
      expect(stopwords.has("dan")).toBe(true);
      expect(stopwords.has("di")).toBe(true);
      expect(stopwords.has("yang")).toBe(true);
      expect(stopwords.has("the")).toBe(true);
    });

    test("termsMatch mendeteksi kesamaan persis maupun tumpang tindih token yang tepat", () => {
      expect(termsMatch("Mahkamah Agung", "Mahkamah Agung")).toBe(true);
      expect(termsMatch("Mahkamah Agung", "mahkamah agung")).toBe(true);
      expect(termsMatch("Mahkamah Agung RI", "Mahkamah Agung")).toBe(true);
      expect(termsMatch("Kecerdasan Buatan", "Etika Kecerdasan Buatan")).toBe(true);
      expect(termsMatch("Kesehatan Masyarakat", "Kementerian Keuangan")).toBe(false);
    });

    test("calculateTitleOverlapRatio menghitung rasio overlap token judul", () => {
      const ratio = calculateTitleOverlapRatio(
        "Reformasi Pengawasan Peradilan Hakim",
        "Pengawasan Peradilan dan Integritas Hakim",
      );
      expect(ratio).toBeGreaterThan(0.5);

      const ratioUnrelated = calculateTitleOverlapRatio(
        "Pertanian Organik di Jawa Tengah",
        "Peluncuran Satelit Telekomunikasi",
      );
      expect(ratioUnrelated).toBe(0);
    });
  });

  describe("3. Kalkulasi Deterministik Overlap Level (Aturan MAX)", () => {
    test("evaluateArticleOverlap memberikan level high jika topik dan entitas sama-sama cocok", () => {
      const level = evaluateArticleOverlap({
        matchedTopics: ["reformasi-peradilan"],
        matchedEntities: ["Mahkamah Agung"],
        proposedTopicsCount: 2,
        proposedEntitiesCount: 2,
        titleOverlapRatio: 0.2,
      });
      expect(level).toBe("high");
    });

    test("evaluateArticleOverlap memberikan level high jika terdapat >= 2 entitas cocok", () => {
      const level = evaluateArticleOverlap({
        matchedTopics: [],
        matchedEntities: ["Mahkamah Agung", "Komisi Yudisial"],
        proposedTopicsCount: 2,
        proposedEntitiesCount: 2,
        titleOverlapRatio: 0,
      });
      expect(level).toBe("high");
    });

    test("evaluateArticleOverlap memberikan level partial jika hanya 1 topik cocok", () => {
      const level = evaluateArticleOverlap({
        matchedTopics: ["reformasi-peradilan"],
        matchedEntities: [],
        proposedTopicsCount: 3,
        proposedEntitiesCount: 2,
        titleOverlapRatio: 0.1,
      });
      expect(level).toBe("partial");
    });

    test("evaluateArticleOverlap memberikan level none jika tidak ada kecocokan", () => {
      const level = evaluateArticleOverlap({
        matchedTopics: [],
        matchedEntities: [],
        proposedTopicsCount: 2,
        proposedEntitiesCount: 2,
        titleOverlapRatio: 0.05,
      });
      expect(level).toBe("none");
    });

    test("getMaxOverlapLevel mengikuti aturan MAX: akumulasi partial match TIDAK BOLEH menjadi high", () => {
      const partialMatches: Array<{ overlapLevel: "none" | "partial" | "high" }> = [
        { overlapLevel: "partial" },
        { overlapLevel: "partial" },
        { overlapLevel: "partial" },
        { overlapLevel: "partial" },
      ];
      // 4 artikel partial match harus menghasilkan top-level "partial", bukan "high"
      expect(getMaxOverlapLevel(partialMatches)).toBe("partial");

      const withHigh: Array<{ overlapLevel: "none" | "partial" | "high" }> = [
        { overlapLevel: "partial" },
        { overlapLevel: "high" },
        { overlapLevel: "partial" },
      ];
      expect(getMaxOverlapLevel(withHigh)).toBe("high");

      expect(getMaxOverlapLevel([])).toBe("none");
    });
  });

  describe("4. Endpoint GET /api/internal/v1/editorial/coverage/search", () => {
    test("Menolak permintaan tanpa autentikasi coverage:read dengan status 401", async () => {
      const req = new Request("http://localhost/api/internal/v1/editorial/coverage/search?q=reformasi");
      const res = await coverageSearchGet(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.code).toBe("UNAUTHORIZED");
    });

    test("Menolak permintaan dengan kunci submission (vrtc_...) dengan status 403", async () => {
      const req = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/search?q=reformasi",
        {
          headers: { authorization: "Bearer vrtc_submission_key.secret" },
        },
      );
      const res = await coverageSearchGet(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.code).toBe("FORBIDDEN_SCOPE");
    });

    test("Mencari artikel terbit dengan kata kunci 'pengawasan' dan mengembalikan format baku", async () => {
      const req = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/search?q=pengawasan",
        {
          headers: { authorization: `Bearer ${TEST_COVERAGE_KEY}` },
        },
      );
      const res = await coverageSearchGet(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.data).toBeDefined();
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.pagination).toBeDefined();
      expect(json.pagination.total).toBeGreaterThanOrEqual(1);

      // Pastikan artikel yang kembali adalah artikel terbit, bukan draft
      for (const item of json.data) {
        expect(["PUBLISHED", "CORRECTED"]).toContain(item.status);
        expect(item.publishedAt).not.toBeNull();
        expect(item.canonicalUrl).toContain("/artikel/");
        expect(Array.isArray(item.topics)).toBe(true);
        expect(Array.isArray(item.entities)).toBe(true);
      }
    });

    test("Penyaringan berdasarkan desk berfungsi", async () => {
      const req = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/search?desk=teknologi-kebijakan",
        {
          headers: { "x-api-key": TEST_COVERAGE_KEY },
        },
      );
      const res = await coverageSearchGet(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      for (const item of json.data) {
        expect(item.desk).toBe("Teknologi & Kebijakan");
      }
    });

    test("Penyaringan rentang tanggal from & to berfungsi", async () => {
      const req = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/search?from=2026-11-04&to=2026-11-06",
        {
          headers: { authorization: `Bearer ${TEST_COVERAGE_KEY}` },
        },
      );
      const res = await coverageSearchGet(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      // Hanya artikel 2 (terbit 2026-11-05) yang masuk rentang tanggal ini
      const matched = json.data.find((a: any) => a.title.includes("Kecerdasan Buatan"));
      expect(matched).toBeDefined();
    });

    test("Paginasi berbasis limit dan cursor berfungsi", async () => {
      const reqPage1 = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/search?limit=1",
        {
          headers: { authorization: `Bearer ${TEST_COVERAGE_KEY}` },
        },
      );
      const resPage1 = await coverageSearchGet(reqPage1);
      expect(resPage1.status).toBe(200);
      const jsonPage1 = await resPage1.json();

      expect(jsonPage1.data.length).toBe(1);
      if (jsonPage1.pagination.total > 1) {
        expect(jsonPage1.pagination.hasMore).toBe(true);
        expect(jsonPage1.pagination.nextCursor).toBeTruthy();

        // Ambil halaman kedua menggunakan cursor
        const reqPage2 = new Request(
          `http://localhost/api/internal/v1/editorial/coverage/search?limit=1&cursor=${jsonPage1.pagination.nextCursor}`,
          {
            headers: { authorization: `Bearer ${TEST_COVERAGE_KEY}` },
          },
        );
        const resPage2 = await coverageSearchGet(reqPage2);
        expect(resPage2.status).toBe(200);
        const jsonPage2 = await resPage2.json();
        expect(jsonPage2.data.length).toBe(1);
        expect(jsonPage2.data[0].id).not.toBe(jsonPage1.data[0].id);
      }
    });

    test("Menolak cursor yang tidak ada di basis data dengan 400 INVALID_CURSOR", async () => {
      const req = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/search?cursor=cuid_nonexistent_99999",
        {
          headers: { authorization: `Bearer ${TEST_COVERAGE_KEY}` },
        },
      );
      const res = await coverageSearchGet(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe("INVALID_CURSOR");
    });

    test("Menolak parameter limit tidak valid dengan status 400 INVALID_PARAMETER", async () => {
      for (const badLimit of ["abc", "-5", "0", "1.5"]) {
        const req = new Request(
          `http://localhost/api/internal/v1/editorial/coverage/search?limit=${badLimit}`,
          {
            headers: { authorization: `Bearer ${TEST_COVERAGE_KEY}` },
          },
        );
        const res = await coverageSearchGet(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.code).toBe("INVALID_PARAMETER");
        expect(json.error).toContain("limit");
      }
    });

    test("Menolak format tanggal from atau to tidak valid dengan status 400 INVALID_PARAMETER", async () => {
      const reqFrom = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/search?from=not-a-valid-date",
        {
          headers: { authorization: `Bearer ${TEST_COVERAGE_KEY}` },
        },
      );
      const resFrom = await coverageSearchGet(reqFrom);
      expect(resFrom.status).toBe(400);
      const jsonFrom = await resFrom.json();
      expect(jsonFrom.code).toBe("INVALID_PARAMETER");
      expect(jsonFrom.error).toContain("from");

      const reqTo = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/search?to=invalid-date-format",
        {
          headers: { authorization: `Bearer ${TEST_COVERAGE_KEY}` },
        },
      );
      const resTo = await coverageSearchGet(reqTo);
      expect(resTo.status).toBe(400);
      const jsonTo = await resTo.json();
      expect(jsonTo.code).toBe("INVALID_PARAMETER");
      expect(jsonTo.error).toContain("to");
    });

    test("Item data hasil search menyertakan articleId dan seluruh kontrak kolom wajib", async () => {
      const req = new Request(
        "http://localhost/api/internal/v1/editorial/coverage/search?limit=5",
        {
          headers: { authorization: `Bearer ${TEST_COVERAGE_KEY}` },
        },
      );
      const res = await coverageSearchGet(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.length).toBeGreaterThanOrEqual(1);

      const first = json.data[0];
      expect(first.articleId).toBeDefined();
      expect(first.id).toBeDefined();
      expect(first.articleId).toBe(first.id);
      expect(first.title).toBeDefined();
      expect(first.desk).toBeDefined();
      expect(Array.isArray(first.topics)).toBe(true);
      expect(Array.isArray(first.entities)).toBe(true);
      expect(first.metadataStatus).toBeDefined();
      expect(first.publishedAt).toBeDefined();
      expect(first.canonicalUrl).toBeDefined();
    });
  });

  describe("5. Endpoint POST /api/internal/v1/editorial/coverage/check", () => {
    test("Menolak permintaan tanpa otentikasi dengan status 401", async () => {
      const req = new Request("http://localhost/api/internal/v1/editorial/coverage/check", {
        method: "POST",
        body: JSON.stringify({ proposedTitle: "Uji Coba" }),
      });
      const res = await coverageCheckPost(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.code).toBe("UNAUTHORIZED");
    });

    test("Menolak format JSON yang tidak valid dengan status 400 INVALID_JSON", async () => {
      const req = new Request("http://localhost/api/internal/v1/editorial/coverage/check", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_COVERAGE_KEY}`,
          "content-type": "application/json",
        },
        body: "{ broken json string",
      });
      const res = await coverageCheckPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe("INVALID_JSON");
    });

    test("Mengembalikan high overlap jika topik dan entitas sangat cocok dengan artikel terbit", async () => {
      const req = new Request("http://localhost/api/internal/v1/editorial/coverage/check", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_COVERAGE_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          proposedTitle: "Evaluasi Integritas dan Pengawasan Hakim Peradilan",
          topic: ["reformasi-peradilan", "pengawasan-hakim"],
          entities: ["Mahkamah Agung", "Komisi Yudisial"],
          centralQuestion: "Apakah mekanisme pengawasan hakim sudah berjalan efektif?",
          proposedAngle: "Evaluasi akuntabilitas peradilan dari sudut pandang publik",
        }),
      });
      const res = await coverageCheckPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.overlapLevel).toBe("high");
      expect(Array.isArray(json.matches)).toBe(true);
      expect(json.matches.length).toBeGreaterThanOrEqual(1);

      const topMatch: CoverageMatch = json.matches[0];
      expect(topMatch.overlapLevel).toBe("high");
      expect(topMatch.articleId).toBeDefined();
      expect(topMatch.title).toContain("Pengawasan Peradilan");
      expect(topMatch.desk).toBe("Hukum & Keadilan");
      expect(topMatch.matchedTopics.length).toBeGreaterThan(0);
      expect(topMatch.matchedEntities.length).toBeGreaterThan(0);
      expect(topMatch.canonicalUrl).toContain("/artikel/");
      expect(topMatch.metadataStatus).toBe("verified");
      expect(Array.isArray(topMatch.topics)).toBe(true);
      expect(Array.isArray(topMatch.entities)).toBe(true);
      expect(topMatch.centralQuestion).toBeDefined();
      expect(topMatch.editorialAngle).toBeDefined();

      // VERIFIKASI KEAMANAN & KONTRAK: dilarang menyertakan bidang rekomendasi/klasifikasi
      expect((json as any).classification).toBeUndefined();
      expect((json as any).recommendation).toBeUndefined();
      expect((json as any).suggestedAction).toBeUndefined();
      expect((topMatch as any).classification).toBeUndefined();
      expect((topMatch as any).recommendation).toBeUndefined();
      expect((topMatch as any).suggestedAction).toBeUndefined();
    });

    test("Mengembalikan partial overlap jika hanya cocok pada topik parsial", async () => {
      const req = new Request("http://localhost/api/internal/v1/editorial/coverage/check", {
        method: "POST",
        headers: {
          "x-api-key": TEST_COVERAGE_KEY,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          proposedTitle: "Perlindungan Data Pribadi Konsumen E-Commerce",
          topic: ["tata-kelola-data", "e-commerce"],
          entities: ["Asosiasi E-Commerce Indonesia", "YLKI"],
        }),
      });
      const res = await coverageCheckPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      // Topik "tata-kelola-data" cocok dengan artikel AI, tetapi entitas berbeda dan judul berbeda
      expect(json.overlapLevel).toBe("partial");
      const match = json.matches.find((m: any) => m.matchedTopics.includes("tata-kelola-data"));
      expect(match).toBeDefined();
      expect(match.overlapLevel).toBe("partial");
    });

    test("Mengusulkan satu entitas saja (totalProposed = 1) yang cocok menghasilkan partial (bukan high)", async () => {
      const req = new Request("http://localhost/api/internal/v1/editorial/coverage/check", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_COVERAGE_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          entities: ["Mahkamah Agung"],
        }),
      });
      const res = await coverageCheckPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.overlapLevel).toBe("partial");
      expect(json.matches.length).toBeGreaterThanOrEqual(1);
      const maMatch = json.matches.find((m: any) => m.matchedEntities.includes("Mahkamah Agung"));
      expect(maMatch).toBeDefined();
      expect(maMatch.overlapLevel).toBe("partial");
    });

    test("Mengembalikan overlap none jika topik dan entitas sama sekali tidak beririsan", async () => {
      const req = new Request("http://localhost/api/internal/v1/editorial/coverage/check", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_COVERAGE_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          proposedTitle: "Konservasi Terumbu Karang di Raja Ampat",
          topic: ["lingkungan", "kelautan", "konservasi"],
          entities: ["Balai Taman Nasional Raja Ampat", "WWF"],
        }),
      });
      const res = await coverageCheckPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.overlapLevel).toBe("none");
      expect(json.matches).toEqual([]);
    });

    test("Verifikasi Read-Only: panggilan ke POST /check sama sekali tidak mengubah basis data", async () => {
      const articleCountBefore = await db.article.count();
      const versionCountBefore = await db.articleVersion.count();
      const auditCountBefore = await db.auditEvent.count();

      const req = new Request("http://localhost/api/internal/v1/editorial/coverage/check", {
        method: "POST",
        headers: {
          authorization: `Bearer ${TEST_COVERAGE_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          proposedTitle: "Pemeriksaan Bebas Efek Samping Basis Data",
          topic: ["reformasi-peradilan"],
          entities: ["Mahkamah Agung"],
        }),
      });
      const res = await coverageCheckPost(req);
      expect(res.status).toBe(200);

      const articleCountAfter = await db.article.count();
      const versionCountAfter = await db.articleVersion.count();
      const auditCountAfter = await db.auditEvent.count();

      expect(articleCountAfter).toBe(articleCountBefore);
      expect(versionCountAfter).toBe(versionCountBefore);
      expect(auditCountAfter).toBe(auditCountBefore);
    });
  });
});

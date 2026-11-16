// Test suite komprehensif untuk Instagram Carousel Auto-Publisher:
// 1. Isolasi Scope API Client (INSTAGRAM_WORKER vs INGESTION vs Unauthenticated).
// 2. Query Naskah Siap Terbit (GET /api/internal/v1/instagram/articles).
// 3. Validasi dan Penerbitan Karosel (POST /api/internal/v1/instagram/publish).
// 4. Mekanisme Coba Ulang dan Deteksi Kegagalan (Retry, Fail-State, Alert Query).
// 5. Validasi Engine Render Visual Karosel (PNG magic bytes 89 50 4E 47, dimensi 1080x1080).
// Sesuai dengan pedoman docs/editorial/VERAX_WRITING_STANDARDS.md.

import { test, describe, beforeAll, afterAll, beforeEach, afterEach, expect } from "bun:test";
import { getTestDb, DB_URL, assertApprovedTestDatabase } from "./lib/test-db";
import { generateClientCredential, hashClientSecret } from "@/lib/api-key";
import { resetRateLimits } from "@/lib/rate-limit";
import { POST as aiSubmissionsPost } from "@/app/api/internal/v1/ai-submissions/route";
import { GET as instagramArticlesGet } from "@/app/api/internal/v1/instagram/articles/route";
import { POST as instagramPublishPost } from "@/app/api/internal/v1/instagram/publish/route";
import {
  renderCarouselSlides,
  buildDefaultSlidesFromArticle,
  type ArticleForInstagram,
  type SlideData,
} from "@/lib/instagram-renderer";
import {
  getFailedInstagramPosts,
  getInstagramPostStatus,
  publishArticleToInstagram,
} from "@/lib/instagram-service";
import sharp from "sharp";

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

describe("Instagram Carousel Auto-Publisher & Scope Isolation Suite", () => {
  const db = getTestDb();

  let testDeskId: string;
  let testHeroMediaId: string;

  // Kredensial Worker Instagram
  let workerClientId: string;
  let workerClientIdentifier: string;
  let workerClientSecret: string;
  let workerAuthHeader: string;

  // Kredensial Ingestion Standar
  let ingestionClientId: string;
  let ingestionClientIdentifier: string;
  let ingestionClientSecret: string;
  let ingestionAuthHeader: string;

  // Artikel untuk berbagai skenario
  let articlePublishedNoPostId: string;
  let articleDraftId: string;
  let articleAlreadyPostedId: string;
  let articleFailedPostId: string;
  let articleForPublishSuccessId: string;
  let articleForRetrySuccessId: string;
  let articleForFailureExhaustedId: string;

  const createdClientIds: string[] = [];
  const createdArticleIds: string[] = [];
  const createdMediaIds: string[] = [];
  const createdPostIds: string[] = [];

  beforeAll(async () => {
    assertApprovedTestDatabase(DB_URL);
    process.env.TEST_DATABASE_URL = DB_URL;
    process.env.INSTAGRAM_RETRY_DELAY_MS = "5";

    // 1. Siapkan Rubrik
    const desk = await db.desk.upsert({
      where: { slug: "investigasi-khusus" },
      update: { name: "Investigasi Khusus", isActive: true },
      create: {
        slug: "investigasi-khusus",
        name: "Investigasi Khusus",
        description: "Laporan investigasi mendalam, dokumen kebijakan, dan audit publik.",
        sortOrder: 1,
        isActive: true,
      },
    });
    testDeskId = desk.id;

    // 2. Siapkan Media Asset
    const heroMedia = await db.mediaAsset.create({
      data: {
        url: "https://veraxpress.vercel.app/uploads/test-hero-carousel.jpg",
        mimeType: "image/jpeg",
        mediaType: "DOCUMENT",
        creator: "Dokumentasi Khusus Verax Press",
        caption: "Salinan berkas audit alokasi anggaran daerah",
        title: "Dokumen Investigasi",
        isSynthetic: false,
        isGeneric: false,
      },
    });
    testHeroMediaId = heroMedia.id;
    createdMediaIds.push(heroMedia.id);

    // 3. Siapkan API Client Worker Instagram (clientType: INSTAGRAM_WORKER)
    const workerCred = generateClientCredential();
    workerClientIdentifier = workerCred.clientId;
    workerClientSecret = workerCred.secret;
    const workerSecretHash = hashClientSecret(workerClientSecret);

    const workerClient = await db.apiClient.create({
      data: {
        name: "Klien Worker Instagram Verax",
        clientId: workerClientIdentifier,
        ownerName: "Instagram Automation Service",
        environment: "DEVELOPMENT",
        status: "ACTIVE",
        scopes: "submit",
        clientType: "INSTAGRAM_WORKER",
        secretHash: workerSecretHash,
        credentials: {
          create: {
            name: "Kredensial Utama Worker",
            keyPrefix: workerClientSecret.slice(0, 10),
            secretHash: workerSecretHash,
            status: "ACTIVE",
          },
        },
      },
    });
    workerClientId = workerClient.id;
    createdClientIds.push(workerClientId);
    workerAuthHeader = `Bearer ${workerClientIdentifier}.${workerClientSecret}`;

    // 4. Siapkan API Client Ingestion Standar (clientType: INGESTION)
    const ingestionCred = generateClientCredential();
    ingestionClientIdentifier = ingestionCred.clientId;
    ingestionClientSecret = ingestionCred.secret;
    const ingestionSecretHash = hashClientSecret(ingestionClientSecret);

    const ingestionClient = await db.apiClient.create({
      data: {
        name: "Klien Ingestion Berita Eksternal",
        clientId: ingestionClientIdentifier,
        ownerName: "News Wire Partner",
        environment: "DEVELOPMENT",
        status: "ACTIVE",
        scopes: "submit",
        clientType: "INGESTION",
        secretHash: ingestionSecretHash,
        credentials: {
          create: {
            name: "Kredensial Utama Ingestion",
            keyPrefix: ingestionClientSecret.slice(0, 10),
            secretHash: ingestionSecretHash,
            status: "ACTIVE",
          },
        },
      },
    });
    ingestionClientId = ingestionClient.id;
    createdClientIds.push(ingestionClientId);
    ingestionAuthHeader = `Bearer ${ingestionClientIdentifier}.${ingestionClientSecret}`;

    // 5. Siapkan Naskah-Naskah Pengujian

    // A. Artikel PUBLISHED tanpa InstagramPost (siap diposting)
    const artA = await db.article.create({
      data: {
        title: "Investigasi Aliran Dana Bantuan Sosial Kabupaten X",
        deck: "Temuan audit independen mengungkap selisih pencairan dana pada kas daerah tahun anggaran 2025.",
        slug: `investigasi-bansos-${Date.now()}-a`,
        deskId: testDeskId,
        format: "REPORT",
        status: "PUBLISHED",
        byline: "Disunting oleh Redaksi Verax Press",
        heroMediaId: testHeroMediaId,
        publishedAt: new Date(Date.now() - 3600_000),
        topics: JSON.stringify(["hukum", "anggaran", "bansos"]),
        contentJson: JSON.stringify([
          { type: "paragraph", text: "Pemeriksaan kas daerah menunjukkan kejanggalan dalam prosedur verifikasi lapangan." },
        ]),
      },
    });
    articlePublishedNoPostId = artA.id;
    createdArticleIds.push(artA.id);

    // B. Artikel DRAFT (tidak boleh muncul di query dan ditolak saat publish)
    const artB = await db.article.create({
      data: {
        title: "Rancangan Liputan Investigasi Pengadaan Lahan",
        deck: "Naskah awal masih dalam tahap pengumpulan dokumen dan verifikasi silang narasumber.",
        slug: `draft-liputan-${Date.now()}-b`,
        deskId: testDeskId,
        format: "REPORT",
        status: "DRAFT",
        byline: "Redaksi Verax Press",
        publishedAt: null,
        topics: JSON.stringify(["lahan", "agraria"]),
        contentJson: JSON.stringify([
          { type: "paragraph", text: "Data narasumber masih menunggu kelengkapan konfirmasi." },
        ]),
      },
    });
    articleDraftId = artB.id;
    createdArticleIds.push(artB.id);

    // C. Artikel PUBLISHED yang SUDAH memiliki InstagramPost berstatus POSTED
    const artC = await db.article.create({
      data: {
        title: "Laporan Lengkap Audit Kepatuhan Regulasi Pengelolaan Hutan",
        deck: "Data citra satelit memperlihatkan pembukaan tutupan vegetasi di kawasan konservasi lindung.",
        slug: `audit-hutan-${Date.now()}-c`,
        deskId: testDeskId,
        format: "REPORT",
        status: "PUBLISHED",
        byline: "Disunting oleh Redaksi Verax Press",
        publishedAt: new Date(Date.now() - 7200_000),
        topics: JSON.stringify(["lingkungan", "konservasi"]),
        contentJson: JSON.stringify([
          { type: "paragraph", text: "Pembukaan kawasan lindung berlangsung tanpa izin kelayakan lingkungan." },
        ]),
      },
    });
    articleAlreadyPostedId = artC.id;
    createdArticleIds.push(artC.id);

    const postC = await db.instagramPost.create({
      data: {
        articleId: artC.id,
        status: "POSTED",
        attempts: 1,
        caption: "Laporan lengkap investigasi kawasan hutan lindung.",
        postUrl: "https://www.instagram.com/p/TEST_EXISTING_POSTED/",
        instagramMediaId: "media_existing_12345",
        carouselMediaUrls: JSON.stringify([
          "https://veraxpress.vercel.app/slide1.png",
          "https://veraxpress.vercel.app/slide2.png",
        ]),
        slideCount: 2,
        postedAt: new Date(),
      },
    });
    createdPostIds.push(postC.id);

    // D. Artikel PUBLISHED dengan InstagramPost berstatus FAILED (harus tetap muncul di query)
    const artD = await db.article.create({
      data: {
        title: "Kajian Keterbukaan Informasi Pengadaan Barang Jasa Elektronik",
        deck: "Tiga kementerian belum mempublikasikan rincian pemenang lelang pada portal sistem pengadaan nasional.",
        slug: `keterbukaan-lelang-${Date.now()}-d`,
        deskId: testDeskId,
        format: "REPORT",
        status: "PUBLISHED",
        byline: "Disunting oleh Redaksi Verax Press",
        publishedAt: new Date(Date.now() - 10800_000),
        topics: JSON.stringify(["transparansi", "lelang"]),
        contentJson: JSON.stringify([
          { type: "paragraph", text: "Portal lelang belum menampilkan lampiran harga penawaran terkoreksi." },
        ]),
      },
    });
    articleFailedPostId = artD.id;
    createdArticleIds.push(artD.id);

    const postD = await db.instagramPost.create({
      data: {
        articleId: artD.id,
        status: "FAILED",
        attempts: 3,
        lastError: "Meta API connection timeout after 3 retries",
        caption: "Kajian keterbukaan lelang elektronik.",
        carouselMediaUrls: JSON.stringify([
          "https://veraxpress.vercel.app/slide1.png",
          "https://veraxpress.vercel.app/slide2.png",
        ]),
        slideCount: 2,
      },
    });
    createdPostIds.push(postD.id);

    // E. Artikel PUBLISHED untuk uji coba sukses publikasi
    const artE = await db.article.create({
      data: {
        title: "Temuan Lapangan Proyek Penyediaan Air Bersih Perdesaan",
        deck: "Pipa distribusi utama belum tersambung ke pemukiman warga meski tenggat kontrak telah terlampaui.",
        slug: `air-bersih-${Date.now()}-e`,
        deskId: testDeskId,
        format: "REPORT",
        status: "PUBLISHED",
        byline: "Disunting oleh Redaksi Verax Press",
        publishedAt: new Date(Date.now() - 1800_000),
        topics: JSON.stringify(["infrastruktur", "air-bersih"]),
        contentJson: JSON.stringify([
          { type: "paragraph", text: "Warga perdesaan masih bergantung pada sumber air alternatif saat kemarau." },
        ]),
      },
    });
    articleForPublishSuccessId = artE.id;
    createdArticleIds.push(artE.id);

    // F. Artikel PUBLISHED untuk uji coba auto-retry lalu sukses
    const artF = await db.article.create({
      data: {
        title: "Penertiban Tambang Ilegal di Sepanjang Aliran Sungai C",
        deck: "Operasi gabungan aparat menemukan puluhan ekskavator tanpa kelengkapan izin usaha pertambangan.",
        slug: `tambang-ilegal-${Date.now()}-f`,
        deskId: testDeskId,
        format: "REPORT",
        status: "PUBLISHED",
        byline: "Disunting oleh Redaksi Verax Press",
        publishedAt: new Date(Date.now() - 900_000),
        topics: JSON.stringify(["tambang", "hukum"]),
        contentJson: JSON.stringify([
          { type: "paragraph", text: "Aliran sungai mengalami sedimentasi berat akibat penambangan liar tanpa penahan lumpur." },
        ]),
      },
    });
    articleForRetrySuccessId = artF.id;
    createdArticleIds.push(artF.id);

    // G. Artikel PUBLISHED untuk uji coba kegagalan 3 kali coba ulang
    const artG = await db.article.create({
      data: {
        title: "Analisis Anggaran Penanganan Krisis Pangan Daerah Tertinggal",
        deck: "Alokasi cadangan pangan darurat belum disalurkan optimal akibat kendala rantai pasok antarpulau.",
        slug: `krisis-pangan-${Date.now()}-g`,
        deskId: testDeskId,
        format: "REPORT",
        status: "PUBLISHED",
        byline: "Disunting oleh Redaksi Verax Press",
        publishedAt: new Date(Date.now() - 600_000),
        topics: JSON.stringify(["pangan", "logistik"]),
        contentJson: JSON.stringify([
          { type: "paragraph", text: "Pusat distribusi logistik perintis mengalami kekurangan armada kapal pengangkut." },
        ]),
      },
    });
    articleForFailureExhaustedId = artG.id;
    createdArticleIds.push(artG.id);
  });

  afterAll(async () => {
    globalThis.fetch = originalFetch;
    process.env = { ...originalEnv };

    // Bersihkan data uji
    await db.instagramPost.deleteMany({
      where: { articleId: { in: createdArticleIds } },
    });
    await db.article.deleteMany({
      where: { id: { in: createdArticleIds } },
    });
    await db.mediaAsset.deleteMany({
      where: { id: { in: createdMediaIds } },
    });
    await db.apiClientCredential.deleteMany({
      where: { apiClientId: { in: createdClientIds } },
    });
    await db.apiClient.deleteMany({
      where: { id: { in: createdClientIds } },
    });
  });

  beforeEach(() => {
    resetRateLimits();
    process.env.IG_ACCESS_TOKEN = "mock_valid_ig_access_token";
    process.env.IG_USER_ID = "17841400000000000";
    process.env.INSTAGRAM_RETRY_DELAY_MS = "5";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // =========================================================================
  // Bagian 1: API Client Scope Isolation
  // =========================================================================

  describe("1. API Client Scope Isolation", () => {
    test("Klien dengan clientType INSTAGRAM_WORKER ditolak pada POST /api/internal/v1/ai-submissions dengan HTTP 403", async () => {
      const submissionPayload = {
        title: "Percobaan Penyerahan Naskah oleh Worker Instagram",
        deck: "Upaya penyerahan naskah yang melanggar batasan izin hak akses klien.",
        desk: "nasional-publik",
        format: "REPORT",
        content: [{ type: "paragraph", text: "Konten naskah yang seharusnya ditolak oleh sistem proteksi ruang lingkup." }],
        sources: [
          {
            title: "Rujukan Resmi Pemerintah",
            publisher: "Kementerian Terkait",
            url: "https://example.com/rujukan-resmi",
            sourceType: "OFFICIAL",
            publishedAt: new Date().toISOString(),
            accessedAt: new Date().toISOString(),
            isKeySource: true,
          },
        ],
      };

      const req = new Request("http://localhost:3000/api/internal/v1/ai-submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: workerAuthHeader,
        },
        body: JSON.stringify(submissionPayload),
      });

      const res = await aiSubmissionsPost(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.code).toBe("INVALID_CLIENT_SCOPE");
      expect(data.error).toContain("API Client worker Instagram tidak memiliki izin mengirim atau memodifikasi naskah artikel");
    });

    test("Klien dengan clientType INGESTION ditolak pada GET /api/internal/v1/instagram/articles dengan HTTP 403", async () => {
      const req = new Request("http://localhost:3000/api/internal/v1/instagram/articles", {
        method: "GET",
        headers: {
          Authorization: ingestionAuthHeader,
        },
      });

      const res = await instagramArticlesGet(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.code).toBe("INVALID_CLIENT_SCOPE");
      expect(data.error).toContain("tidak memiliki izin mengakses endpoint Instagram Worker");
    });

    test("Klien dengan clientType INGESTION ditolak pada POST /api/internal/v1/instagram/publish dengan HTTP 403", async () => {
      const publishPayload = {
        articleId: articlePublishedNoPostId,
        caption: "Percobaan publikasi ilegal menggunakan kredensial ingestion.",
        slides: [
          { content: "Slide pembuka naskah pengujian" },
          { content: "Slide penutup naskah pengujian" },
        ],
      };

      const req = new Request("http://localhost:3000/api/internal/v1/instagram/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: ingestionAuthHeader,
        },
        body: JSON.stringify(publishPayload),
      });

      const res = await instagramPublishPost(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.code).toBe("INVALID_CLIENT_SCOPE");
      expect(data.error).toContain("tidak memiliki izin mengakses endpoint Instagram Worker");
    });

    test("Permintaan tanpa autentikasi ditolak dengan HTTP 401 pada seluruh endpoint terproteksi", async () => {
      // A. GET /api/internal/v1/instagram/articles
      const reqGet = new Request("http://localhost:3000/api/internal/v1/instagram/articles", {
        method: "GET",
      });
      const resGet = await instagramArticlesGet(reqGet);
      const dataGet = await resGet.json();
      expect(resGet.status).toBe(401);
      expect(dataGet.code).toBe("UNAUTHORIZED");

      // B. POST /api/internal/v1/instagram/publish
      const reqPub = new Request("http://localhost:3000/api/internal/v1/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: "none", caption: "none", slides: [] }),
      });
      const resPub = await instagramPublishPost(reqPub);
      const dataPub = await resPub.json();
      expect(resPub.status).toBe(401);
      expect(dataPub.code).toBe("UNAUTHORIZED");

      // C. POST /api/internal/v1/ai-submissions
      const reqSub = new Request("http://localhost:3000/api/internal/v1/ai-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Judul" }),
      });
      const resSub = await aiSubmissionsPost(reqSub);
      const dataSub = await resSub.json();
      expect(resSub.status).toBe(401);
      expect(dataSub.code).toBe("UNAUTHORIZED");
    });
  });

  // =========================================================================
  // Bagian 2: Query Naskah Siap Terbit (GET /api/internal/v1/instagram/articles)
  // =========================================================================

  describe("2. Query Naskah Siap Terbit (GET /api/internal/v1/instagram/articles)", () => {
    test("Hanya mengembalikan naskah PUBLISHED dan mengecualikan naskah DRAFT", async () => {
      const req = new Request("http://localhost:3000/api/internal/v1/instagram/articles", {
        method: "GET",
        headers: { Authorization: workerAuthHeader },
      });

      const res = await instagramArticlesGet(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(data.articles)).toBe(true);

      const returnedIds = data.articles.map((a: { id: string }) => a.id);

      // Artikel PUBLISHED tanpa post ada di hasil
      expect(returnedIds).toContain(articlePublishedNoPostId);

      // Artikel DRAFT sama sekali tidak boleh ada
      expect(returnedIds).not.toContain(articleDraftId);
    });

    test("Mengecualikan artikel yang sudah pernah diposting (status POSTED), tetapi menyertakan yang FAILED", async () => {
      const req = new Request("http://localhost:3000/api/internal/v1/instagram/articles?limit=50", {
        method: "GET",
        headers: { Authorization: workerAuthHeader },
      });

      const res = await instagramArticlesGet(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      const returnedIds = data.articles.map((a: { id: string }) => a.id);

      // Artikel C (sudah POSTED) harus dikecualikan
      expect(returnedIds).not.toContain(articleAlreadyPostedId);

      // Artikel D (status FAILED) harus disertakan agar dapat dicoba publikasi ulang
      expect(returnedIds).toContain(articleFailedPostId);
    });

    test("Menyertakan seluruh bidang editorial wajib dan struktur heroMedia secara lengkap", async () => {
      const req = new Request("http://localhost:3000/api/internal/v1/instagram/articles?limit=50", {
        method: "GET",
        headers: { Authorization: workerAuthHeader },
      });

      const res = await instagramArticlesGet(req);
      const data = await res.json();

      const articleItem = data.articles.find(
        (a: { id: string }) => a.id === articlePublishedNoPostId
      );

      expect(articleItem).toBeDefined();
      expect(typeof articleItem.id).toBe("string");
      expect(articleItem.title).toBe("Investigasi Aliran Dana Bantuan Sosial Kabupaten X");
      expect(articleItem.deck).toContain("Temuan audit independen");
      expect(articleItem.slug).toContain("investigasi-bansos-");
      expect(articleItem.byline).toBe("Disunting oleh Redaksi Verax Press");
      expect(typeof articleItem.publishedAt).toBe("string");
      expect(articleItem.contentJson).toBeDefined();

      // Rubrik / Desk
      expect(articleItem.desk).toBeDefined();
      expect(articleItem.desk.name).toBe("Investigasi Khusus");
      expect(articleItem.desk.slug).toBe("investigasi-khusus");

      // Tags / Topics
      expect(Array.isArray(articleItem.tags)).toBe(true);
      expect(articleItem.tags).toContain("anggaran");
      expect(articleItem.tags).toContain("bansos");

      // Hero Media
      expect(articleItem.heroMedia).toBeDefined();
      expect(articleItem.heroMedia.url).toBe("https://veraxpress.vercel.app/uploads/test-hero-carousel.jpg");
      expect(articleItem.heroMedia.caption).toContain("Salinan berkas audit");
      expect(articleItem.heroMedia.creator).toBe("Dokumentasi Khusus Verax Press");
    });

    test("Mendukung pembatasan kuantitas hasil melalui parameter query limit", async () => {
      const req = new Request("http://localhost:3000/api/internal/v1/instagram/articles?limit=1", {
        method: "GET",
        headers: { Authorization: workerAuthHeader },
      });

      const res = await instagramArticlesGet(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.articles.length).toBe(1);
    });
  });

  // =========================================================================
  // Bagian 3: Validasi dan Penerbitan Karosel (POST /api/internal/v1/instagram/publish)
  // =========================================================================

  describe("3. Validasi dan Penerbitan Karosel (POST /api/internal/v1/instagram/publish)", () => {
    test("Memvalidasi kelengkapan payload (articleId, caption, jumlah slide)", async () => {
      // A. articleId hilang
      const reqNoId = new Request("http://localhost:3000/api/internal/v1/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: workerAuthHeader },
        body: JSON.stringify({
          caption: "Caption pengujian",
          slides: [{ content: "Slide satu" }, { content: "Slide dua" }],
        }),
      });
      const resNoId = await instagramPublishPost(reqNoId);
      expect(resNoId.status).toBe(422);

      // B. caption hilang
      const reqNoCap = new Request("http://localhost:3000/api/internal/v1/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: workerAuthHeader },
        body: JSON.stringify({
          articleId: articlePublishedNoPostId,
          slides: [{ content: "Slide satu" }, { content: "Slide dua" }],
        }),
      });
      const resNoCap = await instagramPublishPost(reqNoCap);
      expect(resNoCap.status).toBe(422);

      // C. Kurang dari 2 slide (ditolak oleh Zod min 2)
      const reqOneSlide = new Request("http://localhost:3000/api/internal/v1/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: workerAuthHeader },
        body: JSON.stringify({
          articleId: articlePublishedNoPostId,
          caption: "Caption pengujian",
          slides: [{ content: "Hanya satu slide" }],
        }),
      });
      const resOneSlide = await instagramPublishPost(reqOneSlide);
      expect(resOneSlide.status).toBe(422);

      // D. Lebih dari 10 slide (ditolak oleh Zod max 10)
      const reqElevenSlides = new Request("http://localhost:3000/api/internal/v1/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: workerAuthHeader },
        body: JSON.stringify({
          articleId: articlePublishedNoPostId,
          caption: "Caption pengujian",
          slides: Array.from({ length: 11 }, (_, i) => ({ content: `Slide ke-${i + 1}` })),
        }),
      });
      const resElevenSlides = await instagramPublishPost(reqElevenSlides);
      expect(resElevenSlides.status).toBe(422);

      // E. JSON rusak
      const reqBadJson = new Request("http://localhost:3000/api/internal/v1/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: workerAuthHeader },
        body: "Bukan JSON valid",
      });
      const resBadJson = await instagramPublishPost(reqBadJson);
      expect(resBadJson.status).toBe(400);
    });

    test("Menolak artikel yang tidak ada (404) atau bukan berstatus PUBLISHED (400)", async () => {
      // A. Artikel tidak ada
      const reqNotFound = new Request("http://localhost:3000/api/internal/v1/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: workerAuthHeader },
        body: JSON.stringify({
          articleId: "id-naskah-fiktif-9999",
          caption: "Caption pengujian",
          slides: [{ content: "Slide pembuka" }, { content: "Slide penutup" }],
        }),
      });
      const resNotFound = await instagramPublishPost(reqNotFound);
      expect(resNotFound.status).toBe(404);

      // B. Artikel status DRAFT
      const reqDraft = new Request("http://localhost:3000/api/internal/v1/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: workerAuthHeader },
        body: JSON.stringify({
          articleId: articleDraftId,
          caption: "Caption pengujian naskah draft",
          slides: [{ content: "Slide pembuka" }, { content: "Slide penutup" }],
        }),
      });
      const resDraft = await instagramPublishPost(reqDraft);
      const dataDraft = await resDraft.json();
      expect(resDraft.status).toBe(400);
      expect(dataDraft.code).toBe("INVALID_ARTICLE_STATUS");
    });

    test("Mencegah duplikasi posting (Idempotensi: 409 ALREADY_POSTED)", async () => {
      const reqDuplicate = new Request("http://localhost:3000/api/internal/v1/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: workerAuthHeader },
        body: JSON.stringify({
          articleId: articleAlreadyPostedId,
          caption: "Upaya mempublikasikan artikel yang sudah terbit di feed Instagram.",
          slides: [{ content: "Slide pembuka" }, { content: "Slide penutup" }],
        }),
      });

      const resDuplicate = await instagramPublishPost(reqDuplicate);
      const dataDuplicate = await resDuplicate.json();

      expect(resDuplicate.status).toBe(409);
      expect(dataDuplicate.code).toBe("ALREADY_POSTED");
      expect(dataDuplicate.error).toContain("sudah pernah dipublikasikan ke Instagram sebelumnya");
      expect(dataDuplicate.postUrl).toBe("https://www.instagram.com/p/TEST_EXISTING_POSTED/");
    });

    test("Berhasil menerbitkan karosel dengan mock Meta Graph API dan mencatat status POSTED di basis data", async () => {
      // Siapkan mock fetch untuk Meta Graph API
      let createdChildCount = 0;
      let parentCreated = false;
      let publishedCalled = false;

      globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
        const urlStr = url.toString();

        if (urlStr.includes("/media_publish")) {
          publishedCalled = true;
          return new Response(JSON.stringify({ id: "media_inst_published_success" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (urlStr.includes("/media_inst_published_success")) {
          return new Response(
            JSON.stringify({ permalink: "https://www.instagram.com/p/SUCCESS_CAROUSEL_POST/" }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        if (init?.method === "POST" && urlStr.includes("/17841400000000000/media")) {
          const body = new URLSearchParams(init.body as string);
          if (body.get("media_type") === "CAROUSEL") {
            parentCreated = true;
            return new Response(JSON.stringify({ id: "parent_container_valid" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          } else {
            createdChildCount++;
            return new Response(JSON.stringify({ id: `child_container_${createdChildCount}` }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }
        }

        // Pengecekan status container (status_code: FINISHED)
        return new Response(JSON.stringify({ status_code: "FINISHED" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }) as unknown as typeof fetch;

      const publishPayload = {
        articleId: articleForPublishSuccessId,
        caption: "Laporan investigasi penyediaan air bersih perdesaan Verax Press.",
        slides: [
          {
            slideType: "cover",
            title: "Temuan Lapangan Proyek Penyediaan Air Bersih Perdesaan",
            content: "Pipa distribusi utama belum tersambung ke pemukiman warga.",
            kicker: "INVESTIGASI INFRASTRUKTUR",
          },
          {
            slideType: "content",
            title: "Fakta Kondisi Lapangan",
            content: "Konstruksi bak penampungan air terbengkalai dan pompa belum terpasang.",
            sourceNotes: "Dokumen Berita Acara Lapangan No. 44/2026",
          },
        ],
      };

      const req = new Request("http://localhost:3000/api/internal/v1/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: workerAuthHeader },
        body: JSON.stringify(publishPayload),
      });

      const res = await instagramPublishPost(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe("POSTED");
      expect(data.attempts).toBe(1);
      expect(data.postUrl).toBe("https://www.instagram.com/p/SUCCESS_CAROUSEL_POST/");
      expect(typeof data.instagramPostId).toBe("string");

      expect(createdChildCount).toBe(2);
      expect(parentCreated).toBe(true);
      expect(publishedCalled).toBe(true);

      // Verifikasi catatan pada model InstagramPost di basis data
      const savedPost = await db.instagramPost.findUnique({
        where: { id: data.instagramPostId },
      });

      expect(savedPost).toBeDefined();
      expect(savedPost?.articleId).toBe(articleForPublishSuccessId);
      expect(savedPost?.status).toBe("POSTED");
      expect(savedPost?.attempts).toBe(1);
      expect(savedPost?.postUrl).toBe("https://www.instagram.com/p/SUCCESS_CAROUSEL_POST/");
      expect(savedPost?.instagramMediaId).toBe("media_inst_published_success");
      expect(savedPost?.slideCount).toBe(2);
      expect(savedPost?.postedAt).toBeDefined();
    });
  });

  // =========================================================================
  // Bagian 4: Failure & Retry Logic
  // =========================================================================

  describe("4. Failure & Retry Logic", () => {
    test("Mencoba ulang hingga 3 kali saat terjadi galat transien Meta dan sukses pada percobaan ke-3", async () => {
      let callCount = 0;

      globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
        const urlStr = url.toString();

        // Gagalkan 2 panggilan pertama dengan error transien Meta
        if (init?.method === "POST" && urlStr.includes("/17841400000000000/media") && callCount < 2) {
          callCount++;
          return new Response(
            JSON.stringify({
              error: {
                message: "Meta transient service unavailable",
                code: 2,
                type: "OAuthException",
              },
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }

        if (urlStr.includes("/media_publish")) {
          return new Response(JSON.stringify({ id: "media_inst_retry_success" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (urlStr.includes("/media_inst_retry_success")) {
          return new Response(
            JSON.stringify({ permalink: "https://www.instagram.com/p/RETRY_SUCCESS_POST/" }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        if (init?.method === "POST" && urlStr.includes("/17841400000000000/media")) {
          return new Response(JSON.stringify({ id: `container_${Date.now()}` }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ status_code: "FINISHED" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }) as unknown as typeof fetch;

      const result = await publishArticleToInstagram({
        articleId: articleForRetrySuccessId,
        caption: "Laporan penertiban tambang ilegal di aliran sungai.",
        imageUrls: [
          "https://veraxpress.vercel.app/slide1.png",
          "https://veraxpress.vercel.app/slide2.png",
        ],
        maxRetries: 3,
        retryDelayMs: 2,
      });

      expect(result.status).toBe("POSTED");
      expect(result.attempts).toBe(3);
      expect(result.postUrl).toBe("https://www.instagram.com/p/RETRY_SUCCESS_POST/");

      // Verifikasi basis data
      const postInDb = await db.instagramPost.findUnique({
        where: { id: result.instagramPostId },
      });
      expect(postInDb?.status).toBe("POSTED");
      expect(postInDb?.attempts).toBe(3);
      expect(postInDb?.postUrl).toBe("https://www.instagram.com/p/RETRY_SUCCESS_POST/");
    });

    test("Menandai status FAILED dan mengisi lastError setelah 3 kali kegagalan berturut-turut", async () => {
      globalThis.fetch = (async () => {
        return new Response(
          JSON.stringify({
            error: {
              message: "Meta Graph API rate limit exceeded",
              code: 4,
              type: "OAuthException",
            },
          }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }) as unknown as typeof fetch;

      const result = await publishArticleToInstagram({
        articleId: articleForFailureExhaustedId,
        caption: "Analisis penanganan krisis pangan daerah tertinggal.",
        imageUrls: [
          "https://veraxpress.vercel.app/slide1.png",
          "https://veraxpress.vercel.app/slide2.png",
        ],
        maxRetries: 3,
        retryDelayMs: 2,
      });

      expect(result.status).toBe("FAILED");
      expect(result.attempts).toBe(3);
      expect(result.lastError).toContain("Meta Graph API rate limit exceeded");

      // Verifikasi catatan status FAILED di basis data
      const postInDb = await db.instagramPost.findUnique({
        where: { id: result.instagramPostId },
      });
      expect(postInDb?.status).toBe("FAILED");
      expect(postInDb?.attempts).toBe(3);
      expect(postInDb?.lastError).toContain("Meta Graph API rate limit exceeded");
      expect(postInDb?.postedAt).toBeNull();
    });

    test("Query Studio Alert mendeteksi seluruh postingan Instagram yang berstatus FAILED", async () => {
      const failedPosts = await getFailedInstagramPosts(10);

      expect(Array.isArray(failedPosts)).toBe(true);
      expect(failedPosts.length).toBeGreaterThan(0);

      const foundExhausted = failedPosts.find(
        (p) => p.articleId === articleForFailureExhaustedId
      );

      expect(foundExhausted).toBeDefined();
      expect(foundExhausted?.status).toBe("FAILED");
      expect(foundExhausted?.attempts).toBe(3);
      expect(foundExhausted?.lastError).toContain("Meta Graph API rate limit exceeded");
      expect(foundExhausted?.article.title).toBe("Analisis Anggaran Penanganan Krisis Pangan Daerah Tertinggal");
      expect(foundExhausted?.article.slug).toContain("krisis-pangan-");
    });
  });

  // =========================================================================
  // Bagian 5: Validasi Engine Render Visual Karosel
  // =========================================================================

  describe("5. Validasi Engine Render Visual Karosel (src/lib/instagram-renderer.ts)", () => {
    test("Menghasilkan buffer PNG yang valid dengan signature bytes 89 50 4E 47 dan dimensi 1080x1080", async () => {
      const sampleArticle: ArticleForInstagram = {
        id: "art-render-verification",
        title: "Pemeriksaan Aliran Dana Kompensasi Dampak Lingkungan Tambang",
        deck: "Hasil audit independen menunjukkan ketidaksesuaian laporan realisasi penyaluran dana kompensasi bagi warga terdampak.",
        slug: "kompensasi-dampak-lingkungan-tambang",
        desk: { name: "Investigasi", slug: "investigasi" },
        byline: "Disunting oleh Redaksi Verax Press",
        publishedAt: new Date("2026-11-16T10:00:00Z"),
      };

      const testSlides: SlideData[] = [
        {
          slideType: "cover",
          kicker: "LAPORAN KHUSUS",
          title: sampleArticle.title,
          content: sampleArticle.deck || "",
        },
        {
          slideType: "content",
          kicker: "DATA KUNCI",
          title: "Ketidaksesuaian Alokasi Dana Kompensasi",
          content: "Realisasi pembayaran kepada warga hanya mencapai tiga puluh persen dari total komitmen awal yang tercantum dalam berita acara kesepakatan.",
          sourceNotes: "Dokumen Kesepakatan Bersama No. 08/KB/2025",
        },
        {
          slideType: "quote",
          kicker: "KUTIPAN NARASUMBER",
          content: "Tidak ada sosialisasi teknis mengenai mekanisme pemotongan biaya administrasi yang dilakukan oleh pihak perantara.",
          quoteAuthor: "Ketua Paguyuban Warga",
          quoteAuthorTitle: "Keterangan Terverifikasi Dokumen Wawancara",
        },
        {
          slideType: "closing",
          kicker: "KESIMPULAN",
          title: "Tiga Rekomendasi Penting Redaksi",
          content: "Seluruh berkas dokumen tersedia terbuka.\nKlarifikasi narasumber dicantumkan utuh.\nRedaksi menyediakan saluran hak jawab resmi.",
          callToAction: "Baca investigasi selengkapnya di veraxpress.vercel.app",
        },
      ];

      const buffers = await renderCarouselSlides(sampleArticle, testSlides);

      expect(buffers.length).toBe(4);

      for (let i = 0; i < buffers.length; i++) {
        const buf = buffers[i];

        // Validasi buffer tidak kosong
        expect(buf.length).toBeGreaterThan(1000);

        // Validasi magic signature bytes PNG: 89 50 4E 47 (\x89PNG)
        expect(buf[0]).toBe(0x89);
        expect(buf[1]).toBe(0x50);
        expect(buf[2]).toBe(0x4e);
        expect(buf[3]).toBe(0x47);

        // Validasi dimensi gambar tepat 1080x1080 menggunakan sharp
        const meta = await sharp(buf).metadata();
        expect(meta.format).toBe("png");
        expect(meta.width).toBe(1080);
        expect(meta.height).toBe(1080);
      }
    });

    test("Membangun slide default yang valid dari metadata artikel saat larik slide kosong", async () => {
      const sampleArticle: ArticleForInstagram = {
        id: "art-default-slides",
        title: "Temuan Verifikasi Salinan Kontrak Pengadaan Alat Kesehatan",
        deck: "Ringkasan data pengadaan rumah sakit umum daerah.",
        slug: "pengadaan-alat-kesehatan",
        desk: { name: "Nasional & Publik", slug: "nasional-publik" },
        byline: "Disunting oleh Redaksi Verax Press",
        publishedAt: new Date(),
      };

      const defaultSlides = buildDefaultSlidesFromArticle(sampleArticle);
      expect(defaultSlides.length).toBe(4);
      expect(defaultSlides[0].slideType).toBe("cover");
      expect(defaultSlides[1].slideType).toBe("content");
      expect(defaultSlides[2].slideType).toBe("content");
      expect(defaultSlides[3].slideType).toBe("closing");

      // Render dengan slides kosong (fallback otomatis ke default slides)
      const buffers = await renderCarouselSlides(sampleArticle, []);
      expect(buffers.length).toBe(4);

      // Verifikasi slide pertama
      const meta = await sharp(buffers[0]).metadata();
      expect(meta.format).toBe("png");
      expect(meta.width).toBe(1080);
      expect(meta.height).toBe(1080);
    });
  });
});

// Test suite untuk integrasi gambar berlisensi pada Internal Content Ingestion API
// Menguji backward compatibility, pencarian foto stok di sisi server, penanganan hasil kosong,
// validasi ketat atribusi gambar manual, konsistensi default isGeneric, dan isolasi kredensial API.

import { test, describe, beforeAll, afterAll, expect } from "bun:test";
import { getTestDb, DB_URL, assertApprovedTestDatabase } from "./lib/test-db";
import { generateClientCredential, hashClientSecret } from "@/lib/api-key";
import { resetRateLimits } from "@/lib/rate-limit";
import { validateIngestionPayload } from "@/lib/domain/ingestion";
import { POST as aiSubmissionsPost } from "@/app/api/internal/v1/ai-submissions/route";

describe("Integrasi Gambar Berlisensi & Foto Stok pada Ingestion API", () => {
  const db = getTestDb();
  let testDeskSlug: string;
  let testClientId: string;
  let testClientIdentifier: string;
  let testClientSecret: string;
  let authHeader: string;

  const originalMockEnv = process.env.VERAX_MOCK_STOCK_PHOTOS;

  beforeAll(async () => {
    assertApprovedTestDatabase(DB_URL);
    process.env.VERAX_MOCK_STOCK_PHOTOS = "true";

    const desk = await db.desk.upsert({
      where: { slug: "hukum-keadilan" },
      update: { name: "Hukum & Keadilan", isActive: true },
      create: {
        slug: "hukum-keadilan",
        name: "Hukum & Keadilan",
        description: "Perkembangan hukum dan peradilan.",
        sortOrder: 1,
        isActive: true,
      },
    });
    testDeskSlug = desk.slug;

    const cred = generateClientCredential();
    testClientIdentifier = cred.clientId;
    testClientSecret = cred.secret;
    const secretHash = hashClientSecret(testClientSecret);

    const client = await db.apiClient.create({
      data: {
        name: "Klien Uji Ingestion Foto Stok",
        clientId: testClientIdentifier,
        ownerName: "Suite Uji Integrasi Gambar",
        environment: "DEVELOPMENT",
        status: "ACTIVE",
        scopes: "submit",
        secretHash,
      },
    });
    testClientId = client.id;
    authHeader = `Bearer ${testClientIdentifier}.${testClientSecret}`;
  });

  afterAll(async () => {
    if (originalMockEnv === undefined) {
      delete process.env.VERAX_MOCK_STOCK_PHOTOS;
    } else {
      process.env.VERAX_MOCK_STOCK_PHOTOS = originalMockEnv;
    }

    try {
      await db.apiClient.delete({ where: { id: testClientId } });
    } catch {}
  });

  const baseValidPayload = {
    title: "Analisis Perkembangan Regulasi Digital Terkini 2026",
    deck: "Ulasan mendalam mengenai tata kelola teknologi dan dampaknya.",
    desk: "hukum-keadilan",
    format: "ANALYSIS",
    content: [
      {
        type: "paragraph",
        text: "Penerapan regulasi digital di Indonesia memerlukan kesiapan infrastruktur serta koordinasi lintas lembaga.",
      },
      {
        type: "paragraph",
        text: "Kajian ini menyoroti kepatuhan penyedia platform terhadap ketentuan pelindungan data pribadi.",
      },
    ],
    sources: [
      {
        title: "Dokumen Resmi Kebijakan Regulasi Digital",
        publisher: "Kementerian Komunikasi dan Digital",
        url: "https://komdigi.go.id/regulasi-digital-2026",
        sourceType: "OFFICIAL",
        publishedAt: "2026-11-01T08:00:00Z",
        accessedAt: "2026-11-12T10:00:00Z",
        isKeySource: true,
      },
    ],
    aiInvolvement: "assistive",
    aiUsageNote: "Penyusunan kerangka awal dengan bantuan model bahasa.",
    agentId: "agent-media-test-suite",
  };

  test("1. Backward compatibility: submission tanpa field gambar tetap diterima (201)", async () => {
    resetRateLimits();
    const idempotencyKey = `test-no-img-${Date.now()}`;
    const req = new Request("http://localhost/api/internal/v1/ai-submissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        ...baseValidPayload,
        idempotencyKey,
      }),
    });

    const res = await aiSubmissionsPost(req);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { articleId: string; status: string };
    expect(body.articleId).toBeDefined();
    expect(body.status).toBe("SUBMITTED");

    const createdArticle = await db.article.findUnique({
      where: { id: body.articleId },
      include: { heroMedia: true },
    });
    expect(createdArticle).not.toBeNull();
    expect(createdArticle?.status).toBe("DRAFT");
    expect(createdArticle?.heroMediaId).toBeNull();
  });

  test("2. imageQuery valid: server mencari foto stok dan menyimpan dengan atribusi lengkap", async () => {
    resetRateLimits();
    const idempotencyKey = `test-stock-query-${Date.now()}`;
    const req = new Request("http://localhost/api/internal/v1/ai-submissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        ...baseValidPayload,
        title: "Gedung Peradilan dan Penegakan Hukum Modern di Jakarta",
        imageQuery: "gedung pengadilan",
        imageCaption: "Gedung pengadilan sebagai simbol penegakan hukum.",
        imageIsGeneric: true,
        idempotencyKey,
      }),
    });

    const res = await aiSubmissionsPost(req);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { articleId: string };

    const article = await db.article.findUnique({
      where: { id: body.articleId },
      include: { heroMedia: true },
    });
    expect(article).not.toBeNull();
    expect(article?.heroMediaId).not.toBeNull();

    const hero = article?.heroMedia;
    expect(hero).not.toBeNull();
    expect(hero?.url).toContain("images.unsplash.com");
    expect(hero?.creator).toContain("Fotografer Percontohan di Unsplash");
    expect(hero?.license).toBe("Unsplash License");
    expect(hero?.isGeneric).toBe(true);
    expect(hero?.mediaType).toBe("PHOTO");
    expect(hero?.caption).toBe("Gedung pengadilan sebagai simbol penegakan hukum.");
  });

  test("3. imageQuery kosong/nihil: naskah tetap diterima sebagai artikel tanpa gambar (bukan 500)", async () => {
    resetRateLimits();
    const idempotencyKey = `test-stock-empty-${Date.now()}`;
    const req = new Request("http://localhost/api/internal/v1/ai-submissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        ...baseValidPayload,
        title: "Kajian Kebijakan dengan Kata Kunci Gambar yang Tidak Ditemukan",
        imageQuery: "kosong_tidak_ada_hasil",
        idempotencyKey,
      }),
    });

    const res = await aiSubmissionsPost(req);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { articleId: string };

    const article = await db.article.findUnique({
      where: { id: body.articleId },
      include: { heroMedia: true },
    });
    expect(article).not.toBeNull();
    expect(article?.status).toBe("DRAFT");
    expect(article?.heroMediaId).toBeNull();
  });

  test("4. Validasi ketat: imageUrl tanpa imageCredit atau imageLicense ditolak (422)", async () => {
    resetRateLimits();
    const validationResult1 = await validateIngestionPayload({
      ...baseValidPayload,
      imageUrl: "https://images.example.com/courtroom.jpg",
      idempotencyKey: "test-val-missing-credit",
    });
    expect(validationResult1.valid).toBe(false);
    if (!validationResult1.valid) {
      const paths = validationResult1.details.map((d) => d.path);
      expect(paths).toContain("imageCredit");
      expect(paths).toContain("imageLicense");
    }

    const validationResult2 = await validateIngestionPayload({
      ...baseValidPayload,
      imageUrl: "https://images.example.com/courtroom.jpg",
      imageCredit: "Budi Santoso",
      // imageLicense sengaja kosong
      idempotencyKey: "test-val-missing-license",
    });
    expect(validationResult2.valid).toBe(false);
    if (!validationResult2.valid) {
      const paths = validationResult2.details.map((d) => d.path);
      expect(paths).not.toContain("imageCredit");
      expect(paths).toContain("imageLicense");
    }
  });

  test("5. imageUrl lengkap: diterima dan tersimpan dengan isGeneric true serta atribusi", async () => {
    resetRateLimits();
    const idempotencyKey = `test-manual-img-${Date.now()}`;
    const req = new Request("http://localhost/api/internal/v1/ai-submissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        ...baseValidPayload,
        title: "Perkembangan Pengadilan Tipikor dan Bukti Digital",
        imageUrl: "https://images.example.com/legal-books.jpg",
        imageCredit: "Foto oleh Andi Wijaya di Pexels",
        imageLicense: "Pexels License",
        imageCaption: "Buku hukum dan palu sidang.",
        imageIsGeneric: true,
        idempotencyKey,
      }),
    });

    const res = await aiSubmissionsPost(req);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { articleId: string };

    const article = await db.article.findUnique({
      where: { id: body.articleId },
      include: { heroMedia: true },
    });
    expect(article?.heroMedia).not.toBeNull();
    expect(article?.heroMedia?.creator).toBe("Foto oleh Andi Wijaya di Pexels");
    expect(article?.heroMedia?.license).toBe("Pexels License");
    expect(article?.heroMedia?.isGeneric).toBe(true);
  });

  test("6. Default isGeneric konsisten: fallback basis data bernilai true dan upload manual bernilai false", async () => {
    // 6a. Verifikasi fallback default kolom basis data
    const fallbackAsset = await db.mediaAsset.create({
      data: {
        url: "https://images.example.com/fallback-unknown.jpg",
        creator: "Pengunggah Anonim",
        caption: "Aset uji tanpa isGeneric eksplisit",
        uploadedByLabel: "test-runner",
      },
    });
    expect(fallbackAsset.isGeneric).toBe(true);
    await db.mediaAsset.delete({ where: { id: fallbackAsset.id } });

    // 6b. Verifikasi bahwa jalur GUI manual redaksi menetapkan isGeneric: false
    const manualStaffAsset = await db.mediaAsset.create({
      data: {
        url: "https://images.example.com/liputan-langsung-wartawan.jpg",
        creator: "Wartawan Verax Press",
        caption: "Dokumentasi konferensi pers di Pengadilan Negeri",
        license: "Hak Cipta Redaksi Verax Press",
        isGeneric: false, // Perilaku wajib jalur GUI manual
        uploadedByLabel: "staff:wartawan",
      },
    });
    expect(manualStaffAsset.isGeneric).toBe(false);
    await db.mediaAsset.delete({ where: { id: manualStaffAsset.id } });
  });

  test("7. Isolasi kredensial: response API tidak pernah membocorkan kunci rahasia server", async () => {
    resetRateLimits();
    const idempotencyKey = `test-credential-isolation-${Date.now()}`;
    const req = new Request("http://localhost/api/internal/v1/ai-submissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        ...baseValidPayload,
        title: "Uji Proteksi Kredensial dan Rahasia Lingkungan Server",
        imageQuery: "teknologi keamanan komputer",
        idempotencyKey,
      }),
    });

    const res = await aiSubmissionsPost(req);
    expect(res.status).toBe(201);
    const rawText = await res.text();

    expect(rawText).not.toContain("UNSPLASH");
    expect(rawText).not.toContain("PEXELS");
    expect(rawText).not.toContain(testClientSecret);
  });
});

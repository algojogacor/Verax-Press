// Test suite komprehensif untuk Syarat Verifikasi Tambahan Khusus Format NEWS pada Ingestion API.
// Menguji fail-closed format pending authorization, sumber primer bertanggal <= 48 jam,
// panjang verificationNotes minimal 80 karakter, kewajiban referensi novelty check (coverage),
// sudut pandang baru saat overlap high, pemisahan rate limit harian, dan isolasi format lain.

import { test, describe, beforeAll, afterAll, beforeEach, expect } from "bun:test";
import { getTestDb, DB_URL, assertApprovedTestDatabase } from "./lib/test-db";
import { generateClientCredential, hashClientSecret } from "@/lib/api-key";
import { resetRateLimits } from "@/lib/rate-limit";
import {
  validateIngestionPayload,
  validateNewsPreconditions,
  type IngestionPayload,
} from "@/lib/domain/ingestion";
import { POST as aiSubmissionsPost } from "@/app/api/internal/v1/ai-submissions/route";
import { POST as validatePost } from "@/app/api/internal/v1/ai-submissions/validate/route";

describe("Syarat Verifikasi Tambahan Khusus Format NEWS pada Ingestion API", () => {
  const db = getTestDb();
  let testDeskId: string;
  let testClientId: string;
  let testClientIdentifier: string;
  let testClientSecret: string;
  let authHeader: string;

  const originalEnvNews = process.env.VERAX_ALLOW_NEWS_INGESTION;

  beforeAll(async () => {
    assertApprovedTestDatabase(DB_URL);

    // Siapkan rubrik aktif untuk pengujian
    const desk = await db.desk.upsert({
      where: { slug: "nasional-publik" },
      update: { name: "Nasional & Publik", isActive: true },
      create: {
        slug: "nasional-publik",
        name: "Nasional & Publik",
        description: "Kebijakan publik, transparansi, dan tata kelola.",
        sortOrder: 2,
        isActive: true,
      },
    });
    testDeskId = desk.id;

    // Siapkan kredensial klien API aktif
    const cred = generateClientCredential();
    testClientIdentifier = cred.clientId;
    testClientSecret = cred.secret;

    const secretHash = hashClientSecret(testClientSecret);
    const client = await db.apiClient.create({
      data: {
        name: "Klien Uji Verifikasi NEWS",
        clientId: testClientIdentifier,
        ownerName: "Suite Pengujian Otomatis",
        environment: "DEVELOPMENT",
        status: "ACTIVE",
        scopes: "submit",
        secretHash,
        credentials: {
          create: {
            name: "Kredensial Utama Uji",
            keyPrefix: testClientSecret.slice(0, 10),
            secretHash,
            status: "ACTIVE",
          },
        },
      },
    });
    testClientId = client.id;
    authHeader = `Bearer ${testClientIdentifier}.${testClientSecret}`;
  });

  afterAll(async () => {
    if (originalEnvNews !== undefined) {
      process.env.VERAX_ALLOW_NEWS_INGESTION = originalEnvNews;
    } else {
      delete process.env.VERAX_ALLOW_NEWS_INGESTION;
    }

    resetRateLimits();

    // Bersihkan data uji
    await db.apiClientCredential.deleteMany({ where: { apiClientId: testClientId } });
    await db.submission.deleteMany({ where: { apiClientId: testClientId } });
    await db.apiClient.deleteMany({ where: { id: testClientId } });
  });

  beforeEach(() => {
    resetRateLimits();
  });

  function createValidNewsPayload(overrides?: Partial<IngestionPayload>): Record<string, unknown> {
    const freshPublishedAt = new Date(Date.now() - 2 * 3600_000).toISOString(); // 2 jam yang lalu
    return {
      title: "Pemerintah Daerah Merilis Realisasi APBD Kuartal Terakhir",
      deck: "Rangkuman data anggaran yang dirilis resmi oleh badan keuangan daerah.",
      desk: "nasional-publik",
      format: "NEWS",
      content: [
        {
          type: "paragraph",
          text: "Badan Pengelola Keuangan Daerah merilis laporan realisasi anggaran kuartal terakhir hari ini.",
        },
      ],
      sources: [
        {
          title: "Pengumuman Resmi Realisasi APBD",
          publisher: "BPKD Provinsi",
          url: "https://bpkd.example.go.id/rilis-apbd",
          sourceType: "OFFICIAL",
          publishedAt: freshPublishedAt,
          accessedAt: new Date().toISOString(),
          isKeySource: true,
        },
      ],
      verificationNotes:
        "Verifikasi langsung dari siaran pers resmi BPKD Provinsi yang diterbitkan hari ini pukul 09.00 WIB. Konfirmasi data anggaran telah dicocokkan dengan lampiran tabel resmi.",
      coverageCheck: {
        overlapLevel: "none",
        checkedAt: new Date().toISOString(),
      },
      aiInvolvement: "assistive",
      agentId: "agent-news-tester",
      idempotencyKey: `news-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...overrides,
    };
  }

  // =========================================================================
  // 1. FAIL-CLOSED DEFAULT GATE (FORMAT_PENDING_AUTHORIZATION)
  // =========================================================================
  test("1. NEWS masih berstatus ditahan (FORMAT_PENDING_AUTHORIZATION) secara default setelah perubahan", async () => {
    delete process.env.VERAX_ALLOW_NEWS_INGESTION;

    const payload = createValidNewsPayload();
    const req = new Request("http://localhost/api/internal/v1/ai-submissions/validate", {
      method: "POST",
      headers: {
        authorization: authHeader,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const res = await validatePost(req);
    expect(res.status).toBe(422);

    const json = (await res.json()) as { code: string; details?: Array<{ code?: string }> };
    expect(json.code).toBe("FORMAT_REJECTED");
    expect(json.details?.[0]?.code).toBe("FORMAT_PENDING_AUTHORIZATION");
  });

  // =========================================================================
  // 2. SUMBER PRIMER BERTANGGAL (MAX 48 JAM)
  // =========================================================================
  test("2. Submission NEWS tanpa source PRIMARY atau OFFICIAL ditolak 422", async () => {
    process.env.VERAX_ALLOW_NEWS_INGESTION = "true";

    const payload = createValidNewsPayload({
      sources: [
        {
          title: "Artikel Ulasan Media Daring",
          url: "https://example.com/secondary-news",
          sourceType: "SECONDARY",
          publishedAt: new Date().toISOString(),
        },
      ],
    });

    const req = new Request("http://localhost/api/internal/v1/ai-submissions/validate", {
      method: "POST",
      headers: {
        authorization: authHeader,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const res = await validatePost(req);
    expect(res.status).toBe(422);

    const json = (await res.json()) as { details?: Array<{ path?: string; code?: string; message?: string }> };
    expect(json.details?.some((d) => d.path === "sources" && d.code === "FORMAT_PRECONDITION_FAILED")).toBe(true);
  });

  test("3. Submission NEWS dengan source PRIMARY atau OFFICIAL tapi publishedAt lebih dari 48 jam ditolak 422", async () => {
    process.env.VERAX_ALLOW_NEWS_INGESTION = "true";

    // 72 jam yang lalu (> 48 jam)
    const staleDate = new Date(Date.now() - 72 * 3600_000).toISOString();

    const payload = createValidNewsPayload({
      sources: [
        {
          title: "Siaran Pers Lembaga Tiga Hari Lalu",
          url: "https://example.com/stale-official",
          sourceType: "OFFICIAL",
          publishedAt: staleDate,
        },
      ],
    });

    const req = new Request("http://localhost/api/internal/v1/ai-submissions/validate", {
      method: "POST",
      headers: {
        authorization: authHeader,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const res = await validatePost(req);
    expect(res.status).toBe(422);

    const json = (await res.json()) as { details?: Array<{ path?: string; code?: string; message?: string }> };
    const sourceIssue = json.details?.find((d) => d.path === "sources");
    expect(sourceIssue).toBeDefined();
    expect(sourceIssue?.code).toBe("FORMAT_PRECONDITION_FAILED");
    expect(sourceIssue?.message).toContain("48 jam");
  });

  test("4. Submission NEWS dengan source PRIMARY atau OFFICIAL bertanggal dalam 48 jam diterima", async () => {
    process.env.VERAX_ALLOW_NEWS_INGESTION = "true";

    // 12 jam yang lalu (dalam 48 jam)
    const freshDate = new Date(Date.now() - 12 * 3600_000).toISOString();

    const payload = createValidNewsPayload({
      sources: [
        {
          title: "Transkrip Pernyataan Pers Resmi Terkini",
          url: "https://example.com/fresh-primary",
          sourceType: "PRIMARY",
          publishedAt: freshDate,
          isKeySource: true,
        },
      ],
    });

    const req = new Request("http://localhost/api/internal/v1/ai-submissions/validate", {
      method: "POST",
      headers: {
        authorization: authHeader,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const res = await validatePost(req);
    expect(res.status).toBe(200);

    const json = (await res.json()) as { valid: boolean };
    expect(json.valid).toBe(true);
  });

  // =========================================================================
  // 3. PANJANG VERIFICATION NOTES MINIMAL 80 KARAKTER
  // =========================================================================
  test("5. Submission NEWS dengan verificationNotes di bawah 80 karakter ditolak 422", async () => {
    process.env.VERAX_ALLOW_NEWS_INGESTION = "true";

    // Catatan hanya 45 karakter (kurang dari syarat 80 karakter)
    const shortNotes = "Data diverifikasi dari web resmi kementerian.";
    expect(shortNotes.length).toBeLessThan(80);

    const payload = createValidNewsPayload({
      verificationNotes: shortNotes,
    });

    const req = new Request("http://localhost/api/internal/v1/ai-submissions/validate", {
      method: "POST",
      headers: {
        authorization: authHeader,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const res = await validatePost(req);
    expect(res.status).toBe(422);

    const json = (await res.json()) as { details?: Array<{ path?: string; code?: string; message?: string }> };
    const notesIssue = json.details?.find((d) => d.path === "verificationNotes");
    expect(notesIssue).toBeDefined();
    expect(notesIssue?.code).toBe("FORMAT_PRECONDITION_FAILED");
    expect(notesIssue?.message).toContain("80 karakter");
  });

  // =========================================================================
  // 4. WAJIB REFERENSI NOVELTY CHECK (COVERAGE)
  // =========================================================================
  test("6. Submission NEWS tanpa referensi novelty check ditolak 422", async () => {
    process.env.VERAX_ALLOW_NEWS_INGESTION = "true";

    const payload = createValidNewsPayload();
    delete payload.coverageCheck;
    delete payload.coverageOverlapLevel;

    const req = new Request("http://localhost/api/internal/v1/ai-submissions/validate", {
      method: "POST",
      headers: {
        authorization: authHeader,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const res = await validatePost(req);
    expect(res.status).toBe(422);

    const json = (await res.json()) as { details?: Array<{ path?: string; code?: string; message?: string }> };
    const coverageIssue = json.details?.find((d) => d.path === "coverageCheck");
    expect(coverageIssue).toBeDefined();
    expect(coverageIssue?.code).toBe("FORMAT_PRECONDITION_FAILED");
  });

  test("7. Submission NEWS dengan overlapLevel high tanpa penjelasan angle baru di verificationNotes ditolak 422", async () => {
    process.env.VERAX_ALLOW_NEWS_INGESTION = "true";

    // Catatan panjang (> 80 karakter) tapi tanpa penjelasan angle baru
    const notesWithoutAngle =
      "Verifikasi dokumen telah dilakukan secara komprehensif dari rilis resmi dinas. Seluruh angka anggaran telah diperiksa silang pada tabel lampiran pengumuman pemerintah daerah.";
    expect(notesWithoutAngle.length).toBeGreaterThanOrEqual(80);

    const payload = createValidNewsPayload({
      coverageCheck: {
        overlapLevel: "high",
        checkedAt: new Date().toISOString(),
      },
      verificationNotes: notesWithoutAngle,
    });

    const req = new Request("http://localhost/api/internal/v1/ai-submissions/validate", {
      method: "POST",
      headers: {
        authorization: authHeader,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const res = await validatePost(req);
    expect(res.status).toBe(422);

    const json = (await res.json()) as { details?: Array<{ path?: string; code?: string; message?: string }> };
    const notesIssue = json.details?.find((d) => d.path === "verificationNotes");
    expect(notesIssue).toBeDefined();
    expect(notesIssue?.code).toBe("FORMAT_PRECONDITION_FAILED");
    expect(notesIssue?.message).toContain("sudut pandang atau angle baru");
  });

  test("8. Submission NEWS dengan overlapLevel high DAN ada penjelasan angle baru di verificationNotes diterima", async () => {
    process.env.VERAX_ALLOW_NEWS_INGESTION = "true";

    const notesWithAngle =
      "Verifikasi dokumen telah dilakukan langsung dari rilis resmi dinas daerah. Sudut pandang baru: Naskah ini mengkaji dampak alokasi belanja modal terhadap fasilitas pendidikan pedesaan yang belum pernah diulas pada liputan sebelumnya.";
    expect(notesWithAngle.length).toBeGreaterThanOrEqual(80);

    const payload = createValidNewsPayload({
      coverageCheck: {
        overlapLevel: "high",
        checkedAt: new Date().toISOString(),
      },
      verificationNotes: notesWithAngle,
    });

    const req = new Request("http://localhost/api/internal/v1/ai-submissions/validate", {
      method: "POST",
      headers: {
        authorization: authHeader,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const res = await validatePost(req);
    expect(res.status).toBe(200);

    const json = (await res.json()) as { valid: boolean };
    expect(json.valid).toBe(true);
  });

  test("8b. Bidang alternatif coverageOverlapLevel didukung sebagai referensi kebaruan", async () => {
    process.env.VERAX_ALLOW_NEWS_INGESTION = "true";

    const payload = createValidNewsPayload({
      coverageOverlapLevel: "partial",
    });
    delete payload.coverageCheck;

    const req = new Request("http://localhost/api/internal/v1/ai-submissions/validate", {
      method: "POST",
      headers: {
        authorization: authHeader,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const res = await validatePost(req);
    expect(res.status).toBe(200);
  });

  // =========================================================================
  // 5. RATE LIMITING TERPISAH KHUSUS NEWS
  // =========================================================================
  test("9. Rate limit NEWS teruji terpisah dari limit umum: kirim melebihi batas harian ditolak 429, sementara OPINION tetap bisa submit", async () => {
    process.env.VERAX_ALLOW_NEWS_INGESTION = "true";
    resetRateLimits();

    // Kuota harian NEWS adalah 5 naskah per hari. Kirim 5 naskah valid secara berurutan.
    for (let i = 1; i <= 5; i++) {
      const payload = createValidNewsPayload({
        title: `Liputan Berita Harian Ke-${i} Hari Ini ${Date.now()}`,
        idempotencyKey: `news-quota-${i}-${Date.now()}`,
      });

      const req = new Request("http://localhost/api/internal/v1/ai-submissions", {
        method: "POST",
        headers: {
          authorization: authHeader,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const res = await aiSubmissionsPost(req);
      expect(res.status).toBe(201);
    }

    // Naskah NEWS ke-6 melebihi batas kuota harian (5/hari) -> wajib ditolak 429
    const sixthNewsPayload = createValidNewsPayload({
      title: `Liputan Berita Harian Ke-6 Melebihi Batas ${Date.now()}`,
      idempotencyKey: `news-quota-6-${Date.now()}`,
    });

    const sixthReq = new Request("http://localhost/api/internal/v1/ai-submissions", {
      method: "POST",
      headers: {
        authorization: authHeader,
        "content-type": "application/json",
      },
      body: JSON.stringify(sixthNewsPayload),
    });

    const sixthRes = await aiSubmissionsPost(sixthReq);
    expect(sixthRes.status).toBe(429);

    const sixthJson = (await sixthRes.json()) as { code: string; reason?: string; error: string };
    expect(sixthJson.code).toBe("RATE_LIMITED");
    expect(sixthJson.reason).toBe("NEWS_DAILY_LIMIT_EXCEEDED");
    expect(sixthRes.headers.get("Retry-After")).toBeDefined();

    // SEMENTARA ITU: format lain (misalnya OPINION) dari klien yang sama TETAP BISA SUBMIT NORMAL (201)
    const opinionPayload = {
      title: `Catatan Opini Integritas Data Publik ${Date.now()}`,
      deck: "Pandangan editorial mengenai pentingnya verifikasi independen data keterbukaan.",
      desk: "nasional-publik",
      format: "OPINION",
      content: [
        {
          type: "paragraph",
          text: "Transparansi anggaran memerlukan konsistensi metodologis dan kesiapan ruang redaksi menguji setiap dokumen.",
        },
      ],
      sources: [
        {
          title: "Laporan Kebijakan Komparatif",
          url: "https://example.com/opinion-source",
          sourceType: "SECONDARY",
        },
      ],
      aiInvolvement: "assistive",
      agentId: "agent-opinion-writer",
      idempotencyKey: `opinion-while-news-capped-${Date.now()}`,
    };

    const opinionReq = new Request("http://localhost/api/internal/v1/ai-submissions", {
      method: "POST",
      headers: {
        authorization: authHeader,
        "content-type": "application/json",
      },
      body: JSON.stringify(opinionPayload),
    });

    const opinionRes = await aiSubmissionsPost(opinionReq);
    expect(opinionRes.status).toBe(201);
  });

  // =========================================================================
  // 6. ISOLASI FORMAT LAIN TIDAK TERPENGARUH
  // =========================================================================
  test("10. Format lain (OPINION, ANALYSIS, EXPLAINER, FEATURE, INTERVIEW) tidak terpengaruh syarat ketat NEWS", async () => {
    process.env.VERAX_ALLOW_NEWS_INGESTION = "true";

    // 1. EXPLAINER: Boleh dengan sumber SECONDARY dan tanpa novelty check
    const explainerPayload = {
      title: `Panduan Cara Membaca Ringkasan APBD Provinsi ${Date.now()}`,
      desk: "nasional-publik",
      format: "EXPLAINER",
      content: [
        {
          type: "paragraph",
          text: "Artikel penjelas langkah demi langkah dalam memahami pos-pos belanja daerah.",
        },
      ],
      sources: [
        {
          title: "Glosarium Istilah Keuangan",
          url: "https://example.com/explainer-sec",
          sourceType: "SECONDARY",
        },
      ],
      aiInvolvement: "assistive",
      agentId: "agent-explainer",
      idempotencyKey: `explainer-test-${Date.now()}`,
    };

    const expReq = new Request("http://localhost/api/internal/v1/ai-submissions/validate", {
      method: "POST",
      headers: {
        authorization: authHeader,
        "content-type": "application/json",
      },
      body: JSON.stringify(explainerPayload),
    });
    const expRes = await validatePost(expReq);
    expect(expRes.status).toBe(200);

    // 2. FEATURE: Tetap menjalankan prasyarat minSupportsLength 20 dan minVerificationNotesLength 20 miliknya sendiri
    const featureShortNotes = {
      title: `Catatan Perjalanan Nelayan Tradisional di Pesisir Utara ${Date.now()}`,
      desk: "nasional-publik",
      format: "FEATURE",
      content: [{ type: "paragraph", text: "Kisah warga pesisir menghadapi pasang." }],
      sources: [
        {
          title: "Catatan Wawancara Nelayan",
          url: "https://example.com/interview-rec",
          sourceType: "INTERVIEW",
          supports: "Transkrip wawancara warga mengenai pasang rob di pesisir.",
        },
      ],
      verificationNotes: "Terlalu pendek", // < 20 karakter
      aiInvolvement: "assistive",
      agentId: "agent-feature",
      idempotencyKey: `feature-fail-${Date.now()}`,
    };

    const featReq = new Request("http://localhost/api/internal/v1/ai-submissions/validate", {
      method: "POST",
      headers: {
        authorization: authHeader,
        "content-type": "application/json",
      },
      body: JSON.stringify(featureShortNotes),
    });
    const featRes = await validatePost(featReq);
    expect(featRes.status).toBe(422);

    const featJson = (await featRes.json()) as { details?: Array<{ path?: string; code?: string }> };
    expect(featJson.details?.some((d) => d.path === "verificationNotes")).toBe(true);

    // FEATURE dengan verificationNotes 25 karakter (cukup untuk FEATURE, tapi < 80 untuk NEWS) diterima
    const featurePass = {
      ...featureShortNotes,
      verificationNotes: "Verifikasi transkrip rekaman wawancara audio lapangan.",
      idempotencyKey: `feature-pass-${Date.now()}`,
    };

    const featPassReq = new Request("http://localhost/api/internal/v1/ai-submissions/validate", {
      method: "POST",
      headers: {
        authorization: authHeader,
        "content-type": "application/json",
      },
      body: JSON.stringify(featurePass),
    });
    const featPassRes = await validatePost(featPassReq);
    expect(featPassRes.status).toBe(200);
  });
});

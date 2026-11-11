// Test suite komprehensif untuk Fase 3: Developer Portal dan AI Agent Integration Infrastructure.
// Menguji lifecycle kredensial, rotasi, grace period, endpoint ingestion, dry-run, idempotensi,
// isolasi kepemilikan submission, dokumentasi mesin, logging permintaan, dan playground.

import { test, describe, beforeAll, afterAll, expect } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, execSync, type ChildProcess } from "node:child_process";
import {
  seedTestFixtures,
  cleanupTestData,
  getTestDb,
  BASE,
  DB_URL,
  assertApprovedTestDatabase,
} from "./lib/test-db";
import {
  loginAs,
  get,
  postJson,
  patchJson,
  type TestClient,
} from "./lib/http";
import { hashClientSecret } from "@/lib/api-key";

let chief: TestClient;
let writer: TestClient;
let testServerProcess: ChildProcess | null = null;

beforeAll(async () => {
  assertApprovedTestDatabase(DB_URL);

  const serverScript = path.resolve(".next/standalone/server.js");
  if (!fs.existsSync(serverScript)) {
    execSync("bun run build", { stdio: "pipe" });
  }

  let isServerRunning = await fetch(`${BASE}/api/auth/csrf`, { signal: AbortSignal.timeout(600) })
    .then((r) => r.ok)
    .catch(() => false);

  if (!isServerRunning) {
    const childEnv = { ...process.env };
    delete childEnv.TURSO_DATABASE_URL;
    delete childEnv.TURSO_AUTH_TOKEN;
    childEnv.PORT = "3088";
    childEnv.DATABASE_URL = DB_URL;
    childEnv.AUTH_SECRET = "verax-dev-secret-change-me-in-production";
    childEnv.NEXTAUTH_URL = BASE;

    testServerProcess = spawn("node", [serverScript], {
      env: childEnv,
      stdio: "pipe",
    });

    const start = Date.now();
    while (Date.now() - start < 15000) {
      try {
        const res = await fetch(`${BASE}/api/auth/csrf`, { signal: AbortSignal.timeout(600) });
        if (res.ok) {
          isServerRunning = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 250));
    }

    if (!isServerRunning) {
      if (testServerProcess) testServerProcess.kill();
      throw new Error(`CRITICAL: Server uji terisolasi pada ${BASE} gagal berjalan dalam 15s`);
    }
  }

  await cleanupTestData();
  await seedTestFixtures();
  chief = await loginAs("chief");
  writer = await loginAs("author");
});

afterAll(async () => {
  if (testServerProcess) {
    testServerProcess.kill();
  }
  await cleanupTestData();
});

describe("Phase 3: Developer Portal and AI Agent Integration Infrastructure", () => {
  const db = getTestDb();

  let createdClientId: string;
  let clientIdentifier: string;
  let primarySecret: string;
  let rotatedSecret: string;

  let client2Id: string;
  let client2Identifier: string;
  let client2Secret: string;

  let createdSubmissionId: string;
  let createdArticleId: string;

  // ---------------------------------------------------------------------------
  // 1. Kredensial & Lifecycle Klien API
  // ---------------------------------------------------------------------------

  test("1. Non-Chief Editor (Writer) dilarang membuat klien API (403)", async () => {
    const res = await postJson(
      "/api/studio/api-clients",
      {
        name: "Unauthorized Client",
        environment: "DEVELOPMENT",
      },
      writer,
    );
    expect(res.status).toBe(403);
  });

  test("2. Chief Editor dapat mendaftarkan Klien API baru dengan secret satu kali tampil (201)", async () => {
    const res = await postJson(
      "/api/studio/api-clients",
      {
        name: "Agen Kebijakan AI Utama",
        description: "Agen analisis kebijakan teknologi dan regulasi digital",
        ownerName: "Tim Lab Riset Kebijakan",
        environment: "DEVELOPMENT",
        expiresInDays: 30,
      },
      chief,
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      id: string;
      clientId: string;
      secret: string;
      name: string;
      status: string;
      environment: string;
    };

    expect(body.id).toBeDefined();
    expect(body.clientId.startsWith("vrtc_")).toBe(true);
    expect(body.secret.startsWith("vrtk_")).toBe(true);
    expect(body.status).toBe("ACTIVE");
    expect(body.environment).toBe("DEVELOPMENT");

    createdClientId = body.id;
    clientIdentifier = body.clientId;
    primarySecret = body.secret;

    // Verifikasi di basis data: Secret TIDAK pernah disimpan teks-polos
    const record = await db.apiClient.findUnique({
      where: { id: createdClientId },
      include: { credentials: true },
    });
    expect(record).not.toBeNull();
    expect(record?.secretHash).not.toBe(primarySecret);
    expect(record?.secretHash).toBe(hashClientSecret(primarySecret));
    expect(record?.credentials.length).toBeGreaterThanOrEqual(1);
    expect(record?.credentials[0].secretHash).toBe(hashClientSecret(primarySecret));
    expect(record?.credentials[0].status).toBe("ACTIVE");
  });

  test("3. Pendaftaran Klien API kedua untuk uji isolasi kepemilikan antar-klien", async () => {
    const res = await postJson(
      "/api/studio/api-clients",
      {
        name: "Agen Investigasi Kedua",
        environment: "DEVELOPMENT",
      },
      chief,
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; clientId: string; secret: string };
    client2Id = body.id;
    client2Identifier = body.clientId;
    client2Secret = body.secret;
  });

  test("4. Permintaan dengan header autentikasi salah atau secret palsu ditolak (401)", async () => {
    const res1 = await fetch(`${BASE}/api/internal/v1/ai-submissions`, {
      method: "POST",
      headers: {
        Authorization: "Bearer invalid_token_format",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    expect(res1.status).toBe(401);

    const res2 = await fetch(`${BASE}/api/internal/v1/ai-submissions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientIdentifier}.vrtk_bad_secret_000000000000000000`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    expect(res2.status).toBe(401);
  });

  // ---------------------------------------------------------------------------
  // 2. Rotasi Kredensial & Masa Tenggang (Grace Period)
  // ---------------------------------------------------------------------------

  test("5. Chief Editor dapat merotasi kredensial dengan masa tenggang (200)", async () => {
    const res = await postJson(
      `/api/studio/api-clients/${createdClientId}/rotate`,
      {
        gracePeriodHours: 48,
        expiresInDays: 60,
      },
      chief,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { secret: string; keyPrefix: string; gracePeriodHours: number };
    expect(body.secret.startsWith("vrtk_")).toBe(true);
    expect(body.gracePeriodHours).toBe(48);

    rotatedSecret = body.secret;

    // Periksa status di basis data: Kredensial lama berstatus GRACE_PERIOD
    const creds = await db.apiClientCredential.findMany({
      where: { apiClientId: createdClientId },
      orderBy: { createdAt: "asc" },
    });
    expect(creds.length).toBeGreaterThanOrEqual(2);
    expect(creds[0].status).toBe("GRACE_PERIOD");
    expect(creds[0].gracePeriodEndsAt).not.toBeNull();
    expect(creds[1].status).toBe("ACTIVE");
  });

  test("6. Selama masa tenggang aktif, KUNCI LAMA tetap valid untuk panggilan API", async () => {
    const res = await fetch(`${BASE}/api/internal/v1/ai-submissions/validate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientIdentifier}.${primarySecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Draf Uji Coba Kunci Lama Dalam Masa Tenggang",
        desk: "teknologi-kebijakan",
        format: "ANALYSIS",
        content: [{ type: "paragraph", text: "Konten uji validitas grace period." }],
        sources: [
          {
            title: "Sumber Regulasi Uji",
            url: "https://example.com/grace-period",
            sourceType: "OFFICIAL",
          },
        ],
        aiInvolvement: "assistive",
        agentId: "agent-test",
        idempotencyKey: `grace-test-${Date.now()}`,
      }),
    });
    expect(res.status).toBe(200);
  });

  test("7. KUNCI BARU hasil rotasi langsung dapat digunakan", async () => {
    const res = await fetch(`${BASE}/api/internal/v1/ai-submissions/validate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientIdentifier}.${rotatedSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Draf Uji Coba Kunci Baru Hasil Rotasi",
        desk: "teknologi-kebijakan",
        format: "ANALYSIS",
        content: [{ type: "paragraph", text: "Konten uji validitas kunci baru." }],
        sources: [
          {
            title: "Sumber Regulasi Uji",
            url: "https://example.com/new-key",
            sourceType: "OFFICIAL",
          },
        ],
        aiInvolvement: "assistive",
        agentId: "agent-test",
        idempotencyKey: `new-key-test-${Date.now()}`,
      }),
    });
    expect(res.status).toBe(200);
  });

  test("8. Kredensial dengan masa tenggang yang telah berakhir ditolak (401)", async () => {
    // Simulasikan berakhirnya masa tenggang pada kredensial lama
    const oldCred = await db.apiClientCredential.findFirst({
      where: { apiClientId: createdClientId, status: "GRACE_PERIOD" },
    });
    expect(oldCred).not.toBeNull();

    await db.apiClientCredential.update({
      where: { id: oldCred!.id },
      data: { gracePeriodEndsAt: new Date(Date.now() - 3600_000) }, // 1 jam lalu
    });

    const res = await fetch(`${BASE}/api/internal/v1/ai-submissions/validate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientIdentifier}.${primarySecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });

  test("9. Kredensial yang dicabut secara spesifik langsung ditolak (401)", async () => {
    const activeCred = await db.apiClientCredential.findFirst({
      where: { apiClientId: createdClientId, status: "ACTIVE" },
    });
    expect(activeCred).not.toBeNull();

    const revokeRes = await postJson(
      `/api/studio/api-clients/${createdClientId}/revoke-credential`,
      { credentialId: activeCred!.id },
      chief,
    );
    expect(revokeRes.status).toBe(200);

    // Coba gunakan rotatedSecret yang baru saja dicabut
    const res = await fetch(`${BASE}/api/internal/v1/ai-submissions/validate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientIdentifier}.${rotatedSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);

    // Buat kredensial baru agar pengujian naskah berikutnya dapat berjalan
    const rotateAgain = await postJson(
      `/api/studio/api-clients/${createdClientId}/rotate`,
      { gracePeriodHours: 24 },
      chief,
    );
    const body = (await rotateAgain.json()) as { secret: string };
    rotatedSecret = body.secret;
  });

  // ---------------------------------------------------------------------------
  // 3. Dry-Run Validation (`POST /api/internal/v1/ai-submissions/validate`)
  // ---------------------------------------------------------------------------

  test("10. Dry-Run Validation menerima format NEWS yang valid (200 OK)", async () => {
    const res = await fetch(`${BASE}/api/internal/v1/ai-submissions/validate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientIdentifier}.${rotatedSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Liputan Berita Kilat Pemantauan Anggaran Publik",
        desk: "nasional-publik",
        format: "NEWS",
        content: [{ type: "paragraph", text: "Terjadi perkembangan pemantauan anggaran publik daerah." }],
        sources: [{ title: "Laporan Resmi Lembaga", url: "https://kemenkeu.go.id", sourceType: "OFFICIAL" }],
        aiInvolvement: "assistive",
        agentId: "agent-test",
        idempotencyKey: `dryrun-news-${Date.now()}`,
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean; desk: { slug: string } };
    expect(body.valid).toBe(true);
    expect(body.desk.slug).toBe("nasional-publik");
  });

  test("10b. Dry-Run Validation menolak format di luar spesifikasi dengan kode 422 FORMAT_REJECTED", async () => {
    const res = await fetch(`${BASE}/api/internal/v1/ai-submissions/validate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientIdentifier}.${rotatedSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Uji Coba Format Tidak Terdaftar",
        desk: "nasional-publik",
        format: "INVALID_FORMAT_TEST",
        content: [{ type: "paragraph", text: "Teks uji format tidak valid." }],
        sources: [{ title: "Sumber", url: "https://example.com", sourceType: "SECONDARY" }],
        aiInvolvement: "none",
        agentId: "agent-test",
        idempotencyKey: `dryrun-invalid-${Date.now()}`,
      }),
    });

    expect(res.status).toBe(422);
    const body = (await res.json()) as { code: string; error: string; details: any[] };
    expect(body.code).toBe("FORMAT_REJECTED");
  });

  test("11. Dry-Run Validation menerima naskah valid tanpa membuat rekaman di basis data (200)", async () => {
    const countBeforeArticle = await db.article.count();
    const countBeforeSubmission = await db.submission.count();

    const res = await fetch(`${BASE}/api/internal/v1/ai-submissions/validate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientIdentifier}.${rotatedSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Analisis: Kesiapan Standardisasi Algoritma Sektor Publik",
        deck: "Evaluasi kerangka akuntabilitas algoritma di Indonesia.",
        desk: "teknologi-kebijakan",
        format: "ANALYSIS",
        content: [
          { type: "paragraph", text: "Penerapan otomasi keputusan membutuhkan verifikasi independen." },
          { type: "heading", level: 2, text: "Urgensi Uji Bukti Faktual" },
        ],
        sources: [
          {
            title: "Dokumen Regulasi Tata Kelola Data Nasional",
            url: "https://peraturan.go.id/dokumen/tata-kelola-data.pdf",
            sourceType: "OFFICIAL",
            isKeySource: true,
          },
        ],
        aiInvolvement: "assistive",
        agentId: "agent-policy-v1",
        idempotencyKey: `dryrun-valid-${Date.now()}`,
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean; desk: { slug: string }; requestId: string };
    expect(body.valid).toBe(true);
    expect(body.desk.slug).toBe("teknologi-kebijakan");
    expect(body.requestId.startsWith("req_")).toBe(true);

    // Pastikan tidak ada rekaman artikel atau submission baru yang tercipta
    const countAfterArticle = await db.article.count();
    const countAfterSubmission = await db.submission.count();
    expect(countAfterArticle).toBe(countBeforeArticle);
    expect(countAfterSubmission).toBe(countBeforeSubmission);
  });

  // ---------------------------------------------------------------------------
  // 4. Ingestion API Sejati (`POST /api/internal/v1/ai-submissions`)
  // ---------------------------------------------------------------------------

  const canonicalIdempotencyKey = `submit-phase3-${Date.now()}`;
  const validPayload = {
    title: "Analisis: Menakar Akuntabilitas Hukum Sistem AI Sektor Publik",
    deck: "Kajian atas perlindungan hak prosedural warga negara dalam keputusan algoritmik.",
    desk: "teknologi-kebijakan",
    format: "ANALYSIS",
    content: [
      {
        type: "paragraph",
        text: "Penerapan sistem pengambilan keputusan otomatis dalam pelayanan publik menghadirkan tantangan terhadap asas transparansi.",
      },
      {
        type: "heading",
        level: 2,
        text: "Perlindungan Hak Prosedural Warga",
      },
      {
        type: "quote",
        text: "Keadilan administratif menuntut agar setiap keputusan yang membatasi hak warga disertai alasan teruji.",
        attribution: "Pakar Hukum Tata Negara",
      },
    ],
    sources: [
      {
        title: "Peraturan Pemerintah No. 28 Tahun 2025",
        publisher: "Kemenkumham",
        url: "https://peraturan.go.id/dokumen/pp-28-2025.pdf",
        sourceType: "OFFICIAL",
        isKeySource: true,
        supports: "Pasal kewajiban uji kelayakan sistem otomasi.",
      },
    ],
    aiInvolvement: "assistive",
    agentId: "policy-analyst-agent",
    idempotencyKey: canonicalIdempotencyKey,
  };

  test("12. Agen AI dapat mengirimkan naskah resmi, masuk sebagai DRAFT dan sumber UNVERIFIED (201)", async () => {
    const res = await fetch(`${BASE}/api/internal/v1/ai-submissions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientIdentifier}.${rotatedSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validPayload),
    });

    expect(res.status).toBe(201);
    expect(res.headers.get("x-request-id")).toBeDefined();

    const body = (await res.json()) as {
      submissionId: string;
      articleId: string;
      status: string;
      idempotentReplay: boolean;
      requestId: string;
    };

    expect(body.submissionId).toBeDefined();
    expect(body.articleId).toBeDefined();
    expect(body.status).toBe("DRAFT");
    expect(body.idempotentReplay).toBe(false);
    expect(body.requestId.startsWith("req_")).toBe(true);

    createdSubmissionId = body.submissionId;
    createdArticleId = body.articleId;

    // Verifikasi di basis data
    const article = await db.article.findUnique({
      where: { id: createdArticleId },
      include: { sources: true, versions: true },
    });
    expect(article).not.toBeNull();
    expect(article?.status).toBe("DRAFT");
    expect(article?.origin).toBe("INGESTION_API");
    expect(article?.sources.length).toBe(1);
    expect(article?.sources[0].verificationStatus).toBe("UNVERIFIED"); // Selalu UNVERIFIED saat intake
    expect(article?.versions.length).toBe(1);
    expect(article?.versions[0].versionType).toBe("ingestion");

    const submission = await db.submission.findUnique({
      where: { id: createdSubmissionId },
    });
    expect(submission?.apiClientId).toBe(createdClientId);
  });

  test("12b. Pengiriman naskah dengan format NEWS diterima sebagai DRAFT dan sumber UNVERIFIED (201)", async () => {
    const newsPayload = {
      title: "Laporan Pemantauan Pembangunan Jaringan Internet Terluar",
      desk: "nasional-publik",
      format: "NEWS",
      deck: "Pemantauan proyek konektivitas digital di wilayah terluar.",
      content: [
        { type: "paragraph", text: "Sebanyak 120 menara pemancar baru terpasang di wilayah terluar." },
        { type: "quote", text: "Proyek diselesaikan sesuai spesifikasi.", attribution: "Pejabat Terkait" },
      ],
      sources: [
        {
          title: "Laporan Resmi Kemenkominfo",
          url: "https://www.kominfo.go.id/dokumen-resmi",
          sourceType: "OFFICIAL",
          isKeySource: true,
        },
      ],
      aiInvolvement: "assistive",
      agentId: "agent-news-gatherer",
      idempotencyKey: `news-live-${Date.now()}`,
    };

    const res = await fetch(`${BASE}/api/internal/v1/ai-submissions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientIdentifier}.${rotatedSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newsPayload),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { submissionId: string; articleId: string; status: string };
    expect(body.status).toBe("DRAFT");

    const newsArticle = await db.article.findUnique({
      where: { id: body.articleId },
      include: { sources: true },
    });
    expect(newsArticle?.format).toBe("NEWS");
    expect(newsArticle?.status).toBe("DRAFT");
    expect(newsArticle?.sources[0].verificationStatus).toBe("UNVERIFIED");
  });

  test("13. Replay dengan idempotency key dan payload sama mengembalikan 200 idempotentReplay", async () => {
    const res = await fetch(`${BASE}/api/internal/v1/ai-submissions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientIdentifier}.${rotatedSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validPayload),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      submissionId: string;
      articleId: string;
      idempotentReplay: boolean;
    };
    expect(body.submissionId).toBe(createdSubmissionId);
    expect(body.articleId).toBe(createdArticleId);
    expect(body.idempotentReplay).toBe(true);
  });

  test("14. Idempotency key sama dengan payload berbeda ditolak dengan 409 IDEMPOTENCY_CONFLICT", async () => {
    const mutatedPayload = {
      ...validPayload,
      title: "Judul Berbeda dengan Idempotency Key Sama Persis",
    };

    const res = await fetch(`${BASE}/api/internal/v1/ai-submissions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientIdentifier}.${rotatedSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mutatedPayload),
    });

    expect(res.status).toBe(409);
    const body = (await res.json()) as { code: string; error: string };
    expect(body.code).toBe("IDEMPOTENCY_CONFLICT");
  });

  // ---------------------------------------------------------------------------
  // 5. Submission Status & Isolasi Kepemilikan Antar-Klien
  // ---------------------------------------------------------------------------

  test("15. Klien pemilik dapat memantau status editorial naskah miliknya (200)", async () => {
    const res = await fetch(
      `${BASE}/api/internal/v1/ai-submissions/${createdSubmissionId}`,
      {
        headers: {
          Authorization: `Bearer ${clientIdentifier}.${rotatedSecret}`,
        },
      },
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      submissionId: string;
      articleId: string;
      submissionStatus: string;
      editorialStatus: string;
      format: string;
      editorialDecision: { isPublished: boolean };
    };

    expect(body.submissionId).toBe(createdSubmissionId);
    expect(body.articleId).toBe(createdArticleId);
    expect(body.submissionStatus).toBe("SUBMITTED");
    expect(body.editorialStatus).toBe("DRAFT");
    expect(body.format).toBe("ANALYSIS");
    expect(body.editorialDecision.isPublished).toBe(false);
  });

  test("16. Klien lain dilarang membaca status naskah klien lain (404 Not Found)", async () => {
    const res = await fetch(
      `${BASE}/api/internal/v1/ai-submissions/${createdSubmissionId}`,
      {
        headers: {
          Authorization: `Bearer ${client2Identifier}.${client2Secret}`,
        },
      },
    );

    // Mengembalikan 404 untuk mencegah enumerasi ID submission
    expect(res.status).toBe(404);
  });

  // ---------------------------------------------------------------------------
  // 6. Dokumentasi Mesin & Penemuan Mandiri
  // ---------------------------------------------------------------------------

  test("17. Endpoint /openapi.json mengembalikan dokumen spesifikasi valid (200)", async () => {
    const res = await fetch(`${BASE}/openapi.json`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");

    const spec = (await res.json()) as {
      openapi: string;
      info: { title: string };
      paths: Record<string, any>;
    };
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info.title).toContain("Verax Press");
    expect(spec.paths["/api/internal/v1/ai-submissions"]).toBeDefined();
    expect(spec.paths["/api/internal/v1/ai-submissions/validate"]).toBeDefined();
    expect(spec.paths["/api/internal/v1/ai-submissions/{submissionId}"]).toBeDefined();
    expect(spec.paths["/api/internal/v1/capabilities"]).toBeDefined();
  });

  test("18. Endpoint /.well-known/verax-agent.json mengembalikan metadata penemuan (200)", async () => {
    const res = await fetch(`${BASE}/.well-known/verax-agent.json`);
    expect(res.status).toBe(200);
    const meta = (await res.json()) as {
      platform: string;
      constraints: { publicationRight: boolean; disallowedFormats: string[]; allowedFormats: string[] };
    };
    expect(meta.platform).toBe("Verax Press");
    expect(meta.constraints.publicationRight).toBe(false);
    expect(meta.constraints.allowedFormats).toContain("NEWS");
    expect(meta.constraints.disallowedFormats).not.toContain("NEWS");
  });

  test("19. Endpoint /llms.txt dan /llms-full.txt bebas tanda pisah terlarang (200)", async () => {
    const res1 = await fetch(`${BASE}/llms.txt`);
    expect(res1.status).toBe(200);
    const text1 = await res1.text();
    expect(text1).toContain("Verax Press");
    expect(text1).not.toContain("—");
    expect(text1).not.toContain("--");

    const res2 = await fetch(`${BASE}/llms-full.txt`);
    expect(res2.status).toBe(200);
    const text2 = await res2.text();
    expect(text2).toContain("IngestionPayload");
    expect(text2).not.toContain("—");
    expect(text2).not.toContain("--");
  });

  test("20. Endpoint /api/internal/v1/capabilities menyajikan daftar rubrik aktif (200)", async () => {
    const res = await fetch(`${BASE}/api/internal/v1/capabilities`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      capabilities: { publication: boolean };
      allowedFormats: string[];
      desks: Array<{ slug: string; name: string }>;
    };
    expect(body.capabilities.publication).toBe(false);
    expect(body.allowedFormats).toContain("NEWS");
    expect(body.desks.length).toBeGreaterThanOrEqual(1);
  });

  // ---------------------------------------------------------------------------
  // 7. Request Logging, Overview Metrics, & Playground Proxy
  // ---------------------------------------------------------------------------

  test("21. Permintaan ingestion tercatat dalam tabel ApiRequestLog dengan metadata tersanitasi", async () => {
    const logs = await db.apiRequestLog.findMany({
      where: { apiClientId: createdClientId },
      orderBy: { createdAt: "desc" },
    });
    expect(logs.length).toBeGreaterThanOrEqual(1);
    const latest = logs[0];
    expect(latest.requestId.startsWith("req_")).toBe(true);
    expect(latest.statusCode).toBeGreaterThanOrEqual(200);
    expect(latest.durationMs).toBeGreaterThanOrEqual(0);
    // Pastikan tidak ada kebocoran secret pada errorMessage atau database
    expect(latest.errorMessage || "").not.toContain(rotatedSecret);
  });

  test("22. Chief Editor dapat membaca log permintaan melalui /api/studio/api-clients/logs (200)", async () => {
    const res = await get("/api/studio/api-clients/logs?limit=10", chief);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { logs: any[]; total: number };
    expect(body.total).toBeGreaterThanOrEqual(1);
    expect(body.logs.length).toBeGreaterThanOrEqual(1);
    expect(body.logs[0].requestId).toBeDefined();
  });

  test("23. Chief Editor dapat membaca metrik aktual melalui /api/studio/api-clients/overview (200)", async () => {
    const res = await get("/api/studio/api-clients/overview", chief);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      totalClients: number;
      activeClients: number;
      requestsToday: number;
      environment: string;
    };
    expect(body.totalClients).toBeGreaterThanOrEqual(2);
    expect(body.activeClients).toBeGreaterThanOrEqual(2);
    expect(body.requestsToday).toBeGreaterThanOrEqual(1);
    expect(body.environment).toBeDefined();
  });

  test("24. Server-Side Playground Proxy mengeksekusi dry-run tanpa mengekspos secret ke browser (200)", async () => {
    const res = await postJson(
      "/api/studio/api-clients/playground/run",
      {
        clientId: clientIdentifier,
        endpoint: "/api/internal/v1/ai-submissions/validate",
        payload: {
          title: "Uji Coba Melalui Meja Redaksi Studio Playground",
          desk: "teknologi-kebijakan",
          format: "ANALYSIS",
          content: [{ type: "paragraph", text: "Menguji playground proxy server." }],
          sources: [
            {
              title: "Sumber Dokumentasi Playground",
              url: "https://example.com/playground",
              sourceType: "OFFICIAL",
            },
          ],
          aiInvolvement: "assistive",
          agentId: "playground-agent",
          idempotencyKey: `playground-${Date.now()}`,
        },
      },
      chief,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      statusCode: number;
      durationMs: number;
      body: { valid: boolean };
      requestId: string;
    };
    expect(body.statusCode).toBe(200);
    expect(body.durationMs).toBeGreaterThanOrEqual(0);
    expect(body.body.valid).toBe(true);
    expect(body.requestId.startsWith("req_")).toBe(true);
  });

  test("25. Agen AI tidak memiliki endpoint ataupun hak untuk menerbitkan artikel (404/403)", async () => {
    // Upaya langsung memanggil publish oleh API client
    const res1 = await fetch(`${BASE}/api/internal/v1/ai-submissions/publish`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientIdentifier}.${rotatedSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ articleId: createdArticleId }),
    });
    // Endpoint tidak ada (404/405)
    expect([404, 405]).toContain(res1.status);

    // Upaya mengakses CMS transition endpoint menggunakan kredensial API client
    const res2 = await fetch(`${BASE}/api/studio/articles/${createdArticleId}/transition`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clientIdentifier}.${rotatedSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "PUBLISH" }),
    });
    // Ditolak karena API client bukan sesi staf redaksi
    expect([401, 403]).toContain(res2.status);
  });
});

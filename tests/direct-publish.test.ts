// Test suite komprehensif untuk Direct Publish Feature:
// 1. Klien API standar (publishMode="standard"): naskah DRAFT, byline placeholder, sumber UNVERIFIED, submission SUBMITTED.
// 2. Klien API direct (publishMode="direct"):
//    - Valid sources + non-empty deck: status PUBLISHED, byline "Disunting oleh Redaksi Verax Press",
//      sumber VERIFIED & key source dipastikan ada, kontributor EDITOR Pemimpin Redaksi,
//      aiDisclosurePublic=false, submission RESOLVED, review DIRECT_PUBLISH, audit article.direct_published.
//    - Missing deck: ditolak 422 (DECK_REQUIRED).
//    - Failing sources: sumber gagal di-drop; jika ada yang lolos, naskah tetap terbit.
//    - All sources failing: ditolak 422 (DIRECT_PUBLISH_SOURCES_FAILED).
// 3. Manajemen Studio API Client:
//    - Chief Editor dapat membuat client dengan publishMode="direct" (POST).
//    - Chief Editor dapat memperbarui publishMode (PATCH).
//    - Non-chief editor dilarang (403).
// 4. Rendering publik /artikel/[slug]:
//    - Artikel direct-publish tersaji 200 OK dengan byline redaksi.
//    - Tidak ada kotak / label keterbukaan AI yang dirender ke publik.

import { test, describe, beforeAll, afterAll, expect } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { spawn, execSync, type ChildProcess } from "node:child_process";
import {
  seedTestFixtures,
  cleanupTestData,
  getTestDb,
  BASE,
  DB_URL,
  assertApprovedTestDatabase,
  syncStandaloneAssets,
} from "./lib/test-db";
import {
  loginAs,
  get,
  postJson,
  patchJson,
  type TestClient,
} from "./lib/http";
import { generateClientCredential, hashClientSecret } from "@/lib/api-key";
import { AI_PLACEHOLDER_BYLINE } from "@/lib/domain/constants";

let chief: TestClient;
let author: TestClient;
let testServerProcess: ChildProcess | null = null;
let mockSourceServer: http.Server | null = null;
let mockSourceBaseUrl: string = "";

const db = getTestDb();

// IDs to cleanup
const createdClientIds: string[] = [];
const createdArticleIds: string[] = [];

beforeAll(async () => {
  assertApprovedTestDatabase(DB_URL);

  // 1. Jalankan mock HTTP source server untuk pengujian verifikasi sumber
  await new Promise<void>((resolve) => {
    mockSourceServer = http.createServer((req, res) => {
      const url = req.url || "";
      if (url.startsWith("/valid-key-source")) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<html><body><h1>Dokumen Sumber Primer Valid</h1><p>Data resmi terverifikasi.</p></body></html>");
      } else if (url.startsWith("/valid-secondary-source")) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<html><body><h1>Dokumen Sumber Sekunder Valid</h1><p>Referensi terverifikasi.</p></body></html>");
      } else if (url.startsWith("/failing-source-500")) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("500 Internal Server Error");
      } else if (url.startsWith("/failing-source-404")) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Not Found");
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    mockSourceServer.listen(0, "127.0.0.1", () => {
      const addr = mockSourceServer!.address() as { port: number };
      mockSourceBaseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  // 2. Pastikan server Next.js terisolasi berjalan pada PORT 3088
  let isServerRunning = await fetch(`${BASE}/api/auth/csrf`, { signal: AbortSignal.timeout(600) })
    .then((r) => r.ok)
    .catch(() => false);

  if (!isServerRunning) {
    const serverScript = path.resolve(".next/standalone/server.js");
    if (!fs.existsSync(serverScript)) {
      execSync("bun run build", { stdio: "pipe" });
    }
    syncStandaloneAssets();

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
  author = await loginAs("author");

  // Pastikan record Person untuk Chief Editor ada (agar relasi ArticleContribution terpenuhi)
  const chiefUser = await db.staffUser.findFirst({
    where: { role: "CHIEF_EDITOR", status: "ACTIVE" },
  });
  if (chiefUser) {
    const existingPerson = await db.person.findFirst({
      where: { staffUserId: chiefUser.id },
    });
    if (!existingPerson) {
      await db.person.create({
        data: {
          staffUserId: chiefUser.id,
          accountType: "STAFF",
          publicName: chiefUser.name,
          anonymityMode: "REAL_NAME",
        },
      });
    }
  }
});

afterAll(async () => {
  if (mockSourceServer) {
    mockSourceServer.close();
  }
  if (testServerProcess) {
    testServerProcess.kill();
  }

  // Bersihkan data uji
  for (const cid of createdClientIds) {
    await db.apiClientCredential.deleteMany({ where: { apiClientId: cid } }).catch(() => {});
    await db.submission.deleteMany({ where: { apiClientId: cid } }).catch(() => {});
    await db.apiClient.deleteMany({ where: { id: cid } }).catch(() => {});
  }
  for (const aid of createdArticleIds) {
    await db.articleContribution.deleteMany({ where: { articleId: aid } }).catch(() => {});
    await db.sourceReference.deleteMany({ where: { articleId: aid } }).catch(() => {});
    await db.editorialReview.deleteMany({ where: { articleId: aid } }).catch(() => {});
    await db.articleVersion.deleteMany({ where: { articleId: aid } }).catch(() => {});
    await db.submission.deleteMany({ where: { articleId: aid } }).catch(() => {});
    await db.article.deleteMany({ where: { id: aid } }).catch(() => {});
  }
});

// Helper untuk mendaftarkan API Client langsung via DB atau API
async function createTestApiClient(options: {
  name: string;
  publishMode?: "standard" | "direct";
}): Promise<{ id: string; clientId: string; secret: string; authHeader: string }> {
  const cred = generateClientCredential();
  const secretHash = hashClientSecret(cred.secret);

  const client = await db.apiClient.create({
    data: {
      name: options.name,
      clientId: cred.clientId,
      ownerName: "Test Suite Direct Publish",
      environment: "DEVELOPMENT",
      publishMode: options.publishMode || "standard",
      status: "ACTIVE",
      scopes: "submit",
      secretHash,
      credentials: {
        create: {
          name: "Direct Publish Key",
          keyPrefix: cred.secret.slice(0, 10),
          secretHash,
          status: "ACTIVE",
        },
      },
    },
  });

  createdClientIds.push(client.id);

  return {
    id: client.id,
    clientId: cred.clientId,
    secret: cred.secret,
    authHeader: `Bearer ${cred.clientId}.${cred.secret}`,
  };
}

describe("1. Manajemen Studio API Client (Direct Publish Mode)", () => {
  let createdByStudioId: string;

  test("1.1 Non-Chief Editor (Writer) dilarang membuat API client (403)", async () => {
    const res = await postJson(
      "/api/studio/api-clients",
      {
        name: "Unauthorized Direct Client",
        publishMode: "direct",
      },
      author,
    );
    expect(res.status).toBe(403);
  });

  test("1.2 Chief Editor dapat membuat client dengan publishMode='direct' (201)", async () => {
    const res = await postJson(
      "/api/studio/api-clients",
      {
        name: "Klien Direct Publish Studio",
        description: "Klien terpercaya dengan otorisasi direct publish",
        environment: "DEVELOPMENT",
        publishMode: "direct",
      },
      chief,
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.id).toBeDefined();
    expect(body.publishMode).toBe("direct");
    createdByStudioId = body.id;
    createdClientIds.push(body.id);

    // Verifikasi di DB
    const inDb = await db.apiClient.findUnique({ where: { id: body.id } });
    expect(inDb).not.toBeNull();
    expect(inDb?.publishMode).toBe("direct");
  });

  test("1.3 Chief Editor dapat membuat client dengan default publishMode='standard' (201)", async () => {
    const res = await postJson(
      "/api/studio/api-clients",
      {
        name: "Klien Standard Studio Default",
        environment: "DEVELOPMENT",
      },
      chief,
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.publishMode).toBe("standard");
    createdClientIds.push(body.id);

    const inDb = await db.apiClient.findUnique({ where: { id: body.id } });
    expect(inDb?.publishMode).toBe("standard");
  });

  test("1.4 Chief Editor dapat mengubah publishMode dari direct ke standard dan sebaliknya (200)", async () => {
    // Ubah ke standard
    const patchRes1 = await patchJson(
      `/api/studio/api-clients/${createdByStudioId}`,
      { publishMode: "standard" },
      chief,
    );
    expect(patchRes1.status).toBe(200);
    const body1 = (await patchRes1.json()) as any;
    expect(body1.publishMode).toBe("standard");

    const inDb1 = await db.apiClient.findUnique({ where: { id: createdByStudioId } });
    expect(inDb1?.publishMode).toBe("standard");

    // Ubah kembali ke direct
    const patchRes2 = await patchJson(
      `/api/studio/api-clients/${createdByStudioId}`,
      { publishMode: "direct" },
      chief,
    );
    expect(patchRes2.status).toBe(200);
    const body2 = (await patchRes2.json()) as any;
    expect(body2.publishMode).toBe("direct");

    const inDb2 = await db.apiClient.findUnique({ where: { id: createdByStudioId } });
    expect(inDb2?.publishMode).toBe("direct");
  });

  test("1.5 Non-Chief Editor (Writer) dilarang mengubah publishMode klien (403)", async () => {
    const res = await patchJson(
      `/api/studio/api-clients/${createdByStudioId}`,
      { publishMode: "standard" },
      author,
    );
    expect(res.status).toBe(403);
  });
});

describe("2. Standard API Client Submission (Backward Compatibility)", () => {
  let standardClient: { id: string; authHeader: string };

  beforeAll(async () => {
    standardClient = await createTestApiClient({
      name: "Standard Client Backward Compat",
      publishMode: "standard",
    });
  });

  test("2.1 Klien mode standard menghasilkan naskah DRAFT, byline placeholder, sumber UNVERIFIED, submission SUBMITTED", async () => {
    const idempotencyKey = `std-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const payload = {
      title: "Pembaruan Regulasi Perlindungan Data Konsumen Nasional",
      deck: "Tinjauan mendalam tentang penyesuaian aturan privasi data di tingkat kementerian.",
      desk: "hukum-keadilan",
      format: "ANALYSIS",
      content: [
        {
          type: "paragraph",
          text: "Kementerian terkait mengumumkan penyesuaian pedoman kepatuhan data digital.",
        },
      ],
      sources: [
        {
          title: "Dokumen Regulasi Privasi",
          url: `${mockSourceBaseUrl}/valid-key-source`,
          sourceType: "OFFICIAL",
          isKeySource: true,
        },
      ],
      aiInvolvement: "assistive",
      agentId: "agent-standard-tester",
      idempotencyKey,
    };

    const res = await fetch(`${BASE}/api/internal/v1/ai-submissions`, {
      method: "POST",
      headers: {
        authorization: standardClient.authHeader,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(201);
    const receipt = (await res.json()) as any;
    expect(receipt.received).toBe(true);
    expect(receipt.articleId).toBeDefined();

    createdArticleIds.push(receipt.articleId);

    // Verifikasi di DB: status DRAFT, byline placeholder, sumber UNVERIFIED, submission SUBMITTED
    const article = await db.article.findUnique({
      where: { id: receipt.articleId },
      include: { sources: true, contributions: true },
    });
    expect(article).not.toBeNull();
    expect(article?.status).toBe("DRAFT");
    expect(article?.byline).toBe(AI_PLACEHOLDER_BYLINE);
    expect(article?.aiDisclosurePublic).toBe(false);

    expect(article?.sources.length).toBe(1);
    expect(article?.sources[0].verificationStatus).toBe("UNVERIFIED");

    const submission = await db.submission.findUnique({
      where: { id: receipt.submissionId },
    });
    expect(submission?.status).toBe("SUBMITTED");

    // Pastikan tidak ada EditorialReview DIRECT_PUBLISH
    const reviews = await db.editorialReview.findMany({
      where: { articleId: receipt.articleId },
    });
    expect(reviews.some((r) => r.decision === "DIRECT_PUBLISH")).toBe(false);

    // Audit event yang dicatat adalah submission.ingested
    const audits = await db.auditEvent.findMany({
      where: { targetId: receipt.submissionId },
    });
    expect(audits.some((a) => a.action === "submission.ingested")).toBe(true);
  });
});

describe("3. Direct API Client Submission (Direct Publish Pipeline)", () => {
  let directClient: { id: string; authHeader: string };
  let publishedArticleSlug: string;

  beforeAll(async () => {
    directClient = await createTestApiClient({
      name: "Direct Client Automation Test",
      publishMode: "direct",
    });
  });

  test("3.1 Direct Client dengan sumber valid & deck lengkap langsung PUBLISHED dengan atribut verifikasi lengkap", async () => {
    const idempotencyKey = `direct-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const payload = {
      title: "Laporan Kinerja Transparansi Publik Sektor Energi 2026",
      deck: "Evaluasi komprehensif atas kepatuhan pelaporan emisi dan pengadaan sektor energi.",
      desk: "teknologi-kebijakan",
      format: "ANALYSIS",
      content: [
        {
          type: "heading",
          level: 2,
          text: "Temuan Pokok Akuntabilitas",
        },
        {
          type: "paragraph",
          text: "Transparansi data operasional menunjukkan peningkatan signifikan pasca audit triwulanan.",
        },
      ],
      sources: [
        {
          title: "Laporan Resmi Auditor Energi",
          url: `${mockSourceBaseUrl}/valid-key-source`,
          sourceType: "OFFICIAL",
          isKeySource: true,
        },
        {
          title: "Data Pembanding Industri",
          url: `${mockSourceBaseUrl}/valid-secondary-source`,
          sourceType: "DATA",
          isKeySource: false,
        },
      ],
      aiInvolvement: "assistive",
      aiUsageNote: "Pengecekan sintaks dan konsistensi data statistik dengan model analitik.",
      agentId: "agent-direct-publisher",
      idempotencyKey,
    };

    const res = await fetch(`${BASE}/api/internal/v1/ai-submissions`, {
      method: "POST",
      headers: {
        authorization: directClient.authHeader,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(201);
    const receipt = (await res.json()) as any;
    expect(receipt.received).toBe(true);
    expect(receipt.isPublished).toBe(true);
    expect(receipt.articleStatus).toBe("PUBLISHED");
    expect(receipt.submissionStatus).toBe("RESOLVED");

    createdArticleIds.push(receipt.articleId);

    // Verifikasi Article di DB
    const article = await db.article.findUnique({
      where: { id: receipt.articleId },
      include: {
        sources: true,
        contributions: { include: { person: true } },
        reviews: true,
      },
    });

    expect(article).not.toBeNull();
    publishedArticleSlug = article!.slug;

    expect(article?.status).toBe("PUBLISHED");
    expect(article?.byline).toBe("Disunting oleh Redaksi Verax Press");
    expect(article?.publishedAt).not.toBeNull();
    expect(article?.firstPublishedAt).not.toBeNull();
    expect(article?.aiDisclosurePublic).toBe(false);
    expect(article?.aiDisclosureNote).toBe(payload.aiUsageNote);

    // Verifikasi Sumber: minimal 1 key source berstatus VERIFIED
    expect(article?.sources.length).toBe(2);
    const keySources = article?.sources.filter((s) => s.isKeySource);
    expect(keySources?.length).toBeGreaterThanOrEqual(1);
    for (const src of article?.sources || []) {
      expect(src.verificationStatus).toBe("VERIFIED");
    }

    // Verifikasi Internal Contributor: Chief Editor assigned as EDITOR contribution
    const chiefUser = await db.staffUser.findFirst({
      where: { role: "CHIEF_EDITOR", status: "ACTIVE" },
    });
    expect(chiefUser).not.toBeNull();

    const editorContrib = article?.contributions.find(
      (c) => c.role === "EDITOR" && c.publicCredit === true,
    );
    expect(editorContrib).toBeDefined();
    expect(editorContrib?.person.staffUserId).toBe(chiefUser!.id);

    // Verifikasi EditorialReview: decision="DIRECT_PUBLISH"
    const directReview = article?.reviews.find(
      (r) => r.decision === "DIRECT_PUBLISH",
    );
    expect(directReview).toBeDefined();
    expect(directReview?.fromStatus).toBe("DRAFT");
    expect(directReview?.toStatus).toBe("PUBLISHED");

    // Verifikasi Submission status="RESOLVED"
    const submission = await db.submission.findUnique({
      where: { id: receipt.submissionId },
    });
    expect(submission?.status).toBe("RESOLVED");

    // Verifikasi AuditEvent: action="article.direct_published"
    const audit = await db.auditEvent.findFirst({
      where: {
        action: "article.direct_published",
        targetId: article?.id,
      },
    });
    expect(audit).not.toBeNull();
    expect(audit?.actorType).toBe("API_CLIENT");
    expect(audit?.targetType).toBe("ARTICLE");
  });

  test("3.2 Direct Client tanpa deck ditolak dengan status HTTP 422 (DECK_REQUIRED)", async () => {
    const payload = {
      title: "Naskah Direct Publish Tanpa Deck",
      deck: "   ", // whitespace only / missing deck
      desk: "teknologi-kebijakan",
      format: "ANALYSIS",
      content: [{ type: "paragraph", text: "Konten paragraf tanpa deck." }],
      sources: [
        {
          title: "Sumber Valid",
          url: `${mockSourceBaseUrl}/valid-key-source`,
          sourceType: "OFFICIAL",
        },
      ],
      aiInvolvement: "assistive",
      agentId: "agent-direct-deckless",
      idempotencyKey: `direct-nodeck-${Date.now()}`,
    };

    const res = await fetch(`${BASE}/api/internal/v1/ai-submissions`, {
      method: "POST",
      headers: {
        authorization: directClient.authHeader,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(422);
    const body = (await res.json()) as any;
    expect(body.code).toBe("DECK_REQUIRED");
    expect(body.error).toContain("deck");
  });

  test("3.3 Direct Client dengan sumber yang sebagian gagal tetap terbit dengan sumber gagal di-drop", async () => {
    const idempotencyKey = `direct-partial-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const payload = {
      title: "Analisis Ketahanan Pangan Nasional Terhadap Dinamika Iklim",
      deck: "Rangkuman tren produksi pertanian dan langkah mitigasi stok pangan.",
      desk: "nasional-publik",
      format: "ANALYSIS",
      content: [
        {
          type: "paragraph",
          text: "Evaluasi ketahanan pangan menghadapi pergeseran musim tanam regional.",
        },
      ],
      sources: [
        {
          title: "Sumber Gagal HTTP 500",
          url: `${mockSourceBaseUrl}/failing-source-500`,
          sourceType: "PRIMARY",
          isKeySource: true, // Key source semula, tapi gagal diakses
        },
        {
          title: "Sumber Lolos HTTP 200",
          url: `${mockSourceBaseUrl}/valid-secondary-source`,
          sourceType: "DATA",
          isKeySource: false,
        },
      ],
      aiInvolvement: "assistive",
      agentId: "agent-partial-sources",
      idempotencyKey,
    };

    const res = await fetch(`${BASE}/api/internal/v1/ai-submissions`, {
      method: "POST",
      headers: {
        authorization: directClient.authHeader,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(201);
    const receipt = (await res.json()) as any;
    expect(receipt.isPublished).toBe(true);

    createdArticleIds.push(receipt.articleId);

    const article = await db.article.findUnique({
      where: { id: receipt.articleId },
      include: { sources: true },
    });

    // Sumber gagal di-drop: hanya 1 sumber yang tersimpan di DB
    expect(article?.sources.length).toBe(1);
    const survivor = article?.sources[0];
    expect(survivor?.url).toBe(`${mockSourceBaseUrl}/valid-secondary-source`);
    expect(survivor?.verificationStatus).toBe("VERIFIED");
    // Karena satu-satunya sumber yang selamat bukan key source semula, dipromosikan jadi key source
    expect(survivor?.isKeySource).toBe(true);
  });

  test("3.4 Direct Client dengan seluruh sumber gagal ditolak dengan status HTTP 422 (DIRECT_PUBLISH_SOURCES_FAILED)", async () => {
    const payload = {
      title: "Naskah dengan Seluruh Sumber Tak Dapat Diakses",
      deck: "Ringkasan naskah yang seluruh sumber referensinya mengalami galat jaringan.",
      desk: "nasional-publik",
      format: "ANALYSIS",
      content: [
        {
          type: "paragraph",
          text: "Konten dengan referensi yang tidak dapat diakses publik.",
        },
      ],
      sources: [
        {
          title: "Sumber Rusak 1",
          url: `${mockSourceBaseUrl}/failing-source-404`,
          sourceType: "SECONDARY",
        },
        {
          title: "Sumber Rusak 2",
          url: `${mockSourceBaseUrl}/failing-source-500`,
          sourceType: "OFFICIAL",
        },
      ],
      aiInvolvement: "assistive",
      agentId: "agent-all-failing",
      idempotencyKey: `direct-allfail-${Date.now()}`,
    };

    const res = await fetch(`${BASE}/api/internal/v1/ai-submissions`, {
      method: "POST",
      headers: {
        authorization: directClient.authHeader,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(422);
    const body = (await res.json()) as any;
    expect(body.code).toBe("DIRECT_PUBLISH_SOURCES_FAILED");
    expect(body.error).toContain("gagal diakses");
  });

  test("4.1 Artikel direct-publish tersaji di /artikel/[slug] tanpa kotak keterbukaan AI publik", async () => {
    expect(publishedArticleSlug).toBeDefined();

    const res = await get(`/artikel/${publishedArticleSlug}`);
    expect(res.status).toBe(200);

    const html = await res.text();

    // Verifikasi judul dan byline redaksi tampil
    expect(html).toContain("Laporan Kinerja Transparansi Publik Sektor Energi 2026");
    expect(html).toContain("Disunting oleh Redaksi Verax Press");

    // Verifikasi kotak / label keterbukaan AI TIDAK dirender ke publik
    expect(html).not.toContain("Catatan proses · Keterlibatan AI");
    expect(html).not.toContain("Transparansi AI");
    expect(html).not.toContain("Pengecekan sintaks dan konsistensi data statistik");
  });
});

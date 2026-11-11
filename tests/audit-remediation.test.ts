// Dedicated test suite for Audit Post-Implementation Remediation (Phase 1, 2, and 3 findings).
// Covers the 4 test coverage gap scenarios identified in 2026-11-11-audit-pasca-implementasi-report.md.
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
  loginWithCredentials,
  get,
  postJson,
  type TestClient,
} from "./lib/http";
import { hashPassword } from "@/lib/password";
import { hashClientSecret } from "@/lib/api-key";
import { rateLimit } from "@/lib/rate-limit";

let chief: TestClient;
let testServerProcess: ChildProcess | null = null;

beforeAll(async () => {
  assertApprovedTestDatabase(DB_URL);

  let isServerRunning = await fetch(`${BASE}/api/auth/csrf`, { signal: AbortSignal.timeout(600) })
    .then((r) => r.ok)
    .catch(() => false);

  if (!isServerRunning) {
    const serverScript = path.resolve(".next/standalone/server.js");
    if (!fs.existsSync(serverScript)) {
      execSync("bun run build", { stdio: "pipe" });
    }

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

    for (let i = 0; i < 40; i++) {
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
      throw new Error(`CRITICAL: Server uji terisolasi pada ${BASE} gagal berjalan dalam 10s`);
    }
  }

  await cleanupTestData();
  await seedTestFixtures();
  chief = await loginAs("chief");
});

afterAll(async () => {
  if (testServerProcess) {
    testServerProcess.kill();
  }
  await cleanupTestData();
});

describe("Audit Remediation: Coverage Gaps Verification", () => {
  const db = getTestDb();

  // ---------------------------------------------------------------------------
  // Skenario 1: Kredensial API Client Kedaluwarsa (HTTP 401 CREDENTIAL_EXPIRED)
  // ---------------------------------------------------------------------------
  test("1. Kredensial API Client yang telah kedaluwarsa ditolak dengan kode CREDENTIAL_EXPIRED", async () => {
    const testClientId = `vrtc_exp_${crypto.randomBytes(4).toString("hex")}`;
    const rawSecret = `vrtk_${crypto.randomBytes(24).toString("hex")}`;
    const secretHash = hashClientSecret(rawSecret);

    const client = await db.apiClient.create({
      data: {
        clientId: testClientId,
        name: "Expired Test Agent",
        environment: "DEVELOPMENT",
        scopes: "submit",
        status: "ACTIVE",
        credentials: {
          create: {
            name: "Expired Key",
            keyPrefix: rawSecret.slice(0, 10),
            secretHash,
            status: "ACTIVE",
            expiresAt: new Date(Date.now() - 3600_000), // Kedaluwarsa 1 jam yang lalu
          },
        },
      },
      include: { credentials: true },
    });

    // Uji endpoint dry-run /validate
    const validateRes = await fetch(`${BASE}/api/internal/v1/ai-submissions/validate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${testClientId}.${rawSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Judul Naskah Uji Coba Kredensial",
        deck: "Ringkasan naskah untuk pengujian kedaluwarsa.",
        desk: "teknologi-kebijakan",
        format: "OPINION",
        content: [{ type: "paragraph", text: "Isi paragraf uji coba kredensial..." }],
        sources: [{ title: "Sumber Dokumen", url: "https://contoh.org/dok", sourceType: "OFFICIAL" }],
        aiInvolvement: "assistive",
        agentId: "agent-test-v1",
        idempotencyKey: `idem-${Date.now()}`,
      }),
    });

    expect(validateRes.status).toBe(401);
    const validateData = await validateRes.json();
    expect(validateData.code).toBe("CREDENTIAL_EXPIRED");

    // Uji endpoint utama /ai-submissions
    const submitRes = await fetch(`${BASE}/api/internal/v1/ai-submissions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${testClientId}.${rawSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Judul Naskah Uji Coba Kredensial",
        deck: "Ringkasan naskah untuk pengujian kedaluwarsa.",
        desk: "teknologi-kebijakan",
        format: "OPINION",
        content: [{ type: "paragraph", text: "Isi paragraf uji coba kredensial..." }],
        sources: [{ title: "Sumber Dokumen", url: "https://contoh.org/dok", sourceType: "OFFICIAL" }],
        aiInvolvement: "assistive",
        agentId: "agent-test-v1",
        idempotencyKey: `idem-${Date.now()}-sub`,
      }),
    });

    expect(submitRes.status).toBe(401);
    const submitData = await submitRes.json();
    expect(submitData.code).toBe("CREDENTIAL_EXPIRED");

    // Bersihkan data uji
    await db.apiClientCredential.deleteMany({ where: { apiClientId: client.id } });
    await db.apiClient.delete({ where: { id: client.id } });
  });

  // ---------------------------------------------------------------------------
  // Skenario 2: Ketahanan Rate Limiter Terhadap Permintaan Konkuren
  // ---------------------------------------------------------------------------
  test("2. Rate limiter membatasi secara tepat di bawah beban konkurensi paralel tanpa kebocoran kuota", async () => {
    const testKey = `concurrency-test-${Date.now()}`;
    const limit = 5;
    const windowMs = 30_000;

    // Luncurkan 20 pemanggilan simultan menggunakan Promise.all
    const promises = Array.from({ length: 20 }).map(async () => {
      return rateLimit(testKey, limit, windowMs);
    });

    const results = await Promise.all(promises);
    const allowedCount = results.filter((r) => r.allowed).length;
    const rejectedCount = results.filter((r) => !r.allowed).length;

    // Pastikan tepat 5 yang diizinkan dan 15 ditolak
    expect(allowedCount).toBe(5);
    expect(rejectedCount).toBe(15);

    // Pastikan seluruh respons yang ditolak mencatat remaining: 0
    const rejectedRemaining = results.filter((r) => !r.allowed).map((r) => r.remaining);
    expect(rejectedRemaining.every((rem) => rem === 0)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Skenario 3: Penolakan Akses Portal Kontributor Pasca-Penonaktifan Akun
  // ---------------------------------------------------------------------------
  test("3. Kontributor yang dinonaktifkan (SUSPENDED) ditolak saat memuat portal mandiri", async () => {
    const testEmail = `volunteer-suspend-${Date.now()}@verity.test`;
    const password = "PasswordSukarela123!";

    const contributor = await db.contributor.create({
      data: {
        username: `vol_sus_${Date.now()}`,
        email: testEmail,
        passwordHash: hashPassword(password),
        status: "ACTIVE",
        adultConfirmedAt: new Date(),
        person: {
          create: {
            publicName: "Relawan Penangguhan Uji",
            anonymityMode: "REAL_NAME",
            accountType: "EXTERNAL",
          },
        },
      },
    });

    // Kontributor berhasil masuk dan mendapatkan sesi aktif
    const authResult = await loginWithCredentials(testEmail, password);
    expect(authResult.success).toBe(true);

    // Saat masih aktif, akses ke dashboard kontributor berhasil (HTTP 200)
    const activeRes = await get("/api/contributor/dashboard", authResult.client);
    expect(activeRes.status).toBe(200);

    // Tangguhkan akun kontributor di basis data
    await db.contributor.update({
      where: { id: contributor.id },
      data: { status: "SUSPENDED" },
    });

    // Permintaan berikutnya menggunakan sesi peramban yang sama langsung ditolak (HTTP 403 FORBIDDEN)
    const suspendedRes = await get("/api/contributor/dashboard", authResult.client);
    expect(suspendedRes.status).toBe(403);
    const suspendedData = await suspendedRes.json();
    expect(suspendedData.code).toBe("FORBIDDEN");
    expect(suspendedData.error).toContain("dinonaktifkan");

    // Bersihkan
    await db.person.deleteMany({ where: { contributorId: contributor.id } });
    await db.contributor.delete({ where: { id: contributor.id } });
  });

  // ---------------------------------------------------------------------------
  // Skenario 4: Isolasi Komentar Internal Antar-Penulis (WRITER)
  // ---------------------------------------------------------------------------
  test("4. Staf berstatus Penulis (WRITER) ditolak saat mengakses atau menambahkan komentar pada artikel milik penulis lain", async () => {
    const writerAPassword = "WriterAPassword123!";
    const writerBPassword = "WriterBPassword123!";

    const writerA = await db.staffUser.create({
      data: {
        username: `writer_a_${Date.now()}`,
        email: `writer-a-${Date.now()}@verity.test`,
        name: "Penulis A",
        role: "WRITER",
        status: "ACTIVE",
        passwordHash: hashPassword(writerAPassword),
      },
    });

    const writerB = await db.staffUser.create({
      data: {
        username: `writer_b_${Date.now()}`,
        email: `writer-b-${Date.now()}@verity.test`,
        name: "Penulis B",
        role: "WRITER",
        status: "ACTIVE",
        passwordHash: hashPassword(writerBPassword),
      },
    });

    const desk = await db.desk.findFirst({ where: { slug: "hukum-keadilan" } });
    expect(desk).not.toBeNull();

    // Penulis A membuat sebuah artikel
    const article = await db.article.create({
      data: {
        title: "Artikel Khusus Penulis A untuk Uji Isolasi",
        slug: `artikel-khusus-a-${Date.now()}`,
        deck: "Ringkasan paragraf...",
        status: "DRAFT",
        format: "OPINION",
        deskId: desk!.id,
        createdById: writerA.id,
        contributions: {
          create: {
            role: "AUTHOR",
            displayOrder: 0,
            person: {
              create: {
                publicName: writerA.name,
                accountType: "STAFF",
                staffUserId: writerA.id,
              },
            },
          },
        },
      },
    });

    // Login sebagai Penulis B
    const clientB = (await loginWithCredentials(writerB.username, writerBPassword)).client;

    // Penulis B mencoba mengambil komentar dari artikel Penulis A -> Ditolak (HTTP 403)
    const readCommentsRes = await get(`/api/studio/articles/${article.id}/comments`, clientB);
    expect(readCommentsRes.status).toBe(403);

    // Penulis B mencoba mengirimkan komentar pada artikel Penulis A -> Ditolak (HTTP 403)
    const postCommentRes = await postJson(
      `/api/studio/articles/${article.id}/comments`,
      { comment: "Komentar ilegal dari penulis lain", authorVisible: false },
      clientB,
    );
    expect(postCommentRes.status).toBe(403);

    // Login sebagai Penulis A (pemilik yang sah)
    const clientA = (await loginWithCredentials(writerA.username, writerAPassword)).client;

    // Penulis A dapat membaca komentar artikel miliknya (HTTP 200)
    const readA = await get(`/api/studio/articles/${article.id}/comments`, clientA);
    expect(readA.status).toBe(200);

    // Penulis A dapat menambahkan komentar pada artikel miliknya (HTTP 201)
    const postA = await postJson(
      `/api/studio/articles/${article.id}/comments`,
      { comment: "Catatan editorial mandiri Penulis A", authorVisible: true },
      clientA,
    );
    expect(postA.status).toBe(201);

    // Bersihkan
    await db.reviewComment.deleteMany({ where: { articleId: article.id } });
    await db.articleContribution.deleteMany({ where: { articleId: article.id } });
    await db.article.delete({ where: { id: article.id } });
    await db.person.deleteMany({ where: { staffUserId: { in: [writerA.id, writerB.id] } } });
    await db.staffUser.deleteMany({ where: { id: { in: [writerA.id, writerB.id] } } });
  });
});

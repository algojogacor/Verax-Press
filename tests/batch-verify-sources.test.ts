import { test, describe, beforeAll, afterAll, expect } from "bun:test";
import fs from "node:fs";
import path from "node:path";
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
  createArticle,
  type TestClient,
} from "./lib/http";

let chief: TestClient;
let author: TestClient;
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

    let attempts = 0;
    while (attempts < 60) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        const res = await fetch(`${BASE}/api/auth/csrf`);
        if (res.ok) {
          isServerRunning = true;
          break;
        }
      } catch {}
      attempts++;
    }
  }

  expect(isServerRunning).toBe(true);

  await seedTestFixtures();
  chief = await loginAs("chief");
  author = await loginAs("author");
});

afterAll(async () => {
  await cleanupTestData();
  if (testServerProcess) {
    testServerProcess.kill();
  }
});

describe("Batch Source Verification (POST /api/studio/articles/[id]/sources/verify-all)", () => {
  test("1. Writer is forbidden from batch verifying sources (403)", async () => {
    const art = await createArticle(chief, {
      title: "Artikel Uji Verifikasi Massal Penulis",
      sources: [
        {
          title: "Sumber Regulasi 1",
          url: "https://example.com/regulasi-1",
          sourceType: "PRIMARY",
          isKeySource: false,
        },
      ],
    });

    const res = await postJson(
      `/api/studio/articles/${art.id}/sources/verify-all`,
      { note: "Percobaan verifikasi oleh penulis" },
      author,
    );
    expect(res.status).toBe(403);
    const data = (await res.json()) as any;
    expect(data.code).toBe("FORBIDDEN");
  });

  test("2. Chief Editor can batch verify all unverified sources with optional key source toggle", async () => {
    const art = await createArticle(chief, {
      title: "Artikel Uji Verifikasi Massal Lengkap",
      sources: [
        {
          title: "Dokumen Sumber A",
          url: "https://example.com/sumber-a",
          sourceType: "PRIMARY",
          isKeySource: false,
        },
        {
          title: "Dokumen Sumber B",
          url: "https://example.com/sumber-b",
          sourceType: "SECONDARY",
          isKeySource: false,
        },
        {
          title: "Dokumen Sumber C",
          url: "https://example.com/sumber-c",
          sourceType: "PRIMARY",
          isKeySource: false,
        },
      ],
    });

    // Periksa status awal: 0 sumber kunci, 3 belum diverifikasi
    const initRes = await get(`/api/studio/articles/${art.id}`, chief);
    const initData = (await initRes.json()) as any;
    expect(initData.sources.length).toBe(3);
    expect(initData.sources.every((s: any) => s.verificationStatus === "UNVERIFIED")).toBe(true);
    expect(initData.sources.every((s: any) => s.isKeySource === false)).toBe(true);

    // Lakukan verifikasi massal sekaligus menandai sebagai sumber kunci
    const verifyRes = await postJson(
      `/api/studio/articles/${art.id}/sources/verify-all`,
      {
        note: "Diverifikasi secara kolektif oleh meja redaksi",
        markAsKeySources: true,
      },
      chief,
    );
    expect(verifyRes.status).toBe(200);

    const updated = (await verifyRes.json()) as any;
    expect(updated.sources.length).toBe(3);
    expect(updated.sources.every((s: any) => s.verificationStatus === "VERIFIED")).toBe(true);
    expect(updated.sources.every((s: any) => s.isKeySource === true)).toBe(true);
    expect(updated.sources.every((s: any) => s.verificationNote === "Diverifikasi secara kolektif oleh meja redaksi")).toBe(true);
    expect(updated.keySourceCount).toBe(3);
    expect(updated.unverifiedKeySourceCount).toBe(0);

    // Pastikan audit log tercatat
    const db = getTestDb();
    const audit = await db.auditEvent.findFirst({
      where: {
        action: "source.batch_verified",
        targetId: art.id,
      },
      orderBy: { createdAt: "desc" },
    });
    expect(audit).not.toBeNull();
    expect(audit?.targetType).toBe("ARTICLE");
  });
});

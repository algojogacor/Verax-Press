// Tes verifikasi remediasi audit lokal: basis pengetahuan editorial modular (PROPOSED),
// selective context resolver, keselarasan kontrak OpenAPI 3.1.0, stabilitas validasi tanggal ISO 8601,
// sinkronisasi Submission.status melalui transisi Studio, serta pemisahan kebijakan kontributor vs AI API.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn, execSync, type ChildProcess } from "node:child_process";
import {
  assertApprovedTestDatabase,
  BASE,
  cleanupTestData,
  DB_URL,
  getTestDb,
  seedTestFixtures,
  syncStandaloneAssets,
} from "./lib/test-db";
import {
  apiAuthHeader,
  createArticle,
  get,
  loginAs,
  loginWithCredentials,
  patchJson,
  postJson,
  submitAi,
  transition,
  type TestClient,
} from "./lib/http";
import { AI_PLACEHOLDER_BYLINE, COLLECTIVE_NEWSROOM_BYLINE } from "@/lib/domain/constants";
import { hashPassword } from "@/lib/password";

let testServerProcess: ChildProcess | null = null;
let chief: TestClient;
const createdArticleIds: string[] = [];

describe("Editorial Remediation & API Contract Verification", () => {
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
      syncStandaloneAssets();

      const childEnv = { ...process.env };
      delete childEnv.TURSO_DATABASE_URL;
      delete childEnv.TURSO_AUTH_TOKEN;
      childEnv.PORT = "3088";
      childEnv.DATABASE_URL = DB_URL;
      childEnv.TEST_DATABASE_URL = DB_URL;
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
        throw new Error(`CRITICAL: Failed to launch isolated test server on ${BASE} within 15s`);
      }
    }

    await seedTestFixtures();
    chief = await loginAs("chief");
  });

  afterAll(async () => {
    const db = getTestDb();
    // Pastikan seluruh desk canonical aktif kembali jika skenario uji menonaktifkan sementara
    await db.desk.updateMany({
      where: { slug: { in: ["hukum-keadilan", "teknologi-kebijakan", "nasional-publik"] } },
      data: { isActive: true },
    });
    if (createdArticleIds.length > 0) {
      await db.reviewComment.deleteMany({ where: { articleId: { in: createdArticleIds } } });
      await db.correctionRecord.deleteMany({ where: { articleId: { in: createdArticleIds } } });
      await db.articleContribution.deleteMany({ where: { articleId: { in: createdArticleIds } } });
      await db.submission.deleteMany({ where: { articleId: { in: createdArticleIds } } });
      await db.editorialReview.deleteMany({ where: { articleId: { in: createdArticleIds } } });
      await db.sourceReference.deleteMany({ where: { articleId: { in: createdArticleIds } } });
      await db.articleVersion.deleteMany({ where: { articleId: { in: createdArticleIds } } });
      await db.mediaAsset.deleteMany({ where: { articleId: { in: createdArticleIds } } });
      await db.auditEvent.deleteMany({ where: { targetId: { in: createdArticleIds } } });
      await db.article.deleteMany({ where: { id: { in: createdArticleIds } } });
    }
    await cleanupTestData();
    if (testServerProcess) {
      try {
        testServerProcess.kill();
      } catch {}
    }
  });

  // ---------------------------------------------------------------------------
  // 1. Knowledge Base Editorial Modular & Status Persetujuan PROPOSED
  // ---------------------------------------------------------------------------

  test("GET & HEAD /editorial/manifest.json mempertahankan status PROPOSED serta X-Robots-Tag", async () => {
    const getRes = await fetch(`${BASE}/editorial/manifest.json`);
    expect(getRes.status).toBe(200);
    expect(getRes.headers.get("content-type")).toContain("application/json");
    expect(getRes.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(getRes.headers.get("x-verax-standard-status")).toBe("PROPOSED");
    expect(getRes.headers.get("x-verax-standard-effective")).toBe("false");
    expect(getRes.headers.get("etag")).toBeTruthy();

    const bodyText = await getRes.text();
    expect(bodyText.toLowerCase()).not.toContain("d:\\projects\\verax");
    const manifest = JSON.parse(bodyText) as {
      standardId: string;
      semanticVersion: string;
      status: string;
      effectiveDate: string | null;
      isBindingEffectivePolicy: boolean;
      approvalNotice: string;
      coreModules: Array<{ slug: string; documentId: string; url: string }>;
      desks: Array<{ slug: string; isActive: boolean; url: string }>;
      formats: Array<{ code: string; url: string }>;
    };

    expect(manifest.standardId).toBe("VERAX-EDITORIAL-AI");
    expect(manifest.semanticVersion).toBe("1.0.0");
    expect(manifest.status).toBe("PROPOSED");
    expect(manifest.effectiveDate).toBeNull();
    expect(manifest.isBindingEffectivePolicy).toBe(false);
    expect(manifest.approvalNotice).toContain("PROPOSED");
    expect(manifest.coreModules).toHaveLength(5);
    expect(manifest.desks).toHaveLength(3);
    expect(manifest.formats).toHaveLength(6);

    const headRes = await fetch(`${BASE}/editorial/manifest.json`, { method: "HEAD" });
    expect(headRes.status).toBe(200);
    expect(headRes.headers.get("x-verax-standard-status")).toBe("PROPOSED");
    expect(await headRes.text()).toBe("");
  });

  test("Seluruh endpoint modul inti, desk, format, dan operasional mendukung GET & HEAD serta penanda PROPOSED", async () => {
    const markdownRoutes = [
      "/editorial/core",
      "/editorial/core?mode=compact",
      "/editorial/core/identity",
      "/editorial/core/principles",
      "/editorial/core/verification",
      "/editorial/core/ethics",
      "/editorial/core/language",
      "/editorial/desks/hukum-keadilan",
      "/editorial/desks/teknologi-kebijakan",
      "/editorial/desks/nasional-publik",
      "/editorial/formats/news",
      "/editorial/formats/opinion",
      "/editorial/formats/analysis",
      "/editorial/formats/explainer",
      "/editorial/formats/feature",
      "/editorial/formats/interview",
      "/editorial/operations/ai-workflow",
      "/editorial/operations/quality-assessment",
      "/editorial/operations/review-checklist",
      "/editorial/operations/api-integration",
    ];

    for (const route of markdownRoutes) {
      const getRes = await fetch(`${BASE}${route}`);
      expect(getRes.status, `${route} GET`).toBe(200);
      expect(getRes.headers.get("content-type"), `${route} Content-Type`).toContain("text/markdown");
      expect(getRes.headers.get("x-robots-tag"), `${route} X-Robots-Tag`).toBe("noindex, nofollow");
      expect(getRes.headers.get("x-verax-standard-status"), `${route} status`).toBe("PROPOSED");
      expect(getRes.headers.get("x-verax-standard-effective"), `${route} effective`).toBe("false");

      const md = await getRes.text();
      expect(md, `${route} notice`).toContain("STATUS STANDAR: PROPOSED");
      expect(md.toLowerCase(), `${route} leak check`).not.toContain("d:\\projects\\verax");
      expect(md, `${route} no env token leak`).not.toContain("vrtc_");

      const headRes = await fetch(`${BASE}${route}`, { method: "HEAD" });
      expect(headRes.status, `${route} HEAD`).toBe(200);
      expect(await headRes.text(), `${route} HEAD empty`).toBe("");

      const jsonRes = await fetch(`${BASE}${route}${route.includes("?") ? "&" : "?"}output=json`);
      expect(jsonRes.status, `${route} JSON`).toBe(200);
      expect(jsonRes.headers.get("content-type"), `${route} JSON CT`).toContain("application/json");
    }
  });

  // ---------------------------------------------------------------------------
  // 2. Selective Context Resolution & Cross-Loading Prevention
  // ---------------------------------------------------------------------------

  test("Context resolver mengisolasi kombinasi desk + format, menahan NEWS di INGESTION_API, dan membedakan NEWS/EXPLAINER vs OPINION", async () => {
    const blockedIngestionNews = await fetch(
      `${BASE}/editorial/context?desk=hukum-keadilan&format=NEWS&channel=INGESTION_API`,
    );
    expect(blockedIngestionNews.status).toBe(422);
    const blockedBody = (await blockedIngestionNews.json()) as { code: string; details?: Array<{ code?: string }> };
    expect(blockedBody.code).toBe("FORMAT_REJECTED");
    expect(blockedBody.details?.[0]?.code).toBe("FORMAT_PENDING_AUTHORIZATION");

    const comboNews = await fetch(
      `${BASE}/editorial/context?desk=hukum-keadilan&format=NEWS&channel=NEWSROOM&topic=${encodeURIComponent("Putusan MK tentang batas kewenangan daerah")}`,
    );
    expect(comboNews.status).toBe(200);
    const newsMd = await comboNews.text();
    expect(newsMd).toContain("VERAX-DESK-HUKUM-01");
    expect(newsMd).toContain("VERAX-FORMAT-NEWS-01");
    expect(newsMd).toContain("Putusan MK tentang batas kewenangan daerah");
    expect(newsMd).not.toContain("VERAX-DESK-TEKNOLOGI-02");
    expect(newsMd).not.toContain("VERAX-DESK-NASIONAL-03");
    expect(newsMd).not.toContain("VERAX-FORMAT-OPINION-03");

    const comboExplainer = await fetch(
      `${BASE}/editorial/context?desk=hukum-keadilan&format=EXPLAINER&channel=INGESTION_API&topic=${encodeURIComponent("Mekanisme hak uji materi di Mahkamah Konstitusi")}`,
    );
    expect(comboExplainer.status).toBe(200);
    const explainerMd = await comboExplainer.text();
    expect(explainerMd).toContain("VERAX-DESK-HUKUM-01");
    expect(explainerMd).toContain("VERAX-FORMAT-EXPLAINER-04");
    expect(explainerMd).not.toContain("VERAX-FORMAT-OPINION-03");

    const comboOpinion = await fetch(
      `${BASE}/editorial/context?desk=hukum-keadilan&format=OPINION&channel=INGESTION_API`,
    );
    expect(comboOpinion.status).toBe(200);
    const opinionMd = await comboOpinion.text();
    expect(opinionMd).toContain("VERAX-DESK-HUKUM-01");
    expect(opinionMd).toContain("VERAX-FORMAT-OPINION-03");
    expect(opinionMd).toContain("OPINION_DISCLAIMER");
    expect(opinionMd).not.toContain("VERAX-FORMAT-NEWS-01");
    expect(newsMd).not.toBe(opinionMd);
    expect(explainerMd).not.toBe(opinionMd);

    const comboTechAnalysis = await fetch(
      `${BASE}/editorial/context?desk=teknologi-kebijakan&format=ANALYSIS&output=json`,
    );
    expect(comboTechAnalysis.status).toBe(200);
    const techJson = (await comboTechAnalysis.json()) as {
      status: string;
      effectiveDate: null | string;
      isBindingEffectivePolicy: boolean;
      selection: {
        desk: string;
        format: string;
        coreMode: string;
        crossLoadedUnrelatedDesks: boolean;
        crossLoadedUnrelatedFormats: boolean;
      };
      sourceDocuments: Array<{ layer: string; documentId: string }>;
    };
    expect(techJson.status).toBe("PROPOSED");
    expect(techJson.effectiveDate).toBeNull();
    expect(techJson.isBindingEffectivePolicy).toBe(false);
    expect(techJson.selection.desk).toBe("teknologi-kebijakan");
    expect(techJson.selection.format).toBe("ANALYSIS");
    expect(techJson.selection.coreMode).toBe("compact");
    expect(techJson.selection.crossLoadedUnrelatedDesks).toBe(false);
    expect(techJson.selection.crossLoadedUnrelatedFormats).toBe(false);
    expect(techJson.sourceDocuments.some((d) => d.documentId === "VERAX-DESK-TEKNOLOGI-02")).toBe(true);
    expect(techJson.sourceDocuments.some((d) => d.documentId === "VERAX-FORMAT-ANALYSIS-02")).toBe(true);
    expect(techJson.sourceDocuments.some((d) => d.documentId === "VERAX-DESK-HUKUM-01")).toBe(false);

    const comboPublicFeature = await fetch(
      `${BASE}/editorial/context?desk=nasional-publik&format=FEATURE&coreMode=compact`,
    );
    expect(comboPublicFeature.status).toBe(200);
    const featureCompactMd = await comboPublicFeature.text();
    expect(featureCompactMd).toContain("VERAX-DESK-NASIONAL-03");
    expect(featureCompactMd).toContain("VERAX-FORMAT-FEATURE-05");
    expect(featureCompactMd).not.toContain("VERAX-DESK-TEKNOLOGI-02");

    // Pastikan mode compact lebih ringkas secara signifikan dibanding mode full
    const comboFull = await fetch(
      `${BASE}/editorial/context?desk=nasional-publik&format=FEATURE&coreMode=full`,
    );
    expect(comboFull.status).toBe(200);
    const featureFullMd = await comboFull.text();
    expect(featureCompactMd.length).toBeLessThan(featureFullMd.length * 0.5);
  });

  test("Context resolver & rute editorial fail-closed terhadap parameter tidak sah atau desk nonaktif", async () => {
    const missingParams = await fetch(`${BASE}/editorial/context`);
    expect(missingParams.status).toBe(422);

    const badDesk = await fetch(`${BASE}/editorial/context?desk=ekonomi-digital&format=OPINION`);
    expect(badDesk.status).toBe(422);
    expect(((await badDesk.json()) as { code: string }).code).toBe("DESK_REJECTED");

    const badFormat = await fetch(`${BASE}/editorial/context?desk=hukum-keadilan&format=ESSAY`);
    expect(badFormat.status).toBe(422);
    expect(((await badFormat.json()) as { code: string }).code).toBe("FORMAT_REJECTED");

    const contributorNews = await fetch(
      `${BASE}/editorial/context?desk=hukum-keadilan&format=NEWS&channel=CONTRIBUTOR`,
    );
    expect(contributorNews.status).toBe(422);
    expect(((await contributorNews.json()) as { code: string }).code).toBe("FORMAT_REJECTED");

    expect((await fetch(`${BASE}/editorial/core/unknown`)).status).toBe(404);
    expect((await fetch(`${BASE}/editorial/desks/unknown-desk`)).status).toBe(404);
    expect((await fetch(`${BASE}/editorial/formats/unknown-fmt`)).status).toBe(404);
    expect((await fetch(`${BASE}/editorial/operations/unknown-op`)).status).toBe(404);

    // Uji fail-closed saat desk dinonaktifkan di database
    const db = getTestDb();
    await db.desk.update({ where: { slug: "nasional-publik" }, data: { isActive: false } });
    try {
      const disabledCtx = await fetch(`${BASE}/editorial/context?desk=nasional-publik&format=OPINION`);
      expect(disabledCtx.status).toBe(422);
      expect(((await disabledCtx.json()) as { code: string }).code).toBe("DESK_REJECTED");

      const disabledProfile = await fetch(`${BASE}/editorial/desks/nasional-publik`);
      expect(disabledProfile.status).toBe(422);
      expect(((await disabledProfile.json()) as { code: string }).code).toBe("DESK_REJECTED");

      const capsDuringDisable = (await (await fetch(`${BASE}/api/internal/v1/capabilities`)).json()) as {
        desks: Array<{ slug: string }>;
      };
      expect(capsDuringDisable.desks.some((d) => d.slug === "nasional-publik")).toBe(false);
    } finally {
      await db.desk.update({ where: { slug: "nasional-publik" }, data: { isActive: true } });
    }
  });

  // ---------------------------------------------------------------------------
  // 3. HTTP Method Hygiene (405 JSON + Allow Header + Request-ID)
  // ---------------------------------------------------------------------------

  test("Seluruh endpoint read-only dan API v1 menolak metode HTTP yang tidak didukung dengan JSON 405 & Allow", async () => {
    const readOnlyEndpoints = [
      "/editorial/manifest.json",
      "/editorial/core",
      "/editorial/core/identity",
      "/editorial/desks/hukum-keadilan",
      "/editorial/formats/news",
      "/editorial/operations/ai-workflow",
      "/editorial/context?desk=hukum-keadilan&format=OPINION",
      "/api/internal/v1/capabilities",
      "/openapi.json",
      "/.well-known/verax-agent.json",
      "/llms.txt",
      "/llms-full.txt",
    ];

    for (const endpoint of readOnlyEndpoints) {
      const postRes = await fetch(`${BASE}${endpoint}`, { method: "POST" });
      expect(postRes.status, `POST ${endpoint}`).toBe(405);
      expect(postRes.headers.get("allow"), `POST ${endpoint} Allow`).toBe("GET, HEAD");
      const errBody = (await postRes.json()) as { code: string };
      expect(errBody.code).toBe("METHOD_NOT_ALLOWED");
    }

    const postOnlyEndpoints = [
      "/api/internal/v1/ai-submissions",
      "/api/internal/v1/ai-submissions/validate",
    ];

    for (const endpoint of postOnlyEndpoints) {
      for (const method of ["GET", "PUT", "PATCH", "DELETE"]) {
        const res = await fetch(`${BASE}${endpoint}`, {
          method,
          headers: { Authorization: await apiAuthHeader() },
        });
        expect(res.status, `${method} ${endpoint}`).toBe(405);
        expect(res.headers.get("allow"), `${method} ${endpoint} Allow`).toBe("POST");
        expect(res.headers.get("x-request-id"), `${method} ${endpoint} x-request-id`).toBeTruthy();
        const body = (await res.json()) as { code: string; requestId: string };
        expect(body.code).toBe("METHOD_NOT_ALLOWED");
        expect(body.requestId).toBeTruthy();
      }
      const headRes = await fetch(`${BASE}${endpoint}`, { method: "HEAD" });
      expect(headRes.status).toBe(405);
      expect(headRes.headers.get("allow")).toBe("POST");
      expect(await headRes.text()).toBe("");
    }

    const delStatusRes = await fetch(`${BASE}/api/internal/v1/ai-submissions/sub_check_405`, {
      method: "DELETE",
    });
    expect(delStatusRes.status).toBe(405);
    expect(delStatusRes.headers.get("allow")).toBe("GET, HEAD");
    expect(((await delStatusRes.json()) as { code: string }).code).toBe("METHOD_NOT_ALLOWED");
  });

  // ---------------------------------------------------------------------------
  // 4. OpenAPI 3.1.0 Schema, Machine Discovery & Loopback Consistency
  // ---------------------------------------------------------------------------

  test("OpenAPI 3.1.0 mendokumentasikan 7 ContentBlock discriminated union, enum status, serta /editorial/*", async () => {
    const res = await fetch(`${BASE}/openapi.json`);
    expect(res.status).toBe(200);
    const spec = (await res.json()) as {
      servers: Array<{ url: string }>;
      components: {
        schemas: Record<string, any>;
      };
      paths: Record<string, any>;
    };

    const blockSchema = spec.components.schemas.ContentBlock;
    expect(blockSchema.oneOf).toHaveLength(7);
    expect(blockSchema.discriminator?.propertyName).toBe("type");
    expect(Object.keys(blockSchema.discriminator?.mapping ?? {})).toEqual([
      "paragraph",
      "heading",
      "quote",
      "list",
      "image",
      "note",
      "qa",
    ]);

    expect(spec.components.schemas.ListBlock.required).toEqual(["type", "style", "items"]);
    expect(spec.components.schemas.ListBlock.properties.style.enum).toEqual(["bullet", "number"]);
    expect(spec.components.schemas.SubmissionStatusResponse.properties.submissionStatus.enum).toEqual([
      "SUBMITTED",
      "EDITORIAL_REVIEW",
      "RESOLVED",
    ]);

    expect(spec.paths["/editorial/manifest.json"]).toBeDefined();
    expect(spec.paths["/editorial/core"]).toBeDefined();
    expect(spec.paths["/editorial/context"]).toBeDefined();
    expect(spec.paths["/api/internal/v1/ai-submissions"].post.responses["405"]).toBeDefined();
    expect(spec.paths["/api/internal/v1/ai-submissions"].post.responses["429"]).toBeDefined();
    expect(spec.paths["/api/internal/v1/ai-submissions"].post.responses["500"]).toBeDefined();

    // Uji konsistensi loopback 127.0.0.1 vs localhost
    const loopbackBase = BASE.replace("localhost", "127.0.0.1");
    const caps127 = (await (await fetch(`${loopbackBase}/api/internal/v1/capabilities`)).json()) as {
      baseUrl: string;
      editorialStandard: { status: string; manifestUrl: string; isBindingEffectivePolicy: boolean };
    };
    expect(caps127.baseUrl).toBe(loopbackBase);
    expect(caps127.editorialStandard.manifestUrl).toBe(`${loopbackBase}/editorial/manifest.json`);
    expect(caps127.editorialStandard.status).toBe("PROPOSED");
    expect(caps127.editorialStandard.isBindingEffectivePolicy).toBe(false);

    const wk127 = (await (await fetch(`${loopbackBase}/.well-known/verax-agent.json`)).json()) as {
      baseUrl: string;
      editorialStandard: { manifestUrl: string; status: string };
    };
    expect(wk127.baseUrl).toBe(loopbackBase);
    expect(wk127.editorialStandard.manifestUrl).toBe(`${loopbackBase}/editorial/manifest.json`);
    expect(wk127.editorialStandard.status).toBe("PROPOSED");
  });

  test("llms.txt & llms-full.txt mencantumkan /editorial/* dengan peringatan PROPOSED serta bebas em-dash", async () => {
    const res1 = await fetch(`${BASE}/llms.txt`);
    const txt1 = await res1.text();
    expect(txt1).toContain("/editorial/manifest.json");
    expect(txt1).toContain("/editorial/context");
    expect(txt1).toContain("PROPOSED");
    expect(txt1).not.toContain("—");
    expect(txt1).not.toContain("--");

    const res2 = await fetch(`${BASE}/llms-full.txt`);
    const txt2 = await res2.text();
    expect(txt2).toContain("ParagraphBlock");
    expect(txt2).toContain("QaBlock");
    expect(txt2).toContain("/editorial/context");
    expect(txt2).toContain("PROPOSED");
    expect(txt2).not.toContain("—");
    expect(txt2).not.toContain("--");
  });

  // ---------------------------------------------------------------------------
  // 5. Validasi Tanggal ISO 8601, 7 ContentBlock, & Sinkronisasi Submission.status
  // ---------------------------------------------------------------------------

  test("Tanggal publishedAt/accessedAt tidak valid ditolak bersih dengan 422 (bukan 500)", async () => {
    for (const badDate of ["not-a-date", "2026-02-30", "2026-13-01", "11/12/2026"]) {
      const valRes = await fetch(`${BASE}/api/internal/v1/ai-submissions/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: await apiAuthHeader(),
        },
        body: JSON.stringify({
          title: "Uji Penolakan Tanggal Tidak Sah Pada Sumber",
          desk: "hukum-keadilan",
          format: "ANALYSIS",
          content: [{ type: "paragraph", text: "Paragraf uji validasi tanggal ISO 8601." }],
          sources: [
            {
              title: "Sumber Tanggal Malformed",
              url: "https://example.com/bad-date",
              sourceType: "OFFICIAL",
              publishedAt: badDate,
            },
          ],
          aiInvolvement: "assistive",
          agentId: "agent-remediation-test",
          idempotencyKey: `bad-date-${Date.now()}-${Math.random()}`,
        }),
      });
      expect(valRes.status, `validate badDate=${badDate}`).toBe(422);
      const valJson = (await valRes.json()) as { code: string };
      expect(valJson.code).toBe("VALIDATION_ERROR");

      const subRes = await submitAi({
        title: "Uji Penolakan Submission Tanggal Malformed",
        desk: "hukum-keadilan",
        format: "ANALYSIS",
        content: [{ type: "paragraph", text: "Paragraf uji submission tanggal ISO 8601." }],
        sources: [
          {
            title: "Sumber Tanggal Malformed",
            url: "https://example.com/bad-date",
            sourceType: "OFFICIAL",
            accessedAt: badDate,
          },
        ],
        aiInvolvement: "assistive",
        agentId: "agent-remediation-test",
        idempotencyKey: `sub-bad-date-${Date.now()}-${Math.random()}`,
      });
      expect(subRes.status, `submit badDate=${badDate}`).toBe(422);
      expect(((await subRes.json()) as { code: string }).code).toBe("VALIDATION_ERROR");
    }
  });

  test("Submission dengan 7 tipe ContentBlock + ISO date berhasil dan Submission.status tersinkron hingga RESOLVED", async () => {
    const authHeader = await apiAuthHeader();
    const validPayload = {
      title: `Verifikasi Integritas Blok Lengkap & Siklus Status ${Date.now()}`,
      desk: "teknologi-kebijakan",
      format: "INTERVIEW",
      deck: "Ringkasan uji regresi tujuh blok konten serta sinkronisasi status editorial.",
      content: [
        { type: "heading", level: 2, text: "Latar Belakang Uji Kontrak" },
        { type: "paragraph", text: "Paragraf utama pengujian tujuh blok konten terstruktur Verax Press." },
        { type: "quote", text: "Setiap klaim wajib bertaut pada sumber primer.", attribution: "Catatan Redaksi Uji" },
        { type: "list", style: "number", items: ["Pemeriksaan tipe blok", "Validasi ISO 8601"] },
        { type: "note", label: "Catatan Metodologi", text: "Payload disusun otomatis untuk uji terisolasi." },
        { type: "qa", question: "Bagaimana sumber ditangani saat intake?", answer: "Seluruh sumber masuk dengan status UNVERIFIED." },
        { type: "image", url: "/brand/verax-press-og.png", alt: "Identitas grafis Verax Press", caption: "Aset uji lokal." },
      ],
      sources: [
        {
          title: "Transkrip Wawancara Penguji Regulasi Digital",
          publisher: "Tim Pengujian Terisolasi",
          url: "https://example.com/verified-key-source",
          sourceType: "INTERVIEW",
          publishedAt: "2026-11-10",
          accessedAt: "2026-11-12T07:00:00Z",
          supports: "Memverifikasi kesaksian narasumber dan dukungan format tanggal ISO.",
          isKeySource: true,
        },
      ],
      verificationNotes: "Catatan wawancara asli dan verifikasi identitas narasumber telah dicatat.",
      aiInvolvement: "substantive",
      aiUsageNote: "Disusun dan diuji untuk memverifikasi kontrak tujuh blok dan transisi status di server uji terisolasi.",
      agentId: "agent-remediation-test",
      idempotencyKey: `remediation-full-${Date.now()}`,
    };

    const subRes = await submitAi(validPayload, authHeader);
    expect(subRes.status).toBe(201);
    const created = (await subRes.json()) as {
      submissionId: string;
      articleId: string;
      submissionStatus: string;
      articleStatus: string;
      status: string;
    };
    createdArticleIds.push(created.articleId);
    expect(created.submissionStatus).toBe("SUBMITTED");
    expect(created.articleStatus).toBe("DRAFT");
    expect(created.status).toBe("SUBMITTED");

    const getStatus = async () => {
      const r = await fetch(`${BASE}/api/internal/v1/ai-submissions/${created.submissionId}`, {
        headers: { Authorization: authHeader },
      });
      expect(r.status).toBe(200);
      return (await r.json()) as {
        submissionStatus: string;
        editorialStatus: string;
        editorialDecision: { status: string; isPublished: boolean };
      };
    };

    // 1. Awal: SUBMITTED / DRAFT
    const s0 = await getStatus();
    expect(s0.submissionStatus).toBe("SUBMITTED");
    expect(s0.editorialStatus).toBe("DRAFT");
    expect(s0.editorialDecision.isPublished).toBe(false);

    // 2. Transisi Studio: PENDING_REVIEW -> FACT_CHECK -> REVISION_NEEDED -> PENDING_APPROVAL => EDITORIAL_REVIEW
    expect((await transition(chief, created.articleId, "SUBMIT_REVIEW")).status).toBe(200);
    expect((await getStatus()).submissionStatus).toBe("EDITORIAL_REVIEW");

    expect((await transition(chief, created.articleId, "START_FACT_CHECK")).status).toBe(200);
    expect((await getStatus()).submissionStatus).toBe("EDITORIAL_REVIEW");

    expect(
      (await transition(chief, created.articleId, "REQUEST_REVISION", "Mohon lengkapi konteks komparasi uji.")).status,
    ).toBe(200);
    const revState = await getStatus();
    expect(revState.editorialStatus).toBe("REVISION_NEEDED");
    expect(revState.submissionStatus).toBe("EDITORIAL_REVIEW");

    // Verifikasi sumber kunci + aktifkan aiDisclosurePublic untuk lolos gerbang PUBLISH
    const detailRes = await get(`/api/cms/articles/${created.articleId}`, chief);
    const detail = (await detailRes.json()) as { sources?: { id: string }[]; article?: { sources: { id: string }[] } };
    const sources = detail.sources ?? detail.article?.sources ?? [];
    await patchJson(
      `/api/cms/articles/${created.articleId}/sources/${sources[0].id}`,
      { verificationStatus: "VERIFIED", verificationNote: "Terverifikasi uji remediasi." },
      chief,
    );
    await patchJson(
      `/api/cms/articles/${created.articleId}`,
      { aiDisclosurePublic: true },
      chief,
    );

    expect((await transition(chief, created.articleId, "RESUBMIT_REVIEW")).status).toBe(200);
    expect((await transition(chief, created.articleId, "START_FACT_CHECK")).status).toBe(200);
    expect((await transition(chief, created.articleId, "SUBMIT_FOR_APPROVAL")).status).toBe(200);
    expect((await getStatus()).submissionStatus).toBe("EDITORIAL_REVIEW");

    // 2b. Pastikan GATE_BYLINE_UNCONFIRMED menolak PUBLISH sebelum byline manusia ditetapkan
    const bylineFail1 = await transition(chief, created.articleId, "PUBLISH");
    expect(bylineFail1.status).toBe(422);
    expect((bylineFail1.body as { code?: string })?.code).toBe("GATE_BYLINE_UNCONFIRMED");

    // Byline kolektif "Redaksi Verax Press" juga ditolak untuk artikel INGESTION_API
    await patchJson(`/api/cms/articles/${created.articleId}`, { byline: COLLECTIVE_NEWSROOM_BYLINE }, chief);
    const bylineFail2 = await transition(chief, created.articleId, "PUBLISH");
    expect(bylineFail2.status).toBe(422);
    expect((bylineFail2.body as { code?: string })?.code).toBe("GATE_BYLINE_UNCONFIRMED");

    // Tetapkan byline manusia yang jelas sebelum PUBLISH
    await patchJson(`/api/cms/articles/${created.articleId}`, { byline: "Tim Peliputan Verax" }, chief);

    // 3. PUBLISH => RESOLVED / PUBLISHED
    expect((await transition(chief, created.articleId, "PUBLISH")).status).toBe(200);
    const publishedState = await getStatus();
    expect(publishedState.editorialStatus).toBe("PUBLISHED");
    expect(publishedState.submissionStatus).toBe("RESOLVED");
    expect(publishedState.editorialDecision.isPublished).toBe(true);
  });

  test("Dry-run validate memberi warning non-blocking & siklus REJECT / WITHDRAW menjaga sinkronisasi RESOLVED", async () => {
    const authHeader = await apiAuthHeader();
    const warnRes = await fetch(`${BASE}/api/internal/v1/ai-submissions/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({
        title: "Uji Peringatan Dry Run Tanpa Deck & Note Substantif",
        desk: "hukum-keadilan",
        format: "ANALYSIS",
        content: [{ type: "heading", level: 2, text: "Hanya Subjudul" }],
        sources: [{ title: "Sumber Sekunder Uji", url: "https://example.com/sec", sourceType: "SECONDARY" }],
        aiInvolvement: "substantive",
        agentId: "agent-warn-test",
        idempotencyKey: `warn-dry-${Date.now()}`,
      }),
    });
    expect(warnRes.status).toBe(200);
    const warnJson = (await warnRes.json()) as { valid: boolean; warnings: string[] };
    expect(warnJson.valid).toBe(true);
    expect(warnJson.warnings.some((w) => w.includes("GATE_NO_DECK"))).toBe(true);
    expect(warnJson.warnings.some((w) => w.includes("GATE_EMPTY_CONTENT"))).toBe(true);
    expect(warnJson.warnings.some((w) => w.includes("GATE_NO_KEY_SOURCES"))).toBe(true);
    expect(warnJson.warnings.some((w) => w.includes("aiUsageNote"))).toBe(true);

    // Uji SUBMIT_REVIEW -> EDITORIAL_REVIEW lalu REJECT -> RESOLVED (serta REOPEN tidak diizinkan 422)
    const rejSub = await submitAi(
      {
        title: `Verifikasi Integritas Siklus Tolak & Penarikan ${Date.now()}`,
        desk: "hukum-keadilan",
        format: "ANALYSIS",
        deck: "Ringkasan uji transisi penolakan terminal.",
        content: [{ type: "paragraph", text: "Paragraf uji transisi penolakan terminal pada status submission." }],
        sources: [{ title: "Dokumen Uji", url: "https://example.com/doc", sourceType: "OFFICIAL" }],
        aiInvolvement: "none",
        agentId: "agent-reject-test",
        idempotencyKey: `reject-terminal-${Date.now()}`,
      },
      authHeader,
    );
    expect(rejSub.status).toBe(201);
    const created2 = (await rejSub.json()) as { submissionId: string; articleId: string };
    createdArticleIds.push(created2.articleId);

    const fetchStatus2 = async () =>
      (await (
        await fetch(`${BASE}/api/internal/v1/ai-submissions/${created2.submissionId}`, {
          headers: { Authorization: authHeader },
        })
      ).json()) as { submissionStatus: string; editorialStatus: string };

    expect((await transition(chief, created2.articleId, "SUBMIT_REVIEW")).status).toBe(200);
    expect((await fetchStatus2()).submissionStatus).toBe("EDITORIAL_REVIEW");

    expect(
      (await transition(chief, created2.articleId, "REJECT", "Ditolak untuk verifikasi sinkronisasi status.")).status,
    ).toBe(200);
    const rejectedState = await fetchStatus2();
    expect(rejectedState.editorialStatus).toBe("REJECTED");
    expect(rejectedState.submissionStatus).toBe("RESOLVED");

    // REJECTED bersifat terminal sesuai TRANSITION_RULES
    expect((await transition(chief, created2.articleId, "REOPEN")).status).toBe(422);

    // Uji WITHDRAW dari DRAFT -> WITHDRAWN + Submission.status === RESOLVED
    const wdSub = await submitAi(
      {
        title: `Verifikasi Integritas Penarikan Naskah ${Date.now()}`,
        desk: "hukum-keadilan",
        format: "ANALYSIS",
        deck: "Ringkasan uji penarikan draf.",
        content: [{ type: "paragraph", text: "Paragraf uji penarikan draf menjadi WITHDRAWN." }],
        sources: [{ title: "Dokumen Uji Tarik", url: "https://example.com/wd", sourceType: "OFFICIAL" }],
        aiInvolvement: "none",
        agentId: "agent-withdraw-test",
        idempotencyKey: `withdraw-terminal-${Date.now()}`,
      },
      authHeader,
    );
    expect(wdSub.status).toBe(201);
    const created3 = (await wdSub.json()) as { submissionId: string; articleId: string };
    createdArticleIds.push(created3.articleId);

    expect(
      (await transition(chief, created3.articleId, "WITHDRAW", "Ditarik sebelum telaah selesai.")).status,
    ).toBe(200);
    const wdStatus = (await (
      await fetch(`${BASE}/api/internal/v1/ai-submissions/${created3.submissionId}`, {
        headers: { Authorization: authHeader },
      })
    ).json()) as { submissionStatus: string; editorialStatus: string };
    expect(wdStatus.editorialStatus).toBe("WITHDRAWN");
    expect(wdStatus.submissionStatus).toBe("RESOLVED");
  });

  // ---------------------------------------------------------------------------
  // 6. Halaman Publik Pengembang & Pemisahan Kebijakan
  // ---------------------------------------------------------------------------

  test("Halaman publik pengembang & kebijakan memisahkan aturan kontributor vs AI API tanpa em-dash", async () => {
    for (const route of ["/developers", "/standar-editorial", "/kebijakan-ai", "/kirim-tulisan", "/pedoman-kontributor"]) {
      const res = await fetch(`${BASE}${route}`);
      expect(res.status, route).toBe(200);
      const html = await res.text();
      expect(html, `${route} no em-dash`).not.toContain("—");
    }

    for (const machineDocPage of ["/developers", "/standar-editorial", "/kebijakan-ai"]) {
      const html = await (await fetch(`${BASE}${machineDocPage}`)).text();
      expect(html, `${machineDocPage} links editorial manifest`).toContain("/editorial/manifest.json");
    }

    for (const contributorPage of ["/kirim-tulisan", "/pedoman-kontributor"]) {
      const html = await (await fetch(`${BASE}${contributorPage}`)).text();
      expect(html, `${contributorPage} links developers`).toContain("/developers");
      expect(html, `${contributorPage} states NEWS closed`).toContain("Berita Harian (News) tidak dibuka");
    }

    const devHtml = await (await fetch(`${BASE}/developers`)).text();
    expect(devHtml).toContain("ParagraphBlock");
    expect(devHtml).toContain("QaBlock");
    expect(devHtml).toContain("PROPOSED");
    expect(devHtml).toContain("405 METHOD_NOT_ALLOWED");
  });

  // ---------------------------------------------------------------------------
  // 7. Final Acceptance P0/P1/P2 Hardening: Leaks, SHA-256, 304, ?output=, Gates
  // ---------------------------------------------------------------------------

  test("Seluruh endpoint publik & KB bebas kebocoran internal (P0 Knowledge Boundary)", async () => {
    const publicEndpoints = [
      "/editorial/manifest.json",
      "/editorial/core",
      "/editorial/core?mode=compact",
      "/editorial/core/identity",
      "/editorial/core/principles",
      "/editorial/core/verification",
      "/editorial/core/ethics",
      "/editorial/core/language",
      "/editorial/desks/hukum-keadilan",
      "/editorial/desks/teknologi-kebijakan",
      "/editorial/desks/nasional-publik",
      "/editorial/formats/news",
      "/editorial/formats/opinion",
      "/editorial/formats/analysis",
      "/editorial/formats/explainer",
      "/editorial/formats/feature",
      "/editorial/formats/interview",
      "/editorial/operations/ai-workflow",
      "/editorial/operations/quality-assessment",
      "/editorial/operations/review-checklist",
      "/editorial/operations/api-integration",
      "/editorial/context?desk=hukum-keadilan&format=ANALYSIS",
      "/openapi.json",
      "/llms.txt",
      "/llms-full.txt",
      "/.well-known/verax-agent.json",
      "/api/internal/v1/capabilities",
      "/developers",
      "/standar-editorial",
      "/kebijakan-ai",
      "/kebijakan-privasi",
      "/kirim-tulisan",
      "/pedoman-kontributor",
    ];

    const forbiddenPatterns: Array<[string, RegExp]> = [
      ["internal src/ path", /src\/(?:lib|app|components)/i],
      ["prisma schema path", /prisma\/schema\.prisma/i],
      ["agent skills path", /\.agents\/skills/i],
      ["local Windows workspace path", /[cd]:\\projects\\/i],
      ["internal studio route", /\/api\/studio/i],
      ["internal contributor route", /\/api\/contributor/i],
      ["Turso reference", /\bturso\b/i],
      ["SQLite reference", /\bsqlite\b/i],
      ["scrypt reference", /\bscrypt\b/i],
      ["DECISIONS_REQUIRED leak", /decisions_required/i],
      ["LEGAL REVIEW marker", /legal review required/i],
      ["ReviewComment model", /reviewcomment/i],
      ["aiDisclosureNote field", /aidisclosurenote/i],
      ["server base env leak", /verax_public_base_url/i],
    ];

    for (const ep of publicEndpoints) {
      const res = await fetch(`${BASE}${ep}`);
      expect(res.status, `GET ${ep}`).toBe(200);
      const body = await res.text();
      for (const [label, pattern] of forbiddenPatterns) {
        expect(pattern.test(body), `${ep} leaked ${label}`).toBe(false);
      }
    }
  });

  test("Checksum SHA-256 UTF-8 LF cocok secara independen di seluruh dokumen KB & bundle", async () => {
    const jsonEndpoints = [
      "/editorial/core?output=json",
      "/editorial/core?mode=compact&output=json",
      "/editorial/core/identity?output=json",
      "/editorial/core/principles?output=json",
      "/editorial/core/verification?output=json",
      "/editorial/core/ethics?output=json",
      "/editorial/core/language?output=json",
      "/editorial/desks/hukum-keadilan?output=json",
      "/editorial/desks/teknologi-kebijakan?output=json",
      "/editorial/desks/nasional-publik?output=json",
      "/editorial/formats/news?output=json",
      "/editorial/formats/opinion?output=json",
      "/editorial/formats/analysis?output=json",
      "/editorial/formats/explainer?output=json",
      "/editorial/formats/feature?output=json",
      "/editorial/formats/interview?output=json",
      "/editorial/operations/ai-workflow?output=json",
      "/editorial/operations/quality-assessment?output=json",
      "/editorial/operations/review-checklist?output=json",
      "/editorial/operations/api-integration?output=json",
    ];

    for (const ep of jsonEndpoints) {
      const res = await fetch(`${BASE}${ep}`);
      expect(res.status, `GET ${ep}`).toBe(200);
      const doc = (await res.json()) as {
        bodyMarkdown: string;
        sha256: string;
      };
      expect(doc.sha256, `sha256 present on ${ep}`).toMatch(/^[a-f0-9]{64}$/);
      const normalized = doc.bodyMarkdown.replace(/\r\n?/g, "\n");
      const computed = crypto.createHash("sha256").update(normalized, "utf8").digest("hex");
      expect(computed, `SHA-256 mismatch at ${ep}`).toBe(doc.sha256);

      // Verifikasi independen terhadap respons Accept: text/markdown (setelah stripping banner YAML + notice pratinjau)
      const mdPath = ep.replace("?output=json", "").replace("&output=json", "");
      const mdRes = await fetch(`${BASE}${mdPath}`, {
        headers: { Accept: "text/markdown" },
      });
      expect(mdRes.status, `GET ${mdPath} Accept: text/markdown`).toBe(200);
      const mdText = (await mdRes.text()).replace(/\r\n?/g, "\n");
      const frontmatterMatch = mdText.match(/^---\n([\s\S]*?)\n---\n\n> \*\*\[STATUS STANDAR:[^\n]*\n([\s\S]*)$/);
      expect(frontmatterMatch, `YAML preview banner present on ${mdPath}`).toBeTruthy();
      const shaInBanner = frontmatterMatch![1].match(/^sha256:\s*([a-f0-9]{64})$/m)?.[1];
      expect(shaInBanner, `sha256 banner matches JSON on ${mdPath}`).toBe(doc.sha256);
      const strippedMdHash = crypto.createHash("sha256").update(frontmatterMatch![2], "utf8").digest("hex");
      expect(strippedMdHash, `Markdown SHA-256 mismatch at ${mdPath}`).toBe(doc.sha256);
    }
  });

  test("ETag / If-None-Match (304), validasi ?output (422), Desk 404 vs 422, & requestId pada error", async () => {
    const cacheRoutes = [
      "/editorial/manifest.json",
      "/editorial/core",
      "/editorial/core/identity",
      "/editorial/desks/hukum-keadilan",
      "/editorial/formats/analysis",
      "/editorial/operations/ai-workflow",
      "/editorial/context?desk=teknologi-kebijakan&format=ANALYSIS",
    ];

    for (const route of cacheRoutes) {
      const first = await fetch(`${BASE}${route}`);
      expect(first.status, `Initial ${route}`).toBe(200);
      const etag = first.headers.get("etag");
      expect(etag, `${route} ETag`).toBeTruthy();

      const conditional = await fetch(`${BASE}${route}`, {
        headers: { "If-None-Match": etag! },
      });
      expect(conditional.status, `304 ${route}`).toBe(304);
      expect(await conditional.text()).toBe("");
      expect(conditional.headers.get("etag")).toBe(etag);
      expect(conditional.headers.get("vary") ?? "").toContain("Accept");
    }

    const badOutputRoutes = [
      "/editorial/core?output=xml",
      "/editorial/core/identity?output=yaml",
      "/editorial/desks/hukum-keadilan?output=toml",
      "/editorial/formats/analysis?output=xml",
      "/editorial/operations/ai-workflow?output=xml",
      "/editorial/context?desk=hukum-keadilan&format=ANALYSIS&output=xml",
    ];
    for (const route of badOutputRoutes) {
      const res = await fetch(`${BASE}${route}`);
      expect(res.status, `Invalid output ${route}`).toBe(422);
      const headerReqId = res.headers.get("x-request-id");
      expect(headerReqId).toBeTruthy();
      const body = (await res.json()) as {
        code: string;
        requestId: string;
        standardStatus: string;
        isBindingEffectivePolicy: boolean;
      };
      expect(body.code).toBe("VALIDATION_ERROR");
      expect(body.requestId.startsWith("req_")).toBe(true);
      expect(headerReqId).toBe(body.requestId);
      expect(body.standardStatus).toBe("PROPOSED");
      expect(body.isBindingEffectivePolicy).toBe(false);
    }

    // Unknown desk slug -> 404 DESK_NOT_FOUND (distinct from 422 DESK_REJECTED when disabled)
    const missingDesk = await fetch(`${BASE}/editorial/desks/ekonomi-digital`);
    expect(missingDesk.status).toBe(404);
    expect(missingDesk.headers.get("x-request-id")).toBeTruthy();
    const missingDeskBody = (await missingDesk.json()) as { code: string; requestId: string; standardId: string };
    expect(missingDeskBody.code).toBe("DESK_NOT_FOUND");
    expect(missingDeskBody.requestId).toBeTruthy();
    expect(missingDeskBody.standardId).toBe("VERAX-EDITORIAL-AI");
  });

  test("GATE_EMPTY_CONTENT menolak list kosong maupun qa whitespace saat PUBLISH (422)", async () => {
    const emptyListArt = await createArticle(chief, {
      content: [{ type: "list", style: "bullet", items: ["   ", "\t"] }],
      sources: [
        {
          title: "Sumber Primer Uji List Kosong",
          url: "https://example.com/list-src",
          sourceType: "PRIMARY",
          isKeySource: true,
        },
      ],
    });
    createdArticleIds.push(emptyListArt.id);

    const listDetail = (await (await get(`/api/cms/articles/${emptyListArt.id}`, chief)).json()) as {
      sources?: { id: string }[];
      article?: { sources: { id: string }[] };
    };
    const listSources = listDetail.sources ?? listDetail.article?.sources ?? [];
    await patchJson(
      `/api/cms/articles/${emptyListArt.id}/sources/${listSources[0].id}`,
      { verificationStatus: "VERIFIED", verificationNote: "Terverifikasi uji gerbang konten kosong." },
      chief,
    );
    await transition(chief, emptyListArt.id, "SUBMIT_REVIEW");
    await transition(chief, emptyListArt.id, "START_FACT_CHECK");
    await transition(chief, emptyListArt.id, "SUBMIT_FOR_APPROVAL");
    const listPublish = await transition(chief, emptyListArt.id, "PUBLISH");
    expect(listPublish.status).toBe(422);
    expect((listPublish.body as { code?: string })?.code).toBe("GATE_EMPTY_CONTENT");

    const emptyQaArt = await createArticle(chief, {
      content: [{ type: "qa", question: "   ", answer: "Jawaban tanpa pertanyaan" }],
      sources: [
        {
          title: "Sumber Primer Uji QA Kosong",
          url: "https://example.com/qa-src",
          sourceType: "PRIMARY",
          isKeySource: true,
        },
      ],
    });
    createdArticleIds.push(emptyQaArt.id);

    const qaDetail = (await (await get(`/api/cms/articles/${emptyQaArt.id}`, chief)).json()) as {
      sources?: { id: string }[];
      article?: { sources: { id: string }[] };
    };
    const qaSources = qaDetail.sources ?? qaDetail.article?.sources ?? [];
    await patchJson(
      `/api/cms/articles/${emptyQaArt.id}/sources/${qaSources[0].id}`,
      { verificationStatus: "VERIFIED", verificationNote: "Terverifikasi uji gerbang qa kosong." },
      chief,
    );
    await transition(chief, emptyQaArt.id, "SUBMIT_REVIEW");
    await transition(chief, emptyQaArt.id, "START_FACT_CHECK");
    await transition(chief, emptyQaArt.id, "SUBMIT_FOR_APPROVAL");
    const qaPublish = await transition(chief, emptyQaArt.id, "PUBLISH");
    expect(qaPublish.status).toBe(422);
    expect((qaPublish.body as { code?: string })?.code).toBe("GATE_EMPTY_CONTENT");
  });

  test("robots.txt mengizinkan /api/internal/v1/capabilities dan 127.0.0.1 loopback konsisten di /developers, /openapi.json, & llms*.txt", async () => {
    const robotsRes = await fetch(`${BASE}/robots.txt`);
    expect(robotsRes.status).toBe(200);
    const robotsTxt = await robotsRes.text();
    const allowCapIdx = robotsTxt.indexOf("Allow: /api/internal/v1/capabilities");
    const disallowApiIdx = robotsTxt.indexOf("Disallow: /api/");
    expect(allowCapIdx).toBeGreaterThan(-1);
    expect(disallowApiIdx).toBeGreaterThan(allowCapIdx);

    const loopbackBase = BASE.replace("localhost", "127.0.0.1");
    const openapi127 = (await (await fetch(`${loopbackBase}/openapi.json`)).json()) as {
      servers: Array<{ url: string }>;
    };
    expect(openapi127.servers[0]?.url).toBe(loopbackBase);

    const llms127 = await (await fetch(`${loopbackBase}/llms.txt`)).text();
    expect(llms127).toContain(`${loopbackBase}/editorial/manifest.json`);

    const dev127 = await (await fetch(`${loopbackBase}/developers`)).text();
    expect(dev127).toContain(`${loopbackBase}/api/internal/v1/ai-submissions`);
    expect(dev127).toContain(`${loopbackBase}/editorial/context`);
    expect(dev127).not.toContain("VERAX_PUBLIC_BASE_URL");
  });

  test("Dokumentasi publik /llms.txt, /editorial/operations/api-integration, dan /validate menjaga konsistensi gerbang, kode galat, & whitespace", async () => {
    const llmsText = await (await fetch(`${BASE}/llms.txt`)).text();
    expect(llmsText).toContain("enam gerbang server");
    expect(llmsText).not.toContain("lima gerbang server");

    const apiIntegrationDoc = await (
      await fetch(`${BASE}/editorial/operations/api-integration`, { headers: { Accept: "text/markdown" } })
    ).text();
    expect(apiIntegrationDoc).toContain("MALFORMED_JSON");
    expect(apiIntegrationDoc).toContain("FORBIDDEN_SCOPE");
    expect(apiIntegrationDoc).toContain("CLIENT_INACTIVE");
    expect(apiIntegrationDoc).toContain("DESK_REJECTED");
    expect(apiIntegrationDoc).not.toContain("INSUFFICIENT_SCOPE");
    expect(apiIntegrationDoc).not.toContain("MISSING_AUTH");
    expect(apiIntegrationDoc).not.toContain("INACTIVE_DESK");

    const authHeader = await apiAuthHeader();
    const invalidWhitespace = await fetch(`${BASE}/api/internal/v1/ai-submissions/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({
        title: "   \t\n   ",
        desk: "hukum-keadilan",
        format: "ANALYSIS",
        content: [{ type: "paragraph", text: "   \t  " }],
        sources: [{ title: "  \t ", url: "https://example.com/doc", sourceType: "OFFICIAL" }],
        aiInvolvement: "none",
        agentId: "   ",
        idempotencyKey: "        ",
      }),
    });
    expect(invalidWhitespace.status).toBe(422);
    const invalidBody = (await invalidWhitespace.json()) as { code: string; details: Array<{ path: string }> };
    expect(invalidBody.code).toBe("VALIDATION_ERROR");
    const paths = invalidBody.details.map((d) => d.path);
    expect(paths).toContain("title");
    expect(paths).toContain("agentId");
    expect(paths).toContain("idempotencyKey");
    expect(paths).toContain("sources.0.title");
    expect(paths).toContain("content.0.text");

    // Pastikan metode HTTP 405 pada endpoint editorial mengembalikan status standar & isBindingEffectivePolicy dinamis
    const method405 = await fetch(`${BASE}/editorial/manifest.json`, { method: "POST" });
    expect(method405.status).toBe(405);
    expect(method405.headers.get("allow")).toContain("GET");
    const method405Body = (await method405.json()) as { code: string; isBindingEffectivePolicy: boolean };
    expect(method405Body.code).toBe("METHOD_NOT_ALLOWED");
    expect(method405Body.isBindingEffectivePolicy).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 8. Finding F06: Human Byline Confirmation Across 4 Actors
  // ---------------------------------------------------------------------------

  test("F06(a): CHIEF_EDITOR dapat mengonfirmasi byline dan menerbitkan artikel INGESTION_API", async () => {
    const authHeader = await apiAuthHeader();
    const subRes = await submitAi(
      {
        title: `Uji Konfirmasi Byline Oleh Chief Editor ${Date.now()}`,
        desk: "hukum-keadilan",
        format: "ANALYSIS",
        deck: "Ringkasan artikel uji konfirmasi byline oleh Pemimpin Redaksi.",
        content: [{ type: "paragraph", text: "Paragraf isi untuk menguji konfirmasi byline oleh CHIEF_EDITOR." }],
        sources: [
          {
            title: "Sumber Primer Konfirmasi Byline",
            url: "https://example.com/f06-chief-src",
            sourceType: "PRIMARY",
            isKeySource: true,
          },
        ],
        aiInvolvement: "assistive",
        agentId: "agent-f06-chief",
        idempotencyKey: `f06-chief-${Date.now()}`,
      },
      authHeader,
    );
    expect(subRes.status).toBe(201);
    const created = (await subRes.json()) as { articleId: string };
    createdArticleIds.push(created.articleId);

    const detail = (await (await get(`/api/studio/articles/${created.articleId}`, chief)).json()) as {
      sources: Array<{ id: string }>;
    };
    const verifyRes = await patchJson(
      `/api/studio/articles/${created.articleId}/sources/${detail.sources[0].id}`,
      { verificationStatus: "VERIFIED", verificationNote: "Terverifikasi uji F06." },
      chief,
    );
    expect(verifyRes.status).toBe(200);

    expect((await transition(chief, created.articleId, "SUBMIT_REVIEW")).status).toBe(200);
    expect((await transition(chief, created.articleId, "START_FACT_CHECK")).status).toBe(200);
    expect((await transition(chief, created.articleId, "SUBMIT_FOR_APPROVAL")).status).toBe(200);

    const unconfirmedPublish = await transition(chief, created.articleId, "PUBLISH");
    expect(unconfirmedPublish.status).toBe(422);
    expect((unconfirmedPublish.body as { code?: string }).code).toBe("GATE_BYLINE_UNCONFIRMED");

    const confirmRes = await patchJson(
      `/api/studio/articles/${created.articleId}`,
      {
        byline: "Rina Kusuma",
        contributions: [{ personName: "Rina Kusuma", role: "EDITOR", publicCredit: true }],
      },
      chief,
    );
    expect(confirmRes.status).toBe(200);

    const publishRes = await transition(chief, created.articleId, "PUBLISH");
    expect(publishRes.status).toBe(200);
    const published = publishRes.body as { status: string; byline: string };
    expect(published.status).toBe("PUBLISHED");
    expect(published.byline).toBe("Rina Kusuma");
  });

  test("F06(b): WRITER ditolak (403) saat mencoba mengonfirmasi/menerbitkan byline atau mengatur kredit kontribusi", async () => {
    const writerOwner = await loginAs("author");
    const otherWriter = await loginAs("editor");

    const art = await createArticle(writerOwner, {
      title: `Uji Penolakan Publish Oleh Writer ${Date.now()}`,
      sources: [
        {
          title: "Sumber Primer Writer F06",
          url: "https://example.com/f06-writer-src",
          sourceType: "PRIMARY",
          isKeySource: true,
        },
      ],
    });
    createdArticleIds.push(art.id);

    const detail = (await (await get(`/api/studio/articles/${art.id}`, chief)).json()) as {
      sources: Array<{ id: string }>;
    };
    const verifyRes = await patchJson(
      `/api/studio/articles/${art.id}/sources/${detail.sources[0].id}`,
      {
        isKeySource: true,
        verificationStatus: "VERIFIED",
        verificationNote: "Terverifikasi chief untuk uji WRITER.",
      },
      chief,
    );
    expect(verifyRes.status).toBe(200);

    expect((await transition(writerOwner, art.id, "SUBMIT_REVIEW")).status).toBe(200);
    expect((await transition(chief, art.id, "START_FACT_CHECK")).status).toBe(200);
    expect((await transition(chief, art.id, "SUBMIT_FOR_APPROVAL")).status).toBe(200);

    // WRITER pemilik tidak boleh memanggil PUBLISH atau mengatur contributions
    const ownerPublish = await transition(writerOwner, art.id, "PUBLISH");
    expect(ownerPublish.status).toBe(403);
    expect((ownerPublish.body as { code?: string }).code).toBe("FORBIDDEN");

    const ownerPublishViaTo = await postJson(
      `/api/studio/articles/${art.id}/transition`,
      { to: "published" },
      writerOwner,
    );
    expect(ownerPublishViaTo.status).toBe(403);

    const ownerContribPatch = await patchJson(
      `/api/studio/articles/${art.id}`,
      { contributions: [{ personName: "Kredit Palsu", role: "AUTHOR", publicCredit: true }] },
      writerOwner,
    );
    expect(ownerContribPatch.status).toBe(403);

    // WRITER lain (non-pemilik) juga ditolak 403
    const nonOwnerPublish = await transition(otherWriter, art.id, "PUBLISH");
    expect(nonOwnerPublish.status).toBe(403);
    expect((nonOwnerPublish.body as { code?: string }).code).toBe("FORBIDDEN");

    // CHIEF_EDITOR tetap dapat menerbitkan setelah verifikasi
    const chiefPublish = await transition(chief, art.id, "PUBLISH");
    expect(chiefPublish.status).toBe(200);
    expect((chiefPublish.body as { status?: string }).status).toBe("PUBLISHED");
  });

  test("F06(c): CONTRIBUTOR ditolak (403) saat mencoba PUBLISH atau mengubah byline melalui rute Studio maupun Kontributor", async () => {
    const db = getTestDb();
    const contribEmail = "f06.contrib@example.test";
    const contribUsername = "f06_contrib_user";
    const contribPassword = "F06ContribPassword#123";

    const contrib = await db.contributor.upsert({
      where: { email: contribEmail },
      update: {
        username: contribUsername,
        passwordHash: hashPassword(contribPassword),
        status: "ACTIVE",
        adultConfirmedAt: new Date(),
      },
      create: {
        username: contribUsername,
        email: contribEmail,
        passwordHash: hashPassword(contribPassword),
        status: "ACTIVE",
        adultConfirmedAt: new Date(),
      },
    });
    await db.person.upsert({
      where: { contributorId: contrib.id },
      update: { accountType: "EXTERNAL", publicName: "Kontributor F06" },
      create: { accountType: "EXTERNAL", contributorId: contrib.id, publicName: "Kontributor F06" },
    });

    const contribLogin = await loginWithCredentials(contribUsername, contribPassword);
    expect(contribLogin.success).toBe(true);
    const contribClient = contribLogin.client;

    const createRes = await postJson(
      "/api/contributor/articles",
      {
        title: `Uji Isolasi Byline Kontributor ${Date.now()}`,
        deck: "Ringkasan naskah kontributor untuk pengujian otorisasi byline.",
        deskSlug: "hukum-keadilan",
        format: "OPINION",
        content: [{ type: "paragraph", text: "Paragraf naskah kontributor untuk pengujian F06." }],
      },
      contribClient,
    );
    expect(createRes.status).toBe(201);
    const { id: contribArtId } = (await createRes.json()) as { id: string };
    createdArticleIds.push(contribArtId);

    // Upaya menyisipkan byline via PATCH /api/contributor/articles/[id] diabaikan oleh skema
    const contribPatch = await patchJson(
      `/api/contributor/articles/${contribArtId}`,
      { byline: "Byline Rekayasa Kontributor", deck: "Ringkasan diperbarui." },
      contribClient,
    );
    expect(contribPatch.status).toBe(200);
    const afterContribPatch = await db.article.findUnique({ where: { id: contribArtId } });
    expect(afterContribPatch?.byline).toBe("Oleh Kontributor F06");

    // Kontributor ditolak 403 saat mengakses rute Studio
    const studioPatch = await patchJson(
      `/api/studio/articles/${contribArtId}`,
      { byline: "Byline Rekayasa Studio" },
      contribClient,
    );
    expect(studioPatch.status).toBe(403);

    const studioPublish = await postJson(
      `/api/studio/articles/${contribArtId}/transition`,
      { action: "PUBLISH" },
      contribClient,
    );
    expect(studioPublish.status).toBe(403);

    // Kontributor ditolak 403 saat mencoba PUBLISH via rute transisi kontributor
    const contribPublish = await postJson(
      `/api/contributor/articles/${contribArtId}/transition`,
      { action: "PUBLISH" },
      contribClient,
    );
    expect(contribPublish.status).toBe(403);

    // Kontributor hanya boleh mengajukan review, lalu CHIEF_EDITOR yang menyelesaikan hingga PUBLISH
    expect(
      (await postJson(`/api/contributor/articles/${contribArtId}/transition`, { action: "SUBMIT_REVIEW" }, contribClient))
        .status,
    ).toBe(200);

    const srcAdd = await postJson(
      `/api/studio/articles/${contribArtId}/sources`,
      {
        title: "Sumber Primer Kontributor F06",
        url: "https://example.com/f06-contrib-src",
        sourceType: "PRIMARY",
        isKeySource: true,
      },
      chief,
    );
    expect(srcAdd.status).toBe(201);
    const srcAddBody = (await srcAdd.json()) as { sources: Array<{ id: string }> };
    const verifyContribSrc = await patchJson(
      `/api/studio/articles/${contribArtId}/sources/${srcAddBody.sources[0].id}`,
      {
        isKeySource: true,
        verificationStatus: "VERIFIED",
        verificationNote: "Terverifikasi chief.",
      },
      chief,
    );
    expect(verifyContribSrc.status).toBe(200);
    expect((await transition(chief, contribArtId, "START_FACT_CHECK")).status).toBe(200);
    expect((await transition(chief, contribArtId, "SUBMIT_FOR_APPROVAL")).status).toBe(200);
    expect((await transition(chief, contribArtId, "PUBLISH")).status).toBe(200);
  });

  test("F06(d): INGESTION_API tidak dapat menetapkan byline manusia saat intake maupun memanggil transisi PUBLISH", async () => {
    const authHeader = await apiAuthHeader();
    const subRes = await submitAi(
      {
        title: `Uji Penahanan Byline Agen AI ${Date.now()}`,
        desk: "teknologi-kebijakan",
        format: "EXPLAINER",
        deck: "Ringkasan uji penolakan spoof byline dari payload Ingestion API.",
        content: [{ type: "paragraph", text: "Paragraf uji bahwa field byline pada payload API diabaikan." }],
        sources: [
          {
            title: "Sumber Resmi Uji Spoof Byline",
            url: "https://example.com/f06-ai-src",
            sourceType: "OFFICIAL",
            isKeySource: true,
          },
        ],
        byline: "Jurnalis Manusia Palsu",
        contributions: [{ personName: "Jurnalis Manusia Palsu", role: "AUTHOR" }],
        aiInvolvement: "assistive",
        agentId: "agent-f06-spoof",
        idempotencyKey: `f06-ai-spoof-${Date.now()}`,
      },
      authHeader,
    );
    expect(subRes.status).toBe(201);
    const created = (await subRes.json()) as { submissionId: string; articleId: string; articleStatus: string };
    createdArticleIds.push(created.articleId);
    expect(created.articleStatus).toBe("DRAFT");

    const db = getTestDb();
    const saved = await db.article.findUnique({
      where: { id: created.articleId },
      include: { contributions: true },
    });
    expect(saved?.byline).toBe(AI_PLACEHOLDER_BYLINE);
    expect(saved?.contributions).toHaveLength(0);

    // Klien AI tidak dapat memanggil endpoint transisi atau sunting Studio (401 tanpa sesi staf)
    const aiTransition = await fetch(`${BASE}/api/studio/articles/${created.articleId}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ action: "PUBLISH" }),
    });
    expect(aiTransition.status).toBe(401);

    const aiPatch = await fetch(`${BASE}/api/studio/articles/${created.articleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ byline: "Jurnalis Manusia Palsu" }),
    });
    expect(aiPatch.status).toBe(401);

    // Endpoint status submission menolak mutasi POST/PATCH dengan 405
    const aiSubPost = await fetch(`${BASE}/api/internal/v1/ai-submissions/${created.submissionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ action: "PUBLISH" }),
    });
    expect(aiSubPost.status).toBe(405);
  });

  test("CA-01: idempotencyKey terisolasi per apiClientId (tidak bocor atau bentrok lintas klien)", async () => {
    const db = getTestDb();
    const createClient = async (name: string) => {
      const res = await postJson(
        "/api/studio/api-clients",
        { name, environment: "DEVELOPMENT" },
        chief,
      );
      expect(res.status).toBe(201);
      return (await res.json()) as { id: string; clientId: string; secret: string };
    };

    const c1 = await createClient("CA01 Client Satu");
    const c2 = await createClient("CA01 Client Dua");
    const sharedKey = `ca01-shared-${Date.now()}`;
    const basePayload = {
      title: `Uji Idempotensi Lintas Klien ${Date.now()}`,
      desk: "teknologi-kebijakan",
      format: "EXPLAINER",
      deck: "Memastikan idempotencyKey sama oleh dua klien berbeda tetap terisolasi.",
      content: [{ type: "paragraph", text: "Paragraf uji isolasi idempotencyKey per apiClientId." }],
      sources: [
        {
          title: "Sumber Resmi CA-01",
          url: "https://example.com/ca01-src",
          sourceType: "OFFICIAL",
          isKeySource: true,
        },
      ],
      aiInvolvement: "assistive",
      agentId: "agent-ca01",
      idempotencyKey: sharedKey,
    };

    try {
      const h1 = `Bearer ${c1.clientId}.${c1.secret}`;
      const h2 = `Bearer ${c2.clientId}.${c2.secret}`;
      const submitFromIp = (payload: unknown, authHeader: string, ip: string) =>
        fetch(`${BASE}/api/internal/v1/ai-submissions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
            "x-vercel-forwarded-for": ip,
          },
          body: JSON.stringify(payload),
        });

      // Klien 1 kirim -> 201
      const res1 = await submitFromIp(basePayload, h1, "198.51.100.11");
      expect(res1.status).toBe(201);
      const body1 = (await res1.json()) as { submissionId: string; articleId: string };
      createdArticleIds.push(body1.articleId);

      // Klien 2 kirim payload & idempotencyKey identik -> harus 201 independen (TIDAK boleh replay milik Klien 1)
      const res2 = await submitFromIp(basePayload, h2, "198.51.100.12");
      expect(res2.status).toBe(201);
      const body2 = (await res2.json()) as { submissionId: string; articleId: string; idempotentReplay: boolean };
      createdArticleIds.push(body2.articleId);
      expect(body2.idempotentReplay).toBe(false);
      expect(body2.submissionId).not.toBe(body1.submissionId);
      expect(body2.articleId).not.toBe(body1.articleId);

      // Klien 1 replay dengan payload identik -> 200 dengan id miliknya sendiri
      const replay1 = await submitFromIp(basePayload, h1, "198.51.100.11");
      expect(replay1.status).toBe(200);
      const replayBody1 = (await replay1.json()) as { submissionId: string; articleId: string; idempotentReplay: boolean };
      expect(replayBody1.idempotentReplay).toBe(true);
      expect(replayBody1.submissionId).toBe(body1.submissionId);
      expect(replayBody1.articleId).toBe(body1.articleId);

      // Klien 1 kirim ulang key sama dengan payload berbeda -> 409 IDEMPOTENCY_CONFLICT
      const conflict1 = await submitFromIp(
        { ...basePayload, title: `Judul Berbeda CA01 ${Date.now()}` },
        h1,
        "198.51.100.11",
      );
      expect(conflict1.status).toBe(409);
      const conflictBody = (await conflict1.json()) as { code: string };
      expect(conflictBody.code).toBe("IDEMPOTENCY_CONFLICT");

      // Klien 2 tidak dapat mengakses submission milik Klien 1 (404)
      const crossGet = await fetch(`${BASE}/api/internal/v1/ai-submissions/${body1.submissionId}`, {
        headers: { Authorization: h2 },
      });
      expect(crossGet.status).toBe(404);
    } finally {
      await db.apiRequestLog.deleteMany({ where: { apiClientId: { in: [c1.id, c2.id] } } });
      await db.apiClientCredential.deleteMany({ where: { apiClientId: { in: [c1.id, c2.id] } } });
      await db.apiClient.deleteMany({ where: { id: { in: [c1.id, c2.id] } } });
    }
  });

  test("CA-02: rate limit berjalan sebelum autentikasi sehingga brute-force token salah/kosong terkena 429", async () => {
    const burstSubmitIp = `198.51.100.${Math.floor(10 + Math.random() * 200)}`;
    // 12 percobaan pertama (token salah / kosong) ditolak 401, percobaan ke-13 harus 429 RATE_LIMITED
    for (let i = 0; i < 12; i += 1) {
      const res = await fetch(`${BASE}/api/internal/v1/ai-submissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vercel-forwarded-for": burstSubmitIp,
          ...(i % 2 === 0 ? { Authorization: `Bearer vrtc_fake_${i}.vrtk_invalid` } : {}),
        },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(401);
    }

    const blockedSubmit = await fetch(`${BASE}/api/internal/v1/ai-submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-vercel-forwarded-for": burstSubmitIp,
        Authorization: "Bearer vrtc_fake_13.vrtk_invalid",
      },
      body: JSON.stringify({}),
    });
    expect(blockedSubmit.status).toBe(429);
    expect(blockedSubmit.headers.get("retry-after")).toBeTruthy();
    const submitBody = (await blockedSubmit.json()) as { code: string };
    expect(submitBody.code).toBe("RATE_LIMITED");

    const burstValidateIp = `203.0.113.${Math.floor(10 + Math.random() * 200)}`;
    for (let i = 0; i < 30; i += 1) {
      const res = await fetch(`${BASE}/api/internal/v1/ai-submissions/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vercel-forwarded-for": burstValidateIp,
        },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(401);
    }

    const blockedValidate = await fetch(`${BASE}/api/internal/v1/ai-submissions/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-vercel-forwarded-for": burstValidateIp,
      },
      body: JSON.stringify({}),
    });
    expect(blockedValidate.status).toBe(429);
    expect(blockedValidate.headers.get("retry-after")).toBeTruthy();
    const validateBody = (await blockedValidate.json()) as { code: string };
    expect(validateBody.code).toBe("RATE_LIMITED");
  });

  test("CA-03: fallback ownership submission warisan tidak pernah mencocokkan client.name (hanya clientId)", async () => {
    const db = getTestDb();
    const sharedName = `Shared Agent Name CA03 ${Date.now()}`;
    const createClient = async () => {
      const res = await postJson(
        "/api/studio/api-clients",
        { name: sharedName, environment: "DEVELOPMENT" },
        chief,
      );
      expect(res.status).toBe(201);
      return (await res.json()) as { id: string; clientId: string; secret: string };
    };

    const c1 = await createClient();
    const c2 = await createClient();
    const h1 = `Bearer ${c1.clientId}.${c1.secret}`;
    const h2 = `Bearer ${c2.clientId}.${c2.secret}`;

    try {
      const makeSub = async (tag: string) => {
        const res = await fetch(`${BASE}/api/internal/v1/ai-submissions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: h1,
            "x-vercel-forwarded-for": `198.51.100.${tag}`,
          },
          body: JSON.stringify({
            title: `Uji Fallback CA03 ${tag} ${Date.now()}`,
            desk: "teknologi-kebijakan",
            format: "EXPLAINER",
            deck: "Menguji isolasi fallback ownership untuk submission warisan.",
            content: [{ type: "paragraph", text: "Paragraf uji isolasi kepemilikan submission warisan CA-03." }],
            sources: [
              {
                title: "Sumber CA-03",
                url: "https://example.com/ca03-src",
                sourceType: "OFFICIAL",
                isKeySource: true,
              },
            ],
            aiInvolvement: "assistive",
            agentId: "placeholder",
            idempotencyKey: `ca03-${tag}-${Date.now()}`,
          }),
        });
        expect(res.status).toBe(201);
        const body = (await res.json()) as { submissionId: string; articleId: string };
        createdArticleIds.push(body.articleId);
        return body.submissionId;
      };

      // Submission warisan dengan agentId = client.name bersama (apiClientId = null) -> kedua klien harus ditolak (404)
      const subByName = await makeSub("51");
      await db.submission.update({
        where: { id: subByName },
        data: { apiClientId: null, agentId: sharedName },
      });

      const getByName1 = await fetch(`${BASE}/api/internal/v1/ai-submissions/${subByName}`, {
        headers: { Authorization: h1 },
      });
      const getByName2 = await fetch(`${BASE}/api/internal/v1/ai-submissions/${subByName}`, {
        headers: { Authorization: h2 },
      });
      expect(getByName1.status).toBe(404);
      expect(getByName2.status).toBe(404);

      // Submission warisan dengan agentId = c1.clientId (apiClientId = null) -> hanya c1 yang boleh mengakses (200), c2 ditolak (404)
      const subByClientId = await makeSub("52");
      await db.submission.update({
        where: { id: subByClientId },
        data: { apiClientId: null, agentId: c1.clientId },
      });

      const getByCid1 = await fetch(`${BASE}/api/internal/v1/ai-submissions/${subByClientId}`, {
        headers: { Authorization: h1 },
      });
      const getByCid2 = await fetch(`${BASE}/api/internal/v1/ai-submissions/${subByClientId}`, {
        headers: { Authorization: h2 },
      });
      expect(getByCid1.status).toBe(200);
      expect(getByCid2.status).toBe(404);
    } finally {
      await db.apiRequestLog.deleteMany({ where: { apiClientId: { in: [c1.id, c2.id] } } });
      await db.apiClientCredential.deleteMany({ where: { apiClientId: { in: [c1.id, c2.id] } } });
      await db.apiClient.deleteMany({ where: { id: { in: [c1.id, c2.id] } } });
    }
  });

  test("CA-04: sesi CONTRIBUTOR tidak mewarisi role WRITER dan diblokir dari /studio/media; staf nonaktif juga ditolak", async () => {
    const db = getTestDb();
    const contribEmail = `ca04-contrib-${Date.now()}@verity.test`;
    const contribUsername = `ca04contrib_${Date.now()}`;
    const contribPassword = "Ca04ContribPassword!9";
    const tempStaffEmail = `ca04-staff-${Date.now()}@verity.test`;
    const tempStaffUsername = `ca04staff_${Date.now()}`;
    const tempStaffPassword = "Ca04StaffPassword!9";

    const contrib = await db.contributor.create({
      data: {
        email: contribEmail,
        username: contribUsername,
        passwordHash: hashPassword(contribPassword),
        status: "ACTIVE",
        adultConfirmedAt: new Date(),
      },
    });
    const tempStaff = await db.staffUser.create({
      data: {
        email: tempStaffEmail,
        username: tempStaffUsername,
        name: "Temp Staff CA04",
        passwordHash: hashPassword(tempStaffPassword),
        role: "WRITER",
        status: "ACTIVE",
      },
    });
    const secretAsset = await db.mediaAsset.create({
      data: {
        url: `/uploads/ca04-secret-${Date.now()}.png`,
        title: `Aset Rahasia CA04 ${Date.now()}`,
        creator: "Redaksi Verax",
        license: "Editorial Internal",
      },
    });

    try {
      const contribLogin = await loginWithCredentials(contribUsername, contribPassword);
      expect(contribLogin.success).toBe(true);

      // 1. Sesi kontributor tidak boleh memiliki role staf (harus null, bukan "WRITER")
      const sessionRes = await get("/api/auth/session", contribLogin.client);
      expect(sessionRes.status).toBe(200);
      const sessionBody = (await sessionRes.json()) as { user?: { accountType?: string; role?: unknown } };
      expect(sessionBody.user?.accountType).toBe("CONTRIBUTOR");
      expect(sessionBody.user?.role).toBeNull();

      // 2. Kontributor yang mencoba mengakses /studio/media dialihkan oleh middleware & tidak membocorkan aset
      const mediaRes = await fetch(`${BASE}/studio/media`, {
        headers: { Cookie: contribLogin.client.cookies },
        redirect: "manual",
      });
      expect(mediaRes.status).toBe(307);
      expect(mediaRes.headers.get("location")).toContain("/kontributor/portal");
      const mediaHtml = await mediaRes.text();
      expect(mediaHtml).not.toContain(secretAsset.title);

      // 3. Staf yang sudah login lalu dinonaktifkan di DB tidak bisa memuat data /studio/media dari Server Component
      const staffLogin = await loginWithCredentials(tempStaffUsername, tempStaffPassword);
      expect(staffLogin.success).toBe(true);
      await db.staffUser.update({ where: { id: tempStaff.id }, data: { status: "SUSPENDED" } });

      const suspendedMediaRes = await fetch(`${BASE}/studio/media`, {
        headers: { Cookie: staffLogin.client.cookies },
        redirect: "manual",
      });
      const suspendedHtml = await suspendedMediaRes.text();
      if ([303, 307].includes(suspendedMediaRes.status)) {
        expect(suspendedMediaRes.headers.get("location")).toContain("/studio/login");
      } else {
        expect(suspendedMediaRes.status).toBe(200);
        expect(suspendedHtml).toContain("NEXT_REDIRECT");
        expect(suspendedHtml).toContain("/studio/login");
      }
      expect(suspendedHtml).not.toContain("Pustaka Media Redaksi");
      expect(suspendedHtml).not.toContain(secretAsset.title);
    } finally {
      await db.mediaAsset.deleteMany({ where: { id: secretAsset.id } });
      await db.staffUser.deleteMany({ where: { id: tempStaff.id } });
      await db.contributor.deleteMany({ where: { id: contrib.id } });
    }
  });

  test("CA-05: POST /api/public/contributor/apply mengembalikan status dan respons identik untuk email staf, kontributor, dan pending", async () => {
    const db = getTestDb();
    const ts = Date.now();
    const staffEmail = `ca05-staff-${ts}@verity.test`;
    const contribEmail = `ca05-contrib-${ts}@verity.test`;
    const pendingEmail = `ca05-pending-${ts}@verity.test`;

    const staff = await db.staffUser.create({
      data: {
        email: staffEmail,
        username: `ca05staff_${ts}`,
        name: "Staff CA05",
        passwordHash: hashPassword("Ca05StaffPass!9"),
        role: "WRITER",
        status: "ACTIVE",
      },
    });
    const contrib = await db.contributor.create({
      data: {
        email: contribEmail,
        username: `ca05contrib_${ts}`,
        passwordHash: hashPassword("Ca05ContribPass!9"),
        status: "ACTIVE",
        adultConfirmedAt: new Date(),
      },
    });
    const pending = await db.contributorApplication.create({
      data: {
        name: "Pending Applicant CA05",
        email: pendingEmail,
        adultConfirmedAt: new Date(),
        guidelinesAccepted: true,
        status: "PENDING",
      },
    });

    try {
      const submitApply = async (email: string, ipSuffix: number) => {
        const res = await fetch(`${BASE}/api/public/contributor/apply`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-vercel-forwarded-for": `198.51.100.${ipSuffix}`,
          },
          body: JSON.stringify({
            name: "Calon Kontributor CA05",
            email,
            adultConfirmed: true,
            guidelinesAccepted: true,
          }),
        });
        const body = (await res.json()) as { error: string; code: string };
        return { status: res.status, code: body.code, error: body.error };
      };

      const resStaff = await submitApply(staffEmail, 61);
      const resContrib = await submitApply(contribEmail, 62);
      const resPending = await submitApply(pendingEmail, 63);

      expect(resStaff.status).toBe(409);
      expect(resContrib).toEqual(resStaff);
      expect(resPending).toEqual(resStaff);
      expect(resStaff.error).not.toContain("staf");
      expect(resStaff.error).not.toContain("kontributor aktif");
    } finally {
      await db.contributorApplication.deleteMany({ where: { id: pending.id } });
      await db.contributor.deleteMany({ where: { id: contrib.id } });
      await db.staffUser.deleteMany({ where: { id: staff.id } });
    }
  });

  test("CA-06: Contributor API menolak aiInvolvement 'substantive' (422) namun menerima 'none' dan 'assistive'", async () => {
    const db = getTestDb();
    const ts = Date.now();
    const contribEmail = `ca06-contrib-${ts}@verity.test`;
    const contribUsername = `ca06contrib_${ts}`;
    const contribPassword = "Ca06ContribPass!9";

    const contrib = await db.contributor.create({
      data: {
        email: contribEmail,
        username: contribUsername,
        passwordHash: hashPassword(contribPassword),
        status: "ACTIVE",
        adultConfirmedAt: new Date(),
      },
    });
    await db.person.create({
      data: { accountType: "EXTERNAL", contributorId: contrib.id, publicName: "Kontributor CA06" },
    });

    try {
      const login = await loginWithCredentials(contribUsername, contribPassword);
      expect(login.success).toBe(true);

      const postSubstantive = await postJson(
        "/api/contributor/articles",
        {
          title: `Uji Tolak AI Substantive ${ts}`,
          deskSlug: "hukum-keadilan",
          format: "OPINION",
          aiInvolvement: "substantive",
          content: [{ type: "paragraph", text: "Paragraf uji CA-06 untuk penolakan substantive." }],
        },
        login.client,
      );
      expect(postSubstantive.status).toBe(422);
      const subBody = (await postSubstantive.json()) as { code: string };
      expect(subBody.code).toBe("VALIDATION_ERROR");

      const postNone = await postJson(
        "/api/contributor/articles",
        {
          title: `Uji Terima AI None ${ts}`,
          deskSlug: "hukum-keadilan",
          format: "OPINION",
          aiInvolvement: "none",
          content: [{ type: "paragraph", text: "Paragraf uji CA-06 untuk nilai none." }],
        },
        login.client,
      );
      expect(postNone.status).toBe(201);
      const createdNone = (await postNone.json()) as { id: string };
      createdArticleIds.push(createdNone.id);

      const patchAssistive = await patchJson(
        `/api/contributor/articles/${createdNone.id}`,
        { aiInvolvement: "assistive" },
        login.client,
      );
      expect(patchAssistive.status).toBe(200);

      const patchSubstantive = await patchJson(
        `/api/contributor/articles/${createdNone.id}`,
        { aiInvolvement: "substantive" },
        login.client,
      );
      expect(patchSubstantive.status).toBe(422);
      const patchBody = (await patchSubstantive.json()) as { code: string };
      expect(patchBody.code).toBe("VALIDATION_ERROR");
    } finally {
      await db.article.deleteMany({ where: { contributorId: contrib.id } });
      await db.person.deleteMany({ where: { contributorId: contrib.id } });
      await db.contributor.deleteMany({ where: { id: contrib.id } });
    }
  });
});

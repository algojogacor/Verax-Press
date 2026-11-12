import { describe, it, expect, beforeAll, afterAll } from "bun:test";
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
import { createArticle, get, loginAs, patchJson, transition } from "./lib/http";

const BASE_URL = BASE;
let testServerProcess: ChildProcess | null = null;
let createdFixtureIds: string[] = [];

function assertCleanHtml(html: string, route: string) {
  expect(/\(\*[A-Za-z0-9]/.test(html), `${route} contains raw markdown escape (*`).toBe(false);
  expect(html, `${route} contains undefined token verity-paper-warm`).not.toContain("verity-paper-warm");
}

describe("Public Visitor Journeys (End-to-End Simulation)", () => {
  beforeAll(async () => {
    assertApprovedTestDatabase(DB_URL);

    let isServerRunning = await fetch(`${BASE_URL}/api/auth/csrf`, { signal: AbortSignal.timeout(600) })
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
      childEnv.NEXTAUTH_URL = BASE_URL;

      testServerProcess = spawn("node", [serverScript], {
        env: childEnv,
        stdio: "pipe",
      });

      const start = Date.now();
      while (Date.now() - start < 15000) {
        try {
          const res = await fetch(`${BASE_URL}/api/auth/csrf`, { signal: AbortSignal.timeout(600) });
          if (res.ok) {
            isServerRunning = true;
            break;
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 250));
      }

      if (!isServerRunning) {
        if (testServerProcess) testServerProcess.kill();
        throw new Error(`CRITICAL: Failed to launch isolated test server on ${BASE_URL} within 15s`);
      }
    }

    await seedTestFixtures();

    const db = getTestDb();
    const existingHukumCount = await db.article.count({
      where: {
        status: { in: ["PUBLISHED", "CORRECTED"] },
        desk: { slug: "hukum-keadilan" },
      },
    });

    if (existingHukumCount < 2) {
      const chief = await loginAs("chief");
      const needed = 2 - existingHukumCount;
      for (let i = 0; i < needed; i++) {
        const art = await createArticle(chief, {
          title: `Test Article Visitor Journey ${i + 1} ${Date.now()}`,
          deskSlug: "hukum-keadilan",
          format: "NEWS",
          sources: [
            {
              title: "Dokumen Resmi Uji Pengunjung",
              url: "https://example.com/visitor-journey-doc",
              sourceType: "OFFICIAL",
              isKeySource: true,
            },
          ],
        });
        createdFixtureIds.push(art.id);
        await transition(chief, art.id, "SUBMIT_REVIEW");
        await transition(chief, art.id, "START_FACT_CHECK");
        const detailRes = await get(`/api/cms/articles/${art.id}`, chief);
        const detail = (await detailRes.json()) as {
          sources?: { id: string }[];
          article?: { sources: { id: string }[] };
        };
        const sources = detail.sources ?? detail.article?.sources ?? [];
        await patchJson(
          `/api/cms/articles/${art.id}/sources/${sources[0].id}`,
          { verificationStatus: "VERIFIED", verificationNote: "Terverifikasi uji perjalanan pembaca." },
          chief,
        );
        await transition(chief, art.id, "SUBMIT_FOR_APPROVAL");
        const pub = await transition(chief, art.id, "PUBLISH");
        expect(pub.status).toBe(200);
      }
    }
  }, 30000);

  afterAll(async () => {
    if (createdFixtureIds.length > 0) {
      await cleanupTestData();
    }
    if (testServerProcess) {
      try {
        testServerProcess.kill();
      } catch {}
    }
  });

  // Persona A: Pembaca Baru
  it("Persona A: First-time reader lands on homepage, understands publication, and reads article", async () => {
    const homeRes = await fetch(`${BASE_URL}/`);
    expect(homeRes.status).toBe(200);
    const homeHtml = await homeRes.text();
    assertCleanHtml(homeHtml, "/");

    expect(homeHtml).toContain("VERAX PRESS");
    expect(homeHtml).toContain("Ex Fontibus Veritas");
    expect(homeHtml).toContain("Jurnalisme Digital Independen");
    expect(homeHtml).toContain("berbasis sumber primer");

    expect(homeHtml).toContain("/artikel/");
    const articleLinkMatch = homeHtml.match(/href="(\/artikel\/[^"]+)"/);
    expect(articleLinkMatch).not.toBeNull();
    const articlePath = articleLinkMatch![1];

    const articleRes = await fetch(`${BASE_URL}${articlePath}`);
    expect(articleRes.status).toBe(200);
    const articleHtml = await articleRes.text();
    assertCleanHtml(articleHtml, articlePath);
    expect(articleHtml).toContain("Sumber &amp; Verifikasi");
    expect(articleHtml).toContain("Hak Jawab &amp; Koreksi");
  });

  // Persona B: Pembaca Tertarik Topik Tertentu
  it("Persona B: Topic-focused reader browses rubric desk and navigates articles", async () => {
    const deskRes = await fetch(`${BASE_URL}/desk/hukum-keadilan`);
    expect(deskRes.status).toBe(200);
    const deskHtml = await deskRes.text();
    assertCleanHtml(deskHtml, "/desk/hukum-keadilan");

    expect(deskHtml).toContain("Hukum &amp; Keadilan");
    expect(deskHtml).toContain("Liputan Terkini");
    expect(deskHtml).toContain("/artikel/");
  });

  // Persona C: Orang yang Ingin Mengirim Tulisan
  it("Persona C: Prospective writer discovers submission path, reads guidelines, and accesses portal", async () => {
    const kirimRes = await fetch(`${BASE_URL}/kirim-tulisan`);
    expect(kirimRes.status).toBe(200);
    const kirimHtml = await kirimRes.text();
    assertCleanHtml(kirimHtml, "/kirim-tulisan");

    expect(kirimHtml).toContain("Opini &amp; Sudut Pandang");
    expect(kirimHtml).toContain("Analisis Mendalam");
    expect(kirimHtml).toContain("Artikel Penjelas (Explainer)");
    expect(kirimHtml).toContain("Verifikasi oleh Pemimpin Redaksi");
    expect(kirimHtml).toContain("Apakah Semua Tulisan Dijamin Terbit?");

    expect(kirimHtml).toContain("/kontributor/daftar");
    const daftarRes = await fetch(`${BASE_URL}/kontributor/daftar`);
    expect(daftarRes.status).toBe(200);
    const daftarHtml = await daftarRes.text();
    assertCleanHtml(daftarHtml, "/kontributor/daftar");
    expect(daftarHtml).toContain("Pengajuan Kontributor");

    expect(kirimHtml).toContain("/kontributor/login");
    const loginRes = await fetch(`${BASE_URL}/kontributor/login`);
    expect(loginRes.status).toBe(200);
    const loginHtml = await loginRes.text();
    assertCleanHtml(loginHtml, "/kontributor/login");
    expect(loginHtml).toContain("Portal Penulis Kontributor Eksternal");
    expect(loginHtml).not.toContain("/studio/login");
  });

  // Persona D: Orang yang Ingin Mengenal Kredibilitas Publikasi
  it("Persona D: Inquirer assesses institutional credibility, editorial standards, and contact", async () => {
    const tentangRes = await fetch(`${BASE_URL}/tentang`);
    expect(tentangRes.status).toBe(200);
    const tentangHtml = await tentangRes.text();
    assertCleanHtml(tentangHtml, "/tentang");
    expect(tentangHtml).toContain("Apa itu Verax Press");
    expect(tentangHtml).toContain("Ex Fontibus Veritas");
    expect(tentangHtml).toContain("Arya Rizky Ardhi Pratama");
    expect(tentangHtml).toContain("Pemimpin Redaksi");
    expect(tentangHtml).toContain("Identitas Redaksi");

    const standarRes = await fetch(`${BASE_URL}/standar-editorial`);
    expect(standarRes.status).toBe(200);
    const standarHtml = await standarRes.text();
    assertCleanHtml(standarHtml, "/standar-editorial");
    expect(standarHtml).toContain("Standar Editorial");
    expect(standarHtml).toContain("Verifikasi &amp; sumber");
    expect(standarHtml).toContain("Kebijakan AI");

    const kelembagaanRes = await fetch(`${BASE_URL}/informasi-kelembagaan`);
    expect(kelembagaanRes.status).toBe(200);
    const kelembagaanHtml = await kelembagaanRes.text();
    assertCleanHtml(kelembagaanHtml, "/informasi-kelembagaan");
    expect(kelembagaanHtml).toContain("Informasi Kelembagaan");
    expect(kelembagaanHtml).toContain("Status Badan Hukum Pers");
    expect(kelembagaanHtml).toContain("Verifikasi Dewan Pers");
    expect(kelembagaanHtml.toLowerCase()).not.toContain("ekosistem");

    const kontakRes = await fetch(`${BASE_URL}/kontak`);
    expect(kontakRes.status).toBe(200);
    const kontakHtml = await kontakRes.text();
    assertCleanHtml(kontakHtml, "/kontak");
    expect(kontakHtml).toContain("Hubungi Redaksi Verax Press");
    expect(kontakHtml).toContain("/keluhan");
    expect(kontakHtml).not.toContain("redaksi@veraxpress.id");
    expect(kontakHtml).not.toContain("Jakarta, Indonesia");
  });

  // Persona E: Orang yang Menemukan Kesalahan Artikel
  it("Persona E: Reader encountering an error reports correction and inspects public correction log", async () => {
    const keluhanRes = await fetch(`${BASE_URL}/keluhan`);
    expect(keluhanRes.status).toBe(200);
    const keluhanHtml = await keluhanRes.text();
    assertCleanHtml(keluhanHtml, "/keluhan");
    expect(keluhanHtml).toContain("Hak Jawab");
    expect(keluhanHtml).toContain("Hak Koreksi");
    expect(keluhanHtml).toContain("Keluhan Editorial");
    expect(keluhanHtml).toContain("Prosedur Penanganan");

    const koreksiRes = await fetch(`${BASE_URL}/koreksi`);
    expect(koreksiRes.status).toBe(200);
    const koreksiHtml = await koreksiRes.text();
    assertCleanHtml(koreksiHtml, "/koreksi");
    expect(koreksiHtml).toContain("Log Koreksi");
    expect(koreksiHtml).toContain("Akuntabilitas Redaksi");
  });

  // Persona F: Navigasi Warisan, Halaman Hukum, SEO, dan Validasi Keamanan Input
  it("Persona F: Legacy redirects, legal pages, SEO policies, and unsafe URL rejection work properly", async () => {
    const redirects: Array<[string, string, number[]]> = [
      ["/cms", "/studio", [307, 308]],
      ["/kebijakan-redaksi", "/standar-editorial", [308]],
      ["/kontributor/panduan", "/pedoman-kontributor", [308]],
      ["/articles/uji-tautan-lama", "/artikel/uji-tautan-lama", [308]],
    ];
    for (const [fromPath, expectedSuffix, expectedStatuses] of redirects) {
      const res = await fetch(`${BASE_URL}${fromPath}`, { redirect: "manual" });
      expect(expectedStatuses, `${fromPath} redirect status`).toContain(res.status);
      const location = res.headers.get("location") ?? "";
      expect(location.endsWith(expectedSuffix), `${fromPath} -> ${location}`).toBe(true);
    }

    for (const route of [
      "/opini",
      "/kebijakan-ai",
      "/pedoman-kontributor",
      "/kebijakan-privasi",
      "/syarat-ketentuan",
      "/developers",
    ]) {
      const res = await fetch(`${BASE_URL}${route}`);
      expect(res.status, `${route} status`).toBe(200);
      const html = await res.text();
      assertCleanHtml(html, route);
    }

    const robotsRes = await fetch(`${BASE_URL}/robots.txt`);
    expect(robotsRes.status).toBe(200);
    const robotsTxt = await robotsRes.text();
    expect(robotsTxt).toContain("User-agent: *");
    expect(robotsTxt).toContain("Allow: /");
    expect(robotsTxt).toContain("Disallow: /api/");
    expect(robotsTxt).toContain("Sitemap: https://veraxpress.vercel.app/sitemap.xml");
    // Studio dan portal harus dapat dirayapi agar instruksi noindex terbaca, bukan diblokir robots.txt
    expect(robotsTxt).not.toContain("Disallow: /studio");
    expect(robotsTxt).not.toContain("Disallow: /cms");
    expect(robotsTxt).not.toContain("Disallow: /kontributor");

    for (const noindexRoute of ["/studio/login", "/cms", "/kontributor/login", "/kontributor/daftar"]) {
      const res = await fetch(`${BASE_URL}${noindexRoute}`, { redirect: "manual" });
      const xRobots = res.headers.get("x-robots-tag") ?? "";
      expect(xRobots.toLowerCase(), `${noindexRoute} X-Robots-Tag`).toContain("noindex");
    }

    const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`);
    expect(sitemapRes.status).toBe(200);
    const sitemapXml = await sitemapRes.text();
    expect(sitemapXml).toContain("https://veraxpress.vercel.app/kirim-tulisan");
    expect(sitemapXml).toContain("https://veraxpress.vercel.app/standar-editorial");
    expect(sitemapXml).toContain("https://veraxpress.vercel.app/opini");

    const badApplyRes = await fetch(`${BASE_URL}/api/public/contributor/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Uji Sanitasi URL",
        email: "sanitize.check@example.test",
        portfolioUrl: "javascript:alert(1)",
        adultConfirmed: true,
        guidelinesAccepted: true,
      }),
    });
    expect(badApplyRes.status).toBe(422);
  });
});

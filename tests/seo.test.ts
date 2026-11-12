// Test suite SEO teknis & kebijakan indexing Verax Press.
// Menguji fungsi murni (domain kanonik, redirect host, JSON-LD, tanggal SEO)
// serta perilaku HTTP aktual pada server terisolasi (robots.txt, sitemap.xml,
// X-Robots-Tag, meta canonical/OG/Twitter, JSON-LD, paginasi, profil penulis, dan favicon).
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { spawn, execSync, type ChildProcess } from "node:child_process";
import {
  CANONICAL_PUBLIC_ORIGIN,
  NON_CANONICAL_PRODUCTION_HOSTS,
  getCanonicalBaseUrl,
  normalizeHostname,
  resolveCanonicalRedirectTarget,
  resolveXRobotsTag,
} from "@/lib/seo/constants";
import {
  buildArticleJsonLd,
  getArticleSeoDates,
  sanitizeJsonLd,
} from "@/lib/seo/structured-data";
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
  createArticle,
  get,
  loginAs,
  patchJson,
  postJson,
  transition,
  type TestClient,
} from "./lib/http";

let testServerProcess: ChildProcess | null = null;
let chief: TestClient;

interface CreatedFixtureState {
  publishedSlug: string;
  correctedSlug: string;
  retractedSlug: string;
  draftSlug: string;
  namedPersonId: string;
  anonPersonId: string;
  zeroWorkPersonId: string;
  createdPersonIds: string[];
}

let fixtures: CreatedFixtureState;

function extractCanonical(html: string): string | null {
  const match =
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) ??
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  return match ? match[1] : null;
}

function extractMetaContent(html: string, attrName: string, attrValue: string): string | null {
  const re1 = new RegExp(
    `<meta[^>]+${attrName}=["']${attrValue}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+${attrName}=["']${attrValue}["']`,
    "i",
  );
  const m = html.match(re1) ?? html.match(re2);
  return m ? m[1] : null;
}

function extractJsonLdPayloads(html: string): Array<Record<string, unknown>> {
  const payloads: Array<Record<string, unknown>> = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const raw = match[1].trim();
    if (!raw) continue;
    payloads.push(JSON.parse(raw) as Record<string, unknown>);
  }
  return payloads;
}

describe("SEO Unit Rules", () => {
  test("normalizeHostname strips ports, lowercases, and picks first forwarded host", () => {
    expect(normalizeHostname("Verax-Press.Vercel.App:443")).toBe("verax-press.vercel.app");
    expect(normalizeHostname("vrxp.vercel.app, proxy.internal")).toBe("vrxp.vercel.app");
    expect(normalizeHostname("[::1]:3000")).toBe("[::1]");
    expect(normalizeHostname("")).toBeNull();
    expect(normalizeHostname(undefined)).toBeNull();
  });

  test("resolveCanonicalRedirectTarget 308-redirects all configured production aliases without open redirect", () => {
    for (const alias of NON_CANONICAL_PRODUCTION_HOSTS) {
      const target = resolveCanonicalRedirectTarget({
        forwardedHostHeader: alias,
        hostHeader: "localhost:3000",
        pathname: "/artikel/contoh",
        search: "?page=2",
      });
      expect(target).toBe(`${CANONICAL_PUBLIC_ORIGIN}/artikel/contoh?page=2`);
    }

    expect(
      resolveCanonicalRedirectTarget({
        forwardedHostHeader: "verax-press.vercel.app",
        hostHeader: "verax-press.vercel.app",
        pathname: "//evil.example/path",
        search: "",
      }),
    ).toBe(`${CANONICAL_PUBLIC_ORIGIN}/evil.example/path`);

    expect(
      resolveCanonicalRedirectTarget({
        forwardedHostHeader: "veraxpress.vercel.app",
        hostHeader: "veraxpress.vercel.app",
        pathname: "/",
      }),
    ).toBeNull();

    expect(
      resolveCanonicalRedirectTarget({
        forwardedHostHeader: "localhost:3000",
        hostHeader: "localhost:3000",
        pathname: "/",
      }),
    ).toBeNull();

    expect(
      resolveCanonicalRedirectTarget({
        forwardedHostHeader: "evil.example.com",
        hostHeader: "evil.example.com",
        pathname: "/phishing",
      }),
    ).toBeNull();
  });

  test("getCanonicalBaseUrl refuses localhost, preview, and alias overrides", () => {
    const prevCanon = process.env.VERAX_CANONICAL_URL;
    const prevPub = process.env.VERAX_PUBLIC_BASE_URL;
    const prevNext = process.env.NEXT_PUBLIC_SITE_URL;
    try {
      process.env.VERAX_CANONICAL_URL = "http://localhost:3000";
      process.env.VERAX_PUBLIC_BASE_URL = "https://verax-press.vercel.app";
      process.env.NEXT_PUBLIC_SITE_URL = "https://veraxpress-git-main-arya-rizkys-projects.vercel.app";
      expect(getCanonicalBaseUrl()).toBe(CANONICAL_PUBLIC_ORIGIN);
    } finally {
      if (prevCanon === undefined) delete process.env.VERAX_CANONICAL_URL;
      else process.env.VERAX_CANONICAL_URL = prevCanon;
      if (prevPub === undefined) delete process.env.VERAX_PUBLIC_BASE_URL;
      else process.env.VERAX_PUBLIC_BASE_URL = prevPub;
      if (prevNext === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = prevNext;
    }
  });

  test("getArticleSeoDates keeps modifiedAt null on untouched PUBLISHED articles", () => {
    const publishedAt = new Date("2026-10-01T08:00:00.000Z");
    const staleUpdatedAt = new Date("2026-11-10T10:00:00.000Z");
    const untouched = getArticleSeoDates({
      status: "PUBLISHED",
      firstPublishedAt: publishedAt,
      publishedAt,
      updatedAt: staleUpdatedAt,
      corrections: [],
    });
    expect(untouched.publishedAt?.toISOString()).toBe(publishedAt.toISOString());
    expect(untouched.modifiedAt).toBeNull();
    expect(untouched.sitemapLastMod?.toISOString()).toBe(publishedAt.toISOString());

    const correctedAt = new Date("2026-11-11T09:30:00.000Z");
    const corrected = getArticleSeoDates({
      status: "CORRECTED",
      firstPublishedAt: publishedAt,
      publishedAt,
      updatedAt: staleUpdatedAt,
      corrections: [{ correctedAt }],
    });
    expect(corrected.modifiedAt?.toISOString()).toBe(correctedAt.toISOString());
    expect(corrected.sitemapLastMod?.toISOString()).toBe(correctedAt.toISOString());
  });

  test("sanitizeJsonLd neutralizes script-breakout payloads and preserves valid JSON", () => {
    const raw = sanitizeJsonLd({ headline: "</script><script>alert(1)&" });
    expect(raw).not.toContain("</script>");
    expect(raw).not.toContain("<");
    expect(raw).not.toContain(">");
    expect(raw).not.toContain("&");
    const parsed = JSON.parse(raw) as { headline: string };
    expect(parsed.headline).toBe("</script><script>alert(1)&");
  });

  test("buildArticleJsonLd assigns Person, Anonim, or NewsMediaOrganization accurately and drops SVGs", () => {
    const opinion = buildArticleJsonLd({
      baseUrl: CANONICAL_PUBLIC_ORIGIN,
      slug: "opini-uji",
      title: "Judul Opini",
      format: "OPINION",
      byline: "Ratna Uji",
      publishedAt: new Date("2026-11-01T00:00:00.000Z"),
      modifiedAt: null,
      deskName: "Hukum & Keadilan",
      authorCredits: [
        { id: "p_1", publicName: "Ratna Uji", role: "AUTHOR", anonymityMode: "REAL_NAME" },
      ],
      imageUrls: ["/images/diagram.svg", "/brand/verax-press-og.png"],
    });
    expect(opinion["@type"]).toBe("Article");
    expect(opinion.dateModified).toBeUndefined();
    expect(opinion.image).toEqual([`${CANONICAL_PUBLIC_ORIGIN}/brand/verax-press-og.png`]);
    expect(JSON.stringify(opinion.author)).toContain(`${CANONICAL_PUBLIC_ORIGIN}/penulis/p_1`);

    const collective = buildArticleJsonLd({
      baseUrl: CANONICAL_PUBLIC_ORIGIN,
      slug: "berita-redaksi",
      title: "Berita Redaksi",
      format: "NEWS",
      byline: "Redaksi Verax Press",
      publishedAt: new Date("2026-11-01T00:00:00.000Z"),
      modifiedAt: null,
      deskName: "Hukum & Keadilan",
      authorCredits: [],
    });
    expect(collective["@type"]).toBe("NewsArticle");
    expect((collective.author as { "@type": string; name: string }).name).toBe("Verax Press");

    const anon = buildArticleJsonLd({
      baseUrl: CANONICAL_PUBLIC_ORIGIN,
      slug: "berita-anon",
      title: "Berita Anonim",
      format: "NEWS",
      byline: "Anonim",
      publishedAt: new Date("2026-11-01T00:00:00.000Z"),
      modifiedAt: null,
      deskName: "Hukum & Keadilan",
      authorCredits: [
        { id: "p_anon", publicName: "Rahasia", role: "AUTHOR", anonymityMode: "ANON" },
      ],
    });
    expect((anon.author as { "@type": string; name: string }).name).toBe("Anonim");
    expect(JSON.stringify(anon.author)).not.toContain("/penulis/");
  });

  test("resolveXRobotsTag applies strict headers on internal, portal, API, and machine endpoints", () => {
    expect(resolveXRobotsTag("/studio")).toBe("noindex, nofollow");
    expect(resolveXRobotsTag("/studio/login")).toBe("noindex, nofollow");
    expect(resolveXRobotsTag("/cms")).toBe("noindex, nofollow");
    expect(resolveXRobotsTag("/kontributor/portal")).toBe("noindex, nofollow");
    expect(resolveXRobotsTag("/kontributor/login")).toBe("noindex, nofollow");
    expect(resolveXRobotsTag("/kontributor/aktivasi/tok123")).toBe("noindex, nofollow");
    expect(resolveXRobotsTag("/kontributor/daftar")).toBe("noindex, follow");
    expect(resolveXRobotsTag("/api/public/desks")).toBe("noindex, nofollow");
    expect(resolveXRobotsTag("/openapi.json")).toBe("noindex, nofollow");
    expect(resolveXRobotsTag("/llms.txt")).toBe("noindex, nofollow");
    expect(resolveXRobotsTag("/llms-full.txt")).toBe("noindex, nofollow");
    expect(resolveXRobotsTag("/.well-known/verax-agent.json")).toBe("noindex, nofollow");
    expect(resolveXRobotsTag("/")).toBeNull();
    expect(resolveXRobotsTag("/artikel/test")).toBeNull();
  });
});

describe("SEO & Indexing HTTP Integration", () => {
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

    await cleanupTestData();
    await seedTestFixtures();
    chief = await loginAs("chief");

    const db = getTestDb();
    const suffix = Date.now().toString(36);
    const namedPerson = await db.person.create({
      data: {
        accountType: "BYLINE_ONLY",
        publicName: `Penulis SEO Uji ${suffix}`,
        anonymityMode: "REAL_NAME",
        bio: "Peneliti kebijakan publik untuk pengujian SEO.",
      },
    });
    const anonPerson = await db.person.create({
      data: {
        accountType: "BYLINE_ONLY",
        publicName: `Identitas Terlindung ${suffix}`,
        anonymityMode: "ANONYMOUS",
      },
    });
    const zeroWorkPerson = await db.person.create({
      data: {
        accountType: "BYLINE_ONLY",
        publicName: `Editor Tanpa Karya ${suffix}`,
        anonymityMode: "REAL_NAME",
      },
    });

    async function publishFixture(opts: {
      title: string;
      format: "NEWS" | "OPINION";
      byline: string;
      personId: string;
    }) {
      const art = await createArticle(chief, {
        title: opts.title,
        deskSlug: "hukum-keadilan",
        format: opts.format,
        byline: opts.byline,
        sources: [
          {
            title: "Dokumen Primer SEO",
            url: "https://example.com/seo-primer",
            sourceType: "OFFICIAL",
            isKeySource: true,
          },
        ],
      });
      await db.articleContribution.deleteMany({ where: { articleId: art.id } });
      await db.articleContribution.create({
        data: {
          articleId: art.id,
          personId: opts.personId,
          role: "AUTHOR",
          publicCredit: true,
          displayOrder: 1,
        },
      });
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
        { verificationStatus: "VERIFIED", verificationNote: "Terverifikasi uji SEO." },
        chief,
      );
      await transition(chief, art.id, "SUBMIT_FOR_APPROVAL");
      const pubRes = await transition(chief, art.id, "PUBLISH");
      expect(pubRes.status).toBe(200);
      return art;
    }

    const publishedArt = await publishFixture({
      title: `Test Article SEO Published ${suffix}`,
      format: "NEWS",
      byline: namedPerson.publicName,
      personId: namedPerson.id,
    });

    const correctedArt = await publishFixture({
      title: `Test Article SEO Corrected ${suffix}`,
      format: "OPINION",
      byline: "Anonim",
      personId: anonPerson.id,
    });
    const corrRes = await postJson(
      "/api/cms/corrections",
      {
        articleId: correctedArt.id,
        summary: "Koreksi angka anggaran uji SEO",
        publicNote: "Angka diperbarui berdasarkan dokumen resmi pengawasan.",
      },
      chief,
    );
    expect(corrRes.status).toBe(201);

    const retractedArt = await publishFixture({
      title: `Test Article SEO Retracted ${suffix}`,
      format: "NEWS",
      byline: namedPerson.publicName,
      personId: namedPerson.id,
    });
    const retRes = await transition(
      chief,
      retractedArt.id,
      "RETRACT",
      "Ditarik untuk pengujian metadata noindex.",
    );
    expect(retRes.status).toBe(200);

    const draftArt = await createArticle(chief, {
      title: `Test Article SEO Draft ${suffix}`,
      deskSlug: "hukum-keadilan",
      format: "ANALYSIS",
    });

    fixtures = {
      publishedSlug: publishedArt.slug,
      correctedSlug: correctedArt.slug,
      retractedSlug: retractedArt.slug,
      draftSlug: draftArt.slug,
      namedPersonId: namedPerson.id,
      anonPersonId: anonPerson.id,
      zeroWorkPersonId: zeroWorkPerson.id,
      createdPersonIds: [namedPerson.id, anonPerson.id, zeroWorkPerson.id],
    };
  }, 30000);

  afterAll(async () => {
    const db = getTestDb();
    await cleanupTestData();
    if (fixtures?.createdPersonIds?.length) {
      await db.person.deleteMany({
        where: { id: { in: fixtures.createdPersonIds } },
      });
    }
    if (testServerProcess) {
      try {
        testServerProcess.kill();
      } catch {}
    }
  });

  test("GET /robots.txt uses single User-agent, disallows only /api/, and points to canonical sitemap", async () => {
    const res = await fetch(`${BASE}/robots.txt`);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("User-agent: *");
    expect(body).toContain("Allow: /");
    expect(body).toContain("Disallow: /api/");
    expect(body).toContain(`Sitemap: ${CANONICAL_PUBLIC_ORIGIN}/sitemap.xml`);
    expect(body).not.toContain("Disallow: /studio");
    expect(body).not.toContain("Disallow: /cms");
    expect(body).not.toContain("Disallow: /kontributor");
  });

  test("GET /sitemap.xml includes only canonical indexable public URLs with honest dates", async () => {
    const nowPlusBuffer = Date.now() + 10_000;
    const res = await fetch(`${BASE}/sitemap.xml`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") ?? "").toContain("xml");
    const xml = await res.text();

    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs.length).toBeGreaterThan(10);
    for (const loc of locs) {
      expect(loc.startsWith(CANONICAL_PUBLIC_ORIGIN)).toBe(true);
    }

    expect(locs).toContain(`${CANONICAL_PUBLIC_ORIGIN}/`);
    expect(locs).toContain(`${CANONICAL_PUBLIC_ORIGIN}/opini`);
    expect(locs).toContain(`${CANONICAL_PUBLIC_ORIGIN}/tentang`);
    expect(locs).toContain(`${CANONICAL_PUBLIC_ORIGIN}/standar-editorial`);
    expect(locs).toContain(`${CANONICAL_PUBLIC_ORIGIN}/desk/hukum-keadilan`);
    expect(locs).toContain(`${CANONICAL_PUBLIC_ORIGIN}/artikel/${fixtures.publishedSlug}`);
    expect(locs).toContain(`${CANONICAL_PUBLIC_ORIGIN}/artikel/${fixtures.correctedSlug}`);
    expect(locs).toContain(`${CANONICAL_PUBLIC_ORIGIN}/penulis/${fixtures.namedPersonId}`);

    expect(locs).not.toContain(`${CANONICAL_PUBLIC_ORIGIN}/artikel/${fixtures.retractedSlug}`);
    expect(locs).not.toContain(`${CANONICAL_PUBLIC_ORIGIN}/artikel/${fixtures.draftSlug}`);
    expect(locs).not.toContain(`${CANONICAL_PUBLIC_ORIGIN}/penulis/${fixtures.anonPersonId}`);
    expect(locs).not.toContain(`${CANONICAL_PUBLIC_ORIGIN}/penulis/${fixtures.zeroWorkPersonId}`);

    expect(xml).not.toContain("/studio");
    expect(xml).not.toContain("/cms");
    expect(xml).not.toContain("/kontributor/");
    expect(xml).not.toContain("/api/");
    expect(xml).not.toContain("/openapi.json");
    expect(xml).not.toContain("/llms");

    const lastMods = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) =>
      Date.parse(m[1]),
    );
    for (const ts of lastMods) {
      expect(Number.isNaN(ts)).toBe(false);
      expect(ts).toBeLessThanOrEqual(nowPlusBuffer);
    }
  });

  test("Alias production host headers trigger 308 redirect to https://veraxpress.vercel.app", async () => {
    const aliasHostRes = await fetch(`${BASE}/tentang`, {
      headers: { Host: "verax-press.vercel.app" },
      redirect: "manual",
    });
    expect(aliasHostRes.status).toBe(308);
    expect(aliasHostRes.headers.get("location")).toBe(`${CANONICAL_PUBLIC_ORIGIN}/tentang`);

    const forwardedAliasRes = await fetch(`${BASE}/artikel/${fixtures.publishedSlug}?ref=nav`, {
      headers: { "X-Forwarded-Host": "vrxp.vercel.app" },
      redirect: "manual",
    });
    expect(forwardedAliasRes.status).toBe(308);
    expect(forwardedAliasRes.headers.get("location")).toBe(
      `${CANONICAL_PUBLIC_ORIGIN}/artikel/${fixtures.publishedSlug}?ref=nav`,
    );

    const unknownHostRes = await fetch(`${BASE}/tentang`, {
      headers: { "X-Forwarded-Host": "evil.example.com" },
      redirect: "manual",
    });
    expect(unknownHostRes.status).toBe(200);

    const legacyRoutes: Array<[string, string]> = [
      ["/articles/uji-kanonik", "/artikel/uji-kanonik"],
      ["/kebijakan-redaksi", "/standar-editorial"],
      ["/kontributor/panduan", "/pedoman-kontributor"],
    ];
    for (const [fromPath, expectedSuffix] of legacyRoutes) {
      const legacyRes = await fetch(`${BASE}${fromPath}`, { redirect: "manual" });
      expect(legacyRes.status, `${fromPath} redirect status`).toBe(308);
      expect((legacyRes.headers.get("location") ?? "").endsWith(expectedSuffix)).toBe(true);
    }
  });

  test("Internal, contributor, API, and machine endpoints enforce noindex via X-Robots-Tag and meta", async () => {
    const strictRoutes = [
      "/studio/login",
      "/kontributor/login",
      "/kontributor/aktivasi/tokentest",
      "/openapi.json",
      "/llms.txt",
      "/llms-full.txt",
      "/.well-known/verax-agent.json",
      "/api/public/desks",
    ];
    for (const route of strictRoutes) {
      const res = await fetch(`${BASE}${route}`, { redirect: "manual" });
      expect(res.headers.get("x-robots-tag"), `${route} header`).toBe("noindex, nofollow");
    }

    const studioLoginHtml = await (await fetch(`${BASE}/studio/login`)).text();
    expect(extractMetaContent(studioLoginHtml, "name", "robots")).toContain("noindex");
    expect(extractMetaContent(studioLoginHtml, "name", "robots")).toContain("nofollow");

    const daftarRes = await fetch(`${BASE}/kontributor/daftar`);
    expect(daftarRes.headers.get("x-robots-tag")).toBe("noindex, follow");
    const daftarHtml = await daftarRes.text();
    const daftarRobots = extractMetaContent(daftarHtml, "name", "robots") ?? "";
    expect(daftarRobots).toContain("noindex");
    expect(daftarRobots).toContain("follow");
    expect(extractCanonical(daftarHtml)).toBe(`${CANONICAL_PUBLIC_ORIGIN}/kontributor/daftar`);

    const cmsRes = await fetch(`${BASE}/cms`, { redirect: "manual" });
    expect(cmsRes.status).toBe(307);
    expect(cmsRes.headers.get("x-robots-tag") ?? "").toContain("noindex");

    const studioGuardRes = await fetch(`${BASE}/studio`, { redirect: "manual" });
    expect(studioGuardRes.status).toBe(307);
    expect(studioGuardRes.headers.get("x-robots-tag")).toBe("noindex, nofollow");

    const portalGuardRes = await fetch(`${BASE}/kontributor/portal`, { redirect: "manual" });
    expect(portalGuardRes.status).toBe(307);
    expect(portalGuardRes.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  test("Homepage renders h1, canonical, OG/Twitter tags, and NewsMediaOrganization JSON-LD", async () => {
    const res = await fetch(`${BASE}/`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toMatch(/<h1[\s>]/i);
    const canonical = extractCanonical(html);
    expect(canonical === CANONICAL_PUBLIC_ORIGIN || canonical === `${CANONICAL_PUBLIC_ORIGIN}/`).toBe(
      true,
    );
    expect(extractMetaContent(html, "property", "og:image")).toBe(
      `${CANONICAL_PUBLIC_ORIGIN}/brand/verax-press-og.png`,
    );
    expect(extractMetaContent(html, "name", "twitter:card")).toBe("summary_large_image");

    const jsonLds = extractJsonLdPayloads(html);
    const graphNode = jsonLds.find((p) => Array.isArray(p["@graph"]));
    expect(graphNode).toBeDefined();
    const graph = graphNode!["@graph"] as Array<Record<string, unknown>>;
    expect(graph.some((n) => n["@type"] === "NewsMediaOrganization")).toBe(true);
    expect(graph.some((n) => n["@type"] === "WebSite")).toBe(true);
  });

  test("Article metadata and JSON-LD distinguish PUBLISHED, CORRECTED, RETRACTED, and DRAFT accurately", async () => {
    // 1. PUBLISHED (untouched) -> no modifiedTime / dateModified, linked Person credit
    const pubRes = await fetch(`${BASE}/artikel/${fixtures.publishedSlug}`);
    expect(pubRes.status).toBe(200);
    const pubHtml = await pubRes.text();
    expect(extractCanonical(pubHtml)).toBe(
      `${CANONICAL_PUBLIC_ORIGIN}/artikel/${fixtures.publishedSlug}`,
    );
    expect(extractMetaContent(pubHtml, "property", "article:published_time")).toBeTruthy();
    expect(extractMetaContent(pubHtml, "property", "article:modified_time")).toBeNull();
    expect(pubHtml).toContain(`/penulis/${fixtures.namedPersonId}`);

    const pubSchemas = extractJsonLdPayloads(pubHtml);
    const newsSchema = pubSchemas.find((s) => s["@type"] === "NewsArticle");
    expect(newsSchema).toBeDefined();
    expect(newsSchema!.datePublished).toBeTruthy();
    expect(newsSchema!.dateModified).toBeUndefined();
    expect(pubSchemas.some((s) => s["@type"] === "BreadcrumbList")).toBe(true);

    // 2. CORRECTED -> modifiedTime & dateModified present, anonymous credit NOT linked to profile
    const corRes = await fetch(`${BASE}/artikel/${fixtures.correctedSlug}`);
    expect(corRes.status).toBe(200);
    const corHtml = await corRes.text();
    expect(extractMetaContent(corHtml, "property", "article:modified_time")).toBeTruthy();
    expect(corHtml).not.toContain(`/penulis/${fixtures.anonPersonId}`);
    const corSchemas = extractJsonLdPayloads(corHtml);
    const articleSchema = corSchemas.find((s) => s["@type"] === "Article");
    expect(articleSchema).toBeDefined();
    expect(articleSchema!.dateModified).toBeTruthy();

    // 3. RETRACTED -> 200 with banner and noindex, follow
    const retRes = await fetch(`${BASE}/artikel/${fixtures.retractedSlug}`);
    expect(retRes.status).toBe(200);
    const retHtml = await retRes.text();
    const retRobots = extractMetaContent(retHtml, "name", "robots") ?? "";
    expect(retRobots).toContain("noindex");
    expect(retRobots).toContain("follow");

    // 4. DRAFT -> 404
    const draftRes = await fetch(`${BASE}/artikel/${fixtures.draftSlug}`);
    expect(draftRes.status).toBe(404);
  });

  test("Author profiles honor anonymity protection and zero-work noindex rules", async () => {
    const anonRes = await fetch(`${BASE}/penulis/${fixtures.anonPersonId}`);
    expect(anonRes.status).toBe(404);

    const namedRes = await fetch(`${BASE}/penulis/${fixtures.namedPersonId}`);
    expect(namedRes.status).toBe(200);
    const namedHtml = await namedRes.text();
    expect(extractCanonical(namedHtml)).toBe(
      `${CANONICAL_PUBLIC_ORIGIN}/penulis/${fixtures.namedPersonId}`,
    );
    const namedRobots = extractMetaContent(namedHtml, "name", "robots") ?? "";
    expect(namedRobots).toContain("index");
    expect(namedRobots).not.toContain("noindex");
    const namedSchemas = extractJsonLdPayloads(namedHtml);
    expect(namedSchemas.some((s) => s["@type"] === "ProfilePage")).toBe(true);
    expect(namedSchemas.some((s) => s["@type"] === "BreadcrumbList")).toBe(true);

    const zeroRes = await fetch(`${BASE}/penulis/${fixtures.zeroWorkPersonId}`);
    expect(zeroRes.status).toBe(200);
    const zeroHtml = await zeroRes.text();
    const zeroRobots = extractMetaContent(zeroHtml, "name", "robots") ?? "";
    expect(zeroRobots).toContain("noindex");
    expect(zeroRobots).toContain("follow");
  });

  test("Desk/opinion pagination validates page bounds and institutional routes emit canonical + breadcrumbs", async () => {
    for (const badUrl of [
      "/desk/hukum-keadilan?page=abc",
      "/desk/hukum-keadilan?page=0",
      "/desk/hukum-keadilan?page=999",
      "/opini?page=abc",
      "/opini?page=999",
    ]) {
      const res = await fetch(`${BASE}${badUrl}`);
      expect(res.status, badUrl).toBe(404);
    }

    const staticPublicRoutes = [
      "/tentang",
      "/standar-editorial",
      "/kebijakan-ai",
      "/kirim-tulisan",
      "/pedoman-kontributor",
      "/koreksi",
      "/keluhan",
      "/informasi-kelembagaan",
      "/kebijakan-privasi",
      "/syarat-ketentuan",
      "/kontak",
      "/developers",
      "/opini",
      "/desk/hukum-keadilan",
    ];
    for (const route of staticPublicRoutes) {
      const res = await fetch(`${BASE}${route}`);
      expect(res.status, `${route} status`).toBe(200);
      const html = await res.text();
      expect(extractCanonical(html), `${route} canonical`).toBe(`${CANONICAL_PUBLIC_ORIGIN}${route}`);
      expect(html, `${route} breadcrumb nav`).toContain('aria-label="Breadcrumb"');
      const schemas = extractJsonLdPayloads(html);
      expect(schemas.some((s) => s["@type"] === "BreadcrumbList"), `${route} BreadcrumbList`).toBe(
        true,
      );
    }
  });

  test("Favicon and brand OG/Logo static assets return 200 OK", async () => {
    for (const asset of [
      "/favicon.ico",
      "/icon.png",
      "/icon.svg",
      "/apple-icon.png",
      "/brand/verax-press-logo.png",
      "/brand/verax-press-og.png",
    ]) {
      const res = await fetch(`${BASE}${asset}`);
      expect(res.status, asset).toBe(200);
      const buf = await res.arrayBuffer();
      expect(buf.byteLength, `${asset} byteLength`).toBeGreaterThan(100);
    }
  });
});

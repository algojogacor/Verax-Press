// Test suite otomatis untuk verifikasi metadata penemuan (Discovery Metadata)
// dan dokumentasi Verax Editorial Intelligence (VEI).
// Menguji /openapi.json, /.well-known/verax-agent.json, /llms.txt, /llms-full.txt,
// dan /api/internal/v1/capabilities agar AI agent eksternal dapat menemukan dan
// memanggil endpoint coverage tanpa instruksi manual dari luar sistem.

import { test, describe, expect } from "bun:test";
import {
  getOpenApiSpec,
  getWellKnownAgentMetadata,
  getLlmsTxt,
  getLlmsFullTxt,
} from "@/lib/domain/api-docs";
import { GET as coreGet, HEAD as coreHead } from "@/app/editorial/core/route";
import { GET as contextGet, HEAD as contextHead } from "@/app/editorial/context/route";
import {
  GET as vaesJsonGet,
  HEAD as vaesJsonHead,
  POST as vaesJsonPost,
  PUT as vaesJsonPut,
  PATCH as vaesJsonPatch,
  DELETE as vaesJsonDelete,
} from "@/app/editorial/vaes.json/route";
import {
  GET as vaesGet,
  HEAD as vaesHead,
  POST as vaesPost,
  PUT as vaesPut,
  PATCH as vaesPatch,
  DELETE as vaesDelete,
} from "@/app/editorial/vaes/route";
import { GET as operationGet } from "@/app/editorial/operations/[slug]/route";

describe("Verax Editorial Intelligence (VEI) Discovery Metadata & Documentation Suite", () => {
  const dummyBase = "https://veraxpress.vercel.app";

  test("1. OpenAPI 3.1.0 mendokumentasikan rute coverage search & check secara lengkap", () => {
    const spec = getOpenApiSpec(dummyBase) as {
      openapi: string;
      paths: Record<string, any>;
      components: {
        securitySchemes: Record<string, any>;
        schemas: Record<string, any>;
      };
    };

    expect(spec.openapi).toBe("3.1.0");

    // A. Security Schemes
    expect(spec.components.securitySchemes.bearerAuth).toBeDefined();
    expect(spec.components.securitySchemes.coverageApiKeyBearer).toBeDefined();
    expect(spec.components.securitySchemes.coverageApiKeyHeader).toBeDefined();
    expect(spec.components.securitySchemes.coverageApiKeyHeader.in).toBe("header");
    expect(spec.components.securitySchemes.coverageApiKeyHeader.name).toBe("X-API-Key");

    // B. Schemas
    expect(spec.components.schemas.CoverageSearchResponse).toBeDefined();
    expect(spec.components.schemas.CoverageArticleItem).toBeDefined();
    expect(spec.components.schemas.CoverageSearchPagination).toBeDefined();
    expect(spec.components.schemas.CoverageCheckRequest).toBeDefined();
    expect(spec.components.schemas.CoverageCheckResponse).toBeDefined();
    expect(spec.components.schemas.CoverageMatchItem).toBeDefined();

    // C. GET /api/internal/v1/editorial/coverage/search
    const searchPath = spec.paths["/api/internal/v1/editorial/coverage/search"];
    expect(searchPath).toBeDefined();
    expect(searchPath.get).toBeDefined();
    expect(searchPath.head).toBeDefined();
    expect(searchPath.get.security).toBeDefined();

    const searchParams = searchPath.get.parameters as Array<{ name: string; in: string }>;
    const paramNames = searchParams.map((p) => p.name);
    expect(paramNames).toContain("q");
    expect(paramNames).toContain("desk");
    expect(paramNames).toContain("from");
    expect(paramNames).toContain("to");
    expect(paramNames).toContain("limit");
    expect(paramNames).toContain("cursor");

    expect(searchPath.get.responses["200"]).toBeDefined();
    expect(searchPath.get.responses["400"]).toBeDefined();
    expect(searchPath.get.responses["401"]).toBeDefined();
    expect(searchPath.get.responses["403"]).toBeDefined();

    // D. POST /api/internal/v1/editorial/coverage/check
    const checkPath = spec.paths["/api/internal/v1/editorial/coverage/check"];
    expect(checkPath).toBeDefined();
    expect(checkPath.post).toBeDefined();
    expect(checkPath.post.security).toBeDefined();
    expect(checkPath.post.requestBody).toBeDefined();
    expect(checkPath.post.responses["200"]).toBeDefined();
    expect(checkPath.post.responses["400"]).toBeDefined();
    expect(checkPath.post.responses["401"]).toBeDefined();
    // E. Schema IngestionPayload: Bidang Gambar Berlisensi & Foto Stok
    const ingestionPayload = spec.components.schemas.IngestionPayload;
    expect(ingestionPayload).toBeDefined();
    expect(ingestionPayload.properties.imageQuery).toBeDefined();
    expect(ingestionPayload.properties.imageQuery.type).toBe("string");
    expect(ingestionPayload.properties.imageQuery.minLength).toBe(2);
    expect(ingestionPayload.properties.imageQuery.maxLength).toBe(100);

    expect(ingestionPayload.properties.imageUrl).toBeDefined();
    expect(ingestionPayload.properties.imageUrl.type).toBe("string");

    expect(ingestionPayload.properties.imageCredit).toBeDefined();
    expect(ingestionPayload.properties.imageCredit.type).toBe("string");

    expect(ingestionPayload.properties.imageLicense).toBeDefined();
    expect(ingestionPayload.properties.imageLicense.type).toBe("string");

    expect(ingestionPayload.properties.imageCaption).toBeDefined();
    expect(ingestionPayload.properties.imageCaption.type).toBe("string");

    expect(ingestionPayload.properties.imageIsGeneric).toBeDefined();
    expect(ingestionPayload.properties.imageIsGeneric.type).toBe("boolean");
    expect(ingestionPayload.properties.imageIsGeneric.default).toBe(true);

    expect(ingestionPayload.properties.images).toBeDefined();
    expect(ingestionPayload.properties.images.type).toBe("array");

    // F. Respon 201 ai-submissions menyebutkan perilaku imageQuery
    const submitPost = spec.paths["/api/internal/v1/ai-submissions"].post;
    expect(submitPost.responses["201"].description).toContain("imageQuery");

    // G. Rute Konstitusi VAES v2.0.2 dan enum modul operasional
    expect(spec.paths["/editorial/vaes"]).toBeDefined();
    expect(spec.paths["/editorial/vaes"].get).toBeDefined();
    expect(spec.paths["/editorial/vaes"].head).toBeDefined();
    expect(spec.paths["/editorial/vaes.json"]).toBeDefined();
    expect(spec.paths["/editorial/vaes.json"].get).toBeDefined();
    expect(spec.paths["/editorial/vaes.json"].head).toBeDefined();

    const opSlugParam = (
      spec.paths["/editorial/operations/{slug}"].get.parameters as Array<{ name: string; schema: { enum?: string[] } }>
    ).find((p) => p.name === "slug");
    expect(opSlugParam?.schema.enum).toContain("vaes");
  });

  test("2. /.well-known/verax-agent.json mencantumkan kapabilitas coverage dan rincian autentikasi", () => {
    const meta = getWellKnownAgentMetadata(dummyBase) as {
      platform: string;
      endpoints: Record<string, string>;
      capabilities: Record<string, boolean>;
      authentication: {
        type: string;
        format: string;
        header: string;
        scopes?: {
          submit?: { header: string };
          coverageRead?: { envVariable: string; headers: string[] };
        };
      };
    };

    expect(meta.platform).toBe("Verax Press");

    // Endpoints
    expect(meta.endpoints.coverageSearch).toBe(
      `${dummyBase}/api/internal/v1/editorial/coverage/search`,
    );
    expect(meta.endpoints.coverageCheck).toBe(
      `${dummyBase}/api/internal/v1/editorial/coverage/check`,
    );
    expect(meta.endpoints.submission).toBeDefined();

    // Capabilities
    expect(meta.capabilities.coverageSearch).toBe(true);
    expect(meta.capabilities.coverageCheck).toBe(true);
    expect(meta.capabilities.submission).toBe(true);
    expect(meta.capabilities.stockPhotoSearch).toBe(true);
    expect(meta.capabilities.vaesConstitution).toBe(true);
    expect(meta.capabilities.publication).toBe(false);

    // VAES Constitution Endpoints
    expect(meta.endpoints.vaesConstitution).toBe(`${dummyBase}/editorial/vaes`);
    expect(meta.endpoints.vaesConstitutionJson).toBe(`${dummyBase}/editorial/vaes.json`);

    // Authentication & scopes
    expect(meta.authentication.header).toBe("Authorization");
    expect(meta.authentication.scopes).toBeDefined();
    expect(meta.authentication.scopes?.coverageRead?.envVariable).toBe("VERAX_COVERAGE_API_KEY");
    expect(meta.authentication.scopes?.coverageRead?.headers).toContain(
      "Authorization: Bearer <VERAX_COVERAGE_API_KEY>",
    );
  });

  test("3. /llms.txt menjelaskan alur coverage dan fitur foto stok serta bersih dari tanda pisah terlarang", () => {
    const text = getLlmsTxt(dummyBase);

    expect(text).toContain("Verax Press");
    expect(text).toContain("/api/internal/v1/editorial/coverage/search");
    expect(text).toContain("/api/internal/v1/editorial/coverage/check");
    expect(text).toContain("VERAX_COVERAGE_API_KEY");
    expect(text).toContain("coverage:read");
    expect(text).toContain("FORBIDDEN_SCOPE");

    // Kemampuan Foto Stok & Gambar
    expect(text).toContain("imageQuery");
    expect(text).toContain("imageUrl");
    expect(text).toContain("imageIsGeneric");
    expect(text).toContain("Unsplash atau Pexels");
    expect(text).toContain("Foto Suasana");

    // Standar Penulisan Anti-AI & Kebijakan Anti-Slop
    expect(text).toContain("Standar Penulisan Anti-AI & Kebijakan Anti-Slop");
    expect(text).toContain("Larangan Em Dash dan Tanda Pisah Ganda");
    expect(text).toContain("Kosakata Terlarang (Banned AI Vocabulary)");
    expect(text).toContain("delve");
    expect(text).toContain("unlock");
    expect(text).toContain("elevate");
    expect(text).toContain("leverage");
    expect(text).toContain("hadir untuk");
    expect(text).toContain("merevolusi");
    expect(text).toContain("menjembatani");
    expect(text).toContain("Larangan Paralelisme Negatif");
    expect(text).toContain("Larangan Aturan Tiga yang Dipaksakan (Forced Rule of Three)");
    expect(text).toContain("Variasi Ritme Kalimat (Burstiness)");
    expect(text).toContain("Larangan Emoji Dekoratif");
    expect(text).toContain("Kejujuran Faktual Nol Fabrikasi");

    // Konstitusi Sistem Editorial Mandiri (VAES v2.0.2)
    expect(text).toContain("/editorial/vaes");
    expect(text).toContain("/editorial/vaes.json");
    expect(text).toContain("Konstitusi Sistem Editorial Mandiri (VAES v2.0.2)");

    // Penegakan aturan tipografi: mutlak bebas em-dash dan double-dash
    expect(text).not.toContain("—");
    expect(text).not.toContain("--");
  });

  test("4. /llms-full.txt memuat spesifikasi VEI dan panduan foto stok lengkap yang siap pakai", () => {
    const text = getLlmsFullTxt(dummyBase);

    expect(text).toContain("Dokumentasi Lengkap Integrasi Agen AI Verax Press");
    expect(text).toContain("Spesifikasi Teknis Verax Editorial Intelligence (VEI)");
    expect(text).toContain("/api/internal/v1/editorial/coverage/search");
    expect(text).toContain("/api/internal/v1/editorial/coverage/check");
    expect(text).toContain("overlapLevel");
    expect(text).toContain("none");
    expect(text).toContain("partial");
    expect(text).toContain("high");

    // Spesifikasi Foto Stok & Gambar
    expect(text).toContain("imageQuery");
    expect(text).toContain("imageUrl");
    expect(text).toContain("imageCredit");
    expect(text).toContain("imageLicense");
    expect(text).toContain("imageIsGeneric");
    expect(text).toContain("Panduan Penyertaan Gambar & Foto Stok Berlisensi");

    expect(text).toContain("Contoh Instruksi Sistem untuk Agen Penulis AI");
    expect(text).toContain("Peran: Agen Jurnalis AI Mandiri untuk Verax Press");

    // Standar Penulisan Anti-AI & Kebijakan Anti-Slop Lengkap
    expect(text).toContain("Standar Penulisan Anti-AI & Kebijakan Anti-Slop (Wajib Sebelum Pengiriman)");
    expect(text).toContain("Larangan Tanda Pisah Em Dash dan Tanda Pisah Ganda");
    expect(text).toContain("Kosakata Klise AI yang Dilarang (Banned AI Vocabulary)");
    expect(text).toContain("delve");
    expect(text).toContain("unlock");
    expect(text).toContain("elevate");
    expect(text).toContain("leverage");
    expect(text).toContain("merevolusi");
    expect(text).toContain("menjembatani");
    expect(text).toContain("Larangan Paralelisme Negatif");
    expect(text).toContain("Larangan Aturan Tiga yang Dipaksakan (Forced Rule of Three)");
    expect(text).toContain("Variasi Ritme Kalimat (Burstiness)");
    expect(text).toContain("Larangan Emoji Dekoratif");
    expect(text).toContain("Kejujuran Faktual Nol Fabrikasi");
    expect(text).toContain("Langkah 4: Terapkan Standar Penulisan Anti-AI & Kebijakan Anti-Slop");

    // Konstitusi Sistem Editorial Mandiri (VAES v2.0.2)
    expect(text).toContain("/editorial/vaes");
    expect(text).toContain("/editorial/vaes.json");
    expect(text).toContain("Langkah 3: Ambil Konteks Standar Editorial & Konstitusi VAES");

    // Penegakan aturan tipografi: mutlak bebas em-dash dan double-dash
    expect(text).not.toContain("—");
    expect(text).not.toContain("--");
  });

  test("5. GET /editorial/core menyajikan prinsip anti-AI-writing dan daftar kosakata terlarang dalam mode compact maupun full", async () => {
    // A. Mode Compact (Markdown)
    const compactReq = new Request(`${dummyBase}/editorial/core?mode=compact`);
    const compactRes = await coreGet(compactReq);
    expect(compactRes.status).toBe(200);
    expect(compactRes.headers.get("content-type")).toContain("text/markdown");
    expect(compactRes.headers.get("x-verax-standard-status")).toBe("PROPOSED");
    expect(compactRes.headers.get("x-verax-standard-effective")).toBe("false");

    const compactMd = await compactRes.text();
    expect(compactMd).toContain("VERAX-CORE-STYLE-05");
    expect(compactMd).toContain("Standar Penulisan Anti-AI & Disiplin Bahasa");
    expect(compactMd).toContain("Larangan Tanda Em Dash dan Tanda Pisah Ganda (DILARANG)");
    expect(compactMd).toContain("Kosakata Terlarang (Banned AI Vocabulary)");
    expect(compactMd).toContain("delve");
    expect(compactMd).toContain("unlock");
    expect(compactMd).toContain("elevate");
    expect(compactMd).toContain("leverage");
    expect(compactMd).toContain("hadir untuk");
    expect(compactMd).toContain("merevolusi");
    expect(compactMd).toContain("menjembatani");
    expect(compactMd).toContain("Larangan Paralelisme Negatif (DILARANG)");
    expect(compactMd).toContain("Bukan sekadar X, melainkan Y");
    expect(compactMd).toContain("Larangan Pola Tiga Serangkai yang Dipaksakan (DILARANG)");
    expect(compactMd).toContain("Variasi Ritme Kalimat (Burstiness)");
    expect(compactMd).toContain("Larangan Emoji Dekoratif (DILARANG)");
    expect(compactMd).toContain("Kejujuran Faktual Nol Fabrikasi (WAJIB)");
    expect(compactMd).toContain("Batas Keras Non-Evasion");
    expect(compactMd).not.toContain("—");

    // B. Mode Compact (JSON)
    const compactJsonReq = new Request(`${dummyBase}/editorial/core?mode=compact&output=json`);
    const compactJsonRes = await coreGet(compactJsonReq);
    expect(compactJsonRes.status).toBe(200);
    expect(compactJsonRes.headers.get("content-type")).toContain("application/json");

    const compactJsonData = (await compactJsonRes.json()) as {
      mode: string;
      documentId: string;
      compactSummaryMarkdown: string;
      modules: Array<{ slug: string; documentId: string }>;
    };
    expect(compactJsonData.mode).toBe("compact");
    expect(compactJsonData.documentId).toBe("VERAX-CORE-BUNDLE-COMPACT");
    expect(compactJsonData.compactSummaryMarkdown).toContain("VERAX-CORE-STYLE-05");
    expect(compactJsonData.compactSummaryMarkdown).toContain("Kosakata Terlarang (Banned AI Vocabulary)");
    expect(compactJsonData.compactSummaryMarkdown).toContain("delve");
    expect(compactJsonData.compactSummaryMarkdown).toContain("leverage");
    expect(compactJsonData.modules.some((m) => m.slug === "language")).toBe(true);

    // C. Mode Full (Markdown)
    const fullReq = new Request(`${dummyBase}/editorial/core?mode=full`);
    const fullRes = await coreGet(fullReq);
    expect(fullRes.status).toBe(200);

    const fullMd = await fullRes.text();
    expect(fullMd).toContain("VERAX-CORE-STYLE-05");
    expect(fullMd).toContain("Bahasa Jurnalistik, Suara Naratif, dan Disiplin Anti-AI Verax Press");
    expect(fullMd).toContain("Enam Prinsip Pedoman Editorial Anti-AI");
    expect(fullMd).toContain("Larangan Tanda Pisah Em Dash dan Tanda Hubung Ganda");
    expect(fullMd).toContain("Daftar Kosakata AI Terlarang");
    expect(fullMd).toContain("delve");
    expect(fullMd).toContain("leverage");
    expect(fullMd).toContain("hadir untuk");
    expect(fullMd).toContain("merevolusi");
    expect(fullMd).toContain("Larangan Paralelisme Negatif");
    expect(fullMd).toContain("Aturan Tiga Butir yang Dipaksakan");
    expect(fullMd).toContain("Variasi Ritme Kalimat");
    expect(fullMd).toContain("Burstiness");
    expect(fullMd).toContain("Larangan Emoji Dekoratif");
    expect(fullMd).toContain("Kejujuran Faktual dan Nol Toleransi Fabrikasi");
    expect(fullMd).toContain("Tujuh Batas Keras Non-Evasion");
    expect(fullMd).not.toContain("—");

    // D. Mode Full (JSON)
    const fullJsonReq = new Request(`${dummyBase}/editorial/core?mode=full&output=json`);
    const fullJsonRes = await coreGet(fullJsonReq);
    expect(fullJsonRes.status).toBe(200);
    const fullJsonData = (await fullJsonRes.json()) as {
      mode: string;
      documentId: string;
      modules: Array<{ slug: string; documentId: string; bodyMarkdown: string }>;
    };
    expect(fullJsonData.mode).toBe("full");
    expect(fullJsonData.documentId).toBe("VERAX-CORE-BUNDLE-FULL");
    const langModule = fullJsonData.modules.find((m) => m.slug === "language");
    expect(langModule).toBeDefined();
    expect(langModule?.bodyMarkdown).toContain("Enam Prinsip Pedoman Editorial Anti-AI");
    expect(langModule?.bodyMarkdown).toContain("delve");
    expect(langModule?.bodyMarkdown).toContain("leverage");
    expect(langModule?.bodyMarkdown).not.toContain("—");
  });

  test("6. GET /editorial/context menyertakan Layer A yang memuat disiplin anti-AI-writing secara konsisten", async () => {
    // A. Context Compact (Markdown)
    const ctxCompactReq = new Request(
      `${dummyBase}/editorial/context?desk=hukum-keadilan&format=ANALYSIS&coreMode=compact`,
    );
    const ctxCompactRes = await contextGet(ctxCompactReq);
    expect(ctxCompactRes.status).toBe(200);
    expect(ctxCompactRes.headers.get("content-type")).toContain("text/markdown");

    const ctxCompactMd = await ctxCompactRes.text();
    expect(ctxCompactMd).toContain("Lapisan A (Layer A): Identitas dan Prinsip Universal Verax Press");
    expect(ctxCompactMd).toContain("Standar Penulisan Anti-AI & Disiplin Bahasa (`VERAX-CORE-STYLE-05`)");
    expect(ctxCompactMd).toContain("Kosakata Terlarang (Banned AI Vocabulary)");
    expect(ctxCompactMd).toContain("delve");
    expect(ctxCompactMd).toContain("leverage");
    expect(ctxCompactMd).toContain("hadir untuk");
    expect(ctxCompactMd).toContain("Larangan Paralelisme Negatif (DILARANG)");
    expect(ctxCompactMd).toContain("Variasi Ritme Kalimat (Burstiness)");
    expect(ctxCompactMd).toContain("<!-- LAYER B SINGLE DESK: VERAX-DESK-HUKUM-01 -->");
    expect(ctxCompactMd).toContain("<!-- LAYER C SINGLE FORMAT: VERAX-FORMAT-ANALYSIS-02 -->");
    expect(ctxCompactMd).toContain("Lapisan D (Layer D): Konteks Penugasan Spesifik & Batas Jalur");
    expect(ctxCompactMd).not.toContain("—");

    // B. Context Compact (JSON)
    const ctxJsonReq = new Request(
      `${dummyBase}/editorial/context?desk=hukum-keadilan&format=ANALYSIS&coreMode=compact&output=json`,
    );
    const ctxJsonRes = await contextGet(ctxJsonReq);
    expect(ctxJsonRes.status).toBe(200);

    const ctxJsonData = (await ctxJsonRes.json()) as {
      documentId: string;
      selection: { desk: string; format: string; coreMode: string };
      layers: {
        universalCore: {
          mode: string;
          documentId: string;
          markdown: string;
        };
        deskProfile: { slug: string };
        formatProfile: { code: string };
      };
    };
    expect(ctxJsonData.documentId).toContain("VERAX-CTX-HUKUM-KEADILAN-ANALYSIS");
    expect(ctxJsonData.selection.desk).toBe("hukum-keadilan");
    expect(ctxJsonData.selection.format).toBe("ANALYSIS");
    expect(ctxJsonData.selection.coreMode).toBe("compact");
    expect(ctxJsonData.layers.universalCore.mode).toBe("compact");
    expect(ctxJsonData.layers.universalCore.markdown).toContain("Standar Penulisan Anti-AI & Disiplin Bahasa");
    expect(ctxJsonData.layers.universalCore.markdown).toContain("delve");
    expect(ctxJsonData.layers.universalCore.markdown).toContain("leverage");
    expect(ctxJsonData.layers.universalCore.markdown).not.toContain("—");

    // C. Context Full (Markdown & JSON)
    const ctxFullReq = new Request(
      `${dummyBase}/editorial/context?desk=teknologi-kebijakan&format=EXPLAINER&coreMode=full&output=json`,
    );
    const ctxFullRes = await contextGet(ctxFullReq);
    expect(ctxFullRes.status).toBe(200);
    const ctxFullJsonData = (await ctxFullRes.json()) as {
      layers: {
        universalCore: {
          mode: string;
          markdown: string;
        };
      };
    };
    expect(ctxFullJsonData.layers.universalCore.mode).toBe("full");
    expect(ctxFullJsonData.layers.universalCore.markdown).toContain("Enam Prinsip Pedoman Editorial Anti-AI");
    expect(ctxFullJsonData.layers.universalCore.markdown).toContain("delve");
    expect(ctxFullJsonData.layers.universalCore.markdown).toContain("leverage");
    expect(ctxFullJsonData.layers.universalCore.markdown).not.toContain("—");
  });

  test("7. Validasi kontrak dan penanganan kesalahan rute /editorial/core dan /editorial/context tetap terjaga tanpa regresi", async () => {
    // A. Validasi mode tidak valid pada /editorial/core
    const invalidModeRes = await coreGet(new Request(`${dummyBase}/editorial/core?mode=tidak-valid`));
    expect(invalidModeRes.status).toBe(422);
    const invalidModeJson = (await invalidModeRes.json()) as { code: string; error: string };
    expect(invalidModeJson.code).toBe("VALIDATION_ERROR");

    // B. Validasi format output tidak valid pada /editorial/core
    const invalidOutputRes = await coreGet(new Request(`${dummyBase}/editorial/core?output=xml`));
    expect(invalidOutputRes.status).toBe(422);
    const invalidOutputJson = (await invalidOutputRes.json()) as {
      code: string;
      details: Array<{ code: string }>;
    };
    expect(invalidOutputJson.code).toBe("VALIDATION_ERROR");
    expect(invalidOutputJson.details[0].code).toBe("INVALID_ENUM");

    // C. Validasi parameter wajib pada /editorial/context
    const missingDeskRes = await contextGet(new Request(`${dummyBase}/editorial/context?format=ANALYSIS`));
    expect(missingDeskRes.status).toBe(422);
    const missingDeskJson = (await missingDeskRes.json()) as { code: string };
    expect(missingDeskJson.code).toBe("VALIDATION_ERROR");

    const missingFormatRes = await contextGet(new Request(`${dummyBase}/editorial/context?desk=hukum-keadilan`));
    expect(missingFormatRes.status).toBe(422);
    const missingFormatJson = (await missingFormatRes.json()) as { code: string };
    expect(missingFormatJson.code).toBe("VALIDATION_ERROR");

    // D. Validasi desk tidak dikenali pada /editorial/context
    const unknownDeskRes = await contextGet(
      new Request(`${dummyBase}/editorial/context?desk=desk-fiktif&format=ANALYSIS`),
    );
    expect(unknownDeskRes.status).toBe(422);
    const unknownDeskJson = (await unknownDeskRes.json()) as { code: string };
    expect(unknownDeskJson.code).toBe("DESK_REJECTED");

    // E. Validasi format tidak sah pada /editorial/context
    const unknownFormatRes = await contextGet(
      new Request(`${dummyBase}/editorial/context?desk=hukum-keadilan&format=FORMAT_TIDAK_SAH`),
    );
    expect(unknownFormatRes.status).toBe(422);
    const unknownFormatJson = (await unknownFormatRes.json()) as { code: string };
    expect(unknownFormatJson.code).toBe("FORMAT_REJECTED");

    // F. Validasi penahanan NEWS pada jalur INGESTION_API (fail-closed)
    const pendingNewsRes = await contextGet(
      new Request(`${dummyBase}/editorial/context?desk=hukum-keadilan&format=NEWS&channel=INGESTION_API`),
    );
    expect(pendingNewsRes.status).toBe(422);
    const pendingNewsJson = (await pendingNewsRes.json()) as {
      code: string;
      details: Array<{ code: string }>;
    };
    expect(pendingNewsJson.code).toBe("FORMAT_REJECTED");
    expect(pendingNewsJson.details.some((d) => d.code === "FORMAT_PENDING_AUTHORIZATION")).toBe(true);

    // G. Uji metode HEAD pada /editorial/core dan /editorial/context
    const headCoreRes = await coreHead(new Request(`${dummyBase}/editorial/core?mode=compact`));
    expect(headCoreRes.status).toBe(200);
    expect(headCoreRes.headers.get("x-verax-standard-status")).toBe("PROPOSED");
    expect(await headCoreRes.text()).toBe("");

    const headContextRes = await contextHead(
      new Request(`${dummyBase}/editorial/context?desk=hukum-keadilan&format=ANALYSIS&coreMode=compact`),
    );
    expect(headContextRes.status).toBe(200);
    expect(headContextRes.headers.get("x-verax-standard-status")).toBe("PROPOSED");
    expect(await headContextRes.text()).toBe("");
  });

  test("8. GET & HEAD /editorial/vaes.json menyajikan spesifikasi definitif protokol VAES v2.0.2 dan menolak metode non-GET/HEAD dengan 405", async () => {
    // A. GET /editorial/vaes.json
    const getRes = await vaesJsonGet(new Request(`${dummyBase}/editorial/vaes.json`));
    expect(getRes.status).toBe(200);
    expect(getRes.headers.get("content-type")).toContain("application/json");
    expect(getRes.headers.get("x-verax-standard-status")).toBe("PROPOSED");

    const json = (await getRes.json()) as {
      protocol: string;
      version: string;
      codename: string;
      section_2_absolute_anti_fabrication_protocol: {
        prohibited_fabrication_targets: string[];
      };
      section_3_journalistic_craft_standards: {
        foundational_methodologies: Array<{ mentor: string }>;
      };
      section_5_candidate_recovery_and_replacement_protocol: {
        condition_a_source_missing: unknown;
        condition_b_claim_unverified: unknown;
        condition_c_hypothesis_refuted: unknown;
        condition_d_candidate_unviable: unknown;
      };
    };

    expect(json.protocol).toBe("VERAX_AUTONOMOUS_EDITORIAL_SYSTEM");
    expect(json.version).toBe("2.0.2");
    expect(json.codename).toBe("VAES_RESILIENT_TRUTH");

    // 14 target anti-fabrikasi
    expect(json.section_2_absolute_anti_fabrication_protocol.prohibited_fabrication_targets).toHaveLength(14);

    // 9 mentor jurnalistik
    const mentors = json.section_3_journalistic_craft_standards.foundational_methodologies.map((m) => m.mentor);
    expect(mentors).toHaveLength(9);
    expect(mentors.some((m) => m.includes("Kashmir Hill"))).toBe(true);
    expect(mentors.some((m) => m.includes("Julia Angwin"))).toBe(true);
    expect(mentors.some((m) => m.includes("Adam Liptak"))).toBe(true);
    expect(mentors.some((m) => m.includes("Brian Krebs"))).toBe(true);
    expect(mentors.some((m) => m.includes("Sarah Kliff"))).toBe(true);
    expect(mentors.some((m) => m.includes("Brian M. Rosenthal"))).toBe(true);
    expect(mentors.some((m) => m.includes("Andreas Harsono"))).toBe(true);
    expect(mentors.some((m) => m.includes("Tempo"))).toBe(true);
    expect(mentors.some((m) => m.includes("Reuters"))).toBe(true);

    // Kondisi Pemulihan Kandidat A, B, C, D
    const recovery = json.section_5_candidate_recovery_and_replacement_protocol;
    expect(recovery.condition_a_source_missing).toBeDefined();
    expect(recovery.condition_b_claim_unverified).toBeDefined();
    expect(recovery.condition_c_hypothesis_refuted).toBeDefined();
    expect(recovery.condition_d_candidate_unviable).toBeDefined();

    // B. HEAD /editorial/vaes.json
    const headRes = await vaesJsonHead(new Request(`${dummyBase}/editorial/vaes.json`));
    expect(headRes.status).toBe(200);
    expect(headRes.headers.get("x-verax-standard-status")).toBe("PROPOSED");
    expect(await headRes.text()).toBe("");

    // C. Non-GET/HEAD methods mengembalikan HTTP 405 Method Not Allowed
    const postRes = await vaesJsonPost();
    expect(postRes.status).toBe(405);
    expect(postRes.headers.get("allow")).toBe("GET, HEAD");

    const putRes = await vaesJsonPut();
    expect(putRes.status).toBe(405);
    expect(putRes.headers.get("allow")).toBe("GET, HEAD");

    const patchRes = await vaesJsonPatch();
    expect(patchRes.status).toBe(405);
    expect(patchRes.headers.get("allow")).toBe("GET, HEAD");

    const deleteRes = await vaesJsonDelete();
    expect(deleteRes.status).toBe(405);
    expect(deleteRes.headers.get("allow")).toBe("GET, HEAD");
  });

  test("9. GET & HEAD /editorial/vaes menyajikan konstitusi format Markdown dan JSON (?output=json) serta menolak metode lain dengan 405", async () => {
    // A. GET /editorial/vaes (default Markdown)
    const mdRes = await vaesGet(new Request(`${dummyBase}/editorial/vaes`));
    expect(mdRes.status).toBe(200);
    expect(mdRes.headers.get("content-type")).toContain("text/markdown");
    expect(mdRes.headers.get("x-verax-standard-status")).toBe("PROPOSED");

    const md = await mdRes.text();
    expect(md).toContain("VERAX-OPS-VAES-01");
    expect(md).toContain("Verax Autonomous Editorial System Constitution v2.0.2");
    expect(md).toContain("VAES_RESILIENT_TRUTH");
    expect(md).toContain("Kashmir Hill");
    expect(md).toContain("Julia Angwin");
    expect(md).toContain("Andreas Harsono");
    expect(md).not.toContain("—");

    // B. GET /editorial/vaes?output=json
    const jsonRes = await vaesGet(new Request(`${dummyBase}/editorial/vaes?output=json`));
    expect(jsonRes.status).toBe(200);
    expect(jsonRes.headers.get("content-type")).toContain("application/json");

    const jsonData = (await jsonRes.json()) as {
      documentId: string;
      title: string;
      bodyMarkdown: string;
    };
    expect(jsonData.documentId).toBe("VERAX-OPS-VAES-01");
    expect(jsonData.title).toContain("Verax Autonomous Editorial System Constitution v2.0.2");
    expect(jsonData.bodyMarkdown).toContain("VAES_RESILIENT_TRUTH");

    // C. HEAD /editorial/vaes
    const headRes = await vaesHead(new Request(`${dummyBase}/editorial/vaes`));
    expect(headRes.status).toBe(200);
    expect(headRes.headers.get("x-verax-standard-status")).toBe("PROPOSED");
    expect(await headRes.text()).toBe("");

    // D. Non-GET/HEAD methods mengembalikan HTTP 405 Method Not Allowed
    const postRes = await vaesPost();
    expect(postRes.status).toBe(405);
    expect(postRes.headers.get("allow")).toBe("GET, HEAD");

    const putRes = await vaesPut();
    expect(putRes.status).toBe(405);
    expect(putRes.headers.get("allow")).toBe("GET, HEAD");

    const patchRes = await vaesPatch();
    expect(patchRes.status).toBe(405);
    expect(patchRes.headers.get("allow")).toBe("GET, HEAD");

    const deleteRes = await vaesDelete();
    expect(deleteRes.status).toBe(405);
    expect(deleteRes.headers.get("allow")).toBe("GET, HEAD");
  });

  test("10. GET /editorial/operations/vaes menyajikan modul operasional VAES melalui perutean dinamis", async () => {
    const res = await operationGet(new Request(`${dummyBase}/editorial/operations/vaes`), {
      params: Promise.resolve({ slug: "vaes" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/markdown");

    const text = await res.text();
    expect(text).toContain("VERAX-OPS-VAES-01");
    expect(text).toContain("VAES_RESILIENT_TRUTH");
    expect(text).not.toContain("—");
  });
});

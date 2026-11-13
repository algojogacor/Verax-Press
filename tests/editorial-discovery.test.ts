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
    expect(checkPath.post.responses["403"]).toBeDefined();
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
    expect(meta.capabilities.publication).toBe(false);

    // Authentication & scopes
    expect(meta.authentication.header).toBe("Authorization");
    expect(meta.authentication.scopes).toBeDefined();
    expect(meta.authentication.scopes?.coverageRead?.envVariable).toBe("VERAX_COVERAGE_API_KEY");
    expect(meta.authentication.scopes?.coverageRead?.headers).toContain(
      "Authorization: Bearer <VERAX_COVERAGE_API_KEY>",
    );
  });

  test("3. /llms.txt menjelaskan alur coverage sebelum menulis dan bersih dari tanda pisah terlarang", () => {
    const text = getLlmsTxt(dummyBase);

    expect(text).toContain("Verax Press");
    expect(text).toContain("/api/internal/v1/editorial/coverage/search");
    expect(text).toContain("/api/internal/v1/editorial/coverage/check");
    expect(text).toContain("VERAX_COVERAGE_API_KEY");
    expect(text).toContain("coverage:read");
    expect(text).toContain("FORBIDDEN_SCOPE");

    // Penegakan aturan tipografi: mutlak bebas em-dash dan double-dash
    expect(text).not.toContain("—");
    expect(text).not.toContain("--");
  });

  test("4. /llms-full.txt memuat spesifikasi VEI lengkap dan instruksi prompt agen Gemini yang siap pakai", () => {
    const text = getLlmsFullTxt(dummyBase);

    expect(text).toContain("Dokumentasi Lengkap Integrasi Agen AI Verax Press");
    expect(text).toContain("Spesifikasi Teknis Verax Editorial Intelligence (VEI)");
    expect(text).toContain("/api/internal/v1/editorial/coverage/search");
    expect(text).toContain("/api/internal/v1/editorial/coverage/check");
    expect(text).toContain("overlapLevel");
    expect(text).toContain("none");
    expect(text).toContain("partial");
    expect(text).toContain("high");
    expect(text).toContain("Contoh Instruksi Sistem untuk Agen Penulis AI");
    expect(text).toContain("Peran: Agen Jurnalis AI Mandiri untuk Verax Press");

    // Penegakan aturan tipografi: mutlak bebas em-dash dan double-dash
    expect(text).not.toContain("—");
    expect(text).not.toContain("--");
  });
});

// Layanan basis pengetahuan editorial modular Verax Press (hanya-baca).
// Memuat lapisan publik terkurasi pada docs/editorial/public/, menjaga status PROPOSED secara ketat,
// serta menyusun konteks selektif empat lapis (A+B+C+D) tanpa membocorkan dokumen rekayasa internal.

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import {
  AI_INVOLVEMENTS,
  ARTICLE_FORMATS,
  CONTRIBUTOR_ALLOWED_FORMATS,
  FORMAT_LABELS,
  INGESTION_ALLOWED_FORMATS,
  INGESTION_CONDITIONAL_FORMAT_RULES,
  INGESTION_PENDING_FORMATS,
  SOURCE_TYPES,
} from "@/lib/domain/constants";

export type EditorialChannel = "INGESTION_API" | "NEWSROOM" | "CONTRIBUTOR";
export type CoreMode = "compact" | "full";
export type ContextOutputFormat = "markdown" | "json";

const PUBLIC_EDITORIAL_BASE_DIR = "docs/editorial/public";

export interface CoreModuleMeta {
  slug: "identity" | "principles" | "verification" | "ethics" | "language";
  documentId: string;
  title: string;
  publicFile: string;
}

export interface OperationModuleMeta {
  slug: "ai-workflow" | "quality-assessment" | "review-checklist" | "api-integration";
  documentId: string;
  title: string;
  publicFile: string;
}

export const CORE_MODULES: CoreModuleMeta[] = [
  {
    slug: "identity",
    documentId: "VERAX-CORE-IDENTITY-01",
    title: "Identitas Editorial, Normativitas, dan Batas Dokumen Verax Press",
    publicFile: "core/VERAX_EDITORIAL_IDENTITY.md",
  },
  {
    slug: "principles",
    documentId: "VERAX-CORE-PRINCIPLES-02",
    title: "Prinsip Jurnalistik Universal Verax Press",
    publicFile: "core/VERAX_JOURNALISTIC_PRINCIPLES.md",
  },
  {
    slug: "verification",
    documentId: "VERAX-CORE-RESEARCH-03",
    title: "Protokol Riset, Hierarki Sumber, dan Verifikasi Verax Press",
    publicFile: "core/VERAX_RESEARCH_AND_VERIFICATION.md",
  },
  {
    slug: "ethics",
    documentId: "VERAX-CORE-ETHICS-04",
    title: "Etika Editorial, Kepatuhan Hukum, dan Akuntabilitas Verax Press",
    publicFile: "core/VERAX_ETHICS_AND_RESPONSIBILITY.md",
  },
  {
    slug: "language",
    documentId: "VERAX-CORE-STYLE-05",
    title: "Bahasa Jurnalistik, Suara Naratif, dan Disiplin Anti-AI Verax Press",
    publicFile: "core/VERAX_LANGUAGE_AND_STYLE.md",
  },
];

export const OPERATION_MODULES: OperationModuleMeta[] = [
  {
    slug: "ai-workflow",
    documentId: "VERAX-OPS-WORKFLOW-01",
    title: "Protokol Konteks Penugasan (Layer D) dan Alur Kerja Operasional Agen AI",
    publicFile: "operations/VERAX_AI_AGENT_WORKFLOW.md",
  },
  {
    slug: "quality-assessment",
    documentId: "VERAX-OPS-QUALITY-02",
    title: "Standar Kedalaman Substansi dan Rubrik Penilaian Mutu Editorial Verax Press",
    publicFile: "operations/VERAX_EDITORIAL_QUALITY_ASSESSMENT.md",
  },
  {
    slug: "review-checklist",
    documentId: "VERAX-OPS-CHECKLIST-03",
    title: "Daftar Periksa Kepatuhan Pra-Kirim dan Pra-Terbit Verax Press",
    publicFile: "operations/VERAX_EDITORIAL_REVIEW_CHECKLIST.md",
  },
  {
    slug: "api-integration",
    documentId: "VERAX-TECH-INTEGRATION-01",
    title: "Kontrak Integrasi Editorial Publik, Skema API, dan Tata Kelola Pengiriman",
    publicFile: "VERAX_PUBLIC_API_INTEGRATION.md",
  },
];

interface RawManifestDesk {
  slug: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  systemDescription: string;
  documentId: string;
  profileDocument: string;
  preferredSourceTypes: string[];
}

interface RawManifestFormat {
  code: string;
  systemLabel: string;
  documentId: string;
  profileDocument: string;
  eligibleOrigins: string[];
  pendingAuthorizationOrigins?: string[];
  conditionalOrigins?: string[];
  disallowedOrigins: string[];
  availabilityNote?: string;
  preconditionSummary?: string;
  requiresOpinionDisclaimer: boolean;
  recommendedWordRange: { min: number; max: number; orientationOnly: boolean } | null;
}

export interface RawEditorialManifest {
  standardId: string;
  semanticVersion: string;
  status: string;
  isBindingEffectivePolicy?: boolean;
  authoredDate: string;
  lastReviewed: string;
  effectiveDate: string | null;
  ownerRole: string;
  architecture: string;
  technicalIntegrationDocument: string;
  coreDocuments: string[];
  deskProfiles: string[];
  formatProfiles: string[];
  operationDocuments: string[];
  institutionalStatusNote: string;
  checksumSpecification?: Record<string, unknown>;
  loadingProtocol: Record<string, unknown>;
  conflictResolutionHierarchy: Array<Record<string, unknown>>;
  normativeKeywords: Record<string, string>;
  layeredArchitecture: {
    compositionFormula: string;
    layerDParameters: string[];
  };
  desks: RawManifestDesk[];
  formats: RawManifestFormat[];
  rulesIndex: Record<string, unknown>;
  rubricIndex: Record<string, unknown>;
  systemContractReference: Record<string, unknown>;
  revisionHistory: Array<Record<string, unknown>>;
}

export interface ParsedFrontmatterDoc {
  frontmatter: Record<string, string | string[]>;
  body: string;
  sha256: string;
  documentId: string;
  title: string;
  version: string;
  status: string;
  scope: string;
  lastReviewed: string;
}

function publicEditorialRoot(): string {
  return path.resolve(process.cwd(), PUBLIC_EDITORIAL_BASE_DIR);
}

function resolvePublicEditorialFile(relativeFile: string): string {
  const normalized = relativeFile.replace(/\\/g, "/").replace(/^\/+/, "");
  const root = publicEditorialRoot();
  const full = path.resolve(root, normalized);
  if (!full.startsWith(root + path.sep) && full !== root) {
    throw new Error(`Invalid public editorial document path: ${relativeFile}`);
  }
  return full;
}

function normalizeCanonicalLf(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function computeSha256(content: string): string {
  return createHash("sha256").update(normalizeCanonicalLf(content), "utf8").digest("hex");
}

function parseFrontmatterMarkdown(publicFile: string): ParsedFrontmatterDoc {
  const absPath = resolvePublicEditorialFile(publicFile);
  const raw = normalizeCanonicalLf(fs.readFileSync(absPath, "utf8"));

  const frontmatter: Record<string, string | string[]> = {};
  let body = raw;

  if (raw.startsWith("---\n")) {
    const endIdx = raw.indexOf("\n---\n", 4);
    if (endIdx !== -1) {
      const yamlBlock = raw.slice(4, endIdx);
      body = raw.slice(endIdx + 5).trimStart();

      let currentListKey: string | null = null;
      for (const line of yamlBlock.split("\n")) {
        const listMatch = line.match(/^\s+-\s*(.+)$/);
        if (listMatch && currentListKey) {
          const prev = frontmatter[currentListKey];
          if (Array.isArray(prev)) {
            prev.push(listMatch[1].trim());
          }
          continue;
        }
        const kvMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
        if (kvMatch) {
          const [, key, rawVal] = kvMatch;
          const val = rawVal.trim();
          if (val === "[]") {
            frontmatter[key] = [];
            currentListKey = null;
          } else if (val === "") {
            frontmatter[key] = [];
            currentListKey = key;
          } else {
            frontmatter[key] = val.replace(/^["']|["']$/g, "");
            currentListKey = null;
          }
        }
      }
    }
  }

  return {
    frontmatter,
    body,
    sha256: computeSha256(body),
    documentId: String(frontmatter.documentId || ""),
    title: String(frontmatter.title || publicFile),
    version: String(frontmatter.version || "1.0.0"),
    status: String(frontmatter.status || "PROPOSED"),
    scope: String(frontmatter.scope || "unknown"),
    lastReviewed: String(frontmatter.lastReviewed || ""),
  };
}

export function loadRawEditorialManifest(): RawEditorialManifest {
  const abs = resolvePublicEditorialFile("verax-editorial-standard.manifest.json");
  const rawText = fs.readFileSync(abs, "utf8");
  return JSON.parse(rawText) as RawEditorialManifest;
}

export function isBindingStatus(status: string | undefined | null, effectiveDate: string | null | undefined): boolean {
  if (!status || !effectiveDate) return false;
  return status.toUpperCase() === "APPROVED" || status.toUpperCase() === "ACTIVE";
}

export function buildApprovalMetadata(manifest: RawEditorialManifest) {
  const effective = isBindingStatus(manifest.status, manifest.effectiveDate);
  return {
    standardId: manifest.standardId,
    semanticVersion: manifest.semanticVersion,
    status: manifest.status,
    effectiveDate: manifest.effectiveDate,
    isBindingEffectivePolicy: effective,
    ownerRole: manifest.ownerRole,
    approvalNotice: effective
      ? `Standar ${manifest.standardId} versi ${manifest.semanticVersion} aktif dan berlaku mengikat.`
      : `USULAN DRAF (${manifest.status}): Standar ${manifest.standardId} versi ${manifest.semanticVersion} belum disahkan oleh ${manifest.ownerRole}. Tersedia untuk pratinjau teknis dan uji coba integrasi, bukan kebijakan editorial efektif yang mengikat.`,
  };
}

export function buildMarkdownPreviewHeader(doc: {
  standardId: string;
  semanticVersion: string;
  status: string;
  effectiveDate: string | null;
  documentId: string;
  title: string;
  resourceUrl: string;
  sha256: string;
}): string {
  const isBinding = isBindingStatus(doc.status, doc.effectiveDate);
  return [
    "---",
    `standardId: ${doc.standardId}`,
    `standardVersion: ${doc.semanticVersion}`,
    `standardStatus: ${doc.status}`,
    `effectiveDate: ${doc.effectiveDate ?? "null"}`,
    `isBindingEffectivePolicy: ${isBinding ? "true" : "false"}`,
    `documentId: ${doc.documentId}`,
    `title: ${doc.title}`,
    `resourceUrl: ${doc.resourceUrl}`,
    `sha256: ${doc.sha256}`,
    `sha256Target: bodyMarkdown`,
    "---",
    "",
    !isBinding
      ? `> **[STATUS STANDAR: ${doc.status} / PRATINJAU NON-MENGIKAT]** Dokumen ini merupakan bagian dari usulan standar \`${doc.standardId}\` v${doc.semanticVersion} yang masih menunggu pengesahan resmi \`CHIEF_EDITOR\` (effectiveDate: null). Jangan memperlakukan dokumen ini sebagai kebijakan editorial yang telah disahkan.`
      : `> **[STATUS STANDAR: ${doc.status}]** Standar resmi \`${doc.standardId}\` v${doc.semanticVersion}.`,
    "",
  ].join("\n");
}

export function buildEditorialHttpHeaders(params: {
  manifest: RawEditorialManifest;
  documentId: string;
  contentType: string;
  etagSource: string;
}): Record<string, string> {
  const isBinding = isBindingStatus(params.manifest.status, params.manifest.effectiveDate);
  const etag = `"verax-${computeSha256(params.etagSource).slice(0, 16)}"`;
  return {
    "Content-Type": params.contentType,
    "Cache-Control": "public, max-age=60, s-maxage=300",
    "Vary": "Accept",
    "ETag": etag,
    "X-Robots-Tag": "noindex, nofollow",
    "X-Verax-Standard-Id": params.manifest.standardId,
    "X-Verax-Standard-Version": params.manifest.semanticVersion,
    "X-Verax-Standard-Status": params.manifest.status,
    "X-Verax-Standard-Effective": String(isBinding),
    "X-Verax-Document-Id": params.documentId,
  };
}

export function wantsJsonResponse(request: Request): boolean {
  try {
    const url = new URL(request.url);
    const output = url.searchParams.get("output")?.trim().toLowerCase();
    if (output === "json") return true;
    if (output === "markdown" || output === "md") return false;
  } catch {
    // Abaikan kegagalan parse URL
  }
  const accept = (request.headers.get("accept") || "").toLowerCase();
  if (!accept) return false;
  if (accept.includes("text/markdown")) return false;
  if (accept.includes("application/json")) return true;
  return false;
}

export async function getPublicEditorialManifest(baseUrl: string) {
  const manifest = loadRawEditorialManifest();
  const dbDesks = await db.desk.findMany({
    select: { slug: true, name: true, description: true, isActive: true, sortOrder: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const dbDeskMap = new Map(dbDesks.map((d) => [d.slug, d]));

  const coreModules = CORE_MODULES.map((m) => {
    const parsed = parseFrontmatterMarkdown(m.publicFile);
    return {
      slug: m.slug,
      documentId: parsed.documentId || m.documentId,
      title: parsed.title || m.title,
      version: parsed.version,
      status: parsed.status,
      lastReviewed: parsed.lastReviewed,
      sha256: parsed.sha256,
      url: `${baseUrl}/editorial/core/${m.slug}`,
      jsonUrl: `${baseUrl}/editorial/core/${m.slug}?output=json`,
    };
  });

  const desks = manifest.desks.map((d) => {
    const dbRow = dbDeskMap.get(d.slug);
    const activeInDb = dbRow ? dbRow.isActive : false;
    const parsed = parseFrontmatterMarkdown(d.profileDocument);
    return {
      slug: d.slug,
      name: dbRow?.name || d.name,
      sortOrder: dbRow?.sortOrder ?? d.sortOrder,
      isActive: activeInDb,
      systemDescription: dbRow?.description || d.systemDescription,
      documentId: parsed.documentId || d.documentId,
      title: parsed.title,
      version: parsed.version,
      status: parsed.status,
      sha256: parsed.sha256,
      preferredSourceTypes: d.preferredSourceTypes,
      url: `${baseUrl}/editorial/desks/${d.slug}`,
      jsonUrl: `${baseUrl}/editorial/desks/${d.slug}?output=json`,
    };
  });

  const formats = manifest.formats.map((f) => {
    const parsed = parseFrontmatterMarkdown(f.profileDocument);
    const formatLower = f.code.toLowerCase();
    return {
      code: f.code,
      systemLabel: f.systemLabel,
      documentId: parsed.documentId || f.documentId,
      title: parsed.title,
      version: parsed.version,
      status: parsed.status,
      sha256: parsed.sha256,
      eligibleOrigins: f.eligibleOrigins,
      ...(f.pendingAuthorizationOrigins?.length ? { pendingAuthorizationOrigins: f.pendingAuthorizationOrigins } : {}),
      ...(f.conditionalOrigins?.length ? { conditionalOrigins: f.conditionalOrigins } : {}),
      disallowedOrigins: f.disallowedOrigins,
      ...(f.availabilityNote ? { availabilityNote: f.availabilityNote } : {}),
      ...(f.preconditionSummary ? { preconditionSummary: f.preconditionSummary } : {}),
      requiresOpinionDisclaimer: f.requiresOpinionDisclaimer,
      recommendedWordRange: f.recommendedWordRange,
      url: `${baseUrl}/editorial/formats/${formatLower}`,
      jsonUrl: `${baseUrl}/editorial/formats/${formatLower}?output=json`,
    };
  });

  const operations = OPERATION_MODULES.map((op) => {
    const parsed = parseFrontmatterMarkdown(op.publicFile);
    return {
      slug: op.slug,
      documentId: parsed.documentId || op.documentId,
      title: parsed.title || op.title,
      version: parsed.version,
      status: parsed.status,
      sha256: parsed.sha256,
      url: `${baseUrl}/editorial/operations/${op.slug}`,
      jsonUrl: `${baseUrl}/editorial/operations/${op.slug}?output=json`,
    };
  });

  const approval = buildApprovalMetadata(manifest);

  return {
    ...approval,
    authoredDate: manifest.authoredDate,
    lastReviewed: manifest.lastReviewed,
    architecture: manifest.architecture,
    institutionalStatusNote: manifest.institutionalStatusNote,
    checksumSpecification: manifest.checksumSpecification,
    discovery: {
      manifestUrl: `${baseUrl}/editorial/manifest.json`,
      coreBundleUrl: `${baseUrl}/editorial/core`,
      contextResolverUrl: `${baseUrl}/editorial/context`,
      contextTemplate: `${baseUrl}/editorial/context?desk={deskSlug}&format={FORMAT}&channel=INGESTION_API&coreMode=compact`,
      capabilitiesUrl: `${baseUrl}/api/internal/v1/capabilities`,
      openApiUrl: `${baseUrl}/openapi.json`,
      agentWellKnownUrl: `${baseUrl}/.well-known/verax-agent.json`,
      developersUrl: `${baseUrl}/developers`,
    },
    loadingProtocol: {
      mode: "selective_by_desk_and_format",
      recommendedContextEndpoint: `${baseUrl}/editorial/context`,
      coreModes: ["compact", "full"],
      supportedOutputParameters: ["json", "markdown", "md"],
      failClosedOnInactiveOrUnknownDesk: true,
      mustNotCrossLoadUnassignedDesksOrFormats: true,
      note: "Gunakan GET /editorial/context?desk=<slug>&format=<FORMAT> agar agen hanya memuat prinsip universal Verax, tepat satu profil desk aktif, tepat satu profil format, serta parameter konteks penugasan Layer D. Gunakan ?output=json|markdown|md (atau Accept header) dan ETag / If-None-Match untuk caching 304.",
    },
    layeredArchitecture: manifest.layeredArchitecture,
    normativeKeywords: manifest.normativeKeywords,
    conflictResolutionHierarchy: manifest.conflictResolutionHierarchy,
    coreModules,
    desks,
    formats,
    operations,
    originPolicies: {
      NEWSROOM: {
        allowedFormats: ARTICLE_FORMATS,
        canPublishDirectly: false,
        note: "Penelaahan tetap melalui alur kerja redaksi menuju persetujuan eksklusif CHIEF_EDITOR.",
      },
      CONTRIBUTOR: {
        allowedFormats: CONTRIBUTOR_ALLOWED_FORMATS,
        disallowedFormats: ["NEWS"],
        aiUsagePolicy: "Hanya diperbolehkan sebagai alat bantu teknis (assistive/none) dengan pengungkapan wajib; draf yang seluruhnya dihasilkan generator otomatis ditolak.",
        revisionChannel: "Portal kontributor eksternal hanya mendukung revisi naskah milik sendiri sesuai format yang diizinkan (non-NEWS).",
      },
      INGESTION_API: {
        allowedFormats: INGESTION_ALLOWED_FORMATS,
        pendingAuthorizationFormats: INGESTION_PENDING_FORMATS,
        conditionalFormats: Object.keys(INGESTION_CONDITIONAL_FORMAT_RULES),
        conditionalRules: INGESTION_CONDITIONAL_FORMAT_RULES,
        disallowedFormats: INGESTION_PENDING_FORMATS,
        aiInvolvementEnum: AI_INVOLVEMENTS,
        initialArticleStatus: "DRAFT",
        initialSubmissionStatus: "SUBMITTED",
        initialSourceVerificationStatus: "UNVERIFIED",
        canPublish: false,
        revisionResubmissionApiAvailable: false,
        revisionFeedbackExposedViaStatusApi: false,
        note: "API eksternal bersifat submit-only. Format NEWS ditahan sementara (fail-closed HTTP 422 FORMAT_PENDING_AUTHORIZATION) menunggu pengesahan resmi Pemimpin Redaksi. Format FEATURE dan INTERVIEW bersifat bersyarat (memerlukan bukti rujukan wawancara/observasi dan verificationNotes).",
      },
    },
    rulesIndex: manifest.rulesIndex,
    rubricIndex: manifest.rubricIndex,
    systemContract: {
      validContentBlockTypes: ["paragraph", "heading", "quote", "list", "image", "note", "qa"],
      sourceTypes: SOURCE_TYPES,
      aiInvolvements: AI_INVOLVEMENTS,
      publishGates: [
        "GATE_NO_KEY_SOURCES",
        "GATE_SOURCE_VERIFICATION",
        "GATE_EMPTY_CONTENT",
        "GATE_NO_DECK",
        "GATE_AI_DISCLOSURE",
        "GATE_BYLINE_UNCONFIRMED",
      ],
      endpoints: {
        capabilities: `${baseUrl}/api/internal/v1/capabilities`,
        validate: `${baseUrl}/api/internal/v1/ai-submissions/validate`,
        submit: `${baseUrl}/api/internal/v1/ai-submissions`,
        status: `${baseUrl}/api/internal/v1/ai-submissions/{submissionId}`,
      },
    },
    revisionHistory: manifest.revisionHistory,
  };
}

export function getCoreModuleDocument(slug: string, baseUrl: string) {
  const manifest = loadRawEditorialManifest();
  const meta = CORE_MODULES.find((m) => m.slug === slug);
  if (!meta) return null;

  const parsed = parseFrontmatterMarkdown(meta.publicFile);
  const resourceUrl = `${baseUrl}/editorial/core/${meta.slug}`;
  const approval = buildApprovalMetadata(manifest);

  const markdown =
    buildMarkdownPreviewHeader({
      standardId: manifest.standardId,
      semanticVersion: manifest.semanticVersion,
      status: manifest.status,
      effectiveDate: manifest.effectiveDate,
      documentId: parsed.documentId || meta.documentId,
      title: parsed.title,
      resourceUrl,
      sha256: parsed.sha256,
    }) + parsed.body;

  return {
    manifest,
    ...approval,
    documentId: parsed.documentId || meta.documentId,
    slug: meta.slug,
    title: parsed.title,
    version: parsed.version,
    documentStatus: parsed.status,
    scope: parsed.scope,
    lastReviewed: parsed.lastReviewed,
    resourceUrl,
    sha256: parsed.sha256,
    markdown,
    rawBody: parsed.body,
  };
}

function buildCompactUniversalCoreMarkdown(baseUrl: string, manifest: RawEditorialManifest): string {
  const approval = buildApprovalMetadata(manifest);
  const moduleRows = CORE_MODULES.map((m) => {
    const parsed = parseFrontmatterMarkdown(m.publicFile);
    return `| \`${parsed.documentId}\` | ${m.title} | \`${baseUrl}/editorial/core/${m.slug}\` |`;
  }).join("\n");

  return [
    `## Lapisan A (Layer A): Identitas dan Prinsip Universal Verax Press (Ringkas Terlacak)`,
    "",
    `- **Standar:** \`${manifest.standardId}\` versi \`${manifest.semanticVersion}\` (Status: \`${manifest.status}\`, Berlaku Mengikat: \`${approval.isBindingEffectivePolicy}\`, Tanggal Efektif: \`null\`).`,
    `- **Identitas & Batas Kelembagaan:** Verax Press adalah nama kerja media digital independen percontohan (*Ex Fontibus Veritas*). Belum berbadan hukum pers, belum terverifikasi Dewan Pers, dan belum terdaftar sebagai PSE.`,
    `- **Kata Kunci Normatif:** \`WAJIB\` (MUST), \`DILARANG\` (MUST NOT), \`DIANJURKAN\` (SHOULD), \`OPSIONAL\` (MAY).`,
    "",
    "### Rujukan Kanonik Modul Inti (Layer A)",
    "",
    "| Document ID | Judul Modul | URL Publik Baca-Saja |",
    "|---|---|---|",
    moduleRows,
    "",
    "### Sepuluh Prinsip Jurnalistik Universal (`VERAX-CORE-PRINCIPLES-02`)",
    "1. **`VERAX-R01` (WAJIB) Akurasi Faktual:** Setiap nama, jabatan, angka, tanggal, pasal, putusan, dan kutipan langsung diuji terhadap sumber berwenang.",
    "2. **`VERAX-R02` (WAJIB/DILARANG) Independensi Editorial:** Bebas tekanan komersial/politik; materi komersial tidak boleh menyaru sebagai liputan independen.",
    "3. **`VERAX-R03` (WAJIB) Kelengkapan Kontekstual:** Sertakan kronologi, cakupan aturan, pengecualian pasal, atau angka pembanding yang utuh.",
    "4. **`VERAX-R04` (WAJIB/DILARANG) Proporsionalitas:** Bobot judul, `deck`, dan pembahasan seimbang dengan bukti; dilarang melebih-lebihkan sampel kecil.",
    "5. **`VERAX-R05` (WAJIB) Keberimbangan & Kesempatan Tanggapan:** Tuduhan serius atau kritik spesifik wajib meminta konfirmasi pihak terdampak dan menjelaskan status upayanya secara jujur.",
    "6. **`VERAX-R06` (DILARANG/WAJIB) Kejujuran Intelektual:** Dilarang *cherry-picking* atau *strawman*; hadirkan argumen/bukti tandingan terkuat secara adil.",
    "7. **`VERAX-R07` (WAJIB) Pemisahan Lima Kategori Epistemik:** Pisahkan tegas antara **Fakta**, **Dugaan** (penanda *diduga/menurut dakwaan*), **Interpretasi/Analisis**, **Opini** (khusus format `OPINION` atau kutipan narasumber), dan **Prediksi** (bersyarat, bukan kepastian).",
    "8. **`VERAX-R08` (WAJIB) Transparansi Ketidakpastian:** Nyatakan keterbatasan bukti, perbedaan data instansi, atau tahap perkara yang masih berjalan secara gamblang.",
    "9. **`VERAX-R09` (WAJIB) Bahasa Bertanggung Jawab:** Istilah hukum/teknis akurat sesuai definisi resmi, bebas label stigmatisasi.",
    "10. **`VERAX-R10` (WAJIB) Penghormatan Pihak Terdampak:** Lindungi identitas anak, korban kekerasan seksual, saksi rentan, dan warga biasa non-publik.",
    "",
    "### Inti Protokol Verifikasi & Anti-Fabrikasi (`VERAX-CORE-RESEARCH-03`)",
    "- **Hierarki Sumber (5 Tingkat):** Tingkat 1 `OFFICIAL`/`DOCUMENT` primer -> Tingkat 2 `DATA`/`PRIMARY` riset asli -> Tingkat 3 `INTERVIEW` langsung (Agen AI dilarang mengeklaim wawancara) -> Tingkat 4 `SECONDARY` media kredibel (dilarang menjadi rujukan tunggal amar putusan/pasal) -> Tingkat 5 sumber terbatas (hanya dengan penanda keterbatasan terang).",
    "- **Pemetaan Klaim (`supports`):** Setiap rujukan harus menyebut klaim spesifik beserta pasal/bagian/halaman yang ditopang, beserta `publishedAt` dan `accessedAt` ISO 8601 yang valid.",
    "- **Uji Tujuh Titik:** (1) Keaslian domain/penerbit, (2) Tanggal & versi terbaru dokumen, (3) Konteks pasal utuh, (4) Redaksi verbatim asli, (5) Metodologi & periode data, (6) Dokumen/tafsir tandingan, (7) *Claim-source entailment* nyata.",
    "- **Delapan Larangan Fabrikasi (DILARANG MUTLAK):** Jangan pernah mengarang sumber atau URL tebakan, dokumen/nomor regulasi fiktif, kutipan/wawancara fiktif, tindakan penyidikan tanpa bukti dokumen, atribusi resmi palsu, manipulasi korelasi menjadi kausalitas, pengacakan kronologi, atau spekulasi yang ditulis sebagai fakta.",
    "- **Aset Visual:** Setiap aset wajib mencatat `creator`, `license`, `permissionEvidence` bila perlu, dan `caption` faktual; gambar sintetis AI tidak boleh menyaru sebagai foto dokumentasi nyata.",
    "",
    "### Inti Etika dan Kepatuhan Hukum Indonesia (`VERAX-CORE-ETHICS-04`)",
    "- **Kewaspadaan Hukum Indonesia:** Jaga asas praduga tak bersalah pada perkara pidana, hindari tuduhan pencemaran tanpa dasar putusan/dokumen resmi, lindungi data pribadi warga biasa, serta hormati hak cipta dan larangan plagiarisme atau *cosmetic rewriting*.",
    "- **Byline & Keterlibatan AI:** Agen AI wajib mendeklarasikan `aiInvolvement` (`none`, `assistive`, `substantive`) secara jujur; draf masuk dengan placeholder byline, penetapan byline publik akhir hanya oleh meja redaksi manusia, dan agen AI dilarang mengatur status publikasi.",
    "",
    "### Standar Penulisan Anti-AI & Disiplin Bahasa (`VERAX-CORE-STYLE-05`)",
    "- **Larangan Tanda Em Dash dan Tanda Pisah Ganda (DILARANG):** Dilarang keras menggunakan tanda pisah em dash atau tanda pisah ganda dalam teks artikel maupun salinan sistem, kecuali berada di dalam kutipan verbatim narasumber atau dokumen resmi autentik. Gunakan koma, titik dua, tanda kurung, atau kalimat terpisah.",
    "- **Kosakata Terlarang (Banned AI Vocabulary):** Dilarang memakai kata klise generik AI bahasa Inggris (delve, unlock, elevate, empower, harness, foster, streamline, revolutionize, showcase, usher in, spearhead, navigate, transcend, leverage, seamless, cutting-edge, robust, next-level, game-changer, pivotal, testament, tapestry, beacon, paramount, bespoke, multifaceted, crucial, dynamic, journey, landscape sebagai metafora, realm, sphere, arena, horizon) dan bahasa Indonesia (hadir untuk, merevolusi, menjembatani, ekosistem di luar konteks biologi, menjadi bukti nyata, garda terdepan, wadah, wahana, penting untuk dicatat bahwa, tidak hanya... melainkan juga...).",
    "- **Larangan Paralelisme Negatif (DILARANG):** Dilarang menggunakan formula perbandingan artifisial seperti 'Bukan sekadar X, melainkan Y' atau 'Bukan hanya X, tapi Y'. Sampaikan gagasan secara lugas dan deklaratif.",
    "- **Larangan Pola Tiga Serangkai yang Dipaksakan (DILARANG):** Dilarang memaksakan rima tiga kata sifat atau tiga kata benda (forced rule of three, misal akurasi, independensi, dan integritas) demi efek retoris semu.",
    "- **Variasi Ritme Kalimat (Burstiness):** Wajib menghadirkan variasi panjang kalimat dan ritme yang wajar. Padukan kalimat pendek yang mengunci gagasan utama dengan kalimat penjelas yang lebih panjang dan kaya konteks. Hindari susunan alinea dengan struktur kalimat yang seragam dan steril.",
    "- **Larangan Emoji Dekoratif (DILARANG):** Dilarang menyematkan emoji dekoratif pada judul, subjudul, maupun butir daftar artikel.",
    "- **Kejujuran Faktual Nol Fabrikasi (WAJIB):** Dilarang mengarang metrik, status hukum, kutipan narasumber, atau klaim yang belum teruji secara faktual. Seluruh naskah wajib berpegang pada fakta yang dapat dibuktikan dari sumber primer terpercaya.",
    "- **Batas Keras Non-Evasion:** Dilarang menurunkan mutu bahasa demi mengakali detektor AI (non-evasion), dilarang menyisipkan salah ketik buatan, dan dilarang merusak keaslian kutipan verbatim serta istilah baku disiplin ilmu.",
  ].join("\n");
}

export function getCoreBundle(baseUrl: string, mode: CoreMode = "full") {
  const manifest = loadRawEditorialManifest();
  const approval = buildApprovalMetadata(manifest);
  const resourceUrl = mode === "compact" ? `${baseUrl}/editorial/core?mode=compact` : `${baseUrl}/editorial/core`;

  const modules = CORE_MODULES.map((m) => {
    const parsed = parseFrontmatterMarkdown(m.publicFile);
    return {
      slug: m.slug,
      documentId: parsed.documentId || m.documentId,
      title: parsed.title || m.title,
      version: parsed.version,
      status: parsed.status,
      lastReviewed: parsed.lastReviewed,
      sha256: parsed.sha256,
      url: `${baseUrl}/editorial/core/${m.slug}`,
      body: parsed.body,
    };
  });

  const combinedBody =
    mode === "compact"
      ? buildCompactUniversalCoreMarkdown(baseUrl, manifest)
      : modules
          .map((m) => `<!-- MODULE: ${m.documentId} -->\n\n${m.body}`)
          .join("\n\n---\n\n");

  const combinedSha = computeSha256(combinedBody);
  const documentId = mode === "compact" ? "VERAX-CORE-BUNDLE-COMPACT" : "VERAX-CORE-BUNDLE-FULL";
  const markdown =
    buildMarkdownPreviewHeader({
      standardId: manifest.standardId,
      semanticVersion: manifest.semanticVersion,
      status: manifest.status,
      effectiveDate: manifest.effectiveDate,
      documentId,
      title: "Bundel Prinsip dan Identitas Universal Verax Press (Layer A)",
      resourceUrl,
      sha256: combinedSha,
    }) + combinedBody;

  return {
    manifest,
    ...approval,
    mode,
    documentId,
    title: "Bundel Prinsip dan Identitas Universal Verax Press (Layer A)",
    scope: "core",
    resourceUrl,
    sha256: combinedSha,
    modules: modules.map(({ body: _omit, ...rest }) => ({
      ...rest,
      ...(mode === "full" ? { bodyMarkdown: _omit } : {}),
    })),
    compactSummaryMarkdown: mode === "compact" ? combinedBody : undefined,
    bodyMarkdown: combinedBody,
    markdown,
  };
}

export async function getDeskProfileDocument(slugParam: string, baseUrl: string) {
  const manifest = loadRawEditorialManifest();
  const slug = slugParam.trim().toLowerCase();
  const manifestDesk = manifest.desks.find((d) => d.slug === slug);
  if (!manifestDesk) {
    return {
      ok: false as const,
      status: 404,
      code: "DESK_NOT_FOUND",
      error: `Profil desk "${slugParam}" tidak ditemukan dalam basis pengetahuan editorial Verax Press.`,
      manifest,
    };
  }

  const dbDesk = await db.desk.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, description: true, isActive: true, sortOrder: true },
  });

  if (!dbDesk || !dbDesk.isActive) {
    return {
      ok: false as const,
      status: 422,
      code: "DESK_REJECTED",
      error: `Desk "${slugParam}" sedang tidak aktif atau belum tersedia di sistem.`,
      manifest,
    };
  }

  const parsed = parseFrontmatterMarkdown(manifestDesk.profileDocument);
  const resourceUrl = `${baseUrl}/editorial/desks/${dbDesk.slug}`;
  const approval = buildApprovalMetadata(manifest);

  const markdown =
    buildMarkdownPreviewHeader({
      standardId: manifest.standardId,
      semanticVersion: manifest.semanticVersion,
      status: manifest.status,
      effectiveDate: manifest.effectiveDate,
      documentId: parsed.documentId || manifestDesk.documentId,
      title: parsed.title,
      resourceUrl,
      sha256: parsed.sha256,
    }) + parsed.body;

  return {
    ok: true as const,
    manifest,
    ...approval,
    documentId: parsed.documentId || manifestDesk.documentId,
    slug: dbDesk.slug,
    name: dbDesk.name,
    title: parsed.title,
    scope: parsed.scope,
    isActive: dbDesk.isActive,
    sortOrder: dbDesk.sortOrder,
    systemDescription: dbDesk.description || manifestDesk.systemDescription,
    preferredSourceTypes: manifestDesk.preferredSourceTypes,
    requiredCoreUrl: `${baseUrl}/editorial/core`,
    version: parsed.version,
    documentStatus: parsed.status,
    lastReviewed: parsed.lastReviewed,
    resourceUrl,
    sha256: parsed.sha256,
    markdown,
    rawBody: parsed.body,
  };
}

export function getFormatProfileDocument(formatParam: string, baseUrl: string) {
  const manifest = loadRawEditorialManifest();
  const normalizedCode = formatParam.trim().toUpperCase();
  const manifestFormat = manifest.formats.find((f) => f.code === normalizedCode);

  if (!manifestFormat || !ARTICLE_FORMATS.includes(normalizedCode as never)) {
    return {
      ok: false as const,
      status: 404,
      code: "FORMAT_NOT_FOUND",
      error: `Profil format "${formatParam}" tidak dikenali oleh sistem Verax Press.`,
      manifest,
    };
  }

  const parsed = parseFrontmatterMarkdown(manifestFormat.profileDocument);
  const formatSlug = normalizedCode.toLowerCase();
  const resourceUrl = `${baseUrl}/editorial/formats/${formatSlug}`;
  const approval = buildApprovalMetadata(manifest);

  const markdown =
    buildMarkdownPreviewHeader({
      standardId: manifest.standardId,
      semanticVersion: manifest.semanticVersion,
      status: manifest.status,
      effectiveDate: manifest.effectiveDate,
      documentId: parsed.documentId || manifestFormat.documentId,
      title: parsed.title,
      resourceUrl,
      sha256: parsed.sha256,
    }) + parsed.body;

  return {
    ok: true as const,
    manifest,
    ...approval,
    documentId: parsed.documentId || manifestFormat.documentId,
    code: manifestFormat.code,
    slug: formatSlug,
    title: parsed.title,
    scope: parsed.scope,
    systemLabel: FORMAT_LABELS[manifestFormat.code as keyof typeof FORMAT_LABELS] || manifestFormat.systemLabel,
    eligibleOrigins: manifestFormat.eligibleOrigins,
    ...(manifestFormat.pendingAuthorizationOrigins?.length
      ? { pendingAuthorizationOrigins: manifestFormat.pendingAuthorizationOrigins }
      : {}),
    ...(manifestFormat.conditionalOrigins?.length ? { conditionalOrigins: manifestFormat.conditionalOrigins } : {}),
    disallowedOrigins: manifestFormat.disallowedOrigins,
    ...(manifestFormat.availabilityNote ? { availabilityNote: manifestFormat.availabilityNote } : {}),
    ...(manifestFormat.preconditionSummary ? { preconditionSummary: manifestFormat.preconditionSummary } : {}),
    requiresOpinionDisclaimer: manifestFormat.requiresOpinionDisclaimer,
    recommendedWordRange: manifestFormat.recommendedWordRange,
    requiredCoreUrl: `${baseUrl}/editorial/core`,
    version: parsed.version,
    documentStatus: parsed.status,
    lastReviewed: parsed.lastReviewed,
    resourceUrl,
    sha256: parsed.sha256,
    markdown,
    rawBody: parsed.body,
  };
}

export function getOperationDocument(slugParam: string, baseUrl: string) {
  const manifest = loadRawEditorialManifest();
  const slug = slugParam.trim().toLowerCase();
  const meta = OPERATION_MODULES.find((op) => op.slug === slug);
  if (!meta) return null;

  const parsed = parseFrontmatterMarkdown(meta.publicFile);
  const resourceUrl = `${baseUrl}/editorial/operations/${meta.slug}`;
  const approval = buildApprovalMetadata(manifest);

  const markdown =
    buildMarkdownPreviewHeader({
      standardId: manifest.standardId,
      semanticVersion: manifest.semanticVersion,
      status: manifest.status,
      effectiveDate: manifest.effectiveDate,
      documentId: parsed.documentId || meta.documentId,
      title: parsed.title,
      resourceUrl,
      sha256: parsed.sha256,
    }) + parsed.body;

  return {
    manifest,
    ...approval,
    documentId: parsed.documentId || meta.documentId,
    slug: meta.slug,
    title: parsed.title,
    version: parsed.version,
    documentStatus: parsed.status,
    scope: parsed.scope,
    lastReviewed: parsed.lastReviewed,
    resourceUrl,
    sha256: parsed.sha256,
    markdown,
    rawBody: parsed.body,
  };
}

export interface AssignmentContextInput {
  desk?: string | null;
  format?: string | null;
  channel?: string | null;
  coreMode?: string | null;
  topic?: string | null;
  mainEditorialQuestion?: string | null;
  intendedAudience?: string | null;
  proposedAngle?: string | null;
  availableSources?: string | null;
  currentnessAndChronology?: string | null;
  geographicInstitutionalContext?: string | null;
  requestedDepth?: string | null;
  knownInformationGaps?: string | null;
}

export async function resolveEditorialContext(input: AssignmentContextInput, baseUrl: string) {
  const manifest = loadRawEditorialManifest();
  const approval = buildApprovalMetadata(manifest);

  const rawDesk = input.desk?.trim() || "";
  const rawFormat = input.format?.trim() || "";
  const rawChannel = (input.channel?.trim() || "INGESTION_API").toUpperCase();
  const rawCoreMode = (input.coreMode?.trim() || "compact").toLowerCase();

  if (!rawDesk || !rawFormat) {
    const missing: Array<{ path: string; code: string; message: string }> = [];
    if (!rawDesk) {
      missing.push({
        path: "desk",
        code: "REQUIRED",
        message: "Parameter query `desk` wajib diisi (misal: hukum-keadilan, teknologi-kebijakan, nasional-publik).",
      });
    }
    if (!rawFormat) {
      missing.push({
        path: "format",
        code: "REQUIRED",
        message: "Parameter query `format` wajib diisi (NEWS, OPINION, ANALYSIS, EXPLAINER, FEATURE, INTERVIEW).",
      });
    }
    return {
      ok: false as const,
      status: 422,
      code: "VALIDATION_ERROR",
      error: "Parameter wajib `desk` dan `format` harus disertakan untuk resolusi konteks editorial.",
      details: missing,
      manifest,
    };
  }

  if (!["INGESTION_API", "NEWSROOM", "CONTRIBUTOR"].includes(rawChannel)) {
    return {
      ok: false as const,
      status: 422,
      code: "VALIDATION_ERROR",
      error: `Nilai channel "${rawChannel}" tidak valid. Pilih salah satu: INGESTION_API, NEWSROOM, CONTRIBUTOR.`,
      details: [{ path: "channel", code: "INVALID_ENUM", message: "Channel harus bernilai INGESTION_API, NEWSROOM, atau CONTRIBUTOR." }],
      manifest,
    };
  }

  if (!["compact", "full"].includes(rawCoreMode)) {
    return {
      ok: false as const,
      status: 422,
      code: "VALIDATION_ERROR",
      error: `Nilai coreMode "${rawCoreMode}" tidak valid. Gunakan compact atau full.`,
      details: [{ path: "coreMode", code: "INVALID_ENUM", message: "coreMode harus bernilai compact atau full." }],
      manifest,
    };
  }

  const channel = rawChannel as EditorialChannel;
  const coreMode = rawCoreMode as CoreMode;

  // Fail closed on unknown or inactive desk
  const deskResult = await getDeskProfileDocument(rawDesk, baseUrl);
  if (!deskResult.ok) {
    return {
      ok: false as const,
      status: 422,
      code: "DESK_REJECTED",
      error: `Desk "${rawDesk}" tidak ditemukan atau tidak aktif. Periksa daftar desk aktif pada GET /editorial/manifest.json atau GET /api/internal/v1/capabilities.`,
      details: [{ path: "desk", code: deskResult.code, message: deskResult.error }],
      manifest,
    };
  }

  // Fail closed on unknown format
  const formatResult = getFormatProfileDocument(rawFormat, baseUrl);
  if (!formatResult.ok) {
    return {
      ok: false as const,
      status: 422,
      code: "FORMAT_REJECTED",
      error: `Format "${rawFormat}" tidak dikenali. Format sah: ${ARTICLE_FORMATS.join(", ")}.`,
      details: [{ path: "format", code: formatResult.code, message: formatResult.error }],
      manifest,
    };
  }

  // Enforce origin-specific eligibility strictly (e.g., CONTRIBUTOR cannot use NEWS; INGESTION_API holds NEWS pending authorization)
  if (!formatResult.eligibleOrigins.includes(channel)) {
    const isPendingIngestionNews =
      channel === "INGESTION_API" && INGESTION_PENDING_FORMATS.includes(formatResult.code as never);
    return {
      ok: false as const,
      status: 422,
      code: "FORMAT_REJECTED",
      error: isPendingIngestionNews
        ? `Format "${formatResult.code}" sedang ditahan sementara pada jalur "${channel}" menunggu otorisasi resmi Pemimpin Redaksi karena standar masih berstatus PROPOSED.`
        : `Format "${formatResult.code}" tidak diizinkan untuk jalur "${channel}". Jalur yang berhak: ${formatResult.eligibleOrigins.join(", ")}.`,
      details: [
        {
          path: "format",
          code: isPendingIngestionNews ? "FORMAT_PENDING_AUTHORIZATION" : "ORIGIN_FORMAT_DISALLOWED",
          message: isPendingIngestionNews
            ? `Pengiriman format ${formatResult.code} oleh Ingestion API ditahan sementara (fail-closed) hingga pengesahan resmi.`
            : `Jalur ${channel} tidak diperbolehkan mengajukan format ${formatResult.code}.`,
        },
      ],
      manifest,
    };
  }

  // Build Layer A (Universal Core), Layer B (Single Desk), Layer C (Single Format), Layer D (Assignment)
  const coreBundle = getCoreBundle(baseUrl, coreMode);

  const assignmentFields = {
    desk: deskResult.slug,
    format: formatResult.code,
    topic: input.topic?.trim() || null,
    mainEditorialQuestion: input.mainEditorialQuestion?.trim() || null,
    intendedAudience: input.intendedAudience?.trim() || null,
    proposedAngle: input.proposedAngle?.trim() || null,
    availableSources: input.availableSources?.trim() || null,
    currentnessAndChronology: input.currentnessAndChronology?.trim() || null,
    geographicInstitutionalContext: input.geographicInstitutionalContext?.trim() || null,
    requestedDepth: input.requestedDepth?.trim() || null,
    knownInformationGaps: input.knownInformationGaps?.trim() || null,
  };

  const optionalLayerDKeys = [
    "topic",
    "mainEditorialQuestion",
    "intendedAudience",
    "proposedAngle",
    "availableSources",
    "currentnessAndChronology",
    "geographicInstitutionalContext",
    "requestedDepth",
    "knownInformationGaps",
  ] as const;

  const missingParameters = optionalLayerDKeys.filter((k) => !assignmentFields[k]);
  const providedParameters = optionalLayerDKeys.filter((k) => Boolean(assignmentFields[k]));

  const conditionalFormatRule =
    channel === "INGESTION_API" &&
    formatResult.code in INGESTION_CONDITIONAL_FORMAT_RULES
      ? INGESTION_CONDITIONAL_FORMAT_RULES[formatResult.code as keyof typeof INGESTION_CONDITIONAL_FORMAT_RULES]
      : null;

  const channelPolicySummary =
    channel === "INGESTION_API"
      ? {
          origin: "INGESTION_API",
          publicationAuthorized: false,
          autoPublish: false,
          initialArticleStatus: "DRAFT",
          initialSubmissionStatus: "SUBMITTED",
          initialSourceVerificationStatus: "UNVERIFIED",
          pendingAuthorizationFormats: INGESTION_PENDING_FORMATS,
          ...(conditionalFormatRule ? { conditionalPreconditions: conditionalFormatRule } : {}),
          requiresDeckBeforePublish: true,
          humanBylineRequiredBeforePublish: true,
          aiInvolvementAllowed: AI_INVOLVEMENTS,
          canClaimFieldReportingOrInterviews: false,
          rules: [
            "Naskah wajib dikirim ke POST /api/internal/v1/ai-submissions dengan status awal articleStatus=DRAFT, submissionStatus=SUBMITTED, dan placeholder byline hingga ditetapkan redaktur manusia.",
            "Seluruh sumber otomatis berstatus UNVERIFIED dan hanya dapat diverifikasi oleh Pemimpin Redaksi manusia.",
            "Agen AI dilarang mengeklaim telah melakukan wawancara langsung atau pengamatan lapangan.",
            ...(conditionalFormatRule ? [`Prasyarat format ${formatResult.code}: ${conditionalFormatRule.requirementSummary}`] : []),
            "Nyatakan aiInvolvement secara jujur (none tanpa aiUsageNote; assistive opsional; substantive sangat dianjurkan mengisi aiUsageNote <= 600 karakter) dan selalu sertakan deck.",
          ],
        }
      : channel === "CONTRIBUTOR"
        ? {
            origin: "CONTRIBUTOR",
            publicationAuthorized: false,
            autoPublish: false,
            initialArticleStatus: "DRAFT",
            initialSourceVerificationStatus: "UNVERIFIED",
            requiresDeckBeforePublish: true,
            aiInvolvementAllowed: ["none", "assistive"],
            canClaimFieldReportingOrInterviews: true,
            rules: [
              "Jalur Kontributor Eksternal mendukung OPINION, ANALYSIS, EXPLAINER, FEATURE, dan INTERVIEW (NEWS ditutup).",
              "AI hanya diperbolehkan untuk fungsi asistif teknis dengan pengungkapan jujur; naskah yang dihasilkan penuh oleh AI ditolak.",
            ],
          }
        : {
            origin: "NEWSROOM",
            publicationAuthorized: false,
            autoPublish: false,
            initialArticleStatus: "DRAFT",
            initialSourceVerificationStatus: "UNVERIFIED",
            requiresDeckBeforePublish: true,
            aiInvolvementAllowed: AI_INVOLVEMENTS,
            canClaimFieldReportingOrInterviews: true,
            rules: [
              "Jalur ruang redaksi internal tetap melewati tahapan uji fakta dan persetujuan akhir CHIEF_EDITOR sebelum terbit.",
            ],
          };

  const workflowParsed = parseFrontmatterMarkdown("operations/VERAX_AI_AGENT_WORKFLOW.md");

  const coreSourceDocuments =
    coreMode === "compact"
      ? [
          {
            layer: "A_CORE_COMPACT",
            documentId: coreBundle.documentId,
            title: coreBundle.title,
            version: manifest.semanticVersion,
            status: manifest.status,
            url: coreBundle.resourceUrl,
            sha256: coreBundle.sha256,
            derivedFromModules: coreBundle.modules.map((m) => ({
              documentId: m.documentId,
              url: m.url,
              sha256: m.sha256,
            })),
          },
        ]
      : coreBundle.modules.map((m) => ({
          layer: "A_CORE",
          documentId: m.documentId,
          title: m.title,
          version: m.version,
          status: m.status,
          url: m.url,
          sha256: m.sha256,
        }));

  const sourceDocuments = [
    ...coreSourceDocuments,
    {
      layer: "B_DESK",
      documentId: deskResult.documentId,
      title: deskResult.name,
      version: deskResult.version,
      status: deskResult.documentStatus,
      url: deskResult.resourceUrl,
      sha256: deskResult.sha256,
    },
    {
      layer: "C_FORMAT",
      documentId: formatResult.documentId,
      title: `${formatResult.code} (${formatResult.systemLabel})`,
      version: formatResult.version,
      status: formatResult.documentStatus,
      url: formatResult.resourceUrl,
      sha256: formatResult.sha256,
    },
    {
      layer: "D_OPERATIONS_REF",
      documentId: workflowParsed.documentId || "VERAX-OPS-WORKFLOW-01",
      title: workflowParsed.title,
      version: workflowParsed.version || manifest.semanticVersion,
      status: workflowParsed.status || manifest.status,
      url: `${baseUrl}/editorial/operations/ai-workflow`,
      sha256: workflowParsed.sha256,
    },
  ];

  const layerDMarkdown = [
    `## Lapisan D (Layer D): Konteks Penugasan Spesifik & Batas Jalur`,
    "",
    `- **Jalur Pengiriman (\`channel\`):** \`${channel}\` | **Hak Publikasi Otomatis:** \`false\``,
    `- **Desk Aktif Terpilih:** \`${deskResult.slug}\` (${deskResult.name}, \`${deskResult.documentId}\`)`,
    `- **Format Terpilih:** \`${formatResult.code}\` (${formatResult.systemLabel}, \`${formatResult.documentId}\`)`,
    `- **Prioritas Sumber Desk Ini:** \`${deskResult.preferredSourceTypes.join(", ")}\``,
    "",
    "### Ketentuan Jalur Aktif",
    ...channelPolicySummary.rules.map((r) => `- ${r}`),
    "",
    "### 11 Parameter Penugasan (`Layer D`)",
    "",
    "| Parameter | Nilai Aktif |",
    "|---|---|",
    `| \`desk\` | \`${assignmentFields.desk}\` |`,
    `| \`format\` | \`${assignmentFields.format}\` |`,
    ...optionalLayerDKeys.map(
      (k) => `| \`${k}\` | ${assignmentFields[k] ?? "*Belum diisi dalam permintaan konteks (perlukan dari redaktur atau catat pada verificationNotes / knownInformationGaps)*"} |`,
    ),
    "",
    "### Aturan Penanganan Celah Informasi (WAJIB)",
    "Jika suatu unsur penting dalam `knownInformationGaps` tidak terdapat pada `availableSources`, `DILARANG` menebak, melakukan interpolasi statistik, atau membuat kutipan maupun URL rekaan. Persempit klaim secara jujur sebatas bukti yang terbaca penuh, lalu catat celah yang belum terjawab secara terbuka di naskah (`VERAX-R08`) dan pada kolom `verificationNotes`.",
  ].join("\n");

  const combinedBody = [
    coreMode === "compact"
      ? (coreBundle.compactSummaryMarkdown ?? "")
      : CORE_MODULES.map((m) => {
          const parsed = parseFrontmatterMarkdown(m.publicFile);
          return `<!-- LAYER A MODULE: ${parsed.documentId} -->\n\n${parsed.body}`;
        }).join("\n\n---\n\n"),
    "",
    "---",
    "",
    `<!-- LAYER B SINGLE DESK: ${deskResult.documentId} -->`,
    "",
    deskResult.rawBody,
    "",
    "---",
    "",
    `<!-- LAYER C SINGLE FORMAT: ${formatResult.documentId} -->`,
    "",
    formatResult.rawBody,
    "",
    "---",
    "",
    layerDMarkdown,
  ].join("\n");

  const combinedSha = computeSha256(combinedBody);
  const contextResourceUrl = `${baseUrl}/editorial/context?desk=${encodeURIComponent(deskResult.slug)}&format=${encodeURIComponent(formatResult.code)}&channel=${encodeURIComponent(channel)}&coreMode=${encodeURIComponent(coreMode)}`;

  const composedMarkdown =
    buildMarkdownPreviewHeader({
      standardId: manifest.standardId,
      semanticVersion: manifest.semanticVersion,
      status: manifest.status,
      effectiveDate: manifest.effectiveDate,
      documentId: `VERAX-CTX-${deskResult.slug.toUpperCase()}-${formatResult.code}`,
      title: `Konteks Editorial Selektif: ${deskResult.name} (${deskResult.slug}) + ${formatResult.code}`,
      resourceUrl: contextResourceUrl,
      sha256: combinedSha,
    }) + combinedBody;

  return {
    ok: true as const,
    manifest,
    ...approval,
    documentId: `VERAX-CTX-${deskResult.slug.toUpperCase()}-${formatResult.code}`,
    title: `Konteks Editorial Selektif: ${deskResult.name} (${deskResult.slug}) + ${formatResult.code}`,
    scope: "context",
    resourceUrl: contextResourceUrl,
    sha256: combinedSha,
    compositionFormula: manifest.layeredArchitecture.compositionFormula,
    selection: {
      desk: deskResult.slug,
      format: formatResult.code,
      channel,
      coreMode,
      crossLoadedUnrelatedDesks: false,
      crossLoadedUnrelatedFormats: false,
    },
    originPolicy: channelPolicySummary,
    sourceDocuments,
    layers: {
      universalCore: {
        mode: coreMode,
        documentId: coreBundle.documentId,
        sha256: coreBundle.sha256,
        moduleCount: coreBundle.modules.length,
        modules: coreBundle.modules.map((m) => ({
          slug: m.slug,
          documentId: m.documentId,
          url: m.url,
          sha256: m.sha256,
        })),
        markdown:
          coreMode === "compact"
            ? coreBundle.compactSummaryMarkdown
            : CORE_MODULES.map((m) => parseFrontmatterMarkdown(m.publicFile).body).join("\n\n---\n\n"),
      },
      deskProfile: {
        slug: deskResult.slug,
        name: deskResult.name,
        documentId: deskResult.documentId,
        version: deskResult.version,
        status: deskResult.documentStatus,
        preferredSourceTypes: deskResult.preferredSourceTypes,
        url: deskResult.resourceUrl,
        sha256: deskResult.sha256,
        markdown: deskResult.rawBody,
      },
      formatProfile: {
        code: formatResult.code,
        systemLabel: formatResult.systemLabel,
        documentId: formatResult.documentId,
        version: formatResult.version,
        status: formatResult.documentStatus,
        eligibleOrigins: formatResult.eligibleOrigins,
        disallowedOrigins: formatResult.disallowedOrigins,
        requiresOpinionDisclaimer: formatResult.requiresOpinionDisclaimer,
        recommendedWordRange: formatResult.recommendedWordRange,
        url: formatResult.resourceUrl,
        sha256: formatResult.sha256,
        markdown: formatResult.rawBody,
      },
      assignmentContext: {
        ...assignmentFields,
        providedParameters,
        missingParameters,
      },
    },
    bodyMarkdown: combinedBody,
    composedMarkdown,
  };
}

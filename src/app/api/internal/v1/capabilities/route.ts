// GET / HEAD /api/internal/v1/capabilities: Capabilities Discovery Endpoint (Fase 3).
// Menyediakan informasi metadata kapabilitas API beserta tautan basis pengetahuan editorial modular.

import { NextResponse } from "next/server";
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
  getSystemEnvironment,
  resolveRequestBaseUrl,
} from "@/lib/domain/constants";
import { editorialMethodNotAllowedResponse } from "@/lib/editorial/http";
import { buildApprovalMetadata, loadRawEditorialManifest } from "@/lib/editorial/standards";
import { generateRequestId } from "@/lib/request-logger";

async function handleRead(request: Request, isHead: boolean) {
  const requestId = request.headers.get("x-request-id") || generateRequestId();
  try {
    const baseUrl = resolveRequestBaseUrl(request);
    const activeDesks = await db.desk.findMany({
      where: { isActive: true },
      select: {
        name: true,
        slug: true,
        description: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    const manifest = loadRawEditorialManifest();
    const editorialApproval = buildApprovalMetadata(manifest);
    const environment = getSystemEnvironment();

    const body = {
      apiVersion: "1.0.0",
      platform: "Verax Press",
      environment,
      baseUrl,
      editorialStandard: {
        standardId: editorialApproval.standardId,
        semanticVersion: editorialApproval.semanticVersion,
        status: editorialApproval.status,
        effectiveDate: editorialApproval.effectiveDate,
        isBindingEffectivePolicy: editorialApproval.isBindingEffectivePolicy,
        approvalNotice: editorialApproval.approvalNotice,
        checksumSpecification: manifest.checksumSpecification,
        manifestUrl: `${baseUrl}/editorial/manifest.json`,
        coreBundleUrl: `${baseUrl}/editorial/core`,
        contextUrlTemplate: `${baseUrl}/editorial/context?desk={deskSlug}&format={FORMAT}&channel=INGESTION_API&coreMode=compact`,
      },
      capabilities: {
        submission: true,
        validation: true,
        submissionStatus: true,
        editorialContextResolution: true,
        revisionSubmission: false,
        revisionFeedbackExposure: false,
        publication: false,
        editorialApproval: false,
      },
      allowedFormats: INGESTION_ALLOWED_FORMATS,
      pendingAuthorizationFormats: INGESTION_PENDING_FORMATS,
      conditionalFormats: Object.keys(INGESTION_CONDITIONAL_FORMAT_RULES),
      conditionalFormatRules: INGESTION_CONDITIONAL_FORMAT_RULES,
      formats: ARTICLE_FORMATS.map((code) => {
        const isPending = INGESTION_PENDING_FORMATS.includes(code);
        const isConditional = code in INGESTION_CONDITIONAL_FORMAT_RULES;
        return {
          code,
          label: FORMAT_LABELS[code],
          editorialProfileUrl: `${baseUrl}/editorial/formats/${code.toLowerCase()}`,
          eligibleOrigins: isPending ? ["NEWSROOM"] : ["NEWSROOM", "INGESTION_API", "CONTRIBUTOR"],
          pendingAuthorizationOrigins: isPending ? ["INGESTION_API"] : [],
          ingestionStatus: isPending
            ? "pending_authorization"
            : isConditional
              ? "conditional"
              : "allowed",
          ...(isConditional
            ? {
                conditionalPreconditions:
                  INGESTION_CONDITIONAL_FORMAT_RULES[
                    code as keyof typeof INGESTION_CONDITIONAL_FORMAT_RULES
                  ],
              }
            : {}),
          requiresOpinionDisclaimer: code === "OPINION",
        };
      }),
      desks: activeDesks.map((d) => ({
        name: d.name,
        slug: d.slug,
        description: d.description,
        editorialProfileUrl: `${baseUrl}/editorial/desks/${d.slug}`,
      })),
      sourceTypes: SOURCE_TYPES,
      aiInvolvements: AI_INVOLVEMENTS,
      contentBlockTypes: ["paragraph", "heading", "quote", "list", "image", "note", "qa"],
      documentation: {
        developers: "/developers",
        openapi: "/openapi.json",
        llms: "/llms.txt",
        llmsFull: "/llms-full.txt",
        discovery: "/.well-known/verax-agent.json",
        editorialManifest: "/editorial/manifest.json",
        editorialCore: "/editorial/core",
        editorialContext: "/editorial/context",
      },
      limits: {
        rateLimitPerMinute: 12,
        validateRateLimitPerMinute: 30,
        maxTitleLength: 200,
        maxDeckLength: 400,
        maxContentBlocks: 300,
        maxSourcesCount: 40,
        maxImagesCount: 20,
        maxTagsCount: 10,
        maxVerificationNotesLength: 3000,
        maxAiUsageNoteLength: 1000,
        recommendedAiUsageNoteMaxLength: 600,
      },
      policySeparation: {
        contributorPortal: {
          allowedFormats: CONTRIBUTOR_ALLOWED_FORMATS,
          disallowedFormats: ["NEWS"],
          aiPolicy: "AI hanya sebagai alat bantu teknis dengan pengungkapan wajib; draf otomatis penuh ditolak.",
        },
        aiIngestionApi: {
          allowedFormats: INGESTION_ALLOWED_FORMATS,
          pendingAuthorizationFormats: INGESTION_PENDING_FORMATS,
          conditionalFormats: Object.keys(INGESTION_CONDITIONAL_FORMAT_RULES),
          disallowedFormats: INGESTION_PENDING_FORMATS,
          initialArticleStatus: "DRAFT",
          initialSubmissionStatus: "SUBMITTED",
          initialSourceVerificationStatus: "UNVERIFIED",
          aiPolicy:
            "Wajib menyatakan aiInvolvement (none, assistive, substantive); tetap tanpa hak publikasi. Format NEWS ditahan sementara (422 FORMAT_PENDING_AUTHORIZATION); FEATURE dan INTERVIEW bersifat bersyarat.",
        },
      },
    };

    return new NextResponse(isHead ? null : JSON.stringify(body), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=60, s-maxage=300",
        "x-request-id": requestId,
      },
    });
  } catch (error) {
    console.error("[Capabilities API] Gagal memuat metadata:", error);
    return new NextResponse(
      isHead
        ? null
        : JSON.stringify({
            error: "Gagal memuat kapabilitas sistem.",
            code: "INTERNAL_ERROR",
            requestId,
          }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "x-request-id": requestId,
        },
      },
    );
  }
}

function methodNotAllowed(request: Request, method: string) {
  return editorialMethodNotAllowedResponse(method, request, {
    allow: "GET, HEAD",
    message: `Metode ${method} tidak diizinkan pada endpoint kapabilitas. Gunakan GET atau HEAD.`,
  });
}

export async function GET(request: Request) {
  return handleRead(request, false);
}

export async function HEAD(request: Request) {
  return handleRead(request, true);
}

export async function POST(request: Request) { return methodNotAllowed(request, "POST"); }
export async function PUT(request: Request) { return methodNotAllowed(request, "PUT"); }
export async function PATCH(request: Request) { return methodNotAllowed(request, "PATCH"); }
export async function DELETE(request: Request) { return methodNotAllowed(request, "DELETE"); }

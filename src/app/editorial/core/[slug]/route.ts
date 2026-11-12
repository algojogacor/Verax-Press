import { resolveRequestBaseUrl } from "@/lib/domain/constants";
import {
  editorialErrorResponse,
  editorialJsonResponse,
  editorialMarkdownResponse,
  editorialMethodNotAllowedResponse,
  invalidOutputFormatErrorResponse,
  parseEditorialOutputFormat,
} from "@/lib/editorial/http";
import { CORE_MODULES, getCoreModuleDocument } from "@/lib/editorial/standards";

type Params = { params: Promise<{ slug: string }> };

async function handle(request: Request, { params }: Params, isHead: boolean) {
  const outputCheck = parseEditorialOutputFormat(request);
  if (!outputCheck.ok) {
    return invalidOutputFormatErrorResponse(outputCheck.invalidOutput, outputCheck.allowedValues, isHead);
  }

  const { slug } = await params;
  const baseUrl = resolveRequestBaseUrl(request);
  const doc = getCoreModuleDocument(slug.trim().toLowerCase(), baseUrl);

  if (!doc) {
    return editorialErrorResponse({
      status: 404,
      code: "EDITORIAL_DOCUMENT_NOT_FOUND",
      error: `Dokumen inti "${slug}" tidak ditemukan. Slug valid: ${CORE_MODULES.map((m) => m.slug).join(", ")}.`,
      isHead,
    });
  }

  if (outputCheck.wantsJson) {
    const { manifest, rawBody, ...rest } = doc;
    return editorialJsonResponse({
      data: { ...rest, bodyMarkdown: rawBody },
      documentId: doc.documentId,
      manifest,
      isHead,
      request,
    });
  }

  return editorialMarkdownResponse({
    markdown: doc.markdown,
    documentId: doc.documentId,
    manifest: doc.manifest,
    isHead,
    request,
  });
}

export async function GET(request: Request, ctx: Params) {
  return handle(request, ctx, false);
}

export async function HEAD(request: Request, ctx: Params) {
  return handle(request, ctx, true);
}

export async function POST() { return editorialMethodNotAllowedResponse("POST"); }
export async function PUT() { return editorialMethodNotAllowedResponse("PUT"); }
export async function PATCH() { return editorialMethodNotAllowedResponse("PATCH"); }
export async function DELETE() { return editorialMethodNotAllowedResponse("DELETE"); }

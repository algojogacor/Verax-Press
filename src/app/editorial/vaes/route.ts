import { resolveRequestBaseUrl } from "@/lib/domain/constants";
import {
  editorialErrorResponse,
  editorialJsonResponse,
  editorialMarkdownResponse,
  editorialMethodNotAllowedResponse,
  invalidOutputFormatErrorResponse,
  parseEditorialOutputFormat,
} from "@/lib/editorial/http";
import { getOperationDocument } from "@/lib/editorial/standards";

async function handle(request: Request, isHead: boolean) {
  const outputCheck = parseEditorialOutputFormat(request);
  if (!outputCheck.ok) {
    return invalidOutputFormatErrorResponse(outputCheck.invalidOutput, outputCheck.allowedValues, isHead);
  }

  const baseUrl = resolveRequestBaseUrl(request);
  const doc = getOperationDocument("vaes", baseUrl);

  if (!doc) {
    return editorialErrorResponse({
      status: 404,
      code: "EDITORIAL_DOCUMENT_NOT_FOUND",
      error: "Dokumen operasional VAES tidak ditemukan.",
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

export async function GET(request: Request) {
  return handle(request, false);
}

export async function HEAD(request: Request) {
  return handle(request, true);
}

export async function POST() { return editorialMethodNotAllowedResponse("POST"); }
export async function PUT() { return editorialMethodNotAllowedResponse("PUT"); }
export async function PATCH() { return editorialMethodNotAllowedResponse("PATCH"); }
export async function DELETE() { return editorialMethodNotAllowedResponse("DELETE"); }

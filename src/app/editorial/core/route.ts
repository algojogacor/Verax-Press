import { resolveRequestBaseUrl } from "@/lib/domain/constants";
import {
  editorialErrorResponse,
  editorialJsonResponse,
  editorialMarkdownResponse,
  editorialMethodNotAllowedResponse,
  invalidOutputFormatErrorResponse,
  parseEditorialOutputFormat,
} from "@/lib/editorial/http";
import { getCoreBundle, type CoreMode } from "@/lib/editorial/standards";

async function handle(request: Request, isHead: boolean) {
  const outputCheck = parseEditorialOutputFormat(request);
  if (!outputCheck.ok) {
    return invalidOutputFormatErrorResponse(outputCheck.invalidOutput, outputCheck.allowedValues, isHead);
  }

  const url = new URL(request.url);
  const rawMode = (url.searchParams.get("mode")?.trim() || "full").toLowerCase();
  if (rawMode !== "compact" && rawMode !== "full") {
    return editorialErrorResponse({
      status: 422,
      code: "VALIDATION_ERROR",
      error: `Nilai mode "${rawMode}" tidak valid. Gunakan full atau compact.`,
      details: [{ path: "mode", code: "INVALID_ENUM", message: "Gunakan mode=full atau mode=compact." }],
      isHead,
    });
  }

  const baseUrl = resolveRequestBaseUrl(request);
  const bundle = getCoreBundle(baseUrl, rawMode as CoreMode);

  if (outputCheck.wantsJson) {
    const { manifest: _omitManifest, ...jsonPayload } = bundle;
    return editorialJsonResponse({
      data: jsonPayload,
      documentId: bundle.documentId,
      manifest: bundle.manifest,
      isHead,
      request,
    });
  }

  return editorialMarkdownResponse({
    markdown: bundle.markdown,
    documentId: bundle.documentId,
    manifest: bundle.manifest,
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

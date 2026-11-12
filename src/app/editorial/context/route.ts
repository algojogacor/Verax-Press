import { resolveRequestBaseUrl } from "@/lib/domain/constants";
import {
  editorialErrorResponse,
  editorialJsonResponse,
  editorialMarkdownResponse,
  editorialMethodNotAllowedResponse,
  invalidOutputFormatErrorResponse,
  parseEditorialOutputFormat,
} from "@/lib/editorial/http";
import { resolveEditorialContext } from "@/lib/editorial/standards";

async function handle(request: Request, isHead: boolean) {
  const outputCheck = parseEditorialOutputFormat(request);
  if (!outputCheck.ok) {
    return invalidOutputFormatErrorResponse(outputCheck.invalidOutput, outputCheck.allowedValues, isHead);
  }

  const url = new URL(request.url);
  const sp = url.searchParams;

  const baseUrl = resolveRequestBaseUrl(request);
  const result = await resolveEditorialContext(
    {
      desk: sp.get("desk"),
      format: sp.get("format"),
      channel: sp.get("channel"),
      coreMode: sp.get("coreMode"),
      topic: sp.get("topic"),
      mainEditorialQuestion: sp.get("mainEditorialQuestion"),
      intendedAudience: sp.get("intendedAudience"),
      proposedAngle: sp.get("proposedAngle"),
      availableSources: sp.get("availableSources"),
      currentnessAndChronology: sp.get("currentnessAndChronology"),
      geographicInstitutionalContext: sp.get("geographicInstitutionalContext"),
      requestedDepth: sp.get("requestedDepth"),
      knownInformationGaps: sp.get("knownInformationGaps"),
    },
    baseUrl,
  );

  if (!result.ok) {
    return editorialErrorResponse({
      status: result.status,
      code: result.code,
      error: result.error,
      details: result.details,
      manifest: result.manifest,
      isHead,
    });
  }

  if (outputCheck.wantsJson) {
    const { ok: _ok, manifest, ...rest } = result;
    return editorialJsonResponse({
      data: rest,
      documentId: result.documentId,
      manifest,
      isHead,
      request,
    });
  }

  return editorialMarkdownResponse({
    markdown: result.composedMarkdown,
    documentId: result.documentId,
    manifest: result.manifest,
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

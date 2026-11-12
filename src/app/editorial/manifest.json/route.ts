import { resolveRequestBaseUrl } from "@/lib/domain/constants";
import {
  editorialJsonResponse,
  editorialMethodNotAllowedResponse,
  invalidOutputFormatErrorResponse,
  parseEditorialOutputFormat,
} from "@/lib/editorial/http";
import { getPublicEditorialManifest, loadRawEditorialManifest } from "@/lib/editorial/standards";

async function handle(request: Request, isHead: boolean) {
  const outputCheck = parseEditorialOutputFormat(request, { jsonOnly: true });
  if (!outputCheck.ok) {
    return invalidOutputFormatErrorResponse(outputCheck.invalidOutput, outputCheck.allowedValues, isHead);
  }
  const baseUrl = resolveRequestBaseUrl(request);
  const manifest = loadRawEditorialManifest();
  const data = await getPublicEditorialManifest(baseUrl);
  return editorialJsonResponse({
    data,
    documentId: `${manifest.standardId}-MANIFEST`,
    manifest,
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

import { resolveRequestBaseUrl } from "@/lib/domain/constants";
import {
  editorialJsonResponse,
  editorialMethodNotAllowedResponse,
  invalidOutputFormatErrorResponse,
  parseEditorialOutputFormat,
} from "@/lib/editorial/http";
import { getVaesJsonDocument } from "@/lib/editorial/standards";

async function handle(request: Request, isHead: boolean) {
  const outputCheck = parseEditorialOutputFormat(request, { jsonOnly: true });
  if (!outputCheck.ok) {
    return invalidOutputFormatErrorResponse(outputCheck.invalidOutput, outputCheck.allowedValues, isHead);
  }

  const baseUrl = resolveRequestBaseUrl(request);
  const vaesDoc = getVaesJsonDocument(baseUrl);

  return editorialJsonResponse({
    data: vaesDoc.data,
    documentId: vaesDoc.documentId,
    manifest: vaesDoc.manifest,
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

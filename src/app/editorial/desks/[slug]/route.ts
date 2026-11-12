import { resolveRequestBaseUrl } from "@/lib/domain/constants";
import {
  editorialErrorResponse,
  editorialJsonResponse,
  editorialMarkdownResponse,
  editorialMethodNotAllowedResponse,
  invalidOutputFormatErrorResponse,
  parseEditorialOutputFormat,
} from "@/lib/editorial/http";
import { getDeskProfileDocument } from "@/lib/editorial/standards";

type Params = { params: Promise<{ slug: string }> };

async function handle(request: Request, { params }: Params, isHead: boolean) {
  const outputCheck = parseEditorialOutputFormat(request);
  if (!outputCheck.ok) {
    return invalidOutputFormatErrorResponse(outputCheck.invalidOutput, outputCheck.allowedValues, isHead);
  }

  const { slug } = await params;
  const baseUrl = resolveRequestBaseUrl(request);
  const result = await getDeskProfileDocument(slug, baseUrl);

  if (!result.ok) {
    return editorialErrorResponse({
      status: result.status,
      code: result.code,
      error: result.error,
      manifest: result.manifest,
      isHead,
    });
  }

  if (outputCheck.wantsJson) {
    const { ok: _ok, manifest, rawBody, ...rest } = result;
    return editorialJsonResponse({
      data: { ...rest, bodyMarkdown: rawBody },
      documentId: result.documentId,
      manifest,
      isHead,
      request,
    });
  }

  return editorialMarkdownResponse({
    markdown: result.markdown,
    documentId: result.documentId,
    manifest: result.manifest,
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

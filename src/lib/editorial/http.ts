import { NextResponse } from "next/server";
import {
  buildEditorialHttpHeaders,
  isBindingStatus,
  loadRawEditorialManifest,
  wantsJsonResponse,
  type RawEditorialManifest,
} from "@/lib/editorial/standards";
import { generateRequestId } from "@/lib/request-logger";

export type OutputParseResult =
  | { ok: true; wantsJson: boolean }
  | { ok: false; invalidOutput: string; allowedValues: string[] };

export function parseEditorialOutputFormat(
  request: Request,
  options?: { jsonOnly?: boolean },
): OutputParseResult {
  try {
    const url = new URL(request.url);
    if (url.searchParams.has("output")) {
      const raw = url.searchParams.get("output") ?? "";
      const normalized = raw.trim().toLowerCase();
      if (options?.jsonOnly) {
        if (normalized === "json") {
          return { ok: true, wantsJson: true };
        }
        return { ok: false, invalidOutput: raw, allowedValues: ["json"] };
      }
      if (normalized === "json") {
        return { ok: true, wantsJson: true };
      }
      if (normalized === "markdown" || normalized === "md") {
        return { ok: true, wantsJson: false };
      }
      return { ok: false, invalidOutput: raw, allowedValues: ["json", "markdown", "md"] };
    }
  } catch {
    // Abaikan kegagalan parse URL dan gunakan header Accept
  }

  return {
    ok: true,
    wantsJson: options?.jsonOnly ? true : wantsJsonResponse(request),
  };
}

function normalizeEtagValue(tag: string): string {
  const trimmed = tag.trim();
  return trimmed.startsWith("W/") ? trimmed.slice(2).trim() : trimmed;
}

export function isIfNoneMatchSatisfied(request: Request, currentEtag: string): boolean {
  const header = request.headers.get("if-none-match");
  if (!header) return false;
  const trimmed = header.trim();
  if (!trimmed) return false;
  if (trimmed === "*") return true;

  const target = normalizeEtagValue(currentEtag);
  return trimmed
    .split(",")
    .map((candidate) => normalizeEtagValue(candidate))
    .some((candidate) => candidate.length > 0 && candidate === target);
}

function buildNotModifiedHeaders(headers: Record<string, string>): Record<string, string> {
  return {
    "ETag": headers["ETag"],
    "Vary": headers["Vary"],
    "Cache-Control": headers["Cache-Control"],
    "X-Robots-Tag": headers["X-Robots-Tag"],
    "X-Verax-Standard-Id": headers["X-Verax-Standard-Id"],
    "X-Verax-Standard-Version": headers["X-Verax-Standard-Version"],
    "X-Verax-Standard-Status": headers["X-Verax-Standard-Status"],
    "X-Verax-Standard-Effective": headers["X-Verax-Standard-Effective"],
    "X-Verax-Document-Id": headers["X-Verax-Document-Id"],
  };
}

export function invalidOutputFormatErrorResponse(
  invalidOutput: string,
  allowedValues: string[],
  isHead = false,
): NextResponse {
  return editorialErrorResponse({
    status: 422,
    code: "VALIDATION_ERROR",
    error: `Nilai parameter output "${invalidOutput}" tidak valid. Gunakan salah satu: ${allowedValues.join(", ")}.`,
    details: [
      {
        path: "output",
        code: "INVALID_ENUM",
        message: `Parameter output hanya mendukung nilai: ${allowedValues.join(", ")}.`,
      },
    ],
    isHead,
  });
}

export function editorialJsonResponse(params: {
  data: unknown;
  status?: number;
  documentId: string;
  manifest?: RawEditorialManifest;
  isHead?: boolean;
  request?: Request;
}): NextResponse {
  const manifest = params.manifest ?? loadRawEditorialManifest();
  const status = params.status ?? 200;
  const body = JSON.stringify(params.data, null, 2);
  const headers = buildEditorialHttpHeaders({
    manifest,
    documentId: params.documentId,
    contentType: "application/json; charset=utf-8",
    etagSource: body,
  });

  if (status === 200 && params.request && isIfNoneMatchSatisfied(params.request, headers.ETag)) {
    return new NextResponse(null, {
      status: 304,
      headers: buildNotModifiedHeaders(headers),
    });
  }

  return new NextResponse(params.isHead ? null : body, {
    status,
    headers,
  });
}

export function editorialMarkdownResponse(params: {
  markdown: string;
  status?: number;
  documentId: string;
  manifest?: RawEditorialManifest;
  isHead?: boolean;
  request?: Request;
}): NextResponse {
  const manifest = params.manifest ?? loadRawEditorialManifest();
  const status = params.status ?? 200;
  const headers = buildEditorialHttpHeaders({
    manifest,
    documentId: params.documentId,
    contentType: "text/markdown; charset=utf-8",
    etagSource: params.markdown,
  });

  if (status === 200 && params.request && isIfNoneMatchSatisfied(params.request, headers.ETag)) {
    return new NextResponse(null, {
      status: 304,
      headers: buildNotModifiedHeaders(headers),
    });
  }

  return new NextResponse(params.isHead ? null : params.markdown, {
    status,
    headers,
  });
}

export function editorialErrorResponse(params: {
  status: number;
  code: string;
  error: string;
  details?: Array<{ path: string; code: string; message: string }>;
  documentId?: string;
  manifest?: RawEditorialManifest;
  isHead?: boolean;
  requestId?: string;
}): NextResponse {
  const manifest = params.manifest ?? loadRawEditorialManifest();
  const requestId = params.requestId ?? generateRequestId();
  const payload = {
    error: params.error,
    code: params.code,
    ...(params.details?.length ? { details: params.details } : {}),
    requestId,
    standardId: manifest.standardId,
    semanticVersion: manifest.semanticVersion,
    standardStatus: manifest.status,
    isBindingEffectivePolicy: isBindingStatus(manifest.status, manifest.effectiveDate),
  };
  const body = JSON.stringify(payload, null, 2);
  const baseHeaders = buildEditorialHttpHeaders({
    manifest,
    documentId: params.documentId ?? "VERAX-EDITORIAL-ERROR",
    contentType: "application/json; charset=utf-8",
    etagSource: body,
  });
  const { ETag: _omitEtag, ...headersWithoutEtag } = baseHeaders;
  return new NextResponse(params.isHead ? null : body, {
    status: params.status,
    headers: {
      ...headersWithoutEtag,
      "Cache-Control": "no-store",
      "x-request-id": requestId,
    },
  });
}

export function editorialMethodNotAllowedResponse(
  method: string,
  request?: Request,
  options?: { allow?: string; message?: string },
): NextResponse {
  const requestId = request?.headers.get("x-request-id") || generateRequestId();
  const allow = options?.allow ?? "GET, HEAD";
  const message =
    options?.message ??
    `Metode ${method} tidak diizinkan pada sumber daya ini. Gunakan ${allow}.`;
  let manifest: RawEditorialManifest | undefined;
  try {
    manifest = loadRawEditorialManifest();
  } catch {
    manifest = undefined;
  }

  return NextResponse.json(
    {
      error: message,
      code: "METHOD_NOT_ALLOWED",
      requestId,
      ...(manifest
        ? {
            standardId: manifest.standardId,
            semanticVersion: manifest.semanticVersion,
            standardStatus: manifest.status,
            isBindingEffectivePolicy: isBindingStatus(manifest.status, manifest.effectiveDate),
          }
        : {}),
    },
    {
      status: 405,
      headers: {
        "Allow": allow,
        "Vary": "Accept",
        "X-Robots-Tag": "noindex, nofollow",
        "Cache-Control": "no-store",
        "x-request-id": requestId,
      },
    },
  );
}

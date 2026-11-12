import { NextResponse } from "next/server";
import { getOpenApiSpec } from "@/lib/domain/api-docs";
import { resolveRequestBaseUrl } from "@/lib/domain/constants";
import { editorialMethodNotAllowedResponse } from "@/lib/editorial/http";

function handle(request: Request, isHead: boolean) {
  const baseUrl = resolveRequestBaseUrl(request);
  const spec = getOpenApiSpec(baseUrl);
  return new NextResponse(isHead ? null : JSON.stringify(spec), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=600",
    },
  });
}

function methodNotAllowed(request: Request, method: string) {
  return editorialMethodNotAllowedResponse(method, request, {
    allow: "GET, HEAD",
    message: `Metode ${method} tidak diizinkan. Gunakan GET atau HEAD.`,
  });
}

export async function GET(request: Request) { return handle(request, false); }
export async function HEAD(request: Request) { return handle(request, true); }
export async function POST(request: Request) { return methodNotAllowed(request, "POST"); }
export async function PUT(request: Request) { return methodNotAllowed(request, "PUT"); }
export async function PATCH(request: Request) { return methodNotAllowed(request, "PATCH"); }
export async function DELETE(request: Request) { return methodNotAllowed(request, "DELETE"); }

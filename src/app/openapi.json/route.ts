import { NextResponse } from "next/server";
import { getOpenApiSpec } from "@/lib/domain/api-docs";

export async function GET() {
  const spec = getOpenApiSpec();
  return NextResponse.json(spec, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=600",
    },
  });
}

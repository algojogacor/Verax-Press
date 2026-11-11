import { NextResponse } from "next/server";
import { getWellKnownAgentMetadata } from "@/lib/domain/api-docs";

export async function GET() {
  const metadata = getWellKnownAgentMetadata();
  return NextResponse.json(metadata, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=600",
    },
  });
}

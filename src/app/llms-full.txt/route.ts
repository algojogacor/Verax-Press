import { NextResponse } from "next/server";
import { getLlmsFullTxt } from "@/lib/domain/api-docs";

export async function GET() {
  const content = getLlmsFullTxt();
  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=600",
    },
  });
}

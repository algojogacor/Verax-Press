// Middleware proteksi halaman /studio (UX layer). Otorisasi sesungguhnya
// selalu diperiksa ulang di setiap API route (defense in depth).
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/studio/login")) {
    return NextResponse.next();
  }
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "verity-dev-secret-change-me",
  });
  if (!token) {
    const loginUrl = new URL("/studio/login", request.url);
    if (request.nextUrl.pathname !== "/studio") {
      loginUrl.searchParams.set("next", request.nextUrl.pathname);
    }
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/studio", "/studio/:path*"],
};

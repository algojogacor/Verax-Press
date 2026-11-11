// Middleware proteksi halaman internal /studio dan portal kontributor (UX layer).
// Otorisasi sesungguhnya selalu diperiksa ulang di setiap API route (defense in depth).
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rute publik di dalam ruang studio (login dan aktivasi undangan)
  if (pathname.startsWith("/studio/login") || pathname.startsWith("/studio/invitasi")) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "verity-dev-secret-change-me",
  });

  // 1. Proteksi Halaman Studio Internal (/studio/*)
  if (pathname.startsWith("/studio")) {
    if (!token) {
      const loginUrl = new URL("/studio/login", request.url);
      if (pathname !== "/studio") {
        loginUrl.searchParams.set("next", pathname);
      }
      return NextResponse.redirect(loginUrl);
    }

    // Hanya akun staf redaksi yang diizinkan mengakses studio
    if (token.accountType && token.accountType !== "STAFF") {
      return NextResponse.redirect(new URL("/kontributor/portal", request.url));
    }

    // Modul administratif khusus Pemimpin Redaksi
    const chiefOnlyPaths = [
      "/studio/staff",
      "/studio/applications",
      "/studio/audit",
      "/studio/api-clients",
      "/studio/complaints",
    ];

    const isChiefPath = chiefOnlyPaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    );

    if (isChiefPath && token.role !== "CHIEF_EDITOR") {
      return NextResponse.redirect(new URL("/studio", request.url));
    }

    return NextResponse.next();
  }

  // 2. Proteksi Halaman Portal Kontributor (/kontributor/*)
  if (pathname.startsWith("/kontributor/portal")) {
    if (!token) {
      const loginUrl = new URL("/kontributor/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Jika staf internal mencoba masuk ke portal kontributor, arahkan ke studio
    if (token.accountType === "STAFF") {
      return NextResponse.redirect(new URL("/studio", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/studio", "/studio/:path*", "/kontributor/portal", "/kontributor/portal/:path*"],
};

// Middleware kanonisasi host (308), header X-Robots-Tag untuk rute non-indeks,
// serta proteksi halaman internal /studio dan portal kontributor (UX layer).
// Otorisasi sesungguhnya selalu diperiksa ulang di setiap API route (defense in depth).
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  resolveCanonicalRedirectTarget,
  resolveXRobotsTag,
} from "@/lib/seo/constants";

function getMiddlewareSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SECURITY FATAL: NEXTAUTH_SECRET (or AUTH_SECRET) is required in production. Refusing to verify tokens with insecure default.",
      );
    }
    return "verity-dev-secret-change-me";
  }
  if (process.env.NODE_ENV === "production" && secret === "verity-dev-secret-change-me") {
    throw new Error(
      "SECURITY FATAL: Default development secret 'verity-dev-secret-change-me' is not permitted in production.",
    );
  }
  return secret;
}

function withRobotsHeader(response: NextResponse, pathname: string): NextResponse {
  const xRobotsTag = resolveXRobotsTag(pathname);
  if (xRobotsTag) {
    response.headers.set("X-Robots-Tag", xRobotsTag);
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Pengalihan permanen (308) untuk alias domain non-kanonik ke https://veraxpress.vercel.app
  if (process.env.VERCEL_ENV !== "preview") {
    const redirectTarget = resolveCanonicalRedirectTarget({
      forwardedHostHeader: request.headers.get("x-forwarded-host"),
      hostHeader: request.headers.get("host"),
      pathname,
      search,
    });
    if (redirectTarget) {
      return NextResponse.redirect(redirectTarget, 308);
    }
  }

  // Rute publik di dalam ruang studio (login dan aktivasi undangan) tidak perlu cek JWT
  if (pathname.startsWith("/studio/login") || pathname.startsWith("/studio/invitasi")) {
    return withRobotsHeader(NextResponse.next(), pathname);
  }

  const needsAuthCheck =
    pathname.startsWith("/studio") || pathname.startsWith("/kontributor/portal");

  if (!needsAuthCheck) {
    return withRobotsHeader(NextResponse.next(), pathname);
  }

  const token = await getToken({
    req: request,
    secret: getMiddlewareSecret(),
  });

  // 2. Proteksi Halaman Studio Internal (/studio/*)
  if (pathname.startsWith("/studio")) {
    if (!token) {
      const loginUrl = new URL("/studio/login", request.url);
      if (pathname !== "/studio") {
        loginUrl.searchParams.set("next", pathname);
      }
      return withRobotsHeader(NextResponse.redirect(loginUrl), pathname);
    }

    // Hanya akun staf redaksi yang diizinkan mengakses studio (fail-closed jika accountType hilang/asing)
    if (token.accountType !== "STAFF") {
      const fallbackPath = token.accountType === "CONTRIBUTOR" ? "/kontributor/portal" : "/studio/login";
      return withRobotsHeader(
        NextResponse.redirect(new URL(fallbackPath, request.url)),
        pathname,
      );
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
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );

    if (isChiefPath && token.role !== "CHIEF_EDITOR") {
      return withRobotsHeader(
        NextResponse.redirect(new URL("/studio", request.url)),
        pathname,
      );
    }

    return withRobotsHeader(NextResponse.next(), pathname);
  }

  // 3. Proteksi Halaman Portal Kontributor (/kontributor/portal/*)
  if (pathname.startsWith("/kontributor/portal")) {
    if (!token) {
      const loginUrl = new URL("/kontributor/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return withRobotsHeader(NextResponse.redirect(loginUrl), pathname);
    }
    // Jika staf internal mencoba masuk ke portal kontributor, arahkan ke studio
    if (token.accountType === "STAFF") {
      return withRobotsHeader(
        NextResponse.redirect(new URL("/studio", request.url)),
        pathname,
      );
    }
    return withRobotsHeader(NextResponse.next(), pathname);
  }

  return withRobotsHeader(NextResponse.next(), pathname);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};

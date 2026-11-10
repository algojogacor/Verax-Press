// Helper untuk API route handlers: session guard, error terstruktur, validasi Zod.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError, type ZodType } from "zod";
import { authOptions } from "@/lib/auth";
import type { Role, SessionUser } from "@/types/verity";

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function jsonError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Input tidak valid", code: "VALIDATION_ERROR", details: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 422 },
    );
  }
  console.error("[api] unhandled error:", error);
  return NextResponse.json({ error: "Terjadi kesalahan internal", code: "INTERNAL" }, { status: 500 });
}

/** Ambil session staf; lempar 401 bila tidak ada. */
export async function requireSession(): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new ApiError(401, "UNAUTHORIZED", "Anda harus masuk.");
  }
  return session.user as SessionUser;
}

/** Ambil session dan pastikan role termasuk daftar; 403 bila tidak. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireSession();
  if (!roles.includes(user.role)) {
    throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki izin untuk aksi ini.");
  }
  return user;
}

/** Validasi body JSON dengan Zod; 400 bila bukan JSON valid. */
export async function parseJsonBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError(400, "BAD_JSON", "Body harus JSON valid.");
  }
  return schema.parse(raw);
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

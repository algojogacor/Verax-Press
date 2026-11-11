// Helper untuk API route handlers: session guard, error terstruktur, validasi Zod.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ZodError, type ZodType } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { userHasPermission, type Permission } from "@/lib/domain/permissions";
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

/** Ambil session staf; verifikasi keberadaan dan keaktifan akun di basis data berwenang. */
export async function requireSession(): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new ApiError(401, "UNAUTHORIZED", "Anda harus masuk.");
  }

  const staff = await db.staffUser.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      canRiskEdit: true,
      canManageComplaints: true,
    },
  });

  if (!staff) {
    throw new ApiError(403, "FORBIDDEN", "Profil staf tidak ditemukan.");
  }

  if (staff.status !== "ACTIVE") {
    throw new ApiError(403, "FORBIDDEN", "Akun staf dinonaktifkan.");
  }

  return {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    role: staff.role as Role,
    canRiskEdit: staff.canRiskEdit,
    canManageComplaints: staff.canManageComplaints,
  };
}

/**
 * Evaluasi izin staf secara otoritatif dari record basis data.
 * Memverifikasi eksistensi akun, status aktif (ACTIVE), dan matriks izin domain.
 */
export async function verifyStaffUserPermission(
  client: { staffUser: any },
  userId: string | null | undefined,
  permission: Permission,
): Promise<SessionUser> {
  if (!userId) {
    throw new ApiError(401, "UNAUTHORIZED", "Anda harus masuk.");
  }

  const staff = await client.staffUser.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      canRiskEdit: true,
      canManageComplaints: true,
    },
  });

  if (!staff) {
    throw new ApiError(403, "FORBIDDEN", "Profil staf tidak ditemukan.");
  }

  if (staff.status !== "ACTIVE") {
    throw new ApiError(403, "FORBIDDEN", "Akun staf dinonaktifkan.");
  }

  const hasPerm = userHasPermission(
    {
      role: staff.role,
      canRiskEdit: staff.canRiskEdit ?? false,
      canManageComplaints: staff.canManageComplaints ?? false,
    },
    permission,
  );

  if (!hasPerm) {
    throw new ApiError(403, "FORBIDDEN", `Anda tidak memiliki izin ${permission}.`);
  }

  return {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    role: staff.role as Role,
    canRiskEdit: staff.canRiskEdit,
    canManageComplaints: staff.canManageComplaints,
  };
}

/** Ambil profil staf berwenang dari basis data; periksa status aktif dan izin domain. */
export async function requireStaffPermission(permission: Permission): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  return verifyStaffUserPermission(db, session?.user?.id, permission);
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

// NextAuth v4: autentikasi staf redaksi (CMS /studio).
// Membedakan tipe akun internal (STAFF) dan kontributor eksternal (CONTRIBUTOR).

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import type { Role } from "@/types/verity";
import { ROLES } from "@/lib/domain/constants";
import { writeAudit } from "@/lib/domain/audit";

function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SECURITY FATAL: NEXTAUTH_SECRET (or AUTH_SECRET) is required in production. Refusing to start with insecure default."
      );
    }
    return "verity-dev-secret-change-me";
  }
  if (process.env.NODE_ENV === "production" && secret === "verity-dev-secret-change-me") {
    throw new Error(
      "SECURITY FATAL: Default development secret 'verity-dev-secret-change-me' is not permitted in production."
    );
  }
  return secret;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 }, // 8 jam kerja redaksi
  secret: getAuthSecret(),
  pages: { signIn: "/studio/login" },
  providers: [
    CredentialsProvider({
      name: "Verax Press Newsroom",
      credentials: {
        email: { label: "Email atau Nama Pengguna", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const identifier = credentials.email.trim();
        const user =
          (await db.staffUser.findFirst({
            where: {
              OR: [
                { username: identifier },
                { username: identifier.toLowerCase() },
                { email: identifier },
                { email: identifier.toLowerCase() },
              ],
            },
          })) ??
          (
            await db.$queryRaw<
              Array<{
                id: string;
                username: string;
                email: string | null;
                name: string;
                role: string;
                status: string;
                passwordHash: string;
              }>
            >`SELECT id, username, email, name, role, status, passwordHash FROM StaffUser WHERE (username = ${identifier} COLLATE NOCASE OR (email IS NOT NULL AND email = ${identifier} COLLATE NOCASE)) LIMIT 1`
          )[0];

        // 1. Jika ditemukan akun StaffUser
        if (user) {
          if (user.status !== "ACTIVE") return null;
          if (!verifyPassword(credentials.password, user.passwordHash)) return null;

          await db.staffUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
          await writeAudit({
            actorType: "STAFF",
            actorId: user.id,
            actorLabel: user.username || user.email || user.name,
            action: "auth.login",
            targetType: "AUTH",
            targetId: user.id,
          });

          return {
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            role: (ROLES.includes(user.role as Role) ? user.role : "WRITER") as Role,
            accountType: "STAFF" as const,
          };
        }

        // 2. Jika tidak ditemukan pada StaffUser, cari di Contributor (Volunteer eksternal)
        const contributor =
          (await db.contributor.findFirst({
            where: {
              OR: [
                { username: identifier },
                { username: identifier.toLowerCase() },
                { email: identifier },
                { email: identifier.toLowerCase() },
              ],
            },
            include: { person: true },
          })) ??
          (
            await db.$queryRaw<
              Array<{
                id: string;
                username: string | null;
                email: string;
                status: string;
                passwordHash: string;
              }>
            >`SELECT id, username, email, status, passwordHash FROM Contributor WHERE (username = ${identifier} COLLATE NOCASE OR (email IS NOT NULL AND email = ${identifier} COLLATE NOCASE)) LIMIT 1`
          )[0];

        if (!contributor) return null;
        if (contributor.status !== "ACTIVE") return null;
        if (!verifyPassword(credentials.password, contributor.passwordHash)) return null;

        await db.contributor.update({ where: { id: contributor.id }, data: { lastLoginAt: new Date() } });
        await writeAudit({
          actorType: "CONTRIBUTOR",
          actorId: contributor.id,
          actorLabel: contributor.username || contributor.email,
          action: "auth.contributor_login",
          targetType: "AUTH",
          targetId: contributor.id,
        });

        const person =
          "person" in contributor && (contributor as any).person
            ? (contributor as any).person
            : await db.person.findUnique({ where: { contributorId: contributor.id } });

        const publicName = person?.publicName || contributor.username || contributor.email;

        return {
          id: contributor.id,
          name: publicName,
          username: contributor.username || "",
          email: contributor.email,
          role: "WRITER" as Role,
          accountType: "CONTRIBUTOR" as const,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as unknown as { role: Role }).role ?? "WRITER";
        token.username = (user as unknown as { username: string }).username ?? "";
        token.accountType = (user as unknown as { accountType: "STAFF" | "CONTRIBUTOR" }).accountType ?? "STAFF";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = (token.role as Role) ?? "WRITER";
        session.user.username = (token.username as string) ?? "";
        session.user.accountType = (token.accountType as "STAFF" | "CONTRIBUTOR") ?? "STAFF";
      }
      return session;
    },
  },
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      username: string;
      email: string | null;
      role: Role;
      accountType: "STAFF" | "CONTRIBUTOR";
    };
  }
  interface User {
    username?: string;
    role?: Role;
    accountType?: "STAFF" | "CONTRIBUTOR";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string;
    role?: Role;
    accountType?: "STAFF" | "CONTRIBUTOR";
  }
}

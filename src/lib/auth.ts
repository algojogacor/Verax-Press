// NextAuth v4 — khusus staf redaksi (CMS /studio). Kontributor eksternal (Tahap B)
// akan memakai auth terpisah sesuai arsitektur; API client TIDAK login lewat sini.

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
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.trim().toLowerCase();
        const user = await db.staffUser.findUnique({ where: { email } });
        // Pesan error generik + delay ringan via verify tetap konstan waktu.
        if (!user) return null;
        if (user.status !== "ACTIVE") return null;
        if (!verifyPassword(credentials.password, user.passwordHash)) return null;

        await db.staffUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        await writeAudit({
          actorType: "STAFF",
          actorId: user.id,
          actorLabel: user.email,
          action: "auth.login",
          targetType: "AUTH",
          targetId: user.id,
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: (ROLES.includes(user.role as Role) ? user.role : "VOLUNTEER") as Role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as unknown as { role: Role }).role ?? "VOLUNTEER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = (token.role as Role) ?? "VOLUNTEER";
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
      email: string;
      role: Role;
    };
  }
  interface User {
    role?: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
  }
}

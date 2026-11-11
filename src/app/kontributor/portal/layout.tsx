"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  FileText,
  PenSquare,
  User,
  LogOut,
  ExternalLink,
  BookOpen,
} from "lucide-react";

function PortalHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navItems = [
    { href: "/kontributor/portal", label: "Naskah Saya", icon: FileText, exact: true },
    { href: "/kontributor/portal/naskah/baru", label: "Tulis Naskah", icon: PenSquare, exact: false },
    { href: "/kontributor/portal/profil", label: "Profil & Byline", icon: User, exact: false },
  ];

  return (
    <header className="border-b border-verity-rule bg-verity-paper sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <div>
              <Link href="/kontributor/portal" className="flex items-baseline gap-2">
                <span className="font-serif font-bold text-xl tracking-tight text-verity-ink">
                  VERAX PRESS
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-verity-accent font-semibold px-2 py-0.5 rounded bg-verity-paper-warm border border-verity-rule">
                  KONTRIBUTOR
                </span>
              </Link>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                      isActive
                        ? "bg-verity-ink text-white font-semibold"
                        : "text-verity-ink-soft hover:text-verity-ink hover:bg-verity-paper-warm"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/pedoman-kontributor"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1 text-xs font-mono text-verity-ink-soft hover:text-verity-accent"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Pedoman</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </Link>

            <div className="h-4 w-px bg-verity-rule hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="text-xs font-serif text-verity-ink font-medium max-w-[140px] truncate hidden md:inline">
                {session?.user?.name || session?.user?.username || "Kontributor"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/kontributor/login" })}
                className="text-xs font-mono text-verity-ink-soft hover:text-rose-700 hover:bg-rose-50 h-8 px-2.5"
                title="Keluar dari sesi kontributor"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                <span className="hidden sm:inline">Keluar</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-verity-rule/60">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono ${
                  isActive
                    ? "bg-verity-ink text-white font-semibold"
                    : "text-verity-ink-soft hover:text-verity-ink"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}

function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-verity-paper-soft text-verity-ink flex flex-col justify-between">
      <div>
        <PortalHeader />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
      </div>

      <footer className="border-t border-verity-rule bg-verity-paper py-6 text-center text-xs text-verity-ink-soft">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>&copy; {new Date().getFullYear()} Verax Press. Seluruh hak cipta dilindungi.</p>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <Link href="/pedoman-kontributor" className="hover:text-verity-accent">
              Pedoman Kontributor
            </Link>
            <Link href="/standar-editorial" className="hover:text-verity-accent">
              Standar Editorial
            </Link>
            <Link href="/" className="hover:text-verity-accent">
              Beranda Publik
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function ContributorPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 15_000,
          },
        },
      }),
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <PortalShell>{children}</PortalShell>
      </QueryClientProvider>
    </SessionProvider>
  );
}

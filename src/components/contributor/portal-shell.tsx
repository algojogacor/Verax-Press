// Shell sisi klien Portal Kontributor (NextAuth + QueryClient + navigasi).
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
import { VeraxMark } from "@/components/site/verax-mark";

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
              <Link
                href="/kontributor/portal"
                className="flex items-center gap-2 text-verity-ink transition-colors hover:text-verity-accent focus-visible:outline-2 focus-visible:outline-verity-accent sm:gap-2.5"
              >
                <VeraxMark className="size-5 shrink-0 sm:size-6" />
                <span className="font-serif text-lg font-bold tracking-tight whitespace-nowrap sm:text-xl">
                  VERAX PRESS
                </span>
                <span className="font-mono text-[9.5px] uppercase tracking-widest text-verity-accent font-semibold px-1.5 py-0.5 rounded-xs bg-verity-paper-soft border border-verity-rule whitespace-nowrap sm:text-[10px] sm:px-2">
                  KONTRIBUTOR
                </span>
              </Link>
            </div>

            <nav aria-label="Navigasi portal kontributor" className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xs text-xs font-mono transition-colors ${
                      isActive
                        ? "bg-verity-ink text-verity-paper font-semibold"
                        : "text-verity-ink-soft hover:text-verity-ink hover:bg-verity-paper-soft"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
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
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1 text-xs font-mono text-verity-ink-soft hover:text-verity-accent"
            >
              <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Pedoman</span>
              <ExternalLink className="w-3 h-3 opacity-60" aria-hidden="true" />
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
                className="text-xs font-mono text-verity-ink-soft hover:text-verity-disputed hover:bg-verity-disputed/10 h-8 px-2.5"
                title="Keluar dari sesi kontributor"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                <span className="hidden sm:inline">Keluar</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <nav
          aria-label="Navigasi seluler portal kontributor"
          className="flex md:hidden items-center justify-around py-2 border-t border-verity-rule/60"
        >
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs text-xs font-mono ${
                  isActive
                    ? "bg-verity-ink text-verity-paper font-semibold"
                    : "text-verity-ink-soft hover:text-verity-ink"
                }`}
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-verity-paper-soft text-verity-ink flex flex-col justify-between">
      <a
        href="#portal-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-verity-ink focus:text-verity-paper focus:px-3 focus:py-2 focus:font-mono focus:text-xs"
      >
        Lewati ke konten utama
      </a>
      <div>
        <PortalHeader />
        <main id="portal-main-content" tabIndex={-1} className="max-w-6xl mx-auto px-4 sm:px-6 py-8 outline-none">
          {children}
        </main>
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

export function ContributorPortalShell({
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

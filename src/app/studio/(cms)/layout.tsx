// Shell CMS: sidebar desktop / topbar + drawer mobile, guard sesi client-side.
// Otorisasi sebenarnya tetap di middleware + setiap API route (defense in depth).
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  FileText,
  Image as ImageIcon,
  KeyRound,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  ScrollText,
  UserCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { apiFetch } from "@/components/studio/api";
import { ROLE_LABELS } from "@/lib/domain/constants";
import type { SessionUser } from "@/types/verity";
import { cn } from "@/lib/utils";
import { VeraxMark } from "@/components/site/verax-mark";

interface DashboardData {
  user: SessionUser;
  permissions: {
    canPublish: boolean;
    canReview: boolean;
    canVerifySources: boolean;
    canManageApiClients: boolean;
    canReadAudit: boolean;
    canManageStaff?: boolean;
  };
}

function useDashboardPermissions() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardData>("/api/studio/dashboard"),
    staleTime: 30_000,
  });
}

function StudioNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data } = useDashboardPermissions();

  const isChief = data?.user.role === "CHIEF_EDITOR";

  const items = [
    { href: "/studio", label: "Dashboard", icon: LayoutDashboard },
    { href: "/studio/articles", label: "Artikel", icon: FileText },
    ...(isChief ? [{ href: "/studio/staff", label: "Tim Redaksi", icon: Users }] : []),
    ...(isChief ? [{ href: "/studio/applications", label: "Pengajuan Kontributor", icon: UserCheck }] : []),
    { href: "/studio/media", label: "Media", icon: ImageIcon },
    ...(isChief ? [{ href: "/studio/complaints", label: "Keluhan", icon: ClipboardList }] : []),
    ...(isChief ? [{ href: "/studio/audit", label: "Audit", icon: ScrollText }] : []),
    ...(isChief ? [{ href: "/studio/api-clients", label: "API & Integrasi", icon: KeyRound }] : []),
  ];

  return (
    <nav aria-label="Navigasi studio" className="flex flex-col gap-1">
      {items.map((item) => {
        const active =
          item.href === "/studio" ? pathname === "/studio" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 border-l-2 px-3 py-2 text-sm transition-colors",
              active
                ? "border-verity-ink bg-verity-paper-soft font-medium text-verity-ink"
                : "border-transparent text-verity-ink-soft hover:border-verity-rule-strong hover:text-verity-ink",
            )}
          >
            <item.icon className="size-4 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserFooter({ onNavigate }: { onNavigate?: () => void }) {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div className="border-t border-verity-rule p-4">
      <p className="truncate text-sm font-medium text-verity-ink">{user?.name ?? ""}</p>
      <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-verity-ink-faint">
        {user ? ROLE_LABELS[user.role] : ""}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-3 w-full"
        onClick={() => {
          onNavigate?.();
          void signOut({ callbackUrl: "/studio/login" });
        }}
      >
        <LogOut className="size-4" aria-hidden="true" />
        Keluar
      </Button>
    </div>
  );
}

export default function CmsLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/studio/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-verity-paper text-verity-ink">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        <span className="ml-2 font-mono text-xs uppercase tracking-[0.14em]">Memuat Studio</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-verity-paper text-verity-ink">
      <a
        href="#studio-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-verity-ink focus:text-verity-paper focus:px-3 focus:py-2 focus:font-mono focus:text-xs"
      >
        Lewati ke konten utama
      </a>
      {/* Topbar mobile */}
      <header className="flex h-14 items-center justify-between border-b border-verity-rule px-4 md:hidden">
        <div className="flex items-center gap-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Buka menu studio">
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-verity-paper">
              <SheetHeader className="border-b border-verity-rule p-4 text-left">
                <div className="flex items-center gap-2.5">
                  <VeraxMark className="size-7 shrink-0 text-verity-ink" />
                  <div>
                    <SheetTitle className="font-serif text-lg font-semibold leading-tight tracking-tight text-verity-ink">
                      Verax Press
                    </SheetTitle>
                    <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-verity-ink-soft">
                      Ruang Redaksi
                    </p>
                  </div>
                </div>
              </SheetHeader>
              <div className="p-3">
                <StudioNav onNavigate={() => setMobileOpen(false)} />
              </div>
              <div className="mt-auto">
                <UserFooter onNavigate={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <span className="inline-flex items-center gap-2 font-serif text-lg font-semibold tracking-tight text-verity-ink">
            <VeraxMark className="size-5 shrink-0" />
            Verax Press
          </span>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-verity-ink-soft">
          Studio
        </span>
      </header>

      {/* Grid desktop: sidebar tetap + konten fleksibel */}
      <div className="md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-verity-rule md:flex md:min-h-screen md:flex-col md:justify-between">
          <div>
            <div className="border-b border-verity-rule p-5">
              <Link
                href="/studio"
                className="flex items-center gap-2.5 text-verity-ink transition-colors hover:text-verity-accent focus-visible:outline-2 focus-visible:outline-verity-accent"
              >
                <VeraxMark className="size-7 shrink-0" />
                <span>
                  <span className="block font-serif text-xl font-semibold leading-none tracking-tight">
                    Verax Press
                  </span>
                  <span className="mt-1.5 block font-mono text-[11px] uppercase tracking-[0.14em] text-verity-ink-soft">
                    Ruang Redaksi
                  </span>
                </span>
              </Link>
            </div>
            <div className="p-3">
              <StudioNav />
            </div>
          </div>
          <UserFooter />
        </aside>

        <main id="studio-main-content" tabIndex={-1} className="min-w-0 p-4 sm:p-6 lg:p-8 outline-none">{children}</main>
      </div>
    </div>
  );
}

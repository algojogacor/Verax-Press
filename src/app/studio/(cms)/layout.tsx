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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { apiFetch } from "@/components/studio/api";
import { ROLE_LABELS } from "@/lib/domain/constants";
import type { SessionUser } from "@/types/verity";
import { cn } from "@/lib/utils";

interface DashboardData {
  user: SessionUser;
  permissions: {
    canPublish: boolean;
    canReview: boolean;
    canVerifySources: boolean;
    canManageComplaints: boolean;
    canManageApiClients: boolean;
    canReadAudit: boolean;
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
  const canManageComplaints = data?.permissions.canManageComplaints ?? false;

  const items = [
    { href: "/studio", label: "Dashboard", icon: LayoutDashboard },
    { href: "/studio/articles", label: "Artikel", icon: FileText },
    { href: "/studio/media", label: "Media", icon: ImageIcon },
    ...(canManageComplaints
      ? [{ href: "/studio/complaints", label: "Keluhan", icon: ClipboardList }]
      : []),
    ...(isChief ? [{ href: "/studio/audit", label: "Audit", icon: ScrollText }] : []),
    ...(isChief ? [{ href: "/studio/api-clients", label: "API Clients", icon: KeyRound }] : []),
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
      <p className="truncate text-sm font-medium text-verity-ink">{user?.name ?? "—"}</p>
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

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-5 animate-spin text-verity-ink-faint" aria-label="Memuat" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-verity-paper">
      {/* Sidebar desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-verity-rule bg-card md:flex">
        <div className="border-b border-verity-rule p-4">
          <p className="pl-[0.3em] font-serif text-base font-semibold tracking-[0.24em] text-verity-ink">VERAX PRESS</p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-verity-ink-faint">
            Studio Redaksi
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <StudioNav />
        </div>
        <UserFooter />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar mobile */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-verity-rule bg-card px-4 py-3 md:hidden">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Buka menu navigasi">
                  <Menu className="size-4" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 border-verity-rule bg-card p-0">
                <SheetHeader className="border-b border-verity-rule px-4 py-3 text-left">
                  <SheetTitle className="pl-[0.24em] font-serif text-base font-semibold tracking-[0.24em] text-verity-ink">
                    VERAX PRESS
                  </SheetTitle>
                </SheetHeader>
                <div className="flex h-[calc(100%-4rem)] flex-col">
                  <div className="flex-1 overflow-y-auto p-3">
                    <StudioNav onNavigate={() => setMobileOpen(false)} />
                  </div>
                  <UserFooter onNavigate={() => setMobileOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <p className="pl-[0.24em] font-serif text-sm font-semibold tracking-[0.24em] text-verity-ink">
              VERAX PRESS
            </p>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-verity-ink-faint">
            Studio
          </p>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

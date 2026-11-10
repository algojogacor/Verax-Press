// Masthead publik Verax Press: struktur broadsheet klasik:
// baris utilitas -> motto Latin -> wordmark -> baris tanggal/edisi -> nav.
// Motto "Ex Fontibus Veritas" (kebenaran bersumber dari sumbernya) mengikat
// etimologi nama (verax, Lat.: jujur) dengan identitas verifikasi sumber.
// Server component: daftar desk diambil dari DB; interaksi aktif ditangani DeskNav (client).
import Link from "next/link";
import { db } from "@/lib/db";
import { formatMastheadDate } from "@/lib/format";
import { DeskNav, type NavItem } from "@/components/site/desk-nav";
import { SiteMobileNav } from "@/components/site/site-mobile-nav";

export async function Masthead() {
  const desks = await db.desk.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, name: true },
  });

  const navItems: NavItem[] = [
    ...desks.map((desk) => ({ href: `/desk/${desk.slug}`, label: desk.name })),
    { href: "/opini", label: "Opini" },
    { href: "/tentang", label: "Tentang" },
  ];

  return (
    <header className="bg-verity-paper">
      {/* Baris utilitas */}
      <div className="border-b border-verity-rule">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-1.5 sm:px-6">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-verity-ink-faint">
            Media Independen · Edisi Indonesia
          </span>
          <nav aria-label="Utilitas publik" className="flex items-center gap-3">
            <Link
              href="/koreksi"
              className="font-mono text-[11px] uppercase tracking-[0.08em] text-verity-ink-soft underline-offset-4 hover:text-verity-accent hover:underline"
            >
              Log Koreksi
            </Link>
            <span aria-hidden="true" className="text-verity-rule-strong">·</span>
            <Link
              href="/keluhan"
              className="font-mono text-[11px] uppercase tracking-[0.08em] text-verity-ink-soft underline-offset-4 hover:text-verity-accent hover:underline"
            >
              Hak Jawab
            </Link>
          </nav>
        </div>
      </div>

      {/* Blok masthead: motto → wordmark → baris tanggal (posisi klasik broadsheet) */}
      <div className="relative mx-auto max-w-6xl px-4 py-6 sm:py-8 sm:px-6">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 sm:hidden z-10">
          <SiteMobileNav items={navItems} />
        </div>
        <div
          className="flex items-center justify-center gap-3 sm:gap-5"
          aria-hidden="true"
        >
          <span className="hidden h-px w-20 bg-verity-rule-strong sm:block" />
          <p
            className="pl-[0.32em] font-mono text-[9px] font-medium uppercase tracking-[0.32em] text-verity-ink-soft sm:text-[10px]"
            title="Kebenaran bersumber dari sumbernya"
          >
            Ex Fontibus Veritas
          </p>
          <span className="hidden h-px w-20 bg-verity-rule-strong sm:block" />
        </div>
        <Link
          href="/"
          className="mt-3 block text-center font-serif text-[1.65rem] font-semibold leading-none tracking-[0.14em] text-verity-ink pl-[0.14em] sm:mt-4 sm:text-[2.6rem] sm:tracking-[0.24em] sm:pl-[0.24em] lg:text-[3rem]"
          style={{ fontOpticalSizing: "auto" }}
          aria-label="Verax Press, halaman utama"
        >
          VERAX PRESS
        </Link>
        <p className="mt-3.5 text-center font-mono text-[11px] text-verity-ink-faint sm:mt-4">
          {formatMastheadDate()} <span aria-hidden="true">·</span> Est. MMXXVI
        </p>
      </div>

      {/* Nav seksi — jangkar rule tebal di atas, hairline di bawah */}
      <nav aria-label="Bagian utama" className="border-t-2 border-b border-verity-ink border-b-verity-rule">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <DeskNav items={navItems} />
        </div>
      </nav>
    </header>
  );
}

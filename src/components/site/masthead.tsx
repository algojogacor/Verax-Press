// Masthead publik Verax Press: struktur broadsheet klasik:
// baris utilitas -> motto Latin -> wordmark -> baris tanggal/edisi -> nav.
// Motto "Ex Fontibus Veritas" (kebenaran bersumber dari sumbernya) mengikat
// etimologi nama (verax, Lat.: jujur) dengan identitas verifikasi sumber.
// Server component: daftar desk diambil dari DB; interaksi aktif ditangani DeskNav (client).
import Link from "next/link";
import { getActiveDesks } from "@/lib/domain/desks";
import { formatMastheadDate } from "@/lib/format";
import { DeskNav, type NavItem } from "@/components/site/desk-nav";
import { SiteMobileNav } from "@/components/site/site-mobile-nav";

export async function Masthead() {
  const desks = await getActiveDesks();

  const navItems: NavItem[] = [
    ...desks.map((desk) => ({ href: `/desk/${desk.slug}`, label: desk.name })),
    { href: "/opini", label: "Opini" },
    { href: "/tentang", label: "Tentang" },
  ];

  return (
    <header className="bg-verity-paper">
      {/* Baris utilitas: bebas tabrakan di mobile dan rapi di desktop */}
      <div className="border-b border-verity-rule bg-verity-paper">
        <div className="mx-auto max-w-6xl px-4 py-1 sm:px-6 sm:py-1.5">
          {/* Mobile view (< sm): 2 baris terstruktur rapi */}
          <div className="flex flex-col items-center justify-center gap-1 sm:hidden">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-verity-ink-faint">
              Media Independen · Edisi Indonesia
            </span>
            <nav aria-label="Utilitas publik mobile" className="flex items-center gap-3">
              <Link
                href="/koreksi"
                className="font-mono text-[10px] uppercase tracking-[0.08em] text-verity-ink-soft underline-offset-4 hover:text-verity-accent hover:underline"
              >
                Log Koreksi
              </Link>
              <span aria-hidden="true" className="text-verity-rule-strong">·</span>
              <Link
                href="/keluhan"
                className="font-mono text-[10px] uppercase tracking-[0.08em] text-verity-ink-soft underline-offset-4 hover:text-verity-accent hover:underline"
              >
                Hak Jawab
              </Link>
              <span aria-hidden="true" className="text-verity-rule-strong">·</span>
              <Link
                href="/kirim-tulisan"
                className="font-mono text-[10px] uppercase tracking-[0.08em] text-verity-ink-soft underline-offset-4 hover:text-verity-accent hover:underline"
              >
                Kirim Tulisan
              </Link>
            </nav>
          </div>

          {/* Desktop view (>= sm): seimbang kiri dan kanan */}
          <div className="hidden sm:flex items-center justify-between">
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
              <span aria-hidden="true" className="text-verity-rule-strong">·</span>
              <Link
                href="/kirim-tulisan"
                className="font-mono text-[11px] uppercase tracking-[0.08em] text-verity-ink-soft underline-offset-4 hover:text-verity-accent hover:underline"
              >
                Kirim Tulisan
              </Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Blok masthead */}
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        {/* Mobile Header Row (< sm): 3 kolom seimbang (menu di kiri, logo di tengah, spacer penyeimbang di kanan) */}
        <div className="flex items-center justify-between sm:hidden">
          <div className="flex w-9 items-center justify-start">
            <SiteMobileNav items={navItems} />
          </div>
          <div className="flex-1 text-center">
            <p
              className="font-mono text-[9px] font-medium uppercase tracking-[0.24em] text-verity-ink-soft"
              title="Kebenaran bersumber dari sumbernya"
            >
              Ex Fontibus Veritas
            </p>
            <Link
              href="/"
              className="mt-1 block font-serif text-[1.65rem] font-semibold leading-none tracking-[0.16em] text-verity-ink"
              aria-label="Verax Press, halaman utama"
            >
              VERAX PRESS
            </Link>
          </div>
          <div className="w-9" aria-hidden="true" />
        </div>

        {/* Desktop Header Content (>= sm) */}
        <div className="hidden sm:block">
          <div
            className="flex items-center justify-center gap-3 sm:gap-5"
            aria-hidden="true"
          >
            <span className="h-px w-20 bg-verity-rule-strong" />
            <p
              className="pl-[0.32em] font-mono text-[10px] font-medium uppercase tracking-[0.32em] text-verity-ink-soft"
              title="Kebenaran bersumber dari sumbernya"
            >
              Ex Fontibus Veritas
            </p>
            <span className="h-px w-20 bg-verity-rule-strong" />
          </div>
          <Link
            href="/"
            className="mt-4 block text-center font-serif text-[2.6rem] font-semibold leading-none tracking-[0.24em] text-verity-ink pl-[0.24em] lg:text-[3rem]"
            style={{ fontOpticalSizing: "auto" }}
            aria-label="Verax Press, halaman utama"
          >
            VERAX PRESS
          </Link>
        </div>

        {/* Baris tanggal dan edisi */}
        <p className="mt-2.5 text-center font-mono text-[10px] text-verity-ink-faint sm:mt-4 sm:text-[11px]">
          {formatMastheadDate()} <span aria-hidden="true">·</span> Est. MMXXVI
        </p>
      </div>

      {/* Nav seksi: jangkar rule tebal di atas, hairline di bawah */}
      <nav aria-label="Bagian utama" className="border-t-2 border-b border-verity-ink border-b-verity-rule">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <DeskNav items={navItems} />
        </div>
      </nav>
    </header>
  );
}

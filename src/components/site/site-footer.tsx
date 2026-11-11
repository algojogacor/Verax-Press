// Footer publik Verax Press: struktur 4 kolom broadsheet + baris legal dan transparansi status.
// Seluruh pranala mengarah ke halaman yang aktif dan terverifikasi.
import Link from "next/link";
import { getActiveDesks } from "@/lib/domain/desks";
import { VeraxMark } from "@/components/site/verax-mark";

export async function SiteFooter() {
  const desks = await getActiveDesks();

  return (
    <footer className="mt-auto border-t-2 border-verity-ink bg-verity-paper">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Kolom 1: Identitas Publikasi */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center gap-3 text-verity-ink hover:text-verity-accent transition-colors"
            >
              <VeraxMark className="size-8 shrink-0" />
              <span>
                <span className="block font-serif text-xl font-semibold leading-none tracking-[0.22em]">
                  VERAX PRESS
                </span>
                <span className="mt-1.5 block font-mono text-[10px] uppercase tracking-[0.24em] text-verity-ink-faint">
                  Ex Fontibus Veritas
                </span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm font-serif text-sm leading-relaxed text-verity-ink-soft">
              Publikasi digital independen untuk isu hukum, kebijakan teknologi, dan kepentingan
              publik. Setiap laporan menautkan sumber primer terverifikasi serta mencatat setiap
              koreksi secara terbuka.
            </p>
            <div className="mt-5 border-t border-verity-rule pt-3">
              <Link
                href="/kontak"
                className="font-mono text-xs text-verity-ink-soft underline-offset-4 hover:text-verity-ink hover:underline"
              >
                Kontak Redaksi →
              </Link>
            </div>
          </div>

          {/* Kolom 2: Editorial & Standar */}
          <nav aria-label="Kebijakan redaksi">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-verity-ink-faint">
              Editorial
            </p>
            <ul className="mt-3.5 space-y-2.5 text-sm">
              <li>
                <Link
                  href="/standar-editorial"
                  className="text-verity-ink-soft underline-offset-4 hover:text-verity-ink hover:underline"
                >
                  Standar Editorial
                </Link>
              </li>
              <li>
                <Link
                  href="/kebijakan-ai"
                  className="text-verity-ink-soft underline-offset-4 hover:text-verity-ink hover:underline"
                >
                  Kebijakan AI &amp; Otomasi
                </Link>
              </li>
              <li>
                <Link
                  href="/koreksi"
                  className="text-verity-ink-soft underline-offset-4 hover:text-verity-ink hover:underline"
                >
                  Log Koreksi Publik
                </Link>
              </li>
              <li>
                <Link
                  href="/keluhan"
                  className="text-verity-ink-soft underline-offset-4 hover:text-verity-ink hover:underline"
                >
                  Hak Jawab &amp; Keluhan
                </Link>
              </li>
              <li>
                <Link
                  href="/tentang"
                  className="text-verity-ink-soft underline-offset-4 hover:text-verity-ink hover:underline"
                >
                  Tentang Verax Press
                </Link>
              </li>
            </ul>
          </nav>

          {/* Kolom 3: Kontribusi & Penulisan */}
          <nav aria-label="Kontribusi tulisan">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-verity-ink-faint">
              Kontribusi
            </p>
            <ul className="mt-3.5 space-y-2.5 text-sm">
              <li>
                <Link
                  href="/kirim-tulisan"
                  className="text-verity-ink font-medium underline-offset-4 hover:text-verity-accent hover:underline"
                >
                  Kirim Tulisan
                </Link>
              </li>
              <li>
                <Link
                  href="/pedoman-kontributor"
                  className="text-verity-ink-soft underline-offset-4 hover:text-verity-ink hover:underline"
                >
                  Pedoman Kontributor
                </Link>
              </li>
              <li>
                <Link
                  href="/kontributor/daftar"
                  className="text-verity-ink-soft underline-offset-4 hover:text-verity-ink hover:underline"
                >
                  Pendaftaran Penulis
                </Link>
              </li>
              <li>
                <Link
                  href="/kontributor/login"
                  className="text-verity-ink-soft underline-offset-4 hover:text-verity-ink hover:underline"
                >
                  Portal Kontributor
                </Link>
              </li>
              <li>
                <Link
                  href="/developers"
                  className="text-verity-ink-soft underline-offset-4 hover:text-verity-ink hover:underline"
                >
                  Integrasi Agen AI (API)
                </Link>
              </li>
            </ul>
          </nav>

          {/* Kolom 4: Rubrik Liputan */}
          <nav aria-label="Rubrik liputan">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-verity-ink-faint">
              Rubrik
            </p>
            <ul className="mt-3.5 space-y-2.5 text-sm">
              {desks.map((desk) => (
                <li key={desk.slug}>
                  <Link
                    href={`/desk/${desk.slug}`}
                    className="text-verity-ink-soft underline-offset-4 hover:text-verity-ink hover:underline"
                  >
                    {desk.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/opini"
                  className="text-verity-ink-soft underline-offset-4 hover:text-verity-ink hover:underline"
                >
                  Opini
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Baris Bawah: Dokumen Hukum & Transparansi Status */}
      <div className="border-t border-verity-rule bg-verity-paper-soft">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="space-y-1">
            <p className="font-mono text-[11px] text-verity-ink-faint">
              © {new Date().getFullYear()} Verax Press. VERAX PRESS adalah nama kerja publikasi media digital independen.
            </p>
            <p className="font-mono text-[10px] text-verity-ink-faint">
              Belum berstatus badan hukum pers, belum terdaftar PSE, dan belum diverifikasi Dewan Pers. Dikelola secara independen oleh meja redaksi Verax Press.
            </p>
          </div>

          <nav aria-label="Dokumen hukum" className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[11px]">
            <Link
              href="/informasi-kelembagaan"
              className="text-verity-ink-soft underline-offset-4 hover:text-verity-ink hover:underline"
            >
              Informasi Kelembagaan
            </Link>
            <span aria-hidden="true" className="text-verity-rule-strong">·</span>
            <Link
              href="/kebijakan-privasi"
              className="text-verity-ink-soft underline-offset-4 hover:text-verity-ink hover:underline"
            >
              Kebijakan Privasi
            </Link>
            <span aria-hidden="true" className="text-verity-rule-strong">·</span>
            <Link
              href="/syarat-ketentuan"
              className="text-verity-ink-soft underline-offset-4 hover:text-verity-ink hover:underline"
            >
              Syarat &amp; Ketentuan
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

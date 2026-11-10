// Footer publik — tautan institusional; menempel di bawah viewport (mt-auto pada layout).
import Link from "next/link";
import { db } from "@/lib/db";

export async function SiteFooter() {
  const desks = await db.desk.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, name: true },
  });

  return (
    <footer className="mt-auto border-t-2 border-verity-ink bg-verity-paper">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="font-serif text-xl font-semibold tracking-[0.22em] text-verity-ink">VERAX PRESS</p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.28em] text-verity-ink-faint">
              Ex Fontibus Veritas
            </p>
            <p className="mt-4 max-w-sm font-serif text-sm leading-relaxed text-verity-ink-soft">
              Media digital independen dengan kendali editorial manusia. Setiap artikel melewati
              review, fact-check, dan persetujuan editor sebelum terbit.
            </p>
          </div>
          <nav aria-label="Kebijakan redaksi">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-verity-ink-faint">
              Kebijakan
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/standar-editorial" className="text-verity-ink-soft underline-offset-4 hover:text-verity-ink hover:underline">Standar Editorial</Link></li>
              <li><Link href="/koreksi" className="text-verity-ink-soft underline-offset-4 hover:text-verity-ink hover:underline">Log Koreksi</Link></li>
              <li><Link href="/keluhan" className="text-verity-ink-soft underline-offset-4 hover:text-verity-ink hover:underline">Hak Jawab &amp; Keluhan</Link></li>
              <li><Link href="/tentang" className="text-verity-ink-soft underline-offset-4 hover:text-verity-ink hover:underline">Tentang Verax Press</Link></li>
            </ul>
          </nav>
          <nav aria-label="Desk">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-verity-ink-faint">Desk</p>
            <ul className="mt-3 space-y-2 text-sm">
              {desks.map((desk) => (
                <li key={desk.slug}>
                  <Link href={`/desk/${desk.slug}`} className="text-verity-ink-soft underline-offset-4 hover:text-verity-ink hover:underline">
                    {desk.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/opini" className="text-verity-ink-soft underline-offset-4 hover:text-verity-ink hover:underline">Opini</Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
      <div className="border-t border-verity-rule">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-mono text-[11px] text-verity-ink-faint">
            © {new Date().getFullYear()} Verax Press. VERAX PRESS adalah nama kerja.
          </p>
          <p className="max-w-xl font-mono text-[11px] leading-relaxed text-verity-ink-faint">
            Verax Press belum mengklaim status badan hukum pers, pendaftaran PSE, atau verifikasi
            Dewan Pers. Seluruh konten terbit dengan persetujuan editor manusia.
          </p>
        </div>
      </div>
    </footer>
  );
}

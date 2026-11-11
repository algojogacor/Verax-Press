// Log Koreksi publik: /koreksi (akuntabilitas editorial).
// Hanya koreksi atas artikel yang masih hidup (PUBLISHED/CORRECTED) yang ditampilkan.
import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Log Koreksi",
  description:
    "Catatan publik atas setiap koreksi material pada artikel Verax Press. Riwayat pembaruan tidak pernah dihapus secara diam-diam.",
};

export default async function CorrectionsPage() {
  const corrections = await db.correctionRecord.findMany({
    where: { article: { status: { in: ["PUBLISHED", "CORRECTED"] } } },
    include: { article: { select: { slug: true, title: true } } },
    orderBy: { correctedAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="border-b-2 border-verity-ink pb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-verity-accent">
          Akuntabilitas Redaksi
        </p>
        <h1 className="mt-3 font-serif text-[2.2rem] font-semibold leading-[1.08] tracking-[-0.012em] text-verity-ink sm:text-[2.8rem]">
          Log Koreksi
        </h1>
        <p className="mt-4 max-w-3xl font-serif text-[1.1rem] leading-[1.7] text-verity-ink-soft">
          Koreksi atas kesalahan material tampil pada artikel yang bersangkutan dan tercatat pada
          log ini. Riwayat koreksi kami pertahankan dan tidak dihapus diam-diam, sebagai bagian dari
          komitmen transparansi redaksi.
        </p>
      </header>

      {/* Grid 2 Kolom di Desktop (lg:) */}
      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-14">
        {/* Kolom Daftar Koreksi */}
        <section aria-label="Daftar koreksi" className="min-w-0">
          {corrections.length === 0 ? (
            <div className="border border-verity-rule bg-verity-paper-soft p-8">
              <p className="font-serif text-[1.15rem] font-medium text-verity-ink">
                Belum ada catatan koreksi publik.
              </p>
              <p className="mt-2.5 font-serif text-[0.98rem] leading-relaxed text-verity-ink-soft">
                Ketika terdapat koreksi material atas naskah yang diterbitkan, setiap perubahan,
                tanggal perbaikan, dan ringkasan kekeliruan akan dicatat secara kronologis di halaman ini.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-verity-rule border-y border-verity-rule">
              {corrections.map((correction) => (
                <li key={correction.id} className="py-6">
                  <p className="font-mono text-[11px] text-verity-ink-faint">
                    <time dateTime={correction.correctedAt.toISOString()}>
                      {formatDate(correction.correctedAt)}
                    </time>
                  </p>
                  <h2 className="mt-1.5 font-serif text-[1.2rem] font-medium leading-snug text-verity-ink">
                    <Link
                      href={`/artikel/${correction.article.slug}`}
                      className="hover:text-verity-accent-deep"
                    >
                      {correction.article.title}
                    </Link>
                  </h2>
                  <p className="mt-2 font-serif text-[0.95rem] leading-relaxed text-verity-ink-soft">
                    {correction.publicNote}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Sidebar Prosedur Koreksi (Desktop lg:) */}
        <aside aria-label="Prosedur koreksi" className="hidden lg:block lg:border-l lg:border-verity-rule lg:pl-8">
          <div className="sticky top-6 space-y-8">
            <div className="border border-verity-rule bg-verity-paper-soft p-5">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-verity-accent">
                Ajukan Koreksi
              </p>
              <p className="mt-2 font-serif text-[0.88rem] leading-relaxed text-verity-ink-soft">
                Menemukan kekeliruan faktual atau salah kutip dalam artikel Verax Press? Laporkan kepada redaksi
                melalui kanal resmi hak koreksi.
              </p>
              <Link
                href="/keluhan"
                className="mt-3.5 inline-block font-mono text-[11px] uppercase tracking-[0.1em] text-verity-ink underline underline-offset-4 hover:text-verity-accent"
              >
                Formulir Hak Koreksi →
              </Link>
            </div>

            <div>
              <p className="font-sans text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-verity-ink-soft">
                Prinsip Koreksi
              </p>
              <ul className="mt-3 space-y-2.5 font-serif text-[0.88rem] leading-relaxed text-verity-ink-soft">
                <li className="flex gap-2">
                  <span className="text-verity-ink">·</span>
                  <span>Tidak ada koreksi diam-diam (*silent editing*).</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-verity-ink">·</span>
                  <span>Catatan koreksi disematkan langsung di badan artikel terkait.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-verity-ink">·</span>
                  <span>Semua perubahan ditelaah dan disetujui editor penanggung jawab.</span>
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

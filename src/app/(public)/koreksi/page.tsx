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
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="max-w-3xl border-b border-verity-rule pb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-verity-ink-soft">
          Akuntabilitas
        </p>
        <h1 className="mt-3 font-serif text-[2rem] font-semibold leading-[1.12] tracking-[-0.01em] text-verity-ink">
          Log Koreksi
        </h1>
        <p className="mt-4 font-serif text-[1.02rem] leading-[1.78] text-verity-ink-soft">
          Koreksi atas kesalahan material tampil pada artikel yang bersangkutan dan tercatat pada
          log ini. Riwayat koreksi kami pertahankan dan tidak dihapus diam-diam, sebagai bagian dari
          komitmen transparansi redaksi.
        </p>
      </header>

      <section aria-label="Daftar koreksi" className="max-w-3xl pt-2">
        {corrections.length === 0 ? (
          <div className="border-b border-verity-rule py-12">
            <p className="font-serif text-[1.05rem] font-medium text-verity-ink">
              Belum ada koreksi yang tercatat.
            </p>
            <p className="mt-2 font-serif text-[0.98rem] leading-relaxed text-verity-ink-soft">
              Ketika terdapat koreksi material, setiap perubahan akan tampil di halaman ini.
              Komitmen transparansi Verax Press berlaku sejak artikel pertama.
            </p>
          </div>
        ) : (
          <ul>
            {corrections.map((correction) => (
              <li key={correction.id} className="border-b border-verity-rule py-5">
                <p className="font-mono text-[11px] text-verity-ink-faint">
                  <time dateTime={correction.correctedAt.toISOString()}>
                    {formatDate(correction.correctedAt)}
                  </time>
                </p>
                <h2 className="mt-1.5 font-serif text-[1.15rem] font-medium leading-snug text-verity-ink">
                  <Link
                    href={`/artikel/${correction.article.slug}`}
                    className="hover:text-verity-accent-deep"
                  >
                    {correction.article.title}
                  </Link>
                </h2>
                <p className="mt-1.5 font-serif text-[0.95rem] leading-relaxed text-verity-ink-soft">
                  {correction.publicNote}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

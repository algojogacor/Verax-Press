// Indeks opini: /opini (ruang perspektif terkurasi dengan disclaimer wajib).
// Struktur sama dengan halaman desk (header anchor + unggulan + grid).
// Identitas opini dibedakan lewat label aksen & byline menonjol.
// Hanya artikel format OPINION berstatus PUBLISHED/CORRECTED.
import type { Metadata } from "next";
import { db } from "@/lib/db";
import {
  FeaturedArticleCard,
  OpinionArticleCard,
} from "@/components/site/article-card";
import { OPINION_DISCLAIMER } from "@/lib/domain/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Opini",
  description:
    "Ruang perspektif terkurasi Verax Press: kolom dan argumen yang diseleksi, disunting, dan diperiksa redaksi sebelum terbit.",
};

const publicSelect = {
  id: true,
  slug: true,
  title: true,
  deck: true,
  format: true,
  byline: true,
  publishedAt: true,
  firstPublishedAt: true,
  desk: { select: { slug: true, name: true } },
} as const;

export default async function OpinionPage() {
  const articles = await db.article.findMany({
    where: { status: { in: ["PUBLISHED", "CORRECTED"] }, format: "OPINION" },
    select: publicSelect,
    orderBy: { publishedAt: "desc" },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      {/* Header seksi: anchor berat + standfirst */}
      <header className="border-b-2 border-verity-ink pb-8">
        <p className="font-sans text-[0.85rem] font-semibold uppercase tracking-[0.2em] text-verity-accent">
          Opini
        </p>
        <h1 className="mt-3 font-serif text-[2.2rem] font-semibold leading-[1.08] tracking-[-0.012em] text-verity-ink sm:text-[2.6rem]">
          Opini
        </h1>
        <p className="mt-4 max-w-2xl font-serif text-[1.12rem] italic leading-[1.6] text-verity-ink-soft">
          Opini Verax Press adalah ruang perspektif terkurasi: setiap naskah diseleksi, disunting, dan
          diperiksa redaksi sebelum terbit. Di seksi ini penulis menghadirkan argumen dan sudut
          pandang atas isu publik, bukan liputan berita lapangan.
        </p>
      </header>

      {/* Disclaimer wajib seksi opini (Contributor Policy §8) */}
      <aside className="mt-6 flex max-w-3xl items-start gap-3 border-l-2 border-verity-accent pl-4">
        <p className="font-serif text-[0.95rem] italic leading-relaxed text-verity-ink-soft">
          {OPINION_DISCLAIMER}
        </p>
      </aside>

      <section aria-label="Daftar opini" className="pt-10">
        {articles.length === 0 ? (
          <p className="py-12 text-center font-serif text-[1.02rem] leading-relaxed text-verity-ink-soft">
            Belum ada opini yang terbit. Naskah perspektif yang lolos kurasi redaksi akan tampil
            di sini.
          </p>
        ) : (
          <>
            <div className="max-w-3xl">
              <FeaturedArticleCard article={articles[0]} />
            </div>
            {articles.length > 1 ? (
              <div className="mt-10 grid gap-x-12 gap-y-8 border-t border-verity-rule pt-8 sm:grid-cols-2 lg:grid-cols-3">
                {articles.slice(1).map((article) => (
                  <OpinionArticleCard key={article.id} article={article} />
                ))}
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

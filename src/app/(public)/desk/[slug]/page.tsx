// Halaman desk: /desk/[slug] (indeks artikel terbit per desk).
// Struktur broadsheet: pemisah tegas (rule 2px) dengan ringkasan pengantar, artikel pertama
// sebagai unggulan (tier featured), sisanya kisi berjenjang. Kicker kartu hanya format
// (nama desk sudah dicantumkan pada judul halaman). Desk nonaktif atau tidak ditemukan menghasilkan 404;
// hanya artikel PUBLISHED/CORRECTED yang tampil.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CompactArticleCard, FeaturedArticleCard, StandardArticleCard } from "@/components/site/article-card";

export const dynamic = "force-dynamic";

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

type Params = { params: Promise<{ slug: string }> };

async function loadDesk(slug: string) {
  return db.desk.findFirst({
    where: { slug, isActive: true },
    select: { id: true, slug: true, name: true, description: true },
  });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const desk = await loadDesk(slug);
  if (!desk) return { title: "Desk tidak ditemukan" };
  return {
    title: desk.name,
    description: desk.description ?? undefined,
  };
}

export default async function DeskPage({ params }: Params) {
  const { slug } = await params;
  const desk = await loadDesk(slug);
  if (!desk) notFound();

  const articles = await db.article.findMany({
    where: { status: { in: ["PUBLISHED", "CORRECTED"] }, deskId: desk.id },
    select: publicSelect,
    orderBy: { publishedAt: "desc" },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      {/* Header seksi: jangkar visual dan ringkasan pengantar */}
      <header className="border-b-2 border-verity-ink pb-8">
        <p className="font-sans text-[0.85rem] font-semibold uppercase tracking-[0.2em] text-verity-ink-soft">
          Desk
        </p>
        <h1 className="mt-3 font-serif text-[2.2rem] font-semibold leading-[1.08] tracking-[-0.012em] text-verity-ink sm:text-[2.6rem]">
          {desk.name}
        </h1>
        {desk.description ? (
          <p className="mt-4 max-w-2xl font-serif text-[1.12rem] italic leading-[1.6] text-verity-ink-soft">
            {desk.description}
          </p>
        ) : null}
      </header>

      {/* Tingkatan 3 lapis: ritme mengecil, bukan kisi seragam:
          unggulan (utuh) ke 2 kartu dengan ringkasan (hairline) lalu ekor indeks
          ringkas untuk artikel lebih lama. */}
      <section aria-label={`Artikel desk ${desk.name}`} className="pt-10">
        {articles.length === 0 ? (
          <p className="py-12 text-center font-serif text-[1.02rem] leading-relaxed text-verity-ink-soft">
            Belum ada artikel terbit di desk ini. Naskah yang sedang diproses editorial akan
            tampil di sini setelah melewati penelaahan, uji fakta, dan persetujuan redaktur.
          </p>
        ) : (
          <>
            <FeaturedArticleCard article={articles[0]} />
            {articles.length > 1 ? (
              // Kartu standar membawa hairline atasnya sendiri; pemisah
              // level grid TIDAK dipakai (menghindari dua hairline bertumpuk);
              // whitespace yang memisahkan tingkatan.
              <div className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2">
                {articles.slice(1, 3).map((article) => (
                  <StandardArticleCard key={article.id} article={article} kickerVariant="format" />
                ))}
              </div>
            ) : null}
            {articles.length > 3 ? (
              // Ekor indeks ringkas: kolom sejajar (bukan satu kolom
              // yang menyisakan ruang mati), garis per item sejajar per baris
              <div className="mt-10 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
                {articles.slice(3).map((article) => (
                  <CompactArticleCard key={article.id} article={article} showTime />
                ))}
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

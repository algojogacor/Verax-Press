// Indeks opini: /opini (ruang perspektif terkurasi dengan disclaimer wajib dan paginasi).
// Hanya artikel format OPINION berstatus PUBLISHED/CORRECTED.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  FeaturedArticleCard,
  OpinionArticleCard,
} from "@/components/site/article-card";
import { OPINION_DISCLAIMER } from "@/lib/domain/constants";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { canonicalUrl, getCanonicalBaseUrl } from "@/lib/seo/constants";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "@/lib/seo/structured-data";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

type PageCtx = {
  searchParams?: Promise<{ page?: string }>;
};

function parsePageParamStrict(rawPage: string | undefined): number {
  if (!rawPage) return 1;
  if (!/^\d+$/.test(rawPage.trim())) notFound();
  const parsed = Number.parseInt(rawPage.trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 1) notFound();
  return parsed;
}

export async function generateMetadata({ searchParams }: PageCtx): Promise<Metadata> {
  const resolvedSearch = searchParams ? await searchParams : undefined;
  const rawPage = resolvedSearch?.page;
  if (rawPage && (!/^\d+$/.test(rawPage.trim()) || Number.parseInt(rawPage.trim(), 10) < 1)) {
    return { title: "Halaman Tidak Ditemukan", robots: { index: false, follow: false } };
  }

  const page = rawPage ? Number.parseInt(rawPage.trim(), 10) : 1;
  const path = page > 1 ? `/opini?page=${page}` : "/opini";
  const title = page > 1 ? `Opini (Halaman ${page})` : "Opini";
  const description =
    "Ruang perspektif terkurasi Verax Press: kolom dan argumen yang diseleksi, disunting, dan diperiksa redaksi sebelum terbit.";

  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${title} | Verax Press`,
      description,
      url: path,
      siteName: "Verax Press",
      type: "website",
      locale: "id_ID",
      images: [
        {
          url: "/brand/verax-press-og.png",
          width: 1200,
          height: 630,
          alt: `${title} | Verax Press`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Verax Press`,
      description,
      images: ["/brand/verax-press-og.png"],
    },
  };
}

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

export default async function OpinionPage({ searchParams }: PageCtx) {
  const resolvedSearch = searchParams ? await searchParams : undefined;
  const page = parsePageParamStrict(resolvedSearch?.page);

  const where = { status: { in: ["PUBLISHED", "CORRECTED"] }, format: "OPINION" };
  const [totalCount, articles] = await Promise.all([
    db.article.count({ where }),
    db.article.findMany({
      where,
      select: publicSelect,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  if (page > 1 && articles.length === 0) {
    notFound();
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const baseUrl = getCanonicalBaseUrl();
  const pagePath = page > 1 ? `/opini?page=${page}` : "/opini";
  const description =
    "Ruang perspektif terkurasi Verax Press: kolom dan argumen yang diseleksi, disunting, dan diperiksa redaksi sebelum terbit.";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Beranda", url: canonicalUrl("/") },
          { name: "Opini", url: canonicalUrl("/opini") },
        ])}
      />
      <JsonLd
        data={buildCollectionPageJsonLd({
          baseUrl,
          url: canonicalUrl(pagePath),
          name: page > 1 ? `Opini (Halaman ${page})` : "Opini",
          description,
        })}
      />

      <Breadcrumbs items={[{ label: "Beranda", href: "/" }, { label: "Opini" }]} />

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

            {totalPages > 1 ? (
              <nav
                aria-label="Paginasi opini"
                className="mt-12 flex items-center justify-between border-t border-verity-rule pt-6 font-mono text-xs"
              >
                {page > 1 ? (
                  <Link
                    href={page === 2 ? "/opini" : `/opini?page=${page - 1}`}
                    rel="prev"
                    className="border border-verity-rule px-3 py-1.5 text-verity-ink hover:border-verity-ink"
                  >
                    ← Sebelumnya
                  </Link>
                ) : (
                  <span />
                )}
                <span className="text-verity-ink-faint">
                  Halaman {page} dari {totalPages}
                </span>
                {page < totalPages ? (
                  <Link
                    href={`/opini?page=${page + 1}`}
                    rel="next"
                    className="border border-verity-rule px-3 py-1.5 text-verity-ink hover:border-verity-ink"
                  >
                    Berikutnya →
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

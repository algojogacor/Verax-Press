// Halaman desk: /desk/[slug] (indeks artikel terbit per desk dengan paginasi yang ramah perayap).
// Desk nonaktif atau tidak ditemukan menghasilkan 404; hanya artikel PUBLISHED/CORRECTED yang tampil.
import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CompactArticleCard, FeaturedArticleCard, StandardArticleCard } from "@/components/site/article-card";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import { canonicalUrl, getCanonicalBaseUrl } from "@/lib/seo/constants";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "@/lib/seo/structured-data";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

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

type PageCtx = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ page?: string }>;
};

const loadDesk = cache(async (slug: string) => {
  return db.desk.findFirst({
    where: { slug, isActive: true },
    select: { id: true, slug: true, name: true, description: true },
  });
});

function parsePageParamStrict(rawPage: string | undefined): number {
  if (!rawPage) return 1;
  if (!/^\d+$/.test(rawPage.trim())) notFound();
  const parsed = Number.parseInt(rawPage.trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 1) notFound();
  return parsed;
}

export async function generateMetadata({ params, searchParams }: PageCtx): Promise<Metadata> {
  const { slug } = await params;
  const resolvedSearch = searchParams ? await searchParams : undefined;
  const rawPage = resolvedSearch?.page;
  if (rawPage && (!/^\d+$/.test(rawPage.trim()) || Number.parseInt(rawPage.trim(), 10) < 1)) {
    return { title: "Halaman Tidak Ditemukan", robots: { index: false, follow: false } };
  }

  const desk = await loadDesk(slug);
  if (!desk) {
    return {
      title: "Desk Tidak Ditemukan",
      robots: { index: false, follow: false },
    };
  }

  const page = rawPage ? Number.parseInt(rawPage.trim(), 10) : 1;
  const path = page > 1 ? `/desk/${desk.slug}?page=${page}` : `/desk/${desk.slug}`;
  const title = page > 1 ? `${desk.name} (Halaman ${page})` : desk.name;
  const description =
    desk.description ??
    `Arsip berita, analisis, dan penjelas pada rubrik ${desk.name} di Verax Press.`;

  return buildPublicMetadata({
    title,
    description,
    path,
  });
}

export default async function DeskPage({ params, searchParams }: PageCtx) {
  const { slug } = await params;
  const resolvedSearch = searchParams ? await searchParams : undefined;
  const page = parsePageParamStrict(resolvedSearch?.page);

  const desk = await loadDesk(slug);
  if (!desk) notFound();

  const where = { status: { in: ["PUBLISHED", "CORRECTED"] }, deskId: desk.id };
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
  const pagePath = page > 1 ? `/desk/${desk.slug}?page=${page}` : `/desk/${desk.slug}`;
  const pageDescription =
    desk.description ??
    `Arsip berita, analisis, dan penjelas pada rubrik ${desk.name} di Verax Press.`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Beranda", url: canonicalUrl("/") },
          { name: desk.name, url: canonicalUrl(`/desk/${desk.slug}`) },
        ])}
      />
      <JsonLd
        data={buildCollectionPageJsonLd({
          baseUrl,
          url: canonicalUrl(pagePath),
          name: page > 1 ? `${desk.name} (Halaman ${page})` : desk.name,
          description: pageDescription,
        })}
      />

      <Breadcrumbs items={[{ label: "Beranda", href: "/" }, { label: desk.name }]} />

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

      {/* Tingkatan 3 lapis: ritme mengecil, bukan kisi seragam */}
      <section aria-label={`Artikel desk ${desk.name}`} className="pt-10">
        {articles.length === 0 ? (
          <p className="py-12 text-center font-serif text-[1.02rem] leading-relaxed text-verity-ink-soft">
            Belum ada artikel terbit di desk ini. Naskah yang sedang diproses editorial akan
            tampil di sini setelah melewati penelaahan, uji fakta, dan persetujuan redaktur.
          </p>
        ) : (
          <>
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-12">
              <div>
                <FeaturedArticleCard article={articles[0]} />
              </div>

              {articles.length > 1 ? (
                <div className="border-t border-verity-rule-strong pt-6 lg:border-t-0 lg:border-l lg:border-verity-rule lg:pl-8 lg:pt-0">
                  <p className="font-sans text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-verity-ink-soft mb-4">
                    Liputan Terkini
                  </p>
                  <div className="divide-y divide-verity-rule">
                    {articles.slice(1, 3).map((article) => (
                      <div key={article.id} className="py-4 first:pt-0 last:pb-0">
                        <StandardArticleCard article={article} kickerVariant="format" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border-t border-verity-rule-strong pt-6 lg:border-t-0 lg:border-l lg:border-verity-rule lg:pl-8 lg:pt-0">
                  <div className="border border-verity-rule bg-verity-paper-soft p-6">
                    <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-verity-accent">
                      Fokus Liputan Redaksi
                    </p>
                    <p className="mt-2.5 font-serif text-[0.92rem] italic leading-relaxed text-verity-ink-soft">
                      Setiap liputan di desk ini dikerjakan dengan disiplin verifikasi sumber primer
                      serta keterbukaan metodologi penelaahan.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {articles.length > 3 ? (
              <div className="mt-14 border-t border-verity-rule-strong pt-8">
                <p className="font-sans text-[0.8rem] font-semibold uppercase tracking-[0.2em] text-verity-ink-soft mb-6">
                  Arsip Naskah {desk.name}
                </p>
                <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                  {articles.slice(3).map((article) => (
                    <CompactArticleCard key={article.id} article={article} showTime />
                  ))}
                </div>
              </div>
            ) : null}

            {totalPages > 1 ? (
              <nav
                aria-label="Paginasi rubrik"
                className="mt-12 flex items-center justify-between border-t border-verity-rule pt-6 font-mono text-xs"
              >
                {page > 1 ? (
                  <Link
                    href={page === 2 ? `/desk/${desk.slug}` : `/desk/${desk.slug}?page=${page - 1}`}
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
                    href={`/desk/${desk.slug}?page=${page + 1}`}
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

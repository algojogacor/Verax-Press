// Profil publik penulis dan arsip karya terbit. Sesuai prinsip proteksi privasi:
// Profil dengan mode anonim tidak memiliki pranala publik (artikel menampilkan "Anonim"),
// sehingga halaman ini hanya dapat diakses untuk nama asli atau nama pena terdaftar.
import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { FeaturedArticleCard, CompactArticleCard } from "@/components/site/article-card";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { canonicalUrl, getCanonicalBaseUrl } from "@/lib/seo/constants";
import { formatDate } from "@/lib/format";
import {
  buildBreadcrumbJsonLd,
  buildProfilePageJsonLd,
  isAnonymousMode,
} from "@/lib/seo/structured-data";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface PageCtx {
  params: Promise<{ id: string }>;
}

const loadPerson = cache(async (id: string) => {
  return db.person.findUnique({
    where: { id },
    include: {
      contributions: {
        where: { publicCredit: true, article: { status: { in: ["PUBLISHED", "CORRECTED"] } } },
        orderBy: { article: { publishedAt: "desc" } },
        include: {
          article: {
            select: {
              id: true,
              slug: true,
              title: true,
              deck: true,
              format: true,
              byline: true,
              publishedAt: true,
              firstPublishedAt: true,
              desk: { select: { slug: true, name: true } },
            },
          },
        },
      },
    },
  });
});

export async function generateMetadata({ params }: PageCtx): Promise<Metadata> {
  const { id } = await params;
  const person = await loadPerson(id);
  if (!person || isAnonymousMode(person.anonymityMode)) {
    return {
      title: "Profil Penulis Tidak Ditemukan",
      robots: { index: false, follow: false },
    };
  }

  const hasPublicWorks = person.contributions.length > 0;
  const description =
    person.bio ??
    `Daftar karya terbit dan keterlibatan editorial ${person.publicName} di Verax Press.`;

  return {
    title: person.publicName,
    description,
    alternates: { canonical: `/penulis/${person.id}` },
    robots: { index: hasPublicWorks, follow: true },
    openGraph: {
      title: `${person.publicName} | Verax Press`,
      description,
      url: `/penulis/${person.id}`,
      siteName: "Verax Press",
      type: "profile",
      locale: "id_ID",
      images: [
        {
          url: "/brand/verax-press-og.png",
          width: 1200,
          height: 630,
          alt: `${person.publicName} | Verax Press`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${person.publicName} | Verax Press`,
      description,
      images: ["/brand/verax-press-og.png"],
    },
  };
}

export default async function AuthorPage({ params }: PageCtx) {
  const { id } = await params;
  const person = await loadPerson(id);

  if (!person || isAnonymousMode(person.anonymityMode)) notFound();

  const displayName = person.publicName;
  const hasPublicWorks = person.contributions.length > 0;
  const baseUrl = getCanonicalBaseUrl();

  const writerWorks = person.contributions.filter(
    (c) => c.role.toUpperCase() === "WRITER" || c.role.toUpperCase() === "AUTHOR",
  );
  const otherWorks = person.contributions.filter(
    (c) => c.role.toUpperCase() !== "WRITER" && c.role.toUpperCase() !== "AUTHOR",
  );

  const ROLE_LABEL: Record<string, string> = {
    EDITOR: "Menyunting",
    REPORTER: "Melaporkan",
    PHOTOGRAPHER: "Foto",
    REVIEWER: "Meninjau",
    VISUAL: "Visual",
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6 md:pt-12">
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Beranda", url: canonicalUrl("/") },
          { name: displayName, url: canonicalUrl(`/penulis/${person.id}`) },
        ])}
      />
      {hasPublicWorks ? (
        <JsonLd
          data={buildProfilePageJsonLd({
            baseUrl,
            personId: person.id,
            name: displayName,
            bio: person.bio,
          })}
        />
      ) : null}

      <Breadcrumbs items={[{ label: "Beranda", href: "/" }, { label: displayName }]} />

      <header className="border-b-2 border-verity-ink pb-6 mb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-verity-accent">
          {person.staffUserId === "pemredVP_official"
            ? "Pemimpin Redaksi"
            : person.accountType === "STAFF"
              ? "Staf Redaksi"
              : "Penulis"}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold md:text-4xl tracking-tight text-verity-ink">
          {displayName}
        </h1>
        {person.bio && (
          <p className="mt-3 max-w-xl font-serif text-[14px] leading-relaxed text-verity-ink-soft">{person.bio}</p>
        )}
      </header>

      {writerWorks.length === 0 && otherWorks.length === 0 ? (
        person.accountType === "STAFF" ? (
          <div className="border border-verity-rule bg-verity-paper-soft p-6 max-w-xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-verity-accent">
              Ruang Redaksi Verax Press
            </p>
            <p className="mt-2 font-serif text-[0.98rem] leading-relaxed text-verity-ink">
              {displayName} adalah bagian dari tim redaksi Verax Press yang berkontribusi dalam riset liputan, kurasi naskah, dan verifikasi sumber primer.
            </p>
            <div className="mt-4 pt-3 border-t border-verity-rule flex items-center justify-between text-xs font-mono text-verity-ink-soft">
              <span>Ex Fontibus Veritas</span>
              <Link href="/tentang" className="underline hover:text-verity-accent">
                Susunan Redaksi →
              </Link>
            </div>
          </div>
        ) : null
      ) : writerWorks.length === 0 ? (
        <div className="max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-verity-ink-soft border-b border-verity-rule pb-2.5 mb-6">
            Keterlibatan Editorial &amp; Penyuntingan
          </p>
          <ul className="divide-y divide-verity-rule border-b border-verity-rule">
            {otherWorks.map((c) => (
              <li key={c.id} className="py-4 first:pt-0">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-verity-accent">
                    {ROLE_LABEL[c.role.toUpperCase()] ?? c.role}
                  </span>
                  {c.article.desk ? (
                    <>
                      <span className="text-verity-ink-faint">·</span>
                      <span className="font-mono text-[11px] text-verity-ink-soft">
                        {c.article.desk.name}
                      </span>
                    </>
                  ) : null}
                  {c.article.publishedAt ? (
                    <>
                      <span className="text-verity-ink-faint">·</span>
                      <time className="font-mono text-[11px] text-verity-ink-faint" dateTime={c.article.publishedAt.toISOString()}>
                        {formatDate(c.article.publishedAt)}
                      </time>
                    </>
                  ) : null}
                </div>
                <h3 className="mt-1.5 font-serif text-[1.2rem] font-medium leading-snug text-verity-ink">
                  <Link
                    href={`/artikel/${c.article.slug}`}
                    className="hover:text-verity-accent transition-colors"
                  >
                    {c.article.title}
                  </Link>
                </h3>
                {c.article.deck ? (
                  <p className="mt-1 font-serif text-[0.92rem] text-verity-ink-soft line-clamp-2">
                    {c.article.deck}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-12">
          <div className={`${otherWorks.length > 0 ? "lg:col-span-8" : "lg:col-span-12 max-w-4xl"} space-y-8`}>
            {writerWorks.slice(0, 2).map((c) => (
              <FeaturedArticleCard
                key={c.id}
                article={{
                  id: c.article.id,
                  slug: c.article.slug,
                  title: c.article.title,
                  deck: c.article.deck,
                  format: c.article.format,
                  byline: c.article.byline,
                  publishedAt: c.article.publishedAt,
                  firstPublishedAt: c.article.firstPublishedAt,
                  desk: c.article.desk,
                }}
              />
            ))}
            {writerWorks.length > 2 && (
              <ul className="border-t border-verity-rule">
                {writerWorks.slice(2).map((c) => (
                  <CompactArticleCard
                    key={c.id}
                    article={{
                      id: c.article.id,
                      slug: c.article.slug,
                      title: c.article.title,
                      deck: c.article.deck,
                      format: c.article.format,
                      byline: c.article.byline,
                      publishedAt: c.article.publishedAt,
                      firstPublishedAt: c.article.firstPublishedAt,
                      desk: c.article.desk,
                    }}
                    showTime
                  />
                ))}
              </ul>
            )}
          </div>
          {otherWorks.length > 0 && (
            <aside className="lg:col-span-4" aria-label="Peran editorial lain">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-verity-ink-faint border-b border-verity-rule pb-2 mb-4">
                Keterlibatan lain
              </p>
              <ul className="space-y-3">
                {otherWorks.map((c) => (
                  <li key={c.id} className="text-[13px]">
                    <span className="text-verity-ink-faint">
                      {ROLE_LABEL[c.role.toUpperCase()] ?? c.role} ·{" "}
                    </span>
                    <Link
                      href={`/artikel/${c.article.slug}`}
                      className="font-medium text-verity-ink hover:text-verity-accent transition-colors"
                    >
                      {c.article.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

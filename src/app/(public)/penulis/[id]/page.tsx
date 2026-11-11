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
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-verity-accent">Penulis</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold md:text-4xl tracking-tight text-verity-ink">
          {displayName}
        </h1>
        {person.bio && (
          <p className="mt-3 max-w-xl font-serif text-[14px] leading-relaxed text-verity-ink-soft">{person.bio}</p>
        )}
      </header>

      {writerWorks.length === 0 && otherWorks.length === 0 ? (
        <div className="border border-dashed border-verity-rule px-6 py-12 text-center">
          <p className="font-serif text-lg text-verity-ink-soft">Belum ada karya yang terbit.</p>
        </div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-8">
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

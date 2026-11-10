// Author page — public profile + published articles. Respects anonymity rules:
// 'ANON' profiles are never linked (article pages render "Anonim" without a link),
// so this page is only reachable for real-name / pen-name profiles.
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { parseContentSafe, estimateReadingMinutes } from "@/lib/domain/content";
import { FeaturedArticleCard, CompactArticleCard } from "@/components/site/article-card";
import type { Metadata } from "next";

interface PageCtx {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageCtx): Promise<Metadata> {
  const { id } = await params;
  const person = await db.person.findUnique({ where: { id } });
  if (!person || person.anonymityMode.toUpperCase() === "ANON") return { title: "Verax Press" };
  return { title: `${person.publicName} — Verax Press` };
}

export default async function AuthorPage({ params }: PageCtx) {
  const { id } = await params;
  const person = await db.person.findUnique({
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
              contentJson: true,
              desk: { select: { slug: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!person || person.anonymityMode.toUpperCase() === "ANON") notFound();

  const displayName = person.publicName;

  // Writer contributions become feature cards; other roles list compactly with role labels.
  const writerWorks = person.contributions.filter((c) => c.role.toUpperCase() === "WRITER" || c.role.toUpperCase() === "AUTHOR");
  const otherWorks = person.contributions.filter((c) => c.role.toUpperCase() !== "WRITER" && c.role.toUpperCase() !== "AUTHOR");

  const ROLE_LABEL: Record<string, string> = {
    EDITOR: "Menyunting",
    REPORTER: "Melaporkan",
    PHOTOGRAPHER: "Foto",
    REVIEWER: "Meninjau",
    VISUAL: "Visual",
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6 md:pt-12">
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

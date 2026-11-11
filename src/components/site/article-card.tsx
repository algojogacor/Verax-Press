// Kartu artikel — hierarki lewat tipografi & posisi, bukan warna/badge mencolok.
// Varian (urut dari paling dominan):
//   "lead"     — berita utama homepage (skala terbesar, napas terbesar)
//   "featured" — unggulan per-seksi / pembuka halaman desk (tier 1.6rem)
//   "standard" — kartu grid
//   "row"      — baris editorial headline+deck berdampingan
//   "compact"  — daftar ringkas (rail Terbaru, artikel terkait)
//   "opinion"  — item seksi Opini (byline menonjol)
// Konvensi kicker: di DALAM seksi desk hanya format (nama desk sudah diucapkan
// heading seksi); di kartu berdiri sendiri (lead, halaman artikel) pakai desk·format.
import Link from "next/link";
import type { Article, Desk } from "@prisma/client";
import { FORMAT_LABELS } from "@/lib/domain/constants";
import type { ArticleFormat } from "@/types/verity";
import { formatDate, formatRailTimestamp } from "@/lib/format";

export type PublicArticle = Pick<
  Article,
  "id" | "slug" | "title" | "deck" | "format" | "byline" | "publishedAt" | "firstPublishedAt"
> & { desk: Pick<Desk, "slug" | "name"> };

export type KickerVariant = "desk" | "format";

function Kicker({
  desk,
  format,
  variant = "desk",
}: {
  desk: PublicArticle["desk"];
  format: string;
  variant?: KickerVariant;
}) {
  const isOpinion = format === "OPINION";
  return (
    <p className="font-mono text-[12px] font-medium uppercase tracking-[0.18em]">
      {variant === "desk" ? (
        <>
          <span className={isOpinion ? "text-verity-accent" : "text-verity-ink-soft"}>{desk.name}</span>
          <span className="mx-1.5 text-verity-ink-faint">·</span>
        </>
      ) : null}
      <span className={isOpinion ? "text-verity-accent" : "text-verity-ink-faint"}>
        {FORMAT_LABELS[format as ArticleFormat] ?? format}
      </span>
    </p>
  );
}

function Meta({ article, className = "" }: { article: PublicArticle; className?: string }) {
  return (
    <p className={`font-mono text-[11px] text-verity-ink-faint ${className}`}>
      <span className="text-verity-ink-soft">{article.byline}</span>
      <span className="mx-1.5">·</span>
      <time dateTime={article.publishedAt?.toISOString()}>
        {formatDate(article.publishedAt ?? article.firstPublishedAt)}
      </time>
    </p>
  );
}

/** Berita utama homepage: elemen paling dominan di halaman dengan tipografi responsif terukur. */
export function LeadArticleCard({ article }: { article: PublicArticle }) {
  return (
    <article className="pt-5 sm:pt-9">
      <Kicker desk={article.desk} format={article.format} />
      <h2 className="mt-3.5 text-balance font-serif text-[1.45rem] font-semibold leading-[1.16] tracking-[-0.012em] text-verity-ink sm:mt-4 sm:text-[2.5rem] sm:leading-[1.08] lg:text-[3.25rem]">
        <Link href={`/artikel/${article.slug}`} className="block hover:text-verity-accent-deep">
          {article.title}
        </Link>
      </h2>
      {article.deck ? (
        <p className="mt-3.5 max-w-[58ch] font-serif text-[1.05rem] italic leading-[1.55] text-verity-ink-soft sm:mt-5 sm:text-[1.25rem] sm:leading-[1.5]">
          {article.deck}
        </p>
      ) : null}
      <div className="mt-5 border-t border-verity-rule-strong pt-3 sm:mt-6 sm:pt-3.5">
        <Meta article={article} />
      </div>
    </article>
  );
}

/** Unggulan per-seksi / pembuka listing desk: tier di bawah lead, di atas standard. */
export function FeaturedArticleCard({ article }: { article: PublicArticle }) {
  return (
    <article>
      <Kicker desk={article.desk} format={article.format} variant="format" />
      <h3 className="mt-2 text-balance font-serif text-[1.4rem] font-semibold leading-[1.18] tracking-[-0.008em] text-verity-ink sm:mt-2.5 sm:text-[1.7rem]">
        <Link href={`/artikel/${article.slug}`} className="block hover:text-verity-accent-deep">
          {article.title}
        </Link>
      </h3>
      {article.deck ? (
        <p className="mt-2.5 line-clamp-3 font-serif text-[0.98rem] italic leading-[1.6] text-verity-ink-soft sm:mt-3 sm:text-[1.05rem]">
          {article.deck}
        </p>
      ) : null}
      <Meta article={article} className="mt-3 sm:mt-3.5" />
    </article>
  );
}

export function StandardArticleCard({
  article,
  kickerVariant = "desk",
}: {
  article: PublicArticle;
  kickerVariant?: KickerVariant;
}) {
  return (
    <article className="border-t border-verity-rule pt-4">
      <Kicker desk={article.desk} format={article.format} variant={kickerVariant} />
      <h3 className="mt-2 font-serif text-[1.3rem] font-semibold leading-[1.22] text-verity-ink">
        <Link href={`/artikel/${article.slug}`} className="block hover:text-verity-accent-deep">
          {article.title}
        </Link>
      </h3>
      {article.deck ? (
        <p className="mt-2 line-clamp-2 font-serif text-[0.95rem] italic leading-[1.55] text-verity-ink-soft">
          {article.deck}
        </p>
      ) : null}
      <Meta article={article} className="mt-2.5" />
    </article>
  );
}

/** Baris editorial: headline (kiri) + deck (kanan) — untuk seksi dengan ritme horizontal. */
export function RowArticleCard({ article }: { article: PublicArticle }) {
  return (
    <article className="grid gap-x-10 gap-y-2 border-b border-verity-rule py-6 last:border-b-0 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] sm:gap-y-1.5">
      <div>
        <Kicker desk={article.desk} format={article.format} variant="format" />
        <h3 className="mt-1.5 font-serif text-[1.3rem] font-semibold leading-[1.22] text-verity-ink">
          <Link href={`/artikel/${article.slug}`} className="block hover:text-verity-accent-deep">
            {article.title}
          </Link>
        </h3>
        <Meta article={article} className="mt-2" />
      </div>
      {article.deck ? (
        <p className="line-clamp-3 font-serif text-[0.95rem] italic leading-[1.6] text-verity-ink-soft sm:pt-[1.4rem]">
          {article.deck}
        </p>
      ) : null}
    </article>
  );
}

export function CompactArticleCard({
  article,
  showTime = false,
  ticker = false,
}: {
  article: PublicArticle;
  showTime?: boolean;
  /** Mode ticker (rail Terbaru): stempel relatif + jam — identitas "terbaru",
   *  sehingga item yang juga muncul di seksi terbaca sebagai konvensi koran. */
  ticker?: boolean;
}) {
  return (
    <article className="border-b border-verity-rule py-3.5 last:border-b-0">
      <h3 className="font-serif text-[1.05rem] font-medium leading-snug text-verity-ink">
        <Link href={`/artikel/${article.slug}`} className="block hover:text-verity-accent-deep">
          {article.title}
        </Link>
      </h3>
      <p className="mt-1 font-mono text-[11px] text-verity-ink-faint">
        {ticker ? (
          <time dateTime={article.publishedAt?.toISOString()}>
            {formatRailTimestamp(article.publishedAt ?? article.firstPublishedAt)}
          </time>
        ) : (
          <>
            {article.byline}
            <span className="mx-1.5">·</span>
            {showTime ? (
              <time dateTime={article.publishedAt?.toISOString()}>
                {formatDate(article.publishedAt ?? article.firstPublishedAt)}
              </time>
            ) : (
              <>{article.desk.name}</>
            )}
          </>
        )}
      </p>
    </article>
  );
}

/** Item seksi Opini — byline penulis menjadi elemen utama kedua. */
export function OpinionArticleCard({ article }: { article: PublicArticle }) {
  return (
    <article>
      <h3 className="font-serif text-[1.2rem] font-semibold leading-[1.25] text-verity-ink">
        <Link href={`/artikel/${article.slug}`} className="block hover:text-verity-accent-deep">
          {article.title}
        </Link>
      </h3>
      <p className="mt-2 font-serif text-[0.98rem] italic text-verity-ink">{article.byline}</p>
      <p className="mt-1 font-mono text-[11px] text-verity-ink-faint">
        <time dateTime={article.publishedAt?.toISOString()}>
          {formatDate(article.publishedAt ?? article.firstPublishedAt)}
        </time>
      </p>
    </article>
  );
}

/** Label seksi — small caps sans + rule berat 2px. KECIL tapi tegas:
 *  struktur halaman (sans) tidak boleh menyaingi konten (serif). */
export function SectionHeading({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b-2 border-verity-ink pb-2.5">
      <h2 className="font-sans text-[0.85rem] font-semibold uppercase tracking-[0.2em] text-verity-ink">{title}</h2>
      {href ? (
        <Link
          href={href}
          className="shrink-0 font-mono text-[11px] uppercase tracking-[0.12em] text-verity-ink-soft underline-offset-4 hover:text-verity-accent hover:underline"
        >
          {linkLabel ?? "Lihat semua"}
        </Link>
      ) : null}
    </div>
  );
}

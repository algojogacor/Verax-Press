// Halaman artikel publik: /artikel/[slug]
// Hanya status PUBLISHED/CORRECTED yang menampilkan isi dan terindeks;
// RETRACTED/ARCHIVED menampilkan banner penarikan dengan noindex; status lain -> 404.
import type { Metadata } from "next";
import { cache, Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ContentRenderer } from "@/components/content/content-renderer";
import { parseContentSafe, estimateReadingMinutes } from "@/lib/domain/content";
import {
  AI_SUBSTANTIVE_NOTE_DEFAULT,
  FORMAT_LABELS,
  OPINION_DISCLAIMER,
  SOURCE_TYPE_LABELS,
  VERIFICATION_LABELS,
} from "@/lib/domain/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import { CompactArticleCard } from "@/components/site/article-card";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { canonicalUrl, getCanonicalBaseUrl } from "@/lib/seo/constants";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  getArticleSeoDates,
  isAnonymousMode,
  isRasterImageUrl,
  resolveAbsoluteAssetUrl,
} from "@/lib/seo/structured-data";
import { safeExternalHttpUrl, safeMediaSrcUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

const loadArticle = cache(async (slug: string) => {
  return db.article.findUnique({
    where: { slug },
    include: {
      desk: true,
      heroMedia: { select: { url: true, caption: true, title: true } },
      contributions: {
        where: { publicCredit: true },
        orderBy: [{ displayOrder: "asc" }],
        select: {
          role: true,
          person: { select: { id: true, publicName: true, anonymityMode: true } },
        },
      },
      sources: { orderBy: [{ isKeySource: "desc" }, { createdAt: "asc" }] },
      corrections: {
        orderBy: { correctedAt: "desc" },
        include: { approvedBy: { select: { name: true } } },
      },
    },
  });
});

function collectArticleRasterImages(
  baseUrl: string,
  heroUrl: string | null | undefined,
  content: ReturnType<typeof parseContentSafe>,
): string[] {
  const candidates: string[] = [];
  if (heroUrl && safeMediaSrcUrl(heroUrl)) {
    candidates.push(heroUrl);
  }
  for (const block of content) {
    if (block.type === "image" && safeMediaSrcUrl(block.url)) {
      candidates.push(block.url);
    }
  }
  const resolved = candidates
    .map((url) => resolveAbsoluteAssetUrl(baseUrl, url))
    .filter((url): url is string => url !== null && isRasterImageUrl(url));
  return [...new Set(resolved)];
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const article = await loadArticle(slug);

  const isLive = article && (article.status === "PUBLISHED" || article.status === "CORRECTED");
  const isWithdrawn = article && (article.status === "RETRACTED" || article.status === "ARCHIVED");

  if (!article || (!isLive && !isWithdrawn)) {
    return {
      title: "Artikel Tidak Ditemukan",
      robots: { index: false, follow: false },
    };
  }

  const canonicalPath = `/artikel/${article.slug}`;

  if (isWithdrawn) {
    return {
      title: article.title,
      description: article.deck ?? undefined,
      alternates: { canonical: canonicalPath },
      robots: { index: false, follow: true },
    };
  }

  const baseUrl = getCanonicalBaseUrl();
  const content = parseContentSafe(article.contentJson);
  const seoDates = getArticleSeoDates({
    status: article.status,
    firstPublishedAt: article.firstPublishedAt,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    corrections: article.corrections,
  });

  const writerProfileUrls = article.contributions
    .filter(
      (c) =>
        !isAnonymousMode(c.person.anonymityMode) &&
        ["AUTHOR", "WRITER", "REPORTER"].includes(c.role.toUpperCase()),
    )
    .map((c) => canonicalUrl(`/penulis/${c.person.id}`));

  const articleImages = collectArticleRasterImages(baseUrl, article.heroMedia?.url, content);
  const ogImages =
    articleImages.length > 0
      ? articleImages.map((url) => ({
          url,
          alt: article.heroMedia?.caption || article.title,
        }))
      : [
          {
            url: canonicalUrl("/brand/verax-press-og.png"),
            width: 1200,
            height: 630,
            alt: article.title,
          },
        ];

  return {
    title: article.title,
    description: article.deck ?? undefined,
    alternates: { canonical: canonicalPath },
    robots: { index: true, follow: true },
    openGraph: {
      title: article.title,
      description: article.deck ?? undefined,
      url: canonicalPath,
      siteName: "Verax Press",
      type: "article",
      locale: "id_ID",
      section: article.desk.name,
      ...(seoDates.publishedAt ? { publishedTime: seoDates.publishedAt.toISOString() } : {}),
      ...(seoDates.modifiedAt ? { modifiedTime: seoDates.modifiedAt.toISOString() } : {}),
      ...(writerProfileUrls.length > 0 ? { authors: writerProfileUrls } : {}),
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.deck ?? undefined,
      images: ogImages.map((img) => img.url),
    },
  };
}

function verificationClass(status: string) {
  if (status === "VERIFIED") return "text-verity-verified";
  if (status === "DISPUTED") return "text-verity-disputed";
  return "text-verity-unverified";
}

function renderLinkedByline(
  byline: string,
  writerCredits: Array<{ id: string; publicName: string }>,
) {
  if (byline.trim().toLowerCase() === "anonim" || writerCredits.length === 0) {
    return byline;
  }

  if (writerCredits.length === 1) {
    const writer = writerCredits[0];
    const idx = byline.toLowerCase().indexOf(writer.publicName.toLowerCase());
    if (idx >= 0) {
      const before = byline.slice(0, idx);
      const matched = byline.slice(idx, idx + writer.publicName.length);
      const after = byline.slice(idx + writer.publicName.length);
      return (
        <>
          {before}
          <Link
            href={`/penulis/${writer.id}`}
            className="underline decoration-verity-rule-strong underline-offset-4 hover:text-verity-accent"
          >
            {matched}
          </Link>
          {after}
        </>
      );
    }
  }

  return byline;
}

export default async function ArticlePage({ params }: Params) {
  const { slug } = await params;
  const article = await loadArticle(slug);
  if (!article) notFound();

  const isLive = article.status === "PUBLISHED" || article.status === "CORRECTED";
  const isWithdrawn = article.status === "RETRACTED" || article.status === "ARCHIVED";
  if (!isLive && !isWithdrawn) notFound(); // draft/review tidak pernah tampil publik

  const content = parseContentSafe(article.contentJson);
  const readingMinutes = estimateReadingMinutes(content);
  const baseUrl = getCanonicalBaseUrl();
  const seoDates = getArticleSeoDates({
    status: article.status,
    firstPublishedAt: article.firstPublishedAt,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    corrections: article.corrections,
  });

  const publicPeople = article.contributions.filter(
    (c) => !isAnonymousMode(c.person.anonymityMode),
  );
  const writerCredits = publicPeople
    .filter((c) => ["AUTHOR", "WRITER", "REPORTER"].includes(c.role.toUpperCase()))
    .map((c) => c.person);
  const editorCredits = publicPeople
    .filter((c) => c.role.toUpperCase() === "EDITOR")
    .map((c) => c.person);

  const bylineIncludesSingleWriter =
    writerCredits.length === 1 &&
    article.byline.toLowerCase().includes(writerCredits[0].publicName.toLowerCase());
  const extraWriterCredits =
    article.byline.trim().toLowerCase() === "anonim" || bylineIncludesSingleWriter
      ? []
      : writerCredits;

  const articleImages = collectArticleRasterImages(baseUrl, article.heroMedia?.url, content);

  const related = await db.article.findMany({
    where: {
      status: { in: ["PUBLISHED", "CORRECTED"] },
      deskId: article.deskId,
      id: { not: article.id },
    },
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
    orderBy: { publishedAt: "desc" },
    take: 3,
  });

  const isOpinion = article.format === "OPINION";

  return (
    <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Beranda", url: canonicalUrl("/") },
          { name: article.desk.name, url: canonicalUrl(`/desk/${article.desk.slug}`) },
          { name: article.title, url: canonicalUrl(`/artikel/${article.slug}`) },
        ])}
      />
      {isLive ? (
        <JsonLd
          data={buildArticleJsonLd({
            baseUrl,
            slug: article.slug,
            title: article.title,
            deck: article.deck,
            format: article.format,
            byline: article.byline,
            publishedAt: seoDates.publishedAt,
            modifiedAt: seoDates.modifiedAt,
            deskName: article.desk.name,
            authorCredits: article.contributions.map((c) => ({
              id: c.person.id,
              publicName: c.person.publicName,
              role: c.role,
              anonymityMode: c.person.anonymityMode,
            })),
            imageUrls: articleImages,
          })}
        />
      ) : null}

      <Breadcrumbs
        items={[
          { label: "Beranda", href: "/" },
          { label: article.desk.name, href: `/desk/${article.desk.slug}` },
          { label: article.title },
        ]}
      />

      {/* Header Artikel */}
      <header className="border-b border-verity-rule pb-7">
        {/* Kicker */}
        <nav aria-label="Konteks artikel" className="font-mono text-[12px] font-medium uppercase tracking-[0.18em]">
          <Link href={`/desk/${article.desk.slug}`} className="text-verity-accent hover:text-verity-accent-deep">
            {article.desk.name}
          </Link>
          <span className="mx-1.5 text-verity-ink-faint">·</span>
          <span className="text-verity-ink-faint">{FORMAT_LABELS[article.format as keyof typeof FORMAT_LABELS]}</span>
        </nav>

        {/* Headline */}
        <h1 className="mt-3.5 text-balance font-serif text-[1.85rem] font-semibold leading-[1.12] tracking-[-0.015em] text-verity-ink sm:mt-4 sm:text-[2.6rem] sm:leading-[1.08] lg:text-[2.9rem]">
          {article.title}
        </h1>
        {article.deck ? (
          <p className="mt-4 max-w-3xl font-serif text-[1.1rem] italic leading-[1.55] text-verity-ink-soft sm:mt-5 sm:text-[1.25rem] sm:leading-[1.5]">
            {article.deck}
          </p>
        ) : null}

        {/* Byline, kredit redaksi, & tanggal */}
        <div className="mt-6 flex flex-wrap items-start justify-between gap-y-2 border-t border-verity-rule pt-3.5 text-sm">
          <div>
            <p className="font-serif text-[1.05rem] font-medium text-verity-ink">
              {renderLinkedByline(article.byline, writerCredits)}
            </p>
            {extraWriterCredits.length > 0 ? (
              <p className="mt-0.5 font-mono text-[11px] text-verity-ink-faint">
                Penulis:{" "}
                {extraWriterCredits.map((person, idx) => (
                  <Fragment key={person.id}>
                    {idx > 0 ? ", " : ""}
                    <Link
                      href={`/penulis/${person.id}`}
                      className="underline decoration-verity-rule-strong underline-offset-4 hover:text-verity-accent"
                    >
                      {person.publicName}
                    </Link>
                  </Fragment>
                ))}
              </p>
            ) : null}
            {editorCredits.length > 0 ? (
              <p className="mt-0.5 font-mono text-[11px] text-verity-ink-faint">
                Disunting oleh{" "}
                {editorCredits.map((person, idx) => (
                  <Fragment key={person.id}>
                    {idx > 0 ? ", " : ""}
                    <Link
                      href={`/penulis/${person.id}`}
                      className="underline decoration-verity-rule-strong underline-offset-4 hover:text-verity-accent"
                    >
                      {person.publicName}
                    </Link>
                  </Fragment>
                ))}
              </p>
            ) : null}
          </div>
          <p className="font-mono text-[11px] text-verity-ink-faint">
            Diterbitkan{" "}
            <time dateTime={seoDates.publishedAt?.toISOString()}>
              {formatDate(seoDates.publishedAt)}
            </time>
            {seoDates.modifiedAt ? (
              <>
                {" · Diperbarui "}
                <time dateTime={seoDates.modifiedAt.toISOString()}>
                  {formatDateTime(seoDates.modifiedAt)}
                </time>
              </>
            ) : null}
            {isLive ? ` · ${readingMinutes} menit baca` : ""}
          </p>
        </div>
      </header>

      {/* Grid Utama: Kolom Baca di Kiri + Sidebar Redaksi di Kanan */}
      <div className="mt-9 grid gap-12 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-14">
        {/* Kolom Baca Utama */}
        <div className="min-w-0">
          {/* Pernyataan sanggahan opini */}
          {isOpinion ? (
            <aside className="mb-6 max-w-(--measure-article) border border-verity-rule bg-verity-paper-soft px-5 py-4">
              <p className="font-mono text-[12px] font-medium uppercase tracking-[0.18em] text-verity-accent">Opini</p>
              <p className="mt-1.5 font-serif text-[0.95rem] leading-relaxed text-verity-ink-soft">
                {OPINION_DISCLAIMER}
              </p>
            </aside>
          ) : null}

          {/* Keterbukaan penggunaan AI */}
          {isLive && article.aiDisclosurePublic && article.aiInvolvement !== "none" ? (
            <aside className="mb-6 max-w-(--measure-article) border border-verity-rule bg-verity-paper-soft px-5 py-4">
              <p className="font-mono text-[12px] font-medium uppercase tracking-[0.18em] text-verity-ink-soft">
                Catatan proses · Keterlibatan AI: {article.aiInvolvement === "substantive" ? "substantif" : "asistif"}
              </p>
              <p className="mt-1.5 font-serif text-[0.95rem] leading-relaxed text-verity-ink-soft">
                {article.aiDisclosureNote ?? AI_SUBSTANTIVE_NOTE_DEFAULT}
              </p>
            </aside>
          ) : null}

          {/* Koreksi */}
          {article.corrections.length > 0 ? (
            <aside className="mb-6 max-w-(--measure-article) border-l-2 border-verity-accent bg-verity-paper-soft px-5 py-4" aria-label="Koreksi">
              <p className="font-mono text-[12px] font-medium uppercase tracking-[0.18em] text-verity-accent">
                Koreksi · {formatDate(article.corrections[0].correctedAt)}
              </p>
              <p className="mt-1.5 font-serif text-[0.95rem] leading-relaxed text-verity-ink-soft">
                {article.corrections[0].publicNote}
              </p>
              {article.corrections.length > 1 ? (
                <p className="mt-2 font-mono text-[11px] text-verity-ink-faint">
                  {article.corrections.length - 1} koreksi lainnya tercatat pada{" "}
                  <Link href="/koreksi" className="underline underline-offset-4 hover:text-verity-accent">
                    log koreksi
                  </Link>
                  .
                </p>
              ) : null}
            </aside>
          ) : null}

          {/* Isi Konten */}
          {isWithdrawn ? (
            <div className="max-w-(--measure-article)">
              <div className="border-y border-verity-rule py-8">
                <p className="font-mono text-[12px] font-medium uppercase tracking-[0.18em] text-verity-accent">
                  Artikel telah {article.status === "RETRACTED" ? "dicabut" : "diarsipkan"} redaksi
                </p>
                <p className="mt-3 font-serif text-[0.98rem] leading-relaxed text-verity-ink-soft">
                  Sesuai kebijakan integritas arsip, halaman ini dipertahankan sebagai catatan bahwa
                  artikel pernah terbit, namun isinya tidak lagi disajikan. Judul, byline, dan tanggal
                  publikasi tetap ditampilkan untuk kepentingan penelusuran.
                </p>
              </div>
            </div>
          ) : (
            <ContentRenderer content={content} endMark />
          )}

          {/* Sumber & verifikasi */}
          {isLive && article.sources.length > 0 ? (
            <section aria-label="Sumber dan verifikasi" className="mt-14 max-w-3xl border-t-2 border-verity-ink pt-8">
              <h2 className="font-serif text-[1.45rem] font-semibold text-verity-ink">Sumber &amp; Verifikasi</h2>
              <p className="mt-2.5 font-serif text-[0.95rem] italic leading-relaxed text-verity-ink-soft">
                Daftar rujukan yang digunakan redaksi. Status verifikasi ditelaah langsung oleh redaktur
                sebelum naskah disetujui.
              </p>
              <ul className="mt-6 space-y-5">
                {article.sources.map((source) => {
                  const safeUrl = safeExternalHttpUrl(source.url);
                  return (
                    <li key={source.id} className="border-t border-verity-rule pt-4">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        {safeUrl ? (
                          <a
                            href={safeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-serif text-[1rem] font-medium text-verity-ink underline decoration-verity-rule-strong underline-offset-4 hover:text-verity-accent"
                          >
                            {source.title}
                          </a>
                        ) : (
                          <span className="font-serif text-[1rem] font-medium text-verity-ink">{source.title}</span>
                        )}
                        {source.isKeySource ? (
                          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-verity-accent">
                            Sumber kunci
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 font-mono text-[11px] leading-relaxed text-verity-ink-faint">
                        {source.publisher ? `${source.publisher} · ` : ""}
                        {SOURCE_TYPE_LABELS[source.sourceType as keyof typeof SOURCE_TYPE_LABELS]}
                        {source.accessedAt ? ` · Diakses ${formatDate(source.accessedAt)}` : ""}
                      </p>
                      {source.supports ? (
                        <p className="mt-1.5 font-serif text-[0.88rem] leading-relaxed text-verity-ink-soft">
                          Menopang klaim: {source.supports}
                        </p>
                      ) : null}
                      <p className={`mt-1 font-mono text-[11px] ${verificationClass(source.verificationStatus)}`}>
                        {source.verificationStatus === "VERIFIED" ? "✓ " : source.verificationStatus === "DISPUTED" ? "✕ " : "• "}
                        {VERIFICATION_LABELS[source.verificationStatus as keyof typeof VERIFICATION_LABELS]}
                        {source.verifiedAt ? ` · ${formatDate(source.verifiedAt)}` : ""}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {/* Artikel terkait untuk layar mobile / tablet (< lg) */}
          {related.length > 0 ? (
            <section aria-label="Artikel lain" className="mt-12 border-t border-verity-rule pt-6 lg:hidden">
              <h2 className="font-sans text-[0.8rem] font-semibold uppercase tracking-[0.2em] text-verity-ink-soft">
                Lainnya dari {article.desk.name}
              </h2>
              <div className="mt-4">
                {related.map((item) => (
                  <CompactArticleCard key={item.id} article={item} showTime />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* Sidebar Redaksi (Desktop lg:) */}
        <aside aria-label="Konteks redaksi" className="hidden lg:block lg:border-l lg:border-verity-rule lg:pl-8">
          <div className="sticky top-6 space-y-8">
            {/* Konteks Desk */}
            <div className="border-b border-verity-rule pb-6">
              <p className="font-sans text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-verity-ink-soft">
                Desk Liputan
              </p>
              <h3 className="mt-2 font-serif text-[1.2rem] font-semibold text-verity-ink">
                <Link href={`/desk/${article.desk.slug}`} className="hover:text-verity-accent">
                  {article.desk.name}
                </Link>
              </h3>
              {article.desk.description ? (
                <p className="mt-2 font-serif text-[0.92rem] italic leading-relaxed text-verity-ink-soft">
                  {article.desk.description}
                </p>
              ) : null}
              <Link
                href={`/desk/${article.desk.slug}`}
                className="mt-3 inline-block font-mono text-[11px] uppercase tracking-[0.1em] text-verity-accent underline underline-offset-4 hover:text-verity-accent-deep"
              >
                Indeks {article.desk.name} →
              </Link>
            </div>

            {/* Artikel Terkait di Sidebar Desktop */}
            {related.length > 0 ? (
              <div className="border-b border-verity-rule pb-6">
                <h3 className="font-sans text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-verity-ink-soft">
                  Lainnya dari {article.desk.name}
                </h3>
                <div className="mt-2">
                  {related.map((item) => (
                    <CompactArticleCard key={item.id} article={item} showTime />
                  ))}
                </div>
              </div>
            ) : null}

            {/* Kotak Hak Jawab & Koreksi */}
            <div className="border border-verity-rule bg-verity-paper-soft p-5">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-verity-accent">
                Hak Jawab &amp; Koreksi
              </p>
              <p className="mt-2 font-serif text-[0.88rem] leading-relaxed text-verity-ink-soft">
                Verax Press membuka ruang koreksi dan hak jawab bagi pihak yang berkepentingan
                atas akurasi materiil pemberitaan ini.
              </p>
              <Link
                href="/keluhan"
                className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.12em] text-verity-ink underline underline-offset-4 hover:text-verity-accent"
              >
                Ajukan permohonan →
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}

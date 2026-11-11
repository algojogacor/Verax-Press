// Halaman artikel publik: /artikel/[slug]
// Hanya status PUBLISHED/CORRECTED yang menampilkan isi; RETRACTED/ARCHIVED menampilkan
// banner penarikan (integritas arsip); status lain → 404 (konten internal tidak bocor).
import type { Metadata } from "next";
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

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

async function loadArticle(slug: string) {
  return db.article.findUnique({
    where: { slug },
    include: {
      desk: true,
      sources: { orderBy: [{ isKeySource: "desc" }, { createdAt: "asc" }] },
      corrections: { orderBy: { correctedAt: "desc" }, include: { approvedBy: { select: { name: true } } } },
    },
  });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const article = await loadArticle(slug);
  if (!article) return { title: "Artikel tidak ditemukan" };
  return {
    title: article.title,
    description: article.deck ?? undefined,
    openGraph: {
      title: article.title,
      description: article.deck ?? undefined,
      type: "article",
      locale: "id_ID",
      publishedTime: article.firstPublishedAt?.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
    },
  };
}

function verificationClass(status: string) {
  if (status === "VERIFIED") return "text-verity-verified";
  if (status === "DISPUTED") return "text-verity-disputed";
  return "text-verity-unverified";
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

        {/* Byline & tanggal */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-y-2 border-t border-verity-rule pt-3.5 text-sm">
          <p className="font-serif text-[1.05rem] font-medium text-verity-ink">{article.byline}</p>
          <p className="font-mono text-[11px] text-verity-ink-faint">
            Diterbitkan {formatDate(article.firstPublishedAt ?? article.publishedAt)}
            {article.status === "CORRECTED" || article.corrections.length > 0
              ? ` · Diperbarui ${formatDateTime(article.updatedAt)}`
              : ""}
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
                {article.sources.map((source) => (
                  <li key={source.id} className="border-t border-verity-rule pt-4">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      {source.url ? (
                        <a
                          href={source.url}
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
                ))}
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

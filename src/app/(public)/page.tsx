// Halaman depan Verax Press: surat kabar yang dikurasi, bukan grid kartu seragam:
// PAKET UTAMA (lead besar + 2 headline sekunder + rail "Terbaru"), lalu seksi
// per-desk dengan tata letak yang berganti menyesuaikan jumlah artikel
// (solo → grid → baris editorial → unggulan+daftar), ditutup band Opini.
// Aturan kurasi: lead hanya tampil sekali; seksi desk hanya liputan redaksi
// (opini hidup di band Opini); rail berisi apa pun yang terbaru.
import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getActiveDesks } from "@/lib/domain/desks";
import {
  CompactArticleCard,
  FeaturedArticleCard,
  LeadArticleCard,
  OpinionArticleCard,
  RowArticleCard,
  SectionHeading,
  StandardArticleCard,
  type PublicArticle,
} from "@/components/site/article-card";
import { formatDate } from "@/lib/format";
import { JsonLd } from "@/components/seo/json-ld";
import { getCanonicalBaseUrl } from "@/lib/seo/constants";
import { buildHomepageGraphJsonLd } from "@/lib/seo/structured-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute: "Verax Press | Media Independen Indonesia",
  },
  description:
    "Berita, analisis, opini, dan penjelas tentang hukum, teknologi, serta kebijakan publik Indonesia dengan verifikasi sumber primer dan log koreksi terbuka.",
  alternates: {
    canonical: "/",
    types: {
      "application/json": "/editorial/manifest.json",
      "application/vnd.oai.openapi+json": "/openapi.json",
      "text/plain": "/llms.txt",
    },
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Verax Press | Media Independen Indonesia",
    description:
      "Berita, analisis, opini, dan penjelas tentang hukum, teknologi, serta kebijakan publik Indonesia dengan verifikasi sumber primer dan log koreksi terbuka.",
    url: "/",
    siteName: "Verax Press",
    type: "website",
    locale: "id_ID",
    images: [
      {
        url: "/brand/verax-press-og.png",
        width: 1200,
        height: 630,
        alt: "Verax Press | Media Independen Indonesia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Verax Press | Media Independen Indonesia",
    description:
      "Berita, analisis, opini, dan penjelas tentang hukum, teknologi, serta kebijakan publik Indonesia dengan verifikasi sumber primer dan log koreksi terbuka.",
    images: ["/brand/verax-press-og.png"],
  },
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

const PUBLISHED_STATUSES = ["PUBLISHED", "CORRECTED"] as const;
const PUBLISHED_FILTER = { status: { in: [...PUBLISHED_STATUSES] } };

type SectionLayout = "solo" | "featured-list" | "grid" | "rows";

/** Tata letak seksi menyesuaikan jumlah artikel & posisi seksi — seksi
 *  bersebelahan tidak boleh memakai pola yang sama. Seksi PERTAMA selalu
 *  jadi showcase (unggulan besar + standfirst desk) — ia membuka babak
 *  liputan setelah paket utama. Grid rata hanya untuk jumlah genap
 *  (baris terakhir tidak timpang). */
function pickSectionLayout(
  count: number,
  index: number,
  last: SectionLayout | null,
): SectionLayout {
  if (index === 0) return count <= 1 ? "solo" : "featured-list";
  if (count <= 1) return "solo";
  const pool: SectionLayout[] =
    count === 3 ? ["rows", "featured-list"] : ["rows", "grid", "featured-list"];
  let pick = pool[index % pool.length];
  if (pick === last) pick = pool[(pool.indexOf(pick) + 1) % pool.length];
  return pick;
}

export default async function HomePage() {
  const [latest, desks, opinion] = await Promise.all([
    db.article.findMany({
      where: PUBLISHED_FILTER,
      select: publicSelect,
      orderBy: { publishedAt: "desc" },
      take: 9,
    }),
    getActiveDesks(),
    db.article.findMany({
      where: { ...PUBLISHED_FILTER, format: "OPINION" },
      select: publicSelect,
      orderBy: { publishedAt: "desc" },
      take: 4,
    }),
  ]);

  const homepageSchema = buildHomepageGraphJsonLd(getCanonicalBaseUrl());
  const lead = latest[0] ?? null;
  // Paket utama: 2 headline sekunder (non-opini — opini punya band sendiri)
  // + rail Terbaru (5 item berikutnya, format apa pun).
  const afterLead = latest.slice(1);
  const secondaries = afterLead.filter((a) => a.format !== "OPINION").slice(0, 2);
  const terbaru = afterLead
    .filter((a) => !secondaries.some((s) => s.id === a.id))
    .slice(0, 5);

  // Artikel paket utama tidak boleh mengulang di seksi mana pun.
  const bundleIds = [lead?.id, ...secondaries.map((s) => s.id)].filter(
    (id): id is string => typeof id === "string",
  );

  // Seksi desk: liputan redaksi saja (opini dikecualikan — band Opini mengurusnya).
  const deskSections = await Promise.all(
    desks.map(async (desk) => ({
      desk,
      articles: await db.article.findMany({
        where: {
          ...PUBLISHED_FILTER,
          deskId: desk.id,
          format: { not: "OPINION" },
          id: { notIn: bundleIds },
        },
        select: publicSelect,
        orderBy: { publishedAt: "desc" },
        take: 4,
      }),
    })),
  );

  const opini = opinion.filter((a) => a.id !== lead?.id);

  if (!lead) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
        <JsonLd data={homepageSchema} />
        <h1 className="font-serif text-3xl font-semibold text-verity-ink">Belum ada artikel terbit</h1>
        <p className="mt-4 font-serif text-verity-ink-soft">
          Redaksi sedang menyiapkan publikasi pertama. Semua naskah melewati proses editorial
          sebelum tampil di halaman ini.
        </p>
      </div>
    );
  }

  const renderedSections = deskSections.filter((section) => section.articles.length > 0);
  // Hitung layout semua seksi di muka: rotasi menghindari pola yang sama
  // pada dua seksi bersebelahan.
  const sectionLayouts: SectionLayout[] = [];
  renderedSections.forEach((section, index) => {
    sectionLayouts.push(
      pickSectionLayout(section.articles.length, index, sectionLayouts[index - 1] ?? null),
    );
  });

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <JsonLd data={homepageSchema} />
      <h1 className="sr-only">Verax Press | Media Digital Independen Indonesia</h1>

      {/* ===== Paket utama: lead mendominasi + headline sekunder + rail Terbaru ===== */}
      <section
        aria-label="Utama"
        className="grid gap-8 pb-10 pt-1 md:grid-cols-[minmax(0,1.35fr)_16rem] md:gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-12"
      >
        <div>
          <LeadArticleCard article={lead as PublicArticle} />
          {/* Headline sekunder: bagian dari paket utama, dipisah rule sedang */}
          {secondaries.length > 0 ? (
            <div className="mt-8 border-t border-verity-rule-strong">
              {secondaries.map((article) => (
                <article key={article.id} className="border-b border-verity-rule py-4 last:border-b-0">
                  <h3 className="font-serif text-[1.25rem] font-semibold leading-[1.22] text-verity-ink sm:text-[1.3rem]">
                    <Link href={`/artikel/${article.slug}`} className="block hover:text-verity-accent-deep">
                      {article.title}
                    </Link>
                  </h3>
                  <p className="mt-1.5 font-mono text-[11px] text-verity-ink-faint">
                    <span className="text-verity-ink-soft">{article.byline}</span>
                    <span className="mx-1.5">·</span>
                    <time dateTime={article.publishedAt?.toISOString()}>
                      {formatDate(article.publishedAt ?? article.firstPublishedAt)}
                    </time>
                  </p>
                </article>
              ))}
            </div>
          ) : null}
        </div>
        <aside aria-label="Terbaru" className="border-t border-verity-rule-strong pt-6 md:border-t-0 md:border-l md:border-verity-rule md:pl-6 md:pt-8 lg:pl-8 lg:pt-9">
          <div className="border-b-2 border-verity-ink pb-2.5">
            <h2 className="font-sans text-[0.85rem] font-semibold uppercase tracking-[0.2em] text-verity-ink">
              Terbaru
            </h2>
          </div>
          <div className="mt-1">
            {terbaru.map((article) => (
              <CompactArticleCard key={article.id} article={article} ticker />
            ))}
          </div>
        </aside>
      </section>

      {/* ===== Bar Pengenalan Editorial (Publication Voice) ===== */}
      <section
        aria-label="Tentang publikasi"
        className="my-10 border-y border-verity-rule bg-verity-paper-soft py-5 px-4 sm:px-6"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="max-w-2xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-verity-accent">
              Jurnalisme Digital Independen
            </p>
            <p className="mt-1.5 font-serif text-[1rem] leading-relaxed text-verity-ink">
              Verax Press menyajikan pemberitaan dan analisis isu publik berbasis sumber primer.
              Setiap laporan menautkan dokumen rujukan terverifikasi serta mencatat setiap koreksi
              secara terbuka.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0 font-mono text-[11px]">
            <Link
              href="/standar-editorial"
              className="border border-verity-rule bg-verity-paper px-3 py-1.5 text-verity-ink hover:border-verity-ink transition-colors"
            >
              Standar Editorial →
            </Link>
            <Link
              href="/kirim-tulisan"
              className="border border-verity-rule bg-verity-paper px-3 py-1.5 text-verity-ink hover:border-verity-ink transition-colors"
            >
              Kirim Tulisan →
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Seksi desk: napas antar-seksi disengaja dan tidak seragam:
          jeda terbesar setelah paket utama (membuka babak liputan), lalu
          seksi-seksi berikut lebih rapat; tiap seksi berganti tata letak. ===== */}
      {renderedSections.map((section, index) => {
        const layout = sectionLayouts[index];
        const isShowcase = index === 0;
        return (
          <section key={section.desk.id} aria-label={section.desk.name} className={isShowcase ? "mt-8" : "mt-14"}>
            <SectionHeading title={section.desk.name} href={`/desk/${section.desk.slug}`} />
            {/* Showcase: standfirst desk (teks pengantar yang hanya muncul
                di seksi pembuka, memberi rasa kurasi editorial) */}
            {isShowcase && section.desk.description ? (
              <p className="mt-4 max-w-2xl font-serif text-[1.05rem] italic leading-[1.6] text-verity-ink-soft">
                {section.desk.description}
              </p>
            ) : null}
            {layout === "solo" ? (
              // Satu-satunya artikel unggulan seksi: lebar penuh, deck lega
              <div className="mt-7 max-w-3xl">
                <FeaturedArticleCard article={section.articles[0]} />
              </div>
            ) : layout === "featured-list" ? (
              // Unggulan besar + daftar teks: pola showcase
              <div className="mt-7 grid gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-12">
                <FeaturedArticleCard article={section.articles[0]} />
                <div className="md:border-l md:border-verity-rule md:pl-6 lg:pl-8">
                  {section.articles.slice(1).map((article) => (
                    <CompactArticleCard key={article.id} article={article} showTime />
                  ))}
                </div>
              </div>
            ) : layout === "grid" ? (
              // Grid rata: kartu dengan hairline atas masing-masing
              <div className="mt-7 grid gap-x-10 gap-y-8 sm:grid-cols-2">
                {section.articles.map((article) => (
                  <StandardArticleCard key={article.id} article={article} kickerVariant="format" />
                ))}
              </div>
            ) : (
              // Baris editorial: headline kiri, deck kanan
              <div className="mt-3">
                {section.articles.map((article) => (
                  <RowArticleCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {/* ===== Opini: rule ganda klasik (2px ink + 3px + hairline, full-bleed)
          + label serif italic: identitas seksi editorial lewat garis &
          tipografi, bukan latar warna (pola halaman opini NYT/Guardian). ===== */}
      {opini.length > 0 ? (
        <section aria-label="Opini" className="mt-16">
          <div aria-hidden="true" className="-mx-4 border-t-2 border-verity-ink sm:-mx-6" />
          <div aria-hidden="true" className="-mx-4 mt-[3px] border-t border-verity-rule sm:-mx-6" />
          <div className="pb-12 pt-7">
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1.5">
              <h2 className="font-serif text-[1.5rem] font-semibold italic text-verity-ink">Opini</h2>
              <p className="min-w-[16rem] flex-1 font-serif text-[0.92rem] italic leading-relaxed text-verity-ink-soft">
                Pendapat penulis tidak otomatis mewakili pandangan Redaksi Verax Press.
              </p>
              <Link
                href="/opini"
                className="shrink-0 font-mono text-[11px] uppercase tracking-[0.12em] text-verity-ink-soft underline-offset-4 hover:text-verity-accent hover:underline"
              >
                Lihat semua
              </Link>
            </div>
            <div className="mt-8 grid gap-x-12 gap-y-8 md:grid-cols-2">
              {opini.map((article) => (
                <OpinionArticleCard key={article.id} article={article} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ===== Strip koreksi terbaru ===== */}
      <LatestCorrectionStrip />
    </div>
  );
}

async function LatestCorrectionStrip() {
  const correction = await db.correctionRecord.findFirst({
    where: { article: { status: { in: ["PUBLISHED", "CORRECTED"] } } },
    include: { article: { select: { slug: true, title: true } } },
    orderBy: { correctedAt: "desc" },
  });
  if (!correction) return null;
  return (
    <section aria-label="Koreksi terbaru" className="border-t border-verity-rule-strong pb-10 pt-7">
      <p className="font-mono text-[12px] font-medium uppercase tracking-[0.18em] text-verity-accent">
        Koreksi terbaru · {formatDate(correction.correctedAt)}
      </p>
      <p className="mt-2.5 font-serif text-[0.95rem] leading-relaxed text-verity-ink-soft">
        {correction.publicNote}{" "}
        <Link
          href={`/artikel/${correction.article.slug}`}
          className="text-verity-accent underline underline-offset-4 hover:text-verity-accent-deep"
        >
          Lihat artikel
        </Link>
        {" · "}
        <Link
          href="/koreksi"
          className="text-verity-ink-soft underline underline-offset-4 hover:text-verity-ink"
        >
          Log koreksi
        </Link>
      </p>
    </section>
  );
}

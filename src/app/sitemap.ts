// Sitemap dinamis: /sitemap.xml hanya memuat URL publik kanonik yang layak diindeks
// (beranda, indeks opini, halaman kelembagaan & panduan publik, desk aktif, artikel terbit/dikoreksi,
// serta profil penulis non-anonim yang memiliki karya terbit). Tidak mencantumkan rute internal atau noindex.
import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { getCanonicalBaseUrl } from "@/lib/seo/constants";
import { getArticleSeoDates, isAnonymousMode } from "@/lib/seo/structured-data";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getCanonicalBaseUrl();

  const [desks, articles, authors, latestCorrection] = await Promise.all([
    db.desk.findMany({
      where: { isActive: true },
      select: { id: true, slug: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.article.findMany({
      where: { status: { in: ["PUBLISHED", "CORRECTED"] } },
      select: {
        slug: true,
        deskId: true,
        format: true,
        status: true,
        publishedAt: true,
        firstPublishedAt: true,
        updatedAt: true,
        corrections: {
          select: { correctedAt: true },
          orderBy: { correctedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { publishedAt: "desc" },
    }),
    db.person.findMany({
      where: {
        anonymityMode: { notIn: ["ANON", "ANONYMOUS", "anon", "anonymous"] },
        contributions: {
          some: {
            publicCredit: true,
            article: { status: { in: ["PUBLISHED", "CORRECTED"] } },
          },
        },
      },
      select: {
        id: true,
        anonymityMode: true,
        contributions: {
          where: {
            publicCredit: true,
            article: { status: { in: ["PUBLISHED", "CORRECTED"] } },
          },
          select: {
            article: {
              select: {
                status: true,
                publishedAt: true,
                firstPublishedAt: true,
                updatedAt: true,
                corrections: {
                  select: { correctedAt: true },
                  orderBy: { correctedAt: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
      },
    }),
    db.correctionRecord.findFirst({
      where: { article: { status: { in: ["PUBLISHED", "CORRECTED"] } } },
      select: { correctedAt: true },
      orderBy: { correctedAt: "desc" },
    }),
  ]);

  let latestSiteArticleMod: Date | undefined;
  let latestOpinionMod: Date | undefined;
  const deskLatestMod = new Map<string, Date>();

  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => {
    const seoDates = getArticleSeoDates({
      status: article.status,
      firstPublishedAt: article.firstPublishedAt,
      publishedAt: article.publishedAt,
      updatedAt: article.updatedAt,
      corrections: article.corrections,
    });
    const lastMod = seoDates.sitemapLastMod ?? undefined;

    if (lastMod) {
      if (!latestSiteArticleMod || lastMod > latestSiteArticleMod) {
        latestSiteArticleMod = lastMod;
      }
      const prevDeskDate = deskLatestMod.get(article.deskId);
      if (!prevDeskDate || lastMod > prevDeskDate) {
        deskLatestMod.set(article.deskId, lastMod);
      }
      if (article.format === "OPINION" && (!latestOpinionMod || lastMod > latestOpinionMod)) {
        latestOpinionMod = lastMod;
      }
    }

    return {
      url: `${baseUrl}/artikel/${article.slug}`,
      ...(lastMod ? { lastModified: lastMod } : {}),
      changeFrequency: "monthly",
    };
  });

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      ...(latestSiteArticleMod ? { lastModified: latestSiteArticleMod } : {}),
      changeFrequency: "hourly",
    },
    {
      url: `${baseUrl}/opini`,
      ...(latestOpinionMod ? { lastModified: latestOpinionMod } : {}),
      changeFrequency: "daily",
    },
    { url: `${baseUrl}/tentang`, changeFrequency: "monthly" },
    { url: `${baseUrl}/standar-editorial`, changeFrequency: "monthly" },
    { url: `${baseUrl}/kebijakan-ai`, changeFrequency: "monthly" },
    { url: `${baseUrl}/kirim-tulisan`, changeFrequency: "monthly" },
    { url: `${baseUrl}/pedoman-kontributor`, changeFrequency: "monthly" },
    {
      url: `${baseUrl}/koreksi`,
      ...(latestCorrection?.correctedAt ? { lastModified: latestCorrection.correctedAt } : {}),
      changeFrequency: "weekly",
    },
    { url: `${baseUrl}/keluhan`, changeFrequency: "monthly" },
    { url: `${baseUrl}/informasi-kelembagaan`, changeFrequency: "monthly" },
    { url: `${baseUrl}/kebijakan-privasi`, changeFrequency: "monthly" },
    { url: `${baseUrl}/syarat-ketentuan`, changeFrequency: "monthly" },
    { url: `${baseUrl}/kontak`, changeFrequency: "monthly" },
    { url: `${baseUrl}/developers`, changeFrequency: "monthly" },
  ];

  const deskEntries: MetadataRoute.Sitemap = desks.map((desk) => {
    const deskLastMod = deskLatestMod.get(desk.id);
    return {
      url: `${baseUrl}/desk/${desk.slug}`,
      ...(deskLastMod ? { lastModified: deskLastMod } : {}),
      changeFrequency: "daily",
    };
  });

  const authorEntries: MetadataRoute.Sitemap = authors
    .filter((person) => !isAnonymousMode(person.anonymityMode))
    .map((person) => {
      let latestWorkMod: Date | undefined;
      for (const credit of person.contributions) {
        const mod = getArticleSeoDates({
          status: credit.article.status,
          firstPublishedAt: credit.article.firstPublishedAt,
          publishedAt: credit.article.publishedAt,
          updatedAt: credit.article.updatedAt,
          corrections: credit.article.corrections,
        }).sitemapLastMod;
        if (mod && (!latestWorkMod || mod > latestWorkMod)) {
          latestWorkMod = mod;
        }
      }
      return {
        url: `${baseUrl}/penulis/${person.id}`,
        ...(latestWorkMod ? { lastModified: latestWorkMod } : {}),
        changeFrequency: "weekly",
      };
    });

  return [...staticEntries, ...deskEntries, ...articleEntries, ...authorEntries];
}

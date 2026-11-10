// Sitemap dinamis: /sitemap.xml untuk halaman statis, desk aktif, dan artikel terbit.
// Base URL dapat dioverride via NEXT_PUBLIC_SITE_URL di produksi.
import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const [desks, articles] = await Promise.all([
    db.desk.findMany({
      where: { isActive: true },
      select: { slug: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.article.findMany({
      where: { status: { in: ["PUBLISHED", "CORRECTED"] } },
      select: { slug: true, publishedAt: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
    }),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: articles[0]?.publishedAt ?? now,
      changeFrequency: "hourly",
    },
    { url: `${BASE_URL}/opini`, lastModified: now, changeFrequency: "daily" },
    { url: `${BASE_URL}/tentang`, lastModified: now, changeFrequency: "monthly" },
    { url: `${BASE_URL}/standar-editorial`, lastModified: now, changeFrequency: "monthly" },
    { url: `${BASE_URL}/koreksi`, lastModified: now, changeFrequency: "weekly" },
    { url: `${BASE_URL}/keluhan`, lastModified: now, changeFrequency: "monthly" },
  ];

  const deskEntries: MetadataRoute.Sitemap = desks.map((desk) => ({
    url: `${BASE_URL}/desk/${desk.slug}`,
    lastModified: now,
    changeFrequency: "daily",
  }));

  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${BASE_URL}/artikel/${article.slug}`,
    lastModified: article.updatedAt ?? article.publishedAt ?? now,
    changeFrequency: "monthly",
  }));

  return [...staticEntries, ...deskEntries, ...articleEntries];
}

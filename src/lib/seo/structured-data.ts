// Pembangun data terstruktur Schema.org (JSON-LD) dan kalkulasi tanggal SEO artikel.
// Seluruh atribut mencerminkan data faktual yang tampil di halaman; tidak mengarang status hukum atau metrik.

export interface JsonLdAuthorCredit {
  id: string;
  publicName: string;
  role: string;
  anonymityMode: string;
}

export function sanitizeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export function isAnonymousMode(mode: string | null | undefined): boolean {
  const upper = (mode ?? "").trim().toUpperCase();
  return upper === "ANON" || upper === "ANONYMOUS";
}

/**
 * Menghitung tanggal publikasi dan modifikasi artikel secara jujur.
 * `modifiedAt` hanya dikembalikan jika artikel berstatus `CORRECTED` atau memiliki catatan koreksi;
 * artikel `PUBLISHED` yang tidak dikoreksi tidak memakai timestamp `updatedAt` akibat re-seed.
 */
export function getArticleSeoDates(input: {
  status: string;
  firstPublishedAt?: Date | null;
  publishedAt?: Date | null;
  updatedAt?: Date | null;
  corrections?: Array<{ correctedAt: Date }>;
}): {
  publishedAt: Date | null;
  modifiedAt: Date | null;
  sitemapLastMod: Date | null;
} {
  const publishedAt = input.firstPublishedAt ?? input.publishedAt ?? null;
  const correctionDates = (input.corrections ?? [])
    .map((c) => c.correctedAt)
    .filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());

  let modifiedAt: Date | null = null;
  if (correctionDates.length > 0) {
    modifiedAt = correctionDates[0];
  } else if (input.status === "CORRECTED" && input.updatedAt) {
    modifiedAt = input.updatedAt;
  }

  return {
    publishedAt,
    modifiedAt,
    sitemapLastMod: modifiedAt ?? publishedAt,
  };
}

export function isRasterImageUrl(url: string): boolean {
  const clean = url.split(/[?#]/)[0]?.toLowerCase() ?? "";
  return (
    clean.endsWith(".png") ||
    clean.endsWith(".jpg") ||
    clean.endsWith(".jpeg") ||
    clean.endsWith(".webp") ||
    clean.endsWith(".gif") ||
    clean.endsWith(".avif")
  );
}

export function resolveAbsoluteAssetUrl(baseUrl: string, rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) {
    if (trimmed.startsWith("//")) return null;
    return `${baseUrl}${trimmed}`;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

export function buildOrganizationNode(baseUrl: string) {
  return {
    "@type": "NewsMediaOrganization",
    "@id": `${baseUrl}/#organization`,
    name: "Verax Press",
    url: baseUrl,
    description:
      "Media digital independen berbasis sumber primer untuk isu hukum, kebijakan teknologi, dan kepentingan publik Indonesia dengan daftar rujukan terverifikasi serta catatan koreksi terbuka.",
    inLanguage: "id-ID",
    logo: {
      "@type": "ImageObject",
      "@id": `${baseUrl}/#logo`,
      url: `${baseUrl}/brand/verax-press-logo.png`,
      width: 512,
      height: 512,
      caption: "Verax Press",
    },
    publishingPrinciples: `${baseUrl}/standar-editorial`,
    correctionsPolicy: `${baseUrl}/koreksi`,
    ethicsPolicy: `${baseUrl}/standar-editorial`,
    ownershipFundingInfo: `${baseUrl}/informasi-kelembagaan`,
    actionableFeedbackPolicy: `${baseUrl}/keluhan`,
  };
}

export function buildHomepageGraphJsonLd(baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      buildOrganizationNode(baseUrl),
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        url: baseUrl,
        name: "Verax Press",
        description:
          "Berita, analisis, opini, dan penjelas tentang hukum, teknologi, serta kebijakan publik Indonesia dengan verifikasi sumber primer.",
        inLanguage: "id-ID",
        publisher: {
          "@id": `${baseUrl}/#organization`,
        },
      },
    ],
  };
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildCollectionPageJsonLd(input: {
  baseUrl: string;
  url: string;
  name: string;
  description: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${input.url}#collection`,
    url: input.url,
    name: input.name,
    description: input.description,
    inLanguage: "id-ID",
    isPartOf: { "@id": `${input.baseUrl}/#website` },
    publisher: buildOrganizationNode(input.baseUrl),
  };
}

export function buildArticleJsonLd(input: {
  baseUrl: string;
  slug: string;
  title: string;
  deck?: string | null;
  format: string;
  byline: string;
  publishedAt: Date | null;
  modifiedAt: Date | null;
  deskName: string;
  authorCredits: JsonLdAuthorCredit[];
  imageUrls?: string[];
}) {
  const articleUrl = `${input.baseUrl}/artikel/${input.slug}`;
  const eligibleWriters = input.authorCredits.filter((credit) => {
    const roleUpper = credit.role.toUpperCase();
    return (
      !isAnonymousMode(credit.anonymityMode) &&
      (roleUpper === "AUTHOR" || roleUpper === "WRITER" || roleUpper === "REPORTER")
    );
  });

  let authorNode: unknown;
  if (eligibleWriters.length > 0) {
    authorNode = eligibleWriters.map((writer) => ({
      "@type": "Person",
      "@id": `${input.baseUrl}/penulis/${writer.id}#person`,
      name: writer.publicName,
      url: `${input.baseUrl}/penulis/${writer.id}`,
    }));
  } else if (input.byline.trim().toLowerCase() === "anonim") {
    authorNode = {
      "@type": "Person",
      name: "Anonim",
    };
  } else {
    authorNode = {
      "@type": "NewsMediaOrganization",
      "@id": `${input.baseUrl}/#organization`,
      name: "Verax Press",
      url: input.baseUrl,
    };
  }

  const cleanImages = (input.imageUrls ?? [])
    .map((u) => resolveAbsoluteAssetUrl(input.baseUrl, u))
    .filter((u): u is string => u !== null && isRasterImageUrl(u));

  const payload: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": input.format.toUpperCase() === "OPINION" ? "Article" : "NewsArticle",
    "@id": `${articleUrl}#article`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    headline: input.title,
    articleSection: input.deskName,
    inLanguage: "id-ID",
    isAccessibleForFree: true,
    author: authorNode,
    publisher: buildOrganizationNode(input.baseUrl),
  };

  if (input.deck) {
    payload.description = input.deck;
  }
  if (input.publishedAt) {
    payload.datePublished = input.publishedAt.toISOString();
  }
  if (input.modifiedAt) {
    payload.dateModified = input.modifiedAt.toISOString();
  }
  if (cleanImages.length === 1) {
    payload.image = [cleanImages[0]];
  } else if (cleanImages.length > 1) {
    payload.image = cleanImages;
  }

  return payload;
}

export function buildProfilePageJsonLd(input: {
  baseUrl: string;
  personId: string;
  name: string;
  bio?: string | null;
}) {
  const profileUrl = `${input.baseUrl}/penulis/${input.personId}`;
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${profileUrl}#profile`,
    url: profileUrl,
    inLanguage: "id-ID",
    mainEntity: {
      "@type": "Person",
      "@id": `${profileUrl}#person`,
      name: input.name,
      url: profileUrl,
      ...(input.bio ? { description: input.bio } : {}),
    },
  };
}

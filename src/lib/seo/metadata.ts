// Pembangun metadata standar halaman publik (canonical, OpenGraph, Twitter, robots).
import type { Metadata } from "next";

export function buildPublicMetadata(input: {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  follow?: boolean;
}): Metadata {
  const cleanPath = input.path.startsWith("/") ? input.path : `/${input.path}`;
  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical: cleanPath,
    },
    robots: {
      index: input.noindex ? false : true,
      follow: input.follow ?? true,
    },
    openGraph: {
      title: `${input.title} | Verax Press`,
      description: input.description,
      url: cleanPath,
      siteName: "Verax Press",
      locale: "id_ID",
      type: "website",
      images: [
        {
          url: "/brand/verax-press-og.png",
          width: 1200,
          height: 630,
          alt: `${input.title} | Verax Press`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${input.title} | Verax Press`,
      description: input.description,
      images: ["/brand/verax-press-og.png"],
    },
  };
}

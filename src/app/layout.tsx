import type { Metadata } from "next";
import { Newsreader, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { getCanonicalBaseUrl } from "@/lib/seo/constants";

// Tipografi editorial: serif untuk headline/body artikel, sans untuk UI, mono untuk meta.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const googleVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();
const bingVerification = process.env.BING_SITE_VERIFICATION?.trim();

const verificationMetadata: Metadata["verification"] =
  googleVerification || bingVerification
    ? {
        ...(googleVerification ? { google: googleVerification } : {}),
        ...(bingVerification ? { other: { "msvalidate.01": bingVerification } } : {}),
      }
    : undefined;

const canonicalBaseUrl = getCanonicalBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(canonicalBaseUrl),
  title: {
    default: "Verax Press | Media Independen Indonesia",
    template: "%s | Verax Press",
  },
  description:
    "Verax Press adalah media digital independen berbasis sumber primer. Liputan hukum, kebijakan teknologi, dan isu publik Indonesia dengan rujukan dokumen asal serta catatan koreksi terbuka.",
  keywords: ["Verax Press", "media independen", "berita Indonesia", "analisis", "explainer", "opini"],
  authors: [{ name: "Redaksi Verax Press" }],
  openGraph: {
    title: "Verax Press | Media Independen Indonesia",
    description:
      "Pemberitaan dan analisis hukum, kebijakan teknologi, serta isu publik Indonesia dengan daftar sumber terverifikasi dan catatan koreksi terbuka.",
    url: "/",
    siteName: "Verax Press",
    locale: "id_ID",
    type: "website",
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
      "Pemberitaan dan analisis hukum, kebijakan teknologi, serta isu publik Indonesia dengan daftar sumber terverifikasi dan catatan koreksi terbuka.",
    images: ["/brand/verax-press-og.png"],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/icon.png", type: "image/png", sizes: "192x192" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  ...(verificationMetadata ? { verification: verificationMetadata } : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${newsreader.variable} ${inter.variable} ${plexMono.variable} antialiased bg-verity-paper text-verity-ink font-sans`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}

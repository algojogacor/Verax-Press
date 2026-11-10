import type { Metadata } from "next";
import { Newsreader, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

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

export const metadata: Metadata = {
  title: {
    default: "Verax Press — Media Independen Indonesia",
    template: "%s — Verax Press",
  },
  description:
    "Verax Press adalah media digital independen dengan kendali editorial manusia: verifikasi sumber, transparansi proses, dan koreksi yang tercatat. Fokus pada hukum, teknologi & kebijakan, serta isu publik Indonesia.",
  keywords: ["Verax Press", "media independen", "berita Indonesia", "analisis", "explainer", "opini"],
  authors: [{ name: "Redaksi Verax Press" }],
  openGraph: {
    title: "Verax Press — Media Independen Indonesia",
    description:
      "Pemberitaan, analisis, dan perspektif tentang hukum, teknologi, kebijakan, dan isu publik Indonesia — dengan verifikasi sumber dan koreksi yang transparan.",
    siteName: "Verax Press",
    locale: "id_ID",
    type: "website",
  },
  robots: { index: true, follow: true },
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

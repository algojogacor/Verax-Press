/**
 * Test script for Instagram Carousel Multi-Slide Rendering Engine
 * Tests rendering 4 diverse slides (Cover, Content, Quote, Closing)
 * and verifies PNG header, dimensions (1080x1080), and outputs to scratch/ directory.
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import {
  renderCarouselSlides,
  type ArticleForInstagram,
  type SlideData,
} from "@/lib/instagram-renderer";

async function main() {
  console.log("Starting Instagram Carousel Multi-Slide Rendering Test...");

  const scratchDir = join(process.cwd(), "scratch");
  if (!existsSync(scratchDir)) {
    mkdirSync(scratchDir, { recursive: true });
  }

  const sampleArticle: ArticleForInstagram = {
    id: "art-test-12345",
    title: "Menelusuri Aliran Dana Siluman dalam Proyek Pengadaan Satelit Komunikasi Nasional",
    deck: "Investigasi Verax Press mengungkap ketidaksesuaian nilai kontrak senilai ratusan miliar rupiah tanpa persetujuan parlemen dan ketiadaan uji kepatuhan administratif.",
    slug: "aliran-dana-siluman-satelit-nasional",
    desk: { name: "Investigasi", slug: "investigasi" },
    byline: "Disunting oleh Redaksi Verax Press",
    publishedAt: new Date("2026-11-16T08:00:00Z"),
  };

  const sampleSlides: SlideData[] = [
    {
      slideType: "cover",
      kicker: "LAPORAN INVESTIGASI",
      title: sampleArticle.title,
      content: sampleArticle.deck || "",
    },
    {
      slideType: "content",
      kicker: "FAKTA PERTAMA",
      title: "Penetapan Rekanan Tanpa Tender Terbuka",
      content:
        "Dokumen risalah internal kementerian tertanggal 14 Januari 2026 menunjukkan penunjukan konsorsium swasta dilakukan sebelum studi kelayakan teknis diselesaikan oleh tim ahli independen.",
      sourceNotes: "Dokumen Berita Acara Rapat Kemenkominfo No. 12/BA/I/2026",
    },
    {
      slideType: "quote",
      kicker: "KESAKSIAN NARASUMBER",
      content:
        "Ada instruksi lisan dari pimpinan agar klausul verifikasi jaminan bank diabaikan demi mengejar target serapan anggaran akhir kuartal pertama.",
      quoteAuthor: "Auditor Internal BPKP",
      quoteAuthorTitle: "Keterangan Terverifikasi Dokumen Notula Pemeriksaan",
    },
    {
      slideType: "closing",
      kicker: "KESIMPULAN & RUJUKAN",
      title: "Tiga Rekomendasi Kunci Redaksi",
      content: "",
      keyTakeaways: [
        "Audit forensik independen atas seluruh rekening penampung dana proyek.",
        "Publikasi terbuka berkas kontrak pengadaan dan addendum perjanjian.",
        "Peninjauan kembali status hukum konsorsium oleh penegak hukum.",
      ],
      callToAction: "Baca investigasi selengkapnya di veraxpress.vercel.app",
    },
  ];

  console.log(`Rendering ${sampleSlides.length} slides...`);
  const startTime = Date.now();
  const pngBuffers = await renderCarouselSlides(sampleArticle, sampleSlides);
  const elapsedMs = Date.now() - startTime;

  console.log(`Rendered ${pngBuffers.length} slides in ${elapsedMs}ms! (avg ${(elapsedMs / pngBuffers.length).toFixed(0)}ms per slide)`);

  // Verify each PNG buffer
  const fileNames = [
    "slide-1-cover.png",
    "slide-2-content.png",
    "slide-3-quote.png",
    "slide-4-closing.png",
  ];

  for (let i = 0; i < pngBuffers.length; i++) {
    const buf = pngBuffers[i];
    const fileName = fileNames[i];
    const filePath = join(scratchDir, fileName);

    // 1. Verify PNG Magic Bytes (89 50 4E 47 0D 0A 1A 0A)
    const isPng =
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47;
    if (!isPng) {
      throw new Error(`Slide ${i + 1} does not have valid PNG signature bytes!`);
    }

    // 2. Verify dimensions with Sharp
    const metadata = await sharp(buf).metadata();
    if (metadata.width !== 1080 || metadata.height !== 1080) {
      throw new Error(
        `Slide ${i + 1} dimensions expected 1080x1080, got ${metadata.width}x${metadata.height}`
      );
    }

    // 3. Write to disk
    writeFileSync(filePath, buf);
    console.log(
      `✓ Slide ${i + 1} [${sampleSlides[i].slideType}]: ${metadata.width}x${metadata.height}px, ${(buf.length / 1024).toFixed(1)} KB -> scratch/${fileName}`
    );
  }

  // Also test auto-generation of slides when slides array is empty
  console.log("\nTesting auto-generation when empty slides array passed...");
  const autoBuffers = await renderCarouselSlides(sampleArticle, []);
  console.log(`✓ Auto-generated ${autoBuffers.length} slides successfully!`);

  console.log("\nAll Instagram Carousel rendering tests passed with 100% success!");
}

main().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});

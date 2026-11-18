import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import {
  renderCarouselSlides,
  type ArticleForInstagram,
  type SlideData,
} from "@/lib/instagram-renderer";

async function main() {
  console.log("=== Verax Press: Instagram Carousel Final Renderer (Varian A Broadsheet) ===");
  console.log("Konfirmasi & Kunci: Varian A Klasik Broadsheet dengan tipografi bersih.");
  console.log("Struktur: Headline Newsreader Bold + Hairline Double Rule + Body Inter Sans.");
  console.log("Hierarki: Narasi investigasi utuh bertingkat tanpa kotak dekoratif berulang.");
  console.log("Konstrain: Nol mutasi basis data, nol pemanggilan Meta Graph API.\n");

  const downloadsDir = "C:\\Users\\Arya Rizky\\Downloads";
  if (!existsSync(downloadsDir)) {
    mkdirSync(downloadsDir, { recursive: true });
  }

  // Skenario investigasi konkret
  const dummyArticle: ArticleForInstagram = {
    id: "preview-final-selat-makassar",
    title: "Aliran Siluman Rp 412 Miliar Proyek Dermaga Selat Makassar",
    deck: "Investigasi mengungkap penunjukan rekanan tunggal Konsorsium Tripatra mendahului lelang resmi dan mengabaikan audit kelayakan BPKP.",
    slug: "aliran-siluman-dermaga-selat-makassar",
    desk: { name: "Investigasi", slug: "investigasi" },
    byline: "Disunting oleh Redaksi Verax Press",
    publishedAt: new Date("2026-11-16T08:00:00.000Z"),
  };

  // Rangkaian Karosel 6 Slide Final
  const dummySlides: SlideData[] = [
    // Slide 1: Cover
    {
      slideType: "cover",
      kicker: "LAPORAN KHUSUS",
      title: "Aliran Siluman Rp 412 Miliar di Selat Makassar",
      content:
        "Konsorsium rekanan ditunjuk sepihak dua pekan sebelum tender diumumkan. Uang muka ratusan miliar mengalir tanpa garansi bank yang sah.",
    },
    // Slide 2: Content 1 (Konteks & Alokasi Anggaran Cepat)
    {
      slideType: "content",
      kicker: "KONTEKS ANGGARAN",
      title: "Anggaran Rp 412,8 Miliar Dicairkan Kilat Lewat Pos Cadangan Bencana",
      content:
        "Kementerian Koordinator Infrastruktur meloloskan pencairan dana dermaga logistik hanya dalam lima hari kerja pada 14 Januari 2026. Alokasi ini diselipkan ke pos cadangan darurat tanpa persetujuan Badan Anggaran DPR, mendahului jadwal resmi pembahasan nota keuangan daerah.",
      sourceNotes: "Sumber: Salinan Lembar Disposisi Kemenko No. 018/DISP/I/2026",
    },
    // Slide 3: Content 2 (Temuan Inti / Penunjukan Sepihak Rekanan)
    {
      slideType: "content",
      kicker: "TEMUAN INVESTIGASI",
      title: "Konsorsium Tripatra Ditunjuk Sepihak 14 Hari Sebelum Tender Terbuka",
      content:
        "Panitia lelang menandatangani Surat Perintah Kerja No. 044 pada 28 Januari 2026 kepada Konsorsium Tripatra Nusacipta. Padahal, pengumuman lelang elektronik LPSE baru diunggah ke publik pada 11 Februari 2026 dengan spesifikasi teknis yang telah dikunci bagi rekanan tunggal.",
      sourceNotes: "Sumber: Berkas Audit Pengadaan Barang dan Jasa BPKP Wilayah IV",
    },
    // Slide 4: Content 3 (Implikasi Hukum / Aliran Dana Tanpa Garansi Bank)
    {
      slideType: "content",
      kicker: "IMPLIKASI HUKUM",
      title: "Uang Muka Rp 123,8 Miliar Mengalir Tanpa Jaminan Bank Asli",
      content:
        "Pemeriksaan forensik BPKP menemukan surat garansi bank dari Bank Mandiri Cabang Sudirman yang diserahkan rekanan berstatus tidak terdaftar pada sistem perbankan nasional. Kendati tanpa verifikasi jaminan, kas negara tetap mentransfer termin awal Rp 123,8 miliar ke rekening penampung swasta.",
      sourceNotes: "Sumber: Laporan Hasil Pemeriksaan Forensik BPKP No. PE.04/112/2026",
    },
    // Slide 5: Quote (Kesaksian Kunci Bergaris Ganda Broadsheet)
    {
      slideType: "quote",
      kicker: "KESAKSIAN KUNCI",
      content:
        "Kami diperintahkan menandatangani berita acara serah terima dokumen garansi tanpa memeriksa kode verifikasi ke bank penerbit.",
      quoteAuthor: "Pejabat Pembuat Komitmen",
      quoteAuthorTitle: "Keterangan resmi dalam Berita Acara Pemeriksaan Inspektorat Jenderal",
      sourceNotes: "Dokumen wawancara dan transkrip pemeriksaan internal",
    },
    // Slide 6: Closing (Ajakan Baca & Pertanyaan Kritis Diskusi)
    {
      slideType: "closing",
      kicker: "BACA INVESTIGASI LENGKAP",
      callToAction:
        "Mengapa pencairan anggaran ratusan miliar dapat lolos tanpa verifikasi garansi perbankan yang sah?",
      content:
        "Buka rekonsiliasi transfer kas, transkrip pemeriksaan, dan rantai dokumen bukti autentik selengkapnya di situs web kami.",
    },
  ];

  console.log(`1. Rendering rangkaian karosel penuh (${dummySlides.length} slide) dengan template Final Varian A...`);
  const t0 = Date.now();
  const buffers = await renderCarouselSlides(dummyArticle, dummySlides);
  const elapsed = Date.now() - t0;
  console.log(`Render rangkaian selesai dalam ${elapsed}ms (${(elapsed / buffers.length).toFixed(0)}ms/slide).\n`);

  const fileNames = [
    "verax-ig-preview-1-cover-FINAL.png",
    "verax-ig-preview-2-content1-FINAL.png",
    "verax-ig-preview-3-content2-FINAL.png",
    "verax-ig-preview-4-content3-FINAL.png",
    "verax-ig-preview-5-quote-FINAL.png",
    "verax-ig-preview-6-closing-FINAL.png",
  ];

  for (let i = 0; i < buffers.length; i++) {
    const buf = buffers[i];
    const fileName = fileNames[i];
    const fullPath = join(downloadsDir, fileName);

    const isPng =
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47;
    if (!isPng) {
      throw new Error(`Buffer ${i + 1} does not have valid PNG magic bytes!`);
    }

    const meta = await sharp(buf).metadata();
    if (meta.width !== 1080 || meta.height !== 1080) {
      throw new Error(`Slide ${i + 1} has unexpected dimensions: ${meta.width}x${meta.height}`);
    }

    writeFileSync(fullPath, buf);
    const sizeKb = (buf.length / 1024).toFixed(1) + " KB";
    console.log(`[SUCCESS] Saved slide ${i + 1} (${dummySlides[i].slideType}):`);
    console.log(`   File: ${fullPath}`);
    console.log(`   Dimensi: ${meta.width}x${meta.height} px | Ukuran berkas: ${sizeKb}\n`);
  }

  console.log("=== Sampel Caption Instagram Pengundang Diskusi Kritis ===");
  console.log(`
Pencairan kilat Rp 412,8 miliar untuk proyek dermaga logistik di Selat Makassar menyisakan kejanggalan serius.

Penyelidikan Verax Press bersama dokumen audit BPKP mengungkap bahwa alokasi anggaran diselipkan melalui pos cadangan bencana tanpa persetujuan parlemen. Lebih jauh, Konsorsium Tripatra Nusacipta telah menerima Surat Perintah Kerja dua pekan sebelum lelang elektronik LPSE resmi diumumkan ke publik.

Termin awal senilai Rp 123,8 miliar bahkan telah ditransfer ke rekening penampung swasta, kendati jaminan bank yang diserahkan terbukti tidak terdaftar pada sistem perbankan nasional.

Pertanyaan kritisnya: jika prosedur verifikasi jaminan perbankan dapat dilewati begitu mudah oleh pejabat pembuat komitmen, siapa pihak yang menjamin keselamatan keuangan negara dalam proyek ini?

Buka rekonsiliasi transfer kas, transkrip pemeriksaan internal, dan rantai dokumen bukti autentik selengkapnya di situs web kami:
veraxpress.vercel.app (tautan di bio).

#VeraxPress #JurnalismeInvestigasi #TransparansiAnggaran #InvestigasiPublik #AuditForensik
  `.trim());
  console.log("\nSeluruh berkas preview karosel final berhasil disimpan ke: " + downloadsDir);
}

main().catch((err) => {
  console.error("Rendering failed:", err);
  process.exit(1);
});

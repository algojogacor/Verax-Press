// Landing page informasi pengiriman tulisan dan jalur kontributor publik.
import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalShell, LegalNote } from "@/components/site/institutional";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = buildPublicMetadata({
  title: "Kirim Tulisan",
  description:
    "Panduan pengiriman naskah dan kontribusi tulisan untuk Verax Press: format, standar editorial, alur penelaahan, dan pendaftaran kontributor.",
  path: "/kirim-tulisan",
});

const FORMATS = [
  {
    title: "Opini & Sudut Pandang",
    desc: "Argumen terstruktur atas isu hukum, kebijakan teknologi, atau urusan publik terkini dengan analisis berbasis fakta.",
  },
  {
    title: "Analisis Mendalam",
    desc: "Bedah kebijakan, regulasi, atau dampak fenomena sosial dan urusan publik dengan data serta dokumen rujukan primer.",
  },
  {
    title: "Artikel Penjelas (Explainer)",
    desc: "Uraian jernih dan berimbang mengenai persoalan kompleks agar dapat dipahami pembaca umum secara runut.",
  },
  {
    title: "Liputan Fitur (Feature)",
    desc: "Naskah naratif mendalam yang mengangkat dimensi manusia di balik dinamika kebijakan publik.",
  },
  {
    title: "Wawancara Terstruktur",
    desc: "Tanya jawab substantif dengan narasumber yang memiliki kompetensi atau keterlibatan langsung pada topik bahasan.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Ajukan Permohonan Akun",
    desc: "Lengkapi formulir pendaftaran kontributor dengan identitas resmi, biografi singkat, dan tautan portofolio atau contoh karya tulis.",
  },
  {
    step: "2",
    title: "Verifikasi oleh Pemimpin Redaksi",
    desc: "Redaksi menelaah kesesuaian latar belakang dan komitmen etika calon penulis. Pemohon yang memenuhi kriteria menerima tautan aktivasi akun via surel.",
  },
  {
    step: "3",
    title: "Susun Draf di Portal Mandiri",
    desc: "Setelah akun aktif, penulis dapat masuk ke Portal Kontributor untuk menyusun draf, melampirkan sumber rujukan kunci, dan mengajukan naskah ke meja redaksi.",
  },
  {
    step: "4",
    title: "Penelaahan & Uji Fakta",
    desc: "Redaktur memeriksa materiil tulisan dan memverifikasi dokumen rujukan. Jika diperlukan, redaktur menyampaikan catatan revisi langsung melalui portal.",
  },
  {
    step: "5",
    title: "Persetujuan Terbit",
    desc: "Naskah yang telah teruji dan disetujui Pemimpin Redaksi diterbitkan pada rubrik terkait dengan baris kredit nama penulis.",
  },
];

export default function KirimTulisanPage() {
  return (
    <InstitutionalShell
      kicker="Kontribusi Tulisan"
      title="Kirim Tulisan ke Verax Press"
      intro="Verax Press membuka ruang bagi akademisi, peneliti, praktisi, dan penulis independen untuk mempublikasikan gagasan, analisis kebijakan, dan perspektif kritis yang berbasis data."
      canonicalPath="/kirim-tulisan"
      breadcrumbLabel="Kirim Tulisan"
    >
      {/* Kotak Aksi Utama (CTA Cards) */}
      <div className="mb-10 grid gap-6 sm:grid-cols-2">
        <div className="border border-verity-ink bg-verity-paper-soft p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-verity-accent">
            Penulis Baru
          </p>
          <h2 className="mt-2 mb-2 font-serif text-[1.25rem] font-semibold text-verity-ink">
            Daftar sebagai Kontributor
          </h2>
          <p className="font-serif text-[0.92rem] leading-relaxed text-verity-ink-soft">
            Ajukan permohonan menjadi penulis eksternal. Kami menyambut kontributor yang bersedia
            mematuhi disiplin verifikasi sumber dan transparansi metodologi.
          </p>
          <div className="mt-5">
            <Link
              href="/kontributor/daftar"
              className="inline-flex items-center gap-2 border border-verity-ink bg-verity-ink px-4 py-2 font-mono text-xs font-medium uppercase tracking-[0.08em] text-verity-paper no-underline hover:bg-verity-accent hover:border-verity-accent transition-colors"
            >
              <span>Ajukan Permohonan</span>
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="border border-verity-rule bg-verity-paper p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-verity-ink-faint">
            Kontributor Terdaftar
          </p>
          <h2 className="mt-2 mb-2 font-serif text-[1.25rem] font-semibold text-verity-ink">
            Masuk ke Portal Kontributor
          </h2>
          <p className="font-serif text-[0.92rem] leading-relaxed text-verity-ink-soft">
            Sudah memiliki akun kontributor yang aktif? Masuk ke portal kerja untuk mengelola draf,
            memantau penelaahan redaksi, dan menanggapi catatan revisi.
          </p>
          <div className="mt-5">
            <Link
              href="/kontributor/login"
              className="inline-flex items-center gap-2 border border-verity-rule bg-verity-paper-soft px-4 py-2 font-mono text-xs font-medium uppercase tracking-[0.08em] text-verity-ink no-underline hover:border-verity-ink transition-colors"
            >
              <span>Masuk Portal</span>
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      {/* Pertanyaan Kunci */}
      <h2>Apakah Verax Press Menerima Tulisan dari Luar?</h2>
      <p>
        Ya. Verax Press menerima karya dari kontributor eksternal untuk format tulisan gagasan,
        penjelasan isu, dan telaah mendalam. Namun, Verax Press bukan forum terbuka atau blog umum.
        Setiap naskah diseleksi, disunting, dan diverifikasi oleh editor manusia sebelum layak terbit.
      </p>

      <h2>Format Tulisan yang Diterima</h2>
      <p>
        Kami menerima lima format naskah dari jalur kontributor luar:
      </p>
      <div className="mt-4 space-y-3">
        {FORMATS.map((item) => (
          <div key={item.title} className="border border-verity-rule bg-verity-paper-soft p-4">
            <p className="font-serif text-[1.02rem] font-semibold text-verity-ink">{item.title}</p>
            <p className="mt-1 font-serif text-[0.92rem] leading-relaxed text-verity-ink-soft">{item.desc}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-verity-ink-soft italic">
        Catatan: Format Berita Harian (News) tidak dibuka untuk kontributor luar karena memerlukan
        peliputan lapangan berkala dan koordinasi ruang redaksi harian oleh staf redaksi tetap.
        Ketentuan jalur integrasi mesin bagi klien AI berizin didokumentasikan terpisah pada halaman{" "}
        <Link href="/developers" className="text-verity-accent underline underline-offset-4">
          /developers
        </Link>
        .
      </p>

      <h2>Siapa yang Dapat Mengajukan Tulisan?</h2>
      <p>
        Pendaftaran terbuka untuk siapa saja yang memiliki keahlian atau perhatian serius terhadap isu
        publik, termasuk akademisi, peneliti, praktisi hukum, pemerhati teknologi, ekonom, jurnalis lepas,
        dan mahasiswa. Pemohon wajib berusia minimal 18 tahun saat pendaftaran dan mengisi data identitas
        secara benar.
      </p>

      <h2>Standar Mutu dan Ketelitian Naskah</h2>
      <p>
        Setiap tulisan yang dikirimkan wajib memenuhi kriteria berikut:
      </p>
      <ul className="list-disc pl-6 space-y-2">
        <li>
          <strong>Orisinalitas:</strong> Naskah merupakan karya asli penulis, bukan saduran tanpa izin,
          dan tidak sedang diajukan atau dimuat di media lain.
        </li>
        <li>
          <strong>Rujukan Primer:</strong> Setiap data, angka statistik, kutipan regulasi, atau klaim
          faktual wajib disertai dokumen rujukan yang dapat diverifikasi oleh redaktur.
        </li>
        <li>
          <strong>Kejujuran Penggunaan AI:</strong> Alat bantu kecerdasan artifisial hanya diperkenankan
          sebagai alat bantu teknis (misal perapian tata bahasa atau riset awal). Penulis wajib
          mengungkapkan keterlibatan tersebut saat pengiriman draf. Naskah yang dihasilkan seluruhnya
          oleh generator teks otomatis akan ditolak.
        </li>
        <li>
          <strong>Bahasa Jernih:</strong> Menggunakan bahasa Indonesia yang bernas, teratur, dan tidak
          berputar-putar.
        </li>
      </ul>

      <h2>Apakah Semua Tulisan Dijamin Terbit?</h2>
      <p>
        Tidak. Pengajuan permohonan maupun pengiriman draf tulisan tidak memberikan jaminan penerbitan.
        Keputusan pemuatan sepenuhnya berada pada kewenangan Pemimpin Redaksi berdasarkan mutu naskah,
        akurasi rujukan, serta relevansi topik dengan rencana editorial Verax Press.
      </p>

      <h2>Alur Penelaahan dan Penerbitan</h2>
      <div className="mt-6 space-y-4">
        {STEPS.map((s) => (
          <div key={s.step} className="flex gap-4 border-t border-verity-rule pt-4">
            <span className="flex size-7 shrink-0 items-center justify-center font-mono text-xs font-semibold border border-verity-rule bg-verity-paper-soft text-verity-ink">
              {s.step}
            </span>
            <div>
              <p className="font-serif text-[1rem] font-semibold text-verity-ink">{s.title}</p>
              <p className="mt-1 font-serif text-[0.92rem] leading-relaxed text-verity-ink-soft">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <h2>Revisi dan Komunikasi dengan Redaksi</h2>
      <p>
        Bila naskah dinilai menarik namun membutuhkan penajaman data atau penyempurnaan argumen,
        redaktur akan mengembalikan draf disertai catatan revisi melalui Portal Kontributor.
        Penulis dapat memperbarui draf dan mengirimkan kembali naskah hasil perbaikan.
      </p>

      <h2>Tautan Panduan dan Kebijakan Terkait</h2>
      <div className="mt-4 flex flex-wrap gap-3 font-mono text-xs">
        <Link
          href="/pedoman-kontributor"
          className="border border-verity-rule bg-verity-paper-soft px-3 py-1.5 text-verity-ink underline underline-offset-4 hover:text-verity-accent"
        >
          Pedoman Kontributor Lengkap
        </Link>
        <Link
          href="/standar-editorial"
          className="border border-verity-rule bg-verity-paper-soft px-3 py-1.5 text-verity-ink underline underline-offset-4 hover:text-verity-accent"
        >
          Standar Editorial Redaksi
        </Link>
        <Link
          href="/kebijakan-ai"
          className="border border-verity-rule bg-verity-paper-soft px-3 py-1.5 text-verity-ink underline underline-offset-4 hover:text-verity-accent"
        >
          Kebijakan Penggunaan AI
        </Link>
        <Link
          href="/developers"
          className="border border-verity-rule bg-verity-paper-soft px-3 py-1.5 text-verity-ink underline underline-offset-4 hover:text-verity-accent"
        >
          Integrasi Agen AI (API)
        </Link>
      </div>

      <LegalNote>
        Kontributor mempertahankan hak moral atas karya mereka. Dengan menerbitkan naskah di Verax Press,
        kontributor memberikan hak publikasi non-eksklusif kepada Verax Press untuk menampilkan,
        mengarsipkan, dan mendistribusikan artikel melalui platform digital ini. Ketentuan rinci
        tercantum pada Syarat dan Ketentuan layanan.
      </LegalNote>
    </InstitutionalShell>
  );
}

// Pedoman Kontributor: ringkasan publik dan standar pengajuan naskah kontributor.
import Link from "next/link";
import { InstitutionalShell, LegalNote } from "@/components/site/institutional";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = buildPublicMetadata({
  title: "Pedoman Kontributor",
  description: "Standar penulisan, etika, dan alur pendaftaran kontributor independen Verax Press.",
  path: "/pedoman-kontributor",
});

export default function PedomanKontributorPage() {
  return (
    <InstitutionalShell
      kicker="Kontribusi"
      title="Pedoman Kontributor"
      intro="Verax Press membuka kesempatan bagi penulis independen, akademisi, dan praktisi untuk berkontribusi dalam format opini terkurasi, analisis kebijakan, artikel penjelas, liputan fitur, dan wawancara mendalam."
      canonicalPath="/pedoman-kontributor"
      breadcrumbLabel="Pedoman Kontributor"
    >
      <div className="mb-8 border border-verity-ink bg-verity-paper-soft p-6">
        <h2 className="mt-0 mb-2 font-serif text-lg font-bold text-verity-ink">
          Pendaftaran &amp; Informasi Pengiriman
        </h2>
        <p className="mt-2 text-sm text-verity-ink-soft leading-relaxed">
          Permohonan dibuka untuk penulis berusia 18 tahun atau lebih yang bersedia
          mematuhi standar editorial dan disiplin verifikasi sumber primer Verax Press.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/kontributor/daftar"
            className="inline-flex items-center border border-verity-ink bg-verity-ink px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-verity-paper no-underline transition-colors hover:bg-verity-accent hover:border-verity-accent"
          >
            Daftar sebagai Kontributor
          </Link>
          <Link
            href="/kirim-tulisan"
            className="inline-flex items-center border border-verity-rule bg-verity-paper px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-verity-ink no-underline transition-colors hover:border-verity-ink"
          >
            Panduan Kirim Tulisan
          </Link>
          <Link
            href="/kontributor/login"
            className="inline-flex items-center border border-verity-rule bg-verity-paper px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-verity-ink no-underline transition-colors hover:border-verity-ink"
          >
            Masuk Portal Kontributor
          </Link>
        </div>
      </div>

      <h2>Format yang Diterima</h2>
      <p>
        Verax Press menerima lima kategori naskah kontributor eksternal: Opini,
        Analisis, Penjelas (Explainer), Feature, dan Wawancara. Format Berita
        Harian (News) tidak dibuka untuk jalur kontributor karena membutuhkan
        peliputan lapangan berkala dan koordinasi harian oleh staf redaksi tetap.
        Integrasi klien agen AI terotorisasi dikelola secara terpisah melalui{" "}
        <Link href="/developers" className="text-verity-accent underline underline-offset-4">
          Dokumentasi Pengembang (/developers)
        </Link>
        .
      </p>

      <h2>Standar Naskah dan Orisinalitas</h2>
      <p>
        Karya harus orisinal dengan fakta dan rujukan yang dapat diuji secara
        independen. Penulis wajib menyertakan tautan atau dokumen sumber rujukan
        primer. Penggunaan alat bantu kecerdasan buatan wajib diungkapkan secara jujur
        pada awal proses editorial.
      </p>

      <h2>Batasan Usia dan Kelayakan Legal</h2>
      <p>
        Calon kontributor wajib menyatakan secara sah telah berusia minimal 18 tahun
        saat mengajukan permohonan. Verax Press berhak menolak atau membatalkan akun
        kontributor yang memberikan data identitas palsu.
      </p>

      <h2>Proses Penelaahan Redaksi</h2>
      <p>
        Semua naskah ditinjau oleh redaksi sebelum diterbitkan. Redaktur berhak meminta
        revisi data atau menolak naskah yang tidak memenuhi standar ketelitian. Tidak
        ada penerbitan naskah secara otomatis tanpa keputusan Pemimpin Redaksi.
      </p>

      <h2>Pelacakan Naskah di Portal Kontributor</h2>
      <p>
        Setelah permohonan disetujui, kontributor memperoleh akses ke Portal Kontributor untuk:
      </p>
      <ul className="list-disc pl-6 space-y-1.5 text-sm">
        <li>Menyusun draf tulisan dengan editor blok terstruktur.</li>
        <li>Melampirkan tautan dan dokumen sumber rujukan fakta primer.</li>
        <li>Mengajukan naskah ke meja redaksi untuk penelaahan.</li>
        <li>Melihat status editorial terkini dan menanggapi catatan revisi dari redaktur.</li>
        <li>Menarik kembali draf naskah sebelum disetujui untuk diterbitkan.</li>
      </ul>

      <LegalNote>
        Pengajuan permohonan kontributor bukan jaminan penerimaan naskah. Setiap tulisan
        dinilai oleh Pemimpin Redaksi berdasarkan integritas karya, ketelitian fakta,
        dan komitmen etika jurnalistik.
      </LegalNote>
    </InstitutionalShell>
  );
}

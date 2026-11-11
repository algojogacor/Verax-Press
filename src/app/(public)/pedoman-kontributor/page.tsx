// Pedoman Kontributor: ringkasan publik dan pendaftaran jalur kontributor.
import Link from "next/link";
import { InstitutionalShell, LegalNote } from "@/components/public/institutional";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pedoman Kontributor",
  description: "Standar, etika, dan alur pendaftaran kontributor independen Verax Press.",
};

export default function PedomanKontributorPage() {
  return (
    <InstitutionalShell
      kicker="Kontribusi"
      title="Pedoman Kontributor"
      intro="Verax Press membuka kesempatan bagi penulis independen, akademisi, dan praktisi untuk berkontribusi dalam format opini terkurasi, analisis, dan liputan mendalam."
    >
      <div className="mb-8 rounded-lg border border-verity-accent/30 bg-verity-paper-warm p-6">
        <h2 className="!mt-0 text-lg font-serif font-bold text-verity-ink">
          Pendaftaran Kontributor
        </h2>
        <p className="mt-2 text-sm text-verity-ink-soft">
          Permohonan dibuka untuk penulis berusia 18 tahun atau lebih yang bersedia
          mematuhi standar editorial dan transparansi metodologi Verax Press.
        </p>
        <div className="mt-4">
          <Link
            href="/kontributor/daftar"
            className="inline-flex items-center rounded bg-verity-ink px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-verity-accent"
          >
            Daftar sebagai Kontributor
          </Link>
        </div>
      </div>

      <h2>Format yang Diterima</h2>
      <p>
        Verax Press menerima lima kategori naskah kontributor eksternal: Opini,
        Analisis, Penjelas (Explainer), Feature, dan Wawancara. Format Berita
        Harian (News) tidak dibuka untuk jalur kontributor karena membutuhkan
        peliputan lapangan dan verifikasi harian oleh redaksi tetap.
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

      <LegalNote>
        Pengajuan permohonan kontributor bukan jaminan penerimaan. Setiap permohonan
        dinilai oleh Pemimpin Redaksi berdasarkan integritas karya tulis dan komitmen
        etika jurnalistik.
      </LegalNote>
    </InstitutionalShell>
  );
}

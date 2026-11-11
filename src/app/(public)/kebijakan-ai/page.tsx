// Kebijakan AI: transparansi kecerdasan artifisial untuk pembaca.
import { InstitutionalShell, LegalNote } from '@/components/site/institutional'
import { buildPublicMetadata } from '@/lib/seo/metadata'
import type { Metadata } from 'next'

export const metadata: Metadata = buildPublicMetadata({
  title: 'Kebijakan AI',
  description: 'Transparansi penggunaan kecerdasan artifisial di Verax Press.',
  path: '/kebijakan-ai',
})

export default function KebijakanAiPage() {
  return (
    <InstitutionalShell
      kicker="Transparansi"
      title="Kebijakan Kecerdasan Artifisial"
      intro="AI adalah alat bantu teknis, bukan sumber fakta dan bukan penerbit. Tanggung jawab editorial selalu berada pada manusia."
      canonicalPath="/kebijakan-ai"
      breadcrumbLabel="Kebijakan AI"
    >
      <h2>Prinsip dasar</h2>
      <p>
        Tidak ada artikel yang diterbitkan otomatis oleh AI, API, atau penjadwal. Setiap
        publikasi disetujui oleh editor manusia yang memeriksa sumber primer, angka, tanggal,
        nama, kutipan, dan klaim penting.
      </p>
      <h2>Tingkat keterlibatan AI</h2>
      <p>
        Kami menggolongkan penggunaan AI pada tiga tingkat dan mengungkapkannya secara
        proporsional:
      </p>
      <p>
        <strong>Tanpa bantuan AI</strong>: hanya menggunakan fungsi penunjang mekanis seperti pemeriksaan
        ejaan.
        <br />
        <strong>Asistif</strong>: AI membantu riset awal, ringkasan dokumen sumber, alternatif judul,
        atau susunan kerangka; manusia menulis dan memeriksa teks akhir.
        <br />
        <strong>Substantif</strong>: AI menyusun bagian substansial dari draf awal. Artikel
        seperti ini wajib memuat catatan proses publik.
      </p>
      <h2>Yang tidak kami perbolehkan</h2>
      <p>
        AI tidak boleh membuat narasumber, kutipan, dokumen, atau peristiwa yang tidak ada.
        Konten yang memerlukan peliputan lapangan tidak cukup disusun dari kompilasi sumber
        daring. Ringkasan sumber harus memberi nilai tambah yang orisinal, bukan sekadar parafrasa
        artikel media lain.
      </p>
      <h2>Kredit dan baris nama</h2>
      <p>
        Byline “Redaksi Verax Press” hanya untuk karya yang diverifikasi dan disunting secara
        bermakna oleh editor manusia. Kredit penyuntingan dicantumkan hanya pada orang yang
        benar-benar menyunting.
      </p>
      <LegalNote>
        Kebijakan ini merupakan ringkasan publik dari pedoman internal. Versi internal yang
        lebih rinci memandu operasional redaksi dan ditinjau berkala.
      </LegalNote>
    </InstitutionalShell>
  )
}

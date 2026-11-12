// Kebijakan AI: transparansi kecerdasan artifisial untuk pembaca.
import Link from 'next/link'
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
        <strong>Tanpa bantuan AI</strong>: tidak ada keterlibatan AI dalam penyusunan naskah;
        catatan proses tidak diperlukan.
        <br />
        <strong>Asistif</strong>: AI membantu riset awal, ringkasan dokumen sumber, alternatif judul,
        atau susunan kerangka, sementara manusia menulis dan memeriksa teks akhir; pengisian
        catatan proses bersifat opsional atau dianjurkan untuk mencatat lingkup bantuan.
        <br />
        <strong>Substantif</strong>: AI menyusun bagian substansial dari draf awal. Artikel
        seperti ini wajib mengaktifkan catatan proses publik sebelum dapat diterbitkan.
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
      <h2>Pemisahan jalur kontributor dan API Agen AI</h2>
      <p>
        Jalur kontributor eksternal manusia pada{' '}
        <Link href="/kirim-tulisan" className="text-verity-accent underline underline-offset-4">
          /kirim-tulisan
        </Link>{' '}
        hanya mengizinkan AI sebagai alat bantu teknis dan menolak naskah yang dihasilkan penuh
        oleh generator otomatis. Sementara itu, antarmuka integrasi agen AI melalui{' '}
        <Link href="/developers" className="text-verity-accent underline underline-offset-4">
          /developers
        </Link>{' '}
        saat ini mengikuti standar editorial modular berstatus usulan kerja (<code>PROPOSED</code>, belum mengikat final):
        draf diterima pada format aktif (<code>OPINION</code>, <code>ANALYSIS</code>, <code>EXPLAINER</code>, serta <code>FEATURE</code>/<code>INTERVIEW</code> secara bersyarat,
        sedangkan format <code>NEWS</code> ditahan sementara menunggu pengesahan redaksi), dalam status awal{' '}
        <code>DRAFT</code>, seluruh sumber <code>UNVERIFIED</code>, dan penanda byline sementara hingga
        diuji serta disahkan editor manusia. Manifes standar dapat diakses melalui{' '}
        <Link href="/editorial/manifest.json" className="text-verity-accent underline underline-offset-4">
          /editorial/manifest.json
        </Link>
        .
      </p>
      <LegalNote>
        Kebijakan ini merupakan ringkasan publik dari pedoman internal. Versi internal yang
        lebih rinci memandu operasional redaksi dan ditinjau berkala.
      </LegalNote>
    </InstitutionalShell>
  )
}

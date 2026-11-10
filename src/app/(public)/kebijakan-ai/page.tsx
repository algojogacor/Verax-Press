// Kebijakan AI — reader-facing AI transparency policy.
import { InstitutionalShell, LegalNote } from '@/components/public/institutional'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kebijakan AI',
  description: 'Bagaimana Verax Press menggunakan dan mengungkapkan penggunaan kecerdasan artifisial.',
}

export default function KebijakanAiPage() {
  return (
    <InstitutionalShell
      kicker="Transparansi"
      title="Kebijakan Kecerdasan Artifisial"
      intro="AI adalah alat bantu, bukan sumber fakta dan bukan penerbit. Akuntabilitas editorial selalu ada pada manusia."
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
        <strong>Tidak menggunakan AI</strong> — atau hanya fungsi mekanis seperti pemeriksaan
        ejaan.
        <br />
        <strong>Asistif</strong> — AI membantu riset awal, ringkasan sumber, alternatif judul,
        atau struktur; manusia menulis dan memeriksa teks akhir.
        <br />
        <strong>Substantif</strong> — AI menyusun bagian substansial dari draf awal. Artikel
        seperti ini wajib memuat catatan proses publik.
      </p>
      <h2>Yang tidak kami perbolehkan</h2>
      <p>
        AI tidak boleh membuat narasumber, kutipan, dokumen, atau peristiwa yang tidak ada.
        Konten yang memerlukan peliputan lapangan tidak cukup disusun dari kompilasi sumber
        daring. Ringkasan sumber harus memberi nilai tambah orisinal — bukan parafrasa
        artikel media lain.
      </p>
      <h2>Byline dan kredit</h2>
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

// Pedoman Kontributor: ringkasan publik. Pendaftaran Tahap B belum dibuka.
import { InstitutionalShell, LegalNote } from '@/components/public/institutional'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pedoman Kontributor',
  description: 'Rencana penerbitan kontributor Verax Press dan standar yang akan diterapkan.',
}

export default function PedomanKontributorPage() {
  return (
    <InstitutionalShell
      kicker="Kontribusi"
      title="Pedoman Kontributor"
      intro="Verax Press merencanakan penerbitan kontributor terkurasi (Tahap B). Pendaftaran publik belum dibuka."
    >
      <h2>Status: belum dibuka</h2>
      <p>
        Jalur kontributor akan dibuka secara terbatas melalui undangan kepada sejumlah kecil
        penulis uji coba, hanya setelah persyaratan tata kelola terpenuhi: pengelola sah,
        perjanjian kontributor hasil peninjauan penasihat hukum, pemberitahuan privasi,
        ketersediaan redaktur kedua, dan kajian kepatuhan yang tuntas.
      </p>
      <h2>Format yang akan diterima</h2>
      <p>
        Opini, analisis, penjelas (explainer), feature, dan wawancara. Format berita harian (news) hanya
        diproduksi redaksi internal Verax Press karena membutuhkan peliputan dan verifikasi redaksi penuh.
      </p>
      <h2>Standar naskah</h2>
      <p>
        Karya harus orisinal dengan sumber yang dapat ditelusuri. Penulis wajib mengungkapkan
        penggunaan AI (tanpa AI, asistif, atau substantif) dan potensi konflik kepentingan.
        Foto atau ilustrasi harus memiliki izin dan kredit pembuat. Kontributor harus berusia 18 tahun atau
        lebih.
      </p>
      <h2>Proses editorial</h2>
      <p>
        Semua naskah dinilai redaktur. Revisi dapat diminta dan naskah dapat ditolak. Tidak ada
        penerbitan tanpa persetujuan redaktur manusia. Penyuntingan substansi tidak pernah
        dilakukan secara diam-diam. Setiap perubahan berisiko dijelaskan kepada penulis.
      </p>
      <LegalNote>
        Halaman ini merangkum rencana dan standar, bukan perjanjian yang mengikat. Perjanjian
        kontributor final akan disediakan saat pendaftaran resmi dibuka.
      </LegalNote>
    </InstitutionalShell>
  )
}

// Pedoman Kontributor — reader-facing summary. Tahap B intake is CLOSED.
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
        Jalur kontributor akan dibuka secara terbatas — melalui undangan kepada sejumlah kecil
        penulis pilot — hanya setelah persyaratan tata kelola terpenuhi: pengelola sah,
        perjanjian kontributor yang telah ditinjau penasihat hukum, pemberitahuan privasi,
        ketersediaan editor kedua, dan kajian kepatuhan yang tuntas.
      </p>
      <h2>Format yang akan diterima</h2>
      <p>
        Opini, analisis, explainer, feature, dan wawancara. Format <em>news</em> hanya
        diproduksi newsroom Verax Press karena membutuhkan peliputan dan verifikasi redaksi penuh.
      </p>
      <h2>Standar naskah</h2>
      <p>
        Karya harus orisinal dengan sumber yang dapat ditelusuri; penulis mengungkapkan
        penggunaan AI (tidak menggunakan / asistif / substantif) dan konflik kepentingan;
        foto/ilustrasi harus memiliki izin dan kredit. Kontributor harus berusia 18 tahun atau
        lebih.
      </p>
      <h2>Proses editorial</h2>
      <p>
        Semua naskah dinilai editor. Revisi dapat diminta; naskah dapat ditolak. Tidak ada
        penerbitan tanpa persetujuan editor manusia. Penyuntingan substansi tidak pernah
        dilakukan diam-diam; perubahan berisiko dijelaskan dan dapat direspons penulis.
      </p>
      <LegalNote>
        Halaman ini merangkum rencana dan standar, bukan perjanjian yang mengikat. Perjanjian
        kontributor final akan disediakan saat pendaftaran dibuka.
      </LegalNote>
    </InstitutionalShell>
  )
}

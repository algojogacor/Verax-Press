// Kontak redaksi: kanal komunikasi pembaca.
import { InstitutionalShell } from '@/components/public/institutional'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kontak Redaksi',
  description: 'Kanal komunikasi dengan redaksi Verax Press.',
}

export default function KontakPage() {
  return (
    <InstitutionalShell
      kicker="Kontak"
      title="Hubungi Redaksi Verax Press"
      intro="Kami terbuka terhadap masukan, koreksi, hak jawab, dan pertanyaan seputar liputan."
    >
      <h2>Hak jawab, hak koreksi, dan keluhan</h2>
      <p>
        Gunakan kanal khusus kami agar setiap permohonan tercatat dan dapat ditelusuri:{' '}
        <a href="/keluhan">Kanal Hak Jawab &amp; Keluhan</a>.
      </p>
      <h2>Catatan koreksi</h2>
      <p>
        Rekaman koreksi yang telah dipublikasikan dapat dilihat di{' '}
        <a href="/koreksi">Catatan Koreksi</a>.
      </p>
      <h2>Surel redaksi</h2>
      <p>
        Alamat surel resmi redaksi akan diumumkan setelah infrastruktur komunikasi dan status
        kelembagaan final tersedia. Untuk saat ini, kanal keluhan di atas adalah jalur resmi
        yang aktif dan dipantau.
      </p>
      <h2>Kontributor</h2>
      <p>
        Penerbitan kontributor eksternal belum dibuka. Baca{' '}
        <a href="/pedoman-kontributor">pedoman kontributor</a> untuk memahami rencana kerja kami.
      </p>
    </InstitutionalShell>
  )
}

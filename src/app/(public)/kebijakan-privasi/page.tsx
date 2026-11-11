// Kebijakan Privasi: /kebijakan-privasi
import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalShell, LegalNote } from "@/components/site/institutional";
import { buildPublicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: "Kebijakan Privasi",
  description:
    "Kebijakan privasi dan perlindungan data pribadi Verax Press: transparansi pengumpulan, penggunaan kuki teknis, hak pengguna, dan keamanan data.",
  path: "/kebijakan-privasi",
});

export default function PrivacyPolicyPage() {
  return (
    <InstitutionalShell
      kicker="Privasi & Perlindungan Data"
      title="Kebijakan Privasi Verax Press"
      intro="Verax Press berkomitmen melindungi data pribadi pengunjung, pembaca yang mengajukan hak jawab, dan kontributor yang mendaftar. Dokumen ini menjelaskan secara jujur dan faktual informasi apa yang kami kumpulkan dan bagaimana data tersebut dikelola."
      canonicalPath="/kebijakan-privasi"
      breadcrumbLabel="Kebijakan Privasi"
    >
      <h2>1. Prinsip Utama Pengelolaan Data</h2>
      <p>
        Verax Press adalah media jurnalisme digital independen. Kami tidak menjual data pengguna,
        tidak bekerja sama dengan pialang data (<em>data brokers</em>), dan tidak memasang jaringan iklan
        programatik yang melacak aktivitas penjelajahan Anda di internet.
      </p>

      <h2>2. Informasi yang Kami Kumpulkan</h2>
      <p>
        Data yang diproses oleh sistem Verax Press terbatas pada informasi yang secara sadar dan sukarela
        diberikan oleh pengguna melalui fitur situs:
      </p>
      <div className="mt-4 space-y-4">
        <div className="border border-verity-rule bg-verity-paper-soft p-4">
          <p className="font-serif font-semibold text-verity-ink">A. Pembaca Umum</p>
          <p className="mt-1 text-sm text-verity-ink-soft leading-relaxed">
            Membaca artikel di Verax Press tidak memerlukan pendaftaran akun atau pengisian data pribadi.
            Server web kami mencatat log teknis standar (alamat IP, peramban, dan waktu akses) semata-mata
            untuk mendeteksi ancaman keamanan jaringan dan membatasi laju permintaan (<em>rate limiting</em>).
          </p>
        </div>

        <div className="border border-verity-rule bg-verity-paper-soft p-4">
          <p className="font-serif font-semibold text-verity-ink">B. Pengirim Hak Jawab, Hak Koreksi, dan Keluhan</p>
          <p className="mt-1 text-sm text-verity-ink-soft leading-relaxed">
            Ketika Anda menggunakan formulir di halaman <Link href="/keluhan" className="underline text-verity-accent">/keluhan</Link>,
            kami mengumpulkan nama pemohon, alamat surel, tautan atau judul artikel yang dipersoalkan,
            dan uraian keberatan. Data ini dicatat dalam register pengaduan redaksi untuk verifikasi
            dan tindak lanjut editorial.
          </p>
        </div>

        <div className="border border-verity-rule bg-verity-paper-soft p-4">
          <p className="font-serif font-semibold text-verity-ink">C. Pemohon dan Penulis Kontributor</p>
          <p className="mt-1 text-sm text-verity-ink-soft leading-relaxed">
            Melalui formulir pendaftaran di <Link href="/kontributor/daftar" className="underline text-verity-accent">/kontributor/daftar</Link>,
            kami mencatat nama lengkap, alamat surel, biografi singkat, minat bahasan, tautan portofolio,
            dan contoh draf tulisan. Data ini digunakan untuk evaluasi kelayakan editorial oleh Pemimpin Redaksi.
          </p>
        </div>

        <div className="border border-verity-rule bg-verity-paper-soft p-4">
          <p className="font-serif font-semibold text-verity-ink">D. Pengguna Terdaftar (Staf dan Kontributor)</p>
          <p className="mt-1 text-sm text-verity-ink-soft leading-relaxed">
            Untuk akun kontributor aktif dan staf redaksi, sistem menyimpan nama pengguna, surel,
            dan representasi kriptografis kata sandi yang dienkripsi menggunakan fungsi penurunan kunci scrypt.
            Kata sandi asli dalam bentuk teks polos tidak pernah disimpan atau diketahui pengelola.
          </p>
        </div>
      </div>

      <h2>3. Kebijakan Kuki (<em>Cookies</em>)</h2>
      <p>
        Verax Press hanya menggunakan kuki teknis sesi yang sangat penting (<em>strictly necessary cookies</em>):
      </p>
      <ul className="list-disc pl-6 space-y-2">
        <li>
          <strong>Kuki Sesi Otentikasi:</strong> Digunakan untuk mempertahankan status masuk staf redaksi
          pada CMS Studio dan kontributor pada Portal Kontributor. Kuki ini dilindungi dengan atribut keamanan{" "}
          <code>HttpOnly</code> dan <code>SameSite</code>.
        </li>
        <li>
          <strong>Tanpa Kuki Pelacak Pihak Ketiga:</strong> Kami tidak menyematkan kuki iklan, piksel pelacak
          jejaring sosial, atau skrip pihak ketiga yang membagikan data profil pembaca kepada pihak luar.
        </li>
      </ul>

      <h2>4. Tujuan Pemrosesan Data</h2>
      <p>
        Informasi yang kami peroleh digunakan secara terbatas untuk:
      </p>
      <ol className="list-decimal pl-6 space-y-1.5">
        <li>Menindaklanjuti permohonan hak jawab, koreksi fakta, atau pengaduan jurnalistik.</li>
        <li>Menilai permohonan kontributor dan mengelola penerbitan naskah yang diajukan.</li>
        <li>Memastikan integritas proses editorial dan mencatat jejak audit perubahan naskah.</li>
        <li>Mencegah penyalahgunaan sistem, serangan siber, atau spam pada formulir publik.</li>
      </ol>

      <h2>5. Penyimpanan dan Perlindungan Data</h2>
      <p>
        Seluruh data disimpan pada infrastruktur basis data dengan enkripsi saat transit (<em>in transit</em>)
        dan saat istirahat (<em>at rest</em>). Akses terhadap data pengaduan dan data pemohon kontributor dibatasi
        secara ketat hanya untuk staf redaksi yang berwenang melalui kendali akses berbasis peran (RBAC).
      </p>

      <h2>6. Hak Subjek Data</h2>
      <p>
        Sesuai dengan ketentuan perlindungan data pribadi yang berlaku di Indonesia, Anda memiliki hak untuk:
      </p>
      <ul className="list-disc pl-6 space-y-2">
        <li>Meminta konfirmasi apakah data pribadi Anda disimpan dalam sistem kami.</li>
        <li>Meminta pembaruan atau perbaikan atas data pribadi yang keliru.</li>
        <li>Meminta penarikan permohonan kontributor atau penghapusan data akun yang tidak aktif.</li>
      </ul>
      <p className="mt-3">
        Permintaan terkait hak data pribadi dapat disampaikan melalui kanal resmi di halaman{" "}
        <Link href="/keluhan" className="underline text-verity-accent">
          Hak Jawab &amp; Keluhan
        </Link>
        .
      </p>

      <h2>7. Kontak Terkait Kebijakan Privasi</h2>
      <p>
        Bila Anda memiliki pertanyaan mengenai praktik privasi atau perlindungan data di Verax Press,
        hubungi meja redaksi kami melalui tautan <Link href="/kontak" className="underline text-verity-accent">Kontak Redaksi</Link>.
      </p>

      <LegalNote>
        Kebijakan privasi ini dapat disesuaikan secara berkala seiring dengan perkembangan regulasi
        dan penambahan fitur sistem. Setiap pembaruan material akan dicatat dengan tanggal revisi yang jelas.
      </LegalNote>
    </InstitutionalShell>
  );
}

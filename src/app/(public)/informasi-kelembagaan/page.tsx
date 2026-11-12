// Informasi Kelembagaan: /informasi-kelembagaan (transparansi status publikasi).
import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalShell, LegalNote } from "@/components/site/institutional";
import { buildPublicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: "Informasi Kelembagaan",
  description:
    "Transparansi status kelembagaan, tata kelola redaksi, dan keterbukaan administratif Verax Press.",
  path: "/informasi-kelembagaan",
});

export default function InstitutionalInfoPage() {
  return (
    <InstitutionalShell
      kicker="Transparansi Publikasi"
      title="Informasi Kelembagaan & Tata Kelola"
      intro="Status kelembagaan, kepemimpinan redaksi, dan tata kelola administratif Verax Press saat ini."
      canonicalPath="/informasi-kelembagaan"
      breadcrumbLabel="Informasi Kelembagaan"
    >
      <h2>1. Identitas dan Status Nama Kerja</h2>
      <p>
        Verax Press adalah publikasi jurnalisme digital independen. Nama &ldquo;Verax Press&rdquo;
        merupakan nama kerja (<em>working name</em>) yang digunakan dalam pengembangan dan operasional media ini.
        Nama ini berakar dari kata Latin <em>verax</em> yang bermakna jujur atau berkata benar,
        dengan motto redaksi <em>Ex Fontibus Veritas</em> (kebenaran bersumber dari sumbernya).
      </p>

      <h2>2. Keterbukaan Status Hukum dan Regulasi</h2>
      <p>
        Demi menjaga kejujuran informasi kepada publik dan pembaca, Verax Press menyampaikan status
        administratif saat ini sebagaimana adanya:
      </p>
      <div className="mt-4 space-y-4">
        <div className="border border-verity-rule bg-verity-paper-soft p-4">
          <p className="font-serif font-semibold text-verity-ink">Status Badan Hukum Pers</p>
          <p className="mt-1 text-sm text-verity-ink-soft leading-relaxed">
            Verax Press saat ini beroperasi sebagai media digital independen percontohan dan belum memiliki
            status badan hukum pers berupa perseroan terbatas khusus pers sebagaimana diatur dalam
            Undang-Undang Nomor 40 Tahun 1999 tentang Pers.
          </p>
        </div>

        <div className="border border-verity-rule bg-verity-paper-soft p-4">
          <p className="font-serif font-semibold text-verity-ink">Verifikasi Dewan Pers</p>
          <p className="mt-1 text-sm text-verity-ink-soft leading-relaxed">
            Verax Press belum mengajukan maupun memperoleh status verifikasi administrasi dan faktual
            dari Dewan Pers Republik Indonesia.
          </p>
        </div>

        <div className="border border-verity-rule bg-verity-paper-soft p-4">
          <p className="font-serif font-semibold text-verity-ink">Penyelenggara Sistem Elektronik (PSE)</p>
          <p className="mt-1 text-sm text-verity-ink-soft leading-relaxed">
            Verax Press belum terdaftar sebagai Penyelenggara Sistem Elektronik (PSE). Persyaratan pendaftaran
            PSE dan kewajiban administratif terkait masih dalam kajian hukum sebelum pengajuan resmi.
          </p>
        </div>
      </div>

      <h2>3. Komitmen Etika dan Standar Redaksional</h2>
      <p>
        Ketiadaan status administratif di atas tidak mengubah disiplin kerja redaksi.
        Verax Press menerapkan standar editorial berikut pada setiap naskah:
      </p>
      <ul className="list-disc pl-6 space-y-2">
        <li>
          <strong>Verifikasi Sumber Kunci:</strong> Setiap artikel yang terbit wajib menautkan dokumen rujukan
          primer yang telah diperiksa keabsahannya oleh penyunting meja redaksi.
        </li>
        <li>
          <strong>Otoritas Penerbitan Redaksi:</strong> Seluruh naskah hanya dapat terbit atas persetujuan
          Pemimpin Redaksi. Perangkat otomatisasi dan agen AI eksternal hanya mengirim draf awal dan
          tidak memiliki wewenang menerbitkan artikel.
        </li>
        <li>
          <strong>Hak Jawab dan Koreksi Terbuka:</strong> Kami menyediakan saluran permohonan hak jawab yang
          tercatat resmi, serta mempublikasikan setiap koreksi faktual secara terbuka tanpa penghapusan diam-diam.
        </li>
      </ul>

      <h2>4. Kepemimpinan Redaksi</h2>
      <p>
        Kebijakan editorial dan kendali mutu naskah Verax Press berada di bawah tanggung jawab:
      </p>
      <div className="mt-4 border border-verity-rule bg-verity-paper-soft p-5 max-w-md">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-verity-accent">
          Pemimpin Redaksi
        </p>
        <p className="mt-1 font-serif text-[1.2rem] font-semibold text-verity-ink">
          Arya Rizky Ardhi Pratama
        </p>
        <p className="mt-1 text-xs text-verity-ink-soft">
          Penanggung Jawab Kebijakan Redaksi &amp; Persetujuan Penerbitan Naskah
        </p>
        <div className="mt-3 pt-3 border-t border-verity-rule text-xs font-mono text-verity-ink-soft">
          <Link href="/kontak" className="underline hover:text-verity-accent">
            Hubungi Meja Redaksi →
          </Link>
        </div>
      </div>

      <h2>5. Kebijakan Keuangan dan Pendanaan</h2>
      <p>
        Verax Press dikembangkan secara mandiri tanpa suntikan dana modal ventura spekulatif, tanpa sponsor
        politik praktis, dan tanpa ketergantungan pada iklan klik (<em>clickbait</em>). Setiap naskah diproduksi semata-mata
        berdasarkan nilai berita dan relevansinya bagi wawasan masyarakat.
      </p>

      <h2>6. Tautan Dokumen Tata Kelola</h2>
      <div className="mt-4 flex flex-wrap gap-3 font-mono text-xs">
        <Link
          href="/tentang"
          className="border border-verity-rule bg-verity-paper-soft px-3 py-1.5 text-verity-ink underline underline-offset-4 hover:text-verity-accent"
        >
          Tentang Verax Press
        </Link>
        <Link
          href="/standar-editorial"
          className="border border-verity-rule bg-verity-paper-soft px-3 py-1.5 text-verity-ink underline underline-offset-4 hover:text-verity-accent"
        >
          Standar Editorial
        </Link>
        <Link
          href="/koreksi"
          className="border border-verity-rule bg-verity-paper-soft px-3 py-1.5 text-verity-ink underline underline-offset-4 hover:text-verity-accent"
        >
          Catatan Koreksi Publik
        </Link>
        <Link
          href="/syarat-ketentuan"
          className="border border-verity-rule bg-verity-paper-soft px-3 py-1.5 text-verity-ink underline underline-offset-4 hover:text-verity-accent"
        >
          Syarat dan Ketentuan
        </Link>
      </div>

      <LegalNote>
        Informasi kelembagaan ini diperbarui sesuai perkembangan status organisasi.
        Masukan dan koreksi publik dapat disampaikan melalui saluran pengaduan resmi redaksi.
      </LegalNote>
    </InstitutionalShell>
  );
}

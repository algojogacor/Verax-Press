// Kontak redaksi: kanal komunikasi resmi bagi pembaca, subjek berita, dan kontributor.
import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalShell, LegalNote } from "@/components/site/institutional";
import { buildPublicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: "Kontak Redaksi",
  description:
    "Kanal komunikasi resmi dengan Meja Redaksi Verax Press: hak jawab, pengaduan berita, pengiriman tulisan, dan informasi kelembagaan.",
  path: "/kontak",
});

export default function KontakPage() {
  return (
    <InstitutionalShell
      kicker="Komunikasi Publik"
      title="Hubungi Redaksi Verax Press"
      intro="Kami menyambut masukan, pertanyaan, rujukan fakta, serta permohonan hak jawab dari pembaca dan masyarakat luas."
      canonicalPath="/kontak"
      breadcrumbLabel="Kontak Redaksi"
    >
      <h2>Hak Jawab, Hak Koreksi, dan Pengaduan Editorial</h2>
      <p>
        Bila Anda adalah subjek pemberitaan atau pihak yang berkepentingan atas akurasi fakta dalam karya jurnalistik
        Verax Press, gunakan kanal khusus kami agar laporan tercatat secara formal dan memperoleh nomor registrasi:
      </p>
      <div className="mt-4 border border-verity-rule bg-verity-paper-soft p-5">
        <p className="font-serif font-semibold text-verity-ink">Kanal Hak Jawab &amp; Keluhan</p>
        <p className="mt-1 font-serif text-[0.92rem] text-verity-ink-soft leading-relaxed">
          Setiap permohonan ditelaah langsung oleh editor penanggung jawab. Penanganan kekeliruan material
          diumumkan secara transparan pada log koreksi publik.
        </p>
        <div className="mt-3">
          <Link
            href="/keluhan"
            className="inline-block font-mono text-xs uppercase tracking-[0.08em] text-verity-accent underline underline-offset-4 hover:text-verity-accent-deep"
          >
            Buka Formulir Hak Jawab &amp; Keluhan →
          </Link>
        </div>
      </div>

      <h2>Pengiriman Tulisan dan Kontributor</h2>
      <p>
        Verax Press menerima pengajuan naskah analisis, opini terkurasi, dan liputan fitur dari penulis independen,
        akademisi, dan praktisi.
      </p>
      <p>
        Informasi format penulisan, standar rujukan primer, dan formulir pendaftaran kontributor tersedia pada halaman{" "}
        <Link href="/kirim-tulisan" className="underline text-verity-accent">
          Kirim Tulisan
        </Link>{" "}
        dan{" "}
        <Link href="/pedoman-kontributor" className="underline text-verity-accent">
          Pedoman Kontributor
        </Link>
        .
      </p>

      <h2>Korespondensi Umum &amp; Konfirmasi Redaksi</h2>
      <p>
        Untuk pertanyaan editorial, permintaan wawancara kelembagaan, atau konfirmasi resmi, gunakan register pengaduan
        dan korespondensi redaksi di halaman{" "}
        <Link href="/keluhan" className="underline text-verity-accent">
          /keluhan
        </Link>{" "}
        agar setiap pesan memperoleh nomor pencatatan resmi.
      </p>
      <div className="mt-3 border border-verity-rule bg-verity-paper-soft p-4 font-mono text-xs text-verity-ink space-y-1.5">
        <p>
          <span className="text-verity-ink-soft">Kanal Pencatatan Publik:</span>{" "}
          <Link href="/keluhan" className="underline text-verity-accent">
            Formulir Register /keluhan
          </Link>
        </p>
        <p>
          <span className="text-verity-ink-soft">Alamat Surel Domain:</span>{" "}
          Belum dipublikasikan secara terpisah pada tahap pra-rilis ini.
        </p>
        <p>
          <span className="text-verity-ink-soft">Domisili Operasional:</span>{" "}
          Indonesia (status kelembagaan tercantum pada Informasi Kelembagaan).
        </p>
      </div>

      <h2>Catatan Koreksi Publik</h2>
      <p>
        Seluruh riwayat ralat dan perbaikan fakta pada artikel yang telah terbit dapat ditelusuri melalui{" "}
        <Link href="/koreksi" className="underline text-verity-accent">
          Log Koreksi Publik
        </Link>
        .
      </p>

      <h2>Informasi Kelembagaan</h2>
      <p>
        Keterbukaan mengenai status badan hukum pers, verifikasi Dewan Pers, dan tata kelola internal Verax Press
        dapat dibaca pada halaman{" "}
        <Link href="/informasi-kelembagaan" className="underline text-verity-accent">
          Informasi Kelembagaan
        </Link>
        .
      </p>

      <LegalNote>
        Redaksi Verax Press tidak memungut biaya apa pun dalam penerimaan hak jawab, permohonan koreksi,
        maupun proses evaluasi naskah kontributor.
      </LegalNote>
    </InstitutionalShell>
  );
}

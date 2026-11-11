// Syarat dan Ketentuan: /syarat-ketentuan
import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalShell, LegalNote } from "@/components/site/institutional";
import { buildPublicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: "Syarat dan Ketentuan",
  description:
    "Syarat dan ketentuan penggunaan situs web Verax Press: hak cipta, etika pembaca, ketentuan kontributor, dan batasan tanggung jawab editorial.",
  path: "/syarat-ketentuan",
});

export default function TermsPage() {
  return (
    <InstitutionalShell
      kicker="Ketentuan Layanan"
      title="Syarat dan Ketentuan Penggunaan"
      intro="Ketentuan ini mengatur akses Anda terhadap situs web Verax Press, pemanfaatan materi publikasi, serta hak dan kewajiban bagi penulis yang mengajukan karya melalui jalur kontributor."
      canonicalPath="/syarat-ketentuan"
      breadcrumbLabel="Syarat dan Ketentuan"
    >
      <h2>1. Penerimaan Ketentuan</h2>
      <p>
        Dengan mengakses dan membaca materi di situs web Verax Press, Anda menyatakan memahami dan
        menyetujui syarat dan ketentuan yang tercantum pada halaman ini. Jika Anda tidak menyetujui
        sebagian atau seluruh ketentuan ini, Anda disarankan untuk tidak melanjutkan penggunaan situs.
      </p>

      <h2>2. Hak Cipta dan Pemanfaatan Konten</h2>
      <p>
        Seluruh materi yang diterbitkan di Verax Press, termasuk teks naskah berita, artikel analisis,
        karya opini, grafik data, dan tipografi, dilindungi oleh undang-undang hak cipta Republik Indonesia:
      </p>
      <ul className="list-disc pl-6 space-y-2">
        <li>
          <strong>Penggunaan Wajar:</strong> Anda diperbolehkan mengutip sebagian naskah untuk tujuan
          kajian ilmiah, pendidikan, kritik, atau ulasan berita, dengan kewajiban mencantumkan kredit
          nama penulis dan tautan rujukan langsung ke artikel Verax Press terkait.
        </li>
        <li>
          <strong>Larangan Penggandaan Komersial:</strong> Dilarang mereproduksi, mendistribusikan ulang,
          atau menerbitkan kembali seluruh isi artikel untuk tujuan komersial tanpa izin tertulis dari
          Pemimpin Redaksi Verax Press.
        </li>
        <li>
          <strong>Pengambilan Data Otomatis:</strong> Pengambilan konten secara masif (<em>scraping</em>) yang
          membebani infrastruktur server secara tidak wajar dilarang. Agen AI yang ingin berinteraksi
          dengan sistem redaksi wajib menggunakan jalur API resmi di halaman{" "}
          <Link href="/developers" className="underline text-verity-accent">
            Dokumentasi Pengembang
          </Link>
          .
        </li>
      </ul>

      <h2>3. Ketentuan bagi Kontributor Eksternal</h2>
      <p>
        Bagi penulis yang mendaftar dan mengirimkan naskah melalui jalur kontributor:
      </p>
      <ul className="list-disc pl-6 space-y-2">
        <li>
          <strong>Orisinalitas dan Tanggung Jawab Hukum:</strong> Penulis menjamin bahwa karya yang diajukan
          adalah hasil pemikiran asli, tidak melanggar hak cipta pihak ketiga, tidak mengandung fitnah,
          dan didukung oleh dokumen rujukan primer yang valid.
        </li>
        <li>
          <strong>Kewenangan Penyuntingan:</strong> Redaksi Verax Press berhak melakukan penyuntingan gaya
          bahasa, judul, dan struktur tanpa mengubah substansi fakta atau arah pemikiran utama penulis.
        </li>
        <li>
          <strong>Hak Lisensi Publikasi:</strong> Penulis tetap memegang hak cipta moral atas karyanya.
          Dengan diterbitkannya tulisan di Verax Press, penulis memberikan lisensi non-eksklusif dan bebas
          royalti kepada Verax Press untuk menampilkan, mengarsipkan, dan menyebarluaskan karya tersebut
          pada platform media digital ini.
        </li>
        <li>
          <strong>Pernyataan Sanggahan Opini:</strong> Seluruh artikel dalam format Opini mencerminkan
          pandangan pribadi penulis yang bersangkutan dan tidak otomatis mencerminkan sikap kelembagaan
          Redaksi Verax Press.
        </li>
      </ul>

      <h2>4. Hak Jawab, Koreksi, dan Sanggahan</h2>
      <p>
        Verax Press menghormati hak masyarakat atas informasi yang akurat:
      </p>
      <p className="mt-2">
        Pihak yang merasa dirugikan oleh kesalahan fakta materiil dalam pemberitaan kami berhak
        mengajukan hak jawab atau permohonan koreksi melalui kanal resmi di{" "}
        <Link href="/keluhan" className="underline text-verity-accent">
          /keluhan
        </Link>
        . Redaksi akan memeriksa rujukan fakta dan menindaklanjuti permohonan secara transparan melalui
        catatan koreksi publik pada halaman <Link href="/koreksi" className="underline text-verity-accent">/koreksi</Link>.
      </p>

      <h2>5. Pembatasan Tanggung Jawab</h2>
      <p>
        Verax Press berupaya menyajikan informasi dengan verifikasi ketat dan disiplin sumber primer.
        Namun, informasi yang disajikan bertujuan sebagai wawasan jurnalistik dan rujukan publik,
        bukan sebagai nasihat hukum, keuangan, atau investasi profesional. Pengambilan keputusan pribadi
        berdasarkan bacaan merupakan tanggung jawab mandiri masing-masing pembaca.
      </p>

      <h2>6. Hukum yang Berlaku</h2>
      <p>
        Syarat dan ketentuan ini diatur dan ditafsirkan berdasarkan hukum Negara Kesatuan Republik Indonesia.
        Segala perselisihan yang timbul sehubungan dengan pemberitaan jurnalistik diselesaikan terlebih dahulu
        melalui mekanisme hak jawab dan mediasi etika jurnalistik yang berlaku.
      </p>

      <LegalNote>
        Verax Press adalah nama kerja media digital independen. Ketentuan ini disusun untuk menjamin
        keteraturan publikasi, perlindungan integritas fakta, dan perlakuan adil bagi seluruh pihak
        yang berinteraksi dengan platform kami.
      </LegalNote>
    </InstitutionalShell>
  );
}

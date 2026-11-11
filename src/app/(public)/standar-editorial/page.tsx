// Standar Editorial: /standar-editorial (ringkasan publik kebijakan internal redaksi).
// TANPA angka tenggat hari (masih kajian hukum — lihat worklog §3).
import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { canonicalUrl } from "@/lib/seo/constants";
import { buildPublicMetadata } from "@/lib/seo/metadata";
import { buildBreadcrumbJsonLd } from "@/lib/seo/structured-data";

export const metadata: Metadata = buildPublicMetadata({
  title: "Standar Editorial",
  description:
    "Ringkasan publik standar editorial Verax Press: verifikasi sumber, keberimbangan, kebijakan AI, atribusi, serta koreksi dan hak jawab.",
  path: "/standar-editorial",
});

/** Tingkat keterlibatan AI (Charter §4): label & penjelasan ringkas. */
const AI_LEVELS: { name: string; description: string }[] = [
  {
    name: "Tanpa AI",
    description:
      "Naskah disusun sepenuhnya oleh manusia; tidak ada bantuan AI dalam proses pembuatannya.",
  },
  {
    name: "Asistif",
    description:
      "AI membantu pekerjaan teknis, seperti riset awal atau perapian struktur, sementara substansi, bahasa, dan keputusan editorial sepenuhnya dikerjakan manusia.",
  },
  {
    name: "Substantif",
    description:
      "AI terlibat dalam penyusunan substansi draf; wajib disertai catatan proses yang tampil publik pada artikel.",
  },
];

const SECTIONS = [
  { id: "verifikasi-sumber", label: "Verifikasi & Sumber" },
  { id: "keberimbangan", label: "Keberimbangan Berita" },
  { id: "kebijakan-ai", label: "Kebijakan AI & Otomasi" },
  { id: "atribusi", label: "Pedoman Atribusi" },
  { id: "koreksi-hak-jawab", label: "Koreksi & Hak Jawab" },
];

export default function StandardsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Beranda", url: canonicalUrl("/") },
          { name: "Standar Editorial", url: canonicalUrl("/standar-editorial") },
        ])}
      />
      <Breadcrumbs items={[{ label: "Beranda", href: "/" }, { label: "Standar Editorial" }]} />
      <header className="border-b-2 border-verity-ink pb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-verity-accent">
          Kebijakan Redaksi
        </p>
        <h1 className="mt-3 font-serif text-[2.2rem] font-semibold leading-[1.08] tracking-[-0.012em] text-verity-ink sm:text-[2.8rem]">
          Standar Editorial
        </h1>
        <p className="mt-4 max-w-3xl font-serif text-[1.1rem] leading-[1.7] text-verity-ink-soft">
          Halaman ini merangkum standar yang mengikat setiap naskah Verax Press: verifikasi sumber,
          keberimbangan, keterlibatan AI, atribusi, serta koreksi dan hak jawab.
        </p>
      </header>

      {/* Grid 2 Kolom di Desktop (lg:) */}
      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-14">
        {/* Kolom Isi Utama */}
        <div className="min-w-0">
          {/* Verifikasi & sumber */}
          <section id="verifikasi-sumber" aria-labelledby="heading-verifikasi" className="scroll-mt-10 pb-8">
            <h2 id="heading-verifikasi" className="font-serif text-[1.4rem] font-semibold text-verity-ink">
              Verifikasi &amp; sumber
            </h2>
            <div className="mt-4 space-y-4 font-serif text-[1.02rem] leading-[1.78] text-verity-ink">
              <p>
                Kami mengutamakan sumber primer: dokumen resmi, data, dan keterangan narasumber
                langsung. Setiap referensi yang digunakan redaksi dicatat lengkap (judul, penerbit,
                URL, serta tanggal terbit dan akses), lalu ditampilkan pada halaman artikel.
              </p>
              <p>
                Sumber kunci diperiksa langsung oleh penyunting meja redaksi. Artikel tidak disetujui untuk terbit
                bila masih ada sumber kunci yang belum diverifikasi atau berstatus dipertanyakan.
                Kutipan langsung harus sesuai dengan sumbernya.
              </p>
            </div>
          </section>

          {/* Keberimbangan */}
          <section id="keberimbangan" aria-labelledby="heading-keberimbangan" className="scroll-mt-10 border-t border-verity-rule py-8">
            <h2 id="heading-keberimbangan" className="font-serif text-[1.4rem] font-semibold text-verity-ink">
              Keberimbangan
            </h2>
            <p className="mt-4 font-serif text-[1.02rem] leading-[1.78] text-verity-ink">
              Pihak yang dapat dirugikan oleh sebuah pemberitaan diberi kesempatan menanggapi
              sebelum artikel dimuat. Bila tanggapan belum diperoleh meski upaya verifikasi telah
              dilakukan, artikel menjelaskan upaya yang sudah ditempuh redaksi secara terbuka.
            </p>
          </section>

          {/* Kebijakan AI */}
          <section id="kebijakan-ai" aria-labelledby="heading-kebijakan-ai" className="scroll-mt-10 border-t border-verity-rule py-8">
            <h2 id="heading-kebijakan-ai" className="font-serif text-[1.4rem] font-semibold text-verity-ink">
              Kebijakan AI
            </h2>
            <p className="mt-4 font-serif text-[1.02rem] leading-[1.78] text-verity-ink">
              Setiap naskah mencatat tingkat keterlibatan AI dalam tiga tingkat:
            </p>
            <dl className="mt-5 space-y-3">
              {AI_LEVELS.map((level) => (
                <div key={level.name} className="border border-verity-rule bg-verity-paper-soft p-4">
                  <dt className="font-serif text-[1rem] font-semibold text-verity-ink">{level.name}</dt>
                  <dd className="mt-1 font-serif text-[0.95rem] leading-relaxed text-verity-ink-soft">
                    {level.description}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 space-y-4 font-serif text-[1.02rem] leading-[1.78] text-verity-ink">
              <p>
                Tidak ada publikasi otomatis: AI, klien API, maupun penjadwal tidak dapat menerbitkan
                naskah apa pun tanpa keputusan manusia. AI tidak pernah dijadikan sumber fakta.
              </p>
              <p>
                Agen AI eksternal hanya dapat mengirim draf melalui API internal Verax Press, tanpa hak
                menyetujui atau menerbitkan naskah.
              </p>
            </div>
          </section>

          {/* Atribusi */}
          <section id="atribusi" aria-labelledby="heading-atribusi" className="scroll-mt-10 border-t border-verity-rule py-8">
            <h2 id="heading-atribusi" className="font-serif text-[1.4rem] font-semibold text-verity-ink">
              Atribusi
            </h2>
            <p className="mt-4 font-serif text-[1.02rem] leading-[1.78] text-verity-ink">
              Kredit pada artikel memakai bentuk yang jelas: “Oleh” untuk penulis naskah, “Dilaporkan
              oleh” untuk pelaporan lapangan, “Disunting oleh” untuk editor penanggung jawab, dan
              “Redaksi Verax Press” untuk karya kolektif newsroom. Byline “Redaksi Verax Press” hanya digunakan
              untuk karya newsroom yang disusun dan disunting langsung oleh tim redaksi.
            </p>
          </section>

          {/* Koreksi & hak jawab */}
          <section id="koreksi-hak-jawab" aria-labelledby="heading-koreksi" className="scroll-mt-10 border-t border-verity-rule py-8">
            <h2 id="heading-koreksi" className="font-serif text-[1.4rem] font-semibold text-verity-ink">
              Koreksi &amp; hak jawab
            </h2>
            <div className="mt-4 space-y-4 font-serif text-[1.02rem] leading-[1.78] text-verity-ink">
              <p>
                Koreksi atas kesalahan material tampil pada artikel yang bersangkutan dan tercatat pada{" "}
                <Link
                  href="/koreksi"
                  className="text-verity-accent underline underline-offset-4 hover:text-verity-accent-deep"
                >
                  log koreksi publik
                </Link>
                ; riwayat koreksi tidak dihapus diam-diam. Kanal hak jawab, hak koreksi, dan keluhan
                tersedia pada halaman{" "}
                <Link
                  href="/keluhan"
                  className="text-verity-accent underline underline-offset-4 hover:text-verity-accent-deep"
                >
                  /keluhan
                </Link>
                .
              </p>
              <p>
                Tenggat operasional penanganan permohonan sedang dalam kajian hukum, sehingga halaman
                ini tidak menetapkan jumlah hari tertentu.
              </p>
            </div>
          </section>

          {/* Catatan bawah */}
          <p className="border-t border-verity-rule pt-4 font-mono text-[11px] leading-relaxed text-verity-ink-faint">
            Ringkasan ini adalah versi publik dari kebijakan internal redaksi Verax Press.
          </p>
        </div>

        {/* Sidebar Navigasi Cepat (Desktop lg:) */}
        <aside aria-label="Navigasi kebijakan" className="hidden lg:block lg:border-l lg:border-verity-rule lg:pl-8">
          <div className="sticky top-6 space-y-8">
            <div>
              <p className="font-sans text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-verity-ink-soft">
                Daftar Pokok Bahasan
              </p>
              <nav aria-label="Daftar isi kebijakan" className="mt-4">
                <ul className="space-y-2 border-l border-verity-rule pl-3">
                  {SECTIONS.map((sec) => (
                    <li key={sec.id}>
                      <a
                        href={`#${sec.id}`}
                        className="block font-serif text-[0.95rem] text-verity-ink-soft hover:text-verity-accent hover:underline underline-offset-4"
                      >
                        {sec.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            <div className="border border-verity-rule bg-verity-paper-soft p-5">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-verity-ink">
                Integritas Dokumen
              </p>
              <p className="mt-2 font-serif text-[0.88rem] leading-relaxed text-verity-ink-soft">
                Dokumen ini merupakan intisari operasional dari Piagam Redaksi Verax Press. Seluruh wartawan,
                penyunting, dan kontributor terikat pada standar yang sama.
              </p>
              <div className="mt-4 space-y-2 font-mono text-[11px]">
                <Link
                  href="/pedoman-kontributor"
                  className="block text-verity-accent underline underline-offset-4 hover:text-verity-accent-deep"
                >
                  Pedoman Kontributor →
                </Link>
                <Link
                  href="/kebijakan-ai"
                  className="block text-verity-accent underline underline-offset-4 hover:text-verity-accent-deep"
                >
                  Kebijakan AI Lengkap →
                </Link>
                <Link
                  href="/keluhan"
                  className="block text-verity-accent underline underline-offset-4 hover:text-verity-accent-deep"
                >
                  Layanan Hak Jawab →
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

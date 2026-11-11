// Tentang Verax Press: /tentang (halaman kelembagaan, prosa serif).
// Nada hati-hati: tidak ada klaim status hukum (lihat catatan penutup).
import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tentang Verax Press",
  description:
    "Mengenal Verax Press: media digital independen dengan kendali editorial manusia. Misi, nilai editorial, desk, cara kerja, dan peluncuran bertahap.",
};

/** Nilai editorial (Charter §2): nilai & penerapannya. */
const EDITORIAL_VALUES: { name: string; application: string }[] = [
  {
    name: "Akurasi",
    application: "Setiap klaim faktual ditopang sumber yang dicatat lengkap dan dapat ditelusuri pembaca.",
  },
  {
    name: "Independensi",
    application: "Keputusan editorial dibuat oleh redaksi, tidak tunduk pada kepentingan pengiklan atau pihak luar.",
  },
  {
    name: "Keberimbangan",
    application: "Pihak yang dipersoalkan dalam pemberitaan diberi kesempatan menanggapi sebelum artikel dimuat.",
  },
  {
    name: "Transparansi",
    application: "Sumber, tingkat keterlibatan AI, dan koreksi ditampilkan secara terbuka pada setiap artikel.",
  },
  {
    name: "Akuntabilitas",
    application: "Kesalahan material diakui, dikoreksi, dan tercatat pada log koreksi publik.",
  },
  {
    name: "Kepentingan publik",
    application: "Liputan diprioritaskan berdasarkan manfaatnya bagi pemahaman masyarakat atas isu publik.",
  },
];

/** Misi (Charter §1.3). */
const MISSIONS: string[] = [
  "Menyajikan informasi yang akurat dan terlacak ke sumbernya.",
  "Membantu pembaca memahami isu-isu publik, bukan sekadar mengetahui kejadian.",
  "Menyediakan ruang publikasi terkurasi bagi perspektif dan keahlian eksternal.",
  "Mengelola penerbitan secara bertanggung jawab, termasuk mencatat dan menampilkan koreksi.",
];

const INSTITUTIONAL_LINKS = [
  { href: "/standar-editorial", label: "Standar Editorial" },
  { href: "/pedoman-kontributor", label: "Pedoman Kontributor" },
  { href: "/kebijakan-ai", label: "Kebijakan AI & Otomasi" },
  { href: "/koreksi", label: "Catatan Koreksi Publik" },
  { href: "/keluhan", label: "Hak Jawab & Keluhan" },
  { href: "/kontak", label: "Kontak Redaksi" },
];

export default async function AboutPage() {
  const desks = await db.desk.findMany({
    where: { isActive: true },
    select: { slug: true, name: true, description: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="border-b-2 border-verity-ink pb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-verity-accent">Tentang</p>
        <h1 className="mt-3 font-serif text-[2.2rem] font-semibold leading-[1.08] tracking-[-0.012em] text-verity-ink sm:text-[2.8rem]">
          Tentang Verax Press
        </h1>
        <p className="mt-4 max-w-3xl font-serif text-[1.1rem] leading-[1.7] text-verity-ink-soft">
          Media digital independen yang berfokus pada jurnalisme bermutu, disiplin verifikasi
          sumber primer, dan kendali editorial manusia di setiap tahap produksi.
        </p>
      </header>

      {/* Grid 2 Kolom di Desktop (lg:) */}
      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-14">
        {/* Kolom Isi Utama */}
        <div className="min-w-0">
          {/* Apa itu Verax Press */}
          <section aria-labelledby="apa-itu-verity" className="pb-8">
            <h2 id="apa-itu-verity" className="font-serif text-[1.4rem] font-semibold text-verity-ink">
              Apa itu Verax Press
            </h2>
            <div className="mt-4 space-y-4 font-serif text-[1.02rem] leading-[1.78] text-verity-ink">
              <p>
                Verax Press adalah media digital independen yang berfokus pada isu publik Indonesia.
                Kami menggabungkan ruang redaksi yang sepenuhnya dikendalikan staf editorial dengan kontribusi
                eksternal yang terkurasi.
              </p>
              <p className="border-l-2 border-verity-rule-strong pl-4 italic text-verity-ink-soft">
                Nama kami diambil dari bahasa Latin{" "}
                <span className="font-medium not-italic text-verity-ink">&ldquo;verax&rdquo;</span>, yang berarti jujur
                atau berkata benar. Motto redaksi,{" "}
                <span className="not-italic text-verity-ink">&ldquo;Ex Fontibus Veritas&rdquo;</span>, menegaskan
                arah kerja kami: kebenaran bersumber dari sumbernya.
              </p>
              <p>
                Verax Press bukan platform publikasi mandiri dan bukan forum terbuka. Tidak ada naskah
                yang terbit tanpa persetujuan manusia: setiap artikel melewati penelaahan, pemeriksaan
                fakta, dan persetujuan redaktur sebelum tayang.
              </p>
            </div>
          </section>

          {/* Misi */}
          <section aria-labelledby="misi" className="border-t border-verity-rule py-8">
            <h2 id="misi" className="font-serif text-[1.4rem] font-semibold text-verity-ink">
              Misi
            </h2>
            <ul className="mt-4 list-disc space-y-2.5 pl-6 font-serif text-[1.02rem] leading-[1.78] text-verity-ink marker:text-verity-ink-faint">
              {MISSIONS.map((mission) => (
                <li key={mission}>{mission}</li>
              ))}
            </ul>
          </section>

          {/* Nilai editorial */}
          <section aria-labelledby="nilai-editorial" className="border-t border-verity-rule py-8">
            <h2 id="nilai-editorial" className="font-serif text-[1.4rem] font-semibold text-verity-ink">
              Nilai editorial
            </h2>
            <p className="mt-4 font-serif text-[1.02rem] leading-[1.78] text-verity-ink">
              Enam nilai berikut mengikat setiap naskah dan keputusan redaksi.
            </p>
            <table className="mt-6 w-full border-collapse text-left font-serif text-[0.95rem]">
              <thead>
                <tr className="border-b-2 border-verity-ink">
                  <th scope="col" className="w-[32%] py-2 pr-6 font-semibold text-verity-ink">
                    Nilai
                  </th>
                  <th scope="col" className="py-2 font-semibold text-verity-ink">
                    Penerapan
                  </th>
                </tr>
              </thead>
              <tbody>
                {EDITORIAL_VALUES.map((value) => (
                  <tr key={value.name} className="border-b border-verity-rule align-top">
                    <td className="py-3 pr-6 font-medium text-verity-ink">{value.name}</td>
                    <td className="py-3 leading-relaxed text-verity-ink-soft">{value.application}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Desk */}
          <section aria-labelledby="desk" className="border-t border-verity-rule py-8">
            <h2 id="desk" className="font-serif text-[1.4rem] font-semibold text-verity-ink">
              Desk Liputan
            </h2>
            <p className="mt-4 font-serif text-[1.02rem] leading-[1.78] text-verity-ink">
              Pada peluncuran ini, kerja redaksi Verax Press disusun dalam desk berikut.
            </p>
            <dl className="mt-6">
              {desks.map((desk) => (
                <div key={desk.slug} className="border-t border-verity-rule py-4 last:border-b">
                  <dt className="font-serif text-[1.05rem] font-medium text-verity-ink">
                    <Link
                      href={`/desk/${desk.slug}`}
                      className="underline decoration-verity-rule-strong underline-offset-4 hover:text-verity-accent"
                    >
                      {desk.name}
                    </Link>
                  </dt>
                  <dd className="mt-1 font-serif text-[0.95rem] leading-relaxed text-verity-ink-soft">
                    {desk.description}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 font-serif text-[0.95rem] italic leading-relaxed text-verity-ink-soft">
              Desk tambahan hanya akan dibuka bila ada editor penanggung jawab yang mengelolanya.
            </p>
          </section>

          {/* Cara kami bekerja */}
          <section aria-labelledby="cara-kerja" className="border-t border-verity-rule py-8">
            <h2 id="cara-kerja" className="font-serif text-[1.4rem] font-semibold text-verity-ink">
              Cara kami bekerja
            </h2>
            <div className="mt-4 space-y-4 font-serif text-[1.02rem] leading-[1.78] text-verity-ink">
              <p>
                Setiap naskah melewati alur editorial yang sama: draf, penelaahan redaktur, uji fakta,
                lalu persetujuan akhir Chief Editor sebelum terbit. Hanya Chief Editor yang memiliki wewenang
                menerbitkan artikel.
              </p>
              <p>
                Sumber kunci pada setiap artikel diverifikasi oleh editor manusia. Naskah tidak
                disetujui terbit bila masih terdapat sumber kunci yang belum diverifikasi atau
                dipertanyakan. Daftar sumber beserta statusnya ditampilkan langsung pada halaman artikel.
              </p>
              <p>
                Bila terjadi kesalahan material, koreksi ditampilkan pada artikel yang bersangkutan dan
                tercatat pada{" "}
                <Link
                  href="/koreksi"
                  className="text-verity-accent underline underline-offset-4 hover:text-verity-accent-deep"
                >
                  log koreksi publik
                </Link>
                .
              </p>
            </div>
          </section>

          {/* Peluncuran bertahap */}
          <section aria-labelledby="peluncuran" className="border-t border-verity-rule py-8">
            <h2 id="peluncuran" className="font-serif text-[1.4rem] font-semibold text-verity-ink">
              Peluncuran bertahap
            </h2>
            <div className="mt-4 space-y-4 font-serif text-[1.02rem] leading-[1.78] text-verity-ink">
              <p>
                Verax Press diluncurkan bertahap. Tahap A dijalankan oleh ruang redaksi internal,
                dengan seluruh konten diproduksi dan disunting oleh staf redaksi.
              </p>
              <p>
                Tahap B membuka kontribusi eksternal melalui mekanisme undangan khusus, setelah persyaratan tata kelola
                seperti kebijakan lisensi kontributor dan proses kurasi terpenuhi secara lengkap.
              </p>
            </div>
          </section>

          {/* Catatan penutup */}
          <p className="border-t border-verity-rule pt-4 font-mono text-[11px] leading-relaxed text-verity-ink-faint">
            Verax Press adalah nama kerja. Verax Press belum mengklaim status badan hukum pers, pendaftaran
            PSE, atau verifikasi Dewan Pers.
          </p>
        </div>

        {/* Sidebar Direktori Lembaga (Desktop lg:) */}
        <aside aria-label="Direktori lembaga" className="hidden lg:block lg:border-l lg:border-verity-rule lg:pl-8">
          <div className="sticky top-6 space-y-8">
            <div>
              <p className="font-sans text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-verity-ink-soft">
                Direktori Lembaga
              </p>
              <nav aria-label="Menu navigasi lembaga" className="mt-4">
                <ul className="space-y-2.5 border-l border-verity-rule pl-3">
                  {INSTITUTIONAL_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="block font-serif text-[0.95rem] text-verity-ink-soft hover:text-verity-accent hover:underline underline-offset-4"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            <div className="border border-verity-rule bg-verity-paper-soft p-5">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-verity-ink">
                Ex Fontibus Veritas
              </p>
              <p className="mt-2 font-serif text-[0.88rem] leading-relaxed text-verity-ink-soft">
                Kebenaran bersumber dari sumbernya. Di Verax Press, keterbukaan metodologi verifikasi
                dan kesediaan mengakui kekeliruan adalah fondasi kepercayaan publik.
              </p>
              <div className="mt-4 pt-3 border-t border-verity-rule">
                <Link
                  href="/standar-editorial"
                  className="font-mono text-[11px] text-verity-accent underline underline-offset-4 hover:text-verity-accent-deep"
                >
                  Baca Standar Editorial →
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

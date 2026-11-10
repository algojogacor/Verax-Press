// Standar Editorial: /standar-editorial — ringkasan publik kebijakan internal redaksi.
// TANPA angka tenggat hari (masih kajian hukum — lihat worklog §3).
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Standar Editorial",
  description:
    "Ringkasan publik standar editorial Verax Press: verifikasi sumber, keberimbangan, kebijakan AI, atribusi, serta koreksi dan hak jawab.",
};

/** Tingkat keterlibatan AI (Charter §4) — label & penjelasan ringkas. */
const AI_LEVELS: { name: string; description: string }[] = [
  {
    name: "Tanpa AI",
    description:
      "Naskah disusun sepenuhnya oleh manusia; tidak ada bantuan AI dalam proses pembuatannya.",
  },
  {
    name: "Asistif",
    description:
      "AI membantu pekerjaan teknis — misalnya riset awal atau perapian struktur — sementara substansi, bahasa, dan keputusan editorial sepenuhnya dikerjakan manusia.",
  },
  {
    name: "Substantif",
    description:
      "AI terlibat dalam penyusunan substansi draf; wajib disertai catatan proses yang tampil publik pada artikel.",
  },
];

export default function StandardsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="max-w-3xl">
        <header className="pb-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-verity-ink-soft">
            Kebijakan Redaksi
          </p>
          <h1 className="mt-3 font-serif text-[2rem] font-semibold leading-[1.12] tracking-[-0.01em] text-verity-ink">
            Standar Editorial
          </h1>
          <p className="mt-4 font-serif text-[1.02rem] leading-[1.78] text-verity-ink-soft">
            Halaman ini merangkum standar yang mengikat setiap naskah Verax Press: verifikasi sumber,
            keberimbangan, keterlibatan AI, atribusi, serta koreksi dan hak jawab.
          </p>
        </header>

        {/* Verifikasi & sumber */}
        <section aria-labelledby="verifikasi-sumber" className="border-t border-verity-rule py-8">
          <h2 id="verifikasi-sumber" className="font-serif text-[1.35rem] font-semibold text-verity-ink">
            Verifikasi &amp; sumber
          </h2>
          <div className="mt-4 space-y-4 font-serif text-[1.02rem] leading-[1.78] text-verity-ink">
            <p>
              Kami mengutamakan sumber primer: dokumen resmi, data, dan keterangan narasumber
              langsung. Setiap referensi yang digunakan redaksi dicatat lengkap — judul, penerbit,
              URL, serta tanggal terbit dan akses — lalu ditampilkan pada halaman artikel.
            </p>
            <p>
              Sumber kunci diverifikasi oleh editor manusia. Artikel tidak disetujui untuk terbit
              bila masih ada sumber kunci yang belum diverifikasi atau berstatus dipertanyakan.
              Kutipan langsung harus sesuai dengan sumbernya.
            </p>
          </div>
        </section>

        {/* Keberimbangan */}
        <section aria-labelledby="keberimbangan" className="border-t border-verity-rule py-8">
          <h2 id="keberimbangan" className="font-serif text-[1.35rem] font-semibold text-verity-ink">
            Keberimbangan
          </h2>
          <p className="mt-4 font-serif text-[1.02rem] leading-[1.78] text-verity-ink">
            Pihak yang dapat dirugikan oleh sebuah pemberitaan diberi kesempatan menanggapi
            sebelum artikel dimuat. Bila tanggapan belum diperoleh meski upaya verifikasi telah
            dilakukan, artikel menjelaskan upaya yang sudah ditempuh redaksi secara terbuka.
          </p>
        </section>

        {/* Kebijakan AI */}
        <section aria-labelledby="kebijakan-ai" className="border-t border-verity-rule py-8">
          <h2 id="kebijakan-ai" className="font-serif text-[1.35rem] font-semibold text-verity-ink">
            Kebijakan AI
          </h2>
          <p className="mt-4 font-serif text-[1.02rem] leading-[1.78] text-verity-ink">
            Setiap naskah mencatat tingkat keterlibatan AI dalam tiga tingkat:
          </p>
          <dl className="mt-4">
            {AI_LEVELS.map((level) => (
              <div key={level.name} className="border-t border-verity-rule py-3 last:border-b">
                <dt className="font-serif text-[1rem] font-medium text-verity-ink">{level.name}</dt>
                <dd className="mt-1 font-serif text-[0.95rem] leading-relaxed text-verity-ink-soft">
                  {level.description}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 space-y-4 font-serif text-[1.02rem] leading-[1.78] text-verity-ink">
            <p>
              Tidak ada publikasi otomatis: AI, klien API, maupun penjadwal tidak dapat menerbitkan
              naskah apa pun tanpa keputusan manusia. AI tidak pernah dijadikan sumber fakta.
            </p>
            <p>
              Agen AI eksternal hanya dapat mengirim draf melalui API internal Verax Press — tanpa hak
              menyetujui atau menerbitkan naskah.
            </p>
          </div>
        </section>

        {/* Atribusi */}
        <section aria-labelledby="atribusi" className="border-t border-verity-rule py-8">
          <h2 id="atribusi" className="font-serif text-[1.35rem] font-semibold text-verity-ink">
            Atribusi
          </h2>
          <p className="mt-4 font-serif text-[1.02rem] leading-[1.78] text-verity-ink">
            Kredit pada artikel memakai bentuk yang jelas: “Oleh” untuk penulis naskah, “Dilaporkan
            oleh” untuk pelaporan lapangan, “Disunting oleh” untuk editor penanggung jawab, dan
            “Redaksi Verax Press” untuk karya kolektif newsroom. Byline “Redaksi Verax Press” hanya digunakan
            untuk karya newsroom yang benar-benar disunting manusia.
          </p>
        </section>

        {/* Koreksi & hak jawab */}
        <section aria-labelledby="koreksi-hak-jawab" className="border-t border-verity-rule py-8">
          <h2 id="koreksi-hak-jawab" className="font-serif text-[1.35rem] font-semibold text-verity-ink">
            Koreksi &amp; hak jawab
          </h2>
          <p className="mt-4 font-serif text-[1.02rem] leading-[1.78] text-verity-ink">
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
          <p className="mt-4 font-serif text-[1.02rem] leading-[1.78] text-verity-ink">
            Tenggat operasional penanganan permohonan sedang dalam kajian hukum, sehingga halaman
            ini tidak menetapkan jumlah hari tertentu.
          </p>
        </section>

        {/* Catatan bawah */}
        <p className="border-t border-verity-rule pt-4 font-mono text-[11px] leading-relaxed text-verity-ink-faint">
          Ringkasan ini adalah versi publik dari kebijakan internal redaksi.
        </p>
      </div>
    </div>
  );
}

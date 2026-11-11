// Hak jawab, hak koreksi, dan keluhan: /keluhan — penjelasan kebijakan + formulir (client).
// TANPA janji jumlah hari (tenggat operasional masih kajian hukum — worklog §3).
import type { Metadata } from "next";
import Link from "next/link";
import { ComplaintForm } from "@/components/site/complaint-form";

export const metadata: Metadata = {
  title: "Hak Jawab, Hak Koreksi, dan Keluhan",
  description:
    "Formulir permohonan hak jawab, hak koreksi, keluhan editorial, dan permintaan penurunan konten Verax Press.",
};

const COMPLAINT_EXPLANATIONS = [
  {
    title: "Hak Jawab",
    desc: "Hak seseorang atau sekelompok orang untuk memberikan tanggapan atau sanggahan terhadap pemberitaan berupa fakta yang merugikan nama baiknya.",
  },
  {
    title: "Hak Koreksi",
    desc: "Hak setiap orang untuk mengoreksi atau membetulkan kekeliruan informasi yang diberitakan, baik mengenai dirinya maupun mengenai orang lain.",
  },
  {
    title: "Keluhan Editorial",
    desc: "Keberatan pembaca atas dugaan pelanggaran kode etik jurnalistik, standar penulisan, atau metodologi verifikasi dalam karya terbit.",
  },
  {
    title: "Permintaan Penurunan",
    desc: "Permohonan pengarsipan atau pencabutan naskah berdasarkan pertimbangan hukum material atau keselamatan jiwa pihak terkait.",
  },
];

export default function ComplaintPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="border-b-2 border-verity-ink pb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-verity-accent">
          Layanan Publik &amp; Pembaca
        </p>
        <h1 className="mt-3 font-serif text-[2.2rem] font-semibold leading-[1.08] tracking-[-0.012em] text-verity-ink sm:text-[2.8rem]">
          Hak Jawab, Hak Koreksi, dan Keluhan
        </h1>
        <p className="mt-4 max-w-3xl font-serif text-[1.1rem] leading-[1.7] text-verity-ink-soft">
          Verax Press menjamin hak pembaca dan subjek pemberitaan untuk menanggapi, mengoreksi,
          atau mempersoalkan setiap karya jurnalistik yang kami terbitkan. Transparansi atas
          kekeliruan adalah bagian dari pertanggungjawaban publik kami.
        </p>
      </header>

      {/* Grid Utama 2 Kolom di Desktop (lg:) */}
      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1.35fr)_22rem] lg:gap-14">
        {/* Kolom Kiri: Formulir Pengajuan */}
        <section aria-label="Formulir permohonan" className="min-w-0">
          <div className="border border-verity-rule bg-verity-paper-soft p-6 sm:p-8">
            <h2 className="font-serif text-[1.35rem] font-semibold text-verity-ink">
              Kirimkan Permohonan
            </h2>
            <p className="mt-2 font-serif text-[0.92rem] leading-relaxed text-verity-ink-soft">
              Isi data berikut dengan jelas. Anda akan menerima nomor registrasi antrean unik untuk
              melacak proses penelaahan redaksi.
            </p>
            <div className="mt-6 border-t border-verity-rule pt-6">
              <ComplaintForm />
            </div>
          </div>
        </section>

        {/* Kolom Kanan: Panduan & Informasi Proses */}
        <aside aria-label="Panduan dan prosedur" className="space-y-8 lg:border-l lg:border-verity-rule lg:pl-8">
          {/* Klasifikasi Permohonan */}
          <div>
            <h2 className="font-sans text-[0.8rem] font-semibold uppercase tracking-[0.2em] text-verity-ink">
              Klasifikasi Permohonan
            </h2>
            <dl className="mt-4 space-y-4">
              {COMPLAINT_EXPLANATIONS.map((item) => (
                <div key={item.title} className="border-b border-verity-rule pb-3.5 last:border-b-0">
                  <dt className="font-serif text-[1rem] font-medium text-verity-ink">{item.title}</dt>
                  <dd className="mt-1 font-serif text-[0.88rem] leading-relaxed text-verity-ink-soft">
                    {item.desc}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Prosedur Penanganan Redaksi */}
          <div className="border border-verity-rule bg-verity-paper-soft p-5">
            <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-verity-ink">
              Prosedur Penanganan
            </h3>
            <ol className="mt-3 space-y-2.5 font-serif text-[0.88rem] leading-relaxed text-verity-ink-soft">
              <li className="flex gap-2">
                <span className="font-mono text-xs font-semibold text-verity-ink">1.</span>
                <span>Pencatatan resmi ke register pengaduan redaksi beserta nomor antrean.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs font-semibold text-verity-ink">2.</span>
                <span>Verifikasi silang fakta dan dokumen pendukung oleh editor penanggung jawab.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs font-semibold text-verity-ink">3.</span>
                <span>Tindak lanjut terbuka: catatan koreksi publik, pemuatan hak jawab, atau penolakan tertulis.</span>
              </li>
            </ol>
            <p className="mt-4 border-t border-verity-rule pt-3 font-mono text-[10px] leading-relaxed text-verity-ink-faint">
              Tenggat operasional penanganan sedang dalam kajian hukum agar kepatuhan dan keadilan proses terjamin.
            </p>
          </div>

          {/* Rujukan Standar Editorial */}
          <div>
            <p className="font-serif text-[0.92rem] leading-relaxed text-verity-ink-soft">
              Pelajari komitmen transparansi, metodologi sumber, dan panduan kode etik lengkap kami di halaman{" "}
              <Link
                href="/standar-editorial"
                className="text-verity-accent underline underline-offset-4 hover:text-verity-accent-deep"
              >
                Standar Editorial
              </Link>
              .
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

// Hak jawab, hak koreksi, dan keluhan: /keluhan — penjelasan kebijakan + formulir (client).
// TANPA janji jumlah hari (tenggat operasional masih kajian hukum — worklog §3).
import type { Metadata } from "next";
import { ComplaintForm } from "@/components/site/complaint-form";

export const metadata: Metadata = {
  title: "Hak Jawab, Hak Koreksi, dan Keluhan",
  description:
    "Formulir permohonan hak jawab, hak koreksi, keluhan editorial, dan permintaan penurunan konten Verax Press.",
};

export default function ComplaintPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="max-w-3xl border-b border-verity-rule pb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-verity-ink-soft">
          Hak Jawab &amp; Keluhan
        </p>
        <h1 className="mt-3 font-serif text-[2rem] font-semibold leading-[1.12] tracking-[-0.01em] text-verity-ink">
          Hak Jawab, Hak Koreksi, dan Keluhan
        </h1>
        <div className="mt-4 space-y-4 font-serif text-[1.02rem] leading-[1.78]">
          <p className="text-verity-ink">
            Formulir ini melayani empat jenis permohonan: <strong>Hak Jawab</strong> untuk tanggapan
            atas pemberitaan yang dipersoalkan, <strong>Hak Koreksi</strong> untuk permintaan
            perbaikan kesalahan material, <strong>Keluhan</strong> untuk keberatan atas praktik
            editorial, dan <strong>Permintaan Penurunan</strong> untuk permohonan penurunan konten.
          </p>
          <p className="text-verity-ink-soft">
            Setiap permohonan dicatat pada register keluhan redaksi dengan nomor antrean yang dapat
            Anda simpan untuk penelusuran. Tenggat operasional penanganan masih dalam kajian
            hukum, sehingga kami tidak menjanjikan jumlah hari tertentu. Data yang Anda kirim
            hanya digunakan untuk menindaklanjuti permohonan ini.
          </p>
        </div>
      </header>

      <section aria-label="Formulir permohonan" className="max-w-2xl pt-8">
        <ComplaintForm />
      </section>
    </div>
  );
}

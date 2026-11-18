// Komponen gabungan formulir dan pelacakan status keluhan/hak jawab (client).
// Menyediakan navigasi tab antara 'Kirimkan Permohonan' dan 'Lacak Status Permohonan'.
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ComplaintForm } from "@/components/site/complaint-form";
import { ComplaintTracker } from "@/components/site/complaint-tracker";

export function ComplaintSection() {
  const searchParams = useSearchParams();
  const initialRef = searchParams.get("ref") || searchParams.get("refCode") || "";
  const initialTab = searchParams.get("tab") === "lacak" || initialRef ? "lacak" : "kirim";

  const [activeTab, setActiveTab] = useState<"kirim" | "lacak">(initialTab);
  const [trackCode, setTrackCode] = useState(initialRef);

  useEffect(() => {
    if (initialRef) {
      setTrackCode(initialRef);
      setActiveTab("lacak");
    }
  }, [initialRef]);

  function handleTrackFromForm(refCode: string) {
    setTrackCode(refCode);
    setActiveTab("lacak");
  }

  return (
    <div className="border border-verity-rule bg-verity-paper-soft">
      {/* Tab Header */}
      <div className="flex border-b border-verity-rule bg-verity-paper">
        <button
          type="button"
          onClick={() => setActiveTab("kirim")}
          className={`flex-1 border-b-2 px-4 py-4 text-center font-serif text-[1rem] font-medium transition-colors sm:px-6 sm:text-[1.05rem] ${
            activeTab === "kirim"
              ? "border-verity-ink bg-verity-paper-soft font-semibold text-verity-ink"
              : "border-transparent text-verity-ink-soft hover:bg-verity-paper-soft/50 hover:text-verity-ink"
          }`}
          aria-selected={activeTab === "kirim"}
          role="tab"
        >
          Kirimkan Permohonan
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("lacak")}
          className={`flex-1 border-b-2 px-4 py-4 text-center font-serif text-[1rem] font-medium transition-colors sm:px-6 sm:text-[1.05rem] ${
            activeTab === "lacak"
              ? "border-verity-ink bg-verity-paper-soft font-semibold text-verity-ink"
              : "border-transparent text-verity-ink-soft hover:bg-verity-paper-soft/50 hover:text-verity-ink"
          }`}
          aria-selected={activeTab === "lacak"}
          role="tab"
        >
          Lacak Status Permohonan
        </button>
      </div>

      {/* Tab Body */}
      <div className="p-6 sm:p-8">
        {activeTab === "kirim" ? (
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-[1.35rem] font-semibold text-verity-ink">
                Kirimkan Permohonan
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab("lacak")}
                className="font-mono text-[12px] text-verity-accent hover:underline"
              >
                Sudah memiliki nomor antrean? Lacak status &rarr;
              </button>
            </div>
            <p className="mt-2 font-serif text-[0.92rem] leading-relaxed text-verity-ink-soft">
              Isi data berikut dengan jelas. Anda akan menerima nomor registrasi antrean unik untuk
              melacak proses penelaahan redaksi secara berkala.
            </p>
            <div className="mt-6 border-t border-verity-rule pt-6">
              <ComplaintForm onTrack={handleTrackFromForm} />
            </div>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-[1.35rem] font-semibold text-verity-ink">
                Lacak Status Permohonan
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab("kirim")}
                className="font-mono text-[12px] text-verity-accent hover:underline"
              >
                Ingin mengajukan permohonan baru? Formulir &rarr;
              </button>
            </div>
            <p className="mt-2 font-serif text-[0.92rem] leading-relaxed text-verity-ink-soft">
              Masukkan nomor registrasi antrean resmi yang Anda peroleh saat mengirimkan permohonan untuk memeriksa perkembangan penelaahan meja redaksi.
            </p>
            <div className="mt-6 border-t border-verity-rule pt-6">
              <ComplaintTracker initialRefCode={trackCode} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

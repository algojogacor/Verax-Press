// Komponen pelacak status aduan / hak jawab publik (client).
// Mencari status via GET /api/public/complaints/status?refCode=...
// Menampilkan status, jenis, waktu terima, dan keputusan redaksi secara transparan tanpa membocorkan data pribadi.
"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/format";

export interface ComplaintTrackingData {
  refCode: string;
  type: string;
  typeLabel: string;
  status: "RECEIVED" | "IN_REVIEW" | "RESOLVED" | "REJECTED" | string;
  statusLabel: string;
  receivedAt: string;
  decidedAt: string | null;
  decisionNote: string | null;
  article: {
    title: string;
    slug: string;
  } | null;
}

const STATUS_DESCRIPTIONS: Record<string, string> = {
  RECEIVED: "Permohonan telah tercatat resmi dalam register meja redaksi dan berada dalam antrean telaah awal.",
  IN_REVIEW: "Fakta dan materi sanggahan sedang diverifikasi silang dengan dokumen sumber oleh editor penanggung jawab.",
  RESOLVED: "Penelaahan redaksi telah selesai dan keputusan tindak lanjut telah ditetapkan.",
  REJECTED: "Permohonan tidak dapat ditindaklanjuti berdasarkan pertimbangan standar editorial atau ketiadaan bukti pendukung.",
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  RECEIVED: "border-verity-rule bg-verity-paper text-verity-ink",
  IN_REVIEW: "border-amber-600/40 bg-amber-500/10 text-amber-900 dark:text-amber-200",
  RESOLVED: "border-emerald-600/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
  REJECTED: "border-verity-accent/40 bg-verity-accent/10 text-verity-accent",
};

interface ComplaintTrackerProps {
  initialRefCode?: string;
}

export function ComplaintTracker({ initialRefCode }: ComplaintTrackerProps) {
  const [refCodeInput, setRefCodeInput] = useState(initialRefCode ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ComplaintTrackingData | null>(null);

  async function fetchStatus(code: string) {
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Masukkan nomor antrean terlebih dahulu.");
      return;
    }

    if (!/^KEL-\d{4}-\d+$/i.test(trimmed)) {
      setError("Format nomor antrean harus KEL-YYYY-NNNN (contoh: KEL-2026-0001).");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/public/complaints/status?refCode=${encodeURIComponent(trimmed)}`);
      const body = (await response.json().catch(() => null)) as
        | (ComplaintTrackingData & { error?: string })
        | { error?: string }
        | null;

      if (!response.ok) {
        if (response.status === 404) {
          setError(
            body?.error ??
              "Permohonan dengan nomor antrean tersebut tidak ditemukan. Periksa kembali nomor yang Anda masukkan.",
          );
        } else if (response.status === 429) {
          setError("Terlalu banyak permintaan pelacakan. Silakan tunggu beberapa saat sebelum mencoba kembali.");
        } else {
          setError(body?.error ?? "Gagal memeriksa status permohonan. Silakan coba kembali nanti.");
        }
        setData(null);
        return;
      }

      setData(body as ComplaintTrackingData);
    } catch {
      setError("Gagal terhubung ke peladen. Periksa koneksi internet Anda lalu coba lagi.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialRefCode && initialRefCode.trim()) {
      setRefCodeInput(initialRefCode.trim());
      fetchStatus(initialRefCode.trim());
    }
  }, [initialRefCode]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    fetchStatus(refCodeInput);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="tracker-ref-code" className="text-[13px] font-medium text-verity-ink">
            Nomor Registrasi Antrean (Reference Code)
          </Label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              id="tracker-ref-code"
              value={refCodeInput}
              onChange={(e) => {
                setRefCodeInput(e.target.value.toUpperCase());
                if (error) setError(null);
              }}
              placeholder="Contoh: KEL-2026-0001"
              className="h-11 bg-card font-mono text-[14px] uppercase tracking-wider"
              autoComplete="off"
              spellCheck={false}
            />
            <Button
              type="submit"
              disabled={loading}
              className="h-11 shrink-0 rounded-xs bg-verity-ink px-6 font-medium text-verity-paper transition-colors hover:bg-black"
            >
              {loading ? "Memeriksa…" : "Lacak Permohonan"}
            </Button>
          </div>
          <p className="font-serif text-[12px] text-verity-ink-faint">
            Nomor ini tercantum saat permohonan berhasil dikirimkan ke meja redaksi.
          </p>
        </div>
      </form>

      {error ? (
        <div
          role="alert"
          className="border-l-2 border-verity-accent bg-verity-paper-soft px-4 py-3 font-serif text-[0.95rem] leading-relaxed text-verity-accent"
        >
          {error}
        </div>
      ) : null}

      {data ? (
        <div
          role="status"
          aria-live="polite"
          className="border border-verity-rule bg-verity-paper-soft p-6 sm:p-7"
        >
          {/* Header Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-verity-rule pb-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-verity-ink-faint">
                Nomor Antrean
              </p>
              <p className="mt-1 font-mono text-[1.4rem] font-medium tracking-[0.05em] text-verity-ink">
                {data.refCode}
              </p>
            </div>
            <div className="text-right">
              <span
                className={`inline-block border px-3 py-1 font-mono text-[12px] font-medium uppercase tracking-[0.08em] ${
                  STATUS_BADGE_CLASSES[data.status] ?? STATUS_BADGE_CLASSES.RECEIVED
                }`}
              >
                {data.statusLabel}
              </span>
            </div>
          </div>

          {/* Deskripsi Tahap Penanganan */}
          <div className="mt-4 border-b border-verity-rule pb-4">
            <p className="font-serif text-[0.95rem] leading-relaxed text-verity-ink">
              {STATUS_DESCRIPTIONS[data.status] ?? "Permohonan dalam proses penanganan meja redaksi."}
            </p>
          </div>

          {/* Informasi Rinci */}
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-verity-ink-faint">
                Jenis Permohonan
              </dt>
              <dd className="mt-1 font-serif text-[0.95rem] font-medium text-verity-ink">
                {data.typeLabel}
              </dd>
            </div>

            <div>
              <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-verity-ink-faint">
                Tanggal Diterima
              </dt>
              <dd className="mt-1 font-serif text-[0.95rem] text-verity-ink">
                {formatDateTime(data.receivedAt)}
              </dd>
            </div>

            {data.article ? (
              <div className="sm:col-span-2">
                <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-verity-ink-faint">
                  Artikel Terkait
                </dt>
                <dd className="mt-1 font-serif text-[0.95rem]">
                  <Link
                    href={`/artikel/${data.article.slug}`}
                    className="text-verity-accent underline underline-offset-4 hover:text-verity-accent-deep"
                  >
                    {data.article.title}
                  </Link>
                </dd>
              </div>
            ) : null}
          </dl>

          {/* Catatan Keputusan / Tindak Lanjut Redaksi */}
          {data.decisionNote ? (
            <div className="mt-6 border-l-2 border-verity-ink bg-verity-paper p-4">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-verity-ink">
                Tindak Lanjut &amp; Catatan Redaksi
              </p>
              <p className="mt-2 font-serif text-[0.95rem] leading-relaxed text-verity-ink">
                {data.decisionNote}
              </p>
              {data.decidedAt ? (
                <p className="mt-3 font-mono text-[11px] text-verity-ink-faint">
                  Ditetapkan pada: {formatDateTime(data.decidedAt)}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Catatan Privasi Pelapor */}
          <p className="mt-6 border-t border-verity-rule pt-4 font-mono text-[11px] leading-relaxed text-verity-ink-faint">
            Catatan: Untuk melindungi privasi pemohon, identitas pengirim dan uraian lengkap pesan tidak ditampilkan pada pelacakan publik ini.
          </p>
        </div>
      ) : null}
    </div>
  );
}

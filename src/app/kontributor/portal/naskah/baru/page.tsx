"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, PenSquare, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDesks } from "@/components/studio/desks";

const ALLOWED_FORMATS = [
  { value: "OPINION", label: "Opini (Analisis & Gagasan Terargumentasi)" },
  { value: "ANALYSIS", label: "Analisis Mendalam (Kajian Berbasis Data & Kebijakan)" },
  { value: "EXPLAINER", label: "Penjelas (Kontekstualisasi Isu Kompleks)" },
  { value: "FEATURE", label: "Kisah Khas (Narasi Kemanusiaan & Dampak Nyata)" },
  { value: "INTERVIEW", label: "Wawancara (Tanya Jawab Terstruktur)" },
];

const AI_INVOLVEMENT_OPTIONS = [
  { value: "none", label: "Tanpa Bantuan AI (Ditulis Sepenuhnya oleh Manusia)" },
  { value: "assistive", label: "Asistif (Pengecekan Tata Bahasa / Riset Awal)" },
  { value: "substantive", label: "Substantif (Penyusunan Sebagian Draf oleh AI)" },
];

export default function NewContributorArticlePage() {
  const router = useRouter();
  const { data: desks, isLoading: desksLoading } = useDesks();

  const [title, setTitle] = useState("");
  const [deck, setDeck] = useState("");
  const [deskSlug, setDeskSlug] = useState("");
  const [format, setFormat] = useState("OPINION");
  const [aiInvolvement, setAiInvolvement] = useState("none");
  const [initialBody, setInitialBody] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (title.trim().length < 5) {
      setError("Judul naskah minimal 5 karakter.");
      return;
    }

    if (!deskSlug) {
      setError("Pilih salah satu desk redaksi.");
      return;
    }

    // Konversi initialBody menjadi content block-JSON sederhana jika diisi
    const contentBlocks = initialBody.trim()
      ? initialBody
          .split("\n\n")
          .map((p) => p.trim())
          .filter(Boolean)
          .map((text) => ({
            type: "paragraph",
            text,
          }))
      : [];

    setSubmitting(true);
    try {
      const res = await fetch("/api/contributor/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          deck: deck.trim() || undefined,
          deskSlug,
          format,
          aiInvolvement,
          content: contentBlocks,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat draf naskah.");
      }

      router.push(`/kontributor/portal/naskah/${data.id}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Terjadi kesalahan saat menyimpan naskah.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-verity-rule pb-4">
        <Link
          href="/kontributor/portal"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-verity-ink-soft hover:text-verity-accent"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Kembali ke Naskah Saya</span>
        </Link>
        <span className="font-mono text-xs uppercase tracking-wider text-verity-accent">
          Draf Baru
        </span>
      </div>

      <div className="bg-card border border-verity-rule rounded-xs p-6 sm:p-8">
        <div className="border-b border-verity-rule pb-5 mb-6">
          <div className="w-10 h-10 rounded-xs border border-verity-rule bg-verity-paper-soft text-verity-ink flex items-center justify-center mb-3">
            <PenSquare className="w-5 h-5 text-verity-accent" aria-hidden="true" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-verity-ink">
            Tulis Naskah Kontributor Baru
          </h1>
          <p className="text-xs text-verity-ink-soft mt-1">
            Naskah dimulai sebagai Draf mandiri. Anda dapat melengkapi rujukan fakta sebelum
            mengajukannya ke meja redaksi.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xs bg-verity-disputed/10 border border-verity-disputed/40 flex items-start gap-3 text-verity-disputed text-xs"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="article-title"
              className="block text-xs font-mono uppercase tracking-wider text-verity-ink-soft mb-1.5"
            >
              Judul Naskah *
            </label>
            <Input
              id="article-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul yang lugas, faktual, dan mencerminkan pokok bahasan"
              className="bg-verity-paper/40 font-serif text-lg py-2"
            />
            <p className="text-[11px] text-verity-ink-soft mt-1">
              Minimal 5 karakter, maksimal 200 karakter.
            </p>
          </div>

          <div>
            <label
              htmlFor="article-deck"
              className="block text-xs font-mono uppercase tracking-wider text-verity-ink-soft mb-1.5"
            >
              Ringkasan Gagasan (Deck / Subjudul)
            </label>
            <Textarea
              id="article-deck"
              rows={2}
              value={deck}
              onChange={(e) => setDeck(e.target.value)}
              placeholder="1 sampai 2 kalimat pengantar yang merangkum inti tesis atau temuan tulisan"
              className="bg-verity-paper/40 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="article-desk"
                className="block text-xs font-mono uppercase tracking-wider text-verity-ink-soft mb-1.5"
              >
                Rubrik / Desk *
              </label>
              <Select value={deskSlug} onValueChange={setDeskSlug} required>
                <SelectTrigger id="article-desk" className="bg-verity-paper/40 font-mono text-xs">
                  <SelectValue placeholder={desksLoading ? "Memuat rubrik…" : "Pilih rubrik…"} />
                </SelectTrigger>
                <SelectContent>
                  {desks?.map((desk) => (
                    <SelectItem key={desk.slug} value={desk.slug} className="text-xs font-mono">
                      {desk.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label
                htmlFor="article-format"
                className="block text-xs font-mono uppercase tracking-wider text-verity-ink-soft mb-1.5"
              >
                Format Naskah *
              </label>
              <Select value={format} onValueChange={setFormat} required>
                <SelectTrigger id="article-format" className="bg-verity-paper/40 font-mono text-xs">
                  <SelectValue placeholder="Pilih format naskah…" />
                </SelectTrigger>
                <SelectContent>
                  {ALLOWED_FORMATS.map((item) => (
                    <SelectItem key={item.value} value={item.value} className="text-xs font-mono">
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-verity-ink-soft mt-1">
                Format Berita Harian (NEWS) dikhususkan untuk redaksi tetap.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="article-ai"
              className="block text-xs font-mono uppercase tracking-wider text-verity-ink-soft mb-1.5"
            >
              Deklarasi Keterlibatan AI *
            </label>
            <Select value={aiInvolvement} onValueChange={setAiInvolvement}>
              <SelectTrigger id="article-ai" className="bg-verity-paper/40 font-mono text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_INVOLVEMENT_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value} className="text-xs font-mono">
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-verity-ink-soft mt-1">
              Verax Press mewajibkan transparansi penuh atas penggunaan alat bantu berbasis AI.
            </p>
          </div>

          <div>
            <label
              htmlFor="article-body"
              className="block text-xs font-mono uppercase tracking-wider text-verity-ink-soft mb-1.5"
            >
              Draf Awal / Paragraf Pembuka
            </label>
            <Textarea
              id="article-body"
              rows={8}
              value={initialBody}
              onChange={(e) => setInitialBody(e.target.value)}
              placeholder="Tulis draf awal tulisan Anda di sini. Pisahkan antarparagraf dengan satu baris kosong. Anda dapat menyunting dan melengkapi isi naskah serta rujukan setelah draf dibuat."
              className="bg-verity-paper/40 font-serif leading-relaxed text-sm"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-verity-ink text-verity-paper hover:bg-verity-accent font-mono text-xs uppercase tracking-wider py-2.5"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Menyimpan Draf…
                </span>
              ) : (
                "Simpan Draf & Lanjutkan ke Editor"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Formulir permohonan kontributor eksternal (sisi klien).
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VeraxMark } from "@/components/site/verax-mark";
import { VeraxWordmark } from "@/components/site/verax-wordmark";

export function ContributorApplicationClient() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [sampleArticle, setSampleArticle] = useState("");
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!adultConfirmed) {
      setError("Anda wajib menyatakan berusia minimal 18 tahun untuk mengajukan permohonan.");
      return;
    }

    if (!guidelinesAccepted) {
      setError("Anda wajib menyetujui Pedoman Kontributor Verax Press.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/contributor/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          bio: bio.trim() || undefined,
          interests: interests.trim() || undefined,
          portfolioUrl: portfolioUrl.trim() || undefined,
          sampleArticle: sampleArticle.trim() || undefined,
          adultConfirmed,
          guidelinesAccepted,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengirim permohonan.");
      }

      setSuccess(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Terjadi kesalahan sistem saat mengirim data.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-verity-paper text-verity-ink flex flex-col justify-between">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-verity-ink focus:text-verity-paper focus:px-3 focus:py-2 focus:font-mono focus:text-xs"
      >
        Lewati ke konten utama
      </a>

      <header className="border-b border-verity-rule py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-verity-ink transition-colors hover:text-verity-accent focus-visible:outline-2 focus-visible:outline-verity-accent"
          >
            <VeraxMark className="size-6 shrink-0 sm:size-7" />
            <VeraxWordmark className="h-[1.45rem] w-auto sm:h-[1.6rem]" />
            <span className="sr-only">Verax Press</span>
          </Link>
          <Link
            href="/pedoman-kontributor"
            className="text-xs font-mono text-verity-ink-soft hover:text-verity-accent inline-flex items-center gap-1 whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Kembali ke Pedoman
          </Link>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1 max-w-2xl mx-auto w-full px-6 py-12 outline-none">
        {success ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xs border border-verity-verified/40 bg-card p-8 text-center space-y-4"
          >
            <div className="w-12 h-12 rounded-xs border border-verity-verified/30 bg-verity-verified/10 text-verity-verified flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-verity-ink">
              Permohonan Berhasil Dikirim
            </h1>
            <p className="text-sm text-verity-ink-soft leading-relaxed max-w-md mx-auto">
              Terima kasih atas minat Anda berkontribusi untuk Verax Press. Pemimpin Redaksi kami
              akan meninjau permohonan dan portofolio Anda. Jika disetujui, tautan aktivasi akun
              akan dikirimkan ke alamat email <strong className="text-verity-ink">{email}</strong>.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" asChild>
                <Link href="/">Kembali ke Beranda</Link>
              </Button>
              <Button className="bg-verity-ink text-verity-paper hover:bg-verity-accent" asChild>
                <Link href="/pedoman-kontributor">Baca Standar Penulisan</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-verity-rule rounded-xs p-6 sm:p-8">
            <div className="border-b border-verity-rule pb-5 mb-6">
              <p className="font-mono text-xs uppercase tracking-widest text-verity-accent">
                Pendaftaran Jalur Eksternal
              </p>
              <h1 className="mt-2 font-serif text-3xl font-bold text-verity-ink">
                Pengajuan Kontributor
              </h1>
              <p className="mt-2 text-sm text-verity-ink-soft">
                Lengkapi formulir permohonan berikut dengan cermat. Seluruh data diverifikasi
                langsung oleh Pemimpin Redaksi.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-6 p-4 rounded-xs bg-verity-disputed/10 border border-verity-disputed/40 flex items-start gap-3 text-verity-disputed text-sm"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Pengajuan Belum Dapat Diproses</p>
                  <p className="mt-0.5 text-xs">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-xs font-mono uppercase tracking-wider text-verity-ink-soft mb-1.5">
                  Nama Lengkap *
                </label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Nama lengkap sesuai identitas resmi"
                  className="bg-verity-paper/40"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-mono uppercase tracking-wider text-verity-ink-soft mb-1.5">
                  Alamat Email *
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  spellCheck={false}
                  autoCapitalize="none"
                  placeholder="alamat@domain.com"
                  className="bg-verity-paper/40"
                />
                <p className="text-[11px] text-verity-ink-soft mt-1">
                  Digunakan untuk pemberitahuan status dan pengiriman tautan aktivasi akun.
                </p>
              </div>

              <div>
                <label htmlFor="bio" className="block text-xs font-mono uppercase tracking-wider text-verity-ink-soft mb-1.5">
                  Biografi Singkat
                </label>
                <Textarea
                  id="bio"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Latar belakang pendidikan, keahlian profesi, atau institusi riset"
                  className="bg-verity-paper/40"
                />
              </div>

              <div>
                <label htmlFor="interests" className="block text-xs font-mono uppercase tracking-wider text-verity-ink-soft mb-1.5">
                  Fokus Bidang / Minat Penulisan
                </label>
                <Input
                  id="interests"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="Contoh: Kebijakan Publik, Teknologi, Hukum, Ekonomi"
                  className="bg-verity-paper/40"
                />
              </div>

              <div>
                <label htmlFor="portfolio" className="block text-xs font-mono uppercase tracking-wider text-verity-ink-soft mb-1.5">
                  Tautan Portofolio / Karya Sebelumnya
                </label>
                <Input
                  id="portfolio"
                  type="url"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  spellCheck={false}
                  autoCapitalize="none"
                  placeholder="https://contoh.com/artikel-anda"
                  className="bg-verity-paper/40"
                />
              </div>

              <div>
                <label htmlFor="sample" className="block text-xs font-mono uppercase tracking-wider text-verity-ink-soft mb-1.5">
                  Ringkasan Ide Naskah atau Contoh Tulisan
                </label>
                <Textarea
                  id="sample"
                  rows={4}
                  value={sampleArticle}
                  onChange={(e) => setSampleArticle(e.target.value)}
                  placeholder="Jelaskan topik yang ingin Anda ulas beserta sudut pandang dan sumber rujukan utamanya"
                  className="bg-verity-paper/40"
                />
              </div>

              <div className="border-t border-verity-rule pt-4 space-y-3">
                <label htmlFor="adult-confirmed" className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    id="adult-confirmed"
                    type="checkbox"
                    checked={adultConfirmed}
                    onChange={(e) => setAdultConfirmed(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded-xs border-verity-rule text-verity-accent focus:ring-verity-accent"
                  />
                  <span className="text-xs text-verity-ink leading-relaxed">
                    Saya menyatakan secara jujur bahwa saya telah berusia minimal 18 tahun pada saat
                    pendaftaran ini dibuat.
                  </span>
                </label>

                <label htmlFor="guidelines-accepted" className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    id="guidelines-accepted"
                    type="checkbox"
                    checked={guidelinesAccepted}
                    onChange={(e) => setGuidelinesAccepted(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded-xs border-verity-rule text-verity-accent focus:ring-verity-accent"
                  />
                  <span className="text-xs text-verity-ink leading-relaxed">
                    Saya telah membaca, memahami, dan berkomitmen mematuhi{" "}
                    <Link
                      href="/pedoman-kontributor"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-verity-accent"
                    >
                      Pedoman Kontributor Verax Press
                    </Link>
                    , termasuk larangan plagiarisme dan kewajiban verifikasi rujukan primer.
                  </span>
                </label>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-verity-ink text-verity-paper hover:bg-verity-accent font-mono text-xs uppercase tracking-wider py-2.5"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Mengirim Permohonan…
                  </span>
                ) : (
                  "Kirim Permohonan Kontributor"
                )}
              </Button>
            </form>
          </div>
        )}
      </main>

      <footer className="border-t border-verity-rule py-4 px-6 text-center text-xs text-verity-ink-soft">
        &copy; {new Date().getFullYear()} Verax Press. Seluruh hak cipta dilindungi.
      </footer>
    </div>
  );
}

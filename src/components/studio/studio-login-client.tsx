// Form login staf internal Studio Redaksi (sisi klien).
"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { VeraxMark } from "@/components/site/verax-mark";
import { VeraxWordmark } from "@/components/site/verax-wordmark";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Email atau nama pengguna dan kata sandi tidak cocok dengan data staf terdaftar.");
        return;
      }
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/studio") ? next : "/studio");
    } catch {
      setError("Koneksi ke server otentikasi terputus. Silakan coba beberapa saat lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-verity-paper-soft px-4 py-8 sm:px-6 sm:py-12">
      {/* Masthead Header Ringkas */}
      <div className="mb-8 text-center">
        <VeraxMark className="mx-auto mb-3 size-11 text-verity-ink" />
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.28em] text-verity-ink-soft">
          Ex Fontibus Veritas
        </p>
        <Link
          href="/"
          className="mt-2 inline-flex justify-center text-verity-ink hover:text-verity-accent transition-colors focus-visible:outline-2 focus-visible:outline-verity-accent"
          aria-label="Verax Press, halaman utama"
        >
          <VeraxWordmark className="h-[2.6rem] w-auto sm:h-[2.9rem]" />
          <span className="sr-only">VERAX PRESS</span>
        </Link>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-verity-ink-faint">
          Meja Kerja Redaksi · Studio Internal
        </p>
      </div>

      {/* Wadah Login 2 Kolom di Desktop (md:) */}
      <div className="w-full max-w-4xl border border-verity-rule bg-card shadow-xs grid md:grid-cols-[1.1fr_1fr]">
        {/* Kolom Kiri: Konteks Integritas Newsroom */}
        <div className="flex flex-col justify-between border-b border-verity-rule bg-verity-paper p-6 sm:p-8 md:border-b-0 md:border-r">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-verity-accent" aria-hidden="true" />
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-verity-accent">
                Akses Terbatas Staf
              </p>
            </div>
            <h2 className="mt-3 font-serif text-[1.45rem] font-semibold leading-snug text-verity-ink">
              Ruang Kerja Redaksional &amp; Penelaahan
            </h2>
            <p className="mt-3 font-serif text-[0.95rem] leading-relaxed text-verity-ink-soft">
              Studio Redaksi adalah sarana kerja internal bagi wartawan, kurator naskah, dan
              editor penanggung jawab Verax Press.
            </p>

            <ul className="mt-6 space-y-3 font-serif text-[0.9rem] text-verity-ink-soft">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-verity-verified" aria-hidden="true" />
                <span>Alur penelaahan berjenjang hingga persetujuan akhir Pemimpin Redaksi</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-verity-verified" aria-hidden="true" />
                <span>Pencatatan dan verifikasi sumber primer sebelum artikel terbit</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-verity-verified" aria-hidden="true" />
                <span>Jejak audit permanen atas seluruh perubahan naskah</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 border-t border-verity-rule pt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-verity-ink-soft underline-offset-4 hover:text-verity-accent hover:underline"
            >
              ← Kembali ke situs publik
            </Link>
          </div>
        </div>

        {/* Kolom Kanan: Formulir Masuk */}
        <div className="flex flex-col justify-center p-6 sm:p-8 bg-card">
          <h1 className="font-serif text-[1.4rem] font-semibold text-verity-ink">
            Masuk ke Studio
          </h1>
          <p className="mt-1 font-serif text-[0.9rem] text-verity-ink-soft">
            Masukkan email redaksi atau nama pengguna dan kata sandi Anda.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] font-medium text-verity-ink">
                Email atau Nama Pengguna Redaksi
              </Label>
              <Input
                id="email"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="nama@redaksi.example atau nama pengguna"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={submitting}
                className="h-11 bg-card"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[13px] font-medium text-verity-ink">
                Kata Sandi
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={submitting}
                className="h-11 bg-card"
              />
            </div>

            {error ? (
              <Alert variant="destructive" className="border-l-2 border-verity-accent bg-verity-paper-soft text-verity-accent rounded-xs">
                <AlertDescription className="font-serif text-[0.88rem] leading-relaxed text-verity-accent">
                  {error}
                </AlertDescription>
              </Alert>
            ) : null}

            <Button
              type="submit"
              className="h-11 w-full rounded-xs bg-verity-ink font-medium tracking-wide text-verity-paper transition-colors hover:bg-black focus-visible:outline-2 focus-visible:outline-verity-accent"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  <span>Memverifikasi kredensial…</span>
                </>
              ) : (
                "Masuk ke Meja Kerja"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center font-mono text-[10px] text-verity-ink-faint">
            Akses diaudit untuk memastikan akuntabilitas jurnalisme.
          </p>
        </div>
      </div>
    </div>
  );
}

export function StudioLoginClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-verity-paper-soft">
          <Loader2 className="size-6 animate-spin text-verity-ink-faint" aria-label="Memuat Studio Redaksi" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

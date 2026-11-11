"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Loader2, PenTool, CheckCircle2 } from "lucide-react";

function ContributorLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await signIn("credentials", {
        email: identifier.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(
          "Nama pengguna/email atau kata sandi tidak cocok, atau akun kontributor Anda dinonaktifkan."
        );
        return;
      }

      const session = await getSession();
      const redirectTarget = searchParams.get("next");

      if (session?.user?.accountType === "STAFF") {
        router.push(redirectTarget && redirectTarget.startsWith("/studio") ? redirectTarget : "/studio");
      } else {
        router.push(
          redirectTarget && redirectTarget.startsWith("/kontributor/portal")
            ? redirectTarget
            : "/kontributor/portal"
        );
      }
    } catch {
      setError("Gagal menghubungi server otentikasi. Silakan coba kembali.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-verity-paper-soft px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8 text-center">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.28em] text-verity-ink-soft">
          Ex Fontibus Veritas
        </p>
        <Link
          href="/"
          className="mt-1.5 block font-serif text-[2.2rem] font-semibold tracking-[0.2em] text-verity-ink hover:text-verity-accent transition-colors"
        >
          VERAX PRESS
        </Link>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-verity-ink-faint">
          Portal Penulis Kontributor Eksternal
        </p>
      </div>

      <div className="w-full max-w-4xl border border-verity-rule bg-card shadow-xs grid md:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col justify-between border-b border-verity-rule bg-verity-paper p-6 sm:p-8 md:border-b-0 md:border-r">
          <div>
            <div className="flex items-center gap-2">
              <PenTool className="size-4 text-verity-accent" aria-hidden="true" />
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-verity-accent">
                Ruang Kerja Kontributor
              </p>
            </div>
            <h2 className="mt-3 font-serif text-[1.45rem] font-semibold leading-snug text-verity-ink">
              Kanal Penulisan Mandiri Terkurasi
            </h2>
            <p className="mt-3 font-serif text-[0.95rem] leading-relaxed text-verity-ink-soft">
              Portal Kontributor dirancang bagi penulis independen untuk menyusun draf,
              melampirkan rujukan fakta primer, dan mengajukan naskah ke meja redaksi.
            </p>

            <ul className="mt-6 space-y-3 font-serif text-[0.9rem] text-verity-ink-soft">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-verity-verified" aria-hidden="true" />
                <span>Format tulisan: Opini, Analisis, Explainer, Feature, Wawancara</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-verity-verified" aria-hidden="true" />
                <span>Pelacakan status penelaahan dan catatan revisi editorial secara langsung</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-verity-verified" aria-hidden="true" />
                <span>Hak penarikan naskah mandiri selama proses telaah belum disetujui</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 border-t border-verity-rule pt-4 text-xs text-verity-ink-soft">
            <p>
              Belum terdaftar sebagai kontributor?{" "}
              <Link href="/kontributor/daftar" className="text-verity-accent underline hover:text-verity-ink font-medium">
                Ajukan permohonan kontributor
              </Link>
            </p>
            <p className="mt-1">
              Staf redaksi internal?{" "}
              <Link href="/studio/login" className="text-verity-ink hover:underline">
                Masuk ke Studio CMS
              </Link>
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center p-6 sm:p-8">
          <h1 className="font-serif text-2xl font-bold text-verity-ink">
            Masuk Portal
          </h1>
          <p className="mt-1 text-xs text-verity-ink-soft font-mono">
            Gunakan nama pengguna atau email kontributor Anda
          </p>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-900 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-verity-ink-soft mb-1.5">
                Email atau Nama Pengguna
              </label>
              <Input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="nama_pengguna atau email"
                className="bg-verity-paper/40 font-mono text-sm"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-verity-ink-soft mb-1.5">
                Kata Sandi
              </label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kata sandi akun Anda"
                className="bg-verity-paper/40 font-mono text-sm"
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-verity-ink text-white hover:bg-verity-accent font-mono text-xs uppercase tracking-wider py-2.5 mt-2"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memverifikasi...
                </span>
              ) : (
                "Masuk ke Portal Kontributor"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ContributorLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-verity-paper-soft" />}>
      <ContributorLoginForm />
    </Suspense>
  );
}

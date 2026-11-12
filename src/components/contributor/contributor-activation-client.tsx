// Halaman aktivasi akun kontributor eksternal (sisi klien).
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, AlertCircle, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VeraxMark } from "@/components/site/verax-mark";
import { VeraxWordmark } from "@/components/site/verax-wordmark";

interface InvitationData {
  name: string;
  email: string;
  expiresAt: string;
}

export function ContributorActivationClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function verifyToken() {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/contributor/invitations/${token}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Tautan aktivasi tidak valid atau telah kedaluwarsa.");
        }
        setInvitation(data.invitation);
        setError(null);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Gagal memvalidasi tautan aktivasi.");
        }
      } finally {
        setLoading(false);
      }
    }
    void verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      setSubmitError("Nama pengguna minimal 3 karakter.");
      return;
    }

    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      setSubmitError("Nama pengguna hanya boleh memuat huruf kecil, angka, dan garis bawah (_).");
      return;
    }

    if (password.length < 8) {
      setSubmitError("Kata sandi harus terdiri dari minimal 8 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/public/contributor/invitations/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUsername,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengaktifkan akun kontributor.");
      }

      setSuccess(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError("Terjadi galat saat memproses aktivasi.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-verity-paper text-verity-ink flex flex-col justify-between">
      <header className="border-b border-verity-rule py-4 px-6 text-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2.5 text-verity-ink transition-colors hover:text-verity-accent focus-visible:outline-2 focus-visible:outline-verity-accent"
        >
          <VeraxMark className="size-7 shrink-0" />
          <VeraxWordmark className="h-[1.6rem] w-auto" />
          <span className="sr-only">Verax Press</span>
        </Link>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-6 py-12 flex flex-col justify-center">
        {loading ? (
          <div className="bg-card border border-verity-rule rounded-xs p-8 text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-verity-ink-soft" aria-hidden="true" />
            <p className="font-serif text-lg font-medium text-verity-ink">
              Memverifikasi Tautan Aktivasi…
            </p>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="bg-card border border-verity-disputed/40 rounded-xs p-8 text-center space-y-4"
          >
            <div className="w-12 h-12 rounded-xs bg-verity-disputed/10 border border-verity-disputed/30 text-verity-disputed flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="font-serif text-xl font-bold text-verity-ink">
              Tautan Tidak Dapat Digunakan
            </h1>
            <p className="text-sm text-verity-disputed leading-relaxed">{error}</p>
            <div className="pt-4">
              <Button variant="outline" className="border-verity-rule text-xs font-mono uppercase" asChild>
                <Link href="/kontributor/daftar">Ajukan Permohonan Baru</Link>
              </Button>
            </div>
          </div>
        ) : success ? (
          <div
            role="status"
            aria-live="polite"
            className="bg-card border border-verity-verified/40 rounded-xs p-8 text-center space-y-4"
          >
            <div className="w-12 h-12 rounded-xs bg-verity-verified/10 border border-verity-verified/30 text-verity-verified flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-verity-ink">
              Akun Kontributor Aktif
            </h1>
            <p className="text-sm text-verity-ink-soft leading-relaxed">
              Selamat datang di Verax Press, <strong className="text-verity-ink">{invitation?.name}</strong>. Akun kontributor
              Anda telah berhasil diaktifkan. Anda kini dapat masuk ke Portal Kontributor.
            </p>
            <div className="pt-4">
              <Button
                className="w-full bg-verity-ink text-verity-paper hover:bg-verity-accent font-mono text-xs uppercase tracking-wider py-2.5"
                asChild
              >
                <Link href="/kontributor/login">
                  <span>Masuk ke Portal Kontributor</span>
                  <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-verity-rule rounded-xs p-6 sm:p-8">
            <div className="border-b border-verity-rule pb-5 mb-6 text-center">
              <div className="w-10 h-10 rounded-xs bg-verity-paper-soft border border-verity-rule text-verity-ink flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-5 h-5 text-verity-accent" aria-hidden="true" />
              </div>
              <p className="font-mono text-xs uppercase tracking-widest text-verity-accent">
                Aktivasi Kontributor
              </p>
              <h1 className="mt-1 font-serif text-2xl font-bold text-verity-ink">
                Tetapkan Akun Anda
              </h1>
              <p className="mt-2 text-xs text-verity-ink-soft">
                Permohonan untuk <strong className="text-verity-ink">{invitation?.name}</strong> ({invitation?.email}) telah
                disetujui oleh Pemimpin Redaksi.
              </p>
            </div>

            {submitError && (
              <div
                role="alert"
                className="mb-6 p-4 rounded-xs bg-verity-disputed/10 border border-verity-disputed/40 flex items-start gap-3 text-verity-disputed text-xs"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <div>{submitError}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="contrib-username"
                  className="block text-xs font-mono uppercase tracking-wider text-verity-ink-soft mb-1.5"
                >
                  Nama Pengguna (Username) *
                </label>
                <Input
                  id="contrib-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="contoh: arya_rizky"
                  className="bg-verity-paper/40 font-mono text-sm"
                  autoComplete="username"
                  spellCheck={false}
                  autoCapitalize="none"
                />
                <p className="text-[11px] text-verity-ink-soft mt-1">
                  Huruf kecil, angka, garis bawah (min 3 karakter).
                </p>
              </div>

              <div>
                <label
                  htmlFor="contrib-password"
                  className="block text-xs font-mono uppercase tracking-wider text-verity-ink-soft mb-1.5"
                >
                  Kata Sandi Baru *
                </label>
                <Input
                  id="contrib-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  className="bg-verity-paper/40 font-mono text-sm"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label
                  htmlFor="contrib-confirm-password"
                  className="block text-xs font-mono uppercase tracking-wider text-verity-ink-soft mb-1.5"
                >
                  Ulangi Kata Sandi *
                </label>
                <Input
                  id="contrib-confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi"
                  className="bg-verity-paper/40 font-mono text-sm"
                  autoComplete="new-password"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-verity-ink text-verity-paper hover:bg-verity-accent font-mono text-xs uppercase tracking-wider py-2.5"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Menyimpan Akun…
                  </span>
                ) : (
                  "Aktifkan Akun Kontributor"
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

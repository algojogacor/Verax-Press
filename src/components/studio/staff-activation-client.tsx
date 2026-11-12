// Halaman aktivasi undangan staf internal (sisi klien).
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, apiErrorMessage } from "@/components/studio/api";
import { VeraxMark } from "@/components/site/verax-mark";
import { VeraxWordmark } from "@/components/site/verax-wordmark";

interface InvitationData {
  name: string;
  username: string;
  email: string | null;
  role: string;
  expiresAt: string;
}

export function StaffActivationClient({ token }: { token: string }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function verifyToken() {
      try {
        setLoading(true);
        const res = await apiFetch<{ valid: boolean; invitation: InvitationData }>(
          `/api/public/invitations/${token}`,
        );
        setInvitation(res.invitation);
        setError(null);
      } catch (err) {
        setError(apiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    void verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

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
      await apiFetch<{ success: boolean; username: string }>(
        `/api/public/invitations/${token}/accept`,
        {
          method: "POST",
          body: JSON.stringify({ password }),
        },
      );
      setSuccess(true);
    } catch (err) {
      setSubmitError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-verity-paper text-verity-ink flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-verity-rule py-4 px-6 text-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2.5 text-verity-ink transition-colors hover:text-verity-accent focus-visible:outline-2 focus-visible:outline-verity-accent"
        >
          <VeraxMark className="size-7 shrink-0" />
          <VeraxWordmark className="h-[1.6rem] w-auto" />
          <span className="sr-only">Verax Press</span>
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-verity-ink-soft mt-1">
          Ex Fontibus Veritas · Ruang Redaksi
        </p>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md border border-verity-rule bg-verity-paper p-6 sm:p-8 space-y-6 shadow-xs">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="size-6 animate-spin mx-auto text-verity-ink-soft" />
              <p className="font-mono text-xs uppercase tracking-wider text-verity-ink-soft">
                Memverifikasi Tautan Undangan…
              </p>
            </div>
          ) : error ? (
            <div className="space-y-4 text-center py-4">
              <div className="size-12 rounded-full bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center mx-auto">
                <AlertCircle className="size-6" />
              </div>
              <h1 className="font-serif text-xl font-bold text-verity-ink">
                Undangan Tidak Dapat Digunakan
              </h1>
              <p className="text-xs text-verity-ink-soft leading-relaxed">{error}</p>
              <div className="pt-4 border-t border-verity-rule">
                <Button
                  variant="outline"
                  onClick={() => router.push("/studio/login")}
                  className="w-full border-verity-rule text-xs"
                >
                  Kembali ke Halaman Masuk
                </Button>
              </div>
            </div>
          ) : success ? (
            <div className="space-y-4 text-center py-4">
              <div className="size-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="size-6" />
              </div>
              <h1 className="font-serif text-xl font-bold text-verity-ink">
                Akun Berhasil Diaktifkan
              </h1>
              <p className="text-xs text-verity-ink-soft leading-relaxed">
                Selamat bergabung dengan tim redaksi Verax Press,{" "}
                <span className="font-semibold text-verity-ink">{invitation?.name}</span>. Akun Anda
                kini aktif dan siap digunakan.
              </p>
              <div className="pt-4 border-t border-verity-rule">
                <Button
                  onClick={() => router.push("/studio/login")}
                  className="w-full bg-verity-ink text-verity-paper hover:bg-verity-ink-soft text-xs flex items-center justify-center gap-2"
                >
                  <span>Masuk ke Meja Redaksi</span>
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2 text-center border-b border-verity-rule pb-4">
                <div className="size-10 rounded-full bg-verity-paper-soft border border-verity-rule text-verity-ink flex items-center justify-center mx-auto mb-2">
                  <UserCheck className="size-5" />
                </div>
                <h1 className="font-serif text-2xl font-bold text-verity-ink">
                  Aktivasi Akun Penulis
                </h1>
                <p className="text-xs text-verity-ink-soft">
                  Lengkapi kata sandi untuk mulai bekerja di ruang redaksi Verax Press.
                </p>
              </div>

              {/* Rincian Undangan */}
              <div className="border border-verity-rule bg-verity-paper-soft p-3.5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-verity-ink-soft font-mono">Nama:</span>
                  <span className="font-medium text-verity-ink">{invitation?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-verity-ink-soft font-mono">Nama Pengguna:</span>
                  <span className="font-mono text-verity-ink font-semibold">
                    @{invitation?.username}
                  </span>
                </div>
                {invitation?.email && (
                  <div className="flex justify-between">
                    <span className="text-verity-ink-soft font-mono">Email Kontak:</span>
                    <span className="text-verity-ink">{invitation.email}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-verity-ink-soft font-mono">Peran Redaksi:</span>
                  <span className="font-mono uppercase tracking-wider text-verity-ink font-semibold">
                    Penulis (WRITER)
                  </span>
                </div>
              </div>

              {submitError && (
                <div className="flex items-center gap-2 rounded-[2px] bg-rose-50 p-3 border border-rose-200 text-xs text-rose-800">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Formulir Kata Sandi */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-verity-ink">
                    Buat Kata Sandi Baru
                  </label>
                  <Input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Minimal 8 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-verity-paper border-verity-rule text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-verity-ink">
                    Konfirmasi Kata Sandi
                  </label>
                  <Input
                    type="password"
                    required
                    minLength={8}
                    placeholder="Ulangi kata sandi"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-verity-paper border-verity-rule text-sm"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-verity-ink text-verity-paper hover:bg-verity-ink-soft text-xs py-2.5 mt-2"
                >
                  {submitting ? "Mengaktifkan Akun…" : "Aktifkan Akun dan Masuk"}
                </Button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-verity-rule py-4 px-6 text-center text-xs text-verity-ink-faint">
        Verax Press · Portal Meja Redaksi
      </footer>
    </div>
  );
}

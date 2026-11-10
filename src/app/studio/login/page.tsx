// Halaman login studio — satu-satunya pintu masuk staf ke CMS.
"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

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
        setError("Email atau kata sandi salah.");
        return;
      }
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/studio") ? next : "/studio");
    } catch {
      setError("Terjadi kesalahan saat masuk. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <p className="pl-[0.3em] font-serif text-xl font-semibold tracking-[0.3em] text-verity-ink">VERAX PRESS</p>
      <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-verity-ink-faint">
        Studio Redaksi · Ex Fontibus Veritas
      </p>

      <div className="mt-8 w-full max-w-sm border border-verity-rule bg-card p-6">
        <h1 className="font-serif text-xl font-semibold text-verity-ink">Masuk ke Studio</h1>
        <p className="mt-1 text-sm text-verity-ink-soft">
          Alat kerja internal redaksi. Akses terbatas untuk staf.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="nama@verity.example"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Kata Sandi</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={submitting}
            />
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" className="w-full" disabled={submitting || !email || !password}>
            {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {submitting ? "Memproses…" : "Masuk"}
          </Button>
        </form>
      </div>

      <Link
        href="/"
        className="mt-6 font-mono text-[11px] uppercase tracking-[0.12em] text-verity-ink-faint transition-colors hover:text-verity-accent"
      >
        ← Kembali ke situs publik
      </Link>
    </div>
  );
}

export default function StudioLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-5 animate-spin text-verity-ink-faint" aria-hidden="true" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

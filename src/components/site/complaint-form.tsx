// Formulir keluhan publik (client) — POST /api/public/complaints.
// Sukses → panel nomor antrean (refCode); gagal → pesan inline. Tanpa janji tenggat hari.
"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COMPLAINT_TYPES, COMPLAINT_TYPE_LABELS } from "@/lib/domain/constants";
import { formatDateTime } from "@/lib/format";
import type { ComplaintType } from "@/types/verity";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldName = "type" | "senderName" | "senderEmail" | "message";
type FieldErrors = Partial<Record<FieldName, string>>;

type ComplaintSuccess = {
  refCode: string;
  receivedAt: string;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[12px] font-medium text-verity-accent">{message}</p>;
}

function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-verity-accent">
      *
    </span>
  );
}

function OptionalMark() {
  return <span className="font-normal text-verity-ink-faint">(opsional)</span>;
}

export function ComplaintForm() {
  const [type, setType] = useState<ComplaintType | "">("");
  const [articleSlug, setArticleSlug] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<ComplaintSuccess | null>(null);

  function clearError(field: FieldName) {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!type) next.type = "Pilih jenis permohonan.";
    if (senderName.trim().length < 2) next.senderName = "Nama wajib diisi (minimal 2 karakter).";
    const email = senderEmail.trim();
    if (!email) next.senderEmail = "Email wajib diisi.";
    else if (!EMAIL_PATTERN.test(email)) next.senderEmail = "Format alamat email tidak valid.";
    if (message.trim().length < 20) next.message = "Uraian permohonan minimal 20 karakter.";
    return next;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    const validation = validate();
    setErrors(validation);
    if (Object.values(validation).some(Boolean)) return;

    setIsSubmitting(true);
    try {
      // Field opsional hanya dikirim bila terisi (bukan string kosong).
      const body: Record<string, string> = {
        type,
        senderName: senderName.trim(),
        senderEmail: senderEmail.trim(),
        message: message.trim(),
      };
      if (articleSlug.trim()) body.articleSlug = articleSlug.trim();
      if (senderPhone.trim()) body.senderPhone = senderPhone.trim();

      const response = await fetch("/api/public/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await response.json().catch(() => null)) as {
        refCode?: string;
        receivedAt?: string;
        error?: string;
      } | null;

      if (!response.ok) {
        if (response.status === 429) {
          setServerError(
            "Terlalu banyak permohonan terkirim dari jaringan ini. Mohon tunggu beberapa saat sebelum mencoba kembali.",
          );
        } else {
          setServerError(data?.error ?? "Permohonan gagal dikirim. Silakan coba beberapa saat lagi.");
        }
        return;
      }

      setSuccess({
        refCode: data?.refCode ?? "",
        receivedAt: data?.receivedAt ?? new Date().toISOString(),
      });
    } catch {
      setServerError("Koneksi terputus. Periksa jaringan Anda, lalu kirim ulang permohonan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="border border-verity-rule bg-verity-paper-soft px-6 py-6"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-verity-ink-soft">
          Permohonan diterima
        </p>
        <p className="mt-3 font-mono text-[1.75rem] font-medium tracking-[0.06em] text-verity-ink">
          {success.refCode}
        </p>
        <p className="mt-3 font-serif text-[0.98rem] leading-relaxed text-verity-ink-soft">
          Tanggal terima: {formatDateTime(success.receivedAt)}. Simpan nomor antrean ini untuk
          penelusuran.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {serverError ? (
        <p
          role="alert"
          className="border-l-2 border-verity-accent bg-verity-paper-soft px-4 py-3 font-serif text-[0.95rem] leading-relaxed text-verity-accent"
        >
          {serverError}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="complaint-type" className="text-[13px] text-verity-ink">
          Jenis permohonan <RequiredMark />
        </Label>
        <Select
          value={type}
          onValueChange={(value) => {
            setType(value as ComplaintType);
            clearError("type");
          }}
        >
          <SelectTrigger id="complaint-type" className="h-11 w-full" aria-required="true">
            <SelectValue placeholder="Pilih jenis permohonan" />
          </SelectTrigger>
          <SelectContent>
            {COMPLAINT_TYPES.map((value) => (
              <SelectItem key={value} value={value}>
                {COMPLAINT_TYPE_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={errors.type} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="complaint-article" className="text-[13px] font-medium text-verity-ink">
          Tautan atau judul artikel terkait <OptionalMark />
        </Label>
        <Input
          id="complaint-article"
          value={articleSlug}
          onChange={(event) => setArticleSlug(event.target.value)}
          placeholder="Misal: https://veraxpress.vercel.app/artikel/... atau judul berita terkait"
          className="h-11 bg-card"
          autoComplete="off"
        />
        <p className="font-serif text-[12px] text-verity-ink-faint">
          Sebutkan judul atau tempel tautan artikel yang ingin Anda persoalkan. Kosongkan jika keluhan bersifat umum.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="complaint-name" className="text-[13px] font-medium text-verity-ink">
            Nama lengkap <RequiredMark />
          </Label>
          <Input
            id="complaint-name"
            value={senderName}
            onChange={(event) => {
              setSenderName(event.target.value);
              clearError("senderName");
            }}
            placeholder="Nama lengkap sesuai identitas"
            className="h-11 bg-card"
            autoComplete="name"
          />
          <FieldError message={errors.senderName} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="complaint-email" className="text-[13px] font-medium text-verity-ink">
            Alamat email <RequiredMark />
          </Label>
          <Input
            id="complaint-email"
            type="email"
            value={senderEmail}
            onChange={(event) => {
              setSenderEmail(event.target.value);
              clearError("senderEmail");
            }}
            placeholder="nama@contoh.com"
            className="h-11 bg-card"
            autoComplete="email"
          />
          <FieldError message={errors.senderEmail} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="complaint-phone" className="text-[13px] font-medium text-verity-ink">
          Nomor telepon atau WhatsApp <OptionalMark />
        </Label>
        <Input
          id="complaint-phone"
          type="tel"
          value={senderPhone}
          onChange={(event) => setSenderPhone(event.target.value)}
          placeholder="0812-xxxx-xxxx (untuk konfirmasi cepat redaksi)"
          className="h-11 bg-card"
          autoComplete="tel"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="complaint-message" className="text-[13px] font-medium text-verity-ink">
          Uraian permohonan <RequiredMark />
        </Label>
        <Textarea
          id="complaint-message"
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            clearError("message");
          }}
          placeholder="Jelaskan permohonan Anda: bagian mana yang dipersoalkan, fakta yang sebenarnya menurut Anda, serta bukti pendukung yang relevan."
          className="min-h-32 bg-card"
          aria-required="true"
        />
        <FieldError message={errors.message} />
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 rounded-xs bg-verity-ink px-6 font-medium text-verity-paper transition-colors hover:bg-black"
        >
          {isSubmitting ? "Mengirim…" : "Kirim Permohonan"}
        </Button>
        <p className="font-mono text-[11px] text-verity-ink-faint">Tanda bintang (*) menandakan kolom wajib.</p>
      </div>
    </form>
  );
}

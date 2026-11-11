"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ContributorProfileData {
  id: string;
  name: string;
  username: string;
  email: string;
  bio: string | null;
  status: string;
  personId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function ContributorProfileEditor({ profile }: { profile: ContributorProfileData }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio || "");
  const [isDirty, setIsDirty] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/contributor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui profil.");
      return data;
    },
    onSuccess: () => {
      setNotice({ type: "success", message: "Profil kontributor berhasil diperbarui." });
      setIsDirty(false);
      void queryClient.invalidateQueries({ queryKey: ["contributor-profile"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Gagal memperbarui profil.";
      setNotice({ type: "error", message: msg });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNotice({ type: "error", message: "Nama publik tidak boleh kosong." });
      return;
    }
    updateMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {notice && (
        <div
          role={notice.type === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`p-4 rounded-xs flex items-start gap-3 text-xs border ${
            notice.type === "success"
              ? "bg-verity-verified/10 border-verity-verified/40 text-verity-verified"
              : "bg-verity-disputed/10 border-verity-disputed/40 text-verity-disputed"
          }`}
        >
          {notice.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          )}
          <div className="flex-1 font-medium">{notice.message}</div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-verity-ink-soft hover:text-verity-ink text-xs font-mono ml-2"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Account Overview Box */}
      <div className="bg-card border border-verity-rule rounded-xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-verity-rule pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xs border border-verity-rule bg-verity-paper-soft text-verity-ink flex items-center justify-center font-serif text-lg font-bold">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold text-verity-ink">{profile.name}</h1>
              <p className="font-mono text-xs text-verity-ink-soft">@{profile.username}</p>
            </div>
          </div>

          <span
            className={`px-2.5 py-1 rounded-xs text-xs font-mono border ${
              profile.status === "ACTIVE"
                ? "bg-verity-verified/10 text-verity-verified border-verity-verified/40"
                : "bg-verity-disputed/10 text-verity-disputed border-verity-disputed/40"
            }`}
          >
            {profile.status === "ACTIVE" ? "Aktif" : "Dinonaktifkan"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <span className="text-verity-ink-soft block uppercase text-[10px]">Email Akun</span>
            <span className="text-verity-ink font-medium">{profile.email}</span>
          </div>
          <div>
            <span className="text-verity-ink-soft block uppercase text-[10px]">Terdaftar Sejak</span>
            <span className="text-verity-ink font-medium">
              {new Date(profile.createdAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Edit Public Profile Form */}
      <div className="bg-card border border-verity-rule rounded-xs p-6 space-y-5">
        <div className="border-b border-verity-rule pb-3">
          <h2 className="font-serif text-lg font-bold text-verity-ink">
            Identitas Publik & Byline
          </h2>
          <p className="text-xs text-verity-ink-soft mt-0.5">
            Nama dan biografi berikut akan dicantumkan secara publik pada naskah yang diterbitkan.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="profile-name"
              className="block text-xs font-mono uppercase tracking-wider text-verity-ink-soft mb-1.5"
            >
              Nama Publik (Byline) *
            </label>
            <Input
              id="profile-name"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Nama penulis yang tertera di byline"
              className="bg-verity-paper/40 font-serif text-base py-2 text-verity-ink"
            />
          </div>

          <div>
            <label
              htmlFor="profile-bio"
              className="block text-xs font-mono uppercase tracking-wider text-verity-ink-soft mb-1.5"
            >
              Biografi Singkat
            </label>
            <Textarea
              id="profile-bio"
              rows={4}
              value={bio}
              onChange={(e) => {
                setBio(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Latar belakang keahlian, riset, atau institusi penulis…"
              className="bg-verity-paper/40 text-sm leading-relaxed"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={updateMutation.isPending || !isDirty}
              className="w-full bg-verity-ink text-verity-paper hover:bg-verity-accent font-mono text-xs uppercase tracking-wider py-2.5"
            >
              {updateMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Menyimpan Perubahan…
                </span>
              ) : (
                "Simpan Profil"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ContributorProfilePage() {
  const { data: response, isLoading, error } = useQuery<ContributorProfileData>({
    queryKey: ["contributor-profile"],
    queryFn: async () => {
      const res = await fetch("/api/contributor/profile");
      if (!res.ok) throw new Error("Gagal memuat profil kontributor.");
      return res.json();
    },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-verity-rule pb-4">
        <Link
          href="/kontributor/portal"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-verity-ink-soft hover:text-verity-accent"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Kembali ke Naskah Saya</span>
        </Link>
        <span className="font-mono text-xs uppercase tracking-wider text-verity-accent">
          Profil Penulis
        </span>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs font-mono text-verity-ink-soft">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-verity-ink mb-2" aria-hidden="true" />
          Memuat profil kontributor…
        </div>
      ) : error || !response ? (
        <div
          role="alert"
          className="p-12 text-center text-xs font-mono text-verity-disputed bg-verity-disputed/10 rounded-xs border border-verity-disputed/40"
        >
          Gagal memuat profil kontributor.
        </div>
      ) : (
        <ContributorProfileEditor profile={response} key={response.updatedAt} />
      )}
    </div>
  );
}

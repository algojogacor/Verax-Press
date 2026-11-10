// Form artikel baru (newsroom) — membuat draft lalu membuka editor.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { apiFetch, apiErrorMessage } from "@/components/studio/api";
import { useDesks } from "@/components/studio/desks";
import { AI_INVOLVEMENT_LABELS, FORMAT_LABELS } from "@/lib/domain/constants";
import type { AiInvolvement, ArticleFormat } from "@/types/verity";

interface CreateArticleResponse {
  id: string;
  slug: string;
}

export default function NewArticlePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: desks, isLoading: desksLoading, error: desksError } = useDesks();

  const [title, setTitle] = useState("");
  const [deck, setDeck] = useState("");
  const [deskSlug, setDeskSlug] = useState<string>("");
  const [format, setFormat] = useState<ArticleFormat>("NEWS");
  const [aiInvolvement, setAiInvolvement] = useState<AiInvolvement>("none");

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch<CreateArticleResponse>("/api/studio/articles", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          deck: deck.trim() ? deck.trim() : undefined,
          deskSlug,
          format,
          aiInvolvement,
        }),
      }),
    onSuccess: (data) => {
      toast({ title: "Draft dibuat", description: "Naskah baru tersimpan sebagai Draft." });
      router.push(`/studio/articles/${data.id}`);
    },
    onError: (mutationError) => {
      toast({
        title: "Gagal membuat artikel",
        description: apiErrorMessage(mutationError),
        variant: "destructive",
      });
    },
  });

  const titleValid = title.trim().length >= 8;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!titleValid || !deskSlug) return;
    createMutation.mutate();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-verity-ink">Artikel Baru</h1>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-verity-ink-faint">
          Naskah newsroom · dimulai sebagai Draft
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 border border-verity-rule bg-card p-6">
        <div className="space-y-2">
          <Label htmlFor="title">Judul</Label>
          <Input
            id="title"
            placeholder="Minimal 8 karakter"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-describedby="title-hint"
          />
          <p id="title-hint" className="font-mono text-[11px] text-verity-ink-faint">
            {title.trim().length}/8 karakter minimum
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="deck">Deck</Label>
          <Textarea
            id="deck"
            rows={2}
            placeholder="Ringkasan satu-dua kalimat (wajib sebelum terbit)"
            value={deck}
            onChange={(event) => setDeck(event.target.value)}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="desk">Desk</Label>
            <Select value={deskSlug} onValueChange={setDeskSlug} disabled={desksLoading}>
              <SelectTrigger id="desk" className="w-full">
                <SelectValue placeholder={desksLoading ? "Memuat…" : "Pilih desk"} />
              </SelectTrigger>
              <SelectContent>
                {(desks ?? []).map((desk) => (
                  <SelectItem key={desk.slug} value={desk.slug}>
                    {desk.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {desksError ? (
              <p className="font-mono text-[11px] text-verity-disputed">
                Gagal memuat daftar desk.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <Select value={format} onValueChange={(value) => setFormat(value as ArticleFormat)}>
              <SelectTrigger id="format" className="w-full">
                <SelectValue placeholder="Pilih format" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FORMAT_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ai-involvement">Keterlibatan AI</Label>
          <Select value={aiInvolvement} onValueChange={(value) => setAiInvolvement(value as AiInvolvement)}>
            <SelectTrigger id="ai-involvement" className="w-full">
              <SelectValue placeholder="Pilih tingkat keterlibatan" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(AI_INVOLVEMENT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {aiInvolvement === "substantive" ? (
            <p className="font-mono text-[11px] text-verity-unverified">
              Keterlibatan AI substantif memerlukan disclosure publik sebelum terbit.
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-verity-rule pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/studio/articles")}
            disabled={createMutation.isPending}
          >
            Batal
          </Button>
          <Button type="submit" disabled={!titleValid || !deskSlug || createMutation.isPending}>
            {createMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            Buat Draft
          </Button>
        </div>
      </form>
    </div>
  );
}

// Tab Konten editor artikel: metadata + block editor + pratinjau + simpan.
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { BlockEditor, validateBlocks } from "@/components/studio/block-editor";
import { ContentRenderer } from "@/components/content/content-renderer";
import {
  AI_INVOLVEMENT_LABELS,
  FORMAT_LABELS,
  FORMAT_STRUCTURE_HINTS,
} from "@/lib/domain/constants";
import {
  articleContentSchema,
  contentBlockSchema,
  type ContentBlock,
} from "@/lib/domain/content";
import type { AiInvolvement, ArticleDetailDTO, ArticleFormat } from "@/types/verity";

function parseInitialContent(content: unknown): ContentBlock[] {
  const parsed = articleContentSchema.safeParse(content);
  return parsed.success ? parsed.data : [];
}

export function ArticleContentTab({ article }: { article: ArticleDetailDTO }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: desks } = useDesks();

  // State lokal — diinisialisasi sekali per artikel (komponen di-key per id di halaman).
  const [title, setTitle] = useState(article.title);
  const [deck, setDeck] = useState(article.deck ?? "");
  const [deskSlug, setDeskSlug] = useState(article.desk.slug);
  const [format, setFormat] = useState<ArticleFormat>(article.format);
  const [byline, setByline] = useState(article.byline);
  const [aiInvolvement, setAiInvolvement] = useState<AiInvolvement>(article.aiInvolvement);
  const [aiDisclosurePublic, setAiDisclosurePublic] = useState(article.aiDisclosurePublic);
  const [aiDisclosureNote, setAiDisclosureNote] = useState(article.aiDisclosureNote ?? "");
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => parseInitialContent(article.content));
  const [preview, setPreview] = useState(false);

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<ArticleDetailDTO>(`/api/studio/articles/${article.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["article", article.id], data);
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: "Perubahan disimpan (versi baru dibuat)" });
    },
    onError: (error) => {
      toast({
        title: "Gagal menyimpan",
        description: apiErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const titleValid = title.trim().length >= 8;

  function handleSave() {
    if (!titleValid) {
      toast({
        title: "Judul belum valid",
        description: "Judul minimal 8 karakter.",
        variant: "destructive",
      });
      return;
    }
    const validated = validateBlocks(blocks);
    if (!validated.ok) {
      toast({
        title: "Konten belum valid",
        description: validated.message,
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate({
      title: title.trim(),
      deck: deck.trim() ? deck.trim() : null,
      deskSlug,
      format,
      byline,
      aiInvolvement,
      aiDisclosurePublic,
      aiDisclosureNote: aiDisclosureNote.trim() ? aiDisclosureNote.trim() : null,
      content: validated.data,
    });
  }

  const previewBlocks = blocks.filter((block) => contentBlockSchema.safeParse(block).success);
  const hasInvalidPreviewBlocks = previewBlocks.length !== blocks.length;

  return (
    <div className="space-y-8">
      {/* Metadata */}
      <section aria-label="Metadata artikel" className="space-y-5 border border-verity-rule bg-card p-4 sm:p-6">
        <div className="space-y-2">
          <Label htmlFor="meta-title">Judul</Label>
          <Input
            id="meta-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="font-serif text-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="meta-deck">Deck</Label>
          <Textarea
            id="meta-deck"
            rows={2}
            placeholder="Ringkasan satu-dua kalimat (wajib sebelum terbit)"
            value={deck}
            onChange={(event) => setDeck(event.target.value)}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="meta-desk">Desk</Label>
            <Select value={deskSlug} onValueChange={setDeskSlug}>
              <SelectTrigger id="meta-desk" className="w-full">
                <SelectValue placeholder="Pilih desk" />
              </SelectTrigger>
              <SelectContent>
                {(desks ?? []).map((desk) => (
                  <SelectItem key={desk.slug} value={desk.slug}>
                    {desk.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta-format">Format</Label>
            <Select value={format} onValueChange={(value) => setFormat(value as ArticleFormat)}>
              <SelectTrigger id="meta-format" className="w-full">
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
            <p className="font-mono text-[11px] leading-relaxed text-verity-ink-faint">
              Panduan struktur: {FORMAT_STRUCTURE_HINTS[format]}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta-byline">Byline</Label>
            <Input
              id="meta-byline"
              placeholder="Mis. Oleh Redaksi Verax Press"
              value={byline}
              onChange={(event) => setByline(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta-ai">Keterlibatan AI</Label>
            <Select
              value={aiInvolvement}
              onValueChange={(value) => setAiInvolvement(value as AiInvolvement)}
            >
              <SelectTrigger id="meta-ai" className="w-full">
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
          </div>
        </div>

        <div className="space-y-3 border-t border-verity-rule pt-4">
          <div className="flex items-center gap-3">
            <Switch
              id="meta-ai-public"
              checked={aiDisclosurePublic}
              onCheckedChange={setAiDisclosurePublic}
              aria-label="Tampilkan catatan proses AI secara publik"
            />
            <Label htmlFor="meta-ai-public" className="cursor-pointer text-sm font-normal">
              Catatan proses AI publik
            </Label>
          </div>
          {aiInvolvement === "substantive" ? (
            <p className="font-mono text-[11px] text-verity-unverified">
              Disclosure publik wajib sebelum terbit.
            </p>
          ) : null}
          {aiDisclosurePublic ? (
            <div className="space-y-2">
              <Label htmlFor="meta-ai-note">Catatan proses AI (tampil di halaman publik)</Label>
              <Textarea
                id="meta-ai-note"
                rows={2}
                placeholder="Jelaskan bagaimana AI dilibatkan dalam proses pembuatan naskah…"
                value={aiDisclosureNote}
                onChange={(event) => setAiDisclosureNote(event.target.value)}
              />
            </div>
          ) : null}
        </div>
      </section>

      {/* Block editor */}
      <section aria-label="Konten artikel" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-lg font-semibold text-verity-ink">Isi Naskah</h2>
          <div className="flex items-center gap-2">
            <Switch
              id="preview-toggle"
              checked={preview}
              onCheckedChange={setPreview}
              aria-label="Mode pratinjau"
            />
            <Label htmlFor="preview-toggle" className="cursor-pointer text-sm font-normal">
              Pratinjau
            </Label>
          </div>
        </div>

        {preview ? (
          <div className="border border-verity-rule bg-card p-4 sm:p-8">
            {hasInvalidPreviewBlocks ? (
              <p className="mb-6 border border-verity-rule bg-verity-paper-soft px-4 py-2 font-mono text-[11px] text-verity-unverified">
                Beberapa blok belum valid dan tidak dirender dalam pratinjau.
              </p>
            ) : null}
            <h1 className="mb-2 font-serif text-[1.9rem] font-semibold leading-[1.12] text-verity-ink">
              {title}
            </h1>
            {deck.trim() ? (
              <p className="mb-6 font-serif text-[1.15rem] italic leading-relaxed text-verity-ink-soft">
                {deck}
              </p>
            ) : null}
            {previewBlocks.length === 0 ? (
              <p className="text-sm text-verity-ink-soft">Belum ada konten untuk dipratinjau.</p>
            ) : (
              <ContentRenderer content={previewBlocks} />
            )}
          </div>
        ) : (
          <BlockEditor blocks={blocks} onChange={setBlocks} />
        )}
      </section>

      <div className="flex items-center justify-end gap-3 border-t border-verity-rule pt-4">
        <Button onClick={handleSave} disabled={!titleValid || saveMutation.isPending}>
          {saveMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          Simpan Perubahan
        </Button>
      </div>
    </div>
  );
}

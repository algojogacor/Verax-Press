// Block editor untuk konten artikel (block-JSON, skema src/lib/domain/content.ts).
// State lokal; validasi akhir tetap lewat articleContentSchema saat simpan.
"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { articleContentSchema, type ContentBlock } from "@/lib/domain/content";

export type BlockType = ContentBlock["type"];

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  paragraph: "Paragraf",
  heading: "Judul Bagian",
  quote: "Kutipan",
  list: "Daftar",
  image: "Gambar",
  note: "Catatan",
  qa: "Tanya-Jawab",
};

const BLOCK_TYPE_DESCRIPTIONS: Record<BlockType, string> = {
  paragraph: "Teks isi artikel.",
  heading: "Sub-judul bagian (level 2 atau 3).",
  quote: "Kutipan dengan atribusi narasumber.",
  list: "Butir poin — bullet atau bernomor.",
  image: "Gambar via URL, dengan alt, keterangan, dan kredit.",
  note: "Kotak catatan konteks atau koreksi.",
  qa: "Pasangan pertanyaan dan jawaban.",
};

const BLOCK_TYPES: BlockType[] = [
  "paragraph",
  "heading",
  "quote",
  "list",
  "image",
  "note",
  "qa",
];

function defaultBlock(type: BlockType): ContentBlock {
  switch (type) {
    case "paragraph":
      return { type: "paragraph", text: "" };
    case "heading":
      return { type: "heading", level: 2, text: "" };
    case "quote":
      return { type: "quote", text: "", attribution: "" };
    case "list":
      return { type: "list", style: "bullet", items: [""] };
    case "image":
      return { type: "image", url: "", alt: "", caption: "", credit: "" };
    case "note":
      return { type: "note", label: "", text: "" };
    case "qa":
      return { type: "qa", question: "", answer: "" };
  }
}

/** Validasi isi blok saat ini — dipakai sebelum PATCH. */
export function validateBlocks(
  blocks: ContentBlock[],
): { ok: true; data: ContentBlock[] } | { ok: false; message: string } {
  const result = articleContentSchema.safeParse(blocks);
  if (result.success) return { ok: true, data: result.data };
  const issues = result.error.issues.slice(0, 3);
  const parts = issues.map((issue) => {
    const path = issue.path.join(".");
    const blockIndex = typeof issue.path[0] === "number" ? (issue.path[0] as number) + 1 : null;
    const label = blockIndex ? `Blok ${blockIndex}` : "Konten";
    return `${label}: ${path} — ${issue.message}`;
  });
  return {
    ok: false,
    message: parts.join(" · "),
  };
}

interface BlockEditorProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
}

export function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  const [addOpen, setAddOpen] = useState(false);

  function patchBlock(index: number, patch: Partial<Record<string, unknown>>) {
    onChange(
      blocks.map((block, i) => (i === index ? ({ ...block, ...patch } as ContentBlock) : block)),
    );
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    onChange(next);
  }

  function removeBlock(index: number) {
    onChange(blocks.filter((_, i) => i !== index));
  }

  function appendBlock(type: BlockType) {
    onChange([...blocks, defaultBlock(type)]);
    setAddOpen(false);
  }

  return (
    <div className="space-y-4">
      {blocks.length === 0 ? (
        <p className="border border-dashed border-verity-rule-strong bg-card p-6 text-center text-sm text-verity-ink-soft">
          Belum ada blok konten. Tambahkan blok pertama untuk mulai menulis.
        </p>
      ) : null}

      {blocks.map((block, index) => (
        <section key={index} className="border border-verity-rule bg-card">
          <header className="flex items-center justify-between border-b border-verity-rule px-3 py-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-verity-ink-faint">
              {String(index + 1).padStart(2, "0")} · {BLOCK_TYPE_LABELS[block.type]}
            </p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Pindahkan blok ke atas"
                disabled={index === 0}
                onClick={() => moveBlock(index, -1)}
              >
                <ArrowUp className="size-3.5" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Pindahkan blok ke bawah"
                disabled={index === blocks.length - 1}
                onClick={() => moveBlock(index, 1)}
              >
                <ArrowDown className="size-3.5" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-verity-disputed"
                aria-label="Hapus blok"
                onClick={() => removeBlock(index)}
              >
                <X className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
          </header>

          <div className="space-y-3 p-3">
            {block.type === "paragraph" ? (
              <Textarea
                rows={4}
                placeholder="Teks paragraf…"
                value={block.text}
                onChange={(event) => patchBlock(index, { text: event.target.value })}
              />
            ) : null}

            {block.type === "heading" ? (
              <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                <div className="space-y-1.5">
                  <Label className="font-mono text-[10px] uppercase tracking-[0.12em]">Level</Label>
                  <Select
                    value={String(block.level)}
                    onValueChange={(value) => patchBlock(index, { level: Number(value) as 2 | 3 })}
                  >
                    <SelectTrigger className="w-full" aria-label="Level judul">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">H2 — Bagian</SelectItem>
                      <SelectItem value="3">H3 — Sub-bagian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-mono text-[10px] uppercase tracking-[0.12em]">Teks</Label>
                  <Input
                    placeholder="Judul bagian…"
                    value={block.text}
                    onChange={(event) => patchBlock(index, { text: event.target.value })}
                  />
                </div>
              </div>
            ) : null}

            {block.type === "quote" ? (
              <>
                <Textarea
                  rows={2}
                  placeholder="Teks kutipan…"
                  value={block.text}
                  onChange={(event) => patchBlock(index, { text: event.target.value })}
                />
                <Input
                  placeholder="Atribusi (mis. Nama, Jabatan)"
                  value={block.attribution ?? ""}
                  onChange={(event) => patchBlock(index, { attribution: event.target.value })}
                />
              </>
            ) : null}

            {block.type === "list" ? (
              <div className="space-y-3">
                <div className="w-48 space-y-1.5">
                  <Label className="font-mono text-[10px] uppercase tracking-[0.12em]">Gaya</Label>
                  <Select
                    value={block.style}
                    onValueChange={(value) =>
                      patchBlock(index, { style: value as "bullet" | "number" })
                    }
                  >
                    <SelectTrigger className="w-full" aria-label="Gaya daftar">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bullet">Bullet</SelectItem>
                      <SelectItem value="number">Bernomor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-mono text-[10px] uppercase tracking-[0.12em]">
                    Butir (satu per baris)
                  </Label>
                  <Textarea
                    rows={4}
                    placeholder={"Butir pertama\nButir kedua"}
                    value={block.items.join("\n")}
                    onChange={(event) => patchBlock(index, { items: event.target.value.split("\n") })}
                  />
                </div>
              </div>
            ) : null}

            {block.type === "image" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="font-mono text-[10px] uppercase tracking-[0.12em]">URL</Label>
                  <Input
                    type="url"
                    placeholder="https://…"
                    value={block.url}
                    onChange={(event) => patchBlock(index, { url: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-mono text-[10px] uppercase tracking-[0.12em]">Alt</Label>
                  <Input
                    placeholder="Teks alternatif"
                    value={block.alt ?? ""}
                    onChange={(event) => patchBlock(index, { alt: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-mono text-[10px] uppercase tracking-[0.12em]">Kredit</Label>
                  <Input
                    placeholder="Mis. Foto: Nama"
                    value={block.credit ?? ""}
                    onChange={(event) => patchBlock(index, { credit: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="font-mono text-[10px] uppercase tracking-[0.12em]">
                    Keterangan (caption)
                  </Label>
                  <Input
                    placeholder="Keterangan gambar…"
                    value={block.caption ?? ""}
                    onChange={(event) => patchBlock(index, { caption: event.target.value })}
                  />
                </div>
              </div>
            ) : null}

            {block.type === "note" ? (
              <>
                <Input
                  placeholder="Label (mis. KONTEKS, KOREKSI)"
                  value={block.label ?? ""}
                  onChange={(event) => patchBlock(index, { label: event.target.value })}
                />
                <Textarea
                  rows={2}
                  placeholder="Isi catatan…"
                  value={block.text}
                  onChange={(event) => patchBlock(index, { text: event.target.value })}
                />
              </>
            ) : null}

            {block.type === "qa" ? (
              <>
                <div className="space-y-1.5">
                  <Label className="font-mono text-[10px] uppercase tracking-[0.12em]">Pertanyaan</Label>
                  <Input
                    placeholder="Pertanyaan…"
                    value={block.question}
                    onChange={(event) => patchBlock(index, { question: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-mono text-[10px] uppercase tracking-[0.12em]">Jawaban</Label>
                  <Textarea
                    rows={3}
                    placeholder="Jawaban…"
                    value={block.answer}
                    onChange={(event) => patchBlock(index, { answer: event.target.value })}
                  />
                </div>
              </>
            ) : null}
          </div>
        </section>
      ))}

      <div>
        <Button type="button" variant="outline" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Tambah Blok
        </Button>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">Tambah Blok</DialogTitle>
            <DialogDescription>Pilih jenis blok yang akan ditambahkan di akhir naskah.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {BLOCK_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className="rounded-[2px] border border-verity-rule px-3 py-2.5 text-left transition-colors hover:border-verity-rule-strong hover:bg-verity-paper-soft"
                onClick={() => appendBlock(type)}
              >
                <span className="block text-sm font-medium text-verity-ink">
                  {BLOCK_TYPE_LABELS[type]}
                </span>
                <span className="mt-0.5 block text-xs text-verity-ink-soft">
                  {BLOCK_TYPE_DESCRIPTIONS[type]}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

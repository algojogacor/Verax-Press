"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  Save,
  Send,
  RotateCcw,
  Plus,
  Trash2,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Clock,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SOURCE_TYPES } from "@/lib/domain/constants";
import { safeExternalHttpUrl } from "@/lib/url";

interface SourceItem {
  id: string;
  title: string;
  publisher: string | null;
  url: string;
  sourceType: string;
  verificationStatus: string;
  verificationNote: string | null;
  supports: string | null;
}

interface ReviewItem {
  id: string;
  decision: string;
  fromStatus: string;
  toStatus: string;
  notes: string | null;
  reviewerName: string;
  createdAt: string;
}

interface ArticleDetailData {
  id: string;
  slug: string;
  title: string;
  deck: string | null;
  desk: { id: string; name: string; slug: string };
  format: string;
  status: string;
  content: Array<{ type: string; text?: string; level?: number }>;
  byline: string;
  sources: SourceItem[];
  reviews: ReviewItem[];
  allowedTransitions: Array<{ action: string; label: string }>;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; desc: string }> = {
  DRAFT: {
    label: "Draf Mandiri",
    color: "bg-verity-paper-soft text-verity-ink border-verity-rule-strong",
    desc: "Naskah hanya dapat dilihat oleh Anda. Lengkapi isi tulisan dan rujukan primer sebelum mengajukan ke redaksi.",
  },
  PENDING_REVIEW: {
    label: "Menunggu Telaah Redaksi",
    color: "bg-verity-paper text-verity-ink border-verity-unverified",
    desc: "Naskah telah masuk dalam antrean telaah meja redaksi. Penyuntingan dikunci sementara.",
  },
  FACT_CHECK: {
    label: "Pemeriksaan Fakta",
    color: "bg-verity-paper text-verity-accent border-verity-accent/40",
    desc: "Redaksi sedang memverifikasi rujukan primer dan klaim fakta naskah Anda.",
  },
  REVISION_NEEDED: {
    label: "Memerlukan Revisi",
    color: "bg-verity-disputed/10 text-verity-disputed border-verity-disputed/40",
    desc: "Redaksi meminta perbaikan naskah. Periksa catatan revisi di bawah, lalu kirim ulang setelah disunting.",
  },
  PENDING_APPROVAL: {
    label: "Tahap Persetujuan Akhir",
    color: "bg-verity-paper text-verity-ink border-verity-ink",
    desc: "Pemeriksaan editorial selesai. Menunggu persetujuan terbit dari Pemimpin Redaksi.",
  },
  PUBLISHED: {
    label: "Telah Terbit",
    color: "bg-verity-verified/10 text-verity-verified border-verity-verified/40",
    desc: "Naskah telah disetujui dan terbit di media publik Verax Press.",
  },
  REJECTED: {
    label: "Ditolak",
    color: "bg-verity-disputed/10 text-verity-disputed border-verity-disputed",
    desc: "Naskah belum memenuhi standar editorial Verax Press pada periode ini.",
  },
  WITHDRAWN: {
    label: "Ditarik oleh Penulis",
    color: "bg-verity-paper-soft text-verity-ink-soft border-verity-rule",
    desc: "Naskah telah Anda tarik dari proses editorial.",
  },
};

function ContributorArticleEditor({ article }: { article: ArticleDetailData }) {
  const queryClient = useQueryClient();
  const id = article.id;
  const isEditable = article.status === "DRAFT" || article.status === "REVISION_NEEDED";

  const initialBody = (article.content || [])
    .map((b) => b.text || "")
    .filter(Boolean)
    .join("\n\n");

  const [title, setTitle] = useState(article.title);
  const [deck, setDeck] = useState(article.deck || "");
  const [bodyText, setBodyText] = useState(initialBody);
  const [isDirty, setIsDirty] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<"SUBMIT_WITHOUT_SOURCES" | "WITHDRAW" | null>(null);
  const [confirmDeleteSourceId, setConfirmDeleteSourceId] = useState<string | null>(null);

  // Form tambah sumber baru
  const [showAddSource, setShowAddSource] = useState(false);
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourcePublisher, setSourcePublisher] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceType, setSourceType] = useState("PRIMARY");
  const [sourceSupports, setSourceSupports] = useState("");
  const [sourceSubmitting, setSourceSubmitting] = useState(false);

  // Simpan konten naskah
  const saveMutation = useMutation({
    mutationFn: async () => {
      const contentBlocks = bodyText
        .split("\n\n")
        .map((p) => p.trim())
        .filter(Boolean)
        .map((text) => ({ type: "paragraph", text }));

      const res = await fetch(`/api/contributor/articles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          deck: deck.trim() || undefined,
          content: contentBlocks,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan naskah.");
      return data;
    },
    onSuccess: () => {
      setNotice({ type: "success", message: "Perubahan naskah berhasil disimpan." });
      setIsDirty(false);
      void queryClient.invalidateQueries({ queryKey: ["contributor-article", id] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan naskah.";
      setNotice({ type: "error", message: msg });
    },
  });

  // Transisi alur kerja (SUBMIT_REVIEW, RESUBMIT_REVIEW, WITHDRAW)
  const transitionMutation = useMutation({
    mutationFn: async (action: string) => {
      const res = await fetch(`/api/contributor/articles/${id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Gagal menjalankan aksi ${action}.`);
      return data;
    },
    onSuccess: (_data, action) => {
      const actionLabels: Record<string, string> = {
        SUBMIT_REVIEW: "Naskah berhasil diajukan ke antrean telaah redaksi.",
        RESUBMIT_REVIEW: "Revisi naskah berhasil dikirimkan kembali ke redaksi.",
        WITHDRAW: "Naskah berhasil ditarik dari proses editorial.",
      };
      setPendingAction(null);
      setNotice({
        type: "success",
        message: actionLabels[action] || "Status naskah berhasil diperbarui.",
      });
      void queryClient.invalidateQueries({ queryKey: ["contributor-article", id] });
      void queryClient.invalidateQueries({ queryKey: ["contributor-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["contributor-articles"] });
    },
    onError: (err: unknown) => {
      setPendingAction(null);
      const msg = err instanceof Error ? err.message : "Gagal mengubah status naskah.";
      setNotice({ type: "error", message: msg });
    },
  });

  // Tambah rujukan sumber
  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setSourceSubmitting(true);
    try {
      const res = await fetch(`/api/contributor/articles/${id}/sources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: sourceTitle.trim(),
          publisher: sourcePublisher.trim() || undefined,
          url: sourceUrl.trim(),
          sourceType,
          supports: sourceSupports.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambahkan rujukan sumber.");

      setShowAddSource(false);
      setSourceTitle("");
      setSourcePublisher("");
      setSourceUrl("");
      setSourceSupports("");
      setNotice({ type: "success", message: "Rujukan sumber berhasil ditambahkan." });
      void queryClient.invalidateQueries({ queryKey: ["contributor-article", id] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menambahkan sumber.";
      setNotice({ type: "error", message: msg });
    } finally {
      setSourceSubmitting(false);
    }
  };

  // Hapus rujukan sumber
  const handleDeleteSource = async (sourceId: string) => {
    try {
      const res = await fetch(`/api/contributor/articles/${id}/sources/${sourceId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus rujukan sumber.");

      setConfirmDeleteSourceId(null);
      setNotice({ type: "success", message: "Rujukan sumber dihapus." });
      void queryClient.invalidateQueries({ queryKey: ["contributor-article", id] });
    } catch (err: unknown) {
      setConfirmDeleteSourceId(null);
      const msg = err instanceof Error ? err.message : "Gagal menghapus sumber.";
      setNotice({ type: "error", message: msg });
    }
  };

  const statusMeta = STATUS_CONFIG[article.status] ?? {
    label: article.status,
    color: "bg-verity-paper-soft text-verity-ink border-verity-rule-strong",
    desc: "Status editorial terkini.",
  };

  const hasSubmit = article.allowedTransitions.some((t) => t.action === "SUBMIT_REVIEW");
  const hasResubmit = article.allowedTransitions.some((t) => t.action === "RESUBMIT_REVIEW");
  const hasWithdraw = article.allowedTransitions.some((t) => t.action === "WITHDRAW");

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-verity-rule pb-4">
        <Link
          href="/kontributor/portal"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-verity-ink-soft hover:text-verity-accent"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Kembali ke Daftar Naskah</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {isEditable && (
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !isDirty}
              variant="outline"
              size="sm"
              className="text-xs font-mono"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" aria-hidden="true" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
              )}
              Simpan Perubahan
            </Button>
          )}

          {hasSubmit && (
            <Button
              type="button"
              onClick={() => {
                if (article.sources.length === 0) {
                  setPendingAction("SUBMIT_WITHOUT_SOURCES");
                  return;
                }
                transitionMutation.mutate("SUBMIT_REVIEW");
              }}
              disabled={transitionMutation.isPending}
              size="sm"
              className="bg-verity-ink text-verity-paper hover:bg-verity-accent text-xs font-mono"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
              Ajukan ke Redaksi
            </Button>
          )}

          {hasResubmit && (
            <Button
              type="button"
              onClick={() => transitionMutation.mutate("RESUBMIT_REVIEW")}
              disabled={transitionMutation.isPending}
              size="sm"
              className="bg-verity-verified text-verity-paper hover:bg-verity-verified/90 text-xs font-mono"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
              Kirim Ulang Revisi
            </Button>
          )}

          {hasWithdraw && (
            <Button
              type="button"
              onClick={() => setPendingAction("WITHDRAW")}
              disabled={transitionMutation.isPending}
              variant="outline"
              size="sm"
              className="border-verity-disputed/40 text-verity-disputed hover:bg-verity-disputed/10 text-xs font-mono"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
              Tarik Naskah
            </Button>
          )}
        </div>
      </div>

      {/* Inline Action Confirmation */}
      {pendingAction && (
        <div
          role="region"
          aria-label="Konfirmasi tindakan naskah"
          className="p-4 rounded-xs border border-verity-unverified bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
        >
          <p className="text-verity-ink leading-relaxed">
            {pendingAction === "SUBMIT_WITHOUT_SOURCES"
              ? "Naskah belum memiliki rujukan sumber primer. Standar Verax Press mengutamakan verifikasi sumber. Tetap ajukan naskah ke meja redaksi?"
              : "Anda yakin ingin menarik naskah ini dari proses penelaahan redaksi?"}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPendingAction(null)}
              disabled={transitionMutation.isPending}
              className="font-mono text-xs h-8"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={transitionMutation.isPending}
              onClick={() =>
                transitionMutation.mutate(
                  pendingAction === "SUBMIT_WITHOUT_SOURCES" ? "SUBMIT_REVIEW" : "WITHDRAW",
                )
              }
              className={
                pendingAction === "WITHDRAW"
                  ? "bg-verity-disputed text-verity-paper hover:bg-verity-accent-deep font-mono text-xs h-8"
                  : "bg-verity-ink text-verity-paper hover:bg-verity-accent font-mono text-xs h-8"
              }
            >
              {transitionMutation.isPending
                ? "Memproses…"
                : pendingAction === "WITHDRAW"
                  ? "Ya, Tarik Naskah"
                  : "Ya, Lanjutkan Pengajuan"}
            </Button>
          </div>
        </div>
      )}

      {/* Notice Banner */}
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

      {/* Status Banner */}
      <div className={`p-4 rounded-xs border ${statusMeta.color} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider font-semibold">
              Status: {statusMeta.label}
            </span>
            <span className="text-[11px] font-mono text-verity-ink-soft">
              ({article.format} &bull; {article.desk.name})
            </span>
          </div>
          <p className="text-xs leading-relaxed text-verity-ink-soft">{statusMeta.desc}</p>
        </div>

        <div className="text-right text-[11px] font-mono shrink-0 text-verity-ink-soft">
          <p>Terakhir diperbarui:</p>
          <p className="font-semibold text-verity-ink">
            {new Date(article.updatedAt).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* Editorial Feedback / Review Notes */}
      {article.reviews.length > 0 && (
        <div className="bg-card border border-verity-rule rounded-xs p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-verity-rule pb-2 text-verity-ink">
            <Clock className="w-4 h-4 text-verity-accent" aria-hidden="true" />
            <h2 className="font-serif text-base font-bold">Catatan Penelaahan Meja Redaksi</h2>
          </div>

          <div className="space-y-3">
            {article.reviews.map((rev) => (
              <div key={rev.id} className="p-3.5 rounded-xs bg-verity-paper border border-verity-rule/60 text-xs space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[11px] text-verity-ink-soft">
                  <span className="font-semibold text-verity-ink">{rev.reviewerName}</span>
                  <span>{new Date(rev.createdAt).toLocaleString("id-ID")}</span>
                </div>
                {rev.notes ? (
                  <p className="font-serif text-verity-ink text-sm leading-relaxed">{rev.notes}</p>
                ) : (
                  <p className="italic text-verity-ink-soft font-mono text-[11px]">
                    Status dialihkan ke {rev.toStatus} tanpa catatan tambahan.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Layout: Editor (Left) & Sources/Meta (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Article Editor */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-card border border-verity-rule rounded-xs p-6 space-y-5">
            <div>
              <label
                htmlFor="edit-title"
                className="block text-xs font-mono uppercase tracking-wider text-verity-ink-soft mb-1.5"
              >
                Judul Naskah
              </label>
              {isEditable ? (
                <Input
                  id="edit-title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setIsDirty(true);
                  }}
                  className="bg-verity-paper/40 font-serif text-xl font-bold py-2 text-verity-ink"
                  placeholder="Judul naskah…"
                />
              ) : (
                <h1 className="font-serif text-2xl font-bold text-verity-ink">{article.title}</h1>
              )}
            </div>

            <div>
              <label
                htmlFor="edit-deck"
                className="block text-xs font-mono uppercase tracking-wider text-verity-ink-soft mb-1.5"
              >
                Ringkasan (Deck / Subjudul)
              </label>
              {isEditable ? (
                <Textarea
                  id="edit-deck"
                  rows={2}
                  value={deck}
                  onChange={(e) => {
                    setDeck(e.target.value);
                    setIsDirty(true);
                  }}
                  className="bg-verity-paper/40 text-sm leading-relaxed"
                  placeholder="Ringkasan naskah…"
                />
              ) : (
                <p className="text-sm font-serif text-verity-ink-soft leading-relaxed italic">
                  {article.deck || "Tidak ada ringkasan."}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="edit-body"
                  className="block text-xs font-mono uppercase tracking-wider text-verity-ink-soft"
                >
                  Isi Naskah
                </label>
                {isEditable && (
                  <span className="text-[11px] font-mono text-verity-ink-soft">
                    Pisahkan paragraf dengan baris kosong
                  </span>
                )}
              </div>

              {isEditable ? (
                <Textarea
                  id="edit-body"
                  rows={18}
                  value={bodyText}
                  onChange={(e) => {
                    setBodyText(e.target.value);
                    setIsDirty(true);
                  }}
                  className="bg-verity-paper/40 font-serif text-base leading-relaxed text-verity-ink"
                  placeholder="Mulai tulis naskah Anda…"
                />
              ) : (
                <div className="p-4 rounded-xs bg-verity-paper/50 border border-verity-rule/60 prose-verity text-sm space-y-4">
                  {article.content.map((block, i) => (
                    <p key={i} className="font-serif leading-relaxed text-verity-ink">
                      {block.text}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Reference Sources & Metadata */}
        <div className="space-y-6">
          {/* Sources Box */}
          <div className="bg-card border border-verity-rule rounded-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-verity-rule pb-3">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-verity-accent" aria-hidden="true" />
                <h2 className="font-serif text-base font-bold text-verity-ink tabular-nums">
                  Rujukan Fakta ({article.sources.length})
                </h2>
              </div>
              {isEditable && !showAddSource && (
                <Button
                  type="button"
                  onClick={() => setShowAddSource(true)}
                  size="sm"
                  variant="outline"
                  className="text-xs font-mono h-7 px-2"
                >
                  <Plus className="w-3 h-3 mr-1" aria-hidden="true" />
                  Tambah
                </Button>
              )}
            </div>

            {/* Form Tambah Sumber */}
            {showAddSource && (
              <form onSubmit={handleAddSource} className="p-4 rounded-xs bg-verity-paper border border-verity-rule space-y-3">
                <p className="font-mono text-xs uppercase font-semibold text-verity-ink">
                  Tambah Rujukan Baru
                </p>

                <div>
                  <label
                    htmlFor="source-title"
                    className="block text-[11px] font-mono uppercase text-verity-ink-soft mb-1"
                  >
                    Judul Dokumen / Rujukan *
                  </label>
                  <Input
                    id="source-title"
                    required
                    value={sourceTitle}
                    onChange={(e) => setSourceTitle(e.target.value)}
                    placeholder="Nama laporan, riset, atau putusan"
                    className="text-xs bg-card"
                  />
                </div>

                <div>
                  <label
                    htmlFor="source-publisher"
                    className="block text-[11px] font-mono uppercase text-verity-ink-soft mb-1"
                  >
                    Lembaga Penerbit
                  </label>
                  <Input
                    id="source-publisher"
                    value={sourcePublisher}
                    onChange={(e) => setSourcePublisher(e.target.value)}
                    placeholder="Contoh: BPS, Mahkamah Konstitusi, Kemensetneg"
                    className="text-xs bg-card"
                  />
                </div>

                <div>
                  <label
                    htmlFor="source-url"
                    className="block text-[11px] font-mono uppercase text-verity-ink-soft mb-1"
                  >
                    Tautan Sumber (URL) *
                  </label>
                  <Input
                    id="source-url"
                    type="url"
                    required
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    spellCheck={false}
                    autoCapitalize="none"
                    placeholder="https://…"
                    className="text-xs bg-card"
                  />
                </div>

                <div>
                  <label
                    htmlFor="source-type"
                    className="block text-[11px] font-mono uppercase text-verity-ink-soft mb-1"
                  >
                    Jenis Sumber
                  </label>
                  <Select value={sourceType} onValueChange={setSourceType}>
                    <SelectTrigger id="source-type" className="text-xs bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_TYPES.map((st) => (
                        <SelectItem key={st} value={st} className="text-xs font-mono">
                          {st}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label
                    htmlFor="source-supports"
                    className="block text-[11px] font-mono uppercase text-verity-ink-soft mb-1"
                  >
                    Klaim / Poin yang Didukung
                  </label>
                  <Textarea
                    id="source-supports"
                    rows={2}
                    value={sourceSupports}
                    onChange={(e) => setSourceSupports(e.target.value)}
                    placeholder="Penjelasan ringkas bagian data mana yang diverifikasi oleh rujukan ini"
                    className="text-xs bg-card"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="submit"
                    disabled={sourceSubmitting}
                    size="sm"
                    className="bg-verity-ink text-verity-paper hover:bg-verity-accent text-xs font-mono h-8 flex-1"
                  >
                    {sourceSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      "Simpan Sumber"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddSource(false)}
                    className="text-xs font-mono h-8"
                  >
                    Batal
                  </Button>
                </div>
              </form>
            )}

            {article.sources.length === 0 ? (
              <p className="text-xs text-verity-ink-soft font-mono text-center py-4">
                Belum ada rujukan sumber primer yang dicantumkan.
              </p>
            ) : (
              <div className="space-y-3">
                {article.sources.map((s) => {
                  const safeUrl = safeExternalHttpUrl(s.url);
                  return (
                    <div key={s.id} className="p-3 rounded-xs border border-verity-rule bg-verity-paper/50 text-xs space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        {safeUrl ? (
                          <a
                            href={safeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-verity-ink hover:text-verity-accent hover:underline flex items-center gap-1 leading-snug"
                          >
                            <span>{s.title}</span>
                            <ExternalLink className="w-3 h-3 shrink-0 opacity-60" aria-hidden="true" />
                          </a>
                        ) : (
                          <span className="font-medium text-verity-ink leading-snug">
                            {s.title}
                          </span>
                        )}
                        {isEditable && (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDeleteSourceId((prev) => (prev === s.id ? null : s.id))
                            }
                            className="text-verity-ink-soft hover:text-verity-disputed p-0.5"
                            aria-label={`Hapus rujukan ${s.title}`}
                            title="Hapus rujukan"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>

                      {confirmDeleteSourceId === s.id && (
                        <div className="p-2 rounded-xs bg-verity-disputed/10 border border-verity-disputed/30 flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] text-verity-disputed">
                            Hapus sumber ini?
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteSourceId(null)}
                              className="px-2 py-0.5 font-mono text-[11px] text-verity-ink-soft hover:text-verity-ink"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteSource(s.id)}
                              className="px-2 py-0.5 font-mono text-[11px] bg-verity-disputed text-verity-paper rounded-xs hover:bg-verity-accent-deep"
                            >
                              Ya, Hapus
                            </button>
                          </div>
                        </div>
                      )}

                      {s.publisher && (
                        <p className="text-[11px] text-verity-ink-soft font-mono">
                          Penerbit: {s.publisher}
                        </p>
                      )}
                      {s.supports && (
                        <p className="text-[11px] text-verity-ink-soft italic">
                          Mendukung: {s.supports}
                        </p>
                      )}
                      <div className="pt-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-xs bg-verity-paper-soft border border-verity-rule text-verity-ink">
                          {s.sourceType}
                        </span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-xs bg-verity-paper border border-verity-unverified/50 text-verity-ink">
                          {s.verificationStatus}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Byline and Guidelines Info */}
          <div className="bg-card border border-verity-rule rounded-xs p-5 space-y-3 text-xs">
            <h2 className="font-serif font-bold text-verity-ink">Byline & Kepengarangan</h2>
            <p className="text-verity-ink-soft">
              Naskah akan diterbitkan dengan atribusi nama publik kontributor:
            </p>
            <p className="font-serif font-semibold text-verity-ink text-sm">
              {article.byline}
            </p>
            <div className="border-t border-verity-rule pt-3 text-[11px] text-verity-ink-soft leading-relaxed">
              Nama publik dan biografi kontributor dapat diubah pada menu{" "}
              <Link href="/kontributor/portal/profil" className="text-verity-accent underline">
                Profil & Byline
              </Link>
              .
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContributorArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: response, isLoading, error } = useQuery<{ article: ArticleDetailData }>({
    queryKey: ["contributor-article", id],
    queryFn: async () => {
      const res = await fetch(`/api/contributor/articles/${id}`);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Gagal memuat detail naskah.");
      }
      return res.json();
    },
  });

  const article = response?.article;

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-3 font-mono text-xs text-verity-ink-soft">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-verity-ink" aria-hidden="true" />
        <p>Memuat naskah…</p>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-verity-disputed mx-auto" aria-hidden="true" />
        <h1 className="font-serif text-2xl font-bold text-verity-ink">
          Naskah Tidak Ditemukan
        </h1>
        <p className="text-xs text-verity-ink-soft">
          Naskah tidak tersedia atau Anda tidak memiliki hak akses ke naskah ini.
        </p>
        <Button variant="outline" className="font-mono text-xs" asChild>
          <Link href="/kontributor/portal">Kembali ke Daftar Naskah</Link>
        </Button>
      </div>
    );
  }

  return <ContributorArticleEditor article={article} key={article.updatedAt} />;
}

// Tab Sumber editor artikel: daftar referensi, verifikasi, penanda kunci, tambah/hapus.
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, apiErrorMessage } from "@/components/studio/api";
import { SOURCE_TYPE_LABELS, VERIFICATION_LABELS } from "@/lib/domain/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import type { ArticleDetailDTO, SourceDTO, SourceType, VerificationStatus } from "@/types/verity";
import { safeExternalHttpUrl } from "@/lib/url";
import { cn } from "@/lib/utils";

const VERIFICATION_COLOR: Record<VerificationStatus, string> = {
  VERIFIED: "text-verity-verified",
  UNVERIFIED: "text-verity-unverified",
  DISPUTED: "text-verity-disputed",
};

const EMPTY_ADD_FORM = {
  title: "",
  publisher: "",
  url: "",
  sourceType: "SECONDARY" as SourceType,
  publishedAt: "",
  supports: "",
  isKeySource: false,
};

export function ArticleSourcesTab({ article }: { article: ArticleDetailDTO }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ ...EMPTY_ADD_FORM });
  const [verifyTarget, setVerifyTarget] = useState<{ source: SourceDTO; status: "VERIFIED" | "DISPUTED" } | null>(null);
  const [verifyNote, setVerifyNote] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SourceDTO | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchNote, setBatchNote] = useState("");
  const [batchMarkKey, setBatchMarkKey] = useState(false);

  function applyDetail(data: ArticleDetailDTO) {
    queryClient.setQueryData(["article", article.id], data);
  }

  const addMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<ArticleDetailDTO>(`/api/studio/articles/${article.id}/sources`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      applyDetail(data);
      setAddOpen(false);
      setAddForm({ ...EMPTY_ADD_FORM });
      toast({ title: "Sumber ditambahkan", description: "Status awal: belum diverifikasi." });
    },
    onError: (error) => {
      toast({ title: "Gagal menambah sumber", description: apiErrorMessage(error), variant: "destructive" });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (input: { sourceId: string; status: "VERIFIED" | "DISPUTED"; note: string }) =>
      apiFetch<ArticleDetailDTO>(`/api/studio/articles/${article.id}/sources/${input.sourceId}`, {
        method: "PATCH",
        body: JSON.stringify({
          verificationStatus: input.status,
          verificationNote: input.note.trim() ? input.note.trim() : undefined,
        }),
      }),
    onSuccess: (data) => {
      applyDetail(data);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setVerifyTarget(null);
      setVerifyNote("");
      toast({ title: "Status verifikasi diperbarui" });
    },
    onError: (error) => {
      toast({ title: "Gagal memverifikasi", description: apiErrorMessage(error), variant: "destructive" });
    },
  });

  const verifyAllMutation = useMutation({
    mutationFn: (payload: { note?: string; markAsKeySources?: boolean }) =>
      apiFetch<ArticleDetailDTO>(`/api/studio/articles/${article.id}/sources/verify-all`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      applyDetail(data);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setBatchOpen(false);
      setBatchNote("");
      toast({
        title: "Semua sumber berhasil diverifikasi",
        description: "Status verifikasi seluruh sumber referensi telah diperbarui.",
      });
    },
    onError: (error) => {
      toast({
        title: "Gagal memverifikasi semua sumber",
        description: apiErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const keySourceMutation = useMutation({
    mutationFn: (input: { sourceId: string; isKeySource: boolean }) =>
      apiFetch<ArticleDetailDTO>(`/api/studio/articles/${article.id}/sources/${input.sourceId}`, {
        method: "PATCH",
        body: JSON.stringify({ isKeySource: input.isKeySource }),
      }),
    onSuccess: (data) => {
      applyDetail(data);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      toast({ title: "Gagal mengubah penanda kunci", description: apiErrorMessage(error), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (sourceId: string) =>
      apiFetch<ArticleDetailDTO>(`/api/studio/articles/${article.id}/sources/${sourceId}`, {
        method: "DELETE",
      }),
    onSuccess: (data) => {
      applyDetail(data);
      setDeleteTarget(null);
      toast({ title: "Sumber dihapus" });
    },
    onError: (error) => {
      toast({ title: "Gagal menghapus sumber", description: apiErrorMessage(error), variant: "destructive" });
    },
  });

  function handleAddSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addMutation.mutate({
      title: addForm.title.trim(),
      publisher: addForm.publisher.trim() ? addForm.publisher.trim() : undefined,
      url: addForm.url.trim(),
      sourceType: addForm.sourceType,
      publishedAt: addForm.publishedAt ? new Date(addForm.publishedAt).toISOString() : undefined,
      supports: addForm.supports.trim() ? addForm.supports.trim() : undefined,
      isKeySource: addForm.isKeySource,
    });
  }

  const canVerifyAny = article.sources.some((s) => s.canVerify);
  const unverifiedSources = article.sources.filter(
    (s) => s.verificationStatus !== "VERIFIED",
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-semibold text-verity-ink">Sumber Referensi</h2>
          <p className="mt-0.5 font-mono text-[11px] text-verity-ink-faint">
            {article.keySourceCount} sumber kunci · {article.unverifiedKeySourceCount} belum diverifikasi
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canVerifyAny && unverifiedSources.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={verifyAllMutation.isPending}
              onClick={() => {
                setBatchNote("");
                setBatchMarkKey(article.keySourceCount === 0);
                setBatchOpen(true);
              }}
              className="border-verity-verified/40 text-verity-ink hover:border-verity-verified hover:bg-verity-verified/5"
            >
              {verifyAllMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCheck className="size-4 text-verity-verified" aria-hidden="true" />
              )}
              Verifikasi Semua ({unverifiedSources.length})
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Tambah Sumber
          </Button>
        </div>
      </div>

      {article.sources.length === 0 ? (
        <p className="border border-dashed border-verity-rule-strong bg-card p-6 text-center text-sm text-verity-ink-soft">
          Belum ada sumber tercatat. Publikasi mensyaratkan semua sumber kunci terverifikasi.
        </p>
      ) : (
        <ul className="space-y-3">
          {article.sources.map((source) => {
            const safeSourceUrl = safeExternalHttpUrl(source.url);
            return (
            <li key={source.id} className="border border-verity-rule bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {safeSourceUrl ? (
                      <a
                        href={safeSourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-serif text-[0.95rem] font-medium text-verity-ink hover:text-verity-accent"
                      >
                        {source.title}
                        <ExternalLink className="ml-1 inline size-3" aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="font-serif text-[0.95rem] font-medium text-verity-ink">
                        {source.title}
                      </span>
                    )}
                    {source.isKeySource ? (
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-verity-accent">
                        Sumber Kunci
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-verity-ink-faint">
                    {source.publisher ? `${source.publisher} · ` : ""}
                    {SOURCE_TYPE_LABELS[source.sourceType]}
                    {source.publishedAt ? ` · terbit ${formatDate(source.publishedAt)}` : ""}
                    {source.accessedAt ? ` · akses ${formatDate(source.accessedAt)}` : ""}
                  </p>
                  {source.supports ? (
                    <p className="mt-2 text-sm text-verity-ink-soft">{source.supports}</p>
                  ) : null}
                  <p className={cn("mt-2 font-mono text-[11px]", VERIFICATION_COLOR[source.verificationStatus])}>
                    {VERIFICATION_LABELS[source.verificationStatus]}
                    {source.verifiedAt ? ` · ${formatDateTime(source.verifiedAt)}` : ""}
                  </p>
                  {source.verificationNote ? (
                    <p className="mt-1 font-mono text-[11px] text-verity-ink-faint italic">
                      Catatan: {source.verificationNote}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col items-end gap-3">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={
                        !source.canVerify ||
                        source.verificationStatus === "VERIFIED" ||
                        verifyMutation.isPending
                      }
                      onClick={() => {
                        setVerifyNote("");
                        setVerifyTarget({ source, status: "VERIFIED" });
                      }}
                    >
                      Tandai Terverifikasi
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-verity-disputed"
                      disabled={
                        !source.canVerify ||
                        source.verificationStatus === "DISPUTED" ||
                        verifyMutation.isPending
                      }
                      onClick={() => {
                        setVerifyNote("");
                        setVerifyTarget({ source, status: "DISPUTED" });
                      }}
                    >
                      Tandai Dipertanyakan
                    </Button>
                  </div>

                  {source.canVerify ? (
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`key-source-${source.id}`}
                        checked={source.isKeySource}
                        disabled={keySourceMutation.isPending}
                        onCheckedChange={(checked) =>
                          keySourceMutation.mutate({ sourceId: source.id, isKeySource: checked })
                        }
                        aria-label="Tandai sebagai sumber kunci"
                      />
                      <Label
                        htmlFor={`key-source-${source.id}`}
                        className="cursor-pointer text-xs font-normal text-verity-ink-soft"
                      >
                        Sumber kunci
                      </Label>
                    </div>
                  ) : null}

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-verity-disputed"
                    aria-label={`Hapus sumber ${source.title}`}
                    onClick={() => setDeleteTarget(source)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </li>
            );
          })}
        </ul>
      )}

      {/* Dialog: tambah sumber */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">Tambah Sumber</DialogTitle>
            <DialogDescription>
              Sumber baru selalu berstatus belum diverifikasi. Penanda kunci hanya berlaku untuk editor.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="src-title">Judul sumber</Label>
              <Input
                id="src-title"
                required
                minLength={3}
                placeholder="Mis. Siaran pers Kementerian…"
                value={addForm.title}
                onChange={(event) => setAddForm({ ...addForm, title: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="src-publisher">Penerbit</Label>
              <Input
                id="src-publisher"
                placeholder="Mis. Kantor Beritasatu"
                value={addForm.publisher}
                onChange={(event) => setAddForm({ ...addForm, publisher: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="src-url">URL</Label>
              <Input
                id="src-url"
                type="url"
                required
                placeholder="https://…"
                value={addForm.url}
                onChange={(event) => setAddForm({ ...addForm, url: event.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="src-type">Tipe</Label>
                <Select
                  value={addForm.sourceType}
                  onValueChange={(value) => setAddForm({ ...addForm, sourceType: value as SourceType })}
                >
                  <SelectTrigger id="src-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SOURCE_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="src-date">Tanggal terbit</Label>
                <Input
                  id="src-date"
                  type="date"
                  value={addForm.publishedAt}
                  onChange={(event) => setAddForm({ ...addForm, publishedAt: event.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="src-supports">Menopang klaim</Label>
              <Textarea
                id="src-supports"
                rows={2}
                placeholder="Bagian naskah mana yang ditopang sumber ini?"
                value={addForm.supports}
                onChange={(event) => setAddForm({ ...addForm, supports: event.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="src-key"
                checked={addForm.isKeySource}
                onCheckedChange={(checked) => setAddForm({ ...addForm, isKeySource: checked })}
              />
              <Label htmlFor="src-key" className="cursor-pointer text-sm font-normal">
                Tandai sebagai sumber kunci
              </Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={addMutation.isPending}>
                Batal
              </Button>
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                Tambah
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: verifikasi sumber */}
      <Dialog open={verifyTarget !== null} onOpenChange={(open) => (!open ? setVerifyTarget(null) : undefined)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {verifyTarget?.status === "VERIFIED" ? "Tandai Terverifikasi" : "Tandai Dipertanyakan"}
            </DialogTitle>
            <DialogDescription>
              {verifyTarget ? verifyTarget.source.title : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="verify-note">Catatan verifikasi (opsional)</Label>
            <Textarea
              id="verify-note"
              rows={3}
              placeholder="Bagaimana sumber ini diverifikasi?"
              value={verifyNote}
              onChange={(event) => setVerifyNote(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyTarget(null)} disabled={verifyMutation.isPending}>
              Batal
            </Button>
            <Button
              disabled={verifyMutation.isPending}
              onClick={() => {
                if (!verifyTarget) return;
                verifyMutation.mutate({
                  sourceId: verifyTarget.source.id,
                  status: verifyTarget.status,
                  note: verifyNote,
                });
              }}
            >
              {verifyMutation.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: verifikasi semua sumber */}
      <Dialog open={batchOpen} onOpenChange={(open) => (!verifyAllMutation.isPending ? setBatchOpen(open) : undefined)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Verifikasi Semua Sumber</DialogTitle>
            <DialogDescription>
              Tandai {unverifiedSources.length} sumber referensi yang belum diverifikasi menjadi Terverifikasi secara serentak.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              verifyAllMutation.mutate({
                note: batchNote.trim() ? batchNote.trim() : undefined,
                markAsKeySources: batchMarkKey,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="batch-verify-note">Catatan verifikasi (opsional)</Label>
              <Textarea
                id="batch-verify-note"
                rows={2}
                placeholder="Mis. Seluruh dokumen rujukan primer telah diperiksa meja redaksi."
                value={batchNote}
                onChange={(e) => setBatchNote(e.target.value)}
              />
            </div>

            <div className="rounded border border-verity-rule bg-verity-paper-soft p-3 space-y-1.5">
              <div className="flex items-center gap-2.5">
                <Switch
                  id="batch-mark-key"
                  checked={batchMarkKey}
                  onCheckedChange={setBatchMarkKey}
                />
                <Label htmlFor="batch-mark-key" className="cursor-pointer text-sm font-medium text-verity-ink">
                  Tandai juga sebagai Sumber Kunci
                </Label>
              </div>
              <p className="font-mono text-[10.5px] leading-relaxed text-verity-ink-faint pl-9">
                Publikasi mensyaratkan minimal 1 sumber kunci terverifikasi sebelum naskah dapat diterbitkan.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={verifyAllMutation.isPending}
                onClick={() => setBatchOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={verifyAllMutation.isPending}
                className="bg-verity-ink text-verity-paper hover:bg-verity-ink/90"
              >
                {verifyAllMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCheck className="size-4" aria-hidden="true" />
                )}
                Verifikasi Semua
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus sumber */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => (!open ? setDeleteTarget(null) : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Hapus sumber ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? deleteTarget.title : ""} akan dihapus dari artikel. Tindakan ini
              tercatat di jejak audit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-verity-paper hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (!deleteTarget) return;
                deleteMutation.mutate(deleteTarget.id);
              }}
            >
              {deleteMutation.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

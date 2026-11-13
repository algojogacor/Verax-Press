// Input gambar langsung untuk BlockEditor: unggah tunggal atau massal (hingga 10 foto/sesi)
// dalam kualitas asli (klik, seret-lepas, tempel), pemilih Pustaka Media, pratinjau, dan URL opsional.
"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  FolderOpen,
  ImageOff,
  Link2,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, apiErrorMessage } from "@/components/studio/api";
import {
  MAX_BULK_PHOTOS,
  formatFileBytes,
  uploadOriginalPhotoAsset,
  validateAndQueuePhotos,
} from "@/components/studio/media-upload-helpers";
import { safeMediaSrcUrl } from "@/lib/url";
import type { ContentBlock } from "@/lib/domain/content";

type ImageBlock = Extract<ContentBlock, { type: "image" }>;

interface MediaAssetItem {
  id: string;
  url: string;
  title: string | null;
  caption: string | null;
  creator: string | null;
  license: string | null;
  isSynthetic: boolean;
  isGeneric?: boolean;
  createdAt: string;
}

type PendingItemStatus = "pending" | "uploading" | "success" | "error";

interface PendingUploadItem {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
  alt: string;
  status: PendingItemStatus;
  errorMessage?: string;
}

interface ImageBlockFieldProps {
  block: ImageBlock;
  onPatch: (patch: Partial<ImageBlock>) => void;
  onReplaceWithBatch?: (items: ImageBlock[]) => void;
}

export function ImageBlockField({
  block,
  onPatch,
  onReplaceWithBatch,
}: ImageBlockFieldProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingRef = useRef<PendingUploadItem[]>([]);
  const uid = useId();

  const [isDragging, setIsDragging] = useState(false);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");

  // State untuk dialog atribusi sebelum unggah (Kebijakan Redaksi §3.4)
  const [pendingQueue, setPendingQueue] = useState<PendingUploadItem[]>([]);
  const [creator, setCreator] = useState("");
  const [defaultCaption, setDefaultCaption] = useState("");
  const [altText, setAltText] = useState("");
  const [license, setLicense] = useState("");
  const [isSynthetic, setIsSynthetic] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const safeUrl = safeMediaSrcUrl(block.url);
  const isCurrentUrlFailed = Boolean(safeUrl && failedUrl === safeUrl);

  useEffect(() => {
    pendingRef.current = pendingQueue;
  }, [pendingQueue]);

  useEffect(() => {
    return () => {
      for (const item of pendingRef.current) {
        URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, []);

  const mediaQuery = useQuery({
    queryKey: ["studio-media"],
    queryFn: () => apiFetch<{ assets: MediaAssetItem[] }>("/api/studio/media"),
    enabled: libraryOpen,
    staleTime: 30_000,
  });

  function resetPendingUpload() {
    for (const item of pendingQueue) {
      URL.revokeObjectURL(item.previewUrl);
    }
    setPendingQueue([]);
    setUploadError(null);
  }

  function enqueueSelection(files: FileList | File[]) {
    const isFreshDialog = pendingQueue.length === 0;
    const { accepted, rejectedReasons, overflowCount } = validateAndQueuePhotos(
      files,
      pendingQueue.length,
    );

    const noticeParts = [...rejectedReasons];
    if (overflowCount > 0) {
      noticeParts.push(
        `Maksimal ${MAX_BULK_PHOTOS} foto per sesi unggah. ${overflowCount} foto berlebih dilewati.`,
      );
    }

    if (accepted.length === 0) {
      if (noticeParts.length > 0) {
        toast({
          title: "Berkas gambar belum dapat ditambahkan",
          description: noticeParts.join(" "),
          variant: "destructive",
        });
      }
      return;
    }

    const additions: PendingUploadItem[] = accepted.map((file) => ({
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      caption: "",
      alt: "",
      status: "pending",
    }));

    if (isFreshDialog) {
      setCreator(block.credit?.trim() || "");
      setDefaultCaption(block.caption?.trim() || "");
      setAltText(block.alt?.trim() || "");
      setLicense("");
      setIsSynthetic(false);
    }

    setPendingQueue((prev) => [...prev, ...additions]);
    setUploadError(noticeParts.length > 0 ? noticeParts.join(" ") : null);
  }

  function removePendingItem(id: string) {
    setPendingQueue((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  }

  function patchPendingItem(id: string, patch: Partial<PendingUploadItem>) {
    setPendingQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  async function handleConfirmUpload(event: React.FormEvent) {
    event.preventDefault();
    const targets = pendingQueue.filter((item) => item.status !== "success");
    if (targets.length === 0) return;

    const cleanCreator = creator.trim();
    const cleanDefaultCaption = defaultCaption.trim();
    const cleanDefaultAlt = altText.trim();
    const cleanLicense = license.trim();

    if (!cleanCreator) {
      setUploadError("Pembuat/kredit fotografer wajib diisi sesuai kebijakan atribusi.");
      return;
    }

    const missingCaption = targets.some(
      (item) => !item.caption.trim() && !cleanDefaultCaption,
    );
    if (missingCaption) {
      setUploadError(
        "Keterangan gambar wajib diisi (isi keterangan dasar atau keterangan per foto).",
      );
      return;
    }

    setUploading(true);
    setUploadError(null);

    const insertedBlocks: ImageBlock[] = [];
    let failCount = 0;

    for (const item of targets) {
      patchPendingItem(item.id, { status: "uploading", errorMessage: undefined });
      const itemCaption = item.caption.trim() || cleanDefaultCaption;
      const itemAlt = item.alt.trim() || cleanDefaultAlt || itemCaption;
      try {
        const asset = await uploadOriginalPhotoAsset({
          file: item.file,
          creator: cleanCreator,
          caption: itemCaption,
          license: cleanLicense,
          isSynthetic,
        });
        patchPendingItem(item.id, { status: "success" });
        insertedBlocks.push({
          type: "image",
          url: asset.url,
          credit: asset.creator?.trim() || cleanCreator,
          caption: asset.caption?.trim() || itemCaption,
          alt: itemAlt,
        });
      } catch (err) {
        failCount += 1;
        patchPendingItem(item.id, {
          status: "error",
          errorMessage: err instanceof Error ? err.message : "Gagal mengunggah.",
        });
      }
    }

    setUploading(false);

    if (insertedBlocks.length > 0) {
      queryClient.invalidateQueries({ queryKey: ["studio-media"] });
      if (insertedBlocks.length === 1 && !onReplaceWithBatch) {
        onPatch(insertedBlocks[0]);
      } else if (onReplaceWithBatch && insertedBlocks.length > 1) {
        onReplaceWithBatch(insertedBlocks);
      } else {
        onPatch(insertedBlocks[0]);
      }
      toast({
        title:
          insertedBlocks.length === 1
            ? "Gambar berhasil diunggah dan disisipkan"
            : `${insertedBlocks.length} foto berhasil diunggah (kualitas asli) dan disisipkan`,
      });
    }

    if (failCount === 0) {
      resetPendingUpload();
    } else {
      // Hanya sisakan yang gagal agar bisa diulang
      setPendingQueue((prev) => {
        const remaining: PendingUploadItem[] = [];
        for (const item of prev) {
          if (item.status === "success") URL.revokeObjectURL(item.previewUrl);
          else remaining.push(item);
        }
        return remaining;
      });
      setUploadError(
        `${failCount} foto gagal diunggah${insertedBlocks.length > 0 ? ` (${insertedBlocks.length} foto lainnya sudah disisipkan)` : ""}.`,
      );
    }
  }

  function handleSelectFromLibrary(asset: MediaAssetItem) {
    onPatch({
      url: asset.url,
      credit: asset.creator?.trim() ? asset.creator : block.credit ?? "",
      caption: block.caption?.trim() ? block.caption : asset.caption ?? "",
      alt: block.alt?.trim() ? block.alt : asset.caption ?? asset.title ?? "",
    });
    setLibraryOpen(false);
    toast({ title: "Gambar dipilih dari Pustaka Media" });
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files?.length) {
      enqueueSelection(event.dataTransfer.files);
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const items = event.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      event.preventDefault();
      enqueueSelection(files);
    }
  }

  const assets = mediaQuery.data?.assets ?? [];
  const searchNeedle = librarySearch.trim().toLowerCase();
  const filteredAssets = searchNeedle
    ? assets.filter((item) =>
        [item.title, item.caption, item.creator, item.license]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(searchNeedle)),
      )
    : assets;

  const isBulk = pendingQueue.length > 1;

  return (
    <div className="space-y-3 sm:col-span-2">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Pilih berkas gambar dari perangkat"
        onChange={(event) => {
          if (event.target.files?.length) {
            enqueueSelection(event.target.files);
          }
          event.target.value = "";
        }}
      />

      {safeUrl ? (
        <div
          className="border border-verity-rule bg-verity-paper-soft p-3 space-y-3"
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onPaste={handlePaste}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-verity-ink-faint">
              Pratinjau Gambar
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-[11px]"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-3" aria-hidden="true" />
                Ganti / Tambah (maks. {MAX_BULK_PHOTOS})
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-[11px]"
                onClick={() => setLibraryOpen(true)}
              >
                <FolderOpen className="size-3" aria-hidden="true" />
                Pustaka Media
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={() => setShowUrlInput((prev) => !prev)}
              >
                <Link2 className="size-3" aria-hidden="true" />
                {showUrlInput ? "Tutup URL" : "Ubah URL"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px] text-verity-disputed hover:text-verity-disputed"
                onClick={() => onPatch({ url: "" })}
              >
                <Trash2 className="size-3" aria-hidden="true" />
                Hapus
              </Button>
            </div>
          </div>

          <div
            className={
              "flex min-h-[140px] max-h-72 items-center justify-center overflow-hidden border bg-verity-paper transition-colors " +
              (isDragging ? "border-verity-ink border-dashed" : "border-verity-rule")
            }
          >
            {isCurrentUrlFailed ? (
              <div className="flex flex-col items-center gap-1.5 p-6 text-center text-verity-ink-faint">
                <ImageOff className="size-6 stroke-[1.5]" aria-hidden="true" />
                <p className="font-mono text-[11px]">Gambar tidak dapat dimuat dari URL ini.</p>
              </div>
            ) : (
              <img
                src={safeUrl}
                alt={block.alt || block.caption || "Pratinjau gambar artikel"}
                className="max-h-72 w-full object-contain"
                onError={() => {
                  if (safeUrl) setFailedUrl(safeUrl);
                }}
              />
            )}
          </div>
        </div>
      ) : (
        <div
          tabIndex={0}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onPaste={handlePaste}
          className={
            "border border-dashed p-5 text-center transition-colors focus:outline-none focus:ring-1 focus:ring-verity-ink " +
            (isDragging
              ? "border-verity-ink bg-verity-paper-soft"
              : "border-verity-rule-strong bg-verity-paper-soft/60")
          }
        >
          <div className="mx-auto flex max-w-md flex-col items-center gap-2.5">
            <Upload className="size-5 text-verity-ink-soft stroke-[1.6]" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-verity-ink">
                Pilih 1 hingga {MAX_BULK_PHOTOS} foto, seret ke sini, atau tempel (Ctrl+V)
              </p>
              <p className="font-mono text-[10.5px] text-verity-ink-faint">
                JPEG, PNG, WebP · Maks. 5 MB/foto · Kualitas asli tanpa kompresi
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                className="h-8 bg-verity-ink text-verity-paper hover:bg-verity-ink/90"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-3.5" aria-hidden="true" />
                Unggah dari Perangkat
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setLibraryOpen(true)}
              >
                <FolderOpen className="size-3.5" aria-hidden="true" />
                Pilih dari Pustaka Media
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-verity-ink-soft"
                onClick={() => setShowUrlInput((prev) => !prev)}
              >
                <Link2 className="size-3.5" aria-hidden="true" />
                {showUrlInput ? "Sembunyikan URL" : "Tempel URL"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {(showUrlInput || (block.url.trim().length > 0 && !safeUrl)) && (
        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-url`} className="font-mono text-[10px] uppercase tracking-[0.12em]">
            URL Gambar (Eksternal atau Path Media)
          </Label>
          <Input
            id={`${uid}-url`}
            type="text"
            placeholder="https://… atau /uploads/…"
            value={block.url}
            onChange={(event) => onPatch({ url: event.target.value })}
          />
          {block.url.trim().length > 0 && !safeUrl ? (
            <p className="font-mono text-[10.5px] text-verity-disputed">
              URL harus diawali https://, http://, atau /.
            </p>
          ) : null}
        </div>
      )}

      {/* Dialog Konfirmasi Atribusi & Upload (1 atau hingga 10 foto) */}
      <Dialog
        open={pendingQueue.length > 0}
        onOpenChange={(open) => {
          if (!open && !uploading) resetPendingUpload();
        }}
      >
        <DialogContent className={isBulk ? "sm:max-w-2xl" : "sm:max-w-lg"}>
          <DialogHeader>
            <DialogTitle className="font-serif">
              {isBulk
                ? `Unggah & Sisipkan ${pendingQueue.length} Foto`
                : "Unggah & Sisipkan Gambar"}
            </DialogTitle>
            <DialogDescription>
              Berkas dikirim dalam kualitas asli (tanpa kompresi). Lengkapi atribusi sesuai standar redaksi.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmUpload} className="space-y-4">
            {uploadError ? (
              <div
                role="alert"
                className="flex items-start gap-2 border border-verity-disputed bg-verity-disputed-soft px-3 py-2 text-xs text-verity-disputed"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{uploadError}</span>
              </div>
            ) : null}

            {/* Daftar berkas yang dipilih */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-verity-ink-faint">
                  Antrean Berkas ({pendingQueue.length}/{MAX_BULK_PHOTOS}) · Original Quality
                </span>
                {!uploading && pendingQueue.length < MAX_BULK_PHOTOS ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="size-3" aria-hidden="true" />
                    Tambah Foto
                  </Button>
                ) : null}
              </div>

              <ul className="max-h-52 divide-y divide-verity-rule overflow-y-auto border border-verity-rule bg-verity-paper-soft">
                {pendingQueue.map((item, idx) => (
                  <li key={item.id} className="flex flex-col gap-2 p-2.5 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2.5 sm:w-52 shrink-0">
                      <img
                        src={item.previewUrl}
                        alt={item.file.name}
                        className="size-12 shrink-0 border border-verity-rule bg-verity-paper object-cover"
                      />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="truncate text-xs font-medium text-verity-ink" title={item.file.name}>
                          {String(idx + 1).padStart(2, "0")}. {item.file.name}
                        </p>
                        <p className="font-mono text-[10px] text-verity-ink-faint">
                          {formatFileBytes(item.file.size)}
                        </p>
                        {item.status === "uploading" ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-verity-ink">
                            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                            Mengunggah…
                          </span>
                        ) : item.status === "success" ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-verity-verified">
                            <CheckCircle2 className="size-3" aria-hidden="true" />
                            Tersisip
                          </span>
                        ) : item.status === "error" ? (
                          <span className="block font-mono text-[10px] text-verity-disputed">
                            {item.errorMessage}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {isBulk ? (
                      <div className="flex-1">
                        <Input
                          value={item.caption}
                          disabled={uploading || item.status === "success"}
                          onChange={(e) => patchPendingItem(item.id, { caption: e.target.value })}
                          placeholder="Keterangan khusus foto (opsional)"
                          className="h-8 bg-card text-xs"
                          aria-label={`Keterangan untuk ${item.file.name}`}
                        />
                      </div>
                    ) : null}

                    {!uploading && pendingQueue.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePendingItem(item.id)}
                        aria-label={`Hapus ${item.file.name}`}
                        className="size-7 shrink-0 text-verity-ink-faint hover:text-verity-disputed"
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor={`${uid}-creator`} className="font-mono text-[10.5px] uppercase tracking-[0.1em]">
                  Pembuat / Kredit Fotografer *
                </Label>
                <Input
                  id={`${uid}-creator`}
                  value={creator}
                  disabled={uploading}
                  onChange={(event) => setCreator(event.target.value)}
                  placeholder="Mis. Foto: Nama / Arsip Redaksi"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`${uid}-caption`} className="font-mono text-[10.5px] uppercase tracking-[0.1em]">
                  {isBulk ? "Keterangan Dasar Gambar (Caption) *" : "Keterangan Gambar (Caption) *"}
                </Label>
                <Input
                  id={`${uid}-caption`}
                  value={defaultCaption}
                  disabled={uploading}
                  onChange={(event) => setDefaultCaption(event.target.value)}
                  placeholder="Keterangan faktual yang tampil di bawah gambar"
                  required={!pendingQueue.every((item) => item.caption.trim().length > 0)}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`${uid}-alt`} className="font-mono text-[10.5px] uppercase tracking-[0.1em]">
                    Teks Alternatif (Alt)
                  </Label>
                  <Input
                    id={`${uid}-alt`}
                    value={altText}
                    disabled={uploading}
                    onChange={(event) => setAltText(event.target.value)}
                    placeholder="Opsional (otomatis dari keterangan)"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`${uid}-license`} className="font-mono text-[10.5px] uppercase tracking-[0.1em]">
                    Lisensi / Izin
                  </Label>
                  <Input
                    id={`${uid}-license`}
                    value={license}
                    disabled={uploading}
                    onChange={(event) => setLicense(event.target.value)}
                    placeholder="Mis. Arsip Redaksi, CC BY 4.0"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 pt-1 text-xs text-verity-ink select-none">
                <input
                  type="checkbox"
                  checked={isSynthetic}
                  disabled={uploading}
                  onChange={(event) => setIsSynthetic(event.target.checked)}
                  className="size-4 rounded-xs border-verity-rule-strong text-verity-accent focus:ring-verity-accent"
                />
                <span>Gambar dibuat atau dibantu AI (wajib ditandai transparan)</span>
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={resetPendingUpload}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={uploading}
                className="bg-verity-ink text-verity-paper hover:bg-verity-ink/90"
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="size-4" aria-hidden="true" />
                )}
                {isBulk ? `Unggah & Sisipkan ${pendingQueue.length} Foto` : "Unggah & Sisipkan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Pilih dari Pustaka Media Studio */}
      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Pilih dari Pustaka Media</DialogTitle>
            <DialogDescription>
              Klik salah satu aset terdaftar untuk menyisipkannya ke blok artikel ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              type="search"
              placeholder="Cari judul, keterangan, atau pembuat…"
              value={librarySearch}
              onChange={(event) => setLibrarySearch(event.target.value)}
            />

            <div className="max-h-[55vh] overflow-y-auto pr-1">
              {mediaQuery.isLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-xs text-verity-ink-soft">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  <span>Memuat pustaka media…</span>
                </div>
              ) : mediaQuery.isError ? (
                <div className="border border-verity-disputed bg-verity-disputed-soft p-4 text-center space-y-2">
                  <p className="text-xs text-verity-disputed">
                    {apiErrorMessage(mediaQuery.error)}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => mediaQuery.refetch()}
                  >
                    Coba Lagi
                  </Button>
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="border border-dashed border-verity-rule p-10 text-center space-y-2">
                  <p className="text-sm text-verity-ink-soft">
                    {assets.length === 0
                      ? "Belum ada aset media di Pustaka Media. Unggah gambar pertama langsung dari blok editor."
                      : "Tidak ada aset media yang cocok dengan kata kunci pencarian."}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {filteredAssets.map((asset) => {
                    const thumbUrl = safeMediaSrcUrl(asset.url);
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => handleSelectFromLibrary(asset)}
                        className="group flex flex-col overflow-hidden border border-verity-rule bg-card text-left transition-colors hover:border-verity-ink focus:outline-none focus:ring-1 focus:ring-verity-ink"
                      >
                        <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-verity-rule bg-verity-paper-soft flex items-center justify-center">
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt={asset.caption ?? asset.title ?? "Aset media"}
                              className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                              loading="lazy"
                            />
                          ) : (
                            <ImageOff className="size-5 text-verity-ink-faint" aria-hidden="true" />
                          )}
                          {asset.isSynthetic ? (
                            <Badge className="absolute right-1.5 top-1.5 gap-1 border border-verity-rule bg-verity-paper/95 text-[9px] uppercase text-verity-accent">
                              <Sparkles className="size-2.5" aria-hidden="true" />
                              AI
                            </Badge>
                          ) : null}
                        </div>
                        <div className="space-y-1 p-2.5">
                          <p className="line-clamp-1 font-serif text-xs font-medium text-verity-ink">
                            {asset.title ?? asset.caption ?? "Tanpa judul"}
                          </p>
                          <p className="line-clamp-1 font-mono text-[10px] text-verity-ink-faint">
                            {asset.creator ?? "Tanpa kredit"}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

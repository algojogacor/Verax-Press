// Input gambar langsung untuk BlockEditor: unggah (klik, seret-lepas, tempel),
// pemilih Pustaka Media Studio, pratinjau langsung, dan input URL eksternal opsional.
"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  FolderOpen,
  ImageOff,
  Link2,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
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
  createdAt: string;
}

const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface ImageBlockFieldProps {
  block: ImageBlock;
  onPatch: (patch: Partial<ImageBlock>) => void;
}

export function ImageBlockField({ block, onPatch }: ImageBlockFieldProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uid = useId();

  const [isDragging, setIsDragging] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");

  // State untuk dialog atribusi sebelum upload (Kebijakan Redaksi §3.4)
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [creator, setCreator] = useState("");
  const [caption, setCaption] = useState("");
  const [altText, setAltText] = useState("");
  const [license, setLicense] = useState("");
  const [isSynthetic, setIsSynthetic] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const safeUrl = safeMediaSrcUrl(block.url);

  useEffect(() => {
    setPreviewError(false);
  }, [block.url]);

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    };
  }, [pendingPreviewUrl]);

  const mediaQuery = useQuery({
    queryKey: ["studio-media"],
    queryFn: () => apiFetch<{ assets: MediaAssetItem[] }>("/api/studio/media"),
    enabled: libraryOpen,
    staleTime: 30_000,
  });

  function resetPendingUpload() {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(null);
    setPendingPreviewUrl(null);
    setUploadError(null);
  }

  function startFileSelection(file: File | null | undefined) {
    if (!file) return;
    if (!ACCEPTED_MIME.includes(file.type as (typeof ACCEPTED_MIME)[number])) {
      toast({
        title: "Format gambar belum didukung",
        description: "Gunakan berkas JPEG, PNG, atau WebP.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast({
        title: "Ukuran berkas terlalu besar",
        description: "Ukuran gambar maksimal 5 MB.",
        variant: "destructive",
      });
      return;
    }

    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(file);
    setPendingPreviewUrl(URL.createObjectURL(file));
    setCreator(block.credit?.trim() || "");
    setCaption(block.caption?.trim() || "");
    setAltText(block.alt?.trim() || "");
    setLicense("");
    setIsSynthetic(false);
    setUploadError(null);
  }

  async function handleConfirmUpload(event: React.FormEvent) {
    event.preventDefault();
    if (!pendingFile) return;

    const cleanCreator = creator.trim();
    const cleanCaption = caption.trim();
    const cleanAlt = altText.trim();
    const cleanLicense = license.trim();

    if (!cleanCreator || !cleanCaption) {
      setUploadError("Pembuat/kredit dan keterangan gambar wajib diisi sesuai kebijakan atribusi.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", pendingFile);
      formData.append("creator", cleanCreator);
      formData.append("caption", cleanCaption);
      if (cleanLicense) formData.append("license", cleanLicense);
      formData.append("isSynthetic", String(isSynthetic));

      const res = await fetch("/api/studio/media", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `Gagal mengunggah gambar (${res.status}).`);
      }

      const uploadedUrl = data?.asset?.url;
      if (typeof uploadedUrl !== "string" || !uploadedUrl) {
        throw new Error("Server tidak mengembalikan URL aset media.");
      }

      onPatch({
        url: uploadedUrl,
        credit: cleanCreator,
        caption: cleanCaption,
        alt: cleanAlt || cleanCaption,
      });

      queryClient.invalidateQueries({ queryKey: ["studio-media"] });
      toast({ title: "Gambar berhasil diunggah dan disisipkan" });
      resetPendingUpload();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Terjadi kesalahan saat mengunggah.");
    } finally {
      setUploading(false);
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
    const file = event.dataTransfer.files?.[0];
    startFileSelection(file);
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          event.preventDefault();
          startFileSelection(file);
          return;
        }
      }
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

  return (
    <div className="space-y-3 sm:col-span-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Pilih berkas gambar dari perangkat"
        onChange={(event) => {
          startFileSelection(event.target.files?.[0]);
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
                Ganti Gambar
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
            {previewError ? (
              <div className="flex flex-col items-center gap-1.5 p-6 text-center text-verity-ink-faint">
                <ImageOff className="size-6 stroke-[1.5]" aria-hidden="true" />
                <p className="font-mono text-[11px]">Gambar tidak dapat dimuat dari URL ini.</p>
              </div>
            ) : (
              <img
                src={safeUrl}
                alt={block.alt || block.caption || "Pratinjau gambar artikel"}
                className="max-h-72 w-full object-contain"
                onError={() => setPreviewError(true)}
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
                Seret gambar ke sini, tempel (Ctrl+V), atau pilih langsung
              </p>
              <p className="font-mono text-[10.5px] text-verity-ink-faint">
                JPEG, PNG, WebP · Maksimal 5 MB · Tersimpan permanen ke Pustaka Media
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

      {/* Dialog Konfirmasi Atribusi & Upload */}
      <Dialog
        open={pendingFile !== null}
        onOpenChange={(open) => {
          if (!open && !uploading) resetPendingUpload();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">Unggah &amp; Sisipkan Gambar</DialogTitle>
            <DialogDescription>
              Lengkapi kredit pembuat dan keterangan sesuai standar atribusi redaksi.
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

            {pendingPreviewUrl && pendingFile ? (
              <div className="flex items-center gap-3 border border-verity-rule bg-verity-paper-soft p-2.5">
                <img
                  src={pendingPreviewUrl}
                  alt="Pratinjau berkas yang dipilih"
                  className="size-16 shrink-0 border border-verity-rule bg-verity-paper object-cover"
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate text-xs font-medium text-verity-ink">{pendingFile.name}</p>
                  <p className="font-mono text-[10.5px] text-verity-ink-faint">
                    {pendingFile.type} · {formatBytes(pendingFile.size)}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor={`${uid}-creator`} className="font-mono text-[10.5px] uppercase tracking-[0.1em]">
                  Pembuat / Kredit Fotografer *
                </Label>
                <Input
                  id={`${uid}-creator`}
                  value={creator}
                  onChange={(event) => setCreator(event.target.value)}
                  placeholder="Mis. Foto: Nama / Arsip Redaksi"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`${uid}-caption`} className="font-mono text-[10.5px] uppercase tracking-[0.1em]">
                  Keterangan Gambar (Caption) *
                </Label>
                <Input
                  id={`${uid}-caption`}
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder="Keterangan faktual yang tampil di bawah gambar"
                  required
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
                    onChange={(event) => setLicense(event.target.value)}
                    placeholder="Mis. Arsip Redaksi, CC BY 4.0"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 pt-1 text-xs text-verity-ink select-none">
                <input
                  type="checkbox"
                  checked={isSynthetic}
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
                Unggah &amp; Sisipkan
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

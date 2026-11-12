'use client'
// Media uploader — dukung unggah massal hingga 10 foto/sesi dalam kualitas asli,
// dengan atribusi wajib (pembuat + keterangan) dan penanda aset sintetis (AI).
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Loader2, Trash2, Upload, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  MAX_BULK_PHOTOS,
  formatFileBytes,
  uploadOriginalPhotoAsset,
  validateAndQueuePhotos,
} from '@/components/studio/media-upload-helpers'

type ItemStatus = 'pending' | 'uploading' | 'success' | 'error'

interface QueuedPhoto {
  id: string
  file: File
  previewUrl: string
  title: string
  caption: string
  status: ItemStatus
  errorMessage?: string
}

export function MediaUploader() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const queueRef = useRef<QueuedPhoto[]>([])

  const [queue, setQueue] = useState<QueuedPhoto[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [creator, setCreator] = useState('')
  const [defaultCaption, setDefaultCaption] = useState('')
  const [license, setLicense] = useState('')
  const [isSynthetic, setIsSynthetic] = useState(false)

  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  useEffect(() => {
    return () => {
      for (const item of queueRef.current) {
        URL.revokeObjectURL(item.previewUrl)
      }
    }
  }, [])

  function enqueueFiles(incoming: FileList | File[]) {
    setError(null)
    setSuccess(null)

    const { accepted, rejectedReasons, overflowCount } = validateAndQueuePhotos(incoming, queue.length)
    const warnings: string[] = [...rejectedReasons]
    if (overflowCount > 0) {
      warnings.push(
        `Maksimal ${MAX_BULK_PHOTOS} foto per sesi unggah. ${overflowCount} foto tambahan dilewati.`,
      )
    }
    if (warnings.length > 0) {
      setError(warnings.join(' '))
    }

    if (accepted.length === 0) return

    const additions: QueuedPhoto[] = accepted.map((file) => ({
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      title: '',
      caption: '',
      status: 'pending',
    }))

    setQueue((prev) => [...prev, ...additions])
  }

  function removeItem(id: string) {
    setQueue((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((item) => item.id !== id)
    })
  }

  function clearQueue() {
    for (const item of queue) URL.revokeObjectURL(item.previewUrl)
    setQueue([])
    setError(null)
    setSuccess(null)
  }

  function patchItem(id: string, patch: Partial<QueuedPhoto>) {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const pendingItems = queue.filter((item) => item.status !== 'success')
    if (pendingItems.length === 0) {
      setError('Pilih minimal satu berkas gambar untuk diunggah.')
      return
    }

    const cleanCreator = creator.trim()
    const cleanDefaultCaption = defaultCaption.trim()
    if (!cleanCreator) {
      setError('Pembuat / kredit fotografer wajib diisi (kebijakan atribusi).')
      return
    }

    const missingCaption = pendingItems.some(
      (item) => !item.caption.trim() && !cleanDefaultCaption,
    )
    if (missingCaption) {
      setError(
        'Isi keterangan dasar (caption) atau lengkapi keterangan pada setiap foto sesuai kebijakan atribusi.',
      )
      return
    }

    setUploading(true)
    let successCount = 0
    let failCount = 0

    for (const item of pendingItems) {
      patchItem(item.id, { status: 'uploading', errorMessage: undefined })
      try {
        await uploadOriginalPhotoAsset({
          file: item.file,
          creator: cleanCreator,
          caption: item.caption.trim() || cleanDefaultCaption,
          title: item.title.trim(),
          license: license.trim(),
          isSynthetic,
        })
        successCount += 1
        patchItem(item.id, { status: 'success' })
      } catch (err) {
        failCount += 1
        patchItem(item.id, {
          status: 'error',
          errorMessage: err instanceof Error ? err.message : 'Gagal mengunggah berkas.',
        })
      }
    }

    setUploading(false)

    if (successCount > 0) {
      queryClient.invalidateQueries({ queryKey: ['studio-media'] })
      router.refresh()
    }

    if (failCount === 0) {
      // Bersihkan seluruh antrean yang sudah berhasil tersimpan
      setQueue((prev) => {
        for (const item of prev) URL.revokeObjectURL(item.previewUrl)
        return []
      })
      setCreator('')
      setDefaultCaption('')
      setLicense('')
      setIsSynthetic(false)
      setSuccess(
        successCount === 1
          ? '1 foto berhasil diunggah dalam kualitas asli dan tercatat.'
          : `${successCount} foto berhasil diunggah dalam kualitas asli dan tercatat.`,
      )
    } else {
      // Simpan item gagal agar bisa diperbaiki/diulang tanpa memilih ulang dari awal
      setQueue((prev) => {
        const remaining: QueuedPhoto[] = []
        for (const item of prev) {
          if (item.status === 'success') URL.revokeObjectURL(item.previewUrl)
          else remaining.push(item)
        }
        return remaining
      })
      setError(
        `${failCount} foto gagal diunggah${successCount > 0 ? ` (${successCount} foto lainnya berhasil tersimpan)` : ''}. Periksa rincian error pada daftar di bawah.`,
      )
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLFormElement>) {
    if (uploading) return
    const items = event.clipboardData?.items
    if (!items) return
    const pastedFiles: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const f = item.getAsFile()
        if (f) pastedFiles.push(f)
      }
    }
    if (pastedFiles.length > 0) {
      event.preventDefault()
      enqueueFiles(pastedFiles)
    }
  }

  const remainingToUpload = queue.filter((item) => item.status !== 'success').length

  return (
    <form
      onSubmit={handleSubmit}
      onPaste={handlePaste}
      className="border border-verity-rule bg-card rounded-md p-4 md:p-5 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-verity-ink-faint">
          Unggah aset baru (maks. {MAX_BULK_PHOTOS} foto per sesi)
        </p>
        <Badge
          variant="outline"
          className="font-mono text-[10px] uppercase tracking-[0.1em] border-verity-rule-strong text-verity-ink-soft"
        >
          Kualitas Asli · Tanpa Kompresi
        </Badge>
      </div>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-verity-disputed/30 bg-verity-disputed/10 px-3 py-2 text-[12px] text-verity-disputed"
        >
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {error}
        </p>
      )}
      {success && (
        <p className="flex items-center gap-2 rounded-md border border-verity-verified/30 bg-verity-verified/10 px-3 py-2 text-[12px] text-verity-verified">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> {success}
        </p>
      )}

      {/* Dropzone & multi-file selector */}
      <div
        onDragOver={(event) => {
          event.preventDefault()
          if (!uploading) setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          if (!uploading && event.dataTransfer.files?.length) {
            enqueueFiles(event.dataTransfer.files)
          }
        }}
        className={
          'border border-dashed p-5 text-center transition-colors ' +
          (isDragging
            ? 'border-verity-ink bg-verity-paper-soft'
            : 'border-verity-rule-strong bg-verity-paper-soft/50')
        }
      >
        <input
          ref={fileInputRef}
          id="mfile"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files?.length) enqueueFiles(e.target.files)
            e.target.value = ''
          }}
          className="sr-only"
        />

        <div className="mx-auto flex max-w-lg flex-col items-center gap-2">
          <Upload className="size-5 text-verity-ink-soft stroke-[1.6]" aria-hidden="true" />
          <p className="text-[13px] font-medium text-verity-ink">
            Pilih sekaligus hingga {MAX_BULK_PHOTOS} foto, seret ke sini, atau tempel (Ctrl+V)
          </p>
          <p className="font-mono text-[10px] text-verity-ink-faint">
            JPEG, PNG, WebP · Maks. 5 MB/foto · Berkas dikirim utuh (original quality)
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading || queue.length >= MAX_BULK_PHOTOS}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-3.5" aria-hidden="true" />
              Pilih Foto ({queue.length}/{MAX_BULK_PHOTOS})
            </Button>
            {queue.length > 0 && !uploading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-verity-disputed hover:text-verity-disputed"
                onClick={clearQueue}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Kosongkan Antrean
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Antrean foto terpilih */}
      {queue.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-verity-ink-faint">
              Antrean Unggah ({queue.length} / {MAX_BULK_PHOTOS} foto)
            </p>
          </div>
          <ul className="divide-y divide-verity-rule border border-verity-rule bg-verity-paper">
            {queue.map((item, idx) => (
              <li key={item.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start">
                <div className="flex items-start gap-3 sm:w-56 shrink-0">
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="size-14 shrink-0 border border-verity-rule bg-verity-paper-soft object-cover"
                  />
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-xs font-medium text-verity-ink" title={item.file.name}>
                      {String(idx + 1).padStart(2, '0')}. {item.file.name}
                    </p>
                    <p className="font-mono text-[10px] text-verity-ink-faint">
                      {item.file.type || 'image'} · {formatFileBytes(item.file.size)}
                    </p>
                    <div className="pt-0.5">
                      {item.status === 'uploading' && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-verity-ink">
                          <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                          Mengunggah…
                        </span>
                      )}
                      {item.status === 'success' && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-verity-verified">
                          <CheckCircle2 className="size-3" aria-hidden="true" />
                          Tersimpan
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span className="block font-mono text-[10px] text-verity-disputed">
                          Gagal: {item.errorMessage}
                        </span>
                      )}
                      {item.status === 'pending' && (
                        <span className="font-mono text-[10px] text-verity-ink-faint">
                          Menunggu (kualitas asli)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid flex-1 gap-2 sm:grid-cols-2">
                  <Input
                    value={item.title}
                    disabled={uploading || item.status === 'success'}
                    onChange={(e) => patchItem(item.id, { title: e.target.value })}
                    placeholder="Judul internal foto (opsional)"
                    className="h-8 text-xs border-verity-rule bg-card"
                    aria-label={`Judul untuk ${item.file.name}`}
                  />
                  <Input
                    value={item.caption}
                    disabled={uploading || item.status === 'success'}
                    onChange={(e) => patchItem(item.id, { caption: e.target.value })}
                    placeholder="Keterangan khusus foto (kosong = pakai keterangan dasar)"
                    className="h-8 text-xs border-verity-rule bg-card"
                    aria-label={`Keterangan untuk ${item.file.name}`}
                  />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={uploading}
                  onClick={() => removeItem(item.id)}
                  aria-label={`Hapus ${item.file.name}`}
                  className="size-8 shrink-0 self-end sm:self-start text-verity-ink-faint hover:text-verity-disputed"
                >
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Metadata atribusi batch */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="mcreator" className="font-mono text-[11px] uppercase tracking-[0.1em] text-verity-ink">
            Pembuat / Kredit Fotografer *
          </Label>
          <Input
            id="mcreator"
            value={creator}
            disabled={uploading}
            onChange={(e) => setCreator(e.target.value)}
            className="h-9 text-[13px] border-verity-rule bg-verity-paper"
            placeholder="Nama fotografer atau ilustrator"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mlicense" className="font-mono text-[11px] uppercase tracking-[0.1em] text-verity-ink">
            Lisensi / Izin Penggunaan
          </Label>
          <Input
            id="mlicense"
            value={license}
            disabled={uploading}
            onChange={(e) => setLicense(e.target.value)}
            className="h-9 text-[13px] border-verity-rule bg-verity-paper"
            placeholder="mis. CC BY 4.0, Arsip Redaksi, Izin Tertulis"
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="mcaption" className="font-mono text-[11px] uppercase tracking-[0.1em] text-verity-ink">
            Keterangan Dasar Gambar (Caption) *
          </Label>
          <Input
            id="mcaption"
            value={defaultCaption}
            disabled={uploading}
            onChange={(e) => setDefaultCaption(e.target.value)}
            className="h-9 text-[13px] border-verity-rule bg-verity-paper"
            placeholder="Deskripsi faktual yang diterapkan ke foto tanpa keterangan khusus"
          />
        </div>
      </div>

      <div className="pt-2 border-t border-verity-rule/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <label className="flex items-center gap-2.5 text-[12px] text-verity-ink cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isSynthetic}
            disabled={uploading}
            onChange={(e) => setIsSynthetic(e.target.checked)}
            className="size-4 rounded-xs border-verity-rule-strong text-verity-accent focus:ring-verity-accent"
          />
          <span>Gambar dibuat atau dibantu AI (ditandai transparan; bukan dokumentasi peristiwa)</span>
        </label>

        <Button
          type="submit"
          disabled={uploading || remainingToUpload === 0}
          className="h-9 px-5 text-[12px] font-medium uppercase tracking-[0.08em] bg-verity-ink text-verity-paper hover:bg-verity-ink/90"
        >
          {uploading ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Upload className="size-3.5 mr-1.5" />}
          {remainingToUpload > 1 ? `Unggah ${remainingToUpload} Foto` : 'Unggah Aset'}
        </Button>
      </div>
    </form>
  )
}

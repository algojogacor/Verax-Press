'use client'
// Media uploader — attribution is mandatory (creator + caption), synthetic flag.
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Upload, AlertCircle, CheckCircle2 } from 'lucide-react'

export function MediaUploader() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [creator, setCreator] = useState('')
  const [caption, setCaption] = useState('')
  const [license, setLicense] = useState('')
  const [title, setTitle] = useState('')
  const [isSynthetic, setIsSynthetic] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!file) {
      setError('Pilih berkas gambar.')
      return
    }
    if (!creator.trim() || !caption.trim()) {
      setError('Pembuat dan keterangan wajib diisi (kebijakan atribusi).')
      return
    }
    const fd = new FormData()
    fd.set('file', file)
    fd.set('creator', creator)
    fd.set('caption', caption)
    fd.set('license', license)
    fd.set('title', title)
    fd.set('isSynthetic', String(isSynthetic))

    startTransition(async () => {
      try {
        const res = await fetch('/api/studio/media', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) {
          setError(data?.error ?? 'Gagal mengunggah.')
          return
        }
        setSuccess('Aset terunggah dan tercatat.')
        setFile(null)
        setCreator('')
        setCaption('')
        setLicense('')
        setTitle('')
        setIsSynthetic(false)
        router.refresh()
      } catch {
        setError('Gagal menghubungi server.')
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-verity-rule bg-card rounded-md p-4 md:p-5 space-y-4"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-verity-ink-faint">Unggah aset baru</p>

      {error && (
        <p className="flex items-start gap-2 rounded-md border border-verity-disputed/30 bg-verity-disputed/10 px-3 py-2 text-[12px] text-verity-disputed">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {error}
        </p>
      )}
      {success && (
        <p className="flex items-center gap-2 rounded-md border border-verity-verified/30 bg-verity-verified/10 px-3 py-2 text-[12px] text-verity-verified">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> {success}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="mfile" className="text-[12px]">Berkas gambar *</Label>
          <input
            id="mfile"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-[12px] text-verity-ink border border-verity-rule rounded-md p-2 bg-verity-paper file:mr-3 file:rounded file:border-0 file:bg-verity-paper-soft file:px-2 file:py-1 file:text-[11px]"
          />
          <p className="text-[10px] text-verity-ink-faint">JPEG/PNG/WebP/GIF/SVG · maks 5 MB · validasi konten berkas.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mtitle" className="text-[12px]">Judul (opsional)</Label>
          <Input id="mtitle" value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 text-[13px]" placeholder="Nama internal aset" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mcreator" className="text-[12px]">Pembuat / kredit *</Label>
          <Input id="mcreator" value={creator} onChange={(e) => setCreator(e.target.value)} className="h-9 text-[13px]" placeholder="Nama fotografer/ilustrator" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mlicense" className="text-[12px]">Lisensi / izin</Label>
          <Input id="mlicense" value={license} onChange={(e) => setLicense(e.target.value)} className="h-9 text-[13px]" placeholder="mis. CC BY 4.0, izin tertulis" />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="mcaption" className="text-[12px]">Keterangan (caption) *</Label>
          <Input id="mcaption" value={caption} onChange={(e) => setCaption(e.target.value)} className="h-9 text-[13px]" placeholder="Deskripsi yang akan tampil di bawah gambar" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-[12px] text-verity-ink-soft">
        <input
          type="checkbox"
          checked={isSynthetic}
          onChange={(e) => setIsSynthetic(e.target.checked)}
          className="rounded border-verity-rule"
        />
        Gambar dibuat/bantuan AI (ditandai; tidak untuk dokumentasi peristiwa)
      </label>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending} className="h-9 text-[13px]">
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
          Unggah
        </Button>
      </div>
    </form>
  )
}

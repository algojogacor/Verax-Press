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
          <Label htmlFor="mfile" className="font-mono text-[11px] uppercase tracking-[0.1em] text-verity-ink">
            Berkas Gambar *
          </Label>
          <input
            id="mfile"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-[12px] text-verity-ink border border-verity-rule bg-verity-paper p-1.5 focus:border-verity-ink focus:outline-hidden file:mr-3 file:border file:border-verity-rule-strong file:bg-verity-paper-soft file:px-3 file:py-1 file:font-mono file:text-[11px] file:uppercase file:tracking-wider file:text-verity-ink file:hover:bg-card file:cursor-pointer cursor-pointer"
          />
          <p className="font-mono text-[10px] text-verity-ink-faint">
            Format: JPEG, PNG, WebP · Maksimal 5 MB · Validasi integritas berkas.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mtitle" className="font-mono text-[11px] uppercase tracking-[0.1em] text-verity-ink">
            Judul Aset (opsional)
          </Label>
          <Input id="mtitle" value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 text-[13px] border-verity-rule bg-verity-paper" placeholder="Nama internal aset" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mcreator" className="font-mono text-[11px] uppercase tracking-[0.1em] text-verity-ink">
            Pembuat / Kredit Fotografer *
          </Label>
          <Input id="mcreator" value={creator} onChange={(e) => setCreator(e.target.value)} className="h-9 text-[13px] border-verity-rule bg-verity-paper" placeholder="Nama fotografer atau ilustrator" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mlicense" className="font-mono text-[11px] uppercase tracking-[0.1em] text-verity-ink">
            Lisensi / Izin Penggunaan
          </Label>
          <Input id="mlicense" value={license} onChange={(e) => setLicense(e.target.value)} className="h-9 text-[13px] border-verity-rule bg-verity-paper" placeholder="mis. CC BY 4.0, Arsip Redaksi, Izin Tertulis" />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="mcaption" className="font-mono text-[11px] uppercase tracking-[0.1em] text-verity-ink">
            Keterangan Gambar (Caption) *
          </Label>
          <Input id="mcaption" value={caption} onChange={(e) => setCaption(e.target.value)} className="h-9 text-[13px] border-verity-rule bg-verity-paper" placeholder="Deskripsi faktual yang akan tampil di bawah gambar" />
        </div>
      </div>

      <div className="pt-2 border-t border-verity-rule/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <label className="flex items-center gap-2.5 text-[12px] text-verity-ink cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isSynthetic}
            onChange={(e) => setIsSynthetic(e.target.checked)}
            className="size-4 rounded-xs border-verity-rule-strong text-verity-accent focus:ring-verity-accent"
          />
          <span>Gambar dibuat atau dibantu AI (ditandai transparan; bukan dokumentasi peristiwa)</span>
        </label>

        <Button type="submit" disabled={pending} className="h-9 px-5 text-[12px] font-medium uppercase tracking-[0.08em] bg-verity-ink text-verity-paper hover:bg-verity-ink/90">
          {pending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Upload className="size-3.5 mr-1.5" />}
          Unggah Aset
        </Button>
      </div>
    </form>
  )
}

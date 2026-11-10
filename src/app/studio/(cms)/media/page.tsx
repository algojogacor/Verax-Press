// Media library — attribution-first asset management.
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MediaUploader } from "@/components/studio/media-uploader";
import { Badge } from "@/components/ui/badge";

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

export default async function MediaPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/studio/login");

  const assets = await db.mediaAsset.findMany({
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-verity-ink-faint">Pustaka</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-verity-ink">Media &amp; Aset Visual</h1>
        <p className="mt-1 max-w-2xl font-serif text-[13px] leading-relaxed text-verity-ink-soft">
          Setiap aset mencatat pembuat, keterangan, dan izin penggunaan (kebijakan atribusi
          redaksi). Gambar buatan AI ditandai dan tidak disajikan sebagai dokumentasi
          fotografis. Format yang diizinkan: JPEG, PNG, WebP (maks 5 MB).
        </p>
      </header>

      <MediaUploader />

      {/* Asset grid */}
      {assets.length === 0 ? (
        <div className="border border-dashed border-verity-rule px-6 py-12 text-center">
          <p className="font-serif text-[13px] text-verity-ink-soft">Belum ada aset media. Unggah aset pertama di atas.</p>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((a) => (
            <li key={a.id} className="border border-verity-rule bg-card rounded-md overflow-hidden">
              <div className="aspect-[4/3] bg-verity-paper-soft border-b border-verity-rule flex items-center justify-center overflow-hidden">
                <img
                  src={a.url}
                  alt={a.caption ?? a.title ?? "Aset media"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-serif text-[12px] font-medium leading-snug line-clamp-2 text-verity-ink">
                    {a.title ?? a.caption ?? "Tanpa judul"}
                  </p>
                  {a.isSynthetic && (
                    <Badge className="shrink-0 text-[9px] uppercase tracking-wide bg-verity-accent/15 text-verity-accent border-0">
                      AI
                    </Badge>
                  )}
                </div>
                <p className="font-mono text-[11px] text-verity-ink-soft">
                  {a.creator ? `${a.creator} · ` : ""}
                  {a.license ?? "tanpa lisensi"}
                </p>
                <p className="font-mono text-[10px] text-verity-ink-faint break-all">{a.id}</p>
                <p className="font-mono text-[10px] text-verity-ink-faint">
                  {formatDate(a.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

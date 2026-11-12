// Media library — attribution-first asset management.
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MediaUploader } from "@/components/studio/media-uploader";
import { MediaAssetCard } from "@/components/studio/media-asset-card";

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

export default async function MediaPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.accountType !== "STAFF") {
    redirect(session?.user?.accountType === "CONTRIBUTOR" ? "/kontributor/portal" : "/studio/login");
  }

  const staff = await db.staffUser.findUnique({
    where: { id: session.user.id },
    select: { status: true, role: true },
  });
  if (!staff || staff.status !== "ACTIVE" || (staff.role !== "CHIEF_EDITOR" && staff.role !== "WRITER")) {
    redirect("/studio/login");
  }

  const assets = await db.mediaAsset.findMany({
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return (
    <div className="space-y-8">
      <header className="border-b border-verity-rule pb-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-verity-ink-faint">Arsip &amp; Visual</p>
        <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-verity-ink">Pustaka Media Redaksi</h1>
        <p className="mt-2 max-w-2xl font-serif text-[13.5px] leading-relaxed text-verity-ink-soft">
          Setiap aset wajib mencatat pembuat, keterangan kontekstual, serta lisensi penggunaan.
          Aset sintetis (AI) wajib ditandai secara transparan dan tidak disajikan sebagai dokumentasi peristiwa faktual.
        </p>
      </header>

      <MediaUploader />

      {/* Asset grid */}
      <section aria-label="Daftar aset media">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-sans text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-verity-ink">
            Aset Terdaftar ({assets.length})
          </h2>
        </div>

        {assets.length === 0 ? (
          <div className="border border-dashed border-verity-rule px-6 py-12 text-center bg-card">
            <p className="font-serif text-[13px] text-verity-ink-soft">Belum ada aset media terdaftar. Unggah aset pertama di atas.</p>
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {assets.map((a) => (
              <MediaAssetCard
                key={a.id}
                id={a.id}
                url={a.url}
                title={a.title}
                caption={a.caption}
                creator={a.creator}
                license={a.license}
                isSynthetic={a.isSynthetic}
                createdAt={formatDate(a.createdAt)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

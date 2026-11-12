"use client";

import { useState } from "react";
import { Check, Copy, ImageOff, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { safeMediaSrcUrl } from "@/lib/url";

interface MediaAssetCardProps {
  id: string;
  url: string;
  title: string | null;
  caption: string | null;
  creator: string | null;
  license: string | null;
  isSynthetic: boolean;
  createdAt: string;
}

export function MediaAssetCard({
  id,
  url,
  title,
  caption,
  creator,
  license,
  isSynthetic,
  createdAt,
}: MediaAssetCardProps) {
  const [hasError, setHasError] = useState(false);
  const [copied, setCopied] = useState(false);
  const safeUrl = safeMediaSrcUrl(url);

  async function handleCopyUrl() {
    if (!safeUrl || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(safeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Abaikan jika clipboard ditolak peramban
    }
  }

  return (
    <li className="border border-verity-rule bg-card overflow-hidden transition-colors hover:border-verity-rule-strong">
      <div className="relative aspect-[4/3] bg-verity-paper-soft border-b border-verity-rule flex items-center justify-center overflow-hidden">
        {!safeUrl || hasError ? (
          <div className="flex flex-col items-center justify-center gap-1.5 p-4 text-center text-verity-ink-faint">
            <ImageOff className="size-6 stroke-[1.5]" aria-hidden="true" />
            <span className="font-mono text-[10px] uppercase tracking-wider">Pratinjau tidak tersedia</span>
          </div>
        ) : (
          <img
            src={safeUrl}
            alt={caption ?? title ?? "Aset media"}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.02]"
            loading="lazy"
            onError={() => setHasError(true)}
          />
        )}
        {isSynthetic && (
          <div className="absolute top-2 right-2">
            <Badge className="gap-1 text-[9px] uppercase tracking-wide bg-verity-paper/95 text-verity-accent border border-verity-rule backdrop-blur-xs">
              <Sparkles className="size-2.5" aria-hidden="true" />
              Sintetis (AI)
            </Badge>
          </div>
        )}
      </div>

      <div className="p-3.5 space-y-2">
        <p className="font-serif text-[13px] font-medium leading-snug line-clamp-2 text-verity-ink">
          {title ?? caption ?? "Tanpa judul"}
        </p>

        {caption && title && (
          <p className="font-serif text-[11px] italic line-clamp-2 text-verity-ink-soft leading-relaxed">
            {caption}
          </p>
        )}

        <div className="pt-1 border-t border-verity-rule/60 flex flex-col gap-0.5">
          <p className="font-mono text-[11px] text-verity-ink-soft truncate">
            {creator ? `${creator} · ` : ""}
            <span className="text-verity-ink-faint">{license ?? "tanpa lisensi"}</span>
          </p>
          <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-verity-ink-faint">
            <span className="truncate max-w-[120px]" title={id}>{id}</span>
            <div className="flex items-center gap-2">
              {safeUrl ? (
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="inline-flex items-center gap-1 border border-verity-rule px-1.5 py-0.5 text-[9.5px] uppercase tracking-[0.08em] text-verity-ink-soft transition-colors hover:border-verity-ink hover:text-verity-ink"
                >
                  {copied ? (
                    <>
                      <Check className="size-2.5 text-verity-verified" aria-hidden="true" />
                      Tersalin
                    </>
                  ) : (
                    <>
                      <Copy className="size-2.5" aria-hidden="true" />
                      Salin URL
                    </>
                  )}
                </button>
              ) : null}
              <span>{createdAt}</span>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

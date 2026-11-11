"use client";

import { useState } from "react";
import { ImageOff, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

  return (
    <li className="border border-verity-rule bg-card overflow-hidden shadow-xs transition-colors hover:border-verity-rule-strong">
      <div className="relative aspect-[4/3] bg-verity-paper-soft border-b border-verity-rule flex items-center justify-center overflow-hidden">
        {hasError ? (
          <div className="flex flex-col items-center justify-center gap-1.5 p-4 text-center text-verity-ink-faint">
            <ImageOff className="size-6 stroke-[1.5]" aria-hidden="true" />
            <span className="font-mono text-[10px] uppercase tracking-wider">Pratinjau tidak tersedia</span>
          </div>
        ) : (
          <img
            src={url}
            alt={caption ?? title ?? "Aset media"}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.02]"
            loading="lazy"
            onError={() => setHasError(true)}
          />
        )}
        {isSynthetic && (
          <div className="absolute top-2 right-2">
            <Badge className="gap-1 text-[9px] uppercase tracking-wide bg-verity-paper/95 text-verity-accent border border-verity-rule shadow-xs backdrop-blur-xs">
              <Sparkles className="size-2.5" />
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
          <div className="flex items-center justify-between font-mono text-[10px] text-verity-ink-faint">
            <span className="truncate max-w-[140px]" title={id}>{id}</span>
            <span>{createdAt}</span>
          </div>
        </div>
      </div>
    </li>
  );
}

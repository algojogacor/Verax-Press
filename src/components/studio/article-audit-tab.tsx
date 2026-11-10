// Tab Audit artikel — jejak audit terkait artikel+sumber (editor+; server menjaga 403).
"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, apiErrorMessage } from "@/components/studio/api";
import { formatDateTime } from "@/lib/format";
import type { AuditEventDTO } from "@/types/verity";

export function ArticleAuditTab({ articleId }: { articleId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["article-audit", articleId],
    queryFn: () => apiFetch<{ events: AuditEventDTO[] }>(`/api/studio/articles/${articleId}/audit`),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-8" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="border border-verity-rule bg-card p-6 text-sm text-verity-disputed">
        {apiErrorMessage(error)}
      </p>
    );
  }

  const events = data?.events ?? [];

  if (events.length === 0) {
    return (
      <p className="border border-dashed border-verity-rule-strong bg-card p-6 text-center text-sm text-verity-ink-soft">
        Belum ada kejadian audit untuk artikel ini.
      </p>
    );
  }

  return (
    <div>
      <h2 className="font-serif text-lg font-semibold text-verity-ink">Jejak Audit</h2>
      <ul className="mt-3 max-h-96 divide-y divide-verity-rule overflow-y-auto border border-verity-rule bg-card font-mono text-[11px] leading-relaxed verity-scroll">
        {events.map((event) => (
          <li key={event.id} className="px-4 py-2.5">
            <span className="text-verity-ink-faint">{formatDateTime(event.createdAt)}</span>
            <span className="text-verity-ink"> · {event.action}</span>
            <span className="text-verity-ink-faint"> · {event.actorLabel ?? "sistem"}</span>
            {event.reason ? (
              <span className="text-verity-ink-soft"> · alasan: {event.reason}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

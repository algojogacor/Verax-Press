// Dashboard studio — ringkasan newsroom (status, gate, keluhan, aktivitas).
"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, apiErrorMessage } from "@/components/studio/api";
import { ARTICLE_STATUSES, STATUS_LABELS } from "@/lib/domain/constants";
import { formatDateTime } from "@/lib/format";
import type { AuditEventDTO, SessionUser } from "@/types/verity";

interface FailedInstagramPost {
  id: string;
  articleId: string;
  articleTitle: string;
  articleSlug: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DashboardData {
  user: SessionUser;
  statusCounts: Record<string, number>;
  openComplaints: number | null;
  recentAudit: AuditEventDTO[];
  gateWarnings: { id: string; title: string; unverifiedKeySources: number }[];
  failedInstagramPosts?: FailedInstagramPost[];
  permissions: {
    canPublish: boolean;
    canReview: boolean;
    canVerifySources: boolean;
    canManageApiClients: boolean;
    canReadAudit: boolean;
  };
}

export default function StudioDashboardPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardData>("/api/studio/dashboard"),
  });

  const retryMutation = useMutation({
    mutationFn: (postId: string) =>
      apiFetch<{ status: string }>("/api/studio/instagram/retry", {
        method: "POST",
        body: JSON.stringify({ postId }),
      }),
    onSuccess: () => {
      toast({
        title: "Publikasi Instagram",
        description: "Proses publikasi ulang berhasil dijalankan.",
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Gagal Mengulang Publikasi",
        description: apiErrorMessage(err),
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="border border-verity-rule bg-card p-6">
        <h1 className="font-serif text-xl font-semibold text-verity-ink">Dashboard</h1>
        <p className="mt-2 text-sm text-verity-disputed">{apiErrorMessage(error)}</p>
      </div>
    );
  }

  const statuses = ARTICLE_STATUSES.filter((status) => (data.statusCounts[status] ?? 0) > 0);
  const totalArticles = Object.values(data.statusCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-verity-ink">Dashboard</h1>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-verity-ink-faint">
          {data.user.name} · {totalArticles} naskah terpantau
        </p>
      </div>

      {/* Peringatan Publikasi Instagram Gagal */}
      {data.failedInstagramPosts && data.failedInstagramPosts.length > 0 ? (
        <section
          aria-label="Peringatan publikasi Instagram"
          className="border border-rose-600/40 bg-rose-500/5 p-4 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 shrink-0 text-rose-600 mt-0.5" aria-hidden="true" />
            <div className="flex-1 space-y-3">
              <div>
                <h2 className="font-serif text-base font-semibold text-rose-950">
                  Peringatan Publikasi Instagram
                </h2>
                <p className="mt-0.5 text-xs text-rose-900/80">
                  Terdapat {data.failedInstagramPosts.length} naskah yang gagal dipublikasikan ke feed Instagram setelah 3 kali percobaan otomatis.
                </p>
              </div>

              <ul className="divide-y divide-rose-600/15 border-t border-rose-600/15">
                {data.failedInstagramPosts.map((post) => (
                  <li key={post.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2.5">
                    <div className="space-y-1">
                      <Link
                        href={`/studio/articles/${post.articleId}`}
                        className="font-serif text-sm font-medium text-verity-ink hover:text-rose-700 underline underline-offset-2"
                      >
                        {post.articleTitle}
                      </Link>
                      <div className="flex items-center gap-2 font-mono text-[11px] text-rose-800/80">
                        <span>{post.attempts} kali percobaan gagal</span>
                        {post.lastError && (
                          <span className="truncate max-w-md">· {post.lastError}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-rose-600/30 text-rose-900 hover:bg-rose-600/10"
                        onClick={() => retryMutation.mutate(post.id)}
                        disabled={retryMutation.isPending}
                      >
                        {retryMutation.isPending ? (
                          <Loader2 className="size-3.5 animate-spin mr-1.5" />
                        ) : (
                          <RefreshCw className="size-3.5 mr-1.5" />
                        )}
                        Coba Ulang Publikasi
                      </Button>
                      <Link
                        href={`/studio/articles/${post.articleId}`}
                        className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-verity-ink-soft hover:text-verity-ink px-2 py-1"
                      >
                        Lihat Naskah
                        <ArrowRight className="size-3" aria-hidden="true" />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {/* Ringkasan status: terdistribusi proporsional dalam kisi redaksi */}
      {statuses.length > 0 ? (
        <section aria-label="Jumlah naskah per status" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
          {statuses.map((status) => (
            <div key={status} className="border border-verity-rule bg-card p-4 transition-colors hover:border-verity-rule-strong">
              <p className="font-serif text-3xl font-semibold leading-none text-verity-ink">
                {data.statusCounts[status]}
              </p>
              <p className="mt-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-verity-ink-soft">
                {STATUS_LABELS[status]}
              </p>
            </div>
          ))}
        </section>
      ) : (
        <p className="text-sm text-verity-ink-soft">Belum ada naskah yang terpantau.</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Perlu perhatian: gate publish */}
        <section aria-label="Perlu perhatian" className="border border-verity-rule bg-card p-4 sm:p-6">
          <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-verity-ink">
            <AlertTriangle className="size-4 text-verity-accent" aria-hidden="true" />
            Naskah Menunggu Persetujuan
          </h2>
          {data.gateWarnings.length === 0 ? (
            <p className="mt-3 text-sm text-verity-ink-soft">
              Tidak ada naskah yang sedang menunggu persetujuan redaktur pelaksana.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-verity-rule">
              {data.gateWarnings.map((warning) => (
                <li key={warning.id} className="py-3">
                  <Link
                    href={`/studio/articles/${warning.id}`}
                    className="group flex items-start justify-between gap-3"
                  >
                    <span>
                      <span className="font-serif text-[0.95rem] font-medium text-verity-ink group-hover:text-verity-accent">
                        {warning.title}
                      </span>
                      {warning.unverifiedKeySources > 0 ? (
                        <span className="mt-1 block font-mono text-[11px] font-medium text-verity-unverified">
                          • {warning.unverifiedKeySources} sumber kunci belum diverifikasi
                        </span>
                      ) : (
                        <span className="mt-1 block font-mono text-[11px] font-medium text-verity-verified">
                          ✓ Seluruh sumber kunci terverifikasi · Siap diterbitkan
                        </span>
                      )}
                    </span>
                    <ArrowRight
                      className="mt-1 size-4 shrink-0 text-verity-ink-faint group-hover:text-verity-accent"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Keluhan terbuka */}
        {data.openComplaints != null ? (
          <section aria-label="Keluhan terbuka" className="border border-verity-rule bg-card p-4 sm:p-6">
            <h2 className="font-serif text-lg font-semibold text-verity-ink">Keluhan Pembaca Terbuka</h2>
            <div className="mt-3 flex items-center gap-4">
              <p className="font-serif text-3xl font-semibold leading-none text-verity-ink">
                {data.openComplaints}
              </p>
              <Link
                href="/studio/complaints"
                className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.1em] text-verity-accent hover:text-verity-accent-deep underline underline-offset-4"
              >
                Buka register keluhan
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
            <p className="mt-2 text-sm text-verity-ink-soft">
              Keluhan berstatus diterima atau sedang dalam penelaahan tim editorial.
            </p>
          </section>
        ) : null}

        {/* Aktivitas terakhir */}
        {data.recentAudit.length > 0 ? (
          <section
            aria-label="Aktivitas terakhir"
            className={`border border-verity-rule bg-card p-4 sm:p-6 ${data.openComplaints == null ? "lg:col-span-2" : ""}`}
          >
            <h2 className="font-serif text-lg font-semibold text-verity-ink">Log Aktivitas Redaksi Terkini</h2>
            <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1 font-mono text-[11px] leading-relaxed text-verity-ink-soft verity-scroll">
              {data.recentAudit.map((event) => (
                <li key={event.id} className="border-b border-verity-rule/60 pb-1.5 last:border-0 last:pb-0">
                  <span className="font-medium text-verity-ink">{event.action}</span>
                  <span className="text-verity-ink-faint"> · {event.actorLabel ?? "sistem"}</span>
                  <span className="text-verity-ink-faint"> · {formatDateTime(event.createdAt)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

// Tab Alur & Versi: timeline review editorial, riwayat versi, editor kredit kontribusi.
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, apiErrorMessage } from "@/components/studio/api";
import {
  CONTRIBUTION_ROLE_LABELS,
  STATUS_LABELS,
  VERSION_TYPE_LABELS,
} from "@/lib/domain/constants";
import { formatDateTime } from "@/lib/format";
import type { ArticleDetailDTO, ContributionRole } from "@/types/verity";

const REVIEW_DECISION_LABELS: Record<string, string> = {
  SUBMIT_REVIEW: "Ajukan penelaahan",
  START_FACT_CHECK: "Mulai uji fakta",
  REQUEST_REVISION: "Minta revisi",
  SUBMIT_FOR_APPROVAL: "Ajukan persetujuan",
  PUBLISH: "Terbitkan",
  REJECT: "Tolak",
  RESUBMIT_REVIEW: "Kirim ulang penelaahan",
  WITHDRAW: "Tarik",
  RETRACT: "Cabut",
  ARCHIVE: "Arsipkan",
};

interface ContributionRow {
  personName: string;
  role: ContributionRole;
  publicCredit: boolean;
}

export function ArticleWorkflowTab({ article }: { article: ArticleDetailDTO }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const isChiefEditor = session?.user.role === "CHIEF_EDITOR";

  const [rows, setRows] = useState<ContributionRow[]>(() =>
    article.contributions.map((contribution) => ({
      personName: contribution.personName,
      role: contribution.role,
      publicCredit: contribution.publicCredit,
    })),
  );

  const saveCreditsMutation = useMutation({
    mutationFn: (contributions: ContributionRow[]) =>
      apiFetch<ArticleDetailDTO>(`/api/studio/articles/${article.id}`, {
        method: "PATCH",
        body: JSON.stringify({ contributions }),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["article", article.id], data);
      toast({ title: "Kredit kontribusi disimpan" });
    },
    onError: (error) => {
      toast({
        title: "Gagal menyimpan kredit",
        description: apiErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  function updateRow(index: number, patch: Partial<ContributionRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function handleSaveCredits() {
    const invalid = rows.some((row) => row.personName.trim().length < 2);
    if (invalid) {
      toast({
        title: "Nama kontributor belum valid",
        description: "Nama minimal 2 karakter.",
        variant: "destructive",
      });
      return;
    }
    saveCreditsMutation.mutate(rows);
  }

  return (
    <div className="space-y-8">
      {/* Timeline review */}
      <section aria-label="Alur editorial">
        <h2 className="font-serif text-lg font-semibold text-verity-ink">Alur Editorial</h2>
        {article.reviews.length === 0 ? (
          <p className="mt-3 text-sm text-verity-ink-soft">Belum ada keputusan editorial tercatat.</p>
        ) : (
          <ol className="mt-3 space-y-0 border-l border-verity-rule pl-0">
            {article.reviews.map((review) => (
              <li key={review.id} className="relative border-b border-verity-rule py-3 pl-6 last:border-b-0">
                <span
                  className="absolute top-[1.15rem] left-0 size-2 -translate-x-[3.5px] rounded-full bg-verity-rule-strong"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-verity-ink">
                  {REVIEW_DECISION_LABELS[review.decision] ?? review.decision}
                  <span className="font-normal text-verity-ink-soft"> · {review.reviewerName}</span>
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-verity-ink-faint">
                  {STATUS_LABELS[review.fromStatus]} → {STATUS_LABELS[review.toStatus]} ·{" "}
                  {formatDateTime(review.createdAt)}
                </p>
                {review.notes ? (
                  <p className="mt-1.5 border-l-2 border-verity-rule pl-3 text-sm text-verity-ink-soft italic">
                    {review.notes}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Versi */}
      <section aria-label="Riwayat versi">
        <h2 className="font-serif text-lg font-semibold text-verity-ink">Versi Naskah</h2>
        {article.versions.length === 0 ? (
          <p className="mt-3 text-sm text-verity-ink-soft">Belum ada versi tersimpan.</p>
        ) : (
          <ul className="mt-3 divide-y divide-verity-rule border border-verity-rule bg-card">
            {article.versions.map((version) => (
              <li key={version.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-verity-ink">
                    Versi #{version.versionNo}
                    <span className="ml-2 font-mono text-[11px] font-normal uppercase tracking-[0.12em] text-verity-ink-faint">
                      {VERSION_TYPE_LABELS[version.versionType]}
                    </span>
                  </p>
                  {version.changeReason ? (
                    <p className="mt-0.5 text-sm text-verity-ink-soft">{version.changeReason}</p>
                  ) : null}
                </div>
                <p className="font-mono text-[11px] text-verity-ink-faint">
                  {version.createdByLabel} · {formatDateTime(version.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Kredit kontribusi: hanya editor ke atas */}
      {isChiefEditor ? (
        <section aria-label="Kredit kontribusi" className="border border-verity-rule bg-card p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-lg font-semibold text-verity-ink">Kredit Kontribusi</h2>
              <p className="mt-0.5 text-sm text-verity-ink-soft">
                Identitas publik peran di naskah ini (disimpan terpisah dari konten).
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleSaveCredits}
              disabled={saveCreditsMutation.isPending}
            >
              {saveCreditsMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="size-4" aria-hidden="true" />
              )}
              Simpan Kredit
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {rows.length === 0 ? (
              <p className="text-sm text-verity-ink-soft">Belum ada kontributor tercatat.</p>
            ) : null}
            {rows.map((row, index) => (
              <div
                key={index}
                className="grid items-center gap-3 rounded-[2px] border border-verity-rule px-3 py-2.5 sm:grid-cols-[1fr_11rem_auto_auto]"
              >
                <Input
                  aria-label="Nama kontributor"
                  placeholder="Nama lengkap"
                  value={row.personName}
                  onChange={(event) => updateRow(index, { personName: event.target.value })}
                />
                <Select
                  value={row.role}
                  onValueChange={(value) => updateRow(index, { role: value as ContributionRole })}
                >
                  <SelectTrigger className="w-full" aria-label="Peran kontribusi">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTRIBUTION_ROLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-verity-ink-soft">
                  <Checkbox
                    checked={row.publicCredit}
                    onCheckedChange={(checked) =>
                      updateRow(index, { publicCredit: checked === true })
                    }
                    aria-label="Tampilkan kredit publik"
                  />
                  Kredit publik
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-verity-disputed"
                  aria-label="Hapus baris kontributor"
                  onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                >
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() =>
              setRows((prev) => [...prev, { personName: "", role: "REPORTER", publicCredit: true }])
            }
          >
            <Plus className="size-4" aria-hidden="true" />
            Tambah Baris
          </Button>
        </section>
      ) : null}
    </div>
  );
}

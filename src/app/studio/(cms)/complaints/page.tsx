// Register keluhan studio — pengelolaan status + terbitkan koreksi terkait artikel.
"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, apiErrorMessage } from "@/components/studio/api";
import { COMPLAINT_STATUS_LABELS, COMPLAINT_TYPE_LABELS } from "@/lib/domain/constants";
import { formatDateTime } from "@/lib/format";
import type { ComplaintDTO, ComplaintStatus, SessionUser } from "@/types/verity";

const FILTER_ALL = "SEMUA";

/** Cermin alur status untuk UX; server tetap memvalidasi ulang. */
const ALLOWED_NEXT: Record<ComplaintStatus, ComplaintStatus[]> = {
  RECEIVED: ["IN_REVIEW", "RESOLVED", "REJECTED"],
  IN_REVIEW: ["RESOLVED", "REJECTED"],
  RESOLVED: [],
  REJECTED: [],
};

interface DashboardPermissionData {
  user: SessionUser;
  permissions: { canManageComplaints: boolean };
}

function ComplaintCard({ complaint }: { complaint: ComplaintDTO }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusDraft, setStatusDraft] = useState<string>("");
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decision, setDecision] = useState("");
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [publicNote, setPublicNote] = useState("");

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["complaints"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  const patchMutation = useMutation({
    mutationFn: (payload: { status: ComplaintStatus; decision?: string }) =>
      apiFetch<ComplaintDTO>(`/api/studio/complaints/${complaint.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: (data, variables) => {
      refresh();
      setStatusDraft("");
      setDecisionOpen(false);
      setDecision("");
      toast({
        title: "Status keluhan diperbarui",
        description: `${complaint.refCode} → ${COMPLAINT_STATUS_LABELS[data.status] ?? data.status}${
          variables.decision ? "" : ""
        }`,
      });
    },
    onError: (error) => {
      toast({
        title: "Gagal memperbarui keluhan",
        description: apiErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const correctionMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ correctionId: string }>("/api/studio/corrections", {
        method: "POST",
        body: JSON.stringify({
          articleId: complaint.articleId,
          summary: summary.trim(),
          publicNote: publicNote.trim(),
          complaintId: complaint.id,
        }),
      }),
    onSuccess: () => {
      refresh();
      setCorrectionOpen(false);
      setSummary("");
      setPublicNote("");
      toast({ title: "Koreksi diterbitkan & artikel diperbarui" });
    },
    onError: (error) => {
      toast({
        title: "Gagal menerbitkan koreksi",
        description: apiErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const nextStatuses = ALLOWED_NEXT[complaint.status];
  const terminal = nextStatuses.length === 0;

  function handleApplyStatus() {
    const target = statusDraft as ComplaintStatus;
    if (!target) return;
    if (target === "RESOLVED" || target === "REJECTED") {
      setDecision("");
      setDecisionOpen(true);
      return;
    }
    patchMutation.mutate({ status: target });
  }

  return (
    <article className="border border-verity-rule bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div>
          <p className="font-mono text-xs tracking-[0.08em] text-verity-ink">{complaint.refCode}</p>
          <p className="mt-1 text-sm font-medium text-verity-ink">
            {COMPLAINT_TYPE_LABELS[complaint.type]}
            {complaint.articleId && complaint.articleSlug ? (
              <>
                {" · "}
                <Link
                  href={`/studio/articles/${complaint.articleId}`}
                  className="text-verity-accent hover:text-verity-accent-deep"
                >
                  {complaint.articleTitle}
                </Link>
                <a
                  href={`/artikel/${complaint.articleSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 inline-flex items-center gap-0.5 font-mono text-[11px] text-verity-ink-faint hover:text-verity-accent"
                >
                  (publik
                  <ExternalLink className="size-3" aria-hidden="true" />)
                </a>
              </>
            ) : null}
          </p>
        </div>
        <p className="border border-verity-rule px-2.5 py-1 text-xs text-verity-ink-soft">
          {COMPLAINT_STATUS_LABELS[complaint.status] ?? complaint.status}
        </p>
      </div>

      <p className="mt-2 font-mono text-[11px] text-verity-ink-faint">
        {complaint.senderName} · {complaint.senderEmail} · {formatDateTime(complaint.createdAt)} ·
        Tenggat: {complaint.deadline ? formatDateTime(complaint.deadline) : "—"}
      </p>

      <p className="mt-3 border-l-2 border-verity-rule pl-3 text-sm leading-relaxed text-verity-ink-soft">
        {complaint.message}
      </p>

      {complaint.decision ? (
        <p className="mt-3 font-mono text-[11px] text-verity-ink-soft">
          Keputusan: {complaint.decision}
          {complaint.decidedAt ? ` · ${formatDateTime(complaint.decidedAt)}` : ""}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-verity-rule pt-4">
        {!terminal ? (
          <div className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label className="font-mono text-[10px] uppercase tracking-[0.12em]">Ubah status</Label>
              <Select value={statusDraft} onValueChange={setStatusDraft}>
                <SelectTrigger className="w-48" aria-label="Pilih status baru">
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  {nextStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {COMPLAINT_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={!statusDraft || patchMutation.isPending}
              onClick={handleApplyStatus}
            >
              {patchMutation.isPending && patchMutation.variables?.status === statusDraft ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Terapkan
            </Button>
          </div>
        ) : null}

        {complaint.articleId ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSummary("");
              setPublicNote("");
              setCorrectionOpen(true);
            }}
          >
            Terbitkan Koreksi
          </Button>
        ) : null}
      </div>

      {/* Dialog keputusan wajib */}
      <Dialog open={decisionOpen} onOpenChange={setDecisionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {statusDraft === "RESOLVED" ? "Selesaikan keluhan" : "Tolak keluhan"}
            </DialogTitle>
            <DialogDescription>
              Keputusan wajib diisi untuk status {statusDraft ? COMPLAINT_STATUS_LABELS[statusDraft as ComplaintStatus] : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="decision">Keputusan (wajib)</Label>
            <Textarea
              id="decision"
              rows={3}
              placeholder="Dasar keputusan atas keluhan ini…"
              value={decision}
              onChange={(event) => setDecision(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionOpen(false)} disabled={patchMutation.isPending}>
              Batal
            </Button>
            <Button
              disabled={!decision.trim() || patchMutation.isPending}
              onClick={() =>
                patchMutation.mutate({
                  status: statusDraft as ComplaintStatus,
                  decision: decision.trim(),
                })
              }
            >
              {patchMutation.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Simpan Keputusan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog koreksi */}
      <Dialog open={correctionOpen} onOpenChange={setCorrectionOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">Terbitkan Koreksi</DialogTitle>
            <DialogDescription>
              Koreksi membuat catatan publik, versi editorial baru, dan mengubah status artikel
              menjadi Dikoreksi. Keluhan {complaint.refCode} akan otomatis selesai.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="correction-summary">Ringkasan koreksi</Label>
              <Textarea
                id="correction-summary"
                rows={2}
                placeholder="Ringkasan singkat apa yang dikoreksi…"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="correction-note">Catatan publik</Label>
              <Textarea
                id="correction-note"
                rows={3}
                placeholder="Catatan yang tampil di log koreksi publik…"
                value={publicNote}
                onChange={(event) => setPublicNote(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCorrectionOpen(false)} disabled={correctionMutation.isPending}>
              Batal
            </Button>
            <Button
              disabled={
                summary.trim().length < 10 || publicNote.trim().length < 10 || correctionMutation.isPending
              }
              onClick={() => correctionMutation.mutate()}
            >
              {correctionMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Terbitkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}

export default function StudioComplaintsPage() {
  const [statusFilter, setStatusFilter] = useState<string>(FILTER_ALL);

  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardPermissionData>("/api/studio/dashboard"),
    staleTime: 30_000,
  });

  const canManage = dashboard?.permissions.canManageComplaints ?? false;

  const params = new URLSearchParams();
  if (statusFilter !== FILTER_ALL) params.set("status", statusFilter);
  const queryString = params.toString();

  const { data, isLoading, error } = useQuery({
    queryKey: ["complaints", { status: statusFilter }],
    queryFn: () =>
      apiFetch<{ complaints: ComplaintDTO[] }>(
        `/api/studio/complaints${queryString ? `?${queryString}` : ""}`,
      ),
    enabled: canManage,
  });

  if (dashboardLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-40" />
        ))}
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="border border-verity-rule bg-card p-8">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 size-5 text-verity-disputed" aria-hidden="true" />
          <div>
            <h1 className="font-serif text-xl font-semibold text-verity-ink">Akses ditolak</h1>
            <p className="mt-1 text-sm text-verity-ink-soft">
              Anda tidak memiliki izin mengelola keluhan (complaint:manage). Hubungi Chief Editor
              bila Anda memerlukan akses.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const complaints = data?.complaints ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-verity-ink">Keluhan</h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-verity-ink-faint">
            Register hak jawab, hak koreksi, dan keluhan
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="complaint-filter">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger id="complaint-filter" className="w-52">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>Semua status</SelectItem>
              {Object.entries(COMPLAINT_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      ) : error ? (
        <div className="border border-verity-rule bg-card p-6">
          <p className="text-sm text-verity-disputed">{apiErrorMessage(error)}</p>
        </div>
      ) : complaints.length === 0 ? (
        <p className="border border-dashed border-verity-rule-strong bg-card p-8 text-center text-sm text-verity-ink-soft">
          Tidak ada keluhan pada filter ini.
        </p>
      ) : (
        <div className="space-y-4">
          {complaints.map((complaint) => (
            <ComplaintCard key={complaint.id} complaint={complaint} />
          ))}
        </div>
      )}
    </div>
  );
}

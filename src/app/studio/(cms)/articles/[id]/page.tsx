// Ruang penyuntingan naskah: tampilan kerja utama studio dengan status, bilah transisi, dan panel kerja.
"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, apiErrorMessage } from "@/components/studio/api";
import { ArticleContentTab } from "@/components/studio/article-content-tab";
import { ArticleSourcesTab } from "@/components/studio/article-sources-tab";
import { ArticleWorkflowTab } from "@/components/studio/article-workflow-tab";
import { ArticleCommentsTab } from "@/components/studio/article-comments-tab";
import { ArticleAuditTab } from "@/components/studio/article-audit-tab";
import { AI_PLACEHOLDER_BYLINE, AI_SUBSTANTIVE_NOTE_DEFAULT, FORMAT_LABELS, ORIGIN_LABELS, STATUS_LABELS } from "@/lib/domain/constants";
import { formatDateTime, statusDotClass } from "@/lib/format";
import type { ArticleDetailDTO, TransitionAction } from "@/types/verity";
import { cn } from "@/lib/utils";

type AvailableTransition = ArticleDetailDTO["availableTransitions"][number];

function transitionVariant(action: TransitionAction): "default" | "outline" | "destructive" {
  if (action === "PUBLISH") return "default";
  if (action === "REJECT" || action === "WITHDRAW" || action === "RETRACT") return "destructive";
  return "outline";
}

export default function ArticleEditorPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const isChiefEditor = session?.user.role === "CHIEF_EDITOR";

  const { data: article, isLoading, error } = useQuery({
    queryKey: ["article", id],
    queryFn: () => apiFetch<ArticleDetailDTO>(`/api/studio/articles/${id}`),
  });

  const [reasonTarget, setReasonTarget] = useState<AvailableTransition | null>(null);
  const [reason, setReason] = useState("");

  // Alur penerbitan cepat (streamlined publish flow)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishByline, setPublishByline] = useState("");
  const [publishAiPublic, setPublishAiPublic] = useState(true);
  const [publishAiNote, setPublishAiNote] = useState("");

  const transitionMutation = useMutation({
    mutationFn: (input: {
      action: TransitionAction;
      reason?: string;
      byline?: string;
      aiDisclosurePublic?: boolean;
      aiDisclosureNote?: string;
      autoConfirm?: boolean;
    }) =>
      apiFetch<ArticleDetailDTO>(`/api/studio/articles/${id}/transition`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["article", id], data);
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setReasonTarget(null);
      setReason("");
      setPublishDialogOpen(false);
      toast({
        title: "Transisi berhasil",
        description: `Status sekarang: ${STATUS_LABELS[data.status]}.`,
      });
    },
    onError: (mutationError) => {
      // Pesan gate (mis. sumber kunci belum diverifikasi) ditampilkan utuh.
      toast({
        title: "Transisi gagal",
        description: apiErrorMessage(mutationError),
        variant: "destructive",
      });
    },
  });

  function handleTransition(transition: AvailableTransition) {
    if (transition.requiresReason) {
      setReason("");
      setReasonTarget(transition);
      return;
    }

    if (transition.action === "PUBLISH" && article) {
      const initialByline =
        !article.byline?.trim() || article.byline === AI_PLACEHOLDER_BYLINE
          ? "Disunting oleh Redaksi Verax Press"
          : article.byline;
      setPublishByline(initialByline);
      setPublishAiPublic(article.aiInvolvement === "substantive" ? true : article.aiDisclosurePublic);
      setPublishAiNote(article.aiDisclosureNote?.trim() || AI_SUBSTANTIVE_NOTE_DEFAULT);
      setPublishDialogOpen(true);
      return;
    }

    transitionMutation.mutate({ action: transition.action });
  }

  function handleConfirmPublish() {
    transitionMutation.mutate({
      action: "PUBLISH",
      byline: publishByline.trim() || "Disunting oleh Redaksi Verax Press",
      aiDisclosurePublic: publishAiPublic,
      aiDisclosureNote: publishAiNote.trim(),
      autoConfirm: true,
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-40" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="space-y-4">
        <Link
          href="/studio/articles"
          className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-verity-ink-faint hover:text-verity-accent"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Semua artikel
        </Link>
        <div className="border border-verity-rule bg-card p-6">
          <h1 className="font-serif text-xl font-semibold text-verity-ink">Artikel tidak dapat dimuat</h1>
          <p className="mt-2 text-sm text-verity-disputed">{apiErrorMessage(error)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/studio/articles"
        className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-verity-ink-faint transition-colors hover:text-verity-accent"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Semua artikel
      </Link>

      {/* Header */}
      <header className="border-b border-verity-rule pb-5">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <h1 className="max-w-3xl font-serif text-2xl font-semibold leading-tight text-verity-ink sm:text-[1.75rem]">
            {article.title}
          </h1>
          <p className="flex items-center gap-2 border border-verity-rule bg-card px-3 py-1.5 text-sm text-verity-ink">
            <span
              className={cn("inline-block size-2.5 rounded-full", statusDotClass(article.status))}
              aria-hidden="true"
            />
            <span className="font-medium">{STATUS_LABELS[article.status]}</span>
          </p>
        </div>

        <p className="mt-2 font-mono text-[11px] tracking-[0.04em] text-verity-ink-faint">
          {article.desk.name} · {FORMAT_LABELS[article.format]} ·{" "}
          {ORIGIN_LABELS[article.origin] ?? article.origin} · {article.byline} · Diperbarui{" "}
          {formatDateTime(article.updatedAt)}
        </p>
        {article.unverifiedKeySourceCount > 0 ? (
          <p className="mt-2 font-mono text-[11px] text-verity-unverified">
            {article.unverifiedKeySourceCount} sumber kunci belum diverifikasi; gerbang publikasi terkunci.
          </p>
        ) : null}

        {/* Bar transisi */}
        {article.availableTransitions.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Aksi alur kerja">
            {article.availableTransitions.map((transition) => (
              <Button
                key={`${transition.action}-${transition.to}`}
                size="sm"
                variant={transitionVariant(transition.action)}
                disabled={transitionMutation.isPending}
                onClick={() => handleTransition(transition)}
              >
                {transitionMutation.isPending &&
                transitionMutation.variables?.action === transition.action ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : null}
                {transition.label}
              </Button>
            ))}
          </div>
        ) : null}
      </header>

      {/* Tab konten editor */}
      <Tabs key={article.id} defaultValue="content">
        <TabsList className="h-auto w-full justify-start gap-0 rounded-none border-b border-verity-rule bg-transparent p-0">
          <TabsTrigger
            value="content"
            className="flex-none rounded-none border-b-2 border-transparent px-4 py-2.5 data-[state=active]:border-verity-ink data-[state=active]:bg-transparent data-[state=active]:text-verity-ink data-[state=active]:shadow-none"
          >
            Konten
          </TabsTrigger>
          <TabsTrigger
            value="sources"
            className="flex-none rounded-none border-b-2 border-transparent px-4 py-2.5 data-[state=active]:border-verity-ink data-[state=active]:bg-transparent data-[state=active]:text-verity-ink data-[state=active]:shadow-none"
          >
            Sumber
          </TabsTrigger>
          <TabsTrigger
            value="workflow"
            className="flex-none rounded-none border-b-2 border-transparent px-4 py-2.5 data-[state=active]:border-verity-ink data-[state=active]:bg-transparent data-[state=active]:text-verity-ink data-[state=active]:shadow-none"
          >
            Alur &amp; Versi
          </TabsTrigger>
          <TabsTrigger
            value="comments"
            className="flex-none rounded-none border-b-2 border-transparent px-4 py-2.5 data-[state=active]:border-verity-ink data-[state=active]:bg-transparent data-[state=active]:text-verity-ink data-[state=active]:shadow-none"
          >
            Catatan
          </TabsTrigger>
          {isChiefEditor ? (
            <TabsTrigger
              value="audit"
              className="flex-none rounded-none border-b-2 border-transparent px-4 py-2.5 data-[state=active]:border-verity-ink data-[state=active]:bg-transparent data-[state=active]:text-verity-ink data-[state=active]:shadow-none"
            >
              Audit
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="content" className="mt-6">
          <ArticleContentTab article={article} />
        </TabsContent>
        <TabsContent value="sources" className="mt-6">
          <ArticleSourcesTab article={article} />
        </TabsContent>
        <TabsContent value="workflow" className="mt-6">
          <ArticleWorkflowTab article={article} />
        </TabsContent>
        <TabsContent value="comments" className="mt-6">
          <ArticleCommentsTab article={article} />
        </TabsContent>
        {isChiefEditor ? (
          <TabsContent value="audit" className="mt-6">
            <ArticleAuditTab articleId={article.id} />
          </TabsContent>
        ) : null}
      </Tabs>

      {/* Dialog alasan wajib (REQUEST_REVISION / REJECT / WITHDRAW / RETRACT) */}
      <Dialog open={reasonTarget !== null} onOpenChange={(open) => (!open ? setReasonTarget(null) : undefined)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">{reasonTarget?.label ?? ""}</DialogTitle>
            <DialogDescription>
              Transisi ini membutuhkan alasan/catatan wajib. Catatan terlihat pada alur editorial dan
              jejak audit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="transition-reason">Alasan (wajib)</Label>
            <Textarea
              id="transition-reason"
              rows={4}
              placeholder="Tuliskan alasan atau catatan revisi…"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonTarget(null)} disabled={transitionMutation.isPending}>
              Batal
            </Button>
            <Button
              disabled={!reason.trim() || transitionMutation.isPending}
              onClick={() => {
                if (!reasonTarget) return;
                transitionMutation.mutate({
                  action: reasonTarget.action,
                  reason: reason.trim(),
                });
              }}
            >
              {transitionMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              {reasonTarget?.label ?? "Kirim"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Penerbitan Langsung (Streamlined Publish Dialog) */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg font-semibold text-verity-ink">
              Konfirmasi Penerbitan Artikel
            </DialogTitle>
            <DialogDescription>
              Tinjau atribusi byline dan transparansi proses sebelum naskah ditayangkan ke publik.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="publish-byline">Byline Publikasi</Label>
              <Input
                id="publish-byline"
                value={publishByline}
                onChange={(event) => setPublishByline(event.target.value)}
                placeholder="Mis. Disunting oleh Redaksi Verax Press"
              />
              <p className="font-mono text-[11px] text-verity-ink-faint">
                Nama penulis atau tim editorial yang akan tampil pada byline artikel publik.
              </p>
            </div>

            {article.aiInvolvement === "substantive" ? (
              <div className="space-y-3 rounded-xs border border-verity-rule bg-verity-paper-soft p-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id="publish-ai-toggle"
                    checked={publishAiPublic}
                    onCheckedChange={setPublishAiPublic}
                  />
                  <Label htmlFor="publish-ai-toggle" className="cursor-pointer text-xs font-medium">
                    Aktifkan catatan transparansi proses AI
                  </Label>
                </div>
                {publishAiPublic ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="publish-ai-note" className="text-[11px] text-verity-ink-soft">
                      Catatan Proses Publik
                    </Label>
                    <Textarea
                      id="publish-ai-note"
                      rows={2}
                      value={publishAiNote}
                      onChange={(event) => setPublishAiNote(event.target.value)}
                      className="text-xs"
                      placeholder="Catatan keterlibatan AI pada naskah ini…"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setPublishDialogOpen(false)}
              disabled={transitionMutation.isPending}
            >
              Batal
            </Button>
            <Button
              disabled={!publishByline.trim() || transitionMutation.isPending}
              onClick={handleConfirmPublish}
              className="bg-verity-ink text-white hover:bg-verity-ink/90"
            >
              {transitionMutation.isPending ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Terbitkan Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

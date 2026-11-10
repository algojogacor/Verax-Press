// Tab Catatan: komentar redaksi — internal (default) atau terlihat penulis.
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, apiErrorMessage } from "@/components/studio/api";
import { formatDateTime } from "@/lib/format";
import type { ArticleDetailDTO, CommentDTO } from "@/types/verity";

export function ArticleCommentsTab({ article }: { article: ArticleDetailDTO }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [authorVisible, setAuthorVisible] = useState(false);

  const addMutation = useMutation({
    mutationFn: (input: { body: string; authorVisible: boolean }) =>
      apiFetch<{ comments: CommentDTO[] }>(`/api/studio/articles/${article.id}/comments`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData<ArticleDetailDTO>(["article", article.id], (old) =>
        old ? { ...old, comments: data.comments } : old,
      );
      setBody("");
      setAuthorVisible(false);
      toast({ title: "Catatan ditambahkan" });
    },
    onError: (error) => {
      toast({
        title: "Gagal menambah catatan",
        description: apiErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (body.trim().length < 2) return;
    addMutation.mutate({ body: body.trim(), authorVisible });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-lg font-semibold text-verity-ink">Catatan Redaksi</h2>
        <p className="mt-0.5 text-sm text-verity-ink-soft">
          Catatan internal tidak terlihat penulis; centang opsi untuk menampilkannya.
        </p>
      </div>

      {article.comments.length === 0 ? (
        <p className="border border-dashed border-verity-rule-strong bg-card p-6 text-center text-sm text-verity-ink-soft">
          Belum ada catatan.
        </p>
      ) : (
        <ul className="divide-y divide-verity-rule border border-verity-rule bg-card">
          {article.comments.map((comment) => (
            <li key={comment.id} className="px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-sm font-medium text-verity-ink">
                  {comment.authorName}
                  {comment.authorVisible ? (
                    <span className="ml-2 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-verity-accent">
                      Terlihat penulis
                    </span>
                  ) : (
                    <span className="ml-2 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-verity-ink-faint">
                      Internal
                    </span>
                  )}
                </p>
                <p className="font-mono text-[11px] text-verity-ink-faint">
                  {formatDateTime(comment.createdAt)}
                </p>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-verity-ink-soft">{comment.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 border border-verity-rule bg-card p-4">
        <div className="space-y-2">
          <Label htmlFor="comment-body">Catatan baru</Label>
          <Textarea
            id="comment-body"
            rows={3}
            placeholder="Tulis catatan review atau instruksi revisi…"
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-verity-ink-soft">
            <Checkbox
              id="comment-visible"
              checked={authorVisible}
              onCheckedChange={(checked) => setAuthorVisible(checked === true)}
            />
            Terlihat oleh penulis (bukan catatan internal)
          </label>
          <Button type="submit" size="sm" disabled={body.trim().length < 2 || addMutation.isPending}>
            {addMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="size-4" aria-hidden="true" />
            )}
            Kirim
          </Button>
        </div>
      </form>
    </div>
  );
}

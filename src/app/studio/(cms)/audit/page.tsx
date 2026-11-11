// Log audit global — Chief Editor only (server tetap memvalidasi role).
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch, apiErrorMessage } from "@/components/studio/api";
import { useDebouncedValue } from "@/components/studio/hooks";
import { formatDateTime } from "@/lib/format";
import type { AuditEventDTO } from "@/types/verity";

const TARGET_TYPES = ["ARTICLE", "SOURCE", "SUBMISSION", "COMPLAINT", "CORRECTION", "API_CLIENT", "AUTH"];
const TARGET_ALL = "SEMUA";

export default function StudioAuditPage() {
  const { data: session, status } = useSession();
  const isChief = session?.user.role === "CHIEF_EDITOR";

  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState<string>(TARGET_ALL);
  const debouncedAction = useDebouncedValue(action, 400);

  const params = new URLSearchParams();
  if (debouncedAction.trim()) params.set("action", debouncedAction.trim());
  if (targetType !== TARGET_ALL) params.set("targetType", targetType);
  const queryString = params.toString();

  const { data, isLoading, error } = useQuery({
    queryKey: ["global-audit", { action: debouncedAction, targetType }],
    queryFn: () =>
      apiFetch<{ events: AuditEventDTO[]; total: number }>(
        `/api/studio/audit${queryString ? `?${queryString}` : ""}`,
      ),
    enabled: isChief,
  });

  if (status === "loading") {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-verity-ink-faint" aria-label="Memuat" />
      </div>
    );
  }

  if (!isChief) {
    return (
      <div className="border border-verity-rule bg-card p-8">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 size-5 text-verity-disputed" aria-hidden="true" />
          <div>
            <h1 className="font-serif text-xl font-semibold text-verity-ink">Akses ditolak</h1>
            <p className="mt-1 text-sm text-verity-ink-soft">
              Log audit global hanya dapat dibaca oleh Chief Editor.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const events = data?.events ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-verity-ink">Audit</h1>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-verity-ink-faint">
          Log append-only seluruh kejadian redaksi
          {data ? ` · total ${data.total} event` : ""}
        </p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-56 flex-1 space-y-1.5">
          <Label htmlFor="audit-action">Aksi (mengandung)</Label>
          <Input
            id="audit-action"
            placeholder="Mis. article.publish, source.verified…"
            value={action}
            onChange={(event) => setAction(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audit-target">Jenis target</Label>
          <Select value={targetType} onValueChange={setTargetType}>
            <SelectTrigger id="audit-target" className="w-48">
              <SelectValue placeholder="Semua target" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TARGET_ALL}>Semua target</SelectItem>
              {TARGET_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-9" />
          ))}
        </div>
      ) : error ? (
        <div className="border border-verity-rule bg-card p-6">
          <p className="text-sm text-verity-disputed">{apiErrorMessage(error)}</p>
        </div>
      ) : events.length === 0 ? (
        <p className="border border-dashed border-verity-rule-strong bg-card p-8 text-center text-sm text-verity-ink-soft">
          Tidak ada event audit pada filter ini.
        </p>
      ) : (
        <div className="max-h-[32rem] overflow-y-auto border border-verity-rule bg-card verity-scroll">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="hover:bg-transparent">
                <TableHead className="whitespace-nowrap">Waktu</TableHead>
                <TableHead>Aktor</TableHead>
                <TableHead>Aksi</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Alasan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id} className="align-top hover:bg-transparent">
                  <TableCell className="font-mono text-[11px] whitespace-nowrap text-verity-ink-faint">
                    {formatDateTime(event.createdAt)}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-verity-ink-soft">
                    <span className="block text-verity-ink-faint">{event.actorType}</span>
                    {event.actorLabel ?? "sistem"}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-verity-ink">
                    {event.action}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-verity-ink-soft">
                    {event.targetType}
                    {event.targetId ? (
                      <span className="block text-verity-ink-faint">{event.targetId}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="max-w-64 font-mono text-[11px] text-verity-ink-soft">
                    {event.reason ?? "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

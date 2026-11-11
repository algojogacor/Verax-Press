// Manajemen API client (ingestion) — Chief Editor only. Secret hanya tampil sekali.
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Loader2, Plus, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, apiErrorMessage } from "@/components/studio/api";
import { formatDateTime } from "@/lib/format";
import type { ApiClientDTO } from "@/types/verity";

interface CreatedClient extends ApiClientDTO {
  secret: string;
}

export default function StudioApiClientsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: session, status } = useSession();
  const isChief = session?.user.role === "CHIEF_EDITOR";

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("");
  const [created, setCreated] = useState<CreatedClient | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiClientDTO | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["api-clients"],
    queryFn: () => apiFetch<{ clients: ApiClientDTO[] }>("/api/studio/api-clients"),
    enabled: isChief,
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; expiresInDays?: number }) =>
      apiFetch<CreatedClient>("/api/studio/api-clients", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: ["api-clients"] });
      setCreateOpen(false);
      setName("");
      setExpiresInDays("");
      setCreated(client);
    },
    onError: (mutationError) => {
      toast({
        title: "Gagal membuat client",
        description: apiErrorMessage(mutationError),
        variant: "destructive",
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (input: { id: string; status: "ACTIVE" | "REVOKED" }) =>
      apiFetch<ApiClientDTO>(`/api/studio/api-clients/${input.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: input.status }),
      }),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: ["api-clients"] });
      setRevokeTarget(null);
      toast({
        title: client.status === "ACTIVE" ? "Client diaktifkan kembali" : "Client dicabut",
        description: client.name,
      });
    },
    onError: (mutationError) => {
      toast({
        title: "Gagal mengubah status",
        description: apiErrorMessage(mutationError),
        variant: "destructive",
      });
    },
  });

  async function copySecret(secret: string) {
    try {
      await navigator.clipboard.writeText(secret);
      toast({ title: "Secret disalin ke clipboard" });
    } catch {
      toast({
        title: "Gagal menyalin",
        description: "Salin manual dari kotak di bawah.",
        variant: "destructive",
      });
    }
  }

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
              Manajemen API client hanya dapat dilakukan oleh Chief Editor.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const clients = data?.clients ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-verity-ink">API Clients</h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-verity-ink-faint">
            Kredensial ingestion untuk agen AI eksternal
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Buat Client
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </div>
      ) : error ? (
        <div className="border border-verity-rule bg-card p-6">
          <p className="text-sm text-verity-disputed">{apiErrorMessage(error)}</p>
        </div>
      ) : clients.length === 0 ? (
        <p className="border border-dashed border-verity-rule-strong bg-card p-8 text-center text-sm text-verity-ink-soft">
          Belum ada API client terdaftar.
        </p>
      ) : (
        <div className="overflow-x-auto border border-verity-rule bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Client ID</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="whitespace-nowrap">Kedaluwarsa</TableHead>
                <TableHead className="whitespace-nowrap">Terakhir dipakai</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id} className="hover:bg-transparent">
                  <TableCell className="font-mono text-[11px] text-verity-ink">
                    {client.clientId}
                  </TableCell>
                  <TableCell className="text-sm text-verity-ink-soft">{client.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px] uppercase">
                      {client.scopes}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {client.status === "ACTIVE" ? (
                      <span className="text-sm text-verity-verified">Aktif</span>
                    ) : (
                      <span className="text-sm text-verity-disputed">Dicabut</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] whitespace-nowrap text-verity-ink-faint">
                    {client.expiresAt ? formatDateTime(client.expiresAt) : "-"}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] whitespace-nowrap text-verity-ink-faint">
                    {client.lastUsedAt ? formatDateTime(client.lastUsedAt) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {client.status === "ACTIVE" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-verity-disputed"
                        disabled={statusMutation.isPending}
                        onClick={() => setRevokeTarget(client)}
                      >
                        Cabut
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={statusMutation.isPending}
                        onClick={() => statusMutation.mutate({ id: client.id, status: "ACTIVE" })}
                      >
                        Aktifkan
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="font-mono text-[11px] text-verity-ink-faint">
        Client hanya memiliki izin kirim (submit) dan tidak dapat menyetujui atau menerbitkan naskah.
      </p>

      {/* Dialog: buat client */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Buat API Client</DialogTitle>
            <DialogDescription>
              Client baru dapat mengirim submission via ingestion API. Secret hanya ditampilkan satu
              kali setelah dibuat.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate({
                name: name.trim(),
                expiresInDays: expiresInDays.trim() ? Number(expiresInDays.trim()) : undefined,
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="client-name">Nama</Label>
              <Input
                id="client-name"
                required
                minLength={3}
                placeholder="Mis. Agent Liputan Hukum"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-expiry">Masa berlaku (hari, opsional)</Label>
              <Input
                id="client-expiry"
                type="number"
                min={1}
                max={730}
                placeholder="Kosongkan = tanpa kedaluwarsa"
                value={expiresInDays}
                onChange={(event) => setExpiresInDays(event.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
                Batal
              </Button>
              <Button type="submit" disabled={name.trim().length < 3 || createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                Buat
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: secret sekali tampil */}
      <Dialog open={created !== null} onOpenChange={(open) => (!open ? setCreated(null) : undefined)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif">
              <KeyRound className="size-4" aria-hidden="true" />
              Client dibuat: simpan secret Anda
            </DialogTitle>
            <DialogDescription>
              Simpan sekarang karena secret tidak akan ditampilkan lagi. Gunakan format header{" "}
              <span className="font-mono">Authorization: Bearer &lt;clientId&gt;.&lt;secret&gt;</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-verity-ink-faint">
                Client ID
              </p>
              <p className="rounded-[2px] border border-verity-rule bg-verity-paper-soft px-3 py-2 font-mono text-xs break-all text-verity-ink">
                {created?.clientId ?? ""}
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-verity-ink-faint">
                Secret
              </p>
              <p className="rounded-[2px] border border-verity-rule bg-verity-paper-soft px-3 py-2 font-mono text-xs break-all text-verity-ink">
                {created?.secret ?? ""}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => void copySecret(created?.secret ?? "")}>
              <Copy className="size-4" aria-hidden="true" />
              Salin Secret
            </Button>
            <Button type="button" onClick={() => setCreated(null)}>
              Saya sudah menyimpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi cabut */}
      <AlertDialog open={revokeTarget !== null} onOpenChange={(open) => (!open ? setRevokeTarget(null) : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Cabut client ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget?.name ?? ""} tidak akan dapat mengirim submission lagi. Client dapat
              diaktifkan kembali kemudian.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusMutation.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={statusMutation.isPending}
              onClick={() => {
                if (!revokeTarget) return;
                statusMutation.mutate({ id: revokeTarget.id, status: "REVOKED" });
              }}
            >
              {statusMutation.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Cabut
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

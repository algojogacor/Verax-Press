// Portal Pengembang & Integrasi API Meja Redaksi (/studio/api-clients).
// Khusus Pemimpin Redaksi (CHIEF_EDITOR). Menyediakan 5 modul:
// 1. Ringkasan (Overview): metrik aktual, status integrasi, Base URL
// 2. Klien API: manajemen client, rotasi kredensial (grace period), pencabutan
// 3. Dokumentasi: panduan cepat, tautan spesifikasi OpenAPI/llms.txt, contoh kode
// 4. Log Permintaan: jejak audit request, durasi, status HTTP, filter & pencarian
// 5. API Playground: uji coba dry-run dan pengiriman aman via server proxy

"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  Clock,
  Code2,
  Copy,
  ExternalLink,
  FileCode2,
  FileText,
  KeyRound,
  Layers,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Terminal,
  Trash2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, apiErrorMessage } from "@/components/studio/api";
import { formatDateTime } from "@/lib/format";
import type {
  ApiClientDTO,
  ApiClientCredentialDTO,
  ApiOverviewMetricsDTO,
  ApiRequestLogDTO,
} from "@/types/verity";

interface CreatedClientResponse extends ApiClientDTO {
  secret: string;
}

interface RotatedSecretResponse {
  secret: string;
  credentialId: string;
  keyPrefix: string;
  gracePeriodHours: number;
  message: string;
}

export default function StudioApiPortalPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: session, status: authStatus } = useSession();
  const isChief = session?.user?.role === "CHIEF_EDITOR";

  const [activeTab, setActiveTab] = useState("overview");

  // State Dialog Pembuatan Client
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createOwner, setCreateOwner] = useState("");
  const [createEnv, setCreateEnv] = useState<"DEVELOPMENT" | "PREVIEW" | "PRODUCTION">("DEVELOPMENT");
  const [createExpiresDays, setCreateExpiresDays] = useState("");
  const [newSecretDisplay, setNewSecretDisplay] = useState<{
    clientId: string;
    secret: string;
    name: string;
  } | null>(null);

  // State Dialog Rotasi Kredensial
  const [rotateTarget, setRotateTarget] = useState<ApiClientDTO | null>(null);
  const [rotateGraceHours, setRotateGraceHours] = useState("24");
  const [rotateExpiresDays, setRotateExpiresDays] = useState("");
  const [rotatedSecretDisplay, setRotatedSecretDisplay] = useState<{
    clientName: string;
    secret: string;
    graceHours: number;
  } | null>(null);

  // State Dialog Status Client
  const [statusTarget, setStatusTarget] = useState<ApiClientDTO | null>(null);

  // State Dialog Pencabutan Kredensial Tertentu
  const [revokeCredTarget, setRevokeCredTarget] = useState<{
    clientId: string;
    credentialId: string;
    keyPrefix: string;
  } | null>(null);

  // State Modal Detail Kredensial Client
  const [selectedClientDetail, setSelectedClientDetail] = useState<ApiClientDTO | null>(null);

  // State Filter Log
  const [logPage, setLogPage] = useState(1);
  const [logSearch, setLogSearch] = useState("");
  const [selectedLogDetail, setSelectedLogDetail] = useState<ApiRequestLogDTO | null>(null);

  // State Playground
  const [playgroundClientId, setPlaygroundClientId] = useState("");
  const [playgroundEndpoint, setPlaygroundEndpoint] = useState<
    "/api/internal/v1/ai-submissions/validate" | "/api/internal/v1/ai-submissions"
  >("/api/internal/v1/ai-submissions/validate");
  const [playgroundPayload, setPlaygroundPayload] = useState("");
  const [playgroundResult, setPlaygroundResult] = useState<{
    statusCode: number;
    durationMs: number;
    headers: Record<string, string>;
    body: unknown;
    requestId: string;
  } | null>(null);
  const [realSubmissionConfirmOpen, setRealSubmissionConfirmOpen] = useState(false);

  // Query Data
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["api-overview"],
    queryFn: () => apiFetch<ApiOverviewMetricsDTO>("/api/studio/api-clients/overview"),
    enabled: isChief,
    refetchInterval: 15_000,
  });

  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ["api-clients"],
    queryFn: () => apiFetch<{ clients: ApiClientDTO[] }>("/api/studio/api-clients"),
    enabled: isChief,
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["api-logs", logPage, logSearch],
    queryFn: () => {
      const searchParam = logSearch ? `&search=${encodeURIComponent(logSearch)}` : "";
      return apiFetch<{
        logs: ApiRequestLogDTO[];
        total: number;
        page: number;
        totalPages: number;
      }>(`/api/studio/api-clients/logs?page=${logPage}&limit=20${searchParam}`);
    },
    enabled: isChief,
  });

  // Mutasi Pembuatan Client
  const createMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      description?: string;
      ownerName?: string;
      environment: "DEVELOPMENT" | "PREVIEW" | "PRODUCTION";
      expiresInDays?: number;
    }) =>
      apiFetch<CreatedClientResponse>("/api/studio/api-clients", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["api-clients"] });
      queryClient.invalidateQueries({ queryKey: ["api-overview"] });
      setCreateOpen(false);
      setCreateName("");
      setCreateDescription("");
      setCreateOwner("");
      setCreateExpiresDays("");
      setNewSecretDisplay({
        clientId: data.clientId,
        secret: data.secret,
        name: data.name,
      });
      toast({ title: "Klien API berhasil didaftarkan" });
    },
    onError: (err) => {
      toast({
        title: "Gagal membuat klien",
        description: apiErrorMessage(err),
        variant: "destructive",
      });
    },
  });

  // Mutasi Rotasi Kredensial
  const rotateMutation = useMutation({
    mutationFn: (options: {
      clientId: string;
      gracePeriodHours: number;
      expiresInDays?: number;
    }) =>
      apiFetch<RotatedSecretResponse>(`/api/studio/api-clients/${options.clientId}/rotate`, {
        method: "POST",
        body: JSON.stringify({
          gracePeriodHours: options.gracePeriodHours,
          expiresInDays: options.expiresInDays,
        }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["api-clients"] });
      queryClient.invalidateQueries({ queryKey: ["api-overview"] });
      const clientName = rotateTarget?.name ?? "Klien";
      setRotateTarget(null);
      setRotatedSecretDisplay({
        clientName,
        secret: data.secret,
        graceHours: data.gracePeriodHours,
      });
      toast({ title: "Kredensial berhasil dirotasi" });
    },
    onError: (err) => {
      toast({
        title: "Gagal merotasi kredensial",
        description: apiErrorMessage(err),
        variant: "destructive",
      });
    },
  });

  // Mutasi Status Klien (Active/Revoked)
  const statusMutation = useMutation({
    mutationFn: (options: { id: string; status: "ACTIVE" | "REVOKED" }) =>
      apiFetch<ApiClientDTO>(`/api/studio/api-clients/${options.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: options.status }),
      }),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: ["api-clients"] });
      queryClient.invalidateQueries({ queryKey: ["api-overview"] });
      setStatusTarget(null);
      toast({
        title: client.status === "ACTIVE" ? "Klien diaktifkan kembali" : "Klien dicabut",
        description: client.name,
      });
    },
    onError: (err) => {
      toast({
        title: "Gagal mengubah status klien",
        description: apiErrorMessage(err),
        variant: "destructive",
      });
    },
  });

  // Mutasi Pencabutan Kredensial Tertentu
  const revokeCredMutation = useMutation({
    mutationFn: (options: { clientId: string; credentialId: string }) =>
      apiFetch<ApiClientCredentialDTO>(
        `/api/studio/api-clients/${options.clientId}/revoke-credential`,
        {
          method: "POST",
          body: JSON.stringify({ credentialId: options.credentialId }),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-clients"] });
      setRevokeCredTarget(null);
      toast({ title: "Kredensial berhasil dicabut permanen" });
    },
    onError: (err) => {
      toast({
        title: "Gagal mencabut kredensial",
        description: apiErrorMessage(err),
        variant: "destructive",
      });
    },
  });

  // Mutasi Playground Runner
  const playgroundMutation = useMutation({
    mutationFn: (options: {
      clientId: string;
      endpoint: string;
      payload: Record<string, unknown>;
    }) =>
      apiFetch<{
        statusCode: number;
        durationMs: number;
        headers: Record<string, string>;
        body: unknown;
        requestId: string;
      }>("/api/studio/api-clients/playground/run", {
        method: "POST",
        body: JSON.stringify(options),
      }),
    onSuccess: (result) => {
      setPlaygroundResult(result);
      queryClient.invalidateQueries({ queryKey: ["api-logs"] });
      queryClient.invalidateQueries({ queryKey: ["api-overview"] });
      toast({
        title: `Permintaan selesai: HTTP ${result.statusCode}`,
        description: `Waktu eksekusi: ${result.durationMs} ms (ID: ${result.requestId.slice(0, 12)}...)`,
      });
    },
    onError: (err) => {
      toast({
        title: "Gagal mengeksekusi playground",
        description: apiErrorMessage(err),
        variant: "destructive",
      });
    },
  });

  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} disalin ke papan klip` });
    } catch {
      toast({
        title: "Gagal menyalin",
        description: "Salin secara manual dari kotak teks.",
        variant: "destructive",
      });
    }
  }

  function loadSamplePayload(type: "news" | "analysis" | "opinion") {
    const key = `sample-${Date.now().toString().slice(-6)}`;
    if (type === "news") {
      setPlaygroundPayload(
        JSON.stringify(
          {
            title: "Laporan Pemantauan Anggaran Pembangunan Infrastruktur Digital Daerah",
            deck: "Hasil pemantauan alokasi belanja jaringan internet publik pada tiga provinsi.",
            desk: "nasional-publik",
            format: "NEWS",
            content: [
              {
                type: "paragraph",
                text: "Kementerian Komunikasi dan Informatika mencatat realisasi anggaran pembangunan infrastruktur digital daerah mencapai 84 persen pada kuartal ketiga tahun berjalan.",
              },
              {
                type: "heading",
                level: 2,
                text: "Realisasi di Tingkat Daerah",
              },
              {
                type: "paragraph",
                text: "Sebanyak 120 menara pemancar baru telah terpasang di wilayah terluar, memperluas jangkauan layanan informasi bagi masyarakat setempat.",
              },
              {
                type: "quote",
                text: "Pengawasan berkala dilakukan untuk memastikan kualitas jaringan sesuai dengan spesifikasi teknis kontrak kerja.",
                attribution: "Pejabat Pembuat Komitmen",
              },
            ],
            sources: [
              {
                title: "Laporan Kinerja Triwulan Pembangunan Konektivitas Nasional",
                publisher: "Kementerian Komunikasi dan Informatika",
                url: "https://www.kominfo.go.id/laporan-kinerja-konektivitas",
                sourceType: "OFFICIAL",
                isKeySource: true,
                supports: "Data realisasi anggaran 84 persen dan pemasangan 120 menara pemancar baru.",
              },
            ],
            aiInvolvement: "assistive",
            aiUsageNote: "Penyusunan kerangka draf awal dan perapian kutipan narasumber dari siaran pers resmi.",
            agentId: "verax-news-gatherer-v1",
            idempotencyKey: `verax-news-${key}`,
          },
          null,
          2,
        ),
      );
    } else if (type === "analysis") {
      setPlaygroundPayload(
        JSON.stringify(
          {
            title: "Analisis: Kesiapan Standar Tata Kelola AI Sektor Publik",
            deck: "Evaluasi kerangka akuntabilitas algoritma dan hak penjelasan keputusan otomatis.",
            desk: "teknologi-kebijakan",
            format: "ANALYSIS",
            content: [
              {
                type: "paragraph",
                text: "Penerapan sistem pengambilan keputusan otomatis di lembaga publik memerlukan standar audit independen untuk mencegah bias diskriminatif.",
              },
              {
                type: "heading",
                level: 2,
                text: "Kewajiban Pengujian Fakta dan Bukti Sumber",
              },
              {
                type: "quote",
                text: "Akuntabilitas teknologi tidak boleh mengabaikan hak warga atas verifikasi data.",
                attribution: "Pakar Kebijakan Publik",
              },
            ],
            sources: [
              {
                title: "Peraturan Pemerintah Nomor 28 Tahun 2025",
                publisher: "Kementerian Hukum dan HAM",
                url: "https://peraturan.go.id/dokumen/pp-28-2025.pdf",
                sourceType: "OFFICIAL",
                isKeySource: true,
                supports: "Dasar hukum transparansi data institusi publik.",
              },
            ],
            aiInvolvement: "assistive",
            agentId: "verax-policy-agent-v1",
            idempotencyKey: `verax-test-${key}`,
          },
          null,
          2,
        ),
      );
    } else {
      setPlaygroundPayload(
        JSON.stringify(
          {
            title: "Opini: Membangun Etika Jurnalisme di Era Agen Cerdas",
            deck: "Mengapa verifikasi sumber primer manusia tetap menjadi benteng kebenaran berita.",
            desk: "hukum-keadilan",
            format: "OPINION",
            content: [
              {
                type: "paragraph",
                text: "Kecepatan generasi teks sintesis menuntut standar kurasi yang semakin ketat di ruang redaksi.",
              },
            ],
            sources: [
              {
                title: "Pedoman Pemberitaan Media Siber Dewan Pers",
                url: "https://dewanpers.or.id/pedoman-media-siber.pdf",
                sourceType: "DOCUMENT",
                isKeySource: true,
              },
            ],
            aiInvolvement: "none",
            agentId: "verax-opinion-agent-v1",
            idempotencyKey: `verax-opini-${key}`,
          },
          null,
          2,
        ),
      );
    }
  }

  function handleRunPlayground() {
    if (!playgroundClientId) {
      toast({
        title: "Pilih klien terlebih dahulu",
        description: "Pilih salah satu API Client aktif sebagai identitas pemanggil.",
        variant: "destructive",
      });
      return;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(playgroundPayload);
    } catch {
      toast({
        title: "Format JSON tidak valid",
        description: "Periksa kembali sintaks JSON di editor sebelum mengirim permintaan.",
        variant: "destructive",
      });
      return;
    }

    if (playgroundEndpoint === "/api/internal/v1/ai-submissions") {
      setRealSubmissionConfirmOpen(true);
      return;
    }

    playgroundMutation.mutate({
      clientId: playgroundClientId,
      endpoint: playgroundEndpoint,
      payload: parsed,
    });
  }

  function executeRealSubmission() {
    setRealSubmissionConfirmOpen(false);
    const parsed = JSON.parse(playgroundPayload);
    playgroundMutation.mutate({
      clientId: playgroundClientId,
      endpoint: playgroundEndpoint,
      payload: parsed,
    });
  }

  if (authStatus === "loading") {
    return (
      <div className="flex min-h-60 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-verity-ink-faint" aria-label="Memuat" />
      </div>
    );
  }

  if (!isChief) {
    return (
      <div className="border border-verity-rule bg-card p-8">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 size-5 text-verity-disputed" aria-hidden="true" />
          <div>
            <h1 className="font-serif text-xl font-semibold text-verity-ink">Akses Ditolak</h1>
            <p className="mt-1 text-sm text-verity-ink-soft">
              Portal pengembang dan integrasi API hanya dapat diakses oleh Pemimpin Redaksi Verax Press.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const clients = clientsData?.clients ?? [];
  const activeClients = clients.filter((c) => c.status === "ACTIVE");

  return (
    <div className="space-y-6">
      {/* Header Utama */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-verity-rule pb-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-verity-accent">
            Infrastruktur Agen AI & API
          </p>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-verity-ink sm:text-3xl">
            API & Integrasi
          </h1>
          <p className="mt-1 text-sm text-verity-ink-soft">
            Pusat kendali integrasi mesin, siklus hidup kredensial, pemantauan log permintaan, dan pengujian API.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/developers" target="_blank" rel="noreferrer" className="flex items-center gap-1.5">
              <ExternalLink className="size-3.5" />
              <span>Dokumentasi Web</span>
            </a>
          </Button>
          <Button onClick={() => setCreateOpen(true)} size="sm" className="flex items-center gap-1.5">
            <Plus className="size-4" />
            <span>Klien Baru</span>
          </Button>
        </div>
      </div>

      {/* Navigasi 5 Tab */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="w-full overflow-x-auto pb-1">
          <TabsList className="bg-verity-paper-soft border border-verity-rule p-1 inline-flex w-max min-w-full sm:min-w-0 sm:w-auto justify-start">
            <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs shrink-0">
              <Layers className="size-3.5" />
              <span>Ringkasan</span>
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center gap-1.5 text-xs shrink-0">
              <KeyRound className="size-3.5" />
              <span>Klien API ({clients.length})</span>
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex items-center gap-1.5 text-xs shrink-0">
              <FileCode2 className="size-3.5" />
              <span>Dokumentasi Mesin</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-1.5 text-xs shrink-0">
              <Activity className="size-3.5" />
              <span>Log Permintaan</span>
            </TabsTrigger>
            <TabsTrigger value="playground" className="flex items-center gap-1.5 text-xs shrink-0">
              <Terminal className="size-3.5" />
              <span>API Playground</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: RINGKASAN (OVERVIEW) */}
        <TabsContent value="overview" className="space-y-6">
          {overviewLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
          ) : (
            <>
              {/* 4 Kartu Metrik Aktual */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="border border-verity-rule bg-card p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[11px] uppercase tracking-wider text-verity-ink-faint">
                      Klien Integrasi
                    </p>
                    <KeyRound className="size-4 text-verity-ink-faint" />
                  </div>
                  <p className="mt-3 font-serif text-3xl font-semibold text-verity-ink">
                    {overview?.totalClients ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-verity-ink-soft">
                    {overview?.activeClients ?? 0} aktif · {overview?.revokedClients ?? 0} dicabut
                  </p>
                </div>

                <div className="border border-verity-rule bg-card p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[11px] uppercase tracking-wider text-verity-ink-faint">
                      Permintaan Hari Ini
                    </p>
                    <Activity className="size-4 text-verity-ink-faint" />
                  </div>
                  <p className="mt-3 font-serif text-3xl font-semibold text-verity-ink">
                    {overview?.requestsToday ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-verity-ink-soft">
                    24 jam terakhir dari seluruh klien
                  </p>
                </div>

                <div className="border border-verity-rule bg-card p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[11px] uppercase tracking-wider text-verity-ink-faint">
                      Naskah Masuk (24 Jam)
                    </p>
                    <FileText className="size-4 text-verity-ink-faint" />
                  </div>
                  <p className="mt-3 font-serif text-3xl font-semibold text-verity-ink">
                    {overview?.successfulSubmissionsToday ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-verity-ink-soft">
                    {overview?.failedSubmissionsToday ?? 0} percobaan gagal/ditolak
                  </p>
                </div>

                <div className="border border-verity-rule bg-card p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[11px] uppercase tracking-wider text-verity-ink-faint">
                      Rata-rata Waktu Respons
                    </p>
                    <Clock className="size-4 text-verity-ink-faint" />
                  </div>
                  <p className="mt-3 font-serif text-3xl font-semibold text-verity-ink">
                    {overview?.averageDurationMs ?? 0} <span className="text-base font-normal">ms</span>
                  </p>
                  <p className="mt-1 text-xs text-verity-ink-soft">
                    Permintaan terakhir: {overview?.lastRequestAt ? formatDateTime(overview.lastRequestAt) : "Belum ada"}
                  </p>
                </div>
              </div>

              {/* Status Integrasi & Konfigurasi Lingkungan */}
              <div className="border border-verity-rule bg-card p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-verity-rule pb-4">
                  <div>
                    <h2 className="font-serif text-lg font-semibold text-verity-ink">
                      Konfigurasi Lingkungan Server
                    </h2>
                    <p className="text-xs text-verity-ink-soft mt-0.5">
                      Nilai resmi ini diturunkan langsung dari variabel lingkungan sistem (bukan input bebas).
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs uppercase">
                    Lingkungan: {overview?.environment ?? "development"}
                  </Badge>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 text-sm">
                  <div>
                    <Label className="text-xs font-mono text-verity-ink-soft">BASE URL INTEGRASI RESMI</Label>
                    <div className="mt-1.5 flex items-center gap-2">
                      <code className="flex-1 bg-verity-paper-soft border border-verity-rule px-3 py-1.5 font-mono text-xs text-verity-ink">
                        {overview?.baseUrl}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(overview?.baseUrl || "", "Base URL")}
                      >
                        <Copy className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-mono text-verity-ink-soft">BATAS LAJU (RATE LIMIT)</Label>
                    <p className="mt-1.5 text-xs text-verity-ink-soft leading-relaxed">
                      12 permintaan submission per menit per klien. Permintaan validasi dry-run dibatasi 30 per menit.
                    </p>
                  </div>
                </div>

                <div className="pt-2 text-xs text-verity-ink-soft border-t border-verity-rule flex flex-wrap items-center justify-between gap-2">
                  <span>Prinsip Keamanan: Secret disimpan dalam bentuk hash SHA-256 konstan-waktu. Tidak ada kredensial teks-polos.</span>
                  <Button variant="link" size="sm" onClick={() => setActiveTab("clients")} className="p-0 h-auto text-xs">
                    Kelola Klien API →
                  </Button>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* TAB 2: KLIEN API (CLIENTS & ROTASI) */}
        <TabsContent value="clients" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl font-semibold text-verity-ink">Daftar Klien API Terdaftar</h2>
              <p className="text-xs text-verity-ink-soft mt-0.5">
                Kelola identitas agen, inspeksi riwayat kredensial, dan lakukan rotasi kunci dengan masa tenggang.
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)} size="sm">
              <Plus className="size-4" />
              <span>Buat Klien Baru</span>
            </Button>
          </div>

          {clientsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : clients.length === 0 ? (
            <div className="border border-dashed border-verity-rule-strong bg-card p-12 text-center">
              <KeyRound className="mx-auto size-8 text-verity-ink-faint" />
              <p className="mt-3 font-serif text-lg font-semibold text-verity-ink">Belum Ada Klien API</p>
              <p className="mt-1 text-sm text-verity-ink-soft max-w-md mx-auto">
                Daftarkan klien API untuk memberikan akses pengiriman naskah kepada agen kecerdasan buatan eksternal.
              </p>
              <Button onClick={() => setCreateOpen(true)} className="mt-4" size="sm">
                <Plus className="size-4" />
                <span>Buat Klien Pertama</span>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-verity-rule bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-verity-rule bg-verity-paper-soft">
                    <TableHead className="font-mono text-xs uppercase text-verity-ink">Nama & Identitas</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-verity-ink">Client ID</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-verity-ink">Lingkungan</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-verity-ink">Status</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-verity-ink">Kredensial Aktif</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-verity-ink">Penggunaan Terakhir</TableHead>
                    <TableHead className="font-mono text-xs uppercase text-verity-ink text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-verity-rule">
                  {clients.map((c) => (
                    <TableRow key={c.id} className="hover:bg-verity-paper-soft/40 transition-colors">
                      <TableCell>
                        <p className="font-medium text-sm text-verity-ink">{c.name}</p>
                        {c.description && (
                          <p className="text-xs text-verity-ink-soft line-clamp-1">{c.description}</p>
                        )}
                        {c.ownerName && (
                          <p className="text-[11px] font-mono text-verity-ink-faint mt-0.5">Penanggung Jawab: {c.ownerName}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="font-mono text-xs text-verity-ink bg-verity-paper-soft px-1.5 py-0.5 border border-verity-rule">
                          {c.clientId}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px] uppercase">
                          {c.environment}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {c.status === "ACTIVE" ? (
                          <Badge className="bg-emerald-600/10 text-emerald-700 border-emerald-600/20 text-[10px] uppercase font-mono">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-600/10 text-rose-700 border-rose-600/20 text-[10px] uppercase font-mono">
                            Dicabut
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-verity-ink">
                          {c.credentials?.filter((cred) => cred.status === "ACTIVE" || cred.status === "GRACE_PERIOD").length ?? 1} Kunci
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-verity-ink-soft">
                        {c.lastUsedAt ? formatDateTime(c.lastUsedAt) : "Belum pernah"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8"
                            onClick={() => setSelectedClientDetail(c)}
                          >
                            Kredensial
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8"
                            onClick={() => setRotateTarget(c)}
                            disabled={c.status !== "ACTIVE"}
                          >
                            <RefreshCw className="size-3 mr-1" />
                            Rotasi
                          </Button>
                          <Button
                            variant={c.status === "ACTIVE" ? "ghost" : "outline"}
                            size="sm"
                            className={`text-xs h-8 ${c.status === "ACTIVE" ? "text-rose-700 hover:text-rose-800" : ""}`}
                            onClick={() => setStatusTarget(c)}
                          >
                            {c.status === "ACTIVE" ? "Cabut" : "Aktifkan"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* TAB 3: DOKUMENTASI MESIN (MACHINE-READABLE SPEC & CONTOH) */}
        <TabsContent value="docs" className="space-y-6">
          <div className="border border-verity-rule bg-card p-6 space-y-4">
            <h2 className="font-serif text-xl font-semibold text-verity-ink">Spesifikasi Ramah Agen AI</h2>
            <p className="text-sm text-verity-ink-soft">
              Verax Press menyediakan titik akhir penemuan mandiri (self-documenting discovery) yang dapat dibaca dan dipahami secara otomatis oleh berbagai kerangka kerja model AI.
            </p>

            <div className="grid gap-3 sm:grid-cols-2 pt-2">
              <a
                href="/openapi.json"
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 border border-verity-rule bg-verity-paper-soft p-4 hover:border-verity-ink transition-colors"
              >
                <FileCode2 className="size-5 text-verity-accent mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-verity-ink font-mono">/openapi.json</p>
                  <p className="text-xs text-verity-ink-soft mt-1">
                    Spesifikasi standar OpenAPI 3.1.0 lengkap dengan skema blok konten, rujukan sumber, dan kode galat HTTP.
                  </p>
                </div>
              </a>

              <a
                href="/.well-known/verax-agent.json"
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 border border-verity-rule bg-verity-paper-soft p-4 hover:border-verity-ink transition-colors"
              >
                <Code2 className="size-5 text-verity-accent mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-verity-ink font-mono">/.well-known/verax-agent.json</p>
                  <p className="text-xs text-verity-ink-soft mt-1">
                    Metadata penemuan kapabilitas platform, batasan otorisasi, dan endpoint integrasi resmi.
                  </p>
                </div>
              </a>

              <a
                href="/llms.txt"
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 border border-verity-rule bg-verity-paper-soft p-4 hover:border-verity-ink transition-colors"
              >
                <FileText className="size-5 text-verity-accent mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-verity-ink font-mono">/llms.txt</p>
                  <p className="text-xs text-verity-ink-soft mt-1">
                    Ringkasan instruksi kontekstual terkompresi untuk disuntikkan ke prompt sistem agen AI.
                  </p>
                </div>
              </a>

              <a
                href="/llms-full.txt"
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 border border-verity-rule bg-verity-paper-soft p-4 hover:border-verity-ink transition-colors"
              >
                <FileText className="size-5 text-verity-accent mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-verity-ink font-mono">/llms-full.txt</p>
                  <p className="text-xs text-verity-ink-soft mt-1">
                    Dokumentasi teks lengkap mencakup seluruh bidang wajib, aturan rubrik, dan strategi retry.
                  </p>
                </div>
              </a>
            </div>
          </div>

          {/* Quick Copy Snippet */}
          <div className="border border-verity-rule bg-card p-6 space-y-3">
            <h3 className="font-serif text-lg font-semibold text-verity-ink">Format Header Autentikasi Resmi</h3>
            <p className="text-sm text-verity-ink-soft">
              Pastikan agen Anda menggunakan format Bearer berikut pada setiap panggilan HTTP:
            </p>
            <pre className="border border-verity-rule bg-verity-paper-soft p-4 font-mono text-xs text-verity-ink overflow-x-auto">
              <code>
{`Authorization: Bearer <CLIENT_ID>.<CLIENT_SECRET>
Content-Type: application/json`}
              </code>
            </pre>
          </div>
        </TabsContent>

        {/* TAB 4: LOG PERMINTAAN (REQUEST LOGS) */}
        <TabsContent value="logs" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl font-semibold text-verity-ink">Log Permintaan Klien API</h2>
              <p className="text-xs text-verity-ink-soft mt-0.5">
                Pencatatan telemetri tersanitasi untuk memantau status eksekusi, kode galat, dan waktu pemrosesan.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 size-4 text-verity-ink-faint" />
                <Input
                  placeholder="Cari Request ID / Submission..."
                  value={logSearch}
                  onChange={(e) => {
                    setLogSearch(e.target.value);
                    setLogPage(1);
                  }}
                  className="pl-8 text-xs font-mono h-9"
                />
              </div>
            </div>
          </div>

          {logsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : !logsData?.logs || logsData.logs.length === 0 ? (
            <div className="border border-dashed border-verity-rule-strong bg-card p-12 text-center text-sm text-verity-ink-soft">
              Tidak ada catatan log permintaan yang sesuai dengan kriteria filter.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto border border-verity-rule bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-verity-rule bg-verity-paper-soft">
                      <TableHead className="font-mono text-xs uppercase text-verity-ink">Waktu</TableHead>
                      <TableHead className="font-mono text-xs uppercase text-verity-ink">Klien</TableHead>
                      <TableHead className="font-mono text-xs uppercase text-verity-ink">Metode & Endpoint</TableHead>
                      <TableHead className="font-mono text-xs uppercase text-verity-ink">Status</TableHead>
                      <TableHead className="font-mono text-xs uppercase text-verity-ink">Durasi</TableHead>
                      <TableHead className="font-mono text-xs uppercase text-verity-ink">Request ID</TableHead>
                      <TableHead className="font-mono text-xs uppercase text-verity-ink text-right">Rincian</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-verity-rule">
                    {logsData.logs.map((log) => {
                      const isSuccess = log.statusCode >= 200 && log.statusCode < 300;
                      const isWarning = log.statusCode === 422 || log.statusCode === 409;
                      return (
                        <TableRow key={log.id} className="hover:bg-verity-paper-soft/40 transition-colors">
                          <TableCell className="font-mono text-xs text-verity-ink-soft">
                            {formatDateTime(log.createdAt)}
                          </TableCell>
                          <TableCell className="font-medium text-sm text-verity-ink">
                            {log.clientName || "Tidak Dikenal / Gagal Auth"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 font-mono text-xs">
                              <span className="font-semibold text-verity-accent">{log.method}</span>
                              <span className="text-verity-ink-soft truncate max-w-xs">{log.endpoint}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`font-mono text-[10px] ${
                                isSuccess
                                  ? "bg-emerald-600/10 text-emerald-700 border-emerald-600/20"
                                  : isWarning
                                  ? "bg-amber-600/10 text-amber-700 border-amber-600/20"
                                  : "bg-rose-600/10 text-rose-700 border-rose-600/20"
                              }`}
                            >
                              {log.statusCode} {log.errorCode ? `· ${log.errorCode}` : ""}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-verity-ink-soft">
                            {log.durationMs} ms
                          </TableCell>
                          <TableCell>
                            <code className="font-mono text-[11px] text-verity-ink bg-verity-paper-soft px-1.5 py-0.5 border border-verity-rule">
                              {log.requestId.slice(0, 14)}...
                            </code>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => setSelectedLogDetail(log)}
                            >
                              Detail
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Kontrol Paginasi */}
              {logsData.totalPages > 1 && (
                <div className="flex items-center justify-between text-xs text-verity-ink-soft">
                  <p>
                    Menampilkan halaman {logsData.page} dari {logsData.totalPages} ({logsData.total} total catatan log)
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={logPage <= 1}
                      onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={logPage >= logsData.totalPages}
                      onClick={() => setLogPage((p) => p + 1)}
                    >
                      Berikutnya
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* TAB 5: API PLAYGROUND (PENGUJIAN SERVER-SIDE PROXY) */}
        <TabsContent value="playground" className="space-y-6">
          <div className="border border-verity-rule bg-card p-6 space-y-6">
            <div>
              <h2 className="font-serif text-xl font-semibold text-verity-ink">Laboratorium Uji Coba API</h2>
              <p className="text-xs text-verity-ink-soft mt-1">
                Kirim payload naskah langsung melalui server proxy terisolasi. Secret tidak pernah diekspos ke peramban. Mode default adalah validasi dry run (tanpa efek samping basis data).
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-mono text-verity-ink">PILIH KLIEN INTEGRASI</Label>
                <select
                  aria-label="Pilih Klien Integrasi"
                  value={playgroundClientId}
                  onChange={(e) => setPlaygroundClientId(e.target.value)}
                  className="mt-1.5 w-full border border-verity-rule bg-card px-3 py-2 text-sm text-verity-ink focus:outline-none focus:border-verity-ink"
                >
                  <option value="">Pilih Klien Aktif...</option>
                  {activeClients.map((c) => (
                    <option key={c.id} value={c.clientId}>
                      {c.name} ({c.clientId}) [{c.environment}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-mono text-verity-ink">ENDPOINT TARGET</Label>
                <select
                  aria-label="Endpoint Target"
                  value={playgroundEndpoint}
                  onChange={(e) =>
                    setPlaygroundEndpoint(
                      e.target.value as
                        | "/api/internal/v1/ai-submissions/validate"
                        | "/api/internal/v1/ai-submissions",
                    )
                  }
                  className="mt-1.5 w-full border border-verity-rule bg-card px-3 py-2 text-sm text-verity-ink focus:outline-none focus:border-verity-ink font-mono"
                >
                  <option value="/api/internal/v1/ai-submissions/validate">
                    POST /api/internal/v1/ai-submissions/validate (Dry Run - Uji Coba)
                  </option>
                  <option value="/api/internal/v1/ai-submissions">
                    POST /api/internal/v1/ai-submissions (Submission Sejati - Buat Naskah)
                  </option>
                </select>
              </div>
            </div>

            {playgroundEndpoint === "/api/internal/v1/ai-submissions" && (
              <div className="border-l-4 border-amber-600 bg-amber-500/10 p-3 text-xs text-amber-900">
                <strong>Perhatian Editorial:</strong> Anda memilih mode pengiriman sejati. Permintaan ini akan membuat entitas Naskah baru berstatus DRAFT di ruang redaksi.
              </div>
            )}

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-xs font-mono text-verity-ink">PAYLOAD NASKAH (JSON)</Label>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => loadSamplePayload("news")}
                  >
                    Muat Contoh Berita (NEWS)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => loadSamplePayload("analysis")}
                  >
                    Muat Contoh Analisis
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => loadSamplePayload("opinion")}
                  >
                    Muat Contoh Opini
                  </Button>
                </div>
              </div>

              <Textarea
                rows={14}
                value={playgroundPayload}
                onChange={(e) => setPlaygroundPayload(e.target.value)}
                placeholder='Masukkan JSON payload di sini atau klik "Muat Contoh Analisis" di atas...'
                className="font-mono text-xs bg-verity-paper-soft border-verity-rule"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-verity-rule">
              <p className="text-xs text-verity-ink-soft">
                Autentikasi diinjeksi secara aman pada sisi server via internal proxy.
              </p>
              <Button
                onClick={handleRunPlayground}
                disabled={playgroundMutation.isPending || !playgroundPayload.trim()}
                className="flex items-center gap-2"
              >
                {playgroundMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Play className="size-4" />
                )}
                <span>Jalankan Permintaan</span>
              </Button>
            </div>

            {/* Hasil Eksekusi Playground */}
            {playgroundResult && (
              <div className="mt-6 border-t-2 border-verity-ink pt-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`font-mono text-xs ${
                        playgroundResult.statusCode >= 200 && playgroundResult.statusCode < 300
                          ? "bg-emerald-600/10 text-emerald-700 border-emerald-600/20"
                          : "bg-rose-600/10 text-rose-700 border-rose-600/20"
                      }`}
                    >
                      HTTP {playgroundResult.statusCode}
                    </Badge>
                    <span className="font-mono text-xs text-verity-ink-soft">
                      Durasi: {playgroundResult.durationMs} ms
                    </span>
                  </div>
                  <span className="font-mono text-xs text-verity-ink-faint">
                    Request ID: {playgroundResult.requestId}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-mono text-verity-ink-soft">RESPONS SERVER</Label>
                  <pre className="border border-verity-rule bg-verity-paper-soft p-4 font-mono text-xs text-verity-ink overflow-x-auto max-h-96">
                    <code>{JSON.stringify(playgroundResult.body, null, 2)}</code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: Buat Klien Baru */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Daftarkan Klien API Baru</DialogTitle>
            <DialogDescription className="text-xs text-verity-ink-soft">
              Klien API memungkinkan agen AI eksternal mengusulkan naskah. Kunci secret hanya ditampilkan satu kali setelah disimpan.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({
                name: createName,
                description: createDescription || undefined,
                ownerName: createOwner || undefined,
                environment: createEnv,
                expiresInDays: createExpiresDays ? parseInt(createExpiresDays, 10) : undefined,
              });
            }}
            className="space-y-4 py-2"
          >
            <div>
              <Label htmlFor="client-name" className="text-xs">
                Nama Klien Integrasi <span className="text-rose-600">*</span>
              </Label>
              <Input
                id="client-name"
                required
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Mis. Agen Kebijakan Siber v1"
                className="mt-1 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="client-desc" className="text-xs">Deskripsi & Tujuan Integrasi</Label>
              <Input
                id="client-desc"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Mis. Ingestion draf analisis regulasi teknologi"
                className="mt-1 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="client-owner" className="text-xs">Penanggung Jawab / Departemen</Label>
              <Input
                id="client-owner"
                value={createOwner}
                onChange={(e) => setCreateOwner(e.target.value)}
                placeholder="Mis. Tim Riset Kebijakan (siber@mitra.org)"
                className="mt-1 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="client-env" className="text-xs">Lingkungan</Label>
                <select
                  id="client-env"
                  value={createEnv}
                  onChange={(e) =>
                    setCreateEnv(e.target.value as "DEVELOPMENT" | "PREVIEW" | "PRODUCTION")
                  }
                  className="mt-1 w-full border border-verity-rule bg-card px-2.5 py-1.5 text-xs text-verity-ink"
                >
                  <option value="DEVELOPMENT">Development</option>
                  <option value="PREVIEW">Preview</option>
                  <option value="PRODUCTION">Production</option>
                </select>
              </div>

              <div>
                <Label htmlFor="client-expiry" className="text-xs">Masa Berlaku (Hari)</Label>
                <Input
                  id="client-expiry"
                  type="number"
                  min={1}
                  max={730}
                  value={createExpiresDays}
                  onChange={(e) => setCreateExpiresDays(e.target.value)}
                  placeholder="Opsional (mis. 90)"
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={createMutation.isPending || !createName.trim()}>
                {createMutation.isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
                Simpan & Terbitkan Kredensial
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Tampilan Kunci Secret Baru (One-Time Secret Display) */}
      <Dialog
        open={Boolean(newSecretDisplay)}
        onOpenChange={(open) => {
          if (!open) setNewSecretDisplay(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="size-5" />
              Kredensial Integrasi Berhasil Diterbitkan
            </DialogTitle>
            <DialogDescription className="text-xs text-verity-ink-soft">
              Salin Client ID dan Secret berikut sekarang. Kunci secret tidak akan pernah ditampilkan kembali demi keamanan sistem.
            </DialogDescription>
          </DialogHeader>

          {newSecretDisplay && (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs font-mono text-verity-ink-soft">CLIENT ID</Label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 bg-verity-paper-soft border border-verity-rule p-2 font-mono text-xs text-verity-ink">
                    {newSecretDisplay.clientId}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(newSecretDisplay.clientId, "Client ID")}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs font-mono text-verity-ink-soft">CLIENT SECRET (TAMPIL SEKALI)</Label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 bg-amber-500/10 border border-amber-600/30 p-2 font-mono text-xs text-amber-900 break-all select-all">
                    {newSecretDisplay.secret}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(newSecretDisplay.secret, "Secret")}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs font-mono text-verity-ink-soft">HEADER AUTHORIZATION SIAP PAKAI</Label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 bg-verity-paper-soft border border-verity-rule p-2 font-mono text-[11px] text-verity-ink break-all">
                    Authorization: Bearer {newSecretDisplay.clientId}.{newSecretDisplay.secret}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(
                        `Authorization: Bearer ${newSecretDisplay.clientId}.${newSecretDisplay.secret}`,
                        "Header Authorization",
                      )
                    }
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>

              <div className="border border-verity-disputed/20 bg-verity-disputed/5 p-3 text-xs text-verity-disputed">
                <strong>Peringatan Keamanan:</strong> Jangan membagikan token ini melalui obrolan publik atau menyimpannya di repositori kode sumber tanpa enkripsi rahasia.
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setNewSecretDisplay(null)}>Saya Sudah Menyimpan Secret Ini</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Rotasi Kredensial */}
      <Dialog open={Boolean(rotateTarget)} onOpenChange={(open) => !open && setRotateTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <RefreshCw className="size-5 text-verity-accent" />
              Rotasi Kredensial API Client
            </DialogTitle>
            <DialogDescription className="text-xs text-verity-ink-soft">
              Rotasi menghasilkan kunci secret baru untuk <strong>{rotateTarget?.name}</strong>. Kunci aktif lama akan dipindahkan ke masa tenggang sehingga permintaan yang sedang berjalan tidak terputus.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!rotateTarget) return;
              rotateMutation.mutate({
                clientId: rotateTarget.id,
                gracePeriodHours: parseInt(rotateGraceHours, 10) || 24,
                expiresInDays: rotateExpiresDays ? parseInt(rotateExpiresDays, 10) : undefined,
              });
            }}
            className="space-y-4 py-2"
          >
            <div>
              <Label htmlFor="grace-hours" className="text-xs">
                Masa Tenggang Kunci Lama (Jam) <span className="text-rose-600">*</span>
              </Label>
              <Input
                id="grace-hours"
                type="number"
                min={0}
                max={720}
                required
                value={rotateGraceHours}
                onChange={(e) => setRotateGraceHours(e.target.value)}
                placeholder="24"
                className="mt-1 text-sm"
              />
              <p className="mt-1 text-[11px] text-verity-ink-soft">
                Selama durasi ini, kunci lama tetap dapat digunakan oleh agen hingga konfigurasi diperbarui.
              </p>
            </div>

            <div>
              <Label htmlFor="rotate-expiry" className="text-xs">Masa Berlaku Kunci Baru (Hari)</Label>
              <Input
                id="rotate-expiry"
                type="number"
                min={1}
                max={730}
                value={rotateExpiresDays}
                onChange={(e) => setRotateExpiresDays(e.target.value)}
                placeholder="Opsional (mis. 90)"
                className="mt-1 text-sm"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setRotateTarget(null)}>
                Batal
              </Button>
              <Button type="submit" disabled={rotateMutation.isPending}>
                {rotateMutation.isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
                Lakukan Rotasi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: Tampilan Secret Pasca Rotasi */}
      <Dialog
        open={Boolean(rotatedSecretDisplay)}
        onOpenChange={(open) => !open && setRotatedSecretDisplay(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="size-5" />
              Rotasi Kredensial Berhasil
            </DialogTitle>
            <DialogDescription className="text-xs text-verity-ink-soft">
              Kunci secret baru telah dibuat. Kunci lama akan dinonaktifkan otomatis setelah masa tenggang{" "}
              {rotatedSecretDisplay?.graceHours} jam berakhir.
            </DialogDescription>
          </DialogHeader>

          {rotatedSecretDisplay && (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs font-mono text-verity-ink-soft">SECRET BARU (TAMPIL SEKALI)</Label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 bg-amber-500/10 border border-amber-600/30 p-2 font-mono text-xs text-amber-900 break-all select-all">
                    {rotatedSecretDisplay.secret}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(rotatedSecretDisplay.secret, "Secret Baru")}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setRotatedSecretDisplay(null)}>Tutup & Selesai</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: Detail Kredensial Klien */}
      <Dialog
        open={Boolean(selectedClientDetail)}
        onOpenChange={(open) => !open && setSelectedClientDetail(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              Riwayat Kredensial: {selectedClientDetail?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-verity-ink-soft">
              Client ID: {selectedClientDetail?.clientId} · Lingkungan: {selectedClientDetail?.environment}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="overflow-x-auto border border-verity-rule bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-verity-rule bg-verity-paper-soft text-[11px] font-mono uppercase">
                    <TableHead>Awalan Kunci</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Masa Berlaku</TableHead>
                    <TableHead>Masa Tenggang</TableHead>
                    <TableHead>Terakhir Dipakai</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-verity-rule text-xs">
                  {selectedClientDetail?.credentials && selectedClientDetail.credentials.length > 0 ? (
                    selectedClientDetail.credentials.map((cred) => (
                      <TableRow key={cred.id}>
                        <TableCell className="font-mono text-verity-ink font-medium">
                          {cred.keyPrefix}...
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`font-mono text-[9px] uppercase ${
                              cred.status === "ACTIVE"
                                ? "bg-emerald-600/10 text-emerald-700 border-emerald-600/20"
                                : cred.status === "GRACE_PERIOD"
                                ? "bg-amber-600/10 text-amber-700 border-amber-600/20"
                                : "bg-rose-600/10 text-rose-700 border-rose-600/20"
                            }`}
                          >
                            {cred.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-verity-ink-soft">
                          {cred.expiresAt ? formatDateTime(cred.expiresAt) : "Permanen"}
                        </TableCell>
                        <TableCell className="font-mono text-verity-ink-soft">
                          {cred.gracePeriodEndsAt ? formatDateTime(cred.gracePeriodEndsAt) : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-verity-ink-soft">
                          {cred.lastUsedAt ? formatDateTime(cred.lastUsedAt) : "Belum pernah"}
                        </TableCell>
                        <TableCell className="text-right">
                          {cred.status !== "REVOKED" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-rose-700 h-7"
                              onClick={() =>
                                setRevokeCredTarget({
                                  clientId: selectedClientDetail.id,
                                  credentialId: cred.id,
                                  keyPrefix: cred.keyPrefix,
                                })
                              }
                            >
                              Cabut
                            </Button>
                          ) : (
                            <span className="text-verity-ink-faint text-[10px]">Dicabut</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-verity-ink-soft">
                        Tidak ada riwayat kredensial tambahan (klien menggunakan kunci warisan awal).
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedClientDetail(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG: Ubah Status Klien */}
      <AlertDialog open={Boolean(statusTarget)} onOpenChange={(open) => !open && setStatusTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-lg">
              {statusTarget?.status === "ACTIVE" ? "Cabut Akses Klien API?" : "Aktifkan Kembali Klien API?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-verity-ink-soft leading-relaxed">
              {statusTarget?.status === "ACTIVE"
                ? `Mencabut akses ${statusTarget.name} akan langsung menolak seluruh permintaan pengiriman naskah dari agen yang menggunakan kredensial ini.`
                : `Mengaktifkan kembali ${statusTarget?.name} akan memulihkan otorisasi pengiriman naskah.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className={statusTarget?.status === "ACTIVE" ? "bg-rose-700 hover:bg-rose-800" : ""}
              onClick={() => {
                if (!statusTarget) return;
                statusMutation.mutate({
                  id: statusTarget.id,
                  status: statusTarget.status === "ACTIVE" ? "REVOKED" : "ACTIVE",
                });
              }}
            >
              {statusTarget?.status === "ACTIVE" ? "Ya, Cabut Klien" : "Ya, Aktifkan Kembali"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ALERT DIALOG: Cabut Kredensial Spesifik */}
      <AlertDialog
        open={Boolean(revokeCredTarget)}
        onOpenChange={(open) => !open && setRevokeCredTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-lg">Cabut Kredensial Ini?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-verity-ink-soft">
              Kredensial dengan awalan <strong>{revokeCredTarget?.keyPrefix}...</strong> akan dinonaktifkan permanen dan tidak dapat digunakan kembali.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-700 hover:bg-rose-800"
              onClick={() => {
                if (!revokeCredTarget) return;
                revokeCredMutation.mutate({
                  clientId: revokeCredTarget.clientId,
                  credentialId: revokeCredTarget.credentialId,
                });
              }}
            >
              Ya, Cabut Kredensial
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ALERT DIALOG: Konfirmasi Pengiriman Naskah Sejati di Playground */}
      <AlertDialog
        open={realSubmissionConfirmOpen}
        onOpenChange={setRealSubmissionConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-lg">Konfirmasi Pengiriman Naskah Nyata</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-verity-ink-soft leading-relaxed">
              Anda akan mengirimkan naskah sungguhan ke sistem melalui endpoint <code>/api/internal/v1/ai-submissions</code>. Aksi ini akan membuat rekaman Artikel baru berstatus DRAFT di ruang redaksi. Lanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={executeRealSubmission}>
              Ya, Kirim Naskah Sejati
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL 6: Detail Log Permintaan */}
      <Dialog
        open={Boolean(selectedLogDetail)}
        onOpenChange={(open) => !open && setSelectedLogDetail(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">Rincian Log Permintaan</DialogTitle>
            <DialogDescription className="text-xs text-verity-ink-soft font-mono">
              Request ID: {selectedLogDetail?.requestId}
            </DialogDescription>
          </DialogHeader>

          {selectedLogDetail && (
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 border-b border-verity-rule pb-2">
                <div>
                  <span className="font-mono text-verity-ink-soft">Waktu:</span>
                  <p className="font-medium text-verity-ink">{formatDateTime(selectedLogDetail.createdAt)}</p>
                </div>
                <div>
                  <span className="font-mono text-verity-ink-soft">Status HTTP:</span>
                  <p className="font-medium text-verity-ink">{selectedLogDetail.statusCode}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-b border-verity-rule pb-2">
                <div>
                  <span className="font-mono text-verity-ink-soft">Metode & Endpoint:</span>
                  <p className="font-mono font-medium text-verity-ink">{selectedLogDetail.method} {selectedLogDetail.endpoint}</p>
                </div>
                <div>
                  <span className="font-mono text-verity-ink-soft">Durasi Pemrosesan:</span>
                  <p className="font-mono font-medium text-verity-ink">{selectedLogDetail.durationMs} ms</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-b border-verity-rule pb-2">
                <div>
                  <span className="font-mono text-verity-ink-soft">Klien:</span>
                  <p className="font-medium text-verity-ink">{selectedLogDetail.clientName || "-"}</p>
                </div>
                <div>
                  <span className="font-mono text-verity-ink-soft">IP Tersanitasi:</span>
                  <p className="font-mono text-verity-ink">{selectedLogDetail.ipAddress || "-"}</p>
                </div>
              </div>

              {selectedLogDetail.submissionId && (
                <div className="border-b border-verity-rule pb-2">
                  <span className="font-mono text-verity-ink-soft">Submission ID Terkait:</span>
                  <p className="font-mono font-medium text-verity-ink">{selectedLogDetail.submissionId}</p>
                </div>
              )}

              {selectedLogDetail.errorMessage && (
                <div className="bg-rose-500/10 border border-rose-600/20 p-2.5 text-rose-900">
                  <span className="font-mono text-[10px] font-semibold uppercase">Pesan Galat:</span>
                  <p className="mt-0.5">{selectedLogDetail.errorMessage}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLogDetail(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

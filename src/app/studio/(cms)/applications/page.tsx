"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  ShieldAlert,
  Users,
  FileText,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ApplicationOverview {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface ApplicationItem {
  id: string;
  name: string;
  email: string;
  interests: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adultConfirmedAt: string;
  createdAt: string;
  decidedAt: string | null;
  hasInvitation: boolean;
}

interface ApplicationDetail extends ApplicationItem {
  bio: string | null;
  portfolioUrl: string | null;
  sampleArticle: string | null;
  guidelinesAccepted: boolean;
  decidedByName: string | null;
  decisionNote: string | null;
  invitation: {
    expiresAt: string;
    acceptedAt: string | null;
    isExpired: boolean;
  } | null;
}

interface VolunteerItem {
  id: string;
  username: string | null;
  email: string;
  name: string;
  bio: string | null;
  status: "ACTIVE" | "SUSPENDED";
  articleCount: number;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function StudioApplicationsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"APPLICATIONS" | "VOLUNTEERS">("APPLICATIONS");

  // State untuk Tab Pengajuan
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  // Modal keputusan
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [activationResult, setActivationResult] = useState<{
    activationUrl: string;
    name: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Queries
  const { data: appsData, isLoading: appsLoading } = useQuery<{
    applications: ApplicationItem[];
    overview: ApplicationOverview;
  }>({
    queryKey: ["studio-applications", search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/studio/applications?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal memuat daftar permohonan.");
      return res.json();
    },
  });

  const { data: detailData, isLoading: detailLoading } = useQuery<{
    application: ApplicationDetail;
  }>({
    queryKey: ["studio-application-detail", selectedAppId],
    queryFn: async () => {
      if (!selectedAppId) return null;
      const res = await fetch(`/api/studio/applications/${selectedAppId}`);
      if (!res.ok) throw new Error("Gagal memuat detail permohonan.");
      return res.json();
    },
    enabled: Boolean(selectedAppId),
  });

  const { data: volunteersData, isLoading: volunteersLoading } = useQuery<{
    volunteers: VolunteerItem[];
    overview: { total: number; active: number; suspended: number };
  }>({
    queryKey: ["studio-volunteers"],
    queryFn: async () => {
      const res = await fetch("/api/studio/volunteers");
      if (!res.ok) throw new Error("Gagal memuat daftar kontributor.");
      return res.json();
    },
    enabled: activeTab === "VOLUNTEERS",
  });

  // Mutasi Keputusan
  const decideMutation = useMutation({
    mutationFn: async ({
      id,
      decision,
      note,
    }: {
      id: string;
      decision: "APPROVE" | "REJECT";
      note?: string;
    }) => {
      const res = await fetch(`/api/studio/applications/${id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses permohonan.");
      return data;
    },
    onSuccess: (data, variables) => {
      if (variables.decision === "APPROVE" && data.activationUrl) {
        setActivationResult({
          activationUrl: data.activationUrl,
          name: data.application?.name || detailData?.application?.name || "Kontributor",
        });
      }
      setRejectingAppId(null);
      setDecisionNote("");
      void queryClient.invalidateQueries({ queryKey: ["studio-applications"] });
      void queryClient.invalidateQueries({ queryKey: ["studio-application-detail", variables.id] });
      void queryClient.invalidateQueries({ queryKey: ["studio-volunteers"] });
    },
  });

  // Mutasi Status Kontributor
  const volunteerStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "ACTIVE" | "SUSPENDED" }) => {
      const res = await fetch(`/api/studio/volunteers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah status kontributor.");
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["studio-volunteers"] });
    },
  });

  const overview = appsData?.overview ?? { total: 0, pending: 0, approved: 0, rejected: 0 };
  const applications = appsData?.applications ?? [];
  const selectedApp = detailData?.application;

  const copyActivationLink = (url: string) => {
    const fullUrl = window.location.origin + url;
    void navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-verity-rule pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-verity-accent">
            Administrasi Redaksi &bull; Khusus Pemimpin Redaksi
          </p>
          <h1 className="font-serif text-3xl font-bold text-verity-ink mt-1">
            Pengajuan Volunteer & Kontributor
          </h1>
          <p className="text-sm text-verity-ink-soft mt-1">
            Verifikasi permohonan penulis eksternal, penerbitan token aktivasi, dan tata kelola akun kontributor.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-verity-paper-warm rounded-lg border border-verity-rule text-xs font-mono">
          <button
            onClick={() => setActiveTab("APPLICATIONS")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === "APPLICATIONS"
                ? "bg-verity-ink text-white font-semibold"
                : "text-verity-ink-soft hover:text-verity-ink"
            }`}
          >
            Permohonan Masuk ({overview.pending})
          </button>
          <button
            onClick={() => setActiveTab("VOLUNTEERS")}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === "VOLUNTEERS"
                ? "bg-verity-ink text-white font-semibold"
                : "text-verity-ink-soft hover:text-verity-ink"
            }`}
          >
            Kontributor Terdaftar
          </button>
        </div>
      </div>

      {activeTab === "APPLICATIONS" ? (
        <>
          {/* Overview Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-verity-rule rounded-xl p-5 shadow-xs">
              <span className="font-mono text-xs uppercase tracking-wider text-verity-ink-soft block mb-1">
                Total Permohonan
              </span>
              <p className="font-serif text-3xl font-bold text-verity-ink">{overview.total}</p>
              <p className="text-xs text-verity-ink-soft mt-1">Semua jalur pendaftaran</p>
            </div>

            <div className="bg-white border border-amber-300 bg-amber-50/30 rounded-xl p-5 shadow-xs">
              <span className="font-mono text-xs uppercase tracking-wider text-amber-900 block mb-1">
                Menunggu Review
              </span>
              <p className="font-serif text-3xl font-bold text-amber-900">{overview.pending}</p>
              <p className="text-xs text-amber-800 mt-1">Perlu keputusan Pemred</p>
            </div>

            <div className="bg-white border border-emerald-300 bg-emerald-50/30 rounded-xl p-5 shadow-xs">
              <span className="font-mono text-xs uppercase tracking-wider text-emerald-900 block mb-1">
                Disetujui
              </span>
              <p className="font-serif text-3xl font-bold text-emerald-900">{overview.approved}</p>
              <p className="text-xs text-emerald-800 mt-1">Telah diterbitkan undangan</p>
            </div>

            <div className="bg-white border border-rose-300 bg-rose-50/30 rounded-xl p-5 shadow-xs">
              <span className="font-mono text-xs uppercase tracking-wider text-rose-900 block mb-1">
                Ditolak
              </span>
              <p className="font-serif text-3xl font-bold text-rose-900">{overview.rejected}</p>
              <p className="text-xs text-rose-800 mt-1">Tidak memenuhi syarat</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white border border-verity-rule rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shadow-xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-verity-ink-soft" />
              <Input
                type="text"
                placeholder="Cari nama, email, atau bidang minat..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-verity-paper/40 text-xs font-sans"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs font-mono">
              {[
                { id: "ALL", label: "Semua" },
                { id: "PENDING", label: "Menunggu" },
                { id: "APPROVED", label: "Disetujui" },
                { id: "REJECTED", label: "Ditolak" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    statusFilter === tab.id
                      ? "bg-verity-ink text-white font-semibold"
                      : "text-verity-ink-soft hover:bg-verity-paper-warm"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Applications Table */}
          <div className="bg-white border border-verity-rule rounded-xl shadow-xs overflow-hidden">
            {appsLoading ? (
              <div className="p-12 text-center text-xs font-mono text-verity-ink-soft">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-verity-ink mb-2" />
                Memuat daftar permohonan...
              </div>
            ) : applications.length === 0 ? (
              <div className="p-12 text-center space-y-2 text-verity-ink-soft">
                <UserCheck className="w-8 h-8 mx-auto opacity-40" />
                <p className="font-serif text-base text-verity-ink">
                  Tidak ada permohonan volunteer yang sesuai kriteria.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-verity-rule bg-verity-paper-soft text-[11px] font-mono uppercase text-verity-ink-soft tracking-wider">
                      <th className="py-3 px-4">Calon Kontributor</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Fokus Minat</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Tanggal Pengajuan</th>
                      <th className="py-3 px-4 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-verity-rule text-sm">
                    {applications.map((app) => (
                      <tr key={app.id} className="hover:bg-verity-paper-warm/40 transition-colors">
                        <td className="py-3 px-4 font-serif font-medium text-verity-ink">
                          {app.name}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-verity-ink-soft">
                          {app.email}
                        </td>
                        <td className="py-3 px-4 text-xs text-verity-ink-soft max-w-xs truncate">
                          {app.interests || "-"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-mono border ${
                              app.status === "PENDING"
                                ? "bg-amber-50 text-amber-800 border-amber-300"
                                : app.status === "APPROVED"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : "bg-rose-50 text-rose-800 border-rose-300"
                            }`}
                          >
                            {app.status === "PENDING"
                              ? "Menunggu"
                              : app.status === "APPROVED"
                              ? "Disetujui"
                              : "Ditolak"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-verity-ink-soft whitespace-nowrap">
                          {new Date(app.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedAppId(app.id)}
                            className="font-mono text-xs h-7 px-2.5"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Detail
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Tab Kontributor Terdaftar */
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-verity-rule rounded-xl p-5 shadow-xs">
              <span className="font-mono text-xs uppercase tracking-wider text-verity-ink-soft block mb-1">
                Total Kontributor
              </span>
              <p className="font-serif text-3xl font-bold text-verity-ink">
                {volunteersData?.overview.total ?? 0}
              </p>
            </div>
            <div className="bg-white border border-emerald-300 bg-emerald-50/30 rounded-xl p-5 shadow-xs">
              <span className="font-mono text-xs uppercase tracking-wider text-emerald-900 block mb-1">
                Kontributor Aktif
              </span>
              <p className="font-serif text-3xl font-bold text-emerald-900">
                {volunteersData?.overview.active ?? 0}
              </p>
            </div>
            <div className="bg-white border border-rose-300 bg-rose-50/30 rounded-xl p-5 shadow-xs">
              <span className="font-mono text-xs uppercase tracking-wider text-rose-900 block mb-1">
                Dinonaktifkan
              </span>
              <p className="font-serif text-3xl font-bold text-rose-900">
                {volunteersData?.overview.suspended ?? 0}
              </p>
            </div>
          </div>

          <div className="bg-white border border-verity-rule rounded-xl shadow-xs overflow-hidden">
            {volunteersLoading ? (
              <div className="p-12 text-center text-xs font-mono text-verity-ink-soft">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-verity-ink mb-2" />
                Memuat kontributor...
              </div>
            ) : (volunteersData?.volunteers ?? []).length === 0 ? (
              <div className="p-12 text-center space-y-2 text-verity-ink-soft">
                <Users className="w-8 h-8 mx-auto opacity-40" />
                <p className="font-serif text-base text-verity-ink">
                  Belum ada kontributor eksternal yang diaktifkan.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-verity-rule bg-verity-paper-soft text-[11px] font-mono uppercase text-verity-ink-soft tracking-wider">
                      <th className="py-3 px-4">Nama Publik / Byline</th>
                      <th className="py-3 px-4">Nama Pengguna</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Naskah</th>
                      <th className="py-3 px-4">Login Terakhir</th>
                      <th className="py-3 px-4 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-verity-rule text-sm">
                    {volunteersData?.volunteers.map((v) => (
                      <tr key={v.id} className="hover:bg-verity-paper-warm/40 transition-colors">
                        <td className="py-3 px-4 font-serif font-medium text-verity-ink">
                          {v.name}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-verity-ink-soft">
                          @{v.username || "-"}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-verity-ink-soft">
                          {v.email}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-mono border ${
                              v.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : "bg-rose-50 text-rose-800 border-rose-300"
                            }`}
                          >
                            {v.status === "ACTIVE" ? "Aktif" : "Dinonaktifkan"}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-verity-ink">
                          {v.articleCount} karya
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-verity-ink-soft whitespace-nowrap">
                          {v.lastLoginAt
                            ? new Date(v.lastLoginAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "Belum pernah"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {v.status === "ACTIVE" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Nonaktifkan akun kontributor ${v.name}? Kontributor tidak akan dapat masuk ke portal.`
                                  )
                                ) {
                                  volunteerStatusMutation.mutate({ id: v.id, status: "SUSPENDED" });
                                }
                              }}
                              className="border-rose-200 text-rose-800 hover:bg-rose-50 text-xs font-mono h-7"
                            >
                              Nonaktifkan
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                volunteerStatusMutation.mutate({ id: v.id, status: "ACTIVE" })
                              }
                              className="border-emerald-200 text-emerald-800 hover:bg-emerald-50 text-xs font-mono h-7"
                            >
                              Aktifkan Kembali
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Detail Permohonan */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-verity-rule max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-verity-rule pb-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-verity-accent">
                  Detail Permohonan Volunteer
                </p>
                <h2 className="font-serif text-2xl font-bold text-verity-ink mt-1">
                  {selectedApp.name}
                </h2>
                <p className="font-mono text-xs text-verity-ink-soft">{selectedApp.email}</p>
              </div>

              <button
                onClick={() => setSelectedAppId(null)}
                className="text-verity-ink-soft hover:text-verity-ink font-mono text-sm p-1"
              >
                Tutup [ESC]
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="font-mono uppercase text-verity-ink-soft block mb-1">
                  Biografi Singkat
                </span>
                <p className="font-serif text-sm text-verity-ink leading-relaxed bg-verity-paper p-3 rounded border border-verity-rule/60">
                  {selectedApp.bio || "Tidak dicantumkan."}
                </p>
              </div>

              <div>
                <span className="font-mono uppercase text-verity-ink-soft block mb-1">
                  Fokus Bidang Minat
                </span>
                <p className="font-mono text-verity-ink font-semibold">
                  {selectedApp.interests || "Tidak dicantumkan"}
                </p>
              </div>

              {selectedApp.portfolioUrl && (
                <div>
                  <span className="font-mono uppercase text-verity-ink-soft block mb-1">
                    Portofolio / Tautan Karya
                  </span>
                  <a
                    href={selectedApp.portfolioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-verity-accent hover:underline flex items-center gap-1 font-mono"
                  >
                    <span>{selectedApp.portfolioUrl}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              <div>
                <span className="font-mono uppercase text-verity-ink-soft block mb-1">
                  Contoh Naskah / Gagasan Penulisan
                </span>
                <p className="font-serif text-sm text-verity-ink leading-relaxed bg-verity-paper p-3 rounded border border-verity-rule/60 whitespace-pre-line">
                  {selectedApp.sampleArticle || "Tidak dicantumkan."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-verity-rule pt-3 font-mono text-[11px]">
                <div>
                  <span className="text-verity-ink-soft block">Deklarasi Usia 18+:</span>
                  <span className="text-emerald-800 font-semibold">
                    Sah ({new Date(selectedApp.adultConfirmedAt).toLocaleDateString("id-ID")})
                  </span>
                </div>
                <div>
                  <span className="text-verity-ink-soft block">Persetujuan Pedoman:</span>
                  <span className="text-emerald-800 font-semibold">Disetujui</span>
                </div>
              </div>

              {selectedApp.decisionNote && (
                <div className="p-3 bg-verity-paper border border-verity-rule rounded space-y-1">
                  <span className="font-mono uppercase text-verity-ink-soft block">
                    Catatan Keputusan Redaksi:
                  </span>
                  <p className="text-verity-ink">{selectedApp.decisionNote}</p>
                  <p className="text-[10px] text-verity-ink-soft font-mono">
                    Oleh: {selectedApp.decidedByName} ({new Date(selectedApp.decidedAt!).toLocaleDateString("id-ID")})
                  </p>
                </div>
              )}
            </div>

            {/* Actions for PENDING applications */}
            {selectedApp.status === "PENDING" && (
              <div className="border-t border-verity-rule pt-4 flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setRejectingAppId(selectedApp.id)}
                  className="border-rose-300 text-rose-800 hover:bg-rose-50 font-mono text-xs"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  Tolak Permohonan
                </Button>
                <Button
                  onClick={() =>
                    decideMutation.mutate({ id: selectedApp.id, decision: "APPROVE" })
                  }
                  disabled={decideMutation.isPending}
                  className="bg-verity-ink text-white hover:bg-verity-accent font-mono text-xs"
                >
                  {decideMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  Terima & Terbitkan Tautan Aktivasi
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Tolak Permohonan */}
      {rejectingAppId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-verity-rule max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-serif text-lg font-bold text-verity-ink">
              Tolak Permohonan Volunteer
            </h3>
            <p className="text-xs text-verity-ink-soft">
              Masukkan alasan penolakan permohonan untuk keperluan catatan audit redaksi.
            </p>
            <Textarea
              rows={3}
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              placeholder="Contoh: Portofolio belum mencerminkan standar riset rujukan primer..."
              className="text-xs"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRejectingAppId(null)}
                className="text-xs font-mono"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  decideMutation.mutate({
                    id: rejectingAppId,
                    decision: "REJECT",
                    note: decisionNote,
                  })
                }
                disabled={decideMutation.isPending}
                className="bg-rose-700 text-white hover:bg-rose-800 text-xs font-mono"
              >
                Konfirmasi Penolakan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sukses Aktivasi & Salin Tautan */}
      {activationResult && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-emerald-200 max-w-lg w-full p-6 space-y-5 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-serif text-xl font-bold text-emerald-950">
                Permohonan Berhasil Disetujui
              </h3>
              <p className="text-xs text-emerald-900 mt-1">
                Tautan aktivasi kriptografis sekali pakai telah diterbitkan untuk{" "}
                <strong>{activationResult.name}</strong>. Tautan berlaku selama 7 hari.
              </p>
            </div>

            <div className="p-3 bg-verity-paper border border-verity-rule rounded-lg flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-verity-ink truncate">
                {typeof window !== "undefined" ? window.location.origin : ""}
                {activationResult.activationUrl}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyActivationLink(activationResult.activationUrl)}
                className="shrink-0 text-xs font-mono h-8"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                ) : (
                  <Copy className="w-3.5 h-3.5 mr-1" />
                )}
                {copied ? "Tersalin!" : "Salin"}
              </Button>
            </div>

            <Button
              className="w-full bg-verity-ink text-white hover:bg-verity-accent text-xs font-mono"
              onClick={() => setActivationResult(null)}
            >
              Selesai
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

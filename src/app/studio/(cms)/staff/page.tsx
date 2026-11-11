"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserX,
  Clock,
  Search,
  Filter,
  MoreVertical,
  Check,
  Copy,
  AlertCircle,
  RefreshCw,
  Ban,
  RotateCcw,
  Edit2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch, apiErrorMessage } from "@/components/studio/api";
import type { StaffUserDTO, StaffInvitationDTO, StaffOverviewDTO } from "@/types/verity";
import { formatDateShort } from "@/lib/format";

interface StaffResponse {
  staff: StaffUserDTO[];
  overview: StaffOverviewDTO;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface InvitationsResponse {
  invitations: StaffInvitationDTO[];
}

export default function StaffManagementPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"members" | "invitations">("members");

  // Filter & Pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);

  // Modal states
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffUserDTO | null>(null);

  // Invite form state
  const [inviteName, setInviteName] = useState("");
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editBio, setEditBio] = useState("");

  // Confirmation state
  const [confirmAction, setConfirmAction] = useState<{
    type: "suspend" | "reactivate" | "revoke" | "resend";
    targetId: string;
    targetName: string;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Fetch Staff Members & Overview
  const {
    data: staffData,
    isLoading: isStaffLoading,
    refetch: refetchStaff,
  } = useQuery({
    queryKey: ["staff", searchQuery, roleFilter, statusFilter, page],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "15",
      });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      return apiFetch<StaffResponse>(`/api/studio/staff?${params.toString()}`);
    },
  });

  // 2. Fetch Invitations
  const { data: invitationsData, isLoading: isInvitesLoading } = useQuery({
    queryKey: ["staff-invitations"],
    queryFn: () => apiFetch<InvitationsResponse>("/api/studio/staff/invitations"),
  });

  // 3. Invite Writer Mutation
  const inviteMutation = useMutation({
    mutationFn: (payload: { name: string; username: string; email?: string }) =>
      apiFetch<{
        invitation: StaffInvitationDTO;
        activationToken: string;
        activationUrl: string;
      }>("/api/studio/staff/invitations", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (res) => {
      const fullUrl = `${window.location.origin}${res.activationUrl}`;
      setCreatedInviteUrl(fullUrl);
      setFormError(null);
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
      void queryClient.invalidateQueries({ queryKey: ["staff-invitations"] });
    },
    onError: (err) => {
      setFormError(apiErrorMessage(err));
    },
  });

  // 4. Update Staff Mutation
  const updateStaffMutation = useMutation({
    mutationFn: (payload: { id: string; name: string; email: string | null; bio: string | null }) =>
      apiFetch<{ staff: StaffUserDTO }>(`/api/studio/staff/${payload.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: payload.name,
          email: payload.email,
          bio: payload.bio,
        }),
      }),
    onSuccess: () => {
      setIsEditOpen(false);
      setSelectedStaff(null);
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (err) => {
      setFormError(apiErrorMessage(err));
    },
  });

  // 5. Suspend / Reactivate Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "SUSPENDED" }) =>
      apiFetch<{ staff: StaffUserDTO }>(`/api/studio/staff/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      setConfirmAction(null);
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (err) => {
      setActionError(apiErrorMessage(err));
    },
  });

  // 6. Revoke Invitation Mutation
  const revokeInviteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ success: boolean }>(`/api/studio/staff/invitations/${id}/revoke`, {
        method: "POST",
      }),
    onSuccess: () => {
      setConfirmAction(null);
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
      void queryClient.invalidateQueries({ queryKey: ["staff-invitations"] });
    },
    onError: (err) => {
      setActionError(apiErrorMessage(err));
    },
  });

  // 7. Resend Invitation Mutation
  const resendInviteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{
        invitation: StaffInvitationDTO;
        activationToken: string;
        activationUrl: string;
      }>(`/api/studio/staff/invitations/${id}/resend`, {
        method: "POST",
      }),
    onSuccess: (res) => {
      setConfirmAction(null);
      setActionError(null);
      const fullUrl = `${window.location.origin}${res.activationUrl}`;
      setCreatedInviteUrl(fullUrl);
      setIsInviteOpen(true);
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
      void queryClient.invalidateQueries({ queryKey: ["staff-invitations"] });
    },
    onError: (err) => {
      setActionError(apiErrorMessage(err));
    },
  });

  const handleCopyLink = () => {
    if (createdInviteUrl) {
      void navigator.clipboard.writeText(createdInviteUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  };

  const handleOpenEdit = (member: StaffUserDTO) => {
    setSelectedStaff(member);
    setEditName(member.name);
    setEditEmail(member.email || "");
    setEditBio(member.bio || "");
    setFormError(null);
    setIsEditOpen(true);
  };

  const overview = staffData?.overview || {
    total: 0,
    active: 0,
    suspended: 0,
    pendingInvitations: 0,
  };

  return (
    <div className="space-y-8">
      {/* Header Halaman */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-verity-rule pb-5">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-verity-ink sm:text-3xl">
            Tim Redaksi
          </h1>
          <p className="mt-1 text-sm text-verity-ink-soft">
            Pengelolaan anggota ruang redaksi, struktur akun, dan tautan aktivasi penulis.
          </p>
        </div>
        <Button
          onClick={() => {
            setInviteName("");
            setInviteUsername("");
            setInviteEmail("");
            setCreatedInviteUrl(null);
            setFormError(null);
            setIsInviteOpen(true);
          }}
          className="flex items-center gap-2 bg-verity-ink text-verity-paper hover:bg-verity-ink-soft"
        >
          <UserPlus className="size-4" />
          <span>Undang Penulis</span>
        </Button>
      </div>

      {/* Ringkasan Metrik (Overview) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="border border-verity-rule bg-verity-paper p-4">
          <div className="flex items-center gap-2 text-verity-ink-soft">
            <Users className="size-4" />
            <span className="font-mono text-xs uppercase tracking-wider">Total Anggota</span>
          </div>
          <p className="mt-2 font-serif text-3xl font-semibold text-verity-ink">
            {overview.total}
          </p>
          <p className="mt-1 text-xs text-verity-ink-faint">Seluruh staf terdaftar</p>
        </div>

        <div className="border border-verity-rule bg-verity-paper p-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <ShieldCheck className="size-4" />
            <span className="font-mono text-xs uppercase tracking-wider">Akun Aktif</span>
          </div>
          <p className="mt-2 font-serif text-3xl font-semibold text-emerald-800">
            {overview.active}
          </p>
          <p className="mt-1 text-xs text-verity-ink-faint">Dapat mengakses studio</p>
        </div>

        <div className="border border-verity-rule bg-verity-paper p-4">
          <div className="flex items-center gap-2 text-rose-700">
            <UserX className="size-4" />
            <span className="font-mono text-xs uppercase tracking-wider">Ditangguhkan</span>
          </div>
          <p className="mt-2 font-serif text-3xl font-semibold text-rose-800">
            {overview.suspended}
          </p>
          <p className="mt-1 text-xs text-verity-ink-faint">Akses masuk dinonaktifkan</p>
        </div>

        <div className="border border-verity-rule bg-verity-paper p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <Clock className="size-4" />
            <span className="font-mono text-xs uppercase tracking-wider">Menunggu Aktivasi</span>
          </div>
          <p className="mt-2 font-serif text-3xl font-semibold text-amber-800">
            {overview.pendingInvitations}
          </p>
          <p className="mt-1 text-xs text-verity-ink-faint">Undangan belum diklaim</p>
        </div>
      </div>

      {/* Tabs: Daftar Anggota vs Undangan Aktivasi */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "members" | "invitations")}
        className="w-full"
      >
        <div className="flex items-center justify-between border-b border-verity-rule pb-2">
          <TabsList className="bg-transparent p-0 gap-6">
            <TabsTrigger
              value="members"
              className="rounded-none border-b-2 border-transparent px-2 pb-2 pt-1 font-mono text-xs uppercase tracking-wider text-verity-ink-soft data-[state=active]:border-verity-ink data-[state=active]:text-verity-ink data-[state=active]:font-semibold"
            >
              Daftar Anggota ({overview.total})
            </TabsTrigger>
            <TabsTrigger
              value="invitations"
              className="rounded-none border-b-2 border-transparent px-2 pb-2 pt-1 font-mono text-xs uppercase tracking-wider text-verity-ink-soft data-[state=active]:border-verity-ink data-[state=active]:text-verity-ink data-[state=active]:font-semibold"
            >
              Undangan Menunggu ({overview.pendingInvitations})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Daftar Anggota */}
        <TabsContent value="members" className="pt-4 space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 size-4 text-verity-ink-faint" />
              <Input
                placeholder="Cari nama, username, atau email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-9 bg-verity-paper border-verity-rule text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={roleFilter}
                onValueChange={(val) => {
                  setRoleFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[150px] bg-verity-paper border-verity-rule text-xs">
                  <SelectValue placeholder="Peran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Peran</SelectItem>
                  <SelectItem value="CHIEF_EDITOR">Pemimpin Redaksi</SelectItem>
                  <SelectItem value="WRITER">Penulis</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[150px] bg-verity-paper border-verity-rule text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  <SelectItem value="ACTIVE">Aktif</SelectItem>
                  <SelectItem value="SUSPENDED">Ditangguhkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabel Anggota */}
          <div className="border border-verity-rule bg-verity-paper overflow-x-auto">
            <table className="w-full text-left text-sm text-verity-ink">
              <thead className="border-b border-verity-rule bg-verity-paper-soft font-mono text-[11px] uppercase tracking-wider text-verity-ink-soft">
                <tr>
                  <th className="px-4 py-3">Nama Anggota</th>
                  <th className="px-4 py-3">Email Kontak</th>
                  <th className="px-4 py-3">Peran</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Bergabung</th>
                  <th className="px-4 py-3">Terakhir Masuk</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-verity-rule">
                {isStaffLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-verity-ink-faint">
                      Memuat daftar tim redaksi...
                    </td>
                  </tr>
                ) : staffData?.staff && staffData.staff.length > 0 ? (
                  staffData.staff.map((member) => (
                    <tr key={member.id} className="hover:bg-verity-paper-soft/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-verity-ink">{member.name}</div>
                        <div className="font-mono text-xs text-verity-ink-faint">
                          @{member.username}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-verity-ink-soft">
                        {member.email || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {member.role === "CHIEF_EDITOR" ? (
                          <Badge className="bg-verity-ink text-verity-paper font-mono text-[10px] uppercase tracking-wider rounded-[2px]">
                            Pemimpin Redaksi
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-verity-rule font-mono text-[10px] uppercase tracking-wider text-verity-ink-soft rounded-[2px]"
                          >
                            Penulis
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {member.status === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800">
                            <span className="size-1.5 rounded-full bg-emerald-600" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-rose-800">
                            <span className="size-1.5 rounded-full bg-rose-600" />
                            Ditangguhkan
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-verity-ink-soft">
                        {formatDateShort(member.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-verity-ink-soft">
                        {member.lastLoginAt ? formatDateShort(member.lastLoginAt) : "Belum pernah"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="size-8 p-0">
                              <MoreVertical className="size-4 text-verity-ink-soft" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 bg-verity-paper border-verity-rule">
                            <DropdownMenuItem
                              onClick={() => handleOpenEdit(member)}
                              className="cursor-pointer text-xs"
                            >
                              <Edit2 className="mr-2 size-3.5" />
                              Sunting Profil
                            </DropdownMenuItem>
                            {member.status === "ACTIVE" ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  setConfirmAction({
                                    type: "suspend",
                                    targetId: member.id,
                                    targetName: member.name,
                                  })
                                }
                                className="cursor-pointer text-xs text-rose-700 focus:text-rose-700"
                              >
                                <Ban className="mr-2 size-3.5" />
                                Tangguhkan Akun
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() =>
                                  setConfirmAction({
                                    type: "reactivate",
                                    targetId: member.id,
                                    targetName: member.name,
                                  })
                                }
                                className="cursor-pointer text-xs text-emerald-700 focus:text-emerald-700"
                              >
                                <RotateCcw className="mr-2 size-3.5" />
                                Aktifkan Kembali
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-verity-ink-faint">
                      Tidak ditemukan anggota staf yang sesuai dengan kriteria filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {staffData?.pagination && staffData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-verity-rule pt-4 text-xs text-verity-ink-soft">
              <div>
                Halaman {staffData.pagination.page} dari {staffData.pagination.totalPages} ({staffData.pagination.total} total)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="border-verity-rule text-xs"
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= staffData.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="border-verity-rule text-xs"
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Undangan Aktivasi */}
        <TabsContent value="invitations" className="pt-4 space-y-4">
          <div className="border border-verity-rule bg-verity-paper overflow-x-auto">
            <table className="w-full text-left text-sm text-verity-ink">
              <thead className="border-b border-verity-rule bg-verity-paper-soft font-mono text-[11px] uppercase tracking-wider text-verity-ink-soft">
                <tr>
                  <th className="px-4 py-3">Nama Undangan</th>
                  <th className="px-4 py-3">Email Kontak</th>
                  <th className="px-4 py-3">Peran</th>
                  <th className="px-4 py-3">Masa Berlaku</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-verity-rule">
                {isInvitesLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-verity-ink-faint">
                      Memuat daftar undangan aktivasi...
                    </td>
                  </tr>
                ) : invitationsData?.invitations && invitationsData.invitations.length > 0 ? (
                  invitationsData.invitations.map((inv) => {
                    const isExpired = new Date() > new Date(inv.expiresAt);
                    const isClaimed = Boolean(inv.acceptedAt);
                    const isRevoked = Boolean(inv.revokedAt);
                    const isPending = !isClaimed && !isRevoked && !isExpired;

                    return (
                      <tr key={inv.id} className="hover:bg-verity-paper-soft/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-verity-ink">{inv.name}</div>
                          <div className="font-mono text-xs text-verity-ink-faint">
                            @{inv.username}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-verity-ink-soft">
                          {inv.email || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className="border-verity-rule font-mono text-[10px] uppercase tracking-wider text-verity-ink-soft rounded-[2px]"
                          >
                            Penulis
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-verity-ink-soft">
                          {formatDateShort(inv.expiresAt)}
                        </td>
                        <td className="px-4 py-3">
                          {isClaimed ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-mono rounded-[2px]">
                              Telah Diaktifkan
                            </Badge>
                          ) : isRevoked ? (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] font-mono rounded-[2px]">
                              Dicabut
                            </Badge>
                          ) : isExpired ? (
                            <Badge className="bg-stone-100 text-stone-700 border-stone-200 text-[10px] font-mono rounded-[2px]">
                              Kedaluwarsa
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-mono rounded-[2px]">
                              Menunggu Aktivasi
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isPending && (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setConfirmAction({
                                    type: "resend",
                                    targetId: inv.id,
                                    targetName: inv.name,
                                  })
                                }
                                className="h-7 border-verity-rule text-xs"
                              >
                                <RefreshCw className="mr-1 size-3" />
                                Kirim Ulang
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setConfirmAction({
                                    type: "revoke",
                                    targetId: inv.id,
                                    targetName: inv.name,
                                  })
                                }
                                className="h-7 border-rose-200 text-rose-700 hover:bg-rose-50 text-xs"
                              >
                                Cabut
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-verity-ink-faint">
                      Belum ada undangan yang pernah dikirimkan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal 1: Undang Penulis */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-md bg-verity-paper border-verity-rule text-verity-ink">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold">
              {createdInviteUrl ? "Tautan Undangan Siap Dikirim" : "Undang Penulis Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs text-verity-ink-soft">
              {createdInviteUrl
                ? "Tautan ini hanya ditampilkan satu kali demi keamanan. Salin dan kirimkan secara aman kepada calon penulis."
                : "Chief Editor mengundang penulis ke tim internal. Calon penulis akan menentukan kata sandi sendiri melalui tautan aktivasi satu kali pakai."}
            </DialogDescription>
          </DialogHeader>

          {createdInviteUrl ? (
            <div className="space-y-4 py-3">
              <div className="border border-verity-rule bg-verity-paper-soft p-3">
                <p className="font-mono text-xs text-verity-ink-soft mb-1 uppercase tracking-wider">
                  Tautan Aktivasi
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={createdInviteUrl}
                    className="font-mono text-xs bg-verity-paper border-verity-rule selection:bg-verity-ink selection:text-verity-paper"
                  />
                  <Button
                    onClick={handleCopyLink}
                    variant="outline"
                    className="shrink-0 border-verity-rule flex items-center gap-1.5 text-xs"
                  >
                    {copySuccess ? (
                      <>
                        <Check className="size-3.5 text-emerald-600" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" />
                        <span>Salin</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="rounded-[2px] bg-amber-50 p-3 border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-medium">Ketentuan Keamanan:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-amber-800">
                  <li>Tautan berlaku selama 7 hari sejak diterbitkan.</li>
                  <li>Hanya dapat digunakan satu kali untuk mengaktifkan akun.</li>
                  <li>Token tidak disimpan dalam bentuk teks biasa di basis data.</li>
                </ul>
              </div>

              <DialogFooter className="mt-4">
                <Button
                  onClick={() => {
                    setIsInviteOpen(false);
                    setCreatedInviteUrl(null);
                  }}
                  className="w-full bg-verity-ink text-verity-paper hover:bg-verity-ink-soft"
                >
                  Selesai
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setFormError(null);
                inviteMutation.mutate({
                  name: inviteName,
                  username: inviteUsername,
                  email: inviteEmail ? inviteEmail : undefined,
                });
              }}
              className="space-y-4 py-3"
            >
              {formError && (
                <div className="flex items-center gap-2 rounded-[2px] bg-rose-50 p-3 border border-rose-200 text-xs text-rose-800">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-verity-ink">Nama Lengkap</label>
                <Input
                  required
                  placeholder="Contoh: Raden Wijaya"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="bg-verity-paper border-verity-rule text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-verity-ink">
                  Nama Pengguna (Username Login)
                </label>
                <Input
                  required
                  placeholder="Contoh: rwijaya"
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))}
                  className="bg-verity-paper border-verity-rule font-mono text-sm"
                />
                <p className="text-[11px] text-verity-ink-faint">
                  Digunakan untuk masuk ke Studio. Huruf kecil, angka, titik, garis bawah, atau tanda hubung.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-verity-ink">
                  Email Kontak (Opsional)
                </label>
                <Input
                  type="email"
                  placeholder="penulis@veraxpress.id"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="bg-verity-paper border-verity-rule text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-verity-ink">Peran Akses</label>
                <Input
                  readOnly
                  disabled
                  value="Penulis (WRITER)"
                  className="bg-verity-paper-soft border-verity-rule text-sm text-verity-ink-soft cursor-not-allowed"
                />
                <p className="text-[11px] text-verity-ink-faint">
                  Peran otomatis ditetapkan sebagai Penulis internal. Tidak dapat membuat Chief Editor kedua.
                </p>
              </div>

              <DialogFooter className="mt-6 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsInviteOpen(false)}
                  className="border-verity-rule text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="bg-verity-ink text-verity-paper hover:bg-verity-ink-soft text-xs"
                >
                  {inviteMutation.isPending ? "Menerbitkan..." : "Terbitkan Undangan"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal 2: Sunting Profil Staf */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md bg-verity-paper border-verity-rule text-verity-ink">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold">Sunting Profil Staf</DialogTitle>
            <DialogDescription className="text-xs text-verity-ink-soft">
              Perbarui identitas profil dan alamat kontak anggota redaksi.
            </DialogDescription>
          </DialogHeader>

          {selectedStaff && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setFormError(null);
                updateStaffMutation.mutate({
                  id: selectedStaff.id,
                  name: editName,
                  email: editEmail.trim() ? editEmail.trim() : null,
                  bio: editBio.trim() ? editBio.trim() : null,
                });
              }}
              className="space-y-4 py-3"
            >
              {formError && (
                <div className="flex items-center gap-2 rounded-[2px] bg-rose-50 p-3 border border-rose-200 text-xs text-rose-800">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-verity-ink">Nama Pengguna (Tetap)</label>
                <Input
                  disabled
                  value={`@${selectedStaff.username}`}
                  className="bg-verity-paper-soft border-verity-rule font-mono text-sm text-verity-ink-faint cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-verity-ink">Nama Lengkap</label>
                <Input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-verity-paper border-verity-rule text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-verity-ink">Email Kontak</label>
                <Input
                  type="email"
                  placeholder="nama@veraxpress.id"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="bg-verity-paper border-verity-rule text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-verity-ink">Biografi Singkat (Profil Publik)</label>
                <Input
                  placeholder="Deskripsi singkat kepakaran atau fokus liputan..."
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="bg-verity-paper border-verity-rule text-sm"
                />
              </div>

              <DialogFooter className="mt-6 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                  className="border-verity-rule text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={updateStaffMutation.isPending}
                  className="bg-verity-ink text-verity-paper hover:bg-verity-ink-soft text-xs"
                >
                  {updateStaffMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog open={Boolean(confirmAction)} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent className="sm:max-w-md bg-verity-paper border-verity-rule text-verity-ink">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold">
              {confirmAction?.type === "suspend" && "Tangguhkan Akun Staf"}
              {confirmAction?.type === "reactivate" && "Aktifkan Kembali Akun Staf"}
              {confirmAction?.type === "revoke" && "Cabut Undangan Aktivasi"}
              {confirmAction?.type === "resend" && "Kirim Ulang Undangan"}
            </DialogTitle>
            <DialogDescription className="text-xs text-verity-ink-soft">
              {confirmAction?.type === "suspend" &&
                `Apakah Anda yakin ingin menangguhkan akses ${confirmAction.targetName}? Akun yang ditangguhkan tidak akan dapat masuk ke sistem.`}
              {confirmAction?.type === "reactivate" &&
                `Aktifkan kembali akses studio untuk ${confirmAction.targetName}?`}
              {confirmAction?.type === "revoke" &&
                `Cabut undangan untuk ${confirmAction.targetName}? Tautan aktivasi yang telah diterbitkan akan langsung dibatalkan.`}
              {confirmAction?.type === "resend" &&
                `Terbitkan tautan aktivasi baru untuk ${confirmAction.targetName}? Tautan sebelumnya akan otomatis dicabut.`}
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <div className="flex items-center gap-2 rounded-[2px] bg-rose-50 p-3 border border-rose-200 text-xs text-rose-800">
              <AlertCircle className="size-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          <DialogFooter className="mt-4 flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmAction(null);
                setActionError(null);
              }}
              className="border-verity-rule text-xs"
            >
              Batal
            </Button>
            {confirmAction?.type === "suspend" && (
              <Button
                variant="destructive"
                onClick={() =>
                  toggleStatusMutation.mutate({
                    id: confirmAction.targetId,
                    status: "SUSPENDED",
                  })
                }
                disabled={toggleStatusMutation.isPending}
                className="text-xs"
              >
                {toggleStatusMutation.isPending ? "Memproses..." : "Ya, Tangguhkan"}
              </Button>
            )}
            {confirmAction?.type === "reactivate" && (
              <Button
                onClick={() =>
                  toggleStatusMutation.mutate({
                    id: confirmAction.targetId,
                    status: "ACTIVE",
                  })
                }
                disabled={toggleStatusMutation.isPending}
                className="bg-verity-ink text-verity-paper hover:bg-verity-ink-soft text-xs"
              >
                {toggleStatusMutation.isPending ? "Memproses..." : "Aktifkan Kembali"}
              </Button>
            )}
            {confirmAction?.type === "revoke" && (
              <Button
                variant="destructive"
                onClick={() => revokeInviteMutation.mutate(confirmAction.targetId)}
                disabled={revokeInviteMutation.isPending}
                className="text-xs"
              >
                {revokeInviteMutation.isPending ? "Mencabut..." : "Cabut Undangan"}
              </Button>
            )}
            {confirmAction?.type === "resend" && (
              <Button
                onClick={() => resendInviteMutation.mutate(confirmAction.targetId)}
                disabled={resendInviteMutation.isPending}
                className="bg-verity-ink text-verity-paper hover:bg-verity-ink-soft text-xs"
              >
                {resendInviteMutation.isPending ? "Menerbitkan..." : "Terbitkan Tautan Baru"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

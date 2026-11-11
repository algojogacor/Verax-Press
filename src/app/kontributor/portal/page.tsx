"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  ExternalLink,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DashboardMetrics {
  totalArticles: number;
  draftCount: number;
  inReviewCount: number;
  revisionCount: number;
  publishedCount: number;
}

interface ContributorArticleItem {
  id: string;
  slug: string;
  title: string;
  format: string;
  status: string;
  desk: { id: string; name: string; slug: string };
  sourceCount: number;
  updatedAt: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draf", color: "bg-slate-100 text-slate-700 border-slate-300" },
  PENDING_REVIEW: { label: "Antrean Review", color: "bg-amber-50 text-amber-800 border-amber-300" },
  FACT_CHECK: { label: "Pemeriksaan Fakta", color: "bg-sky-50 text-sky-800 border-sky-300" },
  REVISION_NEEDED: { label: "Perlu Revisi", color: "bg-rose-50 text-rose-800 border-rose-300" },
  PENDING_APPROVAL: { label: "Menunggu Persetujuan", color: "bg-indigo-50 text-indigo-800 border-indigo-300" },
  PUBLISHED: { label: "Terbit", color: "bg-emerald-50 text-emerald-800 border-emerald-300" },
  REJECTED: { label: "Ditolak", color: "bg-rose-100 text-rose-900 border-rose-400" },
  WITHDRAWN: { label: "Ditarik", color: "bg-zinc-100 text-zinc-700 border-zinc-300" },
};

export default function ContributorDashboardPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: dashboard, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["contributor-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/contributor/dashboard");
      if (!res.ok) throw new Error("Gagal memuat metrik dashboard.");
      return res.json();
    },
  });

  const { data: articlesData, isLoading: articlesLoading } = useQuery<{
    articles: ContributorArticleItem[];
  }>({
    queryKey: ["contributor-articles"],
    queryFn: async () => {
      const res = await fetch("/api/contributor/articles");
      if (!res.ok) throw new Error("Gagal memuat daftar naskah.");
      return res.json();
    },
  });

  const metrics = dashboard ?? {
    totalArticles: 0,
    draftCount: 0,
    inReviewCount: 0,
    revisionCount: 0,
    publishedCount: 0,
  };

  const articles = articlesData?.articles ?? [];

  const filteredArticles = articles.filter((a) => {
    const matchesSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.desk.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter === "ALL") return true;
    if (statusFilter === "DRAFT_REVISION") {
      return a.status === "DRAFT" || a.status === "REVISION_NEEDED";
    }
    if (statusFilter === "IN_REVIEW") {
      return (
        a.status === "PENDING_REVIEW" ||
        a.status === "FACT_CHECK" ||
        a.status === "PENDING_APPROVAL"
      );
    }
    if (statusFilter === "PUBLISHED") {
      return a.status === "PUBLISHED";
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Page Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-verity-rule pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-verity-accent">
            Ruang Kerja Penulis
          </p>
          <h1 className="font-serif text-3xl font-bold text-verity-ink mt-1">
            Naskah Kontributor
          </h1>
          <p className="text-sm text-verity-ink-soft mt-1">
            Kelola draf tulisan, rujukan primer, dan pantau status telaah redaksi.
          </p>
        </div>

        <div>
          <Link href="/kontributor/portal/naskah/baru">
            <Button className="bg-verity-ink text-white hover:bg-verity-accent font-mono text-xs uppercase tracking-wider">
              <Plus className="w-4 h-4 mr-1.5" />
              Tulis Naskah Baru
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-verity-rule rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-verity-ink-soft mb-2">
            <span className="font-mono text-xs uppercase tracking-wider">Total Naskah</span>
            <FileText className="w-4 h-4 text-verity-ink-soft" />
          </div>
          <p className="font-serif text-3xl font-bold text-verity-ink">
            {metricsLoading ? "..." : metrics.totalArticles}
          </p>
          <p className="text-xs text-verity-ink-soft mt-1">Karya yang pernah diajukan</p>
        </div>

        <div className="bg-white border border-verity-rule rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-verity-ink-soft mb-2">
            <span className="font-mono text-xs uppercase tracking-wider">Draf & Revisi</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="font-serif text-3xl font-bold text-amber-800">
            {metricsLoading ? "..." : metrics.draftCount + metrics.revisionCount}
          </p>
          <p className="text-xs text-verity-ink-soft mt-1">Perlu penyuntingan penulis</p>
        </div>

        <div className="bg-white border border-verity-rule rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-verity-ink-soft mb-2">
            <span className="font-mono text-xs uppercase tracking-wider">Proses Telaah</span>
            <Clock className="w-4 h-4 text-sky-600" />
          </div>
          <p className="font-serif text-3xl font-bold text-sky-800">
            {metricsLoading ? "..." : metrics.inReviewCount}
          </p>
          <p className="text-xs text-verity-ink-soft mt-1">Dalam antrean meja redaksi</p>
        </div>

        <div className="bg-white border border-verity-rule rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-verity-ink-soft mb-2">
            <span className="font-mono text-xs uppercase tracking-wider">Terbit</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="font-serif text-3xl font-bold text-emerald-800">
            {metricsLoading ? "..." : metrics.publishedCount}
          </p>
          <p className="text-xs text-verity-ink-soft mt-1">Telah disetujui Pemred</p>
        </div>
      </div>

      {/* Articles Table & Filters */}
      <div className="bg-white border border-verity-rule rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-verity-rule flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-verity-ink-soft" />
            <Input
              type="text"
              placeholder="Cari judul atau rubrik..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-verity-paper/40 text-xs font-sans"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
            {[
              { id: "ALL", label: "Semua" },
              { id: "DRAFT_REVISION", label: "Draf & Revisi" },
              { id: "IN_REVIEW", label: "Sedang Ditelaah" },
              { id: "PUBLISHED", label: "Terbit" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
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

        {articlesLoading ? (
          <div className="p-12 text-center text-xs font-mono text-verity-ink-soft">
            Memuat daftar naskah...
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-verity-ink-soft mx-auto opacity-40" />
            <p className="font-serif text-base font-medium text-verity-ink">
              {search || statusFilter !== "ALL"
                ? "Tidak ada naskah yang sesuai dengan penyaringan."
                : "Belum ada naskah yang ditulis."}
            </p>
            <p className="text-xs text-verity-ink-soft max-w-sm mx-auto">
              Mulai tulis karya orisinal Anda untuk dipublikasikan di Verax Press.
            </p>
            {!search && statusFilter === "ALL" && (
              <div className="pt-2">
                <Link href="/kontributor/portal/naskah/baru">
                  <Button size="sm" className="bg-verity-ink text-white hover:bg-verity-accent text-xs font-mono">
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Buat Naskah Pertama
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-verity-rule bg-verity-paper-soft text-[11px] font-mono uppercase text-verity-ink-soft tracking-wider">
                  <th className="py-3 px-4">Judul Naskah</th>
                  <th className="py-3 px-4">Format & Rubrik</th>
                  <th className="py-3 px-4">Rujukan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Pembaruan</th>
                  <th className="py-3 px-4 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-verity-rule text-sm">
                {filteredArticles.map((article) => {
                  const statusMeta = STATUS_LABELS[article.status] ?? {
                    label: article.status,
                    color: "bg-slate-100 text-slate-800 border-slate-300",
                  };
                  return (
                    <tr
                      key={article.id}
                      className="hover:bg-verity-paper-warm/40 transition-colors group"
                    >
                      <td className="py-3 px-4 font-serif font-medium text-verity-ink max-w-md">
                        <Link
                          href={`/kontributor/portal/naskah/${article.id}`}
                          className="hover:text-verity-accent block"
                        >
                          {article.title}
                        </Link>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs text-verity-ink font-semibold">
                          {article.format}
                        </span>
                        <span className="text-verity-ink-soft text-xs block">
                          {article.desk.name}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs font-mono text-verity-ink-soft">
                        {article.sourceCount} sumber
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-mono border ${statusMeta.color}`}
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs font-mono text-verity-ink-soft">
                        {new Date(article.updatedAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <Link
                          href={`/kontributor/portal/naskah/${article.id}`}
                          className="inline-flex items-center gap-1 text-xs font-mono text-verity-ink hover:text-verity-accent px-2.5 py-1 rounded border border-verity-rule bg-white shadow-2xs group-hover:border-verity-accent/40"
                        >
                          <span>Buka</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

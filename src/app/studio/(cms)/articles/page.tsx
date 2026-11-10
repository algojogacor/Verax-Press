// Daftar artikel studio — filter status/pencarian/scope + tabel redaksi.
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { FORMAT_LABELS, ORIGIN_LABELS, STATUS_LABELS } from "@/lib/domain/constants";
import { formatDateTime, statusDotClass } from "@/lib/format";
import type { ArticleListItemDTO } from "@/types/verity";
import { cn } from "@/lib/utils";

const STATUS_FILTER_ALL = "SEMUA";

export default function StudioArticlesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isEditorPlus = role === "CHIEF_EDITOR" || role === "EDITOR";
  const canCreate = role !== "VOLUNTEER" && role != null;

  const [status, setStatus] = useState<string>(STATUS_FILTER_ALL);
  const [search, setSearch] = useState("");
  const [scopeOwn, setScopeOwn] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 400);

  const params = new URLSearchParams();
  if (status !== STATUS_FILTER_ALL) params.set("status", status);
  if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
  if (scopeOwn) params.set("scope", "own");
  const queryString = params.toString();

  const { data, isLoading, error } = useQuery({
    queryKey: ["articles", { status, q: debouncedSearch, scope: scopeOwn ? "own" : "all" }],
    queryFn: () =>
      apiFetch<{ articles: ArticleListItemDTO[] }>(
        `/api/studio/articles${queryString ? `?${queryString}` : ""}`,
      ),
  });

  const articles = data?.articles ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-verity-ink">Artikel</h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-verity-ink-faint">
            Semua naskah yang dapat Anda akses
          </p>
        </div>
        {canCreate ? (
          <Button onClick={() => router.push("/studio/articles/new")}>
            <Plus className="size-4" aria-hidden="true" />
            Artikel Baru
          </Button>
        ) : null}
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="filter-status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="filter-status" className="w-52">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={STATUS_FILTER_ALL}>Semua status</SelectItem>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-56 flex-1 space-y-1.5">
          <Label htmlFor="filter-search">Pencarian</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-verity-ink-faint"
              aria-hidden="true"
            />
            <Input
              id="filter-search"
              placeholder="Cari judul naskah…"
              className="pl-8"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {isEditorPlus ? (
          <div className="flex items-center gap-2 pb-1">
            <Switch
              id="filter-scope"
              checked={scopeOwn}
              onCheckedChange={setScopeOwn}
              aria-label="Hanya naskah milik saya"
            />
            <Label htmlFor="filter-scope" className="cursor-pointer text-sm font-normal">
              Milik saya
            </Label>
          </div>
        ) : null}
      </div>

      {/* Tabel */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-14" />
          ))}
        </div>
      ) : error ? (
        <div className="border border-verity-rule bg-card p-6">
          <p className="text-sm text-verity-disputed">{apiErrorMessage(error)}</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="border border-verity-rule bg-card p-6">
          <p className="text-sm text-verity-ink-soft">
            Tidak ada naskah yang cocok dengan filter ini.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-verity-rule bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-64">Judul</TableHead>
                <TableHead>Desk</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Asal</TableHead>
                <TableHead className="whitespace-nowrap">Sumber kunci</TableHead>
                <TableHead className="whitespace-nowrap">Diperbarui</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articles.map((article) => (
                <TableRow
                  key={article.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/studio/articles/${article.id}`)}
                >
                  <TableCell>
                    <Link
                      href={`/studio/articles/${article.id}`}
                      className="font-serif text-[0.95rem] font-medium text-verity-ink hover:text-verity-accent"
                    >
                      {article.title}
                    </Link>
                    {article.deck ? (
                      <p className="mt-0.5 line-clamp-1 font-mono text-[11px] text-verity-ink-faint">
                        {article.deck}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm text-verity-ink-soft">{article.desk.name}</TableCell>
                  <TableCell className="text-sm text-verity-ink-soft">
                    {FORMAT_LABELS[article.format]}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2 text-sm text-verity-ink-soft">
                      <span
                        className={cn(
                          "inline-block size-2 shrink-0 rounded-full",
                          statusDotClass(article.status),
                        )}
                        aria-hidden="true"
                      />
                      {STATUS_LABELS[article.status]}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-verity-ink-soft">
                    {ORIGIN_LABELS[article.origin] ?? article.origin}
                  </TableCell>
                  <TableCell
                    className="font-mono text-xs"
                    title={`${article.keySourceCount} sumber kunci, ${article.unverifiedKeySourceCount} belum diverifikasi`}
                  >
                    <span
                      className={
                        article.unverifiedKeySourceCount > 0
                          ? "text-verity-disputed"
                          : "text-verity-ink-soft"
                      }
                    >
                      {article.keySourceCount}/{article.unverifiedKeySourceCount}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-[11px] whitespace-nowrap text-verity-ink-faint">
                    {formatDateTime(article.updatedAt)}
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

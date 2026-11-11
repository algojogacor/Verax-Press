// Permission matrix server-side. UI hiding TIDAK menggantikan layer ini.
// Semua route API memanggil helper di file ini. Least privilege.
import type { Article } from "@prisma/client";
import type { Role } from "@/types/verity";

export type Permission =
  | "article:create"
  | "article:read_internal" // melihat artikel non-publik (scope: all | own)
  | "article:edit_internal" // mengubah konten (scope + status dicek terpisah)
  | "article:review"
  | "source:verify"
  | "source:manage"
  | "article:publish" // Chief Editor only
  | "article:risk_edit"
  | "complaint:manage"
  | "correction:create"
  | "audit:read"
  | "audit:read_article"
  | "apiclient:manage"
  | "staff:list"
  | "staff:manage";

/** Permission berbasis role murni (Chief Editor vs Writer). */
export function roleHasPermission(role: Role, permission: Permission): boolean {
  switch (permission) {
    case "article:create":
      return role === "CHIEF_EDITOR" || role === "WRITER";
    case "article:read_internal":
    case "article:edit_internal":
      return role === "CHIEF_EDITOR" || role === "WRITER"; // scope own/all dicek via canReadArticle / canEditArticleContent
    case "source:manage":
      return role === "CHIEF_EDITOR" || role === "WRITER"; // penulis boleh menambah sumber di naskahnya; verifikasi tetap chief editor
    case "audit:read_article":
      return role === "CHIEF_EDITOR" || role === "WRITER"; // penulis hanya membaca jejak naskahnya
    case "article:review":
    case "source:verify":
    case "article:publish":
    case "article:risk_edit":
    case "complaint:manage":
    case "correction:create":
    case "audit:read":
    case "apiclient:manage":
    case "staff:list":
    case "staff:manage":
      return role === "CHIEF_EDITOR";
    default:
      return false;
  }
}

/** Helper kompatibilitas userHasPermission. */
export function userHasPermission(
  user: { role: string },
  permission: Permission,
): boolean {
  return roleHasPermission(user.role as Role, permission);
}

/** Kepemilikan: pembuat naskah atau tercatat sebagai kontributor AUTHOR. */
export function isArticleOwner(
  article: { createdById?: string | null; contributorId?: string | null },
  userId: string,
  authorStaffIds: string[] = [],
): boolean {
  if (article.createdById && article.createdById === userId) return true;
  if (article.contributorId && article.contributorId === userId) return true;
  return authorStaffIds.includes(userId);
}

/**
 * Visibilitas artikel internal:
 * Chief Editor melihat semua; Writer hanya miliknya sendiri.
 */
export function canReadArticle(
  user: { id: string; role?: string; accountType?: "STAFF" | "CONTRIBUTOR" },
  article: { createdById?: string | null; contributorId?: string | null },
  authorStaffIds: string[] = [],
): boolean {
  if (user.role === "CHIEF_EDITOR") return true;
  if (user.accountType === "CONTRIBUTOR" || user.role === "WRITER") {
    return isArticleOwner(article, user.id, authorStaffIds);
  }
  return false;
}

/**
 * Boleh mengubah konten artikel pada status tertentu:
 * - Writer: hanya naskah sendiri pada status DRAFT atau REVISION_NEEDED.
 * - Chief Editor: semua status non-terminal.
 */
export function canEditArticleContent(
  user: { id: string; role?: string; accountType?: "STAFF" | "CONTRIBUTOR" },
  article: { createdById?: string | null; contributorId?: string | null; status: string },
  authorStaffIds: string[] = [],
): boolean {
  const terminal = ["PUBLISHED", "REJECTED", "WITHDRAWN", "CORRECTED", "RETRACTED", "ARCHIVED"];
  if (terminal.includes(article.status)) return false;
  if (user.role === "CHIEF_EDITOR") return true;
  if (user.accountType === "CONTRIBUTOR" || user.role === "WRITER") {
    const own = isArticleOwner(article, user.id, authorStaffIds);
    return own && (article.status === "DRAFT" || article.status === "REVISION_NEEDED");
  }
  return false;
}

// Permission matrix server-side (TA §5.1). UI hiding TIDAK menggantikan layer ini —
// semua route API memanggil helper di file ini. Least privilege.
import type { Article } from "@prisma/client";
import type { Role } from "@/types/verity";

export type Permission =
  | "article:create"
  | "article:read_internal" // melihat artikel non-publik (scope: all | own)
  | "article:edit_internal" // mengubah konten (scope + status dicek terpisah)
  | "article:review"
  | "source:verify"
  | "source:manage"
  | "article:publish" // Chief Editor only (Tahap A)
  | "article:risk_edit"
  | "complaint:manage"
  | "correction:create"
  | "audit:read"
  | "audit:read_article"
  | "apiclient:manage"
  | "staff:list";

const EDITOR_PLUS: Role[] = ["CHIEF_EDITOR", "EDITOR"];
const ALL_AUTHORS: Role[] = ["CHIEF_EDITOR", "EDITOR", "INTERNAL_AUTHOR"];

/** Permission berbasis role murni (tanpa grant eksplisit). */
export function roleHasPermission(role: Role, permission: Permission): boolean {
  switch (permission) {
    case "article:create":
      return ALL_AUTHORS.includes(role);
    case "article:read_internal":
    case "article:edit_internal":
      return ALL_AUTHORS.includes(role); // scope own/all dicek via helper lain
    case "article:review":
    case "source:verify":
    case "audit:read_article":
      return EDITOR_PLUS.includes(role);
    case "source:manage":
      return ALL_AUTHORS.includes(role); // penulis boleh menambah sumber di naskahnya; verifikasi tetap editor
    case "article:publish":
    case "audit:read":
    case "apiclient:manage":
    case "staff:list":
      return role === "CHIEF_EDITOR";
    case "article:risk_edit":
    case "complaint:manage":
    case "correction:create":
      // "By explicit grant" untuk Editor; Chief Editor selalu boleh (TA §5.1).
      return role === "CHIEF_EDITOR";
    default:
      return false;
  }
}

/** Grant eksplisit per user (mewujudkan kolom "By explicit grant" di matrix). Role disimpan sebagai String di Prisma. */
export function userHasPermission(
  user: { role: string; canRiskEdit: boolean; canManageComplaints: boolean },
  permission: Permission,
): boolean {
  if (permission === "article:risk_edit") {
    return user.role === "CHIEF_EDITOR" || (user.role === "EDITOR" && user.canRiskEdit);
  }
  if (permission === "complaint:manage" || permission === "correction:create") {
    return user.role === "CHIEF_EDITOR" || (user.role === "EDITOR" && user.canManageComplaints);
  }
  return roleHasPermission(user.role as Role, permission);
}

/** Kepemilikan: pembuat naskah atau tercatat sebagai kontributor AUTHOR. */
export function isArticleOwner(
  article: Pick<Article, "createdById">,
  userId: string,
  authorStaffIds: string[] = [],
): boolean {
  if (article.createdById === userId) return true;
  return authorStaffIds.includes(userId);
}

/**
 * Visibilitas artikel internal: Editor/Chief melihat semua; Internal Author hanya miliknya;
 * Volunteer tidak melihat apa pun secara default.
 */
export function canReadArticle(
  user: { id: string; role: string },
  article: Pick<Article, "createdById">,
  authorStaffIds: string[] = [],
): boolean {
  if (user.role === "CHIEF_EDITOR" || user.role === "EDITOR") return true;
  if (user.role === "INTERNAL_AUTHOR") {
    return isArticleOwner(article, user.id, authorStaffIds);
  }
  return false; // VOLUNTEER: no default access
}

/**
 * Boleh mengubah konten artikel pada status tertentu:
 * - Author: hanya naskah sendiri di DRAFT / REVISION_NEEDED.
 * - Editor/Chief: semua status non-terminal (termasuk perbaikan editorial saat review/fact-check).
 */
export function canEditArticleContent(
  user: { id: string; role: string },
  article: Pick<Article, "createdById" | "status">,
  authorStaffIds: string[] = [],
): boolean {
  const terminal = ["PUBLISHED", "REJECTED", "WITHDRAWN", "CORRECTED", "RETRACTED", "ARCHIVED"];
  if (terminal.includes(article.status)) return false; // perubahan pasca-terbit lewat jalur koreksi
  if (user.role === "CHIEF_EDITOR" || user.role === "EDITOR") return true;
  if (user.role === "INTERNAL_AUTHOR") {
    const own = isArticleOwner(article, user.id, authorStaffIds);
    return own && (article.status === "DRAFT" || article.status === "REVISION_NEEDED");
  }
  return false;
}

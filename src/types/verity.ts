// Tipe bersama (kontrak API ↔ UI). Aman untuk client & server.
// Literal union yang sebenarnya divalidasi di src/lib/domain/* (Zod).

export type Role = "CHIEF_EDITOR" | "EDITOR" | "INTERNAL_AUTHOR" | "VOLUNTEER";

export type ArticleStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "FACT_CHECK"
  | "REVISION_NEEDED"
  | "PENDING_APPROVAL"
  | "PUBLISHED"
  | "REJECTED"
  | "WITHDRAWN"
  | "CORRECTED"
  | "RETRACTED"
  | "ARCHIVED";

export type ArticleFormat = "NEWS" | "OPINION" | "ANALYSIS" | "EXPLAINER" | "FEATURE" | "INTERVIEW";

export type AiInvolvement = "none" | "assistive" | "substantive";

export type SourceType = "PRIMARY" | "SECONDARY" | "DOCUMENT" | "INTERVIEW" | "DATA" | "OFFICIAL";

export type VerificationStatus = "UNVERIFIED" | "VERIFIED" | "DISPUTED";

export type VersionType = "author" | "editorial_copyedit" | "risk_edit" | "ingestion";

export type ComplaintType = "HAK_JAWAB" | "HAK_KOREKSI" | "KELUHAN" | "PERMINTAAN_PENGHAPUSAN";

export type ComplaintStatus = "RECEIVED" | "IN_REVIEW" | "RESOLVED" | "REJECTED";

export type ContributionRole = "AUTHOR" | "EDITOR" | "REPORTER" | "REVIEWER" | "VISUAL";

export type ArticleOrigin = "NEWSROOM" | "INGESTION_API" | "CONTRIBUTOR";

export type TransitionAction =
  | "SUBMIT_REVIEW" // DRAFT -> PENDING_REVIEW
  | "WITHDRAW" // DRAFT -> WITHDRAWN
  | "START_FACT_CHECK" // PENDING_REVIEW -> FACT_CHECK
  | "REQUEST_REVISION" // PENDING_REVIEW/FACT_CHECK -> REVISION_NEEDED
  | "REJECT" // PENDING_REVIEW/FACT_CHECK/PENDING_APPROVAL -> REJECTED
  | "SUBMIT_FOR_APPROVAL" // FACT_CHECK -> PENDING_APPROVAL
  | "RESUBMIT_REVIEW" // REVISION_NEEDED -> PENDING_REVIEW
  | "PUBLISH" // PENDING_APPROVAL -> PUBLISHED (Chief Editor only + gates)
  | "RETRACT" // PUBLISHED/CORRECTED -> RETRACTED
  | "ARCHIVE"; // PUBLISHED/CORRECTED -> ARCHIVED

// ============ DTO ============

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface DeskDTO {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export interface SourceDTO {
  id: string;
  title: string;
  publisher: string | null;
  url: string | null;
  sourceType: SourceType;
  publishedAt: string | null;
  accessedAt: string | null;
  supports: string | null;
  isKeySource: boolean;
  verificationStatus: VerificationStatus;
  verifiedAt: string | null;
  verificationNote: string | null;
  canVerify: boolean; // dihitung server: role editor/chief
}

export interface VersionDTO {
  id: string;
  versionNo: number;
  versionType: VersionType;
  title: string;
  changeReason: string | null;
  createdByLabel: string;
  notifiedAuthorAt: string | null;
  authorResponse: string | null;
  createdAt: string;
}

export interface CommentDTO {
  id: string;
  authorName: string;
  authorVisible: boolean;
  body: string;
  createdAt: string;
}

export interface ReviewDTO {
  id: string;
  reviewerName: string;
  fromStatus: ArticleStatus;
  toStatus: ArticleStatus;
  decision: string;
  notes: string | null;
  createdAt: string;
}

export interface ArticleListItemDTO {
  id: string;
  slug: string;
  title: string;
  deck: string | null;
  desk: { slug: string; name: string };
  format: ArticleFormat;
  status: ArticleStatus;
  origin: ArticleOrigin;
  byline: string;
  aiInvolvement: AiInvolvement;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  isOwn: boolean;
  keySourceCount: number;
  unverifiedKeySourceCount: number;
}

export interface ArticleDetailDTO extends ArticleListItemDTO {
  content: unknown; // ContentBlock[] (divalidasi saat render)
  aiDisclosurePublic: boolean;
  aiDisclosureNote: string | null;
  contributions: { id: string; personName: string; role: ContributionRole; publicCredit: boolean }[];
  sources: SourceDTO[];
  versions: VersionDTO[];
  comments: CommentDTO[];
  reviews: ReviewDTO[];
  availableTransitions: { action: TransitionAction; to: ArticleStatus; label: string; requiresReason: boolean }[];
}

export interface ComplaintDTO {
  id: string;
  refCode: string;
  type: ComplaintType;
  articleId: string | null;
  articleTitle: string | null;
  articleSlug: string | null;
  senderName: string;
  senderEmail: string;
  message: string;
  status: ComplaintStatus;
  deadline: string | null;
  decision: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface CorrectionDTO {
  id: string;
  articleId: string;
  articleTitle: string;
  articleSlug: string;
  summary: string;
  publicNote: string;
  correctedAt: string;
}

export interface AuditEventDTO {
  id: string;
  actorType: string;
  actorLabel: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  reason: string | null;
  metadataJson: string | null;
  createdAt: string;
}

export interface ApiClientDTO {
  id: string;
  clientId: string;
  name: string;
  scopes: string;
  status: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface IngestionReceiptDTO {
  submissionId: string;
  articleId: string;
  status: string;
  receivedAt: string;
  idempotentReplay: boolean;
}

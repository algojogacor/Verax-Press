// Tipe bersama (kontrak API ↔ UI). Aman untuk client & server.
// Literal union yang sebenarnya divalidasi di src/lib/domain/* (Zod).

export type Role = "CHIEF_EDITOR" | "WRITER";

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
  username: string;
  email: string | null;
  role: Role;
  accountType?: "STAFF" | "CONTRIBUTOR";
}

export interface StaffUserDTO {
  id: string;
  username: string;
  email: string | null;
  name: string;
  role: Role;
  status: "ACTIVE" | "SUSPENDED";
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  bio?: string | null;
}

export interface StaffInvitationDTO {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  invitedByName: string;
  createdAt: string;
}

export interface StaffOverviewDTO {
  total: number;
  active: number;
  suspended: number;
  pendingInvitations: number;
}

export interface ContributorApplicationDTO {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  interests: string | null;
  portfolioUrl: string | null;
  sampleArticle: string | null;
  adultConfirmedAt: string;
  guidelinesAccepted: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  decidedAt: string | null;
  decisionNote: string | null;
  decidedByName: string | null;
  contributorId: string | null;
  createdAt: string;
}

export interface ContributorApplicationOverviewDTO {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface ContributorInvitationDTO {
  id: string;
  email: string;
  name: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  applicationId: string;
  invitedByName: string;
  createdAt: string;
}

export interface ContributorUserDTO {
  id: string;
  username: string;
  email: string;
  name: string;
  status: "ACTIVE" | "SUSPENDED";
  adultConfirmedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  bio: string | null;
  articleCount?: number;
}

export interface ContributorOverviewDTO {
  total: number;
  active: number;
  suspended: number;
  pendingApplications: number;
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
  canVerify: boolean; // dihitung server: role chief
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

export interface ApiClientCredentialDTO {
  id: string;
  apiClientId: string;
  name: string | null;
  keyPrefix: string;
  status: "ACTIVE" | "GRACE_PERIOD" | "REVOKED" | "EXPIRED";
  expiresAt: string | null;
  gracePeriodEndsAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface ApiClientDTO {
  id: string;
  clientId: string;
  name: string;
  description: string | null;
  ownerName: string | null;
  environment: "DEVELOPMENT" | "PREVIEW" | "PRODUCTION";
  scopes: string;
  status: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  credentials?: ApiClientCredentialDTO[];
  totalRequests?: number;
  activeCredentialsCount?: number;
}

export interface ApiRequestLogDTO {
  id: string;
  apiClientId: string | null;
  clientName: string | null;
  requestId: string;
  method: string;
  endpoint: string;
  statusCode: number;
  durationMs: number;
  ipAddress: string | null;
  userAgent: string | null;
  submissionId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface ApiOverviewMetricsDTO {
  totalClients: number;
  activeClients: number;
  revokedClients: number;
  requestsToday: number;
  successfulSubmissionsToday: number;
  failedSubmissionsToday: number;
  lastRequestAt: string | null;
  averageDurationMs: number;
  environment: string;
  baseUrl: string;
}

export interface SubmissionStatusDTO {
  submissionId: string;
  articleId: string;
  submissionStatus: string;
  editorialStatus: string;
  format: string;
  title: string;
  receivedAt: string;
  lastUpdatedAt: string;
  idempotencyKey: string | null;
  editorialDecision: {
    status: string;
    isPublished: boolean;
  };
}

export interface CapabilitiesDTO {
  apiVersion: string;
  environment: string;
  capabilities: {
    submission: boolean;
    validation: boolean;
    submissionStatus: boolean;
    publication: boolean;
    editorialApproval: boolean;
  };
  allowedFormats: string[];
  desks: { slug: string; name: string }[];
  documentation: {
    developers: string;
    openapi: string;
    llms: string;
    llmsFull: string;
    discovery: string;
  };
  limits: {
    rateLimitPerMinute: number;
    maxTitleLength: number;
    maxSourcesCount: number;
    maxImagesCount: number;
  };
}

export interface IngestionReceiptDTO {
  submissionId: string;
  articleId: string;
  status: string;
  receivedAt: string;
  idempotentReplay: boolean;
  requestId?: string;
}

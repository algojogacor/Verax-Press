// Serializer Prisma → DTO (kontrak API). Dipakai semua route studio agar konsisten.

import type { ApiClient, ApiClientCredential, ApiRequestLog, AuditEvent, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { allowedTransitionsFrom, TRANSITION_LABELS, canExecuteRule } from "@/lib/domain/workflow";
import { canVerifySources } from "@/lib/domain/access-helpers";
import type {
  ArticleDetailDTO,
  ArticleListItemDTO,
  ArticleStatus,
  AuditEventDTO,
  ComplaintDTO,
  ComplaintStatus,
  ComplaintType,
  CorrectionDTO,
  ApiClientDTO,
  ApiClientCredentialDTO,
  ApiRequestLogDTO,
  CommentDTO,
  ReviewDTO,
  SessionUser,
  SourceDTO,
  TransitionAction,
  VersionDTO,
  ArticleFormat,
  AiInvolvement,
  ArticleOrigin,
  ContributionRole,
  SourceType,
  VerificationStatus,
  VersionType,
  Role,
  ContributorApplicationDTO,
  ContributorInvitationDTO,
  ContributorUserDTO,
} from "@/types/verity";

export const articleListInclude = {
  desk: true,
  sources: { select: { isKeySource: true, verificationStatus: true } },
  contributions: { include: { person: { select: { staffUserId: true, contributorId: true } } } },
} satisfies Prisma.ArticleInclude;

export type ArticleWithList = Prisma.ArticleGetPayload<{ include: typeof articleListInclude }>;

export const articleDetailInclude = {
  ...articleListInclude,
  sources: true,
  versions: { orderBy: { versionNo: "desc" as const } },
  comments: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" as const } },
  reviews: { include: { reviewer: { select: { name: true } } }, orderBy: { createdAt: "desc" as const } },
  contributions: { include: { person: true }, orderBy: { displayOrder: "asc" as const } },
} satisfies Prisma.ArticleInclude;

export type ArticleWithDetail = Prisma.ArticleGetPayload<{ include: typeof articleDetailInclude }>;

export function isOwnerOf(article: ArticleWithList | ArticleWithDetail, userId: string): boolean {
  if (article.createdById === userId) return true;
  if ("contributorId" in article && (article as any).contributorId === userId) return true;
  return article.contributions.some(
    (c) => c.person.staffUserId === userId || (c.person as any).contributorId === userId
  );
}

export function toArticleListItem(article: ArticleWithList, user: SessionUser): ArticleListItemDTO {
  const keySources = article.sources.filter((s) => s.isKeySource);
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    deck: article.deck,
    desk: { slug: article.desk.slug, name: article.desk.name },
    format: article.format as ArticleFormat,
    status: article.status as ArticleStatus,
    origin: article.origin as ArticleOrigin,
    byline: article.byline,
    aiInvolvement: article.aiInvolvement as AiInvolvement,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
    publishedAt: article.publishedAt?.toISOString() ?? null,
    isOwn: isOwnerOf(article, user.id),
    keySourceCount: keySources.length,
    unverifiedKeySourceCount: keySources.filter(
      (s) => s.verificationStatus === "UNVERIFIED" || s.verificationStatus === "DISPUTED",
    ).length,
  };
}

export function toArticleDetail(article: ArticleWithDetail, user: SessionUser): ArticleDetailDTO {
  const own = isOwnerOf(article, user.id);
  const canVerify = canVerifySources(user);
  const transitions = allowedTransitionsFrom(article.status as ArticleStatus)
    .filter((rule) => canExecuteRule(rule, user.role, own))
    .map((rule) => ({
      action: rule.action as TransitionAction,
      to: rule.to as ArticleStatus,
      label: TRANSITION_LABELS[rule.action],
      requiresReason: rule.requiresReason,
    }));

  const canSeeInternalNotes = user.role === "CHIEF_EDITOR";
  const visibleComments = article.comments.filter((c) => canSeeInternalNotes || c.authorVisible);

  return {
    ...toArticleListItem(article, user),
    content: JSON.parse(article.contentJson || "[]"),
    aiDisclosurePublic: article.aiDisclosurePublic,
    aiDisclosureNote: article.aiDisclosureNote,
    contributions: article.contributions.map((c) => ({
      id: c.id,
      personName: c.person.publicName,
      role: c.role as ContributionRole,
      publicCredit: c.publicCredit,
    })),
    sources: article.sources.map((s) => ({
      id: s.id,
      title: s.title,
      publisher: s.publisher,
      url: s.url,
      sourceType: s.sourceType as SourceType,
      publishedAt: s.publishedAt?.toISOString() ?? null,
      accessedAt: s.accessedAt?.toISOString() ?? null,
      supports: s.supports,
      isKeySource: s.isKeySource,
      verificationStatus: s.verificationStatus as VerificationStatus,
      verifiedAt: s.verifiedAt?.toISOString() ?? null,
      verificationNote: s.verificationNote,
      canVerify,
    })),
    versions: article.versions.map(
      (v): VersionDTO => ({
        id: v.id,
        versionNo: v.versionNo,
        versionType: v.versionType as VersionType,
        title: v.title,
        changeReason: v.changeReason,
        createdByLabel: v.createdByLabel ?? "Redaksi",
        notifiedAuthorAt: v.notifiedAuthorAt?.toISOString() ?? null,
        authorResponse: v.authorResponse,
        createdAt: v.createdAt.toISOString(),
      })),
    comments: visibleComments.map(
      (c): CommentDTO => ({
        id: c.id,
        authorName: c.author.name,
        authorVisible: c.authorVisible,
        body: c.body,
        createdAt: c.createdAt.toISOString(),
      }),
    ),
    reviews: article.reviews.map(
      (r): ReviewDTO => ({
        id: r.id,
        reviewerName: r.reviewer?.name ?? "Penulis / Kontributor",
        fromStatus: r.fromStatus as ArticleStatus,
        toStatus: r.toStatus as ArticleStatus,
        decision: r.decision,
        notes: r.notes,
        createdAt: r.createdAt.toISOString(),
      }),
    ),
    availableTransitions: transitions,
  };
}

export function toComplaintDTO(
  complaint: Prisma.ComplaintGetPayload<{ include: { article: { select: { title: true; slug: true } } } }>,
): ComplaintDTO {
  return {
    id: complaint.id,
    refCode: complaint.refCode,
    type: complaint.type as ComplaintType,
    articleId: complaint.articleId,
    articleTitle: complaint.article?.title ?? null,
    articleSlug: complaint.article?.slug ?? null,
    senderName: complaint.senderName,
    senderEmail: complaint.senderEmail,
    message: complaint.message,
    status: complaint.status as ComplaintStatus,
    deadline: complaint.deadline?.toISOString() ?? null,
    decision: complaint.decision,
    decidedAt: complaint.decidedAt?.toISOString() ?? null,
    createdAt: complaint.createdAt.toISOString(),
  };
}

export function toCorrectionDTO(
  correction: Prisma.CorrectionRecordGetPayload<{ include: { article: { select: { title: true; slug: true } } } }>,
): CorrectionDTO {
  return {
    id: correction.id,
    articleId: correction.articleId,
    articleTitle: correction.article.title,
    articleSlug: correction.article.slug,
    summary: correction.summary,
    publicNote: correction.publicNote,
    correctedAt: correction.correctedAt.toISOString(),
  };
}

export function toAuditDTO(event: AuditEvent): AuditEventDTO {
  return {
    id: event.id,
    actorType: event.actorType,
    actorLabel: event.actorLabel,
    action: event.action,
    targetType: event.targetType,
    targetId: event.targetId,
    reason: event.reason,
    metadataJson: event.metadataJson,
    createdAt: event.createdAt.toISOString(),
  };
}

export function toApiClientCredentialDTO(cred: ApiClientCredential): ApiClientCredentialDTO {
  return {
    id: cred.id,
    apiClientId: cred.apiClientId,
    name: cred.name,
    keyPrefix: cred.keyPrefix,
    status: cred.status as "ACTIVE" | "GRACE_PERIOD" | "REVOKED" | "EXPIRED",
    expiresAt: cred.expiresAt?.toISOString() ?? null,
    gracePeriodEndsAt: cred.gracePeriodEndsAt?.toISOString() ?? null,
    lastUsedAt: cred.lastUsedAt?.toISOString() ?? null,
    revokedAt: cred.revokedAt?.toISOString() ?? null,
    createdAt: cred.createdAt.toISOString(),
  };
}

export function toApiRequestLogDTO(
  log: ApiRequestLog & { apiClient?: { name: string } | null }
): ApiRequestLogDTO {
  return {
    id: log.id,
    apiClientId: log.apiClientId,
    clientName: log.apiClient?.name ?? null,
    requestId: log.requestId,
    method: log.method,
    endpoint: log.endpoint,
    statusCode: log.statusCode,
    durationMs: log.durationMs,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    submissionId: log.submissionId,
    errorCode: log.errorCode,
    errorMessage: log.errorMessage,
    createdAt: log.createdAt.toISOString(),
  };
}

export function toApiClientDTO(
  client: ApiClient & {
    credentials?: ApiClientCredential[];
    _count?: { requestLogs?: number; credentials?: number };
  }
): ApiClientDTO {
  return {
    id: client.id,
    clientId: client.clientId,
    name: client.name,
    description: client.description ?? null,
    ownerName: client.ownerName ?? null,
    environment: (client.environment as "DEVELOPMENT" | "PREVIEW" | "PRODUCTION") ?? "DEVELOPMENT",
    scopes: client.scopes,
    status: client.status,
    expiresAt: client.expiresAt?.toISOString() ?? null,
    lastUsedAt: client.lastUsedAt?.toISOString() ?? null,
    createdAt: client.createdAt.toISOString(),
    credentials: client.credentials?.map(toApiClientCredentialDTO),
    totalRequests: client._count?.requestLogs,
    activeCredentialsCount: client.credentials?.filter((c) => c.status === "ACTIVE").length,
  };
}

/** Buat versi baru artikel (dipanggil saat konten berubah atau aksi editorial). */
export async function createArticleVersion(
  input: {
    articleId: string;
    title: string;
    deck: string | null;
    contentJson: string;
    versionType: VersionType;
    changeReason?: string | null;
    createdById?: string | null;
    createdByLabel?: string | null;
  },
  client?: Prisma.TransactionClient | typeof db,
): Promise<void> {
  const prisma = client ?? db;
  const last = await prisma.articleVersion.findFirst({
    where: { articleId: input.articleId },
    orderBy: { versionNo: "desc" },
    select: { versionNo: true },
  });
  await prisma.articleVersion.create({
    data: {
      articleId: input.articleId,
      versionNo: (last?.versionNo ?? 0) + 1,
      title: input.title,
      deck: input.deck,
      contentJson: input.contentJson,
      versionType: input.versionType,
      changeReason: input.changeReason ?? null,
      createdById: input.createdById ?? null,
      createdByLabel: input.createdByLabel ?? null,
    },
  });
}


export function toStaffUserDTO(user: {
  id: string;
  username: string;
  email: string | null;
  name: string;
  role: string;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  person?: { bio: string | null } | null;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    status: user.status as "ACTIVE" | "SUSPENDED",
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    bio: user.person?.bio ?? null,
  };
}

export function toStaffInvitationDTO(invitation: {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  invitedBy?: { name: string } | null;
  createdAt: Date;
}) {
  return {
    id: invitation.id,
    username: invitation.username,
    name: invitation.name,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt.toISOString(),
    acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
    revokedAt: invitation.revokedAt?.toISOString() ?? null,
    invitedByName: invitation.invitedBy?.name ?? "Pemimpin Redaksi",
    createdAt: invitation.createdAt.toISOString(),
  };
}

export function toContributorApplicationDTO(app: {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  interests: string | null;
  portfolioUrl: string | null;
  sampleArticle: string | null;
  adultConfirmedAt: Date;
  guidelinesAccepted: boolean;
  status: string;
  decidedAt: Date | null;
  decisionNote: string | null;
  decidedBy?: { name: string } | null;
  contributorId: string | null;
  createdAt: Date;
}): ContributorApplicationDTO {
  return {
    id: app.id,
    name: app.name,
    email: app.email,
    bio: app.bio,
    interests: app.interests,
    portfolioUrl: app.portfolioUrl,
    sampleArticle: app.sampleArticle,
    adultConfirmedAt: app.adultConfirmedAt.toISOString(),
    guidelinesAccepted: app.guidelinesAccepted,
    status: app.status as "PENDING" | "APPROVED" | "REJECTED",
    decidedAt: app.decidedAt?.toISOString() ?? null,
    decisionNote: app.decisionNote,
    decidedByName: app.decidedBy?.name ?? null,
    contributorId: app.contributorId,
    createdAt: app.createdAt.toISOString(),
  };
}

export function toContributorInvitationDTO(inv: {
  id: string;
  email: string;
  name: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  applicationId: string;
  invitedBy?: { name: string } | null;
  createdAt: Date;
}): ContributorInvitationDTO {
  return {
    id: inv.id,
    email: inv.email,
    name: inv.name,
    expiresAt: inv.expiresAt.toISOString(),
    acceptedAt: inv.acceptedAt?.toISOString() ?? null,
    revokedAt: inv.revokedAt?.toISOString() ?? null,
    applicationId: inv.applicationId,
    invitedByName: inv.invitedBy?.name ?? "Redaksi",
    createdAt: inv.createdAt.toISOString(),
  };
}

export function toContributorUserDTO(contributor: {
  id: string;
  username: string | null;
  email: string;
  status: string;
  adultConfirmedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  person?: { publicName: string; bio: string | null } | null;
  _count?: { articles: number };
}): ContributorUserDTO {
  return {
    id: contributor.id,
    username: contributor.username || "",
    email: contributor.email,
    name: contributor.person?.publicName || contributor.username || contributor.email,
    status: contributor.status as "ACTIVE" | "SUSPENDED",
    adultConfirmedAt: contributor.adultConfirmedAt?.toISOString() ?? null,
    lastLoginAt: contributor.lastLoginAt?.toISOString() ?? null,
    createdAt: contributor.createdAt.toISOString(),
    bio: contributor.person?.bio ?? null,
    articleCount: contributor._count?.articles ?? 0,
  };
}

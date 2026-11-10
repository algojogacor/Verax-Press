// Serializer Prisma → DTO (kontrak API). Dipakai semua route studio agar konsisten.

import type { ApiClient, AuditEvent, Prisma } from "@prisma/client";
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
} from "@/types/verity";

export const articleListInclude = {
  desk: true,
  sources: { select: { isKeySource: true, verificationStatus: true } },
  contributions: { include: { person: { select: { staffUserId: true } } } },
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
  return article.contributions.some((c) => c.person.staffUserId === userId);
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

  const canSeeInternalNotes = user.role === "CHIEF_EDITOR" || user.role === "EDITOR";
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
        reviewerName: r.reviewer.name,
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

export function toApiClientDTO(client: ApiClient): ApiClientDTO {
  return {
    id: client.id,
    clientId: client.clientId,
    name: client.name,
    scopes: client.scopes,
    status: client.status,
    expiresAt: client.expiresAt?.toISOString() ?? null,
    lastUsedAt: client.lastUsedAt?.toISOString() ?? null,
    createdAt: client.createdAt.toISOString(),
  };
}

/** Buat versi baru artikel (dipanggil saat konten berubah atau aksi editorial). */
export async function createArticleVersion(input: {
  articleId: string;
  title: string;
  deck: string | null;
  contentJson: string;
  versionType: VersionType;
  changeReason?: string | null;
  createdById?: string | null;
  createdByLabel?: string | null;
}): Promise<void> {
  const last = await db.articleVersion.findFirst({
    where: { articleId: input.articleId },
    orderBy: { versionNo: "desc" },
    select: { versionNo: true },
  });
  await db.articleVersion.create({
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

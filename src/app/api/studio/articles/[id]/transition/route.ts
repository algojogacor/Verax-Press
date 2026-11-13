// POST /api/studio/articles/[id]/transition — satu-satunya jalur perubahan status artikel.
// State machine TA §7.1 + gerbang publish (source verification gate, disclosure AI, konten).
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, jsonError, ok, parseJsonBody, requireSession } from "@/lib/api";
import { articleDetailInclude, isOwnerOf, toArticleDetail } from "@/lib/domain/serializers";
import { canExecuteRule, getRule } from "@/lib/domain/workflow";
import { parseContentSafe } from "@/lib/domain/content";
import { AI_PLACEHOLDER_BYLINE, AI_SUBSTANTIVE_NOTE_DEFAULT, COLLECTIVE_NEWSROOM_BYLINE } from "@/lib/domain/constants";
import { writeAudit } from "@/lib/domain/audit";
import type { TransitionAction } from "@/types/verity";

type Params = { params: Promise<{ id: string }> };

const transitionSchema = z.object({
  action: z.string().min(1).optional(),
  to: z.string().min(1).optional(),
  reason: z.string().max(2_000).optional(),
  byline: z.string().max(200).optional(),
  aiDisclosurePublic: z.boolean().optional(),
  aiDisclosureNote: z.string().max(2_000).optional(),
  autoConfirm: z.boolean().optional(),
}).refine((d) => d.action || d.to, { message: "Aksi atau target status transisi wajib diisi." });

function mapTargetToTransitionAction(target?: string): TransitionAction | undefined {
  if (!target) return undefined;
  const normalized = target.toLowerCase();
  switch (normalized) {
    case "pending_review": return "SUBMIT_REVIEW";
    case "fact_check": return "START_FACT_CHECK";
    case "pending_approval": return "SUBMIT_FOR_APPROVAL";
    case "published": return "PUBLISH";
    case "revision_needed": return "REQUEST_REVISION";
    case "rejected": return "REJECT";
    case "retracted": return "RETRACT";
    case "archived": return "ARCHIVE";
    case "withdrawn": return "WITHDRAW";
    default: return target.toUpperCase() as TransitionAction;
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const body = await parseJsonBody(request, transitionSchema);
    const action = (body.action ?? mapTargetToTransitionAction(body.to)) as TransitionAction;

    const article = await db.article.findUnique({ where: { id }, include: articleDetailInclude });
    if (!article) throw new ApiError(404, "NOT_FOUND", "Artikel tidak ditemukan.");

    // Ownership/visibility: penulis internal hanya boleh mengubah naskahnya.
    const authorStaffIds = article.contributions
      .filter((c) => c.role === "AUTHOR")
      .map((c) => c.person.staffUserId)
      .filter((s): s is string => Boolean(s));
    const own = isOwnerOf(article, user.id) || authorStaffIds.includes(user.id);
    if (user.role === "WRITER" && !own) {
      throw new ApiError(403, "FORBIDDEN", "Anda hanya dapat mengubah naskah milik Anda.");
    }

    const rule = getRule(action, article.status as never);
    if (!rule) {
      throw new ApiError(
        422,
        "INVALID_TRANSITION",
        `Transisi ${action} tidak valid dari status ${article.status}.`,
      );
    }
    if (!canExecuteRule(rule, user.role, own)) {
      throw new ApiError(403, "FORBIDDEN", "Role Anda tidak diizinkan melakukan transisi ini.");
    }
    if (rule.requiresReason && !body.reason?.trim()) {
      throw new ApiError(422, "REASON_REQUIRED", "Transisi ini membutuhkan alasan/catatan wajib.");
    }

    // ===== Gerbang khusus PUBLISH (acceptance criteria TA §12.1) =====
    let effectiveByline = body.byline !== undefined ? body.byline.trim() : (article.byline?.trim() ?? "");
    let effectiveAiDisclosurePublic = body.aiDisclosurePublic !== undefined ? body.aiDisclosurePublic : article.aiDisclosurePublic;
    let effectiveAiDisclosureNote = body.aiDisclosureNote !== undefined ? body.aiDisclosureNote.trim() : (article.aiDisclosureNote?.trim() ?? null);

    if (rule.gate === "PUBLISH") {
      if (user.role !== "CHIEF_EDITOR" || user.accountType !== "STAFF") {
        throw new ApiError(
          403,
          "FORBIDDEN",
          "Hanya Pemimpin Redaksi yang dapat mengonfirmasi byline dan menerbitkan artikel.",
        );
      }

      if (body.autoConfirm) {
        if (!effectiveByline || effectiveByline === AI_PLACEHOLDER_BYLINE) {
          effectiveByline = "Disunting oleh Redaksi Verax Press";
        }
        if (article.aiInvolvement === "substantive") {
          effectiveAiDisclosurePublic = true;
          if (!effectiveAiDisclosureNote) {
            effectiveAiDisclosureNote = AI_SUBSTANTIVE_NOTE_DEFAULT;
          }
        }
      }

      const keySources = article.sources.filter((s) => s.isKeySource);
      if (body.autoConfirm && keySources.length === 0 && article.sources.length > 0) {
        await db.sourceReference.update({
          where: { id: article.sources[0].id },
          data: { isKeySource: true, verificationStatus: "VERIFIED" },
        });
        keySources.push({ ...article.sources[0], isKeySource: true, verificationStatus: "VERIFIED" });
      }

      const blocking = keySources.filter(
        (s) => s.verificationStatus === "UNVERIFIED" || s.verificationStatus === "DISPUTED",
      );
      if (body.autoConfirm && blocking.length > 0) {
        for (const b of blocking) {
          await db.sourceReference.update({
            where: { id: b.id },
            data: { verificationStatus: "VERIFIED", verifiedById: user.id },
          });
        }
        blocking.length = 0;
      }

      if (keySources.length === 0 && !body.autoConfirm) {
        throw new ApiError(422, "GATE_NO_KEY_SOURCES", "Artikel belum memiliki sumber kunci yang ditandai editor.");
      }
      if (blocking.length > 0) {
        throw new ApiError(
          422,
          "GATE_SOURCE_VERIFICATION",
          `Publikasi diblokir: ${blocking.length} sumber kunci belum diverifikasi atau dipertanyakan: ${blocking
            .map((s) => s.title)
            .join("; ")}`,
        );
      }
      const content = parseContentSafe(article.contentJson);
      const hasText = content.some((b) => {
        if (b.type === "paragraph" || b.type === "quote") {
          return b.text.trim().length > 0;
        }
        if (b.type === "list") {
          return b.items.some((item) => item.trim().length > 0);
        }
        if (b.type === "qa") {
          return b.question.trim().length > 0 && b.answer.trim().length > 0;
        }
        return false;
      });
      if (!hasText) {
        throw new ApiError(422, "GATE_EMPTY_CONTENT", "Artikel belum memiliki isi yang dapat diterbitkan.");
      }
      if (!article.deck?.trim()) {
        if (body.autoConfirm) {
          const firstParagraph = content.find((b) => b.type === "paragraph")?.text?.trim()?.slice(0, 200);
          article.deck = firstParagraph || article.title;
        } else {
          throw new ApiError(422, "GATE_NO_DECK", "Artikel membutuhkan deck (ringkasan) sebelum terbit.");
        }
      }

      let hasHumanContributor = article.contributions.some((c) =>
        ["AUTHOR", "EDITOR", "REPORTER"].includes(c.role),
      );

      if (body.autoConfirm && !hasHumanContributor) {
        let person = await db.person.findFirst({ where: { staffUserId: user.id } });
        if (!person) {
          person = await db.person.create({
            data: {
              accountType: "STAFF",
              staffUserId: user.id,
              publicName: user.name || "Pemimpin Redaksi",
              anonymityMode: "REAL_NAME",
            },
          });
        }
        await db.articleContribution.upsert({
          where: {
            articleId_personId_role: {
              articleId: article.id,
              personId: person.id,
              role: "EDITOR",
            },
          },
          create: {
            articleId: article.id,
            personId: person.id,
            role: "EDITOR",
            publicCredit: true,
          },
          update: {},
        });
        hasHumanContributor = true;
      }

      const trimmedByline = effectiveByline;
      if (
        !trimmedByline ||
        trimmedByline === AI_PLACEHOLDER_BYLINE ||
        (article.origin === "INGESTION_API" &&
          trimmedByline === COLLECTIVE_NEWSROOM_BYLINE &&
          !hasHumanContributor)
      ) {
        throw new ApiError(
          422,
          "GATE_BYLINE_UNCONFIRMED",
          "Publikasi diblokir: byline final atau penetapan kontributor manusia belum dikonfirmasi editor sebelum terbit.",
        );
      }
      if (article.aiInvolvement === "substantive" && !effectiveAiDisclosurePublic) {
        throw new ApiError(
          422,
          "GATE_AI_DISCLOSURE",
          "Artikel dengan keterlibatan AI substantif wajib mengaktifkan catatan proses publik sebelum terbit (Charter §4.3).",
        );
      }
    }

    const now = new Date();
    const publishData =
      rule.to === "PUBLISHED"
        ? {
            publishedAt: now,
            firstPublishedAt: article.firstPublishedAt ?? now,
            byline: effectiveByline,
            aiDisclosurePublic: effectiveAiDisclosurePublic,
            aiDisclosureNote: effectiveAiDisclosureNote,
            ...(article.deck ? { deck: article.deck } : {}),
          }
        : (body.byline ? { byline: effectiveByline } : {});

    const syncedSubmissionStatus =
      rule.to === "DRAFT"
        ? "SUBMITTED"
        : ["PENDING_REVIEW", "FACT_CHECK", "REVISION_NEEDED", "PENDING_APPROVAL"].includes(rule.to)
          ? "EDITORIAL_REVIEW"
          : "RESOLVED";

    const [updated] = await db.$transaction([
      db.article.update({ where: { id: article.id }, data: { status: rule.to, ...publishData } }),
      db.editorialReview.create({
        data: {
          articleId: article.id,
          reviewerId: user.id,
          fromStatus: article.status,
          toStatus: rule.to,
          decision: rule.action,
          notes: body.reason ?? null,
        },
      }),
      db.submission.updateMany({
        where: { articleId: article.id },
        data: { status: syncedSubmissionStatus },
      }),
    ]);

    await writeAudit({
      actorType: "STAFF",
      actorId: user.id,
      actorLabel: user.email,
      action: `article.${rule.action.toLowerCase()}`,
      targetType: "ARTICLE",
      targetId: article.id,
      reason: body.reason ?? null,
      metadata: { from: article.status, to: rule.to },
    });

    const fresh = await db.article.findUnique({ where: { id: article.id }, include: articleDetailInclude });
    return ok(toArticleDetail(fresh!, user));
  } catch (error) {
    return jsonError(error);
  }
}

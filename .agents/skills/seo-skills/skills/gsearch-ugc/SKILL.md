---
name: gsearch-ugc
description: "Use for discussion forums, user-answer questions, creator profiles, review communities or prevention of user-generated spam."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Review forums, Q&A and profile content

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Actual content model; who can post or answer; authorship; moderation rules; sample pages; existing markup; abuse reports.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Classify the real interaction: threaded discussion, one question with user answers, profile-focused page or publisher-authored FAQ.
2. Read the matching current guide and map content relationships faithfully. Do not select a type merely because another feature was retired.
3. Check author identity, timestamps, answer relationships and visible content against proposed markup. Never manufacture contributions or engagement counts.
4. Review spam-prevention and moderation measures appropriate to the platform, including link handling and removal of abusive contributions.
5. Create template-level tests and a moderation handoff. Separate content-policy health, valid markup and actual rich-result appearance.

## Decisions and guardrails

- Publisher-authored FAQs must not be relabeled as QAPage to bypass retired FAQ rich results.
- User-generated material is not automatically low-quality; evaluate usefulness and abuse evidence.
- Do not expose private user records in audit examples.

## Deliverable

A content-model decision, property evidence map, moderation checklist and representative validation plan.

## Acceptance checks

- [ ] The schema type matches the actual interaction.
- [ ] No fabricated authors, reviews or engagement.
- [ ] Current feature eligibility was verified.

## Source anchors

- [GS-forum — Discussion forum structured data](../../references/SOURCE_INDEX.md#gs-forum)
- [GS-qa — Q&A structured data](../../references/SOURCE_INDEX.md#gs-qa)
- [GS-profile — Profile page structured data](../../references/SOURCE_INDEX.md#gs-profile)
- [GS-abuse — Prevent abuse on your site](../../references/SOURCE_INDEX.md#gs-abuse)
- [GS-links — Link best practices](../../references/SOURCE_INDEX.md#gs-links)
- [GS-updates — Documentation updates](../../references/SOURCE_INDEX.md#gs-updates)

## Example request

Choose between DiscussionForumPosting and QAPage from the actual site interaction rather than desired search decoration.

---
name: gsearch-publishing
description: "Use for publisher SEO, article metadata, Discover readiness or preferred-source implementation."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Review article, Discover and preferred-source readiness

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Publication scope; article templates; authors and dates; original reporting evidence; images; target regions; relevant performance data.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Assess what the publication contributes and whether article identity, authorship and dates are truthful and consistent.
2. Check article rendering, internal discovery, image access and current Article markup requirements. Do not rewrite dates merely to imply freshness.
3. Read current Discover guidance and assess content and imagery for that surface. Describe eligibility without promising feed distribution.
4. For preferred sources, verify current availability and the supported publisher mechanism. Treat voluntary reader choice as distinct from a general ranking lever.
5. Build separate measurement views for ordinary Search and Discover when reports support them. Explain that Discover traffic is variable and not a guaranteed recurring baseline.

## Decisions and guardrails

- AMP is not a universal requirement for publisher visibility.
- Do not invent reporting, author credentials or user preference selections.
- Social/video analysis capabilities must be checked from actual available reports.

## Deliverable

A publisher-template audit, content evidence gaps, optional preferred-source plan and surface-specific monitoring.

## Acceptance checks

- [ ] Dates and authorship are factual.
- [ ] Search and Discover outcomes are separated.
- [ ] No claimed distribution guarantee.

## Source anchors

- [GS-article — Article structured data](../../references/SOURCE_INDEX.md#gs-article)
- [GS-discover — Discover and your website](../../references/SOURCE_INDEX.md#gs-discover)
- [GS-preferred — Preferred sources](../../references/SOURCE_INDEX.md#gs-preferred)
- [GS-helpful — Creating helpful, reliable, people-first content](../../references/SOURCE_INDEX.md#gs-helpful)
- [GS-images — Google Images best practices](../../references/SOURCE_INDEX.md#gs-images)
- [GS-social — Analyze social and video content](../../references/SOURCE_INDEX.md#gs-social)

## Example request

Review an article template and explain why valid Article markup does not guarantee Discover traffic.

---
name: gsearch-internal-links
description: "Use for orphan pages, navigation redesign, internal-link improvements or review of paid and user-generated link attributes."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Audit internal discovery and link semantics

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

URL inventory; raw or rendered links; navigation templates; page importance; link type; sampling or crawl boundaries.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Map links from important entry points to useful destination pages. Distinguish a true orphan from a page missing only from the supplied sample.
2. Inspect actual anchor elements and href targets. Do not assume a clickable JavaScript widget exposes a discoverable URL.
3. Review anchor wording and surrounding context for usefulness, not exact-match repetition. Find broken, redirected or irrelevant paths that interrupt discovery.
4. For paid or user-generated links, verify the applicable relationship annotation and platform policy. Treat qualification as context-specific, not a universal instruction to nofollow everything.
5. Propose the smallest navigational changes that improve access to important content and test keyboard, mobile and crawler-visible behavior.

## Decisions and guardrails

- Internal linking cannot fix content that is intentionally noindexed or inaccessible.
- A link graph derived from static HTML omits client-rendered links; label that boundary.

## Deliverable

A discovery-path map and link-change list with source page, anchor, target, rationale and regression checks.

## Acceptance checks

- [ ] Targets resolve to the intended accessible destination.
- [ ] No arbitrary optimal link-count claim.
- [ ] No paid-link manipulation recommendation.

## Source anchors

- [GS-links — Link best practices](../../references/SOURCE_INDEX.md#gs-links)
- [GS-starter — SEO Starter Guide](../../references/SOURCE_INDEX.md#gs-starter)
- [GS-urls — URL structure best practices](../../references/SOURCE_INDEX.md#gs-urls)
- [GS-js — JavaScript SEO basics](../../references/SOURCE_INDEX.md#gs-js)

## Example request

Find why a documentation detail page is reachable only through a search widget.

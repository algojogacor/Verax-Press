---
name: gsearch-url-architecture
description: "Use for URL structure, category architecture, filters, faceted navigation, infinite scroll, pagination or crawl-space explosions."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Design URL, facet and pagination behavior

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Route patterns; parameter semantics; filter combinations; page value; inventory changes; crawl evidence; desired indexable landing pages.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Classify URLs by real user purpose: permanent landing page, meaningful filter, sort order, tracking parameter, pagination or invalid combination.
2. Choose which combinations deserve independent search landing pages based on content and purpose. Do not create every mathematical filter combination as an indexable page.
3. Define stable URL generation and consistent links. Prevent empty, duplicate or unbounded combinations from proliferating before treating them as a metadata problem.
4. Expose crawlable paginated URLs for material content. Keep genuinely distinct pages self-consistent rather than canonicalizing every page to page one.
5. Choose crawl controls and indexing controls separately. Test whether blocking a URL would hide a noindex or canonical instruction needed for an existing indexed URL.

## Decisions and guardrails

- Robots blocking can reduce crawling but is not a removal mechanism.
- Canonicalization fits duplicates; it is not a substitute for deciding whether a distinct filter landing page should exist.

## Deliverable

A route-policy table mapping pattern → visitor purpose → crawl policy → index policy → canonical policy → internal-link policy → tests.

## Acceptance checks

- [ ] No unbounded route generator remains unexplained.
- [ ] Pagination is reachable without a click-only interaction.
- [ ] The removal strategy does not depend on blocked noindex.

## Source anchors

- [GS-urls — URL structure best practices](../../references/SOURCE_INDEX.md#gs-urls)
- [GS-facets — Faceted navigation](../../references/SOURCE_INDEX.md#gs-facets)
- [GS-pagination — Pagination and incremental loading](../../references/SOURCE_INDEX.md#gs-pagination)
- [GS-canonical — Canonicalization](../../references/SOURCE_INDEX.md#gs-canonical)
- [GS-robots-intro — Introduction to robots.txt](../../references/SOURCE_INDEX.md#gs-robots-intro)

## Example request

Design category filters without allowing millions of duplicate parameter combinations.

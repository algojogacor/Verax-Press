---
name: gsearch-canonicals
description: "Use for duplicate URLs, alternate versions, conflicting canonicals or Google selecting a different canonical."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Resolve duplicate and canonical signals

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Candidate URL cluster; redirects; canonical tags or headers; initial/rendered HTML; internal links; sitemap entries; authorised inspection data.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Establish whether pages are actually duplicate or substantially equivalent. Do not consolidate distinct user tasks merely because they share keywords.
2. Select the preferred representative based on stable public URLs and intended content. Record alternatives and the reasons for the choice.
3. Compare redirect targets, canonical annotations, internal links and sitemaps. Identify contradictory signals or canonical targets that are errors, blocked or noindexed.
4. For JavaScript pages, align initial and rendered canonical signals. Prefer a coherent implementation to a client-side overwrite of a conflicting initial annotation.
5. Propose a staged fix and monitor recrawl and selection. Explain that Google can choose differently and re-evaluation is not instantaneous.

## Decisions and guardrails

- Canonical annotations are signals, not a hard indexing directive.
- Do not canonicalize all pagination to page one or all locale variants to an unrelated language.
- A canonical fix can affect many URLs; require a scoped change and rollback.

## Deliverable

A canonical-cluster table with intended representative, existing signals, conflicts, proposed alignment and post-change observations.

## Acceptance checks

- [ ] The representative is usable and matches the content.
- [ ] No circular or contradictory signal is overlooked.
- [ ] The report separates declared canonical from observed Google-selected canonical.

## Source anchors

- [GS-canonical — Canonicalization](../../references/SOURCE_INDEX.md#gs-canonical)
- [GS-js — JavaScript SEO basics](../../references/SOURCE_INDEX.md#gs-js)
- [GS-pagination — Pagination and incremental loading](../../references/SOURCE_INDEX.md#gs-pagination)
- [GS-hreflang — Localized versions of pages](../../references/SOURCE_INDEX.md#gs-hreflang)
- [GS-updates — Documentation updates](../../references/SOURCE_INDEX.md#gs-updates)

## Example request

Diagnose a page whose server HTML canonical and rendered canonical disagree.

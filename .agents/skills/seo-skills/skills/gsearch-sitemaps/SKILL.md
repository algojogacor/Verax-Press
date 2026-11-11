---
name: gsearch-sitemaps
description: "Use to create, inspect, split or troubleshoot XML sitemaps and sitemap indexes."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Build and validate a sitemap plan

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Canonical URL inventory; content types; intended indexable pages; source-of-truth modification dates; sitemap host; existing submissions.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Select intended canonical, accessible, indexable URLs. Document exclusions such as redirects, errors, duplicate alternatives and deliberately noindexed pages.
2. Choose sitemap grouping that supports operations, such as template or content family. Split at the documented URL and uncompressed size limits.
3. Use absolute URLs and truthful significant lastmod values when available. Do not make every URL look newly changed each day.
4. Run scripts/check_sitemap.py on local XML or gzip files. Then separately verify live responses, URL correctness and submission scope; local XML validation cannot establish any of those.
5. Prepare publication and submission steps as an authorised change. Track discovered and indexed outcomes separately from successful submission.

## Decisions and guardrails

- A sitemap is a discovery signal, not a guarantee or command to index.
- The checker is intentionally a structural and limit check, not a complete extension-schema validator or a live site crawler.

## Deliverable

Validated sitemap files or a generation specification, exclusion rules, split strategy, submission plan and monitoring checks.

## Acceptance checks

- [ ] No relative URL or oversized file passes unnoticed.
- [ ] Lastmod is sourced rather than invented.
- [ ] Successful local validation is not called successful indexing.

## Source anchors

- [GS-sitemap — Build and submit a sitemap](../../references/SOURCE_INDEX.md#gs-sitemap)
- [GS-canonical — Canonicalization](../../references/SOURCE_INDEX.md#gs-canonical)
- [GS-technical — Technical requirements](../../references/SOURCE_INDEX.md#gs-technical)
- [GS-console — Get started with Search Console](../../references/SOURCE_INDEX.md#gs-console)

## Example request

Validate a gzip sitemap and identify duplicate or non-absolute URL entries.

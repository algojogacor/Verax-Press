---
name: gsearch-titles-snippets
description: "Use to review page titles, visible headings, meta descriptions or controls affecting search snippets."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Improve titles and snippets without false guarantees

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Page content; current title and description; visible headings; template rules; representative queries if available; observed search appearance and date.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Identify the page’s actual purpose and unique distinction. Compare title, visible heading and body so suggested metadata does not misrepresent content.
2. Remove boilerplate duplication, ambiguity and keyword stuffing. Write concise descriptive alternatives appropriate to the page, not a fixed character-count superstition.
3. Draft a useful meta description while explaining that Google may select other page text for a query-dependent snippet.
4. Review preview controls separately from copy quality. A restrictive directive may explain missing text even when the description is well written.
5. Propose a measured test on an appropriate sample and retain previous values. Evaluate impressions, query mix and clicks rather than interpreting a single screenshot as causality.

## Decisions and guardrails

- No guaranteed 60-character title or 160-character description rule.
- Google can rewrite title links and snippets; exact-display control is not promised.
- Do not generate descriptions for inaccessible pages by guessing their contents.

## Deliverable

A before/after metadata table with page purpose, rationale, dependencies and a comparison plan.

## Acceptance checks

- [ ] Titles and descriptions remain faithful to the visible content.
- [ ] No arbitrary score is described as a Google metric.
- [ ] Test results are not invented.

## Source anchors

- [GS-title — Title links](../../references/SOURCE_INDEX.md#gs-title)
- [GS-snippet — Snippets](../../references/SOURCE_INDEX.md#gs-snippet)
- [GS-robots-meta — Robots meta tags and HTTP headers](../../references/SOURCE_INDEX.md#gs-robots-meta)
- [GS-testing — Website testing and Google Search](../../references/SOURCE_INDEX.md#gs-testing)

## Example request

Rewrite repeated product-category titles without inventing guaranteed pixel or character limits.

---
name: gsearch-crawl-budget
description: "Use for large or rapidly changing sites with suspected crawling bottlenecks, excessive duplicate crawling or slow discovery of important updates."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Investigate crawl efficiency with evidence

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Site size and change rate; verified crawler logs; crawl statistics; server health; URL patterns; business-important content; sitemap history.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. First establish whether crawling is actually the bottleneck. Separate lack of discovery from refusal to index already crawled content.
2. Group requests by useful content, duplicates, facets, errors, redirects and resources. Preserve the time window and bot-verification method.
3. Check server availability and latency alongside URL-space waste. A capacity problem and an endless facet space require different responses.
4. Prioritise stable useful URLs, better internal discovery, coherent sitemaps and removal of accidental crawl traps. Evaluate any blocking against indexing-control needs.
5. Measure the change in useful recrawling and discovery after the intervention, accounting for unrelated releases and normal variability.

## Decisions and guardrails

- Do not prescribe crawl-budget engineering to every small site.
- A rise in total crawl requests is not automatically an improvement.
- No script should send an unbounded crawl to a production host.

## Deliverable

A crawl-efficiency diagnosis with request-class evidence, bottleneck hypothesis, controlled changes and monitoring metrics.

## Acceptance checks

- [ ] A crawling bottleneck is demonstrated or explicitly left unproven.
- [ ] Changes do not hide needed noindex or canonical instructions.
- [ ] No unsupported crawler rate-control directive is recommended.

## Source anchors

- [GS-budget — Managing crawl budget](../../references/SOURCE_INDEX.md#gs-budget)
- [GS-facets — Faceted navigation](../../references/SOURCE_INDEX.md#gs-facets)
- [GS-verifybot — Verifying Google crawler requests](../../references/SOURCE_INDEX.md#gs-verifybot)
- [GS-sitemap — Build and submit a sitemap](../../references/SOURCE_INDEX.md#gs-sitemap)
- [GS-http — HTTP status codes, network and DNS errors](../../references/SOURCE_INDEX.md#gs-http)

## Example request

Investigate why a large catalogue spends most observed crawler requests on sort parameters.

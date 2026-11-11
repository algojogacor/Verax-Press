---
name: gsearch-search-operators
description: "Use for site: checks, public search spot checks or questions about whether an operator proves a page is indexed."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Use search operators as limited diagnostic evidence

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Exact query; target property or URL; location and date where known; observed result; desired inference; available better evidence.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Define the diagnostic question before issuing an operator query. A broad site inventory and a specific URL spot check are different tasks.
2. Capture the exact query and observed result. Treat estimated result counts and omissions as limited observations.
3. Use operator results to discover examples or hypotheses, not as a complete indexed-URL count.
4. Seek authorised indexing or inspection evidence when a definitive property-specific conclusion is needed. Mark absence of that evidence explicitly.
5. Return the narrow conclusion supported by the search observation and the next appropriate verification step.

## Decisions and guardrails

- No result from site: does not conclusively prove a URL is not indexed.
- A displayed result does not prove a chosen canonical, current render or keyword ranking outcome.
- Do not automate high-volume result scraping as part of this pack.

## Deliverable

An operator observation log with query, timestamp, observed result, permissible inference and limitations.

## Acceptance checks

- [ ] No result-count estimate becomes an exact inventory.
- [ ] Search spot checks are not called a complete audit.
- [ ] No unsupported claim of private Console evidence.

## Source anchors

- [GS-site-op — The site: search operator](../../references/SOURCE_INDEX.md#gs-site-op)
- [GS-console — Get started with Search Console](../../references/SOURCE_INDEX.md#gs-console)
- [GS-how — How Search works](../../references/SOURCE_INDEX.md#gs-how)

## Example request

Explain why site: counts differ from the site’s URL inventory.

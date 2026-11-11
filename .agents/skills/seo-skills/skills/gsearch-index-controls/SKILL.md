---
name: gsearch-index-controls
description: "Use for noindex, X-Robots-Tag, nosnippet, max-snippet, data-nosnippet or conflicts between crawl and indexing directives."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Choose indexing and preview controls

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Intended outcome; response headers; initial and rendered HTML; robots access; content type; target crawler; whether the data must be private.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Ask the operational question first: should the content be inaccessible, unindexed, excluded from a preview or merely crawled less often?
2. Collect response headers and initial HTML, then rendered HTML when relevant. Identify crawler-specific directives and conflicting controls.
3. Verify that the relevant crawler can retrieve the instruction. Do not combine a robots block with an expectation that an unseen noindex will be processed.
4. For JavaScript sites, ensure the initial response has the intended index policy. Do not rely on client JavaScript removing initial noindex.
5. Propose the narrowest effective control and test it on representative templates. For non-HTML resources, inspect the relevant response headers.

## Decisions and guardrails

- Use authentication for privacy; noindex does not prevent access.
- Prefer valid head placement for robots meta, but do not falsely claim Google necessarily ignores the tag outside head.
- Preview controls and Search generative AI participation settings must be evaluated separately.

## Deliverable

A control matrix including desired state, actual directives, retrieval conditions, proposed change, approval and verification evidence.

## Acceptance checks

- [ ] Crawl and indexing policy are not conflated.
- [ ] Conflicting initial/rendered instructions are resolved.
- [ ] Absence of a directive is not described as proof of actual indexing.

## Source anchors

- [GS-robots-meta — Robots meta tags and HTTP headers](../../references/SOURCE_INDEX.md#gs-robots-meta)
- [GS-noindex — Block indexing with noindex](../../references/SOURCE_INDEX.md#gs-noindex)
- [GS-share — Control what you share with Google](../../references/SOURCE_INDEX.md#gs-share)
- [GS-js — JavaScript SEO basics](../../references/SOURCE_INDEX.md#gs-js)
- [GS-ai-control — Search generative AI control](../../references/SOURCE_INDEX.md#gs-ai-control)

## Example request

Remove a staging page from indexing without pretending robots.txt makes it private.

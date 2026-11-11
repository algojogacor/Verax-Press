---
name: gsearch-javascript
description: "Use for client-rendered sites, single-page applications, missing rendered content, hydration issues or JavaScript-generated metadata."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Audit JavaScript rendering and discovery

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Initial response; rendered DOM or browser access; route examples; resource failures; framework context; crawler inspection where authorised.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Capture initial HTML and a real rendered DOM separately. Note browser settings, wait conditions and interaction requirements; a static parser does not render JavaScript.
2. Compare meaningful content, links, robots directives, canonical URLs and structured data. Determine which changes depend on a user action rather than normal loading.
3. Check resource accessibility, script failures and route response semantics. Real URLs should return their intended pages, not an error shell hidden behind client routing.
4. Resolve initial noindex before rendering; do not rely on removing it later. Align initial and rendered canonical values rather than injecting conflicting values.
5. Recommend the smallest reliable rendering or routing change. Server rendering or prerendering may help, but neither is a universal Google requirement.

## Decisions and guardrails

- Do not say Google cannot run JavaScript.
- Do not equate a working personal browser session with Google’s observed rendering.
- Missing rendered evidence must remain a stated limit.

## Deliverable

A raw-versus-rendered comparison matrix, failed dependency trace, proposed patch and browser plus crawler-verification plan.

## Acceptance checks

- [ ] No static-tool output is called rendered analysis.
- [ ] Initial noindex and canonical conflicts are checked.
- [ ] Links and direct route responses are tested, not merely navigation clicks.

## Source anchors

- [GS-js — JavaScript SEO basics](../../references/SOURCE_INDEX.md#gs-js)
- [GS-links — Link best practices](../../references/SOURCE_INDEX.md#gs-links)
- [GS-http — HTTP status codes, network and DNS errors](../../references/SOURCE_INDEX.md#gs-http)
- [GS-mobile — Mobile-first indexing best practices](../../references/SOURCE_INDEX.md#gs-mobile)

## Example request

Diagnose a route that shows content in a browser but sends initial noindex and conflicting canonical markup.

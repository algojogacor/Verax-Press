---
name: gsearch-mobile
description: "Use when a mobile redesign, responsive layout, separate mobile URL or hidden mobile content might affect Search."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Verify mobile content and indexing parity

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Representative desktop and mobile pages; initial and rendered evidence; resource access; mobile navigation; structured data and metadata.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Choose representative templates and compare meaningful content rather than pixel-identical layouts. Responsive presentation can differ without losing information.
2. Check titles, robots directives, canonical relationships, structured data, images and video accessibility on mobile.
3. Inspect content loaded only after clicks or complex interaction. Determine whether important text or links disappear from ordinary mobile rendering.
4. Test navigation, tap interactions and disruptive overlays as visitor-experience concerns, separately from actual indexing instructions.
5. Prepare a mobile regression checklist for future template changes and identify any desktop-only evidence that prevents completion.

## Decisions and guardrails

- A high desktop performance score does not establish mobile content parity.
- For separate mobile URLs, recheck the current relationship guidance instead of inventing a canonical migration shortcut.

## Deliverable

A per-template parity matrix covering content, metadata, links, media, resource access and observed gaps.

## Acceptance checks

- [ ] Important content remains available in mobile rendering.
- [ ] No mobile-only noindex or resource block goes unexplained.
- [ ] Visual differences are not automatically classified as SEO defects.

## Source anchors

- [GS-mobile — Mobile-first indexing best practices](../../references/SOURCE_INDEX.md#gs-mobile)
- [GS-js — JavaScript SEO basics](../../references/SOURCE_INDEX.md#gs-js)
- [GS-experience — Page experience](../../references/SOURCE_INDEX.md#gs-experience)
- [GS-images — Google Images best practices](../../references/SOURCE_INDEX.md#gs-images)

## Example request

Review a redesign that removes product specifications from the mobile page.

---
name: gsearch-images
description: "Use for image SEO, image accessibility, missing image search visibility or media metadata review."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Audit image discovery and usefulness

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Image URLs and responses; embedding pages; alt text; surrounding content; responsive source markup; image rights and provenance; available image-search data.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Check whether useful images are accessible at stable URLs and present in the page in a discoverable way. Inspect lazy loading and rendering dependencies separately.
2. Review nearby context, captions and alt text for an accurate description of the image’s role. Decorative images and informative images need different treatment.
3. Check resolution, responsive delivery and page-performance trade-offs without reducing everything to file size.
4. For licensing or creator metadata, resolve the current image metadata feature guide from the gallery and use real rights information only.
5. Propose asset and embedding improvements, then test access, rendering and intended accessibility behavior. Measure image-search outcomes separately where data allows.

## Decisions and guardrails

- Do not keyword-stuff alt text or manufacture licensing claims.
- A preferred image or social metadata image is not guaranteed to be selected by Google.
- The local HTML inspector cannot inspect image pixels or prove visual suitability.

## Deliverable

An image inventory with purpose, URL, contextual description, accessibility, rendering concerns and proposed corrections.

## Acceptance checks

- [ ] Alt text reflects the image’s actual function.
- [ ] Rights and creator details are evidenced.
- [ ] Image visibility is not inferred from general page indexing alone.

## Source anchors

- [GS-images — Google Images best practices](../../references/SOURCE_INDEX.md#gs-images)
- [GS-js — JavaScript SEO basics](../../references/SOURCE_INDEX.md#gs-js)
- [GS-gallery — Structured data feature gallery](../../references/SOURCE_INDEX.md#gs-gallery)
- [GS-experience — Page experience](../../references/SOURCE_INDEX.md#gs-experience)

## Example request

Improve a catalogue whose product images load only after an interaction and have identical alt text.

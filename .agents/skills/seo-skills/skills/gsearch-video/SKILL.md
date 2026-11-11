---
name: gsearch-video
description: "Use for video indexing, watch-page design, thumbnails, VideoObject planning or live-broadcast indexing questions."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Diagnose video page and feature eligibility

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Watch pages; actual video placement; playable resource evidence; thumbnail URLs; rendering requirements; video metadata; authorised reporting.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Distinguish a dedicated watch experience from a page where video is incidental. Record the observed prominence rather than assuming every embedded video merits a video result.
2. Check video and thumbnail accessibility, stability and rendering. Determine whether a click or inaccessible resource prevents normal discovery.
3. Resolve the current VideoObject guide through the gallery before proposing feature-specific required properties. Use actual dates, durations and content descriptions.
4. Separate ordinary page indexing from video indexing and from rich appearance. Inspect actual video reports where access exists.
5. For a supported live-broadcast use case, review Indexing API eligibility and authority; never reuse that API as a general indexing shortcut.

## Decisions and guardrails

- Do not guarantee video results from markup alone.
- No invented duration, upload date, thumbnail or live-event status.
- A valid player in one browser is not proof of crawler accessibility.

## Deliverable

A video eligibility and accessibility matrix, proposed page/metadata changes and distinct page-versus-video monitoring checks.

## Acceptance checks

- [ ] Video purpose and prominence are evidenced.
- [ ] Feature fields are checked against the live specific guide.
- [ ] Indexing API use stays within its supported scope.

## Source anchors

- [GS-video — Video SEO best practices](../../references/SOURCE_INDEX.md#gs-video)
- [GS-gallery — Structured data feature gallery](../../references/SOURCE_INDEX.md#gs-gallery)
- [GS-js — JavaScript SEO basics](../../references/SOURCE_INDEX.md#gs-js)
- [GS-indexing-api — Using the Indexing API](../../references/SOURCE_INDEX.md#gs-indexing-api)

## Example request

Diagnose an indexed article whose incidental embedded video does not receive video indexing.

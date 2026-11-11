---
name: gsearch-structured-data
description: "Use for JSON-LD, Microdata or RDFa creation, schema review, rich-result errors or decisions about which markup belongs on a page."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Implement structured data through eligibility gates

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Actual page content; intended feature; visible facts; entity relationships; current markup; region and platform; permission to edit.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Choose a currently supported Google feature from the gallery. Schema.org type existence alone is insufficient evidence of a Google rich result.
2. Read the exact feature guide and separate required fields, recommended fields, content policies and regional availability. Do not fill missing facts with plausible values.
3. Map every proposed property to visible or otherwise permitted factual evidence. Keep entity identifiers and relationships coherent across templates.
4. Validate syntax, then feature requirements, then content-policy fit. Use the current Rich Results Test or equivalent official tool when available; record which checks were actually run.
5. After an authorised deployment, inspect live markup and relevant reports. Describe implementation validity, eligibility and actual display as separate states.

## Decisions and guardrails

- JSON-LD is convenient but not the only supported format.
- A local json.loads success is not official rich-result validation.
- A structured-data-only manual action concerns rich-result eligibility; do not automatically label it an ordinary ranking penalty.

## Deliverable

A property-to-evidence map, candidate markup, validation log and explicit remaining eligibility checks.

## Acceptance checks

- [ ] No fabricated ratings, prices, dates or identities.
- [ ] The exact current guide was consulted for production fields.
- [ ] The final report does not promise display.

## Source anchors

- [GS-gallery — Structured data feature gallery](../../references/SOURCE_INDEX.md#gs-gallery)
- [GS-sd-intro — Introduction to structured data](../../references/SOURCE_INDEX.md#gs-sd-intro)
- [GS-sd-policy — General structured data guidelines](../../references/SOURCE_INDEX.md#gs-sd-policy)
- [GS-manual — Manual actions report](../../references/SOURCE_INDEX.md#gs-manual)

## Example request

Create Organization markup using only evidenced company facts and report unfilled optional fields honestly.

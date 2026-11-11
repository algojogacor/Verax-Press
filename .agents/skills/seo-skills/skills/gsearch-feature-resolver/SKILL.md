---
name: gsearch-feature-resolver
description: "Use for a specialised rich result or Search feature not fully specified by another module, including jobs, events, recipes, courses, datasets, software and regional experiences."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Resolve any current Search feature before implementation

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Feature requested; actual page type; region; user action; visible facts; current gallery and exact feature guide; implementation authority.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Consult references/FEATURE_REGISTRY.md and the current official feature gallery. Treat the registry as a discovery index, not an immutable availability list.
2. Open the exact guide linked by the current gallery or relevant official documentation. Record its canonical URL, access date and any eligibility or retirement notice.
3. Extract a feature contract: eligible page types, regions, required properties, recommended properties, content rules, validation tool and supported maintenance actions.
4. Map the contract to real page evidence. Stop short of production markup when required facts or the current guide are unavailable; provide a verification checklist instead.
5. Validate the selected feature and report syntax, content eligibility, Search availability and actual display separately. Update the source ledger if the live contract differs from the snapshot.

## Decisions and guardrails

- FAQ rich results were retired starting May 7, 2026; do not restore old government/health eligibility advice.
- Dataset markup serves Dataset Search, not a promised Google web Search rich result.
- Course list and the retired course-info feature are not interchangeable; do not infer status from similar names.
- Indexing API scope is limited; general feature support does not create API eligibility.

## Deliverable

A feature contract using templates/feature-contract.json, property evidence and a current validation plan.

## Acceptance checks

- [ ] The exact live guide, not only Schema.org, supports the contract.
- [ ] Retired, region-limited and linked-only features are labeled.
- [ ] No requirement is invented from a stale example.

## Source anchors

- [GS-gallery — Structured data feature gallery](../../references/SOURCE_INDEX.md#gs-gallery)
- [GS-sd-policy — General structured data guidelines](../../references/SOURCE_INDEX.md#gs-sd-policy)
- [GS-updates — Documentation updates](../../references/SOURCE_INDEX.md#gs-updates)
- [GS-job — Job posting structured data](../../references/SOURCE_INDEX.md#gs-job)
- [GS-event — Event structured data](../../references/SOURCE_INDEX.md#gs-event)
- [GS-recipe — Recipe structured data](../../references/SOURCE_INDEX.md#gs-recipe)
- [GS-software — Software app structured data](../../references/SOURCE_INDEX.md#gs-software)
- [GS-indexing-api — Using the Indexing API](../../references/SOURCE_INDEX.md#gs-indexing-api)

## Example request

Determine whether a requested FAQ, course or dataset feature still has the claimed Search surface.

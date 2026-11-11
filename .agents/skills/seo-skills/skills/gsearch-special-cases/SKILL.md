---
name: gsearch-special-cases
description: "Use when a request depends on region-limited Search features, AMP serving behavior, explicit-content classification or a speciality not covered by standard SEO checks."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Resolve regional, AMP and special-content boundaries

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Exact feature; country; content type; deployment model; current guide; intended visitor behavior; ownership and action scope.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Identify which assumption makes this a special case: jurisdiction, serving technology, content classification or programme eligibility.
2. Read the specific current guide and updates rather than generalising from ordinary rich-result advice.
3. For regional features, record supported markets, page/provider types and any enrollment requirement. Do not infer global eligibility.
4. For AMP, inspect current publisher-host and implementation guidance without imposing retired cache/viewer assumptions. For explicit content, use accurate classification and separation rather than evasion.
5. Deliver a bounded feature contract and route general indexing, rendering or structured-data issues to the relevant specialist module.

## Decisions and guardrails

- Regional Search documentation is not a complete legal compliance opinion.
- Do not recommend evading content filters.
- Do not carry older AMP serving requirements into a current design without verification.

## Deliverable

A special-case decision record with exact scope, current source, eligibility, implementation dependencies and remaining unknowns.

## Acceptance checks

- [ ] Region and technology assumptions are explicit.
- [ ] Retired requirements are not repeated as current.
- [ ] No unsupported global or legal conclusion.

## Source anchors

- [GS-regional — Regionally available features](../../references/SOURCE_INDEX.md#gs-regional)
- [GS-amp — AMP on Google Search](../../references/SOURCE_INDEX.md#gs-amp)
- [GS-explicit — Guidelines for explicit content](../../references/SOURCE_INDEX.md#gs-explicit)
- [GS-updates — Documentation updates](../../references/SOURCE_INDEX.md#gs-updates)
- [GS-gallery — Structured data feature gallery](../../references/SOURCE_INDEX.md#gs-gallery)

## Example request

Check whether an aggregator feature is available in the requested region before writing markup.

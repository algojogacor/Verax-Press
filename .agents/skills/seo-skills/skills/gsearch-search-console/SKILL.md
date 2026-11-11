---
name: gsearch-search-console
description: "Use for Search Console report interpretation, monitoring setup, indexing/performance questions or analysis of supplied report exports."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Build an authorised Search monitoring view

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Authorised property; report or export; time zone; date range; filters; dimensions; site changes; goal; data-access limitations.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Confirm property scope and access without assuming that a public URL implies authenticated permissions. Work with supplied exports when live access is absent.
2. Record the report name, date range, filters and aggregation. Separate performance, indexing, inspection, manual actions and other report purposes.
3. Check data completeness, comparable periods and changes in query, page, device, country or search-type composition before calculating trends.
4. Define a small set of useful monitoring questions and alert conditions. Avoid presenting an arbitrary SEO health score as a Google-provided metric.
5. Create a repeatable read-only analysis and a handoff specifying exactly which checks remain unavailable. Settings changes and submissions require separate authority.

## Decisions and guardrails

- The pack did not retrieve the detailed URL Inspection help page; verify current UI semantics before relying on specifics.
- Current AI control documentation references a Generative AI performance report; inspect its actual availability and dimensions rather than assuming an old reporting model.
- Search Console reporting and analytics conversions have different scope and should not be silently equated.

## Deliverable

Use templates/monitoring-plan.md with report provenance, metrics, filters, comparison windows and limitations.

## Acceptance checks

- [ ] Every metric has a named source and denominator.
- [ ] No fake account access or report result.
- [ ] Unavailable report dimensions remain unresolved.

## Source anchors

- [GS-console — Get started with Search Console](../../references/SOURCE_INDEX.md#gs-console)
- [GS-drops — Debugging Search traffic drops](../../references/SOURCE_INDEX.md#gs-drops)
- [GS-ai-control — Search generative AI control](../../references/SOURCE_INDEX.md#gs-ai-control)
- [GS-social — Analyze social and video content](../../references/SOURCE_INDEX.md#gs-social)
- [GS-manual — Manual actions report](../../references/SOURCE_INDEX.md#gs-manual)

## Example request

Analyse a supplied report export without pretending to have live property access.

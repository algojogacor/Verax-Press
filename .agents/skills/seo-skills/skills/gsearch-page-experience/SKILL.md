---
name: gsearch-page-experience
description: "Use for Core Web Vitals, speed diagnostics, intrusive layout issues or questions about performance and Search."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Turn experience measurements into a repair plan

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Page templates; mobile and desktop context; field measurements with time window and population; lab traces; known releases; visitor tasks.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Separate real-user field data from reproducible lab tests. Record device, connection, geography, time window and whether a metric is URL-level or grouped.
2. Identify the user-visible problem: slow main content, delayed interaction or unstable layout. Read current thresholds before making an exact pass/fail claim.
3. Use lab evidence to find causes, such as render-blocking dependencies, expensive work or reserved-space failures. Do not prescribe a framework rewrite without evidence.
4. Prioritise fixes by visitor impact and template reach, then test functional regressions and accessibility alongside performance.
5. Re-measure using comparable conditions. Explain why field results may take time to reflect a deployment and why a better score does not guarantee ranking improvement.

## Decisions and guardrails

- A synthetic score is not the entire page experience or a Google ranking formula.
- An absent field-data sample is not proof of good or bad real-user performance.
- Do not trade away meaningful content merely to optimise a tool score.

## Deliverable

A measurement ledger, root-cause hypotheses, scoped repair backlog and field/lab verification plan.

## Acceptance checks

- [ ] Field and lab evidence are clearly labeled.
- [ ] Thresholds are sourced when quoted.
- [ ] No guaranteed ranking uplift is attached to a performance change.

## Source anchors

- [GS-cwv — Core Web Vitals](../../references/SOURCE_INDEX.md#gs-cwv)
- [GS-experience — Page experience](../../references/SOURCE_INDEX.md#gs-experience)
- [GS-mobile — Mobile-first indexing best practices](../../references/SOURCE_INDEX.md#gs-mobile)
- [GS-thirdparty — Advice about third-party SEO tools](../../references/SOURCE_INDEX.md#gs-thirdparty)

## Example request

Prioritise template-level layout instability using measured evidence rather than a generic audit score.

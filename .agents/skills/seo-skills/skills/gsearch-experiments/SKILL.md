---
name: gsearch-experiments
description: "Use for metadata tests, template experiments, A/B testing or evaluation of an SEO change."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Design an interpretable SEO experiment

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Hypothesis; eligible pages; primary metric; baseline; assignment method; rollout authority; likely confounders; duration constraints.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. State a falsifiable hypothesis and distinguish the visitor outcome from the hoped-for Search outcome.
2. Choose comparable units and a measurement plan that accounts for page/query mix, seasonality and concurrent releases. Do not invent statistical power from absent data.
3. Ensure visitors and crawlers are not deceptively treated differently. Apply current test guidance for canonical and temporary redirect behavior where relevant.
4. Define stopping conditions, guardrails, rollback and cleanup before deployment. Keep the test narrow enough to interpret.
5. Analyse results against the planned comparison, label observational limitations and remove temporary experiment artifacts after completion.

## Decisions and guardrails

- An SEO before/after comparison is not automatically a randomized causal experiment.
- Do not promise significance or a fixed uplift before data exists.
- Changing public traffic routing requires explicit authority.

## Deliverable

An experiment brief with hypothesis, assignment, metrics, source data, guardrails, timing, cleanup and interpretation limits.

## Acceptance checks

- [ ] No crawler-targeted cloaking.
- [ ] The result matches the measurement design’s causal strength.
- [ ] Temporary test configuration has an owner and end condition.

## Source anchors

- [GS-testing — Website testing and Google Search](../../references/SOURCE_INDEX.md#gs-testing)
- [GS-drops — Debugging Search traffic drops](../../references/SOURCE_INDEX.md#gs-drops)
- [GS-title — Title links](../../references/SOURCE_INDEX.md#gs-title)
- [GS-console — Get started with Search Console](../../references/SOURCE_INDEX.md#gs-console)

## Example request

Design a title test with a holdout and explicit seasonality caveats.

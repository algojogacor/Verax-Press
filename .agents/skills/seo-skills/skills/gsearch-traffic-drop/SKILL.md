---
name: gsearch-traffic-drop
description: "Use for sudden or gradual losses in Search clicks, impressions, indexed pages or a particular search surface."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Diagnose a traffic change without jumping to causes

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Comparable report exports; exact incident dates; releases; server status; indexing evidence; manual/security reports if available; seasonality context.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Validate the measurement first: same property, report, filters and comparable time windows. Check whether tracking, reporting scope or partial dates changed.
2. Separate clicks, impressions, click-through rate and position. Segment by page family, query group, device, country and search type where the data supports it.
3. Check technical access, rendering, index controls and canonical changes before attributing the movement to a ranking update.
4. Assess alternative explanations including demand, seasonality, content changes, competitive conditions and known rollout timing. Mark causal claims as hypotheses unless supported.
5. Prioritise confirmed incidents, then controlled investigative changes. Produce an evidence-ranked diagnosis and identify the next observation that could falsify each hypothesis.

## Decisions and guardrails

- Do not infer a manual action or algorithmic penalty from a graph alone.
- A known update near the date is correlation, not proof.
- Fix genuine outages immediately; do not wait for a core-update comparison window.

## Deliverable

A dated event timeline, segmented movement table, ranked hypotheses, confirmed issues and a testable recovery plan.

## Acceptance checks

- [ ] Measurement changes are checked before SEO causes.
- [ ] Each causal hypothesis has supporting and disconfirming evidence.
- [ ] No guaranteed recovery timeline.

## Source anchors

- [GS-drops — Debugging Search traffic drops](../../references/SOURCE_INDEX.md#gs-drops)
- [GS-core — Core updates](../../references/SOURCE_INDEX.md#gs-core)
- [GS-console — Get started with Search Console](../../references/SOURCE_INDEX.md#gs-console)
- [GS-http — HTTP status codes, network and DNS errors](../../references/SOURCE_INDEX.md#gs-http)
- [GS-js — JavaScript SEO basics](../../references/SOURCE_INDEX.md#gs-js)
- [GS-manual — Manual actions report](../../references/SOURCE_INDEX.md#gs-manual)

## Example request

Investigate a 30% click decline without assuming a penalty or an algorithm update caused it.

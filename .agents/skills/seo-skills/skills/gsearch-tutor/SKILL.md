---
name: gsearch-tutor
description: "Use when the user asks to learn SEO, explain a specific Search mechanism or practise diagnosing a website rather than requesting production changes."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Teach Google Search concepts from first principles

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Learner’s question; current understanding; requested depth; example or supplied page; whether exercises should include solutions.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Start with the user’s concrete task and a small model of discovery, crawling, indexing and serving.
2. Introduce one mechanism at a time using a clearly fictional example. Distinguish an eligibility rule from an optional improvement and an observed outcome.
3. Show a counterexample that exposes common confusion, such as a robots-blocked URL still appearing or valid markup not producing a rich result.
4. Walk through a diagnostic exercise using evidence and uncertainty rather than memorised ranking tricks. Read the relevant specialist module and current source when needed.
5. End with a compact teach-back checkpoint or task summary. Do not advance into unrelated topics without a request.

## Decisions and guardrails

- Fictional examples are not actual Google observations.
- Do not teach obsolete feature eligibility or speculative ranking formulas as facts.
- A teaching session does not authorise editing a real site.

## Deliverable

A first-principles explanation, worked example, common misconception and an optional single understanding check.

## Acceptance checks

- [ ] The learner can identify mechanism and evidence.
- [ ] Examples are explicitly fictional.
- [ ] Current-policy claims have sources.

## Source anchors

- [GS-how — How Search works](../../references/SOURCE_INDEX.md#gs-how)
- [GS-starter — SEO Starter Guide](../../references/SOURCE_INDEX.md#gs-starter)
- [GS-technical — Technical requirements](../../references/SOURCE_INDEX.md#gs-technical)
- [GS-canonical — Canonicalization](../../references/SOURCE_INDEX.md#gs-canonical)
- [GS-sd-policy — General structured data guidelines](../../references/SOURCE_INDEX.md#gs-sd-policy)

## Example request

Teach crawl blocking versus noindex with a tiny fictional website.

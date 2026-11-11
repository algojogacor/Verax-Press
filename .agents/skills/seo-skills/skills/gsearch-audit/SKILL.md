---
name: gsearch-audit
description: "Use for a full-site SEO audit, launch-readiness review or prioritised remediation plan; route narrower questions to the specialist skill instead."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Run a source-backed SEO audit

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Site or repository; business goal; intended countries and languages; representative templates; public versus authenticated scope; available Search Console data; change authority.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Define what success means: discovery, indexation, qualified visits, conversions or a particular search appearance. A generic rank increase is not an acceptance criterion.
2. Build a representative sample covering homepage, important landing pages, detail pages, pagination, locale variants and error paths. Record sampling limitations; never call a small sample a full crawl.
3. Walk the dependency chain: accessible response → crawl access → content rendering → indexing instructions → canonical selection → useful content → feature eligibility → observed performance.
4. Open only the needed specialist modules, normally no more than six at once. Consolidate findings across templates so one repeated defect is not counted as hundreds of independent causes.
5. Produce a prioritised backlog with evidence, mechanism, affected scope, owner, proposed change, test and rollback. Run the review skill independently before presenting a conclusion.

## Decisions and guardrails

- Missing authenticated data means an observable public-page audit, not a claimed Search Console audit. Mark private checks not assessed.
- Prioritisation is a package heuristic: reach, business importance, confidence and implementation risk. It is not a Google ranking score.
- A site-wide accidental noindex deserves incident treatment; a cosmetic metadata preference should not displace it.

## Deliverable

Use templates/audit-report.md and templates/implementation-plan.md. Include sampled URLs, evidence timestamps, unresolved questions and a sequenced backlog.

## Acceptance checks

- [ ] Every issue has evidence and a falsifiable acceptance test.
- [ ] No guaranteed ranking, indexing or revenue claim.
- [ ] No production write occurs in audit mode.

## Source anchors

- [GS-essentials — Google Search Essentials](../../references/SOURCE_INDEX.md#gs-essentials)
- [GS-how — How Search works](../../references/SOURCE_INDEX.md#gs-how)
- [GS-technical — Technical requirements](../../references/SOURCE_INDEX.md#gs-technical)
- [GS-console — Get started with Search Console](../../references/SOURCE_INDEX.md#gs-console)
- [GS-thirdparty — Advice about third-party SEO tools](../../references/SOURCE_INDEX.md#gs-thirdparty)

## Example request

Audit a 60-page B2B website from a repository and ten URL samples without claiming a complete live crawl.

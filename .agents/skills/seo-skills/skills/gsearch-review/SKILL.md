---
name: gsearch-review
description: "Use before final delivery of any audit, recommendation, generated markup, code patch or claimed completed implementation."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Independently review an SEO deliverable or patch

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Draft output; evidence ledger; changed files if any; tool logs; source registry; requested scope; acceptance criteria.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Reconstruct the task from the user request and intake, not the author’s conclusion. Check that the selected scope and source permissions were respected.
2. For every material claim, identify source guidance, observed site evidence or a clearly labeled inference. Remove conclusions stronger than the evidence.
3. Check high-risk contradictions: blocked noindex, conflicting canonical signals, stale feature eligibility, made-up structured facts and unauthorised writes.
4. Verify each claimed test against actual logs. Separate local parser checks, official feature tests, rendered browser checks and observed Search outcomes.
5. Return defects by severity, apply supported corrections and rerun affected checks. After two review cycles by default, report remaining blockers rather than claiming endless self-review ensures correctness.

## Decisions and guardrails

- Prompt instructions are not a sandbox or permission-enforcement system.
- A reviewer should be logically independent even when no second agent is available.
- Never claim an external agent evaluation or live audit that was not run.

## Deliverable

A review decision: accepted, accepted with limitations or blocked, plus corrected findings and an explicit validation log.

## Acceptance checks

- [ ] No unsupported current policy claim remains.
- [ ] All referenced files and source IDs resolve.
- [ ] Completion wording matches what was actually done.

## Source anchors

- [GS-technical — Technical requirements](../../references/SOURCE_INDEX.md#gs-technical)
- [GS-sd-policy — General structured data guidelines](../../references/SOURCE_INDEX.md#gs-sd-policy)
- [GS-updates — Documentation updates](../../references/SOURCE_INDEX.md#gs-updates)
- [GS-thirdparty — Advice about third-party SEO tools](../../references/SOURCE_INDEX.md#gs-thirdparty)

## Example request

Reject an audit that reports local JSON syntax validation as a guaranteed Google rich-result pass.

---
name: gsearch-spam-policy
description: "Use to review link acquisition, scaled publishing, third-party hosting, redirects or search-manipulation proposals for policy compliance."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Review a proposal against Search spam policies

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Actual proposed behavior; content provenance; who controls publication; link arrangements; countries; intended visitor benefit; any exact manual-action notice.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Describe the behavior neutrally before assigning a policy category. Assess what a visitor receives, not merely what the operator calls the tactic.
2. Read the current policy section and relevant regional language. Identify whether the evidence concerns scaled content abuse, link spam, cloaking, site reputation abuse or another named practice.
3. Distinguish risk indicators from a confirmed violation or actual enforcement. Third-party authorship alone is not enough to establish site reputation abuse.
4. Review redirects, navigation and generative-answer manipulation as well as visible text. A seemingly legitimate page can still implement an abusive interaction.
5. Propose a useful, transparent alternative that preserves legitimate business intent. For an existing notice, separate remediation from a reconsideration submission.

## Decisions and guardrails

- Recheck EEA-specific site-reputation treatment and the effective context; do not universalise older global language.
- Do not recommend hiding behavior from Googlebot, laundering paid links or manufacturing engagement. Redirect the task to a compliant design.

## Deliverable

Behavior → exact policy source → evidence → confidence → safer implementation. State whether this is a proposal review or a confirmed report-based incident.

## Acceptance checks

- [ ] Every policy claim points to the current exact source.
- [ ] No fabricated penalty or enforcement prediction.
- [ ] No production removal or reconsideration request without authority.

## Source anchors

- [GS-spam — Spam policies](../../references/SOURCE_INDEX.md#gs-spam)
- [GS-updates — Documentation updates](../../references/SOURCE_INDEX.md#gs-updates)
- [GS-manual — Manual actions report](../../references/SOURCE_INDEX.md#gs-manual)
- [GS-abuse — Prevent abuse on your site](../../references/SOURCE_INDEX.md#gs-abuse)

## Example request

Assess a plan to mass-publish third-party comparison pages without assuming third-party content is automatically prohibited.

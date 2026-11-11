---
name: gsearch-handoff
description: "Use when pausing, resuming or transferring an SEO task between agents, tools or sessions."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Preserve task state for another agent or session

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Current intake; sources read; observations; open issues; changes proposed or made; approvals; test results; next required evidence.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Summarise the user’s goal, scope and execution mode without carrying over unnecessary private data.
2. Record exact source IDs, access dates and source conflicts. Separate public guidance from site observations and package-specific heuristics.
3. List completed actions with evidence and pending actions with blockers. Do not convert a proposal into a completed deployment through ambiguous wording.
4. Preserve approvals narrowly: what was authorised, for which target and whether it remains applicable. A handoff does not create new permissions.
5. Provide the next smallest verifiable step and references to the required module files, rather than dumping the entire library into context.

## Decisions and guardrails

- Do not retain passwords, tokens, private user records or raw sensitive logs in a handoff.
- Stale completion claims must be revalidated after relevant changes.
- Host-enforced permissions continue to override package suggestions.

## Deliverable

Use templates/handoff.json with completed, proposed, blocked and not-assessed states kept distinct.

## Acceptance checks

- [ ] No secret or unnecessary personal data persists.
- [ ] Evidence and approvals are traceable.
- [ ] The next agent can resume without guessing what was actually done.

## Source anchors

- [GS-console — Get started with Search Console](../../references/SOURCE_INDEX.md#gs-console)
- [GS-updates — Documentation updates](../../references/SOURCE_INDEX.md#gs-updates)

## Example request

Transfer an incomplete migration review without implying the redirects were deployed.

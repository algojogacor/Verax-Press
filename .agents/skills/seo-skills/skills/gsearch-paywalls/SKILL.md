---
name: gsearch-paywalls
description: "Use for paywalled articles, subscription markup, access-state representation or Search visibility of protected publisher content."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Represent subscription content without exposing it

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Page access model; public versus subscriber sections; legitimate crawler access; actual markup; authentication design; owner authority.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Document what a visitor can access before and after authentication. Keep protected user data and editorial subscription content separate.
2. Read the current paywalled-content guide and identify the supported markup for the real restricted sections.
3. Compare visible access states and structured data so the page is not represented as wholly free when it is not.
4. Review implementation within the authorised environment. Do not bypass authentication, obtain subscriber content without access or expose secrets for testing.
5. Provide a patch plan with tests for public, subscriber and supported crawler-facing behavior, preserving the intended access boundary.

## Decisions and guardrails

- Search markup does not provide authentication or authorise paywall bypass.
- Do not diagnose legitimate paywall behavior as cloaking solely because access states differ. Evaluate the actual supported guidance.

## Deliverable

An access-state table, evidence-based markup plan and privacy-preserving verification checklist.

## Acceptance checks

- [ ] Protected content remains protected.
- [ ] Markup matches actual access conditions.
- [ ] All testing stays within authorised access.

## Source anchors

- [GS-paywall — Subscription and paywalled content](../../references/SOURCE_INDEX.md#gs-paywall)
- [GS-share — Control what you share with Google](../../references/SOURCE_INDEX.md#gs-share)
- [GS-spam — Spam policies](../../references/SOURCE_INDEX.md#gs-spam)
- [GS-sd-policy — General structured data guidelines](../../references/SOURCE_INDEX.md#gs-sd-policy)

## Example request

Review a news paywall whose markup incorrectly describes subscriber-only sections as free.

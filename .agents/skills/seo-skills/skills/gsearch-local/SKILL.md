---
name: gsearch-local
description: "Use for LocalBusiness markup, multi-location website structure or consistency of local business facts on a website."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Review local-business website representation

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Actual business name; locations; public contact details; hours; business categories; location pages; source-of-truth owner; applicable regions.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Verify the real business and location facts from supplied or authorised sources. Do not invent addresses, opening hours or geographic coverage.
2. Give each genuinely useful location page a clear purpose. Avoid mass-produced doorway pages that differ only by city name.
3. Read current LocalBusiness and Organization requirements, then map supported properties to factual evidence.
4. Review contact consistency, mobile accessibility and directions or service information useful to visitors. Evaluate reviews under their specific eligibility restrictions.
5. Separate website changes from Google Business Profile management. A public website review does not grant access or authority to edit a profile.

## Decisions and guardrails

- This pack is primarily Google Search documentation, not a complete Business Profile/Maps operations guide.
- Do not promise a local-pack position or claim schema alone verifies a business.

## Deliverable

A factual location inventory, website improvement plan and supported markup proposal with out-of-scope profile actions clearly separated.

## Acceptance checks

- [ ] No fabricated locations or reviews.
- [ ] Location pages provide independent visitor value.
- [ ] Website and Business Profile actions are not conflated.

## Source anchors

- [GS-local — Local business structured data](../../references/SOURCE_INDEX.md#gs-local)
- [GS-org — Organization structured data](../../references/SOURCE_INDEX.md#gs-org)
- [GS-review-snippet — Review snippet structured data](../../references/SOURCE_INDEX.md#gs-review-snippet)
- [GS-spam — Spam policies](../../references/SOURCE_INDEX.md#gs-spam)

## Example request

Create a factual website schema plan for three real offices without fabricating city landing pages.

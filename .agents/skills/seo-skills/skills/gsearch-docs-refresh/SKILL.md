---
name: gsearch-docs-refresh
description: "Use to update this skill pack, resolve a source conflict, verify a volatile requirement or recheck deprecated features."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Refresh the documentation evidence without silent rule changes

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Question or module affected; current source registry; change log; available browser tools; optional local refresh baseline.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Read the current documentation update page and the exact affected guide. Follow official redirects and distinguish changed URLs from changed requirements.
2. Record access date, page title, relevant section, current claim and any effective date. Do not infer that the publication date is the behavior-change date.
3. Compare against the package note and affected module. Preserve both claims when the sources genuinely conflict and identify which is more specific or newer.
4. Use scripts/refresh_sources.py only as an optional report-only link/content-change aid with explicit network permission. A byte hash change does not establish a semantic policy change.
5. Propose a reviewed update to sources, feature registry, workflows and evaluation cases. Version and validate the package before release.

## Decisions and guardrails

- No network access means this is a snapshot, not a freshly verified answer.
- First successful fetch creates a proposed baseline; it does not prove the page changed.
- The helper never overwrites skill instructions or the supplied baseline automatically.

## Deliverable

A change-impact record with old and new claims, exact sources, affected files, required tests and a proposed version increment.

## Acceptance checks

- [ ] No failed fetch becomes evidence of retirement.
- [ ] Remote hashes are not invented for pages only read in a browser.
- [ ] Changes are reviewed before altering agent policy.

## Source anchors

- [GS-updates — Documentation updates](../../references/SOURCE_INDEX.md#gs-updates)
- [GS-gallery — Structured data feature gallery](../../references/SOURCE_INDEX.md#gs-gallery)
- [GS-ai-guide — Optimizing for AI search](../../references/SOURCE_INDEX.md#gs-ai-guide)
- [GS-ai-control — Search generative AI control](../../references/SOURCE_INDEX.md#gs-ai-control)

## Example request

Resolve disagreement between an older AI appearance page and newer participation-control documentation.

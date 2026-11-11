---
name: gsearch-migration
description: "Use for domain moves, URL restructures, protocol changes or a launch that changes existing indexable URLs."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Plan and verify a URL migration

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Old and new URL inventories; intended mapping; platform changes; Search Console ownership; release plan; analytics baseline; rollback authority.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Create a URL-level mapping for important pages and representative patterns. Distinguish equivalent replacements from content intentionally retired without a replacement.
2. Inventory dependencies: redirects, canonical tags, internal links, sitemaps, hreflang, structured data and media references. Include relevant host variants.
3. Test the destination before release: public responses, intended indexing, representative content and absence of staging controls. Avoid unrelated simultaneous redesigns when practical.
4. Prepare a staged redirect and reference-update plan with approvals. Consult the current Change of Address guidance where applicable; do not assume every move qualifies.
5. Monitor old and new properties, errors, canonical selection and important landing pages after release. Retain a durable redirect plan using current guidance rather than a convenient short deadline.

## Decisions and guardrails

- Do not map unrelated removed pages to the homepage.
- A submission or redirect release does not prove a completed search migration.
- Separate what can be rolled back safely from changes that need forward repair.

## Deliverable

Use templates/migration-plan.md with mapping samples, release gates, rollback and post-launch monitoring.

## Acceptance checks

- [ ] High-value URL mappings are verified.
- [ ] New pages do not retain staging noindex or crawl blocks.
- [ ] Observed completion is separated from implementation completion.

## Source anchors

- [GS-migration — Site moves with URL changes](../../references/SOURCE_INDEX.md#gs-migration)
- [GS-canonical — Canonicalization](../../references/SOURCE_INDEX.md#gs-canonical)
- [GS-http — HTTP status codes, network and DNS errors](../../references/SOURCE_INDEX.md#gs-http)
- [GS-hreflang — Localized versions of pages](../../references/SOURCE_INDEX.md#gs-hreflang)
- [GS-updates — Documentation updates](../../references/SOURCE_INDEX.md#gs-updates)

## Example request

Move a documentation site to a new domain without dropping deep links or locale relationships.

---
name: gsearch-brand-appearance
description: "Use for site names, homepage organization identity, favicons or breadcrumb appearance."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Review site identity, favicon and breadcrumbs

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Homepage identity; preferred brand naming; hostname; favicon file and dimensions; homepage link markup; breadcrumb hierarchy; current schema.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Check whether homepage naming, visible branding and structured identity consistently represent the same site or organisation.
2. Read current site-name and favicon requirements. Keep site identity, page title and organisation data conceptually separate.
3. Verify favicon accessibility, square dimensions and an explicitly supported format. At this snapshot SVG is not in the Search guide’s listed formats; do not infer support from browser capability.
4. Review user-facing breadcrumb hierarchy and matching structured data. The hierarchy should help navigation rather than reproduce a meaningless parameter path.
5. Provide a minimal implementation patch and a post-release observation plan, acknowledging that Google chooses the displayed result.

## Decisions and guardrails

- Favicon eligibility is hostname-based, not a custom icon for every subdirectory.
- Use the current minimum and recommendation; do not repeat obsolete size folklore.
- Brand markup does not establish verification or guarantee the chosen site name.

## Deliverable

A brand-appearance checklist and precise asset/markup changes with current source references.

## Acceptance checks

- [ ] The icon format and dimensions were actually inspected or marked unknown.
- [ ] Homepage identity remains truthful and consistent.
- [ ] No guaranteed display claim.

## Source anchors

- [GS-sitename — Site names](../../references/SOURCE_INDEX.md#gs-sitename)
- [GS-favicon — Favicon in search results](../../references/SOURCE_INDEX.md#gs-favicon)
- [GS-org — Organization structured data](../../references/SOURCE_INDEX.md#gs-org)
- [GS-breadcrumb — Breadcrumb structured data](../../references/SOURCE_INDEX.md#gs-breadcrumb)
- [GS-updates — Documentation updates](../../references/SOURCE_INDEX.md#gs-updates)

## Example request

Review a Search favicon implementation that uses an unsupported assumed format.

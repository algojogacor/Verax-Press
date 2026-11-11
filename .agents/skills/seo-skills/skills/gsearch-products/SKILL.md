---
name: gsearch-products
description: "Use for product snippets, merchant listings, ProductGroup variants, offers, prices, availability or product-review markup."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Model product, offer and variant information

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Product detail pages; seller role; identifiers; real offers; currency; availability; variant relationships; canonical URLs; feed source; reviews and provenance.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Determine whether the page is a purchasable offer, editorial review, catalogue entry or category page. Select the appropriate supported feature rather than adding all product-related types.
2. Read current Product, merchant-listing and variant requirements as needed. Required-field sets and sale-price properties must be checked live, not generated from an old template.
3. Map visible offer facts to markup and any Merchant Center feed. Resolve disagreements in price, currency, availability, shipping or return facts before release.
4. Represent real variant dimensions and stable relationships. Ensure the URL and visible selected variant match the described offer.
5. Validate syntax, feature eligibility and representative variant combinations, then monitor reports and commercial-data freshness after release.

## Decisions and guardrails

- Do not invent GTINs, aggregate ratings, prices or expiry dates.
- Merchant Center feed acceptance and on-page rich-result eligibility are separate.
- Self-serving or otherwise ineligible reviews cannot be made eligible merely by changing JSON-LD.

## Deliverable

A product/offer/variant data contract, property evidence map, candidate markup and cross-channel consistency tests.

## Acceptance checks

- [ ] All commercial facts match their source of truth.
- [ ] Current feature fields are verified.
- [ ] No unsupported guarantee of shopping appearance or stars.

## Source anchors

- [GS-product — Product structured data](../../references/SOURCE_INDEX.md#gs-product)
- [GS-merchant — Merchant listing structured data](../../references/SOURCE_INDEX.md#gs-merchant)
- [GS-variants — Product variant structured data](../../references/SOURCE_INDEX.md#gs-variants)
- [GS-review-snippet — Review snippet structured data](../../references/SOURCE_INDEX.md#gs-review-snippet)
- [GS-updates — Documentation updates](../../references/SOURCE_INDEX.md#gs-updates)

## Example request

Repair a ProductGroup implementation whose selected variant price differs from visible page content.

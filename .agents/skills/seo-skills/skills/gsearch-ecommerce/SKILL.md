---
name: gsearch-ecommerce
description: "Use for category/product architecture, catalogue launch readiness, inventory discoverability or a broad ecommerce SEO plan."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Design an ecommerce discovery and launch plan

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Catalogue model; categories; product lifecycle; inventory source; navigation; launch approach; region; merchant integrations; change authority.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Map the shopper journey from entry points to category and product pages. Verify that important products do not depend solely on internal search forms for discovery.
2. Define URL, facet, pagination and product-lifecycle policies. Handle unavailable and discontinued items according to their actual continuing value and replacement options.
3. Align page data, structured data, feeds and sitemaps. Separate each channel’s validation rather than assuming success in one proves all others.
4. Choose a launch strategy with explicit public-access and indexing gates. Test that production does not inherit staging restrictions or incomplete commercial claims.
5. Build operational monitoring for inventory, broken pages, canonical drift and stale offer information. Tie SEO actions to qualified shopper outcomes where measurement exists.

## Decisions and guardrails

- A catalogue expansion is not automatically useful if it only creates duplicate combinations.
- No live submission, feed update or site launch without authority.
- Indexing API is not a bulk-product-indexing tool.

## Deliverable

An ecommerce launch and operating plan with architecture decisions, data dependencies, release gates and owners.

## Acceptance checks

- [ ] Important products have crawlable discovery paths.
- [ ] Inventory and offer facts are consistent.
- [ ] Launch completion is not represented as indexing completion.

## Source anchors

- [GS-ecommerce — Ecommerce best practices](../../references/SOURCE_INDEX.md#gs-ecommerce)
- [GS-launch — Launch an ecommerce website](../../references/SOURCE_INDEX.md#gs-launch)
- [GS-pagination — Pagination and incremental loading](../../references/SOURCE_INDEX.md#gs-pagination)
- [GS-product — Product structured data](../../references/SOURCE_INDEX.md#gs-product)
- [GS-sitemap — Build and submit a sitemap](../../references/SOURCE_INDEX.md#gs-sitemap)
- [GS-indexing-api — Using the Indexing API](../../references/SOURCE_INDEX.md#gs-indexing-api)

## Example request

Prepare a shop launch with category discovery, truthful offers and explicit release gates.

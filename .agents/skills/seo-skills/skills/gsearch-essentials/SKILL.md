---
name: gsearch-essentials
description: "Use when a user asks how Google Search works, why a website is not eligible or what the minimum technical requirements are."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Explain and check Search eligibility

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Target URL or content description; desired Search surface; observed response; crawl and indexing instructions where available.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Explain discovery, crawling, indexing and serving as separate stages, with one observed fact or unknown for each.
2. Check whether Google can access the public content, whether the response is appropriate and whether indexable information is available. Do not treat a browser screenshot as proof of the crawler response.
3. Separate eligibility requirements from recommended practices and optional enhancements. Label which type each proposed change belongs to.
4. Test the earliest failing stage first. For example, repairing a broken public response precedes writing longer meta descriptions.
5. Return a stage-by-stage diagnosis or a bounded verification plan when direct evidence is missing.

## Decisions and guardrails

- A 200 response does not prove indexing. A sitemap entry does not prove crawling. Indexing does not guarantee ranking for a chosen query.
- Use current live documentation for a disputed requirement rather than a remembered SEO rule.

## Deliverable

A compact dependency map with observed state, evidence, next test and a clear distinction between required and optional actions.

## Acceptance checks

- [ ] Each conclusion identifies the Search stage it concerns.
- [ ] Unknowns are not silently marked as passed.
- [ ] Advice does not contradict the spam policy.

## Source anchors

- [GS-how — How Search works](../../references/SOURCE_INDEX.md#gs-how)
- [GS-technical — Technical requirements](../../references/SOURCE_INDEX.md#gs-technical)
- [GS-essentials — Google Search Essentials](../../references/SOURCE_INDEX.md#gs-essentials)
- [GS-starter — SEO Starter Guide](../../references/SOURCE_INDEX.md#gs-starter)

## Example request

Explain why a URL can appear in a sitemap while remaining unindexed.

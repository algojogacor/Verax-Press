---
name: gsearch-removal
description: "Use when removing a page from Search, hiding sensitive information, handling stale results or assessing a temporary removal request."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Choose durable removal and privacy controls

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Exact URLs and variants; ownership; desired duration; whether content is private, deleted or simply not for Search; current public response; action authority.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Separate the privacy problem from the search-display problem. If access must stop, propose authentication or removal of the content itself.
2. Identify durable state: deleted response, restricted access or crawlable noindex for content that remains publicly available but should not be indexed.
3. Evaluate whether an authorised temporary Search Console removal is useful while durable changes are processed. Explain that temporary suppression is not permanent deletion.
4. Check alternate URLs, copies under the same owner, cached application routes and media endpoints within the authorised scope.
5. Prepare the change plan and verification steps. Execute a removal or access-control change only under explicit authority and preserve a record of exactly what changed.

## Decisions and guardrails

- Robots.txt cannot make a document private and can prevent retrieval of noindex.
- Never promise instantaneous disappearance from every Search surface or from third-party copies.
- Do not assume authority over another person’s property.

## Deliverable

A removal decision record with desired outcome, durable control, optional temporary step, affected variants and follow-up evidence.

## Acceptance checks

- [ ] Privacy is handled by access control rather than search metadata.
- [ ] Temporary and durable effects are distinguished.
- [ ] No removal submission is falsely reported as performed.

## Source anchors

- [GS-removal — Remove information from Google](../../references/SOURCE_INDEX.md#gs-removal)
- [GS-share — Control what you share with Google](../../references/SOURCE_INDEX.md#gs-share)
- [GS-noindex — Block indexing with noindex](../../references/SOURCE_INDEX.md#gs-noindex)
- [GS-robots-intro — Introduction to robots.txt](../../references/SOURCE_INDEX.md#gs-robots-intro)

## Example request

Handle an accidentally public document without relying on robots.txt to protect its contents.

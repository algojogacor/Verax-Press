---
name: gsearch-http-redirects
description: "Use for HTTP errors, redirect chains, soft 404s, intermittent server failures or technical response-policy design."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Diagnose responses, redirects and soft 404s

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Raw response status and headers; full redirect chain; final content; affected URL classes; timestamps; server logs if authorised.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Trace representative requests through every hop and preserve methods, status codes and destinations. A final screenshot can hide an earlier incorrect redirect.
2. Classify the result: useful content, intended move, genuinely removed resource, temporary failure or unexpected error content served as success.
3. Choose a response based on meaning. Permanently moved content needs a relevant new destination; genuinely absent content should not masquerade as a normal page.
4. Investigate loops, excessive chains, incorrect destinations and unstable responses. For outages, correlate logs and deployment history before assigning cause.
5. Prepare explicit response-policy tests and verify both server behavior and visible destination content after an authorised change.

## Decisions and guardrails

- Do not route every removed product or old article to the homepage.
- A 200 status alone is not proof that content is useful or indexable.
- The old Search HTTP troubleshooting URL redirects into the separate Google crawling documentation.

## Deliverable

A request-chain trace and response-policy table, followed by a minimal fix and regression tests.

## Acceptance checks

- [ ] The final destination matches user intent.
- [ ] Errors remain distinguishable from valid pages.
- [ ] No untested redirect deployment is reported as complete.

## Source anchors

- [GS-http — HTTP status codes, network and DNS errors](../../references/SOURCE_INDEX.md#gs-http)
- [GS-migration — Site moves with URL changes](../../references/SOURCE_INDEX.md#gs-migration)
- [GS-technical — Technical requirements](../../references/SOURCE_INDEX.md#gs-technical)
- [GS-canonical — Canonicalization](../../references/SOURCE_INDEX.md#gs-canonical)

## Example request

Find a product page returning 200 with only a not-found message.

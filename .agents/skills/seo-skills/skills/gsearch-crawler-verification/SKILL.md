---
name: gsearch-crawler-verification
description: "Use when interpreting server logs attributed to Google crawlers or assessing whether a user-agent string is trustworthy."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Verify crawler identity in supplied logs

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Authorised log sample; source IP; timestamp; claimed user agent; DNS or official IP-list evidence; privacy constraints.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Remove unnecessary visitor identifiers and secrets before analysis. Keep only fields required to evaluate the requests.
2. Treat the user-agent claim as unverified. Use the current official method for the relevant crawler or fetcher class, not one assumed rule for every Google service.
3. For DNS verification, preserve reverse lookup and forward-confirmation results. A plausible reverse hostname alone is insufficient.
4. For IP-list matching, record the exact official list, retrieval time and matching address range. Account for IPv4 and IPv6 rather than silently ignoring one.
5. Label requests verified, inconsistent or unresolved. Feed only appropriately qualified counts into crawl-budget or incident analysis.

## Decisions and guardrails

- This is defensive verification of supplied logs, not reconnaissance or a scanning task.
- Do not recommend bypassing authentication or granting unrestricted trust merely because a request is a crawler.
- Historical requests may not be conclusively verifiable from current network data alone.

## Deliverable

A redacted request-class table with verification method, supporting evidence, timestamp and uncertainty.

## Acceptance checks

- [ ] User-agent alone never establishes identity.
- [ ] Missing DNS or list evidence is unresolved, not passed.
- [ ] No unnecessary private log data appears in the deliverable.

## Source anchors

- [GS-verifybot — Verifying Google crawler requests](../../references/SOURCE_INDEX.md#gs-verifybot)
- [GS-budget — Managing crawl budget](../../references/SOURCE_INDEX.md#gs-budget)
- [GS-console — Get started with Search Console](../../references/SOURCE_INDEX.md#gs-console)

## Example request

Verify whether a batch of apparent Googlebot requests can support a crawl analysis.

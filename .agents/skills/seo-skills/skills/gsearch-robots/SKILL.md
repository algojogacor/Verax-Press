---
name: gsearch-robots
description: "Use to inspect robots.txt, diagnose crawl blocking or propose crawl-access rules; not to remove confidential content from public access."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Review robots.txt safely

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Exact scheme, host and port; robots.txt response; target crawler; affected paths; required index-removal behavior; owner approval for changes.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Confirm the robots file belongs to the exact origin being analysed. Keep subdomains, protocols and ports separate.
2. Inspect response status, file location, syntax and applicable user-agent groups using the current Google specification. A local generic parser is not proof of Google’s exact interpretation.
3. Test representative allowed and blocked paths, wildcard edges and important resources. Record the expected result and the test mechanism.
4. Check conflicts with indexing intentions. A blocked page may remain listed, and a blocked crawler may not see noindex or canonical information.
5. Prepare a minimal patch, before/after test matrix and rollback. A broad Disallow on a public site requires explicit approval before deployment.

## Decisions and guardrails

- Do not put noindex or crawl-delay into robots.txt as a supported Google directive.
- Robots.txt is public guidance to crawlers, not authentication or a security boundary.
- No supplied script in this pack claims to fully emulate Google’s robots parser.

## Deliverable

A proposed robots diff and origin-specific path test matrix with expected crawl outcomes and indexation caveats.

## Acceptance checks

- [ ] Critical pages and resources are deliberately handled.
- [ ] No unsupported directive is sold as effective.
- [ ] A production robots change has an owner, approval and rollback.

## Source anchors

- [GS-robots-intro — Introduction to robots.txt](../../references/SOURCE_INDEX.md#gs-robots-intro)
- [GS-robots-spec — How Google interprets robots.txt](../../references/SOURCE_INDEX.md#gs-robots-spec)
- [GS-noindex — Block indexing with noindex](../../references/SOURCE_INDEX.md#gs-noindex)
- [GS-share — Control what you share with Google](../../references/SOURCE_INDEX.md#gs-share)

## Example request

Explain why a blocked URL still appears in Search and propose the correct durable control.

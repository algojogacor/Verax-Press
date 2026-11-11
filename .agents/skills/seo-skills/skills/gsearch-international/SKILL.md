---
name: gsearch-international
description: "Use for hreflang, multi-language sites, regional URLs, language redirects or conflicting locale canonicalization."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Design language and regional alternates

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Language/region inventory; equivalent pages; canonical policy; locale URLs; translation status; redirect behavior; intended markets.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Map equivalent content across languages and regions. Separate translated equivalents from pages that serve a different task.
2. Choose stable accessible URLs for each intended version. Inspect forced location or browser-language redirects that may prevent access to alternatives.
3. Build consistent hreflang clusters with self and reciprocal references using supported language/region codes. Use x-default only when its intended fallback role fits.
4. Align canonicals with the actual duplicate relationships, usually preserving legitimate language versions rather than collapsing everything into one language.
5. Test representative clusters, including missing translations, region-only differences and retired locales. Record partial coverage rather than claiming site-wide correctness from one page.

## Decisions and guardrails

- Hreflang is not a substitute for translated content.
- Do not infer languages solely from URL folder names.
- Regional Search features require a separate current eligibility check.

## Deliverable

A locale relationship matrix, canonical/hreflang implementation plan and reciprocal-reference test cases.

## Acceptance checks

- [ ] Language and region values are validated.
- [ ] Every intended alternate is accessible and meaningful.
- [ ] Canonical and alternate signals do not contradict the design.

## Source anchors

- [GS-hreflang — Localized versions of pages](../../references/SOURCE_INDEX.md#gs-hreflang)
- [GS-international — Managing multi-regional sites](../../references/SOURCE_INDEX.md#gs-international)
- [GS-canonical — Canonicalization](../../references/SOURCE_INDEX.md#gs-canonical)
- [GS-regional — Regionally available features](../../references/SOURCE_INDEX.md#gs-regional)

## Example request

Repair English and Hindi pages that incorrectly canonicalize every language version to English.

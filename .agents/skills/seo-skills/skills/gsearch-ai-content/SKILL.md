---
name: gsearch-ai-content
description: "Use when generating or reviewing AI-assisted text, images, metadata or large content batches for a website."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Govern AI-assisted content production

Read the [root execution contract](../../SKILL.md) and [source policy](../../protocols/SOURCE_POLICY.md). This module is a task library inside the complete pack, not a self-contained export.

## Required inputs

Content purpose; source material; generation process; review owner; planned volume; image provenance; publishing destination, including whether Merchant Center is involved.

Missing optional evidence narrows the scope. Missing evidence essential to a conclusion blocks that conclusion, not all useful work.

## Workflow

1. Determine where generation is useful: research organisation, drafting, transformation or structured extraction. Keep factual verification separate from fluent generation.
2. Require evidence for factual claims, prices, comparisons, citations and first-hand experience. Remove invented sources, testimonials and product capabilities.
3. Review the batch for repeated low-value pages, shallow variation and redundant intent. Use a stratified sample plus checks for systemic failures, and disclose the sample size.
4. Check metadata and media as carefully as body text. For AI-generated assets used in Merchant Center, retrieve the current destination-specific labeling requirements before exporting.
5. Define a human or accountable editorial release gate, correction path and rollback. Measure quality and reader utility rather than production volume alone.

## Decisions and guardrails

- AI use itself is not the policy violation; scaled output without meaningful value can be.
- Do not apply Merchant Center-specific image or text labeling rules as an invented universal requirement for every web page.

## Deliverable

A generation-and-review protocol with source fields, factual checks, batch sampling, labeling obligations by destination and release criteria.

## Acceptance checks

- [ ] No unverified synthetic facts are presented as observations.
- [ ] Batch publication is not automatically approved.
- [ ] The process checks value, not merely grammar or plagiarism scores.

## Source anchors

- [GS-gen-content — Guidance on using generative AI content](../../references/SOURCE_INDEX.md#gs-gen-content)
- [GS-helpful — Creating helpful, reliable, people-first content](../../references/SOURCE_INDEX.md#gs-helpful)
- [GS-spam — Spam policies](../../references/SOURCE_INDEX.md#gs-spam)
- [GS-ai-guide — Optimizing for AI search](../../references/SOURCE_INDEX.md#gs-ai-guide)

## Example request

Review 200 generated product descriptions for unsupported features and thin differentiation.

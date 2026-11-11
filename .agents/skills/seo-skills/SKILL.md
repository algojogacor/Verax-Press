---
name: gsearch-agent-pack
description: "Use for Google Search SEO audits, content and technical implementation plans, Search Console analysis, AI search visibility, structured data, migrations, troubleshooting, or teaching from official Google documentation. Routes to 44 focused modules with evidence and verification gates."
license: "MIT for original package material; linked official sources retain their own terms. See ATTRIBUTION.md."
compatibility: "Works with agents that can read Markdown files. Optional tools require Python 3.10+. Browser and account access are provided by the host, not this pack."
metadata:
  version: "1.0.0"
  source-snapshot: "2026-09-11"
---

# Google Search Agent Pack

Convert a user goal into a source-backed, testable Search workflow. This is an independently authored operational synthesis of official documentation, not a Google product or an offline mirror of every page.

## 1. Intake and authority

Identify the goal, target URLs/repository, countries, languages, content type, available evidence, desired output and execution mode. Default to **read-only**. Follow [execution modes](protocols/EXECUTION_MODES.md) and [permissions](protocols/SAFETY_AND_PERMISSIONS.md).

A public URL does not confer access to Search Console or permission to edit a site. Missing information should narrow the deliverable when useful work remains possible; never manufacture access, observations or outcomes. Request clarification only when needed to resolve a consequential ambiguity.

## 2. Route and load progressively

Use [the skill registry](skills/INDEX.md), `manifest.json` or the optional local router:

```bash
python scripts/route.py "diagnose a JavaScript page with conflicting canonicals"
```

The router is a deterministic suggestion tool, not an intelligent planner or an authorisation layer. Load the relevant specialist `SKILL.md` and its source anchors. Default context guidance is **at most six specialist modules at once**; finish one dependency stage before loading another batch. The host must enforce actual context and execution limits.

| Task | Start with |
|---|---|
| Broad audit or launch | `gsearch-audit`; then the blocking specialist |
| Crawl/index/render | `gsearch-essentials`, `gsearch-robots`, `gsearch-index-controls`, `gsearch-javascript` |
| Architecture or migration | `gsearch-url-architecture`, `gsearch-canonicals`, `gsearch-migration` |
| Content and AI | `gsearch-content-quality`, `gsearch-content-brief`, `gsearch-ai-content`, `gsearch-ai-visibility` |
| Rich results or commerce | `gsearch-structured-data`, `gsearch-feature-resolver`, `gsearch-products` |
| Reports or traffic changes | `gsearch-search-console`, `gsearch-traffic-drop`, `gsearch-ranking-updates` |
| Review, update or teaching | `gsearch-review`, `gsearch-docs-refresh`, `gsearch-tutor`, `gsearch-handoff` |

## 3. Ground the work

Read [source policy](protocols/SOURCE_POLICY.md), then only the relevant entries in [source registry](references/SOURCE_INDEX.md). Distinguish **official guidance**, **site observations**, **inferences**, **package design**, **illustrations** and **unknowns**. Capture exact source URLs and access dates in the deliverable.

Recheck volatile requirements before implementation using [freshness policy](protocols/FRESHNESS.md). The snapshot includes important 2026 changes; do not replace it with remembered older advice. In particular, read [current changes and source conflicts](references/CURRENT_CHANGES_2026.md) for FAQ retirement, AI participation/reporting, favicon formats and regional exceptions.

## 4. Execute the mechanism, not a checklist ritual

Work through the relevant dependencies:

**Reachability → crawl access → rendered information → index controls → canonical signals → useful content → feature eligibility → observed outcomes.**

A successful HTTP response, a sitemap submission, valid JSON and actual Search display are not interchangeable completion states. For every proposed issue, explain the observed evidence, mechanism, affected scope, recommended change, confidence and test.

Use local utilities only for their declared scope. They do not render JavaScript, authenticate to Google, emulate all Google parsers, execute a live crawl or establish rich-result eligibility.

## 5. Verify independently

Run [the review checklist](references/REVIEW_CHECKLIST.md) and the `gsearch-review` module. Separate local structural tests, actual browser tests, official feature checks and Search observations. Never claim a test was run merely because it appears in the proposed plan.

Default to two review cycles. If unresolved blockers remain, deliver the verified work and name the blocker. No finite self-review or test suite proves that all future outputs will be correct.

## 6. Deliver and preserve state

Use [output contracts](protocols/OUTPUT_TEMPLATES.md). Include scope, dated evidence, prioritised actions, acceptance tests and limitations. Show actual changes separately from proposals. Do not guarantee indexing, rankings, rich results, AI citations or business results.

When pausing, use [handoff](protocols/HANDOFF.md) and `templates/handoff.json`. Keep secrets and unnecessary personal data out of outputs.

## Completion gate

The user’s goal is addressed; the evidence supports the conclusions; current requirements were checked where material; permitted actions and claimed actions match; validation results are honest; remaining uncertainty is explicit.

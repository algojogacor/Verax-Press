# Worked example: blocked URL with noindex

**Fictional scenario.** The site owner wants a public legacy guide to remain readable but no longer appear in Search. Supplied server files show `Disallow: /legacy/` and a robots meta of `noindex` on the guide. No live Google processing was observed.

## Route

Use `gsearch-removal`, `gsearch-robots`, `gsearch-index-controls`, then `gsearch-review`.

## Evidence and mechanism

E1: the supplied robots file blocks retrieval of the legacy path. E2: the supplied HTML contains noindex. Both are file observations, not proof of current deployment. Official guidance in GS-noindex and GS-robots-intro explains why a crawler prevented from fetching the page may not see noindex. The two settings therefore do not jointly establish the desired removal.

## Proposed resolution

For publicly readable but unindexed content, propose allowing the relevant crawl so noindex can be retrieved. First confirm that no sensitive content requires access control. If access must stop, use authentication or removal instead. An authorised temporary Search Console removal may be a separate interim step, not the durable solution.

## Acceptance

Verify the live robots behavior and response directives after approval; confirm the intended public access state; then monitor actual processing. The local files alone cannot prove deindexing. No change or submission has been performed in this example.

Sources: [GS-noindex](../references/SOURCE_INDEX.md#gs-noindex), [GS-robots-intro](../references/SOURCE_INDEX.md#gs-robots-intro), [GS-removal](../references/SOURCE_INDEX.md#gs-removal).

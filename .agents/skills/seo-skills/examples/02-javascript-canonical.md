# Worked example: an initial response contradicts the rendered page

**Fictional scenario.** A supplied initial HTML snapshot contains noindex and canonical A. A separately supplied browser DOM export contains no noindex and canonical B. The user asks whether adding more JavaScript will fix Search.

## Route and conclusion

Load `gsearch-javascript`, `gsearch-index-controls`, `gsearch-canonicals`. The evidence supports a conflicting implementation, not a conclusion about actual Google indexing.

Initial noindex can prevent rendering, so relying on JavaScript to remove it is not a robust fix. Align the initial response with intended indexing. Decide which URL is genuinely the representative before changing canonical values; remove contradictory signals rather than guessing that B must be right.

## Proposed tests

Compare initial response and an actual rendered DOM after the approved patch. Verify raw headers, direct route behavior, meaningful content and important links. Check the intended canonical target’s own access and indexing state. Use authorised crawler inspection to examine Search behavior when available.

The bundled static HTML inspector can show tags in a supplied snapshot. It cannot run the browser or say what Google selected. Those tests remain separate.

Sources: [GS-js](../references/SOURCE_INDEX.md#gs-js), [GS-canonical](../references/SOURCE_INDEX.md#gs-canonical).

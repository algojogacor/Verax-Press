# Worked example: product markup with missing facts

**Fictional scenario.** A real implementation task would supply evidence; here the fictional page shows a blue widget at INR 499 and says it is available. The inventory export says INR 549. No GTIN, ratings or review evidence exists.

## Correct agent behavior

Use `gsearch-products` and `gsearch-structured-data`. Select the current applicable feature guide based on the actual commercial page. The price conflict blocks a confident release: do not choose one number merely because it is more plausible. Resolve the source-of-truth conflict with the owner and update page/feed/markup consistently.

Do not invent GTINs or aggregateRating. Missing optional facts can remain absent. If a required fact for the intended feature is missing, disclose the blocker rather than manufacturing a property value. A valid JSON string would not resolve factual inconsistency or prove rich-result eligibility.

## Acceptance

The selected offer is consistent with visible page data and the authorised commercial source; required current fields are present and evidenced; syntax checks and official feature validation are recorded separately. Production deployment remains an authorised action.

Sources: [GS-product](../references/SOURCE_INDEX.md#gs-product), [GS-merchant](../references/SOURCE_INDEX.md#gs-merchant), [GS-sd-policy](../references/SOURCE_INDEX.md#gs-sd-policy).

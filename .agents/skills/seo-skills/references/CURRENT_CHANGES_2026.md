# Current changes and deliberately unresolved details

Reviewed snapshot: **2026-09-11**. This is not a live changelog. Verify the exact affected source before implementation.

| Area | Snapshot finding | Agent implication | Source |
|---|---|---|---|
| FAQ rich results | No longer shown starting May 7, 2026; documentation subsequently removed | Do not repeat older government/health exceptions or relabel FAQs as QAPage | GS-updates, GS-gallery, GS-qa |
| AI optimization | Newer guide emphasises useful original content and ordinary SEO; Google Search does not use LLMS.txt | No special AI schema, Markdown or LLMS.txt ranking requirement | GS-ai-guide |
| Search AI participation | Current control help describes include/exclude settings and property inheritance | Check the actual setting with authority; do not state there are no participation controls | GS-ai-control |
| AI reporting | Current control help links to a Generative AI performance report | Do not state that only an aggregate Web report can exist; detailed dimensions/API were not independently verified | GS-ai-control |
| Favicon formats | August 2026 clarification explicitly lists formats | Check the actual list; do not infer SVG support from browsers | GS-favicon, GS-updates |
| Site reputation abuse | August 2026 updates include EEA-specific treatment | Read the current regional policy before a global conclusion | GS-spam, GS-updates |
| Regional experiences | September 2026 guidance describes location-specific features | Verify country and provider-type eligibility | GS-regional, GS-updates |
| Product sale metadata | July 2026 documentation includes additions/clarifications | Read the current merchant/property table, not a frozen schema snippet | GS-merchant, GS-updates |
| AMP serving | July 2026 guidance changed legacy serving explanations | Do not impose old cache/viewer assumptions automatically | GS-amp, GS-updates |
| Initial JS noindex | Initial noindex can prevent rendering | Do not rely on JavaScript removing it | GS-js |
| Robots meta placement | Current guidance clarifies handling outside head | Prefer valid head placement, but do not say outside-head meta is necessarily ignored | GS-robots-meta, GS-updates |
| Dataset | Dataset markup relates to Dataset Search | Do not promise a web Search rich result | GS-gallery, GS-updates |

## Source conflict protocol: AI example

An older broad AI appearance explanation and newer specific control documentation can describe different levels of the system. Record both and separate ordinary technical markup requirements from a property participation setting. The current control page’s report link is evidence that the report is referenced, not evidence of its exact dimensions or API support.

The report destination was not successfully retrieved during this build. The detailed URL Inspection help page also failed retrieval and is explicitly marked `not_retrieved` in the source registry. These are bounded gaps, not permission to invent current behavior.

## Freshness mechanics

Consult [the source registry](SOURCE_INDEX.md) for official URLs. Change dates here are observations from the documentation updates, not inferred dates for unrelated ranking systems. Feature support may change again; use the feature resolver before producing consequential markup.

# Mechanism-first glossary

**Discovery:** learning that a URL exists. Not proof that it was crawled.

**Crawling:** retrieving content and resources. Not proof of indexing.

**Rendering:** processing a page to obtain its presented content, including relevant JavaScript behavior. Saved HTML alone is not a rendered DOM.

**Indexing:** processing and potentially storing information for Search. Indexing does not guarantee display for a query.

**Canonical:** the representative URL for duplicate or closely equivalent content. A declared canonical is a signal; the selected canonical is an observed Search state only when evidence supports it.

**Robots.txt:** origin-scoped crawler-access guidance. Not authentication and not a reliable removal control.

**Noindex:** an instruction concerning indexing, which a crawler needs to retrieve to process. Not access control.

**Preview control:** a directive governing eligible snippets or media previews, distinct from whether a resource can be fetched.

**Structured data:** machine-readable facts about content/entities. Valid vocabulary or JSON does not automatically satisfy a Google feature’s content and eligibility policies.

**Rich result:** an enhanced Search appearance whose display is not guaranteed by valid markup.

**Field data:** observations from real user experiences. **Lab data:** measurements under a specified test setup. Neither should be silently substituted for the other.

**Manual action:** an action evidenced by the relevant authorised report, not a label inferred from a traffic graph.

**Hypothesis:** an explanation to test, not a conclusion established by correlation.

**Not assessed:** evidence or a test is missing. Different from failed, passed, not applicable or blocked.

**Package heuristic:** an operational choice made by this library—such as a review budget or priority label—not a Google requirement or score.

Source context: GS-how, GS-technical, GS-canonical, GS-robots-intro, GS-noindex, GS-sd-policy, GS-cwv and GS-manual in the [registry](SOURCE_INDEX.md).

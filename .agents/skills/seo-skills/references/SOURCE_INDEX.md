# Official source registry

Snapshot: **2026-09-11**. `reviewed` means relevant guidance was read, not a full property-by-property audit. `not_retrieved` is not supporting evidence. Remote-page hashes are intentionally null: no raw HTML baseline is bundled.

Google Search documentation is living guidance; recheck volatile requirements before implementation. See [freshness policy](../protocols/FRESHNESS.md).

<a id="gs-home"></a>
## GS-home — Google Search documentation
- Official source: https://developers.google.com/search/docs?hl=en
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Entry point for the documentation, not a promise that every descendant page has been reproduced.

<a id="gs-essentials"></a>
## GS-essentials — Google Search Essentials
- Official source: https://developers.google.com/search/docs/essentials
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Meeting the essentials establishes eligibility, not guaranteed crawling, indexing, ranking, or display.

<a id="gs-technical"></a>
## GS-technical — Technical requirements
- Official source: https://developers.google.com/search/docs/essentials/technical
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Publicly reachable content, a successful response and indexable content are distinct from actual indexing. A robots block is not a noindex instruction.

<a id="gs-spam"></a>
## GS-spam — Spam policies
- Official source: https://developers.google.com/search/docs/essentials/spam-policies
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Review intent and execution, including scaled content abuse, link spam, cloaking and site reputation abuse. Third-party content is not automatically abuse. Recheck the current regional treatment, especially the EEA.

<a id="gs-starter"></a>
## GS-starter — SEO Starter Guide
- Official source: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Use useful content, understandable organization and accessible pages rather than speculative ranking formulas.

<a id="gs-how"></a>
## GS-how — How Search works
- Official source: https://developers.google.com/search/docs/fundamentals/how-search-works
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Discovery, crawling, indexing and serving are different stages. Diagnose the failed stage before prescribing a fix.

<a id="gs-helpful"></a>
## GS-helpful — Creating helpful, reliable, people-first content
- Official source: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Assess original value, reliability, authorship and audience satisfaction. Do not invent a numerical E-E-A-T score or universal word-count requirement.

<a id="gs-gen-content"></a>
## GS-gen-content — Guidance on using generative AI content
- Official source: https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: AI-assisted production is not automatically prohibited; accuracy and added value matter. Scaled production without value can violate spam policies. Merchant Center AI-label requirements are a separate implementation concern.

<a id="gs-ai-guide"></a>
## GS-ai-guide — Optimizing for AI search
- Official source: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: The current guide emphasizes original useful content and ordinary SEO rather than special AI markup. Google Search does not use LLMS.txt; the guide also references Search generative AI participation controls.

<a id="gs-ai-features"></a>
## GS-ai-features — AI features and your website
- Official source: https://developers.google.com/search/docs/appearance/ai-features
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Indexability and snippet eligibility matter for supporting links in AI search. Reconcile older reporting or participation wording with the newer guide and current Search Console documentation.

<a id="gs-thirdparty"></a>
## GS-thirdparty — Advice about third-party SEO tools
- Official source: https://developers.google.com/search/docs/fundamentals/third-party-seo
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: A third-party score, audit label or recommendation is not automatically a Google requirement.

<a id="gs-updates"></a>
## GS-updates — Documentation updates
- Official source: https://developers.google.com/search/updates
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Use dated entries to identify additions, removals and changed eligibility. A documentation update date is not necessarily the date a Search behavior changed.

<a id="gs-reviews"></a>
## GS-reviews — Write high-quality reviews
- Official source: https://developers.google.com/search/docs/specialty/ecommerce/write-high-quality-reviews
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Demonstrate substantive evaluation, evidence and meaningful comparisons; do not manufacture testing or personal experience.

<a id="gs-ai-control"></a>
## GS-ai-control — Search generative AI control
- Official source: https://support.google.com/webmasters/answer/16908024
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: The current help page describes participation controls, property inheritance and a Generative AI performance report link. Detailed report dimensions and API availability were not independently reviewed. Controls for Search participation and model training are different.

<a id="gs-robots-intro"></a>
## GS-robots-intro — Introduction to robots.txt
- Official source: https://developers.google.com/search/docs/crawling-indexing/robots/intro
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Robots.txt controls crawler access, not confidentiality and not reliable removal of indexed URLs.

<a id="gs-robots-spec"></a>
## GS-robots-spec — How Google interprets robots.txt
- Official source: https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Rules are scoped to protocol, hostname and port. Google does not support noindex or crawl-delay as robots.txt directives. Match behavior needs a real parser or authoritative tests.

<a id="gs-robots-meta"></a>
## GS-robots-meta — Robots meta tags and HTTP headers
- Official source: https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Distinguish indexing and preview controls from crawl access. Google must be able to retrieve an instruction to process it. Prefer valid document structure; do not assume a robots meta outside head is ignored.

<a id="gs-noindex"></a>
## GS-noindex — Block indexing with noindex
- Official source: https://developers.google.com/search/docs/crawling-indexing/block-indexing
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: A crawlable noindex response can prevent indexing. Blocking retrieval can prevent Google from seeing noindex.

<a id="gs-sitemap"></a>
## GS-sitemap — Build and submit a sitemap
- Official source: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Sitemaps aid discovery rather than guarantee indexing. Use absolute canonical URLs and truthful last-modification times; limits are 50,000 URLs and 50 MB uncompressed per sitemap.

<a id="gs-canonical"></a>
## GS-canonical — Canonicalization
- Official source: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Canonical annotations are signals, not absolute commands. Align internal links, redirects and sitemap choices; preserve genuinely distinct pages.

<a id="gs-migration"></a>
## GS-migration — Site moves with URL changes
- Official source: https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Map old URLs to relevant equivalents, redirect deliberately, update references and monitor both properties. Avoid redirecting unrelated retired pages to the homepage.

<a id="gs-http"></a>
## GS-http — HTTP status codes, network and DNS errors
- Official source: https://developers.google.com/crawling/docs/troubleshooting/http-status-codes
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Distinguish successful pages, redirects, not-found responses and server or network failures. A successful status with error content may be treated as a soft 404.

<a id="gs-js"></a>
## GS-js — JavaScript SEO basics
- Official source: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Inspect raw responses and rendered output. Initial noindex can prevent rendering, so do not rely on JavaScript removing it. Avoid conflicting canonical signals between initial and rendered HTML.

<a id="gs-budget"></a>
## GS-budget — Managing crawl budget
- Official source: https://developers.google.com/crawling/docs/crawl-budget
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Prioritize crawl efficiency for genuinely large or rapidly changing sites with evidence of a bottleneck; do not presume every small site has a crawl-budget problem.

<a id="gs-facets"></a>
## GS-facets — Faceted navigation
- Official source: https://developers.google.com/crawling/docs/faceted-navigation
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Facets can generate effectively unbounded URL spaces. Separate useful indexable landing pages from combinations that should not consume crawl resources.

<a id="gs-verifybot"></a>
## GS-verifybot — Verifying Google crawler requests
- Official source: https://developers.google.com/crawling/docs/crawlers-fetchers/verify-google-requests
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: A user-agent string is not proof of Google identity. Use documented IP ranges or reverse DNS followed by matching forward resolution.

<a id="gs-mobile"></a>
## GS-mobile — Mobile-first indexing best practices
- Official source: https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Maintain meaningful content, metadata, structured data and resource accessibility on the mobile version rather than optimizing desktop alone.

<a id="gs-links"></a>
## GS-links — Link best practices
- Official source: https://developers.google.com/search/docs/crawling-indexing/links-crawlable
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Use discoverable anchor links with href and meaningful context. Qualify paid and user-generated links appropriately; there is no universal optimal link count.

<a id="gs-urls"></a>
## GS-urls — URL structure best practices
- Official source: https://developers.google.com/search/docs/crawling-indexing/url-structure
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Use understandable, stable URLs and avoid accidental duplicate or unbounded parameter spaces.

<a id="gs-pagination"></a>
## GS-pagination — Pagination and incremental loading
- Official source: https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Expose persistent, crawlable URLs for paginated content. Distinct result pages should not all claim that page one is their canonical equivalent.

<a id="gs-hreflang"></a>
## GS-hreflang — Localized versions of pages
- Official source: https://developers.google.com/search/docs/specialty/international/localized-versions
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Language alternates require coherent self and reciprocal references. Language or region annotations do not replace canonicalization or actual localization.

<a id="gs-international"></a>
## GS-international — Managing multi-regional sites
- Official source: https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Make language and regional versions accessible at stable URLs; avoid forcing all visitors and crawlers through location-based redirects.

<a id="gs-share"></a>
## GS-share — Control what you share with Google
- Official source: https://developers.google.com/search/docs/crawling-indexing/control-what-you-share
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Choose access, indexing and preview controls according to the outcome. Search controls are not a substitute for authentication.

<a id="gs-removal"></a>
## GS-removal — Remove information from Google
- Official source: https://developers.google.com/search/docs/crawling-indexing/remove-information
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Temporary search removals and durable removal or access control are different operations. Verify ownership and inspect URL variants before requesting changes.

<a id="gs-testing"></a>
## GS-testing — Website testing and Google Search
- Official source: https://developers.google.com/search/docs/crawling-indexing/website-testing
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Run genuine visitor tests without crawler-targeted cloaking. Use appropriate temporary behavior and clean up experiments when complete.

<a id="gs-amp"></a>
## GS-amp — AMP on Google Search
- Official source: https://developers.google.com/search/docs/crawling-indexing/amp
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: AMP is an optional implementation path. Recheck current serving guidance rather than assuming legacy AMP cache, viewer or signed-exchange requirements.

<a id="gs-indexing-api"></a>
## GS-indexing-api — Using the Indexing API
- Official source: https://developers.google.com/search/apis/indexing-api/v3/using-api
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: The API is limited to supported JobPosting pages or BroadcastEvent embedded in VideoObject. Notification acceptance does not prove that a URL is indexed.

<a id="gs-title"></a>
## GS-title — Title links
- Official source: https://developers.google.com/search/docs/appearance/title-link
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Use descriptive, distinct page titles and consistent visible headings. Google can generate a different title link; a fixed character count is not a guaranteed display rule.

<a id="gs-snippet"></a>
## GS-snippet — Snippets
- Official source: https://developers.google.com/search/docs/appearance/snippet
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Snippets can be query-dependent and may come from page content rather than the supplied meta description. Preview controls limit eligibility without guaranteeing exact presentation.

<a id="gs-sitename"></a>
## GS-sitename — Site names
- Official source: https://developers.google.com/search/docs/appearance/site-names
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Provide consistent homepage identity and supported WebSite information. A preference does not guarantee the displayed site name.

<a id="gs-favicon"></a>
## GS-favicon — Favicon in search results
- Official source: https://developers.google.com/search/docs/appearance/favicon-in-search?hl=en
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: At review, the guide specified square icons of at least 8 by 8 pixels and recommended larger than 48 by 48. Listed formats were BMP, GIF, ICO, PNG, JPEG, PPM and TIFF; do not assume SVG is supported here.

<a id="gs-images"></a>
## GS-images — Google Images best practices
- Official source: https://developers.google.com/search/docs/appearance/google-images
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Make useful images accessible, understandable from nearby content and sensibly described. A preferred image or metadata suggestion is not a guaranteed selection.

<a id="gs-video"></a>
## GS-video — Video SEO best practices
- Official source: https://developers.google.com/search/docs/appearance/video
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Check watch-page relevance, video prominence, accessibility and stable thumbnail resources. Ordinary page indexing is not the same as video indexing.

<a id="gs-experience"></a>
## GS-experience — Page experience
- Official source: https://developers.google.com/search/docs/appearance/page-experience
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Evaluate the visitor experience rather than a single synthetic SEO score. Good experience does not guarantee top ranking.

<a id="gs-cwv"></a>
## GS-cwv — Core Web Vitals
- Official source: https://developers.google.com/search/docs/appearance/core-web-vitals
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Separate real-user experience from lab debugging and measure the relevant page templates. Avoid claiming a ranking change follows mechanically from a performance score.

<a id="gs-discover"></a>
## GS-discover — Discover and your website
- Official source: https://developers.google.com/search/docs/appearance/google-discover
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Discover eligibility is not guaranteed distribution. Treat feed traffic as a separate, variable surface rather than predictable keyword demand.

<a id="gs-preferred"></a>
## GS-preferred — Preferred sources
- Official source: https://developers.google.com/search/docs/appearance/preferred-sources
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Use the current supported preferred-source mechanism where available. Do not promise a ranking boost or fabricate readers selecting a publisher.

<a id="gs-regional"></a>
## GS-regional — Regionally available features
- Official source: https://developers.google.com/search/docs/appearance/aggregator-features
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Eligibility and presentation can depend on location and publisher type, including EEA and Türkiye-specific features. Verify the current jurisdiction and exact feature.

<a id="gs-explicit"></a>
## GS-explicit — Guidelines for explicit content
- Official source: https://developers.google.com/search/docs/specialty/explicit/guidelines
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Use accurate classification and appropriate technical separation. Do not attempt to evade safety classification or filters.

<a id="gs-social"></a>
## GS-social — Analyze social and video content
- Official source: https://developers.google.com/search/docs/monitor-debug/analyze-social-video-content
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Use the current documentation and actual property access to understand supported social or video analysis. Do not assume a website report exposes all off-site engagement metrics.

<a id="gs-gallery"></a>
## GS-gallery — Structured data feature gallery
- Official source: https://developers.google.com/search/docs/appearance/structured-data/search-gallery
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Resolve current feature guides from this maintained gallery. Feature syntax, content requirements, availability and actual rich-result display are separate questions.

<a id="gs-sd-intro"></a>
## GS-sd-intro — Introduction to structured data
- Official source: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Use supported formats and the specific Google feature guide. Schema.org vocabulary validity alone does not establish Google rich-result eligibility.

<a id="gs-sd-policy"></a>
## GS-sd-policy — General structured data guidelines
- Official source: https://developers.google.com/search/docs/appearance/structured-data/sd-policies?hl=en
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Markup must truthfully represent the page and satisfy feature policies. Passing a syntax test does not guarantee eligibility or display. A structured-data-only manual action is different from an ordinary ranking penalty.

<a id="gs-product"></a>
## GS-product — Product structured data
- Official source: https://developers.google.com/search/docs/appearance/structured-data/product
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Choose the product feature matching the page and commercial intent. Product snippets and merchant listings have distinct eligibility and property expectations.

<a id="gs-merchant"></a>
## GS-merchant — Merchant listing structured data
- Official source: https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Validate real offer facts, currency, price, availability and current feature-specific properties. The full property table was not reproduced; read the guide before generating production markup.

<a id="gs-variants"></a>
## GS-variants — Product variant structured data
- Official source: https://developers.google.com/search/docs/appearance/structured-data/product-variants
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Model real product variants and their relationships; align URLs, offer facts and the selected variant visible to users.

<a id="gs-org"></a>
## GS-org — Organization structured data
- Official source: https://developers.google.com/search/docs/appearance/structured-data/organization
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Represent the actual organization consistently. Organization markup does not itself prove verification, eligibility for every feature, or higher rankings.

<a id="gs-local"></a>
## GS-local — Local business structured data
- Official source: https://developers.google.com/search/docs/appearance/structured-data/local-business
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Use accurate business and location facts. Website markup does not replace management of a Google Business Profile.

<a id="gs-review-snippet"></a>
## GS-review-snippet — Review snippet structured data
- Official source: https://developers.google.com/search/docs/appearance/structured-data/review-snippet
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Use genuine eligible reviews rather than fabricated or undisclosed incentivized reviews. Self-serving business reviews have feature-specific restrictions.

<a id="gs-paywall"></a>
## GS-paywall — Subscription and paywalled content
- Official source: https://developers.google.com/search/docs/appearance/structured-data/paywalled-content
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Identify paywalled content accurately with the supported markup. Markup is not authorization to bypass a paywall or expose protected user content.

<a id="gs-job"></a>
## GS-job — Job posting structured data
- Official source: https://developers.google.com/search/docs/appearance/structured-data/job-posting
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Apply job markup to actual eligible job detail pages and handle expired jobs correctly. The supported Indexing API scope does not extend to unrelated URLs.

<a id="gs-forum"></a>
## GS-forum — Discussion forum structured data
- Official source: https://developers.google.com/search/docs/appearance/structured-data/discussion-forum
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Match real user discussion content, authorship and hierarchy rather than disguising a promotional page as a forum.

<a id="gs-qa"></a>
## GS-qa — Q&A structured data
- Official source: https://developers.google.com/search/docs/appearance/structured-data/qapage
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Distinguish a genuine user-answer question page from a publisher-written FAQ. Do not relabel FAQs merely to seek a different rich result.

<a id="gs-article"></a>
## GS-article — Article structured data
- Official source: https://developers.google.com/search/docs/appearance/structured-data/article
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Represent visible article identity, authorship, dates and imagery accurately and use the current feature-specific guide.

<a id="gs-breadcrumb"></a>
## GS-breadcrumb — Breadcrumb structured data
- Official source: https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Express a coherent user-facing hierarchy with eligible BreadcrumbList markup rather than treating the URL text as the only valid hierarchy.

<a id="gs-event"></a>
## GS-event — Event structured data
- Official source: https://developers.google.com/search/docs/appearance/structured-data/event
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Use actual events, correct dates, locations and status. Recheck eligibility instead of marking ordinary business hours or promotions as events.

<a id="gs-recipe"></a>
## GS-recipe — Recipe structured data
- Official source: https://developers.google.com/search/docs/appearance/structured-data/recipe
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Use the recipe feature only for actual recipe content, with factual instructions and supporting properties visible on the page.

<a id="gs-software"></a>
## GS-software — Software app structured data
- Official source: https://developers.google.com/search/docs/appearance/structured-data/software-app
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Read the current guide for an actual software application page. Do not invent price, ratings or platform support to fill missing fields.

<a id="gs-profile"></a>
## GS-profile — Profile page structured data
- Official source: https://developers.google.com/search/docs/appearance/structured-data/profile-page
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Use supported profile markup for pages with a real profile focus and factual creator identity.

<a id="gs-ecommerce"></a>
## GS-ecommerce — Ecommerce best practices
- Official source: https://developers.google.com/search/docs/specialty/ecommerce
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Connect crawlable site structure, truthful product data and a deliberate launch plan; Merchant Center and website SEO are distinct integrations.

<a id="gs-launch"></a>
## GS-launch — Launch an ecommerce website
- Official source: https://developers.google.com/search/docs/specialty/ecommerce/how-to-launch-an-ecommerce-website
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Choose a launch strategy deliberately and verify public accessibility and inventory quality before submission or promotion.

<a id="gs-console"></a>
## GS-console — Get started with Search Console
- Official source: https://developers.google.com/search/docs/monitor-debug/search-console-start
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Use authorized property data to inspect performance and indexing; do not treat console data access or ownership as implied by a public URL.

<a id="gs-drops"></a>
## GS-drops — Debugging Search traffic drops
- Official source: https://developers.google.com/search/docs/monitor-debug/debugging-search-traffic-drops
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Separate technical failures, demand changes, ranking changes and reporting effects. Segment comparable periods before deciding a cause.

<a id="gs-core"></a>
## GS-core — Core updates
- Official source: https://developers.google.com/search/docs/appearance/core-updates
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Check rollout dates and completion before assessing an update. Guidance recommends waiting at least a full week after completion for the suggested comparison; urgent technical incidents should still be fixed immediately.

<a id="gs-ranking"></a>
## GS-ranking — Ranking systems guide
- Official source: https://developers.google.com/search/docs/appearance/ranking-systems-guide
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Google describes systems, not a public exact ranking formula. Do not convert individual concepts into invented weights or guarantees.

<a id="gs-abuse"></a>
## GS-abuse — Prevent abuse on your site
- Official source: https://developers.google.com/search/docs/monitor-debug/prevent-abuse
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Prevent and moderate spam on sites that accept public contributions. Do not infer a manual action merely from a traffic change.

<a id="gs-site-op"></a>
## GS-site-op — The site: search operator
- Official source: https://developers.google.com/search/docs/monitor-debug/search-operators/all-search-site
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: The operator is a limited diagnostic aid, not a complete indexed-URL inventory or definitive count.

<a id="gs-manual"></a>
## GS-manual — Manual actions report
- Official source: https://support.google.com/webmasters/answer/9044175
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: Use the actual authorized report and stated scope. Fix the documented issues before an explicitly authorized reconsideration request; do not invent a manual action from ranking changes.

<a id="ext-skills"></a>
## EXT-skills — Agent Skills specification
- Official source: https://agentskills.io/specification
- Access attempted: 2026-09-11; status: **reviewed**.
- Scope: Relevant guidance reviewed; not every linked page or property table.
- Note: A skill is a folder with a SKILL.md containing name and description frontmatter. Progressive references and scripts keep the entrypoint focused.

<a id="gs-inspection-unreviewed"></a>
## GS-inspection-unreviewed — URL Inspection help — live verification required
- Official source: https://support.google.com/webmasters/answer/7576553
- Access attempted: 2026-09-11; status: **not_retrieved**.
- Scope: Read this source live before relying on its detailed requirements.
- Note: The direct help-page fetch did not succeed during package creation. Follow the current Search Console UI/help before relying on detailed report behavior.

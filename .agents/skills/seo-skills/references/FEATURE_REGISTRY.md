# Feature resolver registry

Snapshot: **2026-09-11**. Open the current [official gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery), then follow the exact feature link. Gallery-linked means the individual guide was not independently read; it is not a complete implementation contract.

| Feature | Evidence anchor | Scope / verification gate |
|---|---|---|
| Article | [GS-article](SOURCE_INDEX.md#gs-article) | reviewed guide |
| Breadcrumb | [GS-breadcrumb](SOURCE_INDEX.md#gs-breadcrumb) | reviewed guide |
| Carousel | [GS-gallery](SOURCE_INDEX.md#gs-gallery) | gallery-linked; exact guide required |
| Course list | [GS-gallery](SOURCE_INDEX.md#gs-gallery) | gallery-linked; not the retired course-info feature |
| Dataset | [GS-gallery](SOURCE_INDEX.md#gs-gallery) | Dataset Search, not a promised web Search rich result |
| Discussion forum | [GS-forum](SOURCE_INDEX.md#gs-forum) | reviewed guide |
| Education Q&A | [GS-gallery](SOURCE_INDEX.md#gs-gallery) | gallery-linked; exact guide required |
| Employer aggregate rating | [GS-gallery](SOURCE_INDEX.md#gs-gallery) | gallery-linked; exact guide required |
| Event | [GS-event](SOURCE_INDEX.md#gs-event) | reviewed guide |
| Image metadata | [GS-gallery](SOURCE_INDEX.md#gs-gallery) | gallery-linked; exact guide required |
| Job posting | [GS-job](SOURCE_INDEX.md#gs-job) | reviewed guide; Indexing API restricted scope |
| Local business | [GS-local](SOURCE_INDEX.md#gs-local) | reviewed guide; not complete Business Profile guidance |
| Math solver | [GS-gallery](SOURCE_INDEX.md#gs-gallery) | gallery-linked; exact guide required |
| Movie | [GS-gallery](SOURCE_INDEX.md#gs-gallery) | gallery-linked; exact guide required |
| Organization | [GS-org](SOURCE_INDEX.md#gs-org) | reviewed guide |
| Product / merchant / variants | [GS-product](SOURCE_INDEX.md#gs-product) | read GS-merchant and GS-variants for detailed contract |
| Profile page | [GS-profile](SOURCE_INDEX.md#gs-profile) | reviewed guide |
| Q&A | [GS-qa](SOURCE_INDEX.md#gs-qa) | real user-answer question; not an FAQ workaround |
| Recipe | [GS-recipe](SOURCE_INDEX.md#gs-recipe) | reviewed guide |
| Review snippet | [GS-review-snippet](SOURCE_INDEX.md#gs-review-snippet) | check eligibility and self-serving/incentive restrictions |
| Software app | [GS-software](SOURCE_INDEX.md#gs-software) | reviewed guide |
| Speakable | [GS-gallery](SOURCE_INDEX.md#gs-gallery) | gallery-linked; exact scope required |
| Subscription / paywall | [GS-paywall](SOURCE_INDEX.md#gs-paywall) | reviewed guide; preserve access controls |
| Vacation rental | [GS-gallery](SOURCE_INDEX.md#gs-gallery) | gallery-linked; exact eligibility required |
| Video | [GS-video](SOURCE_INDEX.md#gs-video) | video guide read; exact structured-data guide required |
| FAQ rich results | [GS-updates](SOURCE_INDEX.md#gs-updates) | retired starting 2026-05-07 |
| Book actions | [GS-updates](SOURCE_INDEX.md#gs-updates) | status-sensitive outside this main gallery inventory; resolve current official guide; do not assume retired |

Always verify required/recommended properties, page eligibility, region, content policy, lifecycle rules and validation tools. Vocabulary validity, Google eligibility and actual display are distinct. A failed fetch is not proof of deprecation.

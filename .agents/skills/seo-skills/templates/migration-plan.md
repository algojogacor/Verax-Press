# URL migration plan

## Scope and authority

Old/new targets; reason; inventory sources; exclusions; owner; permitted actions; release window.

## Mapping

| Old URL / pattern | New equivalent or retirement state | Why equivalent | Response policy | Dependencies | Verification |
|---|---|---|---|---|---|
| Populate | Populate | Populate | Populate | Canonicals / links / sitemaps / locales / media | Not assessed until tested |

## Before release

Verify destination accessibility, real content, intended indexing, host variants, matching canonicals, locale clusters, current sitemaps and staging-control removal. Save existing configuration.

## Release gates

Explicit approval; representative mapping tests; error/retired-page tests; redirect loop/chain checks; correct internal references; appropriate current Search Console actions only where applicable and authorised.

## After release

Observe both old and new properties; errors; important landing pages; canonical selection; actual traffic by comparable cohorts. Record implementation completion separately from Search processing.

## Rollback and continuity

Trigger; decision owner; reversible elements; forward-repair plan for nontrivial reversals; durable redirect maintenance and review date based on current official guidance.

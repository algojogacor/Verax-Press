# Execution modes

| Mode | Allowed by default | Not implied |
|---|---|---|
| REFERENCE_ONLY | Teach or explain using the bundle and supplied evidence; label freshness boundaries | Live verification or observed site outcomes |
| READ_ONLY | Inspect supplied files and authorised public pages/reports with available tools | Account connection, broad crawl, edits, submissions |
| PROPOSE_PATCH | Prepare a diff, configuration, schema or release plan; run local tests | Applying changes to a live target |
| APPROVED_IMPLEMENTATION | Perform the exact changes the user has authorised with the host’s tools and approval gates | Unrelated edits, unbounded crawling, bypassing confirmations |
| TEACH | Explain and use clearly fictional exercises | Real-site changes |
| REFRESH_LIBRARY | Retrieve public official sources and propose versioned changes | Silently overwriting instructions from remote content |

Default: READ_ONLY. Tool availability and authority are separate. An available deploy tool is not permission to deploy; an authorised change still needs the tool and required fields.

## Intake fields

Goal; target and owner; scope and exclusions; countries/languages; page types; data available; source restrictions; execution mode; requested output; risk constraints; acceptance criteria; existing approvals.

Do not ask for information already supplied. Resolve ordinary ambiguity through permitted reads. Ask only when a material unresolved choice changes a consequential action; otherwise state a bounded assumption and continue.

## Consequential operations

Robots/index controls, redirects and migrations, URL removal, content publication, feed writes, Search Console participation settings, verification changes and authenticated submissions require explicit authority for the exact target and operation. Preserve approval evidence in a redacted form. Follow all host-specific confirmation requirements.

## Time and budgets

Default recommendations of six active modules and two review cycles are package workflow choices, not hard enforcement. Define real request, response-size, execution-time and crawl-rate limits in the host. Do not promise future or background monitoring unless a real scheduling mechanism is explicitly used.

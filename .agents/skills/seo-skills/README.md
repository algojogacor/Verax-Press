# SEO Skills for AI Agents

**Stop prompting your agent to “do SEO.” Give it the skills to investigate, recommend, and verify.**

Turn [Google Search documentation](https://developers.google.com/search/docs?hl=en) into evidence-backed workflows for technical audits, content planning, structured data, and search diagnostics.

**44 specialist modules · 1 master router · 80 source records**

[Quickstart](#quickstart) · [Example output](#example-output) · [Browse skills](skills/INDEX.md) · [Local tools](#local-tools) · [Validation](#validation-and-known-limitations)

---

## What you get

An agent-ready SEO playbook that connects **what to investigate → which evidence to collect → what to recommend → how to verify it**.

Use it to turn website files, URL samples, product facts, or Search Console exports into scoped investigations and actionable recommendations. Each workflow asks the agent to distinguish official guidance, observed facts, and inference—and to state what it could not check.

This is a **Markdown skill library with optional Python utilities**, not a standalone crawler, hosted SEO platform, or automatic connection to Google accounts.

## Quickstart

### 1. Get the complete pack

```bash
git clone https://github.com/anonymousAAK/seo-skills.git seo-skills
cd seo-skills
```

The destination name is intentional: the current root skill declares `name: seo-skills`. Keep this folder name and the internal directory structure. The public repository is named `seo-skills`; the installable pack currently uses `seo-skills`.

Without Git, use GitHub’s **Code → Download ZIP**, extract it, and rename the extracted root folder to `seo-skills`.

**Keep the whole pack together.** Individual specialist folders depend on shared references, templates, and protocols.

### 2. Give your agent this prompt

Make the pack accessible to your agent. From inside `seo-skills`, use:

```text
Read ./SKILL.md and follow its routing and evidence requirements.

Audit the website files or URLs I supply in read-only mode.
Load only the specialist modules needed for the task.

For each finding, return:
- Observed evidence and affected pages
- The relevant source guidance
- Why the issue matters
- A recommended change, priority, and confidence level
- An acceptance test

Separate observations from hypotheses. State what you could not check.
Do not deploy changes, invent account access, or claim unperformed tests.
```

An agent with Markdown file access can use the library. Live browsing, rendered-page inspection, and authenticated Search Console access depend on tools and permissions supplied by your agent’s host. Python is optional unless you run the utilities below.

### 3. Try a local example

With **Python 3.10+**, run:

```bash
python scripts/inspect_html.py tests/fixtures/page-good.html --url https://example.com/guide
```

This inspects the bundled HTML fixture and prints findings from that file. The URL supplies page context; the command **does not fetch the website or render JavaScript**.

On systems where Python 3 is invoked as `python3`, use that command instead of `python`.

## Example output

**Illustrative scenario—not a live-site audit or an executed agent benchmark.**

A site owner wants a public legacy guide to remain readable but stop appearing in Search. The supplied files contain:

```text
robots.txt:  Disallow: /legacy/
Page HTML:   <meta name="robots" content="noindex">
```

The relevant workflow produces a finding like this:

| Field | Example finding |
|---|---|
| Evidence | The supplied robots file blocks the path; the supplied HTML contains `noindex`. Live deployment has not been verified. |
| Mechanism | Blocking retrieval can prevent Google from seeing the page’s `noindex` directive. |
| Proposed change | For intentionally public content, allow the relevant crawl so the directive can be retrieved. Confirm that the content does not require access control first. |
| Acceptance test | After an approved change, verify live crawl access and the delivered directive; then monitor actual processing. |
| Limitation | Local file inspection alone cannot prove that the URL has been removed from Search. |

The result is a proposed fix with evidence and a verification plan—not a promise of deindexing.

Read the [complete worked example](examples/01-blocked-noindex.md), including its source references, or [browse all examples](examples/).

## What the skills cover

| Area | Workflows | Start with |
|---|---|---|
| **Technical SEO** | Crawl access, indexing controls, sitemaps, canonicals, redirects, and JavaScript | [Audit](skills/gsearch-audit/SKILL.md) · [Robots](skills/gsearch-robots/SKILL.md) · [JavaScript](skills/gsearch-javascript/SKILL.md) |
| **Content and AI search** | Content briefs, quality reviews, AI-assisted publishing, and current AI-search guidance | [Content briefs](skills/gsearch-content-brief/SKILL.md) · [AI visibility](skills/gsearch-ai-visibility/SKILL.md) |
| **Structured data and commerce** | Feature eligibility, product information, offers, variants, and ecommerce discovery | [Structured data](skills/gsearch-structured-data/SKILL.md) · [Products](skills/gsearch-products/SKILL.md) |
| **Architecture and migrations** | URL design, facets, pagination, language alternates, and migration planning | [URL architecture](skills/gsearch-url-architecture/SKILL.md) · [Migrations](skills/gsearch-migration/SKILL.md) |
| **Search appearance** | Titles, snippets, site identity, images, video, publishing, and local-business representation | [Titles and snippets](skills/gsearch-titles-snippets/SKILL.md) · [Images](skills/gsearch-images/SKILL.md) |
| **Reporting and diagnosis** | Search Console interpretation, traffic changes, ranking-update hypotheses, and experiments | [Search Console](skills/gsearch-search-console/SKILL.md) · [Traffic drops](skills/gsearch-traffic-drop/SKILL.md) |
| **Review and learning** | Independent checks, source refreshes, first-principles teaching, and agent handoffs | [Review](skills/gsearch-review/SKILL.md) · [Tutor](skills/gsearch-tutor/SKILL.md) |

**[Browse all 44 specialist modules](skills/INDEX.md)** or read the [coverage and exclusions](references/COVERAGE.md).

Specialized features use a [current-guide resolver](skills/gsearch-feature-resolver/SKILL.md): the agent checks the relevant official documentation rather than treating a frozen property list as permanently valid.

## More things to ask

<details>
<summary><strong>Copy-ready task prompts</strong></summary>

Start each task with the root `SKILL.md` available to the agent.

**Product structured data**

```text
Use the pack to prepare Product structured data from the product facts I provide.
Check the current official feature guide. Do not invent ratings, prices, stock,
or other missing facts. Separate syntax checks from Google feature eligibility.
```

**Traffic-drop investigation**

```text
Use the pack to investigate the Search Console exports and deployment timeline
I provide. Compare appropriate periods and segments. Separate observations from
possible causes, identify missing evidence, and propose tests for each hypothesis.
```

**Migration planning**

```text
Use the pack to review my old-to-new URL mapping and prepare a migration plan.
Identify risks, verification steps, monitoring needs, and rollback conditions.
Return a proposal only; do not modify or deploy anything.
```

**Learn from first principles**

```text
Use teaching mode to explain robots.txt, noindex, and canonical tags.
Show why they solve different problems using a small fictional website,
then explain the common mistakes and how to verify the intended behavior.
```

</details>

## How it works

**Define the task → load relevant modules → collect evidence → propose or perform authorized work → review → hand off.**

The [master skill](SKILL.md) routes requests to focused modules. Agents load only the references needed for the current task rather than the entire corpus. Findings are connected to sources, affected scope, acceptance tests, and unresolved questions.

Execution defaults to **read-only**. Recommendations are not permission to change a website. See [execution modes](protocols/EXECUTION_MODES.md) and [permissions](protocols/SAFETY_AND_PERMISSIONS.md).

## Local tools

The five utilities use **Python 3.10+ and the standard library**. Run them from the pack root.

```bash
# Suggest specialist modules for a task; no network access.
python scripts/route.py "audit canonicals and JavaScript rendering"

# Inspect saved HTML; no fetching or JavaScript execution.
python scripts/inspect_html.py tests/fixtures/page-good.html --url https://example.com/guide

# Check a local sitemap's basic structure and limits.
python scripts/check_sitemap.py tests/fixtures/sitemap-good.xml

# Preview documentation refresh requests without making them.
python scripts/refresh_sources.py --limit 3
```

These tools do not emulate Google’s complete parsers, perform a live crawl, or establish indexing or rich-result eligibility. The router is a deterministic suggestion tool, not a complete agent planner.

The fifth utility, `validate_bundle.py`, checks package structure and integrity; see [validation and known limitations](#validation-and-known-limitations) before running it in a checkout.

<details>
<summary><strong>Optional network-enabled source check</strong></summary>

```bash
python scripts/refresh_sources.py --allow-network --limit 3
```

Network access is opt-in. The helper prints a report and does not edit skills or baselines. A first fetch proposes a baseline; without a previous baseline, it cannot establish a historical change. Byte differences require human or agent review before they are treated as changes in guidance.

The build report documents mocked network tests, not a completed live-network test of this helper.

</details>

## Integration options

| Environment | How to use the pack |
|---|---|
| **Agent with file access** | Make the complete folder available and point the agent to its root `SKILL.md`. |
| **Agent Skills host** | Place the complete `seo-skills` folder in the host’s configured skill location. Verify discovery in that host. |
| **Custom harness** | Register the root `SKILL.md` as the entrypoint and use [manifest.json](manifest.json) for specialist paths. Keep your existing permission and approval controls. |
| **Text-only workflow** | Supply the [portable operating manual](GOOGLE_SEARCH_PORTABLE_OPERATING_MANUAL.md). Executable utilities remain separate, and unprovided files cannot be inspected. |

Installation and discovery vary by host. This repository does not claim universal runtime compatibility or completed tests in every agent platform. Do not overwrite a project’s existing `AGENTS.md` merely to add this library.

## Sources and freshness

**Recorded source snapshot: September 11, 2026.**

The [source registry](references/SOURCE_INDEX.md) contains **80 records: 79 marked reviewed and one explicitly not retrieved**. One reviewed record concerns the Agent Skills specification; the other records concern Google guidance. Review covers relevant sections, not every field in every linked document.

This repository contains independently authored workflows and paraphrases—not an offline mirror of Google’s documentation. Before implementation, recheck change-sensitive requirements such as rich-result eligibility, AI-search controls, regional restrictions, and feature properties. Offline use must disclose where current verification was unavailable.

See the [source policy](protocols/SOURCE_POLICY.md), [freshness policy](protocols/FRESHNESS.md), and [documented changes and conflicts](references/CURRENT_CHANGES_2026.md).

## Validation and known limitations

The [v1.0.0 build report](validation/REPORT.md) records **66 passing local unit tests**, **8 command-line smoke checks**, and **769 checked local Markdown links** for the original build. These are historical build results—not a live status badge for the latest commit or a guarantee that every checkout passes.

The [56 agent-evaluation scenarios](evaluations/README.md) are authored tests, **not completed external-agent evaluations**. Local utility tests do not demonstrate ranking improvements, agent reliability, or live Google outcomes.

<details>
<summary><strong>Developer checks and current packaging caveats</strong></summary>

```bash
python -m unittest discover -s tests -v
python scripts/validate_bundle.py
```

Run these commands to obtain results for your actual checkout. Current packaging caveats must be accounted for:

- **Folder name:** the validator expects the containing folder to match `seo-skills`. The quickstart uses that name explicitly.
- **Git metadata:** the checksum inventory currently includes `.git` files in a cloned checkout, causing an inventory mismatch against the release manifest.
- **Edited files:** the checked-in README checksum is stale. Replacing the README also changes its hash; release checksums must be regenerated from finalized release contents.

The README does not repair these implementation issues. Repository validation should exclude Git metadata and local development artifacts, while release validation should check a clean archive against its finalized checksum inventory. Update the validator and regenerate release checksums before claiming a clean current validation run.

Checksums detect changes in bytes; they do not certify SEO correctness or future agent behavior.

</details>

No website was audited or deployed as part of the original package build. The library does not guarantee indexing, rankings, rich results, AI citations, or business outcomes.

## Project guide

| Location | Purpose |
|---|---|
| [SKILL.md](SKILL.md) | Master routing and execution instructions |
| [skills/INDEX.md](skills/INDEX.md) | Complete specialist catalog |
| [protocols/](protocols/) | Evidence, permissions, freshness, and output rules |
| [references/](references/) | Source registry, decision trees, glossary, and coverage |
| [templates/](templates/) | Reusable reports, implementation plans, and handoffs |
| [examples/](examples/) | Worked scenarios and illustrative outputs |
| [scripts/](scripts/) | Optional local utilities |
| [tests/](tests/) · [evaluations/](evaluations/) | Utility tests and agent-evaluation scenarios |
| [validation/REPORT.md](validation/REPORT.md) | Recorded build checks and their scope |
| [CHANGELOG.md](CHANGELOG.md) | Package change history |

## Contributing

Source corrections, reproducible bug reports, clearer workflows, and documented host-integration tests are welcome.

For a source correction, include the official URL, access date, affected module, and proposed change. For a bug, include the command, Python version where relevant, a minimal reproducible input, and expected versus actual behavior. Use synthetic or redacted examples; do not publish credentials or private Search Console data.

[Open an issue](https://github.com/anonymousAAK/seo-skills/issues) or submit a pull request. Contributions should preserve source attribution and distinguish proposed checks from tests actually performed.

## License and attribution

Original package material is provided under the MIT terms in [LICENSE.md](LICENSE.md). Linked upstream material retains its own terms; see [ATTRIBUTION.md](ATTRIBUTION.md).

**Independent project. Not an official Google product and not endorsed by Google.**

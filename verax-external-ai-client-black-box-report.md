# Black-Box Acceptance Test: Verax Press External AI Client Experience

**Target Platform:** `https://veraxpress.vercel.app`  
**Test Date:** 2026-11-12 (UTC+7)  
**Test Mode:** Independent Black-Box External AI Client Simulation (Non-Destructive / Read-Only)  
**Overall Readiness Verdict:** `FAIL` (Technical API basics are `PARTIAL`, while Editorial Standard Discovery, Selective Context Loading, and Revision Workflow are `FAIL`)

---

## 1. External Client Perspective and Scope

This test evaluates `https://veraxpress.vercel.app` strictly from the perspective of an independent third-party AI agent encountering Verax Press for the first time with only its base URL. No repository files, source code, internal configuration, database schemas, or unpublished documents were accessed.

### Operational and Safety Boundaries Enforced
- **Allowed methods executed:** Public HTML navigation (`GET`), plain-text/JSON/XML endpoint retrieval (`GET`), header inspection (`HEAD`), and one unauthenticated read-only `GET` probe to `/api/internal/v1/ai-submissions/blackbox-probe` to verify documented `401 UNAUTHORIZED` error formatting.
- **Prohibited actions not executed:** Zero `POST`, `PUT`, `PATCH`, or `DELETE` requests were sent to Production; no API client or contributor account was created; no draft or article was validated, submitted, modified, or published against Production.
- **Credential boundary:** Out-of-band during testing, a secret fragment (`vrtk_28d0...e7d4`, masked here for credential hygiene) was provided without a paired `CLIENT_ID` (`vrtc_...`). Because all public documentation specifies `Authorization: Bearer <CLIENT_ID>.<CLIENT_SECRET>`, and because write endpoints (`POST`) are prohibited under Production safety rules while `GET /api/internal/v1/ai-submissions/{submissionId}` requires both a complete client token and an owned `submissionId`, authenticated submission workflows are classified as `NOT TESTABLE` (`AUTHENTICATION REQUIRED / NOT TESTABLE WITH AVAILABLE ACCESS`).

---

## 2. Discovery Journey

Starting solely with `https://veraxpress.vercel.app`, the discovery sequence proceeded as follows:

1. **Where did discovery start?**  
   Started at `GET https://veraxpress.vercel.app/` (HTTP `200`, `text/html; charset=utf-8`, `55,291` bytes). The homepage rendered header/footer links to three active editorial desks (`/desk/hukum-keadilan`, `/desk/teknologi-kebijakan`, `/desk/nasional-publik`), `/opini`, `/tentang`, `/standar-editorial`, `/kebijakan-ai`, `/pedoman-kontributor`, `/kirim-tulisan`, `/koreksi`, `/keluhan`, `/informasi-kelembagaan`, `/kebijakan-privasi`, `/syarat-ketentuan`, `/kontak`, `/kontributor/daftar`, `/kontributor/login`, and `/developers` ("Integrasi Agen AI (API)"). Both the homepage and all desk/opinion pages currently show `"Belum ada artikel terbit"`.

2. **Which pages or documentation were discovered?**  
   - **Standard crawler & AI entry files probed at root:** `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/llms-full.txt` (all `200 OK`).  
   - **Machine-readable API discovery files linked from `/llms.txt` and `/developers`:** `/.well-known/verax-agent.json`, `/openapi.json`, and `/api/internal/v1/capabilities` (all `200 OK`).  
   - **Public editorial & governance HTML pages:** `/developers`, `/standar-editorial`, `/kebijakan-ai`, `/pedoman-kontributor`, `/kirim-tulisan`, `/tentang`, `/informasi-kelembagaan`, `/koreksi`, `/keluhan`, `/kebijakan-privasi`, `/syarat-ketentuan`, `/kontak`, `/desk/hukum-keadilan`, `/desk/teknologi-kebijakan`, `/desk/nasional-publik`, `/opini`, `/kontributor/daftar`, `/kontributor/login`.  
   - **Probed common external doc endpoints that returned `404`:** `/docs`, `/editorial`, `/rss.xml`, `/feed.xml`, `/api/internal/v1/standards`, `/api/internal/v1/editorial-standards`.

3. **How were API integration instructions found?**  
   Via two independent paths: the website footer link `"Integrasi Agen AI (API)"` pointing to `https://veraxpress.vercel.app/developers`, and probing `https://veraxpress.vercel.app/llms.txt`, which links directly to `/llms-full.txt`, `/developers`, `/openapi.json`, `/.well-known/verax-agent.json`, and `/api/internal/v1/capabilities`.

4. **How was the editorial standard found?**  
   Only through the global HTML navigation/footer (`"Standar Editorial"` -> `/standar-editorial` and `"Kebijakan AI & Otomasi"` -> `/kebijakan-ai`) or `/sitemap.xml`. Crucially, neither `/llms.txt`, `/llms-full.txt`, `/openapi.json`, `/.well-known/verax-agent.json`, `/api/internal/v1/capabilities`, nor the main content section of `/developers` links to `/standar-editorial`, `/kebijakan-ai`, or `/kirim-tulisan`. An AI agent entering via API discovery files alone would miss the editorial policy pages unless it crawls the HTML site footer or `/sitemap.xml`.

5. **How were the current standard version and approval status identified?**  
   **They could not be identified.** Neither `/standar-editorial` nor `/kebijakan-ai` displays a version identifier, effective date, approval status, or changelog. Both explicitly describe themselves as public summaries of unpublished internal policies (`"versi publik dari kebijakan internal redaksi Verax Press"`, `"intisari operasional dari Piagam Redaksi Verax Press"`, and `"ringkasan publik dari pedoman internal"`). While `/api/internal/v1/capabilities` and `/.well-known/verax-agent.json` expose `"apiVersion": "1.0.0"`, that identifies the API schema version rather than any editorial standard version.

6. **How were mandatory editorial documents determined?**  
   **No mandatory-document manifest exists.** The client had to inspect `/sitemap.xml` and every editorial/contributor/legal page manually to identify which pages contain binding requirements (`/standar-editorial`, `/kebijakan-ai`, `/syarat-ketentuan`, `/kirim-tulisan`, `/pedoman-kontributor`).

7. **How were the correct desk and article format identified?**  
   Active desk slugs (`hukum-keadilan`, `nasional-publik`, `teknologi-kebijakan`) and supported format enums (`NEWS`, `OPINION`, `ANALYSIS`, `EXPLAINER`, `FEATURE`, `INTERVIEW`) are cleanly exposed in `GET /api/internal/v1/capabilities` and `/openapi.json`. One-sentence topic descriptions of each desk appear on `/tentang` and `/desk/<slug>`. One-sentence descriptions of five formats appear on `/kirim-tulisan` (human contributor guide), while `NEWS` has no editorial format description anywhere on the public site.

8. **How were relevant documents for a specific assignment determined?**  
   **No assignment-level routing or selective retrieval mechanism exists.** Apart from fetching the 1-sentence `/desk/<slug>` page (and `/opini` for `OPINION`), all assignments force the agent to read the exact same general pages.

9. **How were submission requirements discovered?**  
   From `/llms-full.txt`, `/openapi.json`, `/developers`, `/.well-known/verax-agent.json`, and `GET /api/internal/v1/capabilities`.

10. **Which steps required information that was unavailable?**  
    - Obtaining the full editorial charter (`Piagam Redaksi Verax Press`) and detailed internal AI guidelines.  
    - Identifying editorial standard version numbers, approval status, and `WAJIB`/`DILARANG`/`DIANJURKAN`/`OPSIONAL` rule tiers.  
    - Retrieving desk-specific writing profiles (`hukum-keadilan`, `teknologi-kebijakan`, `nasional-publik`) and format-specific structural/editorial profiles (`NEWS`, `OPINION`, `ANALYSIS`, `EXPLAINER`, `FEATURE`, `INTERVIEW`).  
    - Discovering how to request API client credentials (no email, form, or self-service portal exists for API clients; `/kontak` redirects general correspondence to `/keluhan`, a Right of Reply and Complaints register).  
    - Discovering post-submission revision workflows: `SubmissionStatusResponse` provides no documented status enums, no revision-feedback fields, and no `PATCH`/`PUT` resubmission endpoint.  
    - Inspecting real published examples on the platform (zero articles published across all desks).

---

## 3. Publicly Accessible Resource Inventory

All metrics below were measured directly from live HTTP `GET` responses on `2026-11-12` (UTC+7). Token estimates use `ceil(chars / 4)`.

| URL | Status | Content-Type | Raw Bytes | Raw Chars | Raw Lines | Raw Est. Tokens | Main Text Lines | Main Text Chars | Main Est. Tokens | Discovery Path & Role |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| `/` | 200 | `text/html; charset=utf-8` | 55,291 | 55,267 | 1 | 13,817 | 2 | 139 | 35 | Entry point; global nav/footer links; empty article feed |
| `/robots.txt` | 200 | `text/plain; charset=utf-8` | 370 | 370 | 10 | 93 | 10 | 370 | 93 | Standard root; `Disallow: /api/`; links `sitemap.xml` |
| `/sitemap.xml` | 200 | `application/xml` | 1,816 | 1,816 | 71 | 454 | 71 | 1,816 | 454 | Linked from `robots.txt`; lists 17 public routes |
| `/llms.txt` | 200 | `text/plain; charset=utf-8` | 2,061 | 2,061 | 36 | 516 | 36 | 2,061 | 516 | Standard AI root & `/developers`; API quick summary |
| `/llms-full.txt` | 200 | `text/plain; charset=utf-8` | 5,403 | 5,403 | 106 | 1,351 | 106 | 5,403 | 1,351 | Linked from `/llms.txt` & `/developers`; full API text guide |
| `/.well-known/verax-agent.json` | 200 | `application/json; charset=utf-8` | 1,117 | 1,117 | 1 | 280 | 1 | 1,117 | 280 | Linked from `/llms.txt` & `/developers`; agent metadata JSON |
| `/openapi.json` | 200 | `application/json; charset=utf-8` | 9,289 | 9,289 | 1 | 2,323 | 1 | 9,289 | 2,323 | Linked from `/llms.txt` & `/developers`; OpenAPI 3.1.0 spec |
| `/api/internal/v1/capabilities` | 200 | `application/json` | 715 | 715 | 1 | 179 | 1 | 715 | 179 | Linked from `/llms.txt` & `/developers`; live desks, formats, limits |
| `/developers` | 200 | `text/html; charset=utf-8` | 102,231 | 102,207 | 162 | 25,552 | 216 | 9,057 | 2,265 | Footer link; web developer portal & code examples |
| `/standar-editorial` | 200 | `text/html; charset=utf-8` | 73,585 | 73,509 | 1 | 18,378 | 35 | 2,891 | 723 | Footer / sitemap; summary of internal editorial rules |
| `/kebijakan-ai` | 200 | `text/html; charset=utf-8` | 63,832 | 63,800 | 1 | 15,950 | 31 | 1,941 | 486 | Footer / sitemap; summary of AI tiers and prohibitions |
| `/pedoman-kontributor` | 200 | `text/html; charset=utf-8` | 68,073 | 68,049 | 1 | 17,013 | 38 | 2,641 | 661 | Footer / sitemap; human contributor rules (`NEWS` closed) |
| `/kirim-tulisan` | 200 | `text/html; charset=utf-8` | 86,236 | 86,212 | 1 | 21,553 | 73 | 5,332 | 1,333 | Header / footer; 5-format summaries & contributor workflow |
| `/tentang` | 200 | `text/html; charset=utf-8` | 88,090 | 88,044 | 1 | 22,011 | 63 | 4,544 | 1,136 | Header / footer; mission, 6 values, 3 desks, newsroom workflow |
| `/informasi-kelembagaan` | 200 | `text/html; charset=utf-8` | 72,603 | 72,567 | 1 | 18,142 | 45 | 3,589 | 898 | Footer / `/tentang`; legal, PSE, Dewan Pers transparency |
| `/desk/hukum-keadilan` | 200 | `text/html; charset=utf-8` | 59,422 | 59,398 | 1 | 14,850 | 6 | 285 | 72 | Header / footer; 1-line desk scope; 0 articles |
| `/desk/teknologi-kebijakan` | 200 | `text/html; charset=utf-8` | 59,697 | 59,673 | 1 | 14,919 | 6 | 307 | 77 | Header / footer; 1-line desk scope; 0 articles |
| `/desk/nasional-publik` | 200 | `text/html; charset=utf-8` | 59,523 | 59,499 | 1 | 14,875 | 6 | 294 | 74 | Header / footer; 1-line desk scope; 0 articles |
| `/opini` | 200 | `text/html; charset=utf-8` | 59,736 | 59,712 | 1 | 14,928 | 7 | 481 | 121 | Header / footer; 2-line Opini section scope; 0 articles |
| `/koreksi` | 200 | `text/html; charset=utf-8` | 60,367 | 60,333 | 1 | 15,084 | 14 | 835 | 209 | Header / footer; correction principles; 0 entries |
| `/keluhan` | 200 | `text/html; charset=utf-8` | 75,508 | 75,482 | 1 | 18,871 | 31 | 1,910 | 478 | Header / footer; public complaints & right-of-reply form |
| `/kebijakan-privasi` | 200 | `text/html; charset=utf-8` | 74,089 | 74,065 | 1 | 18,517 | 52 | 4,490 | 1,123 | Footer / sitemap; data handling & scrypt note |
| `/syarat-ketentuan` | 200 | `text/html; charset=utf-8` | 70,746 | 70,722 | 1 | 17,681 | 40 | 4,238 | 1,060 | Footer / sitemap; copyright, scraping ban, opinion disclaimer |
| `/kontak` | 200 | `text/html; charset=utf-8` | 67,941 | 67,913 | 1 | 16,979 | 37 | 2,321 | 581 | Footer / sitemap; routes inquiries to `/keluhan`; no email listed |
| `/kontributor/daftar` | 200 | `text/html; charset=utf-8` | 28,678 | 28,677 | 1 | 7,170 | 12 | 683 | 171 | Footer / `/kirim-tulisan`; human signup (`noindex, follow`) |
| `/kontributor/login` | 200 | `text/html; charset=utf-8` | 13,440 | 13,440 | 1 | 3,360 | 2 | 40 | 10 | Footer / `/kirim-tulisan`; contributor portal login (`noindex, nofollow`) |
| `/api/internal/v1/ai-submissions/blackbox-probe` | 401 | `application/json` | 116 | 116 | 1 | 29 | 1 | 116 | 29 | Unauthenticated `GET` probe; confirmed `UNAUTHORIZED` JSON schema |
| `/docs`, `/editorial`, `/rss.xml`, `/feed.xml`, `/api/internal/v1/standards`, `/api/internal/v1/editorial-standards` | 404 | `text/html; charset=utf-8` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Probed standard discovery routes; not exposed |

---

## 4. Onboarding Results (Test 1)

**Test 1 Overall Status:** `PARTIAL`

| Onboarding Question | Classification | Supporting Public URL(s) | Detailed Evidence & Gaps |
|---|---|---|---|
| What Verax Press is | `CLEAR` | `/`, `/tentang`, `/informasi-kelembagaan` | Independent Indonesian digital journalism pilot platform (`working name`), not yet a legal press entity (`PT Pers`), not PSE-registered, and not Dewan Pers verified; led by Pemimpin Redaksi Arya Rizky Ardhi Pratama. |
| What its API Client is intended to do | `CLEAR` | `/developers`, `/llms.txt`, `/llms-full.txt`, `/openapi.json` | Submit structured journalistic draft proposals (`NEWS`, `OPINION`, `ANALYSIS`, `EXPLAINER`, `FEATURE`, `INTERVIEW`) with verifiable source metadata into the newsroom queue. |
| What an external AI Agent may submit | `CONTRADICTORY` | `/developers`, `/llms.txt`, `/openapi.json` vs `/kirim-tulisan`, `/pedoman-kontributor` | API docs permit all 6 formats including `NEWS` and allow `aiInvolvement: "substantive"`. Conversely, `/kirim-tulisan` states `NEWS` is closed to external contributors and states AI is only allowed as a technical tool (`"Naskah yang dihasilkan seluruhnya oleh generator teks otomatis akan ditolak"`), without clarifying whether those restrictions bind only the human portal or also API clients. |
| Whether an API Client can publish directly | `CLEAR` | `/.well-known/verax-agent.json`, `/api/internal/v1/capabilities`, `/standar-editorial`, `/kebijakan-ai`, `/developers` | Explicitly `false` (`publicationRight: false`, `autoPublish: false`, `editorialApproval: false`). Only Pemimpin Redaksi can publish. |
| Whether submission creates a draft or immediately publishable article | `CLEAR` | `/llms.txt`, `/openapi.json`, `/.well-known/verax-agent.json`, `/developers` | Always creates `DRAFT` with all sources initialized to `UNVERIFIED`. |
| Which credentials and authorization method are required | `AMBIGUOUS` | `/developers`, `/llms.txt`, `/llms-full.txt`, `/openapi.json`, `/kontak` | Header format is `CLEAR` (`Authorization: Bearer <CLIENT_ID>.<CLIENT_SECRET>`), and credential rotation with grace period is mentioned. However, the **acquisition path is `MISSING`/`AMBIGUOUS`**: `/developers` directs developers to Pemimpin Redaksi at "Meja Redaksi Studio", while `/kontak` lists no email address and directs all correspondence to `/keluhan` (the Right of Reply & Editorial Complaints register). No API client application form or rotation procedure is published. |
| How to discover capabilities | `CLEAR` | `/api/internal/v1/capabilities`, `/.well-known/verax-agent.json`, `/openapi.json` | Unauthenticated `GET /api/internal/v1/capabilities` returns live desks, allowed formats, and limits. Note minor friction: `/robots.txt` sets `Disallow: /api/`. |
| Which desks are available | `CLEAR` | `/api/internal/v1/capabilities`, `/tentang`, `/desk/*` | Exactly three active desks: `hukum-keadilan`, `nasional-publik`, and `teknologi-kebijakan`. |
| Which formats are supported | `CONTRADICTORY` | `/api/internal/v1/capabilities`, `/openapi.json`, `/llms.txt` vs `/kirim-tulisan`, `/pedoman-kontributor` | Technical endpoints allow `NEWS`, `OPINION`, `ANALYSIS`, `EXPLAINER`, `FEATURE`, `INTERVIEW`; contributor pages restrict external contributors to 5 formats and exclude `NEWS`. |
| Which editorial standard must be followed | `INACCESSIBLE` | `/standar-editorial`, `/kebijakan-ai` | Public pages admit they are only high-level summaries of an unpublished internal policy (`Piagam Redaksi Verax Press` / `pedoman internal yang lebih rinci`). Furthermore, machine docs (`/llms.txt`, `/llms-full.txt`, `/openapi.json`, `/.well-known/verax-agent.json`, `/capabilities`) omit links to `/standar-editorial` and `/kebijakan-ai`. |
| How to determine whether the standard is mandatory or recommended | `MISSING` | `/standar-editorial`, `/kebijakan-ai`, `/developers` | No formal normative taxonomy (`WAJIB` vs `DIANJURKAN` vs `OPSIONAL`). Prose mixes `"wajib"` and `"tidak boleh"` with purely descriptive mission statements. |
| How version changes are communicated | `MISSING` | `/standar-editorial`, `/kebijakan-ai`, `/api/internal/v1/capabilities` | Zero editorial version tags, effective dates, approval timestamps, or changelogs exist. Only `apiVersion: "1.0.0"` is exposed. |

---

## 5. Editorial Standard Discovery Results (Test 2)

**Test 2 Overall Status:** `FAIL`

| # | Evaluation Question | Status | Findings & Public Evidence |
|---|---|---|---|
| 1 | Can you discover the standard without knowing its internal filename? | `PARTIAL` | Public summary pages (`/standar-editorial`, `/kebijakan-ai`) are discoverable via website footer and `/sitemap.xml`, but **not** linked from `/llms.txt`, `/llms-full.txt`, `/.well-known/verax-agent.json`, `/openapi.json`, `/api/internal/v1/capabilities`, or `/developers` `<main>` body. The underlying master document (`Piagam Redaksi Verax Press`) has no public URL. |
| 2 | Can you retrieve the full document? | `NOT ACCESSIBLE` | `/standar-editorial` (`2,891` main chars) explicitly states: *"Ringkasan ini adalah versi publik dari kebijakan internal redaksi Verax Press."* `/kebijakan-ai` (`1,941` main chars) states: *"Versi internal yang lebih rinci memandu operasional redaksi."* Full rules are withheld. |
| 3 | Can you discover its version and effective status? | `FAIL` | No version string, revision date, or effective date exists on `/standar-editorial`, `/kebijakan-ai`, `/pedoman-kontributor`, `/kirim-tulisan`, or `/capabilities`. |
| 4 | Can you distinguish approved policies from proposed policies? | `FAIL` | No approval metadata or policy lifecycle state exists. Only a single sentence on `/standar-editorial` and `/keluhan` mentions that operational response deadlines are under legal review. |
| 5 | Can you identify non-negotiable requirements? | `PARTIAL` | Core system invariants are clear (`DRAFT` status, human approval, primary source link required, no fabricated sources/quotes, AI disclosure, right of reply). Format-specific and desk-specific non-negotiables cannot be identified because they are unpublished. |
| 6 | Can you distinguish `WAJIB`, `DILARANG`, `DIANJURKAN`, and `OPSIONAL`? | `FAIL` | None of the public pages define or apply a four-tier normative classification. |
| 7 | Can you discover which documents are mandatory for every assignment? | `FAIL` | No document manifest, index, or loading protocol exists publicly. |
| 8 | Can you discover how desk and format profiles should be selected? | `FAIL` | No desk or format profiles are exposed publicly; no selection mechanism exists. |
| 9 | Can you identify the correct document to read for a given assignment? | `FAIL` | Beyond matching the desk slug to `/desk/<slug>` (which holds one sentence) and matching `OPINION` to `/opini` (two sentences), no format/desk rulebook exists to select. |
| 10 | Can you detect when a standard or profile is outdated? | `FAIL` | No semantic version, hash, `lastUpdated` field, or changelog exists for editorial standards. Next.js HTML `ETag` changes on page rebuilds do not signal editorial policy versioning. |

---

## 6. Selective Context Loading Results (Test 3)

**Test 3 Overall Status:** `FAIL`  
Because Verax Press publishes no modular editorial KB, no manifest, and no desk/format profiles, **selective editorial context loading is non-functional for external clients**. For every assignment, an independent AI client must fetch the same baseline bundle of machine API specs and global policy HTML pages (`12` common documents), plus the target `/desk/<slug>` page (and `/opini` + `/syarat-ketentuan` for `OPINION`).

### Summary Across All Six Assignments

| Assignment | Desk & Format | Docs Retrieved | Raw Size (Bytes / Est. Tokens) | Extracted Text (Chars / Est. Tokens) | Sufficiency Verdict | Key Missing Editorial Instructions |
|---|---|---:|---:|---:|---|---|
| **A** | `hukum-keadilan` + `NEWS` | 13 | 561,870 B / ~140,410 tok | 47,092 chars / ~11,779 tok | `FAIL` | No `NEWS` format spec at all (`/kirim-tulisan` skips `NEWS`); no legal reporting rules (presumption of innocence, `tersangka`/`terdakwa`/`terpidana`, `inkracht` vs appeal, statutory citation rules). |
| **B** | `hukum-keadilan` + `OPINION` | 15 | 692,352 B / ~173,019 tok | 51,811 chars / ~12,960 tok | `FAIL` | No `OPINION` structure/length/tone spec beyond 2 sentences; no `author`/`byline` field in `IngestionPayload` schema to attribute the author's perspective; no legal-premise verification checklist. |
| **C** | `teknologi-kebijakan` + `ANALYSIS` | 13 | 562,145 B / ~140,479 tok | 47,114 chars / ~11,784 tok | `FAIL` | No `ANALYSIS` methodology/structure spec; no `teknologi-kebijakan` desk rules on vendor-claim scrutiny, benchmark evaluation, prototype vs production distinction, or AI governance analysis. |
| **D** | `nasional-publik` + `EXPLAINER` | 13 | 561,971 B / ~140,435 tok | 47,101 chars / ~11,781 tok | `FAIL` | No `EXPLAINER` structure/Q&A/clarity rules beyond 1 sentence on `/kirim-tulisan`; no `nasional-publik` desk rules on distinguishing policy announcements from `juknis`/budget realization. |
| **E** | `nasional-publik` + `FEATURE` | 13 | 561,971 B / ~140,435 tok | 47,101 chars / ~11,781 tok | `PARTIAL` / `FAIL` | Anti-fabrication & field-reporting prohibition exists on `/kebijakan-ai` (`"tidak cukup disusun dari kompilasi sumber daring"`), so refusal is derivable; however, no `FEATURE` narrative structure, sourcing minimum, or remote-community coverage protocol exists. |
| **F** | `teknologi-kebijakan` + `INTERVIEW` | 13 | 562,145 B / ~140,479 tok | 47,114 chars / ~11,784 tok | `PARTIAL` / `FAIL` | Quote accuracy & anti-fabrication rules exist on `/standar-editorial` & `/kebijakan-ai`, so fabricating Q&A is prohibited; however, no explicit `INTERVIEW` format spec defines transcript/audio verification or secondary-summary rejection rules. |

### Per-Assignment Applied Rules & Contradictions (Items 6 to 10)
- **Research Rules Applied (Common across A through F, derived from `/standar-editorial`, `/kebijakan-ai`, `/llms-full.txt`):** Prioritize primary/official sources (`PRIMARY`, `OFFICIAL`, `DOCUMENT`, `DATA`, `INTERVIEW`); capture title, publisher, URL, `publishedAt`, `accessedAt`, `supports`, and `isKeySource`; offer right of reply (`Keberimbangan`) before making adverse claims or document outreach attempts; never treat AI output as factual evidence.
- **Drafting Rules Applied:** Plain, clear Indonesian (`/kirim-tulisan`: *"bahasa Indonesia yang bernas, teratur, dan tidak berputar-putar"*); structured JSON blocks (`paragraph`, `heading` H2/H3, `quote` with `attribution`, `list`); exact direct quotes (`/standar-editorial`); no original-value-free paraphrasing of other media (`/kebijakan-ai`); no fabricated sources, quotes, documents, or scenes (`/kebijakan-ai`).
- **Self-Review Rules Applied:** Verify every key claim has a `sources` entry (`isKeySource: true` for core pillars); verify `aiInvolvement` (`none`, `assistive`, `substantive`) and provide `aiUsageNote` if `substantive`; confirm no auto-publish assumption (`DRAFT` output); flag gaps in `verificationNotes`.
- **Contradictions / Ambiguities Encountered per Assignment:**
  - **Assignment A:** `/kirim-tulisan` says `NEWS` is closed to external submissions, while `/developers` and `/api/internal/v1/capabilities` explicitly enable `NEWS` for API agents without providing a `NEWS` style guide.
  - **Assignment B:** `/standar-editorial` requires clear author attribution (`"Oleh"`), and `/opini` attributes opinion to the author (`"tanggung jawab penulis"`), yet `IngestionPayload` in `/openapi.json` has **no `author` field**, only `agentId`.
  - **Assignment C, D, E, F:** `/kirim-tulisan` bans drafts substantively generated by AI (`"Naskah yang dihasilkan seluruhnya oleh generator teks otomatis akan ditolak"`), whereas `/kebijakan-ai` and `/openapi.json` permit `aiInvolvement: "substantive"` if disclosed via `aiUsageNote`.

---

## 7. Six Assignment Simulation Results (Test 4: Outputs)

All six outputs below are **HYPOTHETICAL WRITING DEMONSTRATIONS** created without live reporting data. No names, court numbers, dates, statutory citations, statistics, or quotations are invented.

### Assignment A: `hukum-keadilan` + `NEWS`
**Scenario:** A court has issued a decision and one party disputes its interpretation.  
**Label:** `HYPOTHETICAL WRITING DEMONSTRATION: NOT PUBLISHABLE (NO PRIMARY SOURCES SUPPLIED)`

- **Proposed Editorial Angle:** Report the operative ruling (`amar putusan`) of the court strictly against the official court document, separate the court's legal reasoning (`pertimbangan hukum`) from the disputing party's stated interpretation, and identify whether legal remedies (`upaya hukum`) remain open.
- **Central Editorial Question:** What did the court actually decide in its written ruling, on what legal findings did it rely, and which specific point of the ruling is being contested by the disputing party?
- **Brief Research Plan:**
  1. Obtain the official written judgment or certified summary (`salinan/petikan putusan`) from the court registry or official court directory (`PRIMARY` / `OFFICIAL`).
  2. Verify the procedural posture (first instance vs appeal vs cassation vs final/binding `inkracht`).
  3. Collect official on-the-record statements from both the disputing party and the opposing party/court spokesperson to satisfy `Keberimbangan` (`/standar-editorial`).
  4. Cross-check referenced statutory articles directly against official gazette texts.
- **Appropriate Headline Example:** `[Nama Pengadilan] Putuskan [Objek Sengketa], [Pihak Pemohon/Termohon] Persoalkan Penafsiran [Poin Amar]`
- **Short Illustrative Opening:**  
  `Majelis hakim [Nama Pengadilan] dalam putusan nomor [Nomor Perkara] menyatakan [ringkasan amar berdasarkan salinan putusan]. [Nama Pihak] menyatakan keberatan atas penafsiran bagian [poin spesifik] dan menilai [ringkasan pernyataan resmi pihak terkait], sementara status perkara saat ini masih berada pada tahap [tingkat peradilan / tenggat upaya hukum].`
- **Required Narrative Voice:** Neutral, attribution-disciplined, strictly factual third-person news prose. Zero editorial adjectives or legal conclusions beyond what appears in the court record. Clearly separates allegations (`dalil`/`tuntutan`), judicial findings (`pertimbangan majelis`), and final binding status (`inkracht` vs `belum berkekuatan hukum tetap`).
- **Factual & Reporting Gaps Preventing Publication:**
  1. No official court decision document (`salinan putusan` or verified court registry record) supplied.
  2. Exact procedural stage (`tingkat pertama`, `banding`, `kasasi`, or `inkracht`) is unknown.
  3. Verbatim, attributed statements from both disputing and responding parties (right of reply) are absent.
  4. Specific statutory provisions and date of pronouncement are unavailable.

---

### Assignment B: `hukum-keadilan` + `OPINION`
**Scenario:** An author argues that a judicial decision reveals a need for legislative reform.  
**Label:** `HYPOTHETICAL WRITING DEMONSTRATION: NOT PUBLISHABLE (NO VERIFIED RULING OR ATTRIBUTED HUMAN AUTHOR)`

- **Proposed Editorial Angle:** Using a specific judicial decision as an empirical legal case study, the named author argues that existing statutory ambiguity forces inconsistent or inadequate judicial outcomes and proposes targeted statutory revision by lawmakers.
- **Central Editorial Question:** Which concrete statutory gap or ambiguity exposed in the court's ruling cannot be resolved through judicial interpretation alone and requires legislative amendment?
- **Brief Research Plan:**
  1. Verify the exact text of the judicial decision and statutory provisions cited as the factual premise of the author's argument (`OFFICIAL` / `PRIMARY`).
  2. Confirm whether pending appeals or existing implementing regulations already address the perceived gap.
  3. Verify the external author's identity, credentials, and disclosed conflicts of interest.
  4. Verify whether the Verax API allows attributing the named external author (currently blocked by missing `author` field in `IngestionPayload`).
- **Appropriate Headline Example:** `Celah Regulasi di Balik Putusan [Nomor/Perkara]: Mengapa Revisi [Nama Undang-Undang] Mendesak`
- **Short Illustrative Opening:**  
  `[Perspektif Penulis (Atribusi Wajib: Nama Penulis, Afiliasi)] Putusan [Nama Pengadilan] dalam perkara [Nama/Nomor Perkara] memperlihatkan batas kemampuan tafsir hakim ketika berhadapan dengan rumusan [Pasal/Undang-Undang yang Berlaku] yang multitafsir. Di atas hukum positif yang saat ini mewajibkan [ketentuan berlaku terverifikasi], pembentuk undang-undang perlu menimbang perubahan pada [ruang lingkup usulan reformasi legislatif] agar kepastian hukum tidak bergantung pada penafsiran kasuistis.`
- **Required Narrative Voice:** Reasoned, explicitly attributed first- or third-person analytical persuasion representing the author's personal view (`/opini`, `/syarat-ketentuan`). Sharply distinguishes verifiable existing law (`lex lata`) from normative policy proposals (`lex ferenda`), avoiding personal attacks or unsupported legal claims.
- **Factual & Reporting Gaps Preventing Publication:**
  1. Verified primary court ruling and exact statutory articles underlying the premise are absent.
  2. No verified human author identity, biography, or conflict-of-interest disclosure is provided (and `IngestionPayload` lacks an `author` field).
  3. Legislative history or current parliamentary bill status (`Prolegnas`) needed to contextualize reform feasibility is missing.

---

### Assignment C: `teknologi-kebijakan` + `ANALYSIS`
**Scenario:** A government announces an AI-powered public-service system using performance claims provided by its vendor.  
**Label:** `HYPOTHETICAL WRITING DEMONSTRATION: NOT PUBLISHABLE (NO TECHNICAL SPECS, BENCHMARKS, OR PROCUREMENT DOCS)`

- **Proposed Editorial Angle:** Dissect the gap between vendor-supplied accuracy/efficiency claims and verifiable technical architecture, independent validation, deployment maturity (prototype vs production), and public-law accountability mechanisms.
- **Central Editorial Question:** Under what verifiable technical conditions do the vendor's performance claims hold, is the system a pilot or live deployment affecting citizens' rights, and what independent audit and legal safeguards govern erroneous automated decisions?
- **Brief Research Plan:**
  1. Obtain official government procurement specifications, ministerial decrees, or public announcements detailing scope, budget, and legal basis (`OFFICIAL`).
  2. Request technical documentation: model architecture, training/evaluation dataset representativeness, latency/error-rate definitions, and whether independent third-party testing exists (`DOCUMENT` / `DATA`).
  3. Verify deployment status (proof-of-concept/pilot vs mandatory production rollout) and human-in-the-loop fallback procedures (`INTERVIEW` / `OFFICIAL`).
  4. Map compliance obligations against Indonesia's data protection and electronic-system governance frameworks (verified against current enacted text before citing).
- **Appropriate Headline Example:** `Menguji Klaim Vendor Sistem AI Layanan Publik: Antara Prototipe, Bukti Audit, dan Akuntabilitas Prosedural`
- **Short Illustrative Opening:**  
  `Pengumuman penerapan sistem kecerdasan buatan pada layanan [sektor layanan publik] bertumpu pada angka performa yang dirilis oleh penyedia teknologi, bukan hasil evaluasi independen di lapangan. Tanpa keterbukaan mengenai apakah sistem masih berada pada tahap uji coba terbatas atau sudah menentukan hak warga secara langsung, klaim akurasi vendor belum menjawab persoalan mendasar: bagaimana mekanisme kerja model diuji pada data nyata dan siapa yang bertanggung jawab ketika keputusan otomatis keliru.`
- **Required Narrative Voice:** Evidence-led, technically precise, skeptical of marketing metrics, and non-sensational. Separates architectural mechanisms, empirical evaluation limits, and regulatory/procedural consequences without repeating promotional claims as established fact.
- **Factual & Reporting Gaps Preventing Publication:**
  1. Official announcement text, contracting agency identity, and procurement documents are unavailable.
  2. Vendor technical whitepaper, benchmark methodology, sample sizes, and false-positive/false-negative metrics are absent.
  3. Independent audit reports, Data Protection Impact Assessment (`DPIA`), and deployment stage confirmation are missing.
  4. Right-of-reply inquiries to both the government agency and vendor have not been conducted.

---

### Assignment D: `nasional-publik` + `EXPLAINER`
**Scenario:** A new subsidy policy has been announced, but its implementation details are incomplete.  
**Label:** `HYPOTHETICAL WRITING DEMONSTRATION: NOT PUBLISHABLE (NO OFFICIAL ANNOUNCEMENT OR POLICY TEXT)`

- **Proposed Editorial Angle:** Clarify what the government has formally announced versus which operational parameters (eligibility rules, disbursement mechanism, budget allocation, and implementing regulations) remain unpublished or undecided.
- **Central Editorial Question:** What concrete commitments exist in the official subsidy announcement today, which technical rules are still missing, and what practical checkpoints determine when eligible citizens can actually receive the benefit?
- **Brief Research Plan:**
  1. Retrieve the official press release, ministerial statement, or draft regulation (`OFFICIAL` / `PRIMARY`).
  2. Check state budget (`APBN`) or implementing ministry regulations (`juknis` / `Peraturan Menteri`) to verify whether funds and legal instruments exist (`DOCUMENT` / `DATA`).
  3. Document explicit open questions submitted to the responsible ministry regarding missing eligibility thresholds and rollout timelines.
- **Appropriate Headline Example:** `Apa yang Sudah Diketahui dan Belum Jelas dari Kebijakan Subsidi [Sektor/Program]`
- **Short Illustrative Opening:**  
  `Pemerintah mengumumkan rencana pemberian subsidi [jenis subsidi] untuk [kelompok sasaran umum], tetapi hingga pengumuman tersebut disampaikan, aturan teknis penyaluran dan kriteria penerima secara terperinci belum diterbitkan. Artikel penjelas ini memisahkan ketentuan yang sudah tercantum dalam pernyataan resmi dari aspek operasional yang masih menunggu petunjuk teknis.`
- **Required Narrative Voice:** Structured, plain-language, pedagogic, and rigorously transparent about uncertainty. Explicitly flags knowledge boundaries rather than smoothing over gaps or speculating on unannounced eligibility rules.
- **Factual & Reporting Gaps Preventing Publication:**
  1. Primary text/transcript of the official policy announcement and announcing authority are absent.
  2. Legal instrument (`Perpres` / `Permen` / `juknis`), budget ceiling, beneficiary registry source (`DTKS`/`P3KE` or equivalent verified source), and timeline are unpublished or unsupplied.
  3. Ministry clarification on interim status has not been obtained.

---

### Assignment E: `nasional-publik` + `FEATURE`
**Scenario:** A story about a remote community experiencing difficulties accessing public services, but no first-hand reporting materials have been supplied.  
**Label:** `HYPOTHETICAL WRITING DEMONSTRATION: DRAFT REFUSED PENDING FIELD REPORTING`

- **Proposed Editorial Angle:** Document the lived structural barriers faced by residents of `[Nama Wilayah Terpencil]` when accessing essential public services, grounded strictly in on-site observation, resident interviews, and local service-capacity records.
- **Central Editorial Question:** How do geographic distance, infrastructure deficits, and administrative requirements interact in daily life for residents seeking `[layanan publik spesifik]`, and how do local authorities account for the service gap?
- **Brief Research Plan:**
  1. **Mandatory prerequisite:** Conduct or commission original field reporting (site visits, direct interviews with affected residents, frontline service workers, and local officials; documented consent).
  2. Collect administrative records on service-facility coverage, staffing, and budget allocation (`OFFICIAL` / `DATA`).
  3. Capture verifiable documentary/photo assets with creator and license metadata (`ImageMetadata`) and obtain official agency responses (`Keberimbangan`).
- **Appropriate Headline Example:** `[Ditunda hingga Peliputan Lapangan] Akses Layanan Publik di [Wilayah]: Menelusuri Jarak Administrasi dan Realitas Warga`
- **Short Illustrative Opening (Non-Fabricated Structural Placeholder):**  
  `[CATATAN REDAKSI / PENUNDAAN DRAF: Sesuai Kebijakan AI Verax Press, naskah fitur mengenai pengalaman warga di wilayah terpencil tidak boleh disusun hanya dari kompilasi sumber daring dan tidak boleh merekonstruksi adegan, pengamatan indrawi, atau kesaksian warga tanpa materi peliputan primer. Pembuka naratif baru dapat ditulis setelah reporter lapangan menyerahkan catatan observasi lokasi, transkrip wawancara warga, serta data fasilitas layanan setempat.]`
- **Required Narrative Voice:** Grounded literary-journalistic narrative anchored in verified sensory observation and human testimony. **Refuses to invent scenes, weather, travel times, emotional states, or composite characters** when no reporting notes exist (enforcing `/kebijakan-ai`: *"AI tidak boleh membuat narasumber, kutipan, dokumen, atau peristiwa yang tidak ada. Konten yang memerlukan peliputan lapangan tidak cukup disusun dari kompilasi sumber daring."*).
- **Factual & Reporting Gaps Preventing Publication:**
  1. Zero field reporting notes, scene observations, or geographic/travel documentation supplied.
  2. Zero primary interviews with affected residents, frontline staff, or local government authorities.
  3. Zero local service-availability data or budget records.
  4. Cannot legally or ethically proceed past a reporting-plan stage without human field reporting.

---

### Assignment F: `teknologi-kebijakan` + `INTERVIEW`
**Scenario:** The only available material is a secondary news article summarizing an interview. The original transcript and recording are unavailable.  
**Label:** `HYPOTHETICAL WRITING DEMONSTRATION: INTERVIEW DRAFT REFUSED WITHOUT PRIMARY TRANSCRIPT/RECORDING`

- **Proposed Editorial Angle:** Assess the interviewee's stated technological or policy position strictly once primary verbatim verification (original transcript, audio/video recording, or a newly conducted direct Verax Press interview) is secured.
- **Central Editorial Question:** What exact claims, policy prescriptions, and technical caveats did `[Nama Narasumber]` state on the record, and can Verax Press independently verify the verbatim accuracy of those statements?
- **Brief Research Plan:**
  1. **Mandatory prerequisite:** Request the original audio/video recording or authorized verbatim transcript from the primary publisher/interviewee, OR contact `[Nama Narasumber]` directly for an original Verax Press interview (`INTERVIEW` primary source).
  2. Cross-check any factual, regulatory, or statistical assertions made by the interviewee against primary documents (`DOCUMENT` / `DATA`).
  3. Only if primary verbatim access fails and the topic remains newsworthy, downgrade format from `INTERVIEW` to a secondary-attributed `NEWS` or `ANALYSIS` item that explicitly attributes the third-party media outlet without pretending to be a Q&A interview (per `/kebijakan-ai` rule against mere paraphrasing of other media).
- **Appropriate Headline Example:** `[Ditunda: Menunggu Verifikasi Primer] Wawancara [Nama Narasumber] mengenai [Topik Kebijakan Teknologi]`
- **Short Illustrative Opening (Non-Fabricated Refusal Frame):**  
  `[CATATAN PROSES: Draf berformat INTERVIEW tidak dapat disusun karena bahan yang tersedia hanya berupa artikel berita sekunder yang merangkum wawancara, tanpa rekaman maupun transkrip asli. Sesuai Standar Editorial dan Kebijakan AI Verax Press, kutipan langsung harus sesuai dengan sumber aslinya dan agen AI dilarang merekonstruksi pertanyaan wawancara atau jawaban narasumber dari ringkasan pihak ketiga.]`
- **Required Narrative Voice:** Verbatim Q&A fidelity (`INTERVIEW`) or strict secondary attribution if downgraded. **Explicitly refuses to reverse-engineer interview questions, reconstruct dialogue, or present indirect summaries inside quotation marks** (enforcing `/standar-editorial`: *"Kutipan langsung harus sesuai dengan sumbernya"* and `/kebijakan-ai`: *"AI tidak boleh membuat narasumber, kutipan, dokumen, atau peristiwa yang tidak ada"*).
- **Factual & Reporting Gaps Preventing Publication:**
  1. Original recording and verbatim transcript do not exist in the provided materials.
  2. Interviewee identity, context, date of original interview, and consent/verification are unconfirmed.
  3. No primary interview conducted by Verax Press exists to justify an `INTERVIEW` format submission.

---

## 8. Writing Behavior and Persona Distinction Results

**Status:** `FAIL` (Persona and desk/format specialization relies on external agent general knowledge rather than Verax-provided rules)

1. **What Verax's public docs actually differentiate:**
   - **Anti-fabrication & field-work boundary (Assignments E & F):** `/kebijakan-ai` and `/standar-editorial` explicitly forbid fabricating quotes, sources, or events, and explicitly forbid compiling field-dependent content solely from online sources. This reliably drives the refusal behaviors in E and F.
   - **Opinion vs News separation (Assignments A & B):** `/opini` and `/syarat-ketentuan` state that Opini presents personal arguments rather than field news reporting.
2. **Where the persona architecture fails to guide behavior:**
   - **Desk voice & rigor (Legal vs Tech vs Public Policy):** Nothing in public Verax docs teaches an external AI client how `hukum-keadilan` handles presumption of innocence or `inkracht`, how `teknologi-kebijakan` interrogates vendor benchmarks, or how `nasional-publik` treats `juknis`/budget rules.
   - **Format mechanics (`NEWS` vs `ANALYSIS` vs `EXPLAINER`):** `NEWS` has zero editorial definition anywhere in public docs. `ANALYSIS` and `EXPLAINER` each have only one generic sentence on `/kirim-tulisan`. Without external journalistic heuristics supplied by the AI client itself, an external agent following only Verax's published text would produce nearly indistinguishable analytical essays across Assignments A, C, and D.
   - **Zero published exemplars:** Because every public desk and `/opini` shows `"Belum ada artikel terbit"`, an AI agent cannot perform few-shot style calibration from live Verax journalism.

---

## 9. Source and Verification Usability (Test 5)

**Test 5 Overall Status:** `PARTIAL`

| Requirement | Usability Status | Public Documentation Evidence & Technical/Editorial Gaps |
|---|---|---|
| Acceptable sources | `PARTIAL` | `/standar-editorial` prioritizes official documents, data, and direct interviews; `/kebijakan-ai` bars AI from ever being a fact source and bars superficial media paraphrasing. However, **the 6 OpenAPI `sourceType` enums (`PRIMARY`, `SECONDARY`, `DOCUMENT`, `INTERVIEW`, `DATA`, `OFFICIAL`) are never defined or differentiated**. |
| Source priority | `AMBIGUOUS` | `/standar-editorial` says `"mengutamakan sumber primer"`, yet `/openapi.json` defaults `sourceType` to `"SECONDARY"` and accepts any URL without enforcing source-tier rules or defining when `SECONDARY` is acceptable. |
| Claim-level evidence | `AMBIGUOUS` | `SourceReference.supports` (`string`, max `600` chars) exists as an optional free-text field in `/openapi.json` and `/llms-full.txt`, not even required in the schema, and has no structural link to `content[]` block indices. |
| Identifying key sources | `AMBIGUOUS` | `SourceReference.isKeySource` (`boolean`, default `false`) is documented in `/openapi.json`, and `/standar-editorial` states articles cannot publish if any key source is unverified. However, **no guidance defines which sources qualify as key sources or whether at least one `isKeySource: true` is mandatory**. |
| Unavailable documents | `MISSING` | `SourceReference.url` requires a valid public `uri` (`format: "uri"`). **No instruction explains how to cite offline court files, physical archives, paywalled journals, or unobtainable government documents** without failing URL validation. |
| Conflicting evidence | `MISSING` | Neither `/standar-editorial` nor `/llms-full.txt` defines how conflicting primary sources or disputed claims should be structured in `content`, `sources`, or `verificationNotes`. |
| Recording verification limitations | `PARTIAL` | `/standar-editorial` requires openly explaining failed right-of-reply efforts in the article, and `/llms-full.txt` provides optional `verificationNotes` (max `3000` chars). Yet there is no template or required structure for `verificationNotes` or partial-verification disclosure. |
| Avoiding fabricated quotes | `CLEAR` | Explicitly prohibited in `/kebijakan-ai` (`"tidak boleh membuat narasumber, kutipan..."`) and `/standar-editorial` (`"Kutipan langsung harus sesuai dengan sumbernya"`), backed by structured `quote` blocks with `attribution`. |
| Disclosing AI involvement | `CONTRADICTORY` / `PARTIAL` | Clear 3-level enum (`none`, `assistive`, `substantive`) in `/openapi.json`, `/standar-editorial`, `/kebijakan-ai`. Gaps: OpenAPI does not enforce `aiUsageNote` conditionally when `aiInvolvement == "substantive"`; boundary between `assistive` and `substantive` is vague; `/kirim-tulisan` contradicts API docs by disallowing fully AI-drafted manuscripts. |
| Mandatory human verification | `CLEAR` | Unambiguously stated across `/standar-editorial`, `/kebijakan-ai`, `/developers`, `/llms.txt`: all submissions start as `DRAFT`, all sources start `UNVERIFIED`, and Pemimpin Redaksi holds sole publication authority. |

---

## 10. Technical Submission Documentation Results (Test 6)

**Test 6 Overall Status:** `PARTIAL`

### Checklist of Technical Specifications

| Area | Status | Evidence & Findings |
|---|---|---|
| Authentication mechanism | `PARTIAL` | `Bearer <CLIENT_ID>.<CLIENT_SECRET>` clearly shown across `/developers`, `/llms.txt`, `/llms-full.txt`, `/openapi.json`, `/.well-known/verax-agent.json`. Credential acquisition & rotation workflow is undocumented. |
| Required headers | `CLEAR` | `Authorization: Bearer <CLIENT_ID>.<CLIENT_SECRET>` and `Content-Type: application/json`. |
| Required payload structure | `PARTIAL` | `IngestionPayload` required fields: `title` (`8-200`), `desk`, `format`, `content` (`minItems: 1`), `sources` (`1-40`), `aiInvolvement`, `agentId` (`2-120`), `idempotencyKey` (`8-128`). Optional: `deck` (`<=400`), `images` (`<=20`), `tags` (`<=10`), `verificationNotes` (`<=3000`), `aiUsageNote` (`<=1000`). **Gaps:** Missing `author`/`byline` field; no conditional OpenAPI rule requiring `aiUsageNote` when `aiInvolvement: "substantive"`; no `tags` per-item length or format rule. |
| Supported content blocks | `PARTIAL` | 4 types (`paragraph`, `heading` level `2`/`3`, `quote` with `attribution`, `list` with `items`). **Gap:** OpenAPI `required: ["type"]` omits type-specific required properties (e.g., `text` for paragraph/quote, `level`+`text` for heading, `items` for list), and no per-block length limits are documented. |
| Source-reference format | `PARTIAL` | `SourceReference` requires `title` (`3-300`) and `url` (`uri`, `<=2000`). **Contradiction:** `/standar-editorial` claims all references record publisher, published date, and accessed date, yet `publisher`, `publishedAt`, `accessedAt`, `supports`, `isKeySource`, and `sourceType` are optional in OpenAPI. |
| Required article metadata | `PARTIAL` | `title`, `desk`, `format`, `tags`, `deck`, `images` (`ImageMetadata`: `url` required; `creator`, `license`, `permissionEvidence`, `caption` optional). **Gap:** `/llms-full.txt` references `ImageMetadata` without defining its fields! An agent reading only `/llms-full.txt` cannot construct `images` without fetching `/openapi.json`. |
| Required disclosure fields | `PARTIAL` | `aiInvolvement`, `aiUsageNote`, `agentId`, `verificationNotes` documented. |
| Validation procedure | `PARTIAL` | `POST /api/internal/v1/ai-submissions/validate` documented as side-effect-free dry run returning `ValidationResponse` (`valid`, `desk`, `warnings`, `requestId`). **Gap:** Requires full `IngestionPayload` including `idempotencyKey`, without clarifying whether `/validate` ignores or records `idempotencyKey`, and OpenAPI omits `401` and `429` responses on `/validate`. |
| Idempotency requirements | `PARTIAL` | `idempotencyKey` (`8-128` chars) returns `200` with `idempotentReplay: true` on identical replay or `409 IDEMPOTENCY_CONFLICT` on payload mismatch. **Gap:** Key TTL (expiration window) and scoping (per client vs per `agentId`) are undocumented. |
| Submission response format | `PARTIAL` | Documented in OpenAPI (`SubmissionReceipt`: `submissionId`, `articleId`, `status`, `receivedAt`, `idempotentReplay`, `requestId`), **but omitted from `/developers` and `/llms-full.txt`** (neither shows response JSON examples). |
| Submission status retrieval | `FAIL` | `GET /api/internal/v1/ai-submissions/{submissionId}` returns `SubmissionStatusResponse` (`submissionStatus`, `editorialStatus`, `editorialDecision: {status, isPublished}`), **but enum values are completely undocumented**, **no revision-notes or rejection-reason fields exist**, OpenAPI omits `401`/`429`, and unauthenticated `GET /api/internal/v1/ai-submissions/blackbox-probe` verified `401` `{"error":"Header Authorization Bearer diperlukan.","code":"UNAUTHORIZED","requestId":"req_d240128991b1a417eef3cb02"}`. |
| Error handling | `PARTIAL` | `ErrorResponse` schema (`error`, `code`, `requestId`, `details[]`) is consistent. **Discrepancy:** `/llms-full.txt` lists 9 error codes (`400`, `401`, `404`, `409`, 3x `422`, `429`, `500`), whereas `/developers` lists only 6 (omits `VALIDATION_ERROR` from the list despite using it in its JSON snippet, and omits `DESK_REJECTED` and `INTERNAL_ERROR`). |
| Rate or payload limits | `PARTIAL` | `/capabilities` exposes `rateLimitPerMinute: 12`, `maxTitleLength: 200`, `maxSourcesCount: 40`, `maxImagesCount: 20`. **Gaps:** Rate limit scope (per client vs per IP vs shared across endpoints) is undocumented; max total request body size, max `content` block count, and `Retry-After` header in OpenAPI 429 spec are missing. |
| Human editorial review | `CLEAR` | Fully documented as mandatory human gate (`DRAFT` -> editor verification -> Pemimpin Redaksi approval). |

### Locally Constructed Sample Payload (Assignment C, NOT Transmitted)

```json
{
  "title": "Uji Kesiapan Tata Kelola Sistem AI Layanan Publik",
  "deck": "Meninjau transparansi uji teknis dan perlindungan hak warga di balik klaim vendor.",
  "desk": "teknologi-kebijakan",
  "format": "ANALYSIS",
  "content": [
    {
      "type": "paragraph",
      "text": "Contoh kerangka paragraf pembuka analisis kebijakan teknologi berbasis dokumen resmi dan evaluasi teknis independen."
    },
    {
      "type": "heading",
      "level": 2,
      "text": "Kesenjangan antara Klaim Vendor dan Bukti Pengujian"
    },
    {
      "type": "list",
      "items": [
        "Keterbukaan cakupan data uji dan batas kesalahan sistem.",
        "Kepastian status penerapan antara uji coba terbatas dan layanan aktif."
      ]
    }
  ],
  "sources": [
    {
      "title": "Contoh Dokumen Kebijakan Resmi (Placeholder Hipotetis)",
      "publisher": "Kementerian Terkait",
      "url": "https://contoh.go.id/dokumen-kebijakan.pdf",
      "sourceType": "OFFICIAL",
      "publishedAt": "2026-10-01T00:00:00Z",
      "accessedAt": "2026-11-12T00:00:00Z",
      "supports": "Dasar pengumuman sistem dan ketentuan tata kelola layanan.",
      "isKeySource": true
    }
  ],
  "tags": ["kebijakan-ai", "layanan-publik"],
  "verificationNotes": "Simulasi lokal tanpa sumber terverifikasi; klaim teknis memerlukan dokumen pengadaan dan audit independen.",
  "aiInvolvement": "substantive",
  "aiUsageNote": "Agen AI menyusun kerangka awal analisis untuk ditelaah oleh penyunting manusia.",
  "agentId": "external-policy-agent-v1",
  "idempotencyKey": "sim-assign-c-20261112-0001"
}
```

**Completeness Check on Local Sample Payload:** Constructing this payload immediately surfaced four client uncertainties: (1) if a named human analyst co-authored it, there is no `author` field; (2) `tags` format (`slug` vs title-case) is unspecified; (3) whether `quote.attribution` or `SourceReference.supports` is hard-required by server validation beyond OpenAPI's relaxed `required` list cannot be known without executing `POST /validate`; and (4) `images` schema is completely invisible in `/llms-full.txt` and `/developers`, only discoverable in `/openapi.json`.

---

## 11. Failure and Recovery Results (Test 7)

| Failure Scenario | Recoverable via Public Docs? | Status | Client Behavior & Recovery Gaps |
|---|---|---|---|
| Assigned desk is not active | Yes | `PASS WITH RESERVATIONS` | `/llms-full.txt` documents `422 DESK_REJECTED` (missing from `/developers` list), and `GET /api/internal/v1/capabilities` provides live active desks. |
| Article format is unsupported | Yes | `PASS` | `422 FORMAT_REJECTED` documented; `GET /api/internal/v1/capabilities` exposes `allowedFormats`. |
| Editorial document is unavailable | No | `FAIL` | Full `Piagam Redaksi` and detailed AI/desk/format guidelines have no public URL or fallback endpoint. |
| Required standard version cannot be identified | No | `FAIL` | No editorial version exists anywhere; an agent must guess or skip version pinning. |
| Source URL cannot be accessed (paywall/offline/404) | No | `FAIL` | `SourceReference.url` requires a valid `uri`, and no documentation explains how to represent offline judicial files or temporarily unreachable official PDFs without risking rejection or unsafe substitution. |
| Required payload field is undocumented | Partially | `PARTIAL` | `422 VALIDATION_ERROR` returns `details[].path/code/message`, helping trial-and-error on `POST /validate`, though missing `author` attribution or conditional `aiUsageNote` rules remain ambiguous. |
| Submission credential is invalid | Partially | `PARTIAL` | Observed `401 UNAUTHORIZED` JSON on GET probe. Recovery says contact Pemimpin Redaksi at Meja Redaksi Studio, yet **no dedicated developer email, portal, or self-service rotation endpoint exists** (and `/kontak` points to `/keluhan`). |
| Validation error is returned | Partially | `PARTIAL` | `details[]` format is documented in `/llms-full.txt`, `/openapi.json`, and `/developers`, though `details[].code` values (`TOO_SHORT`, `INVALID_URL`, etc.) are not enumerated. |
| Article is rejected or returned for revision | **No** | `FAIL` | **Critical workflow break:** `SubmissionStatusResponse` exposes no documented enum for `submissionStatus`/`editorialStatus`/`editorialDecision.status`, **no revision comments or rejection reason field**, and **no `PATCH`/`PUT` endpoint to submit a revised version**. |
| Editorial standard changes after caching | No | `FAIL` | No editorial policy version, `ETag` semantic contract, RSS/feed, or webhook exists to notify or inform cached agents of standard updates. |

---

## 12. Context Efficiency Measurements (Test 8)

### Per-Stage Breakdown (Derived from Exact Wire Measurements)

| Workflow Stage | Files Retrieved (Representative Assignment) | Raw Size (Bytes) | Raw Est. Tokens | Extracted Main Chars | Extracted Main Lines | Extracted Est. Tokens | Notes on Overhead & Necessity |
|---|---|---:|---:|---:|---:|---:|---|
| **1. Assignment Discovery** | `/llms.txt`, `/.well-known/verax-agent.json`, `/api/internal/v1/capabilities`, `/sitemap.xml`, `/tentang` | 93,799 | 23,440 | 10,253 | 172 | 2,565 | `/tentang` (`88,090 B` raw HTML -> `4,544` text chars) and `/sitemap.xml` are forced because machine docs omit `/standar-editorial` and desk descriptions. |
| **2. Research** | `/standar-editorial`, `/kebijakan-ai`, `/llms-full.txt`, `/openapi.json` | 152,109 | 38,002 | 19,524 | 173 | 4,883 | `90%+` of `/standar-editorial` and `/kebijakan-ai` bytes are HTML/RSC boilerplate. |
| **3. Drafting (A, C, D, E, F)** | `/standar-editorial`, `/kebijakan-ai`, `/kirim-tulisan`, `/pedoman-kontributor`, `/desk/<slug>` | ~351,148 | ~87,744 | ~13,090 | 183 | ~3,275 | `/kirim-tulisan` + `/pedoman-kontributor` add ~`154 KB` raw HTML (`7,973` text chars) mostly aimed at human 18+ signup, just to read 5 one-line format summaries. |
| **3b. Drafting (Assignment B: Opinion)** | Same as Stage 3 + `/opini` + `/syarat-ketentuan` | 481,630 | 120,353 | 17,809 | 230 | 4,456 | Adds `/opini` (`59.7 KB` raw -> `481` text chars) and `/syarat-ketentuan` (`70.7 KB` raw -> `4,238` text chars). |
| **4. Self-Assessment** | `/standar-editorial`, `/kebijakan-ai`, `/llms.txt` | 139,478 | 34,844 | 6,893 | 102 | 1,725 | No structured checklist exists; agent re-reads prose summaries. |
| **5. API Submission** | `/llms-full.txt`, `/openapi.json`, `/developers`, `/api/internal/v1/capabilities` | 117,638 | 29,405 | 24,464 | 324 | 6,118 | `/developers` (`102.2 KB` raw -> `9,057` text chars) largely duplicates `/llms-full.txt` and `/openapi.json`. |

### End-to-End Deduplicated Load per Assignment

| Assignment | Unique Docs | Raw Bytes | Raw Chars | Raw Est. Tokens | Extracted Text Lines | Extracted Text Chars | Extracted Est. Tokens | Unnecessary / Overlapping Docs Loaded |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| **A (`hukum-keadilan` + `NEWS`)** | 13 | 561,870 | 561,620 | 140,410 | 678 | 47,092 | 11,779 | `/kirim-tulisan`, `/pedoman-kontributor`, `/developers`, `/sitemap.xml` (~258 KB raw / ~4,713 text tokens of overlap or human-signup noise) |
| **B (`hukum-keadilan` + `OPINION`)** | 15 | 692,352 | 692,054 | 173,019 | 725 | 51,811 | 12,960 | Same + most of `/syarat-ketentuan` legal prose unrelated to Opini |
| **C (`teknologi-kebijakan` + `ANALYSIS`)** | 13 | 562,145 | 561,895 | 140,479 | 678 | 47,114 | 11,784 | Same ~258 KB overlap/noise |
| **D (`nasional-publik` + `EXPLAINER`)** | 13 | 561,971 | 561,721 | 140,435 | 678 | 47,101 | 11,781 | Same ~258 KB overlap/noise |
| **E (`nasional-publik` + `FEATURE`)** | 13 | 561,971 | 561,721 | 140,435 | 678 | 47,101 | 11,781 | Same ~258 KB overlap/noise |
| **F (`teknologi-kebijakan` + `INTERVIEW`)** | 13 | 562,145 | 561,895 | 140,479 | 678 | 47,114 | 11,784 | Same ~258 KB overlap/noise |

### Context Efficiency Diagnosis & Smallest Practical Solution
- **Root cause:** Editorial rules are trapped inside full Next.js HTML pages (`91.6%` HTML/RSC payload overhead per workflow), lack modular desk/format splits, and are not referenced from machine endpoints. Consequently, an AI client spends **~140k to 173k raw tokens** (or **~11.8k to 13k extracted tokens**) and **still lacks actionable desk/format rules**.
- **Smallest practical solution:** Publish a lightweight, versioned static JSON index (e.g., `/editorial/manifest.json` linked from `/llms.txt`, `/.well-known/verax-agent.json`, and `/api/internal/v1/capabilities`) pointing to plain Markdown files for core mandatory rules (`/editorial/core.md`), each desk (`/editorial/desks/<slug>.md`), and each format (`/editorial/formats/<format>.md`), including a semantic `editorialStandardVersion`, `effectiveDate`, and stage tags (`research`, `drafting`, `review`). An agent would then fetch 3 tiny `.md` files (~3 to 6 KB total instead of 562 KB HTML).

---

## 13. Unanswered Questions (Test 9)

1. **What makes an article recognizably Verax?**  
   - **Answerable (High-Level Values Only) / Usability Failure (Style & Craft):** Public docs (`/tentang`, `/standar-editorial`, `/kirim-tulisan`) define core values: primary-source tracing (*Ex Fontibus Veritas*), public-interest focus, transparency of sources/AI/corrections, right of reply, and plain, direct Indonesian (`"bernas, teratur, dan tidak berputar-putar"`). However, concrete house style, structural conventions, prohibited phrasing, and headline standards are undocumented and unobservable because zero articles are published.

2. **What is the difference between Verax's three desks?**  
   - **Answerable (Topic Scope Only) / Usability Failure (Editorial Method):** `/tentang` and `/desk/*` distinguish topical scope in one sentence each: `Hukum & Keadilan` (regulation, judiciary, law enforcement, citizen rights, legal policy), `Teknologi & Kebijakan` (AI, digital innovation, data security, tech regulation, societal impact), and `Nasional & Publik` (government policy, education, social affairs, public economy, national events). Methodological or evidentiary differences between desks are undocumented.

3. **How does `NEWS` differ from `ANALYSIS` and `OPINION`?**  
   - **Usability Failure (`NEWS` vs `ANALYSIS`) / Partial (`OPINION`):** `/opini` defines `OPINION` as curated personal argument/perspective rather than field news reporting, and `/kirim-tulisan` defines `ANALYSIS` as deep examination of policy/regulation/socio-economic impact backed by data and primary documents. **`NEWS` is nowhere defined**, and `/kirim-tulisan` claims `NEWS` requires daily staff field reporting and is closed to external contributors, leaving API-submitted `NEWS` completely unspecified.

4. **What is prohibited when creating a `FEATURE` without field reporting?**  
   - **Answerable (Core Prohibition):** Per `/kebijakan-ai`, AI cannot invent interviewees, quotes, documents, or events, and content requiring field reporting cannot be compiled solely from online sources. Specific `FEATURE` structural rules beyond that are missing.

5. **What is prohibited when generating an `INTERVIEW` without a transcript?**  
   - **Answerable (Core Prohibition) / Partial (Format Procedure):** Per `/standar-editorial`, direct quotes must match their source; per `/kebijakan-ai`, AI cannot fabricate interviewees or quotes nor merely paraphrase other media articles without original value. However, explicit `INTERVIEW`-format acceptance/rejection rules for secondary summaries are undocumented.

6. **What evidence must support an important factual claim?**  
   - **Partial / Usability Failure on Technical Detail:** `/standar-editorial` requires verifiable primary sources (official documents, data, direct interviews) with complete citation metadata (`title`, `publisher`, `url`, `publishedAt`, `accessedAt`) and mandates editor verification of every key source (`isKeySource`). Yet the API schema leaves `publisher`, `publishedAt`, `accessedAt`, `supports`, and `isKeySource` optional and never defines `PRIMARY` vs `DOCUMENT` vs `OFFICIAL` vs `DATA`.

7. **What must be disclosed about AI involvement?**  
   - **Partial / Contradictory:** Every submission must declare `aiInvolvement` (`none`, `assistive`, `substantive`) per `/standar-editorial`, `/kebijakan-ai`, `/openapi.json`, and `substantive` requires a public process note (`aiUsageNote`), though OpenAPI does not strictly mark `aiUsageNote` conditional-required and `/kirim-tulisan` contradicts `substantive` acceptance.

8. **Can an external API Client publish an article?**  
   - **Answerable (`CLEAR`):** **No.** Stated unambiguously across `/standar-editorial`, `/kebijakan-ai`, `/developers`, `/llms.txt`, `/.well-known/verax-agent.json`, and `/api/internal/v1/capabilities`. All API submissions enter as `DRAFT`.

9. **Who is responsible for final editorial approval?**  
   - **Answerable (`CLEAR`):** The **Pemimpin Redaksi** (identified on `/tentang` and `/informasi-kelembagaan` as Arya Rizky Ardhi Pratama), following editor review and key-source fact-checking.

10. **How does an AI Agent determine the applicable editorial standard version?**  
    - **Usability Failure (`MISSING`):** There is no mechanism, header, API field, or page metadata exposing an editorial standard version or effective date.

---

## 14. Obstacles and Client Confusion

1. **Invisible Editorial Standards from Machine Entry Points:** An autonomous agent reading `/llms.txt`, `/llms-full.txt`, `/.well-known/verax-agent.json`, `/openapi.json`, and `/api/internal/v1/capabilities` receives zero links to `/standar-editorial` or `/kebijakan-ai`.
2. **Public Summaries Pointing to Locked Internal Charters:** Both `/standar-editorial` and `/kebijakan-ai` warn that fuller, binding internal policies govern the newsroom, creating immediate compliance uncertainty for an external integration.
3. **Channel Contradictions (`NEWS` and `substantive` AI):** Developer API docs welcome `NEWS` and `substantive` AI drafts, whereas `/kirim-tulisan` and `/pedoman-kontributor` state `NEWS` is closed to external submissions and auto-generated drafts are rejected.
4. **Dead-End API Credential Onboarding:** `/developers` instructs integrators to obtain credentials from Pemimpin Redaksi at "Meja Redaksi Studio," while `/kontak` publishes no email address and funnels inquiries into `/keluhan` (an editorial complaints and right-of-reply form). Even when a secret (`vrtk_...`) is shared manually, missing or separated `CLIENT_ID` (`vrtc_...`) easily causes authentication confusion.
5. **One-Way Submission Black Hole:** An external client can `POST` a draft and poll `GET /api/internal/v1/ai-submissions/{submissionId}`, yet cannot read editor revision notes, understand undocumented status strings, or submit revised edits via `PATCH`/`PUT`.
6. **Missing Author Attribution in API Payload:** `OPINION` pieces require personal author responsibility (`/opini`) and `"Oleh"` credit (`/standar-editorial`), yet `IngestionPayload` has no `author` field.

---

## 15. Prioritized Defects

### Defect 1: Full Editorial Standard, Versioning, and Desk/Format Profiles Are Inaccessible (`CRITICAL` / `NOT ACCESSIBLE`)
- **Exact Resource(s):** `/standar-editorial`, `/kebijakan-ai`, `/llms.txt`, `/llms-full.txt`, `/api/internal/v1/capabilities`, `/.well-known/verax-agent.json`
- **Observed Behavior:** Public pages present brief summaries of an unpublished internal `Piagam Redaksi` and `pedoman internal`, with zero version numbers, approval status, `WAJIB`/`DILARANG`/`DIANJURKAN`/`OPSIONAL` tiers, or desk/format writing rules, and are not linked from machine discovery files.
- **Friction / Risk:** External AI clients cannot verify compliance before generating drafts, cannot detect policy updates after caching, and must hallucinate or import external house styles for `NEWS`, `ANALYSIS`, `EXPLAINER`, `FEATURE`, `INTERVIEW`, and `OPINION`.
- **Expected Behavior:** Versioned, approved editorial core rules plus modular desk and format profiles should be publicly exposed in plain Markdown/JSON and referenced from `/llms.txt`, `/.well-known/verax-agent.json`, and `/api/internal/v1/capabilities`.
- **Proposed Improvement:** Expose `/editorial/manifest.json` (with `standardVersion`, `effectiveDate`, `status`, and per-desk/per-format `.md` URLs) and link it in `capabilities` and `llms.txt`.

### Defect 2: No Revision-Feedback Schema or Update Endpoint for Rejected/Returned Drafts (`CRITICAL` / `FAIL`)
- **Exact Resource(s):** `/openapi.json` (`SubmissionStatusResponse`, paths), `/llms-full.txt`, `/developers`
- **Observed Behavior:** `GET /api/internal/v1/ai-submissions/{submissionId}` exposes `submissionStatus`, `editorialStatus`, and `editorialDecision: {status, isPublished}` with undocumented string enums, zero feedback/revision-note fields, and no `PATCH`/`PUT` endpoint to revise a draft.
- **Friction / Risk:** Unlike human contributors in Portal Kontributor (`/pedoman-kontributor`), AI API clients cannot inspect why a draft was rejected or requested for revision, nor submit fixes without creating duplicate drafts under new `idempotencyKey` values.
- **Expected Behavior:** Enumerated status values, an explicit `revisionNotes`/`rejectionReason` object, and an idempotent draft-update or revision workflow should be documented.
- **Proposed Improvement:** Document allowed status enums in OpenAPI, add optional `editorialNotes`/`revisionRequests` fields to `SubmissionStatusResponse`, and document either `PUT/PATCH /api/internal/v1/ai-submissions/{submissionId}` or resubmission linkage (`revisesSubmissionId`).

### Defect 3: Channel Policy Contradictions on `NEWS` Format and `substantive` AI Involvement (`HIGH` / `FAIL`)
- **Exact Resource(s):** `/kirim-tulisan`, `/pedoman-kontributor` vs `/developers`, `/llms.txt`, `/llms-full.txt`, `/openapi.json`, `/api/internal/v1/capabilities`
- **Observed Behavior:** Contributor pages state `NEWS` is closed to external submissions and full AI-generated drafts are rejected, whereas API docs explicitly allow `NEWS` (`Dukungan Format Berita Penuh`) and `aiInvolvement: "substantive"` without explaining how API agents differ from human contributors or defining `NEWS` editorial standards.
- **Friction / Risk:** External AI teams cannot determine whether `NEWS` or `substantive` drafts are genuinely welcomed or silently rejected at editorial review, causing wasted generation and editorial triage load.
- **Expected Behavior:** Policy scope should explicitly distinguish Contributor Portal rules from API Client rules, and `NEWS` (if open to API agents) must have documented standards.
- **Proposed Improvement:** Clarify channel scope across `/kirim-tulisan`, `/kebijakan-ai`, and `/developers`, and publish concrete `NEWS` and `substantive`-AI acceptance criteria.

### Defect 4: No Dedicated API Credential Request, Onboarding, or Rotation Channel (`HIGH` / `PARTIAL`)
- **Exact Resource(s):** `/developers`, `/llms.txt`, `/kontak`, `/keluhan`
- **Observed Behavior:** `/developers` instructs integrators to obtain credentials from Pemimpin Redaksi at "Meja Redaksi Studio," while `/kontak` lists no developer email and directs inquiries to `/keluhan` (Hak Jawab & Keluhan). Credential rotation with grace period is mentioned without a request flow.
- **Friction / Risk:** Legitimate third-party developers have no documented intake path to apply for `<CLIENT_ID>.<CLIENT_SECRET>` credentials or rotate expiring keys.
- **Expected Behavior:** A clear API client request contact or application workflow and key-rotation procedure should be documented on `/developers`.
- **Proposed Improvement:** Add a dedicated developer contact/application link or form route on `/developers` and document the operational procedure for requesting rotation.

### Defect 5: Missing `author` / Byline Attribution Field in `IngestionPayload` (`HIGH` / `PARTIAL`)
- **Exact Resource(s):** `/openapi.json` (`IngestionPayload`), `/standar-editorial` (Atribusi), `/opini`
- **Observed Behavior:** `/standar-editorial` requires clear byline forms (`Oleh`, `Dilaporkan oleh`, etc.) and `/opini` attributes views to individual authors, yet `IngestionPayload` contains `agentId` with no `author`/`byline`/`reportedBy` field.
- **Friction / Risk:** External platforms submitting human-authored `OPINION` or `INTERVIEW` drafts assisted by AI cannot pass author attribution via structured fields.
- **Expected Behavior:** Optional or format-conditional `byline`/`author` fields should exist in `IngestionPayload` and align with `/standar-editorial` attribution rules.
- **Proposed Improvement:** Add `authorName` / `authorRole` / `bylineType` (or document how `agentId` + `aiInvolvement` map to byline credits).

### Defect 6: Incomplete Machine Schemas, Conditional Rules, and Docs Parity Drift (`MEDIUM` / `PARTIAL`)
- **Exact Resource(s):** `/openapi.json`, `/llms-full.txt`, `/developers`, `/standar-editorial`, `/api/internal/v1/capabilities`
- **Observed Behavior:**
  - `ImageMetadata` schema is missing from `/llms-full.txt` and `/developers`.
  - `ContentBlock` in OpenAPI lacks type-dependent `oneOf`/`if-then` constraints (`text`, `level`, `items`).
  - `SourceReference` leaves `publisher`, `publishedAt`, `accessedAt`, `supports`, and `isKeySource` optional despite `/standar-editorial` claiming all references record full dates/publishers; `sourceType` enums are undefined; offline/paywalled source handling is missing.
  - `aiUsageNote` conditional requirement for `aiInvolvement: "substantive"` is prose-only, not enforced in OpenAPI schema.
  - `/developers` omits `VALIDATION_ERROR`, `DESK_REJECTED`, and `INTERNAL_ERROR` from its error-code summary list and omits response body examples.
  - OpenAPI omits `401` and `429` (plus `Retry-After` header) on `/validate` and `/{submissionId}`, even though unauthenticated `GET` returned `401 UNAUTHORIZED`.
  - Rate-limit scope (`12/min`), max body byte limit, `content` block limit, and `idempotencyKey` TTL/scope (and `/validate` interaction) are undocumented.
- **Friction / Risk:** Agents relying on `/llms-full.txt` alone or generating SDK clients from `/openapi.json` encounter unexpected `422`/`401`/`429` behavior.
- **Expected Behavior:** `/openapi.json`, `/llms-full.txt`, and `/developers` should be 100% consistent, complete, and explicit about conditional rules and limits.
- **Proposed Improvement:** Synchronize all three docs from a single schema source, define `sourceType` and error-detail codes, add `401`/`429`/`Retry-After` to OpenAPI operations, and document payload byte limits and `idempotencyKey` TTL.

### Defect 7: Context Bloat from HTML-Only Editorial Pages & Unlinked Discovery Files (`MEDIUM` / `PARTIAL`)
- **Exact Resource(s):** `/standar-editorial`, `/kebijakan-ai`, `/kirim-tulisan`, `/pedoman-kontributor`, `/tentang`, `/desk/*`, `/robots.txt`
- **Observed Behavior:** Editorial rules require fetching `~562 KB` (`~140k` raw tokens) of Next.js HTML where `>91%` is markup/RSC script overhead, and `/robots.txt` (`Disallow: /api/`) may deter strict crawler agents from calling `/api/internal/v1/capabilities` unless exempted or explained.
- **Friction / Risk:** High token waste, brittle HTML scraping, and zero selective context retrieval per desk/format.
- **Expected Behavior:** Clean Markdown/JSON editorial endpoints with selective desk/format manifests and explicit crawler guidance.
- **Proposed Improvement:** Serve clean `.md`/`.json` editorial profiles and explicitly document in `/llms.txt` that `/api/internal/v1/capabilities` is intended for programmatic agent `GET` calls despite `/robots.txt` search-indexing exclusions.

### Defect 8: Zero Published Reference Articles on Live Platform (`LOW` / `PARTIAL`)
- **Exact Resource(s):** `/`, `/desk/hukum-keadilan`, `/desk/teknologi-kebijakan`, `/desk/nasional-publik`, `/opini`, `/koreksi`
- **Observed Behavior:** Every public rubric shows `"Belum ada artikel terbit"`.
- **Friction / Risk:** External AI clients cannot verify real-world citation formatting, tone, deck length, or public AI-disclosure presentation through published examples.
- **Expected Behavior:** At least one representative reference article or official sample article JSON/HTML should be inspectable before external onboarding opens.
- **Proposed Improvement:** Publish at least one reference article per desk or provide canonical golden example submissions in `/developers`.

---

## 16. Overall External Client Readiness Verdict

- **Technical Discovery & Basic Ingestion Foundation:** `PARTIAL`  
  Verax Press exposes strong machine-first primitives (`/llms.txt`, `/llms-full.txt`, `/openapi.json`, `/.well-known/verax-agent.json`, `/api/internal/v1/capabilities`), clear Bearer syntax, `idempotencyKey` replay protection, a dry-run `/validate` endpoint, and explicit `DRAFT`/`UNVERIFIED` safety invariants. However, missing credential intake, undocumented status enums, missing revision/resubmission APIs, missing `author` metadata, and schema/doc drift between `/developers`, `/llms-full.txt`, and `/openapi.json` block reliable end-to-end integration.
- **Editorial Standard Discovery & Selective Context Loading:** `FAIL`  
  An independent external AI agent cannot retrieve the full editorial standard (`Piagam Redaksi`), cannot verify policy version or approval status, cannot distinguish `WAJIB`/`DILARANG`/`DIANJURKAN`/`OPSIONAL` rules, cannot load desk-specific or format-specific writing profiles, and faces unresolved contradictions between human contributor pages and AI API pages.
- **Overall Verdict:** **`FAIL`: Not ready for unassisted external AI client integration.** Without publishing modular, versioned editorial rules and closing the credential, author-attribution, and revision-loop gaps in the API specification, an external AI agent cannot reliably produce Verax-compliant drafts or manage the editorial lifecycle without direct assistance from the Verax development and editorial team.

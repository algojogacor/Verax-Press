# Agent Instructions for Verax Press

Welcome to the Verax Press repository. When working in this codebase, you must follow the standards below:

## 1. System Writing & Copywriting Standards
Whenever you create or modify system-owned writing, UI copy, metadata, policies, form messages, or documentation:
- You **MUST** read and follow [`docs/editorial/VERAX_WRITING_STANDARDS.md`](docs/editorial/VERAX_WRITING_STANDARDS.md).
- Enforce the `anti-ai-writing` skill principles: no em dashes (`—`), no banned AI buzzwords (*delve, unlock, elevate, seamless, robust, etc.*), no decorative emojis in headings/bullets, and no negative parallelism or forced rule-of-three.
- Preserve factual honesty: Verax Press is an independent digital journalism platform; never invent fake metrics, legal statuses, or unverified claims.

## 2. Continuity
- Document significant implementation decisions and changes in `worklog.md`.
- Read `worklog.md` before making architectural modifications.

## 3. Safe-by-Default Data and Schema Modeling
When adding fields where one state carries higher editorial, legal, or factual liability (such as whether an image is illustrative or factual documentary evidence):
- **Conservative Defaults**: Both the database schema (Prisma `@default`) and API input validation schemas (Zod `.default()`) must default to the conservative, low-risk state (e.g. `isGeneric: true`).
- **Explicit Attribution at Verified Boundaries**: Any channel with human editorial verification (e.g. manual media library uploads in `src/app/api/studio/media/route.ts`) must explicitly set the verified state (`isGeneric: false`) rather than relying on column defaults.
- **Fail-Safe Ingestion**: In automated ingestion pathways, missing or unverified metadata must never silently graduate into verified status.

## 4. Deliberate Discovery Surface Evaluation
Whenever an API contract, payload schema, or system capability is modified or added:
- **Systematic Evaluation Across 6 Surfaces**: Evaluate the change against each discovery surface:
  1. `/openapi.json` (OpenAPI specification)
  2. `/llms.txt` (Compact agent system prompt discovery)
  3. `/llms-full.txt` (Comprehensive integration guide)
  4. `/.well-known/verax-agent.json` (Agent capability discovery manifest)
  5. `/api/internal/v1/capabilities` (Machine-readable capability endpoint)
  6. `/developers` (Human developer documentation and sample requests)
- **Documented Scope Decisions**: Consciously determine which channels require updates for the specific task and which are intentionally skipped because they are out of scope. Note these decisions briefly in the task report or worklog.
- **Regression Test Coverage**: Accompany every modified discovery channel with automated assertions in `tests/editorial-discovery.test.ts` to ensure documentation matches live endpoint responses.

## 5. Database Migration and Test Environment Parity
- **Dual Target Updates**: Whenever executing `prisma db push` or migrations, ensure schema updates are applied to both the primary database (`db/custom.db`) and the isolated test database (`db/isolated-test.db`).
- **Verification Before PR**: Validate test suite execution against the updated test schema before concluding schema modifications.

## 6. Mandatory Live Verification Before Completion Claim
Whenever work touches discovery channels, public contracts, or external agent integrations, a completion report must never be issued based solely on local tests. The following deployment sequence must be completed first:
1. **Push to Remote**: Execute `git commit` and `git push` to `origin main`.
2. **Verify Deployment State**: Check Vercel production deployment status until it reaches `Ready` (not Building, Queued, or Error).
3. **Execute Live Production Fetch**: Perform a direct HTTP fetch against the live production URLs (not local builds or test environments) for every modified discovery channel.
4. **Cite Live Output in Report**: Explicitly quote the live response snippet in the final completion report as tangible proof. Local green tests prove local logic; only live production fetches prove external availability.

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

## 5. Triple Target Database Parity & Safe Remote Migration
Proyek ini menggunakan 3 target basis data:
1. `db/custom.db`: Basis data lokal SQLite untuk lingkungan pengembangan (`bun run dev`).
2. `db/isolated-test.db`: Basis data terisolasi untuk rangkaian uji otomatis (`bun test`).
3. Turso Cloud (`libsql://...`): Basis data produksi terkelola yang diakses Vercel melalui `@prisma/adapter-libsql`.

Setiap kali `prisma/schema.prisma` dimodifikasi:
- **Pembaruan Lokal dan Uji:** Terapkan skema pada kedua berkas lokal (`db/custom.db` dan `db/isolated-test.db`).
- **Protokol Migrasi Remote Turso Cloud:**
  1. *Pencadangan Wajib:* Sebelum menjalankan mutasi DDL pada Turso Cloud produksi, ekspor salinan cadangan penuh ke `db/backups/` dan verifikasi integritasnya (`PRAGMA integrity_check`).
  2. *Migrasi Non-Destruktif:* Jalankan mutasi skema secara aditif (`ALTER TABLE ... ADD COLUMN ...`) menggunakan libSQL client. Dilarang keras menjalankan drop table, reset, atau truncate pada basis data produksi yang berisi artikel aktif.
  3. *Verifikasi Paritas Skema:* Periksa seluruh tabel untuk memastikan paritas 100% antara Turso Cloud dan `prisma/schema.prisma`.
  4. *Validasi Kueri Prisma:* Jalankan uji kueri Prisma Client dengan adapter libSQL terhadap Turso Cloud untuk memastikan Prisma Client dapat membaca model yang dimodifikasi tanpa galat.

## 6. Mandatory Live Verification Before Completion Claim
Whenever work touches discovery channels, public contracts, external agent integrations, or database schema modifications, a completion report must never be issued based solely on local tests. The following deployment sequence must be completed first:
1. **Push to Remote**: Execute `git commit` and `git push` to `origin main`.
2. **Verify Deployment State and Alias**: Check Vercel production deployment status until it reaches `Ready` (not Building, Queued, or Error). Ensure the primary public alias domain (`veraxpress.vercel.app`) is explicitly assigned to the new deployment (`vercel alias set <deployment-url> veraxpress.vercel.app` if not automatically repointed). Status Ready on a deployment does not prove that the primary domain alias has been repointed.
3. **Execute Live Production Fetch**: Perform a direct HTTP fetch against the primary public domain (`https://veraxpress.vercel.app`), never against commit-specific deployment preview URLs (`*-projects.vercel.app`), for every modified discovery channel, API route, or page touching the modified data models.
4. **Cite Live Output in Report**: Explicitly quote the live response snippet from the primary public domain in the final completion report as tangible proof. Local green tests prove local logic; only live public fetches prove external availability.

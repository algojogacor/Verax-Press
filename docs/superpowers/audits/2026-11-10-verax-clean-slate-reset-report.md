# VERAX PRESS: COMPLETE CLEAN-SLATE RESET REPORT

- **Date:** 11 November 2026
- **Operation:** Authorized Application Data Clean-Slate Reset
- **Target Environments:**
  - Turso Cloud Production Database (`libsql://verax-aryarizkyap.aws-ap-southeast-1.turso.io`)
  - Local Development SQLite Database (`D:\Projects\verax\db\custom.db`)
  - Azure Media Storage Service (`forfh-korea-vm`, `20.214.143.187`, `/var/lib/verax/media/`)
- **Status:** **COMPLETE AND VERIFIED**

---

## 1. Executive Summary

This report documents the authorized clean-slate data reset of the Verax Press journalism platform. Because Verax Press has not officially launched to the public, the platform owner authorized a comprehensive reset of application data across all environments.

The purpose was to eliminate development records, test fixtures, contaminated production records, placeholder editorial content, and obsolete media assets. The platform infrastructure, database schemas, primary keys, foreign keys, unique constraints, and authentication mechanisms were preserved.

Before any destructive command was executed, complete offline backups were created across all three storage layers (Turso Cloud, Local SQLite, and Azure VM Media Storage). Each backup underwent cryptographic SHA-256 verification, relational integrity checks (`PRAGMA foreign_key_check`), and test database restore verification.

Post-reset audits confirm that all editorial content tables contain exactly 0 rows, the three canonical editorial desks remain active, the Chief Editor administrative account is verified and functional, and all public pages and CMS endpoints display authentic empty states without rendering errors.

---

## 2. Pre-Reset Database & Media Inventory

Prior to the reset, an exhaustive read-only inventory was performed across all storage targets:

| Table / Entity | Turso Cloud (Live) | Local SQLite (`custom.db`) | Azure Media (`media.sqlite`) | Classification Before Reset |
|---|---|---|---|---|
| `StaffUser` | 4 | 4 | N/A | 1 Chief Editor, 1 Editor, 2 Author test accounts |
| `Contributor` | 0 | 0 | N/A | Clean (0 records) |
| `Person` | 5 | 5 | N/A | 3 staff personas, 2 fictional byline profiles |
| `Desk` | 3 | 3 | N/A | 3 canonical editorial desks |
| `Article` | 88 | 17 | N/A | 16 seed articles, 1 audit article, 71 integration test articles |
| `ArticleVersion` | 75 | 0 | N/A | 75 integration test article versions |
| `ArticleContribution` | 0 | 0 | N/A | Clean (0 records) |
| `SourceReference` | 36 | 0 | N/A | 36 integration test source records |
| `EditorialReview` | 127 | 0 | N/A | 127 integration test review records |
| `ReviewComment` | 15 | 0 | N/A | 15 integration test review comments |
| `Submission` | 0 | 0 | N/A | Clean (0 records) |
| `ApiClient` | 11 | 11 | N/A | 1 demo ingestion client, 10 per-run test agents |
| `MediaAsset` | 2 | 2 | N/A | 1 seed asset, 1 test error fallback asset |
| `Complaint` | 6 | 2 | N/A | 2 seed complaints, 4 integration test complaints |
| `CorrectionRecord` | 4 | 0 | N/A | 4 integration test correction records |
| `AuditEvent` | 353 | 56 | N/A | 1 seed event, 55 dev events, 297 test audit records |
| `media_items` (Azure) | N/A | N/A | 46 | 46 active media asset records |
| `consumed_nonces` (Azure) | N/A | N/A | 0 | Clean (0 records) |
| **Total Rows** | **729** | **100** | **46** | **875 total records across 3 storage systems** |

### Azure Media Storage Physical File Inventory (Before Reset)
- `public/articles/`: 13 physical image files
- `public/thumbnails/`: 5 physical thumbnail files
- `public/infographics/`: 1 physical infographic file
- `private/editorial/`: 5 physical private editorial files
- `quarantine/`: 22 quarantined files
- `tmp/`: 0 files
- **Total active storage files:** 46 files (plus 3 historical backup tar archives in `backups/`)

---

## 3. Backup Execution and Integrity Verification

Independent, consistent snapshots were created outside the application source tree prior to any data mutation:

### 3.1 Local SQLite Backup
- **Source:** `D:\Projects\verax\db\custom.db`
- **Destination:** `D:\Backup\verax-clean-slate-20261111\local-sqlite\custom-backup.db`
- **Metadata File:** `D:\Backup\verax-clean-slate-20261111\local-sqlite\backup-metadata.json`
- **Snapshot Method:** `VACUUM INTO` online snapshot
- **File Size:** 315,392 bytes
- **SHA-256 Hash:** `5f7a9cc6ad30d2159cc7bc1d44904964b703a6ec59e129449dc3dc2d555b7a67`
- **Integrity Verification:**
  - `PRAGMA integrity_check`: `ok`
  - `PRAGMA foreign_key_check`: 0 violations
  - Total verified records: 100

### 3.2 Turso Main Database Backup & Local Restore Proof
- **Source:** Turso Cloud (`libsql://verax-aryarizkyap.aws-ap-southeast-1.turso.io`)
- **Restored Database:** `D:\Backup\verax-clean-slate-20261111\turso\turso-backup.db`
- **SQL Dump:** `D:\Backup\verax-clean-slate-20261111\turso\turso-backup.sql`
- **Metadata File:** `D:\Backup\verax-clean-slate-20261111\turso\backup-metadata.json`
- **Export Method:** Full schema DDL extraction, table-by-table record export, and local SQLite database re-inflation
- **Database File Size:** 524,288 bytes
- **Database SHA-256:** `eea3f4ff45718357af2a63919e21869f6c81ea049335c6b639c430f0e3dd2bfe`
- **SQL Dump File Size:** 363,930 bytes
- **SQL Dump SHA-256:** `022508c3f8635a23a898c65e49279a6eeff5e5c89acc64e13aebaa7f9103ade1`
- **Integrity & Restore Verification:**
  - `PRAGMA integrity_check`: `ok`
  - `PRAGMA foreign_key_check`: 0 violations
  - Row-by-row reconciliation: 729 / 729 rows restored with 100% exact parity across all 16 schema tables

### 3.3 Azure Media Storage Backup
- **Source Host:** `forfh-korea-vm` (`20.214.143.187`, Korea Central)
- **Source Path:** `/var/lib/verax/media/`
- **Backup Directory on VM:** `/home/azureuser/verax-media-backup-clean-slate-20261111/`
- **Local Download Path:** `D:\Backup\verax-clean-slate-20261111\azure-media\`
- **Database Snapshot:** `media.sqlite` (32,768 bytes, checkpointed and `VACUUM INTO` snapshot)
- **Database SHA-256:** `791f77d7f63edd6f22f0127371ea565981862856299181a664151c7720210ba0`
- **Archive File:** `media-backup-clean-slate-20261111.tar.gz` (9,678 bytes)
- **Archive SHA-256:** `2429f9c2ca8fe10806b1725b881dc6cfc4068ff46119f8535a9cd285e4746055`
- **Integrity Verification:**
  - `PRAGMA integrity_check`: `ok`
  - `PRAGMA foreign_key_check`: 0 violations
  - 46 physical media items and snapshot database verified in archive

---

## 4. Reset Operations and Referential Execution

### 4.1 Referential Safe Order
All deletions were executed in strict child-to-parent order to prevent foreign key violations:
1. `ReviewComment` (child of Article and StaffUser)
2. `EditorialReview` (child of Article and StaffUser)
3. `SourceReference` (child of Article and StaffUser)
4. `ArticleContribution` (child of Article and Person)
5. `ArticleVersion` (child of Article)
6. `CorrectionRecord` (child of Article and StaffUser)
7. `Complaint` (optional child of Article)
8. `Submission` (child of Article and Contributor)
9. Unset `Article.heroMediaId` to break self-referential cycle
10. `MediaAsset` (child of StaffUser and Article)
11. `Article` (parent editorial record)
12. Historical `AuditEvent` records
13. Obsolete test `ApiClient` records (`vrtc_testagent_*`, `verity-agent-test-*`)
14. Fictional bylines in `Person` (`Sekar Ayu W.`, `Bram Aditya`)
15. Obsolete test staff in `StaffUser` (`author@verity.test`, `penulis@verity.test`, `editor@verity.test`)
16. Administrative reset event appended to `AuditEvent`

### 4.2 Preserved Production Foundation
The following records were preserved:
1. **Chief Editor Account:**
   - Email: `chief@verity.test`
   - ID: `cmwa0zr730003r60343oibcb2`
   - Role: `CHIEF_EDITOR`
   - Status: `ACTIVE`
   - Password hash, salt, and parameters: Preserved intact without modification
2. **Chief Editor Public Identity:**
   - ID: `cmwa0zrbo0007r603pb9yonui`
   - Linked Staff User: `cmwa0zr730003r60343oibcb2`
   - Public Name: `Ratna Dewanti`
   - Account Type: `STAFF`
3. **Canonical Editorial Desks (3 Desks):**
   - `hukum-keadilan` (`cmwa0zr4n0000r603j47k4aye`, sortOrder: 1, isActive: 1)
   - `teknologi-kebijakan` (`cmwa0zr4p0001r60349o2nkro`, sortOrder: 2, isActive: 1)
   - `nasional-publik` (`cmwa0zr4q0002r603v2yqi9xt`, sortOrder: 3, isActive: 1)
4. **Permanent Ingestion Client:**
   - Client ID: `vrtc_demo_agent` (`cmwa0zri2008hr603djhhvulh`)
   - Scopes: `submit`
   - Status: `ACTIVE`
5. **Administrative Audit Record:**
   - Action: `system.clean_slate_reset`
   - Target: `turso-production` / `local-sqlite`
   - Reason: `Authorized complete clean-slate data reset before public launch`

---

## 5. Post-Reset Record Counts & System Verification

### 5.1 Final Table Count Reconciliation

| Table Name | Pre-Reset (Turso) | Post-Reset (Turso) | Post-Reset (Local SQLite) | Expected Post-Reset Target | Status |
|---|---|---|---|---|---|
| `StaffUser` | 4 | **1** | **1** | 1 (Chief Editor) | PASS |
| `Contributor` | 0 | **0** | **0** | 0 | PASS |
| `Person` | 5 | **1** | **1** | 1 (Chief Editor Person) | PASS |
| `Desk` | 3 | **3** | **3** | 3 canonical desks | PASS |
| `Article` | 88 | **0** | **0** | 0 (all content cleared) | PASS |
| `ArticleVersion` | 75 | **0** | **0** | 0 (all content cleared) | PASS |
| `ArticleContribution` | 0 | **0** | **0** | 0 | PASS |
| `SourceReference` | 36 | **0** | **0** | 0 | PASS |
| `EditorialReview` | 127 | **0** | **0** | 0 | PASS |
| `ReviewComment` | 15 | **0** | **0** | 0 | PASS |
| `Submission` | 0 | **0** | **0** | 0 | PASS |
| `ApiClient` | 11 | **1** | **1** | 1 (`vrtc_demo_agent`) | PASS |
| `MediaAsset` | 2 | **0** | **0** | 0 | PASS |
| `Complaint` | 6 | **0** | **0** | 0 | PASS |
| `CorrectionRecord` | 4 | **0** | **0** | 0 | PASS |
| `AuditEvent` | 353 | **6** | **1** | Clean audit log (reset + login) | PASS |
| **Total Rows** | **729** | **12** | **7** | Clean baseline | **PASS** |

### 5.2 Azure Media Storage Post-Reset State
- `media_items` table: 0 rows
- `consumed_nonces` table: 0 rows
- `PRAGMA integrity_check`: `ok`
- `PRAGMA foreign_key_check`: 0 violations
- Active physical files in `public/articles/`: 0 files
- Active physical files in `public/thumbnails/`: 0 files
- Active physical files in `public/infographics/`: 0 files
- Active physical files in `private/editorial/`: 0 files
- Active physical files in `quarantine/`: 0 files
- Active physical files in `tmp/`: 0 files
- Existing backup archives in `backups/`: Preserved
- Service status: `pm2 status verax-media` is `online`
- Health probe (`http://media.aryariap.my.id/health`): HTTP 200 OK (`status: ok, database: ok, storage: ok`)
- Old media test URL probe (`/public/articles/221dfecb-4d61-4d73-abb1-7e39ccdeed75.png`): HTTP 404 Not Found
- Port 4188 external accessibility probe: Closed (`TcpTestSucceeded: False`)

---

## 6. Public Interface and Studio Functional Smoke Test

The application was compiled using Next.js 16 (Turbopack) and verified with an active server instance:

### 6.1 Public Route Smoke Test

| Route | HTTP Status | Response Size | Verified Render State |
|---|---|---|---|
| `/` (Homepage) | 200 OK | 30,749 bytes | Displays genuine empty state: "Belum ada artikel terbit". No fake cards. |
| `/desk/hukum-keadilan` | 200 OK | 32,781 bytes | Displays genuine empty state: "Belum ada artikel terbit di desk ini". |
| `/desk/teknologi-kebijakan` | 200 OK | 32,869 bytes | Displays genuine empty state: "Belum ada artikel terbit di desk ini". |
| `/desk/nasional-publik` | 200 OK | 32,817 bytes | Displays genuine empty state: "Belum ada artikel terbit di desk ini". |
| `/koreksi` | 200 OK | 36,472 bytes | Displays genuine empty state: "Belum ada catatan koreksi publik". |
| `/opini` | 200 OK | 33,155 bytes | Displays genuine empty state: "Belum ada opini yang terbit". |
| `/keluhan` | 200 OK | 51,275 bytes | Complaints intake form renders with full editorial instructions. |
| `/standar-editorial` | 200 OK | 49,564 bytes | Institutional guidelines render without placeholder metrics. |
| `/tentang` | 200 OK | 56,422 bytes | About page renders with verified editorial structure. |
| `/sitemap.xml` | 200 OK | 1,322 bytes | Contains only 6 static routes and 3 active desks. 0 dead article links. |
| `/api/public/desks` | 200 OK | 179 bytes | Returns all 3 active desks in proper sort order. |

### 6.2 Studio CMS and Editorial Workflow Smoke Test
1. **Studio Login:**
   - POST `/api/auth/callback/credentials` with `chief@verity.test` and preserved credentials returned HTTP 200 OK with valid session cookie.
2. **Dashboard Metrics:**
   - GET `/api/studio/dashboard` returned HTTP 200 OK.
   - Status counts: Empty (`{}`) indicating 0 articles.
   - Open complaints: 0.
   - Gate warnings: 0.
   - Recent audit log: Accurately reflects clean reset and login activity.
3. **Article Creation Workflow:**
   - POST `/api/studio/articles` with authenticated Chief Editor session returned HTTP 201 Created.
   - Article was verified in studio listing and immediately cleaned up via transient test teardown.
   - Post-cleanup Article count returned to exactly 0.
4. **Audit Logging:**
   - New administrative actions (logins, article creations) continuously write audit entries to `AuditEvent`.

---

## 7. Automated Test Suite and Isolation Verification

The entire repository test suite was executed against the isolated test environment:

- `bun run typecheck`: Exited with code 0. 0 TypeScript errors.
- `bun run lint`: Exited with code 0. 0 ESLint warnings, 0 errors.
- `bun test`: Exited with code 0. 71 passed, 0 failed across 8 test suites (145 expect assertions passed).
- `bun run build`: Exited with code 0. Next.js Turbopack compiled 26/26 routes successfully.
- **Database Safety Guard:**
  - `assertApprovedTestDatabase` strictly rejected all non-test targets during test execution.
  - Turso Cloud row counts were inspected before and after test execution: 0 test rows were written to Turso Cloud.

---

## 8. Backup Retention & Disaster Recovery Instructions

All backup archives are stored outside the source directory:
- Local SQLite Backup: `D:\Backup\verax-clean-slate-20261111\local-sqlite\custom-backup.db`
- Turso SQL Dump: `D:\Backup\verax-clean-slate-20261111\turso\turso-backup.sql`
- Turso SQLite Restore: `D:\Backup\verax-clean-slate-20261111\turso\turso-backup.db`
- Azure Media Archive: `D:\Backup\verax-clean-slate-20261111\azure-media\media-backup-clean-slate-20261111.tar.gz`
- Azure Media VM Snapshot: `/home/azureuser/verax-media-backup-clean-slate-20261111/`

### 8.1 How to Restore Turso Cloud from Backup (If Required)
To restore Turso Cloud to the pre-reset state:
```bash
# Using libsql-shell or Turso CLI with the generated SQL dump:
turso db shell verax-aryarizkyap < D:/Backup/verax-clean-slate-20261111/turso/turso-backup.sql
```

### 8.2 How to Restore Local SQLite
```bash
copy D:\Backup\verax-clean-slate-20261111\local-sqlite\custom-backup.db D:\Projects\verax\db\custom.db
```

### 8.3 How to Restore Azure Media Storage
On `forfh-korea-vm`:
```bash
# 1. Stop service
pm2 stop verax-media

# 2. Extract archive back to active storage
tar -xzf /home/azureuser/verax-media-backup-clean-slate-20261111/media-backup-clean-slate-20261111.tar.gz -C /var/lib/verax/media/

# 3. Restart service
pm2 restart verax-media
```

---

## 9. Final Sign-Off

The clean-slate reset of Verax Press has satisfied all stated requirements:
- All 88 legacy and test articles in Turso Cloud were removed.
- All 17 articles in local development SQLite were removed.
- All 46 obsolete active media items and physical files on Azure VM were removed.
- Database schemas, foreign keys, and indexes remain 100% intact with 0 violations.
- The Chief Editor administrative account and 3 canonical desks were preserved.
- All public pages display authentic empty states.
- The platform is clean, functional, and ready for genuine editorial operations.

# Verax Media Storage Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, configure, and deploy a secure, lightweight, and zero-cost persistent media storage service on the existing Azure VM (`forfh-korea-vm`) for Verax Press (hosted on Vercel), with static public CDN caching and internal private downloads.

**Architecture:** Node.js HTTP microservice with pure streaming I/O (`busboy`) on port `4188`, backed by local SQLite metadata database (`node:sqlite` DatabaseSync) and filesystem hierarchy (`/var/lib/verax/media/` public & private). Nginx acts as reverse proxy and high-performance static cache for public media and issues `X-Accel-Redirect` for authenticated private media. Server-to-server HMAC-SHA256 tokens ensure unauthorized requests are rejected without exposing secrets to browser bundles.

**Tech Stack:** Node.js v22 (native `node:sqlite`, `node:crypto`, `node:http`, `node:stream`), `busboy` (streaming multipart parser), Nginx 1.24+ (SSL, caching, X-Accel-Redirect, rate limiting), PM2 (`verax-media` process manager), and Next.js / Prisma integration client on Verax Press.

---

### Planned File Structure

#### Service on Azure VM (`/home/azureuser/verax-media-service/`):
- `package.json`: Service metadata, startup scripts, and busboy dependency.
- `.env`: Environment configuration (port `4188`, storage paths, storage quota `10GB`, HMAC secret, CORS allowlist).
- `src/config.mjs`: Centralized configuration parser with strict schema defaults.
- `src/db.mjs`: SQLite connection manager, schema initialization, WAL mode, parameterized prepared statements, and online backup helper.
- `src/security.mjs`: HMAC-SHA256 request verification, timing-safe equality, timestamp expiration validation, and CORS headers.
- `src/detector.mjs`: Magic-byte validator for JPEG, PNG, WebP (and rejection of SVG/disguised binaries), plus header dimension extractor (width/height without Sharp).
- `src/storage.mjs`: Filesystem tree manager, path traversal guard, disk quota calculator, quarantine/soft-delete mover, and atomic file writers.
- `src/server.mjs`: HTTP routing, health endpoint, streaming upload handler, metadata query handler, download/X-Accel-Redirect handler, and delete/quarantine handler.
- `scripts/backup.mjs`: Online SQLite backup + tarball snapshot generator with retention cleanup.
- `scripts/restore.mjs`: Safe database & media restoration script.
- `tests/test-suite.mjs`: Comprehensive automated test runner exercising all 20 required verification cases.

#### Nginx Configuration on Azure VM:
- `/home/azureuser/media.aryariap.my.id.conf`: Nginx virtual host with SSL, HTTP->HTTPS redirect, `/public/` static cache, `/api/` reverse proxy to port `4188`, and internal private redirect block.
- `/home/azureuser/install-media-nginx.sh`: Safe deployment script with automatic timestamped backup of `/etc/nginx`, directory setup, `nginx -t` validation, and atomic rollback on error.

#### Verax Press Integration in Workspace (`D:\Projects\verax`):
- `src/lib/media-client.ts`: Server-side client for generating HMAC signatures, requesting uploads, fetching metadata, and soft-deleting media assets.
- `src/app/api/studio/media/route.ts`: Updated CMS route to forward uploads to the new VM media storage while retaining Prisma record creation and audit logs.

---

### Task 1: Environment & Storage Foundation on Azure VM

**Files:**
- Create: `/home/azureuser/verax-media-service/src/config.mjs`
- Create: `/home/azureuser/verax-media-service/.env`
- Create: `/home/azureuser/verax-media-service/src/storage.mjs`
- Test: `/home/azureuser/verax-media-service/tests/test-storage.mjs`

- [ ] **Step 1: Write config module and environment template**
Define standard configuration values:
PORT=4188
STORAGE_ROOT=/var/lib/verax/media (fallback: /home/azureuser/verax-media-data if root unprovisioned)
STORAGE_QUOTA_BYTES=10737418240 (10 GB)
MAX_FILE_SIZE_BYTES=10485760 (10 MB)
ALLOWED_MIMES=image/jpeg,image/png,image/webp
MEDIA_HMAC_SECRET=<generated 64-char hex>
PUBLIC_BASE_URL=https://media.aryariap.my.id/public

- [ ] **Step 2: Implement storage manager and quota tracker**
Implement `ensureDirectories()`, `checkQuota()`, `safePath()`, and `quarantineFile()`.
Enforce path containment inside `STORAGE_ROOT` using `path.resolve` and strict prefix checks to eliminate path traversal vulnerabilities.

- [ ] **Step 3: Run storage foundation test**
Verify directory creation, path traversal rejection (e.g. `../../etc/passwd`), and quota calculations.

---

### Task 2: SQLite Metadata Database Engine

**Files:**
- Create: `/home/azureuser/verax-media-service/src/db.mjs`
- Test: `/home/azureuser/verax-media-service/tests/test-db.mjs`

- [ ] **Step 1: Design and initialize SQLite schema**
Create table `media_items` with fields:
- `id` TEXT PRIMARY KEY (UUID v4)
- `original_filename` TEXT NOT NULL
- `stored_filename` TEXT NOT NULL UNIQUE
- `storage_path` TEXT NOT NULL
- `visibility` TEXT CHECK(visibility IN ('public', 'private')) NOT NULL
- `category` TEXT NOT NULL
- `mime_type` TEXT NOT NULL
- `file_extension` TEXT NOT NULL
- `file_size` INTEGER NOT NULL
- `sha256` TEXT NOT NULL
- `width` INTEGER
- `height` INTEGER
- `uploaded_by` TEXT NOT NULL
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL
- `status` TEXT CHECK(status IN ('active', 'quarantined', 'deleted')) DEFAULT 'active'
- `deleted_at` TEXT

Enable `PRAGMA journal_mode = WAL;`, `PRAGMA foreign_keys = ON;`, and create indexes on `(visibility, category, status)` and `(sha256)`.

- [ ] **Step 2: Implement database queries and online backup**
Write prepared statements for `insertMedia()`, `getMediaById()`, `softDeleteMedia()`, `getStorageStats()`, and `backupDatabase(destPath)`.

- [ ] **Step 3: Verify database operations**
Test insert, retrieval, soft deletion, and WAL-safe snapshotting.

---

### Task 3: Security & Header-Based Image Validation

**Files:**
- Create: `/home/azureuser/verax-media-service/src/security.mjs`
- Create: `/home/azureuser/verax-media-service/src/detector.mjs`
- Test: `/home/azureuser/verax-media-service/tests/test-security.mjs`

- [ ] **Step 1: Implement HMAC authentication and CORS**
Support authentication via:
`X-Media-Auth-Signature`: hex HMAC-SHA256
`X-Media-Auth-Payload`: JSON payload containing `{ action, timestamp, expiresAt, uploadedBy, visibility, category }`
Reject if `now > expiresAt` or `now < timestamp - 60000` (clock skew max 60s).
Use `crypto.timingSafeEqual` to avoid timing attacks.
Set restrictive CORS allowlist: `https://verax.aryariap.my.id`, `https://verax-press.vercel.app`, `http://localhost:3000`.

- [ ] **Step 2: Implement magic-byte validation and header dimension reader**
Check magic bytes:
- JPEG: `FF D8 FF`
- PNG: `89 50 4E 47 0D 0A 1A 0A`
- WebP: `RIFF....WEBP`
Explicitly reject SVG (`<svg`, `<?xml`) and executable formats (`MZ`, `\x7fELF`, scripts).
Extract width/height directly from binary headers without external dependencies.

- [ ] **Step 3: Test security module against forged inputs**
Test forged MIME (e.g. text file named `.png`), expired timestamps, invalid signatures, and valid image formats.

---

### Task 4: Media API Service & Streaming Handlers

**Files:**
- Create: `/home/azureuser/verax-media-service/src/server.mjs`
- Test: `/home/azureuser/verax-media-service/tests/test-api.mjs`

- [ ] **Step 1: Implement HTTP routes**
- `GET /health`: Returns `{ status: "ok", uptime, database: "ok", storage: { totalBytes, usedBytes, quotaBytes, freeBytes } }`.
- `POST /api/v1/media/upload`: Streams multipart file to temp disk, computes SHA256 on the fly, validates magic bytes, verifies quota, moves to final category destination, records metadata in SQLite, returns clean JSON (without disclosing internal server filesystem paths).
- `GET /api/v1/media/:id`: Returns sanitized media metadata. If `visibility === 'private'`, requires HMAC auth.
- `GET /api/v1/media/:id/file`: Serves file or sends `X-Accel-Redirect` for Nginx internal serving.
- `DELETE /api/v1/media/:id`: Requires HMAC auth with matching permission; moves file to quarantine folder and marks status as `quarantined`.

- [ ] **Step 2: Error handling & upload cleanup**
Ensure any aborted stream or failed validation deletes temporary files immediately and returns safe error responses.

---

### Task 5: Backup & Disaster Recovery Scripts

**Files:**
- Create: `/home/azureuser/verax-media-service/scripts/backup.mjs`
- Create: `/home/azureuser/verax-media-service/scripts/restore.mjs`

- [ ] **Step 1: Implement online backup script**
Use `DatabaseSync.backup()` to create a consistent SQLite snapshot, tarball public/private storage, and prune archives older than 14 days.

- [ ] **Step 2: Implement restoration script**
Extract tarball and verify database integrity (`PRAGMA integrity_check`).

---

### Task 6: PM2 Process Management & Service Deployment

**Files:**
- Create: `/home/azureuser/verax-media-service/ecosystem.config.cjs`

- [ ] **Step 1: Configure PM2 ecosystem**
Name: `verax-media`
Script: `src/server.mjs`
Node args: `--max-old-space-size=96`
Autorestart: true, max_restarts: 10, restart_delay: 2000
Environment: production

- [ ] **Step 2: Start and persist PM2 service**
Run `pm2 start ecosystem.config.cjs` and `pm2 save`. Ensure existing services (`forfh`, `kontrakpaham`, `webhook`) are unaffected.

---

### Task 7: Nginx Configuration & Deployment Package

**Files:**
- Create: `/home/azureuser/media.aryariap.my.id.conf`
- Create: `/home/azureuser/install-media-nginx.sh`

- [ ] **Step 1: Author Nginx server block**
- Domain: `media.aryariap.my.id`
- Public static location: `location ^~ /public/` with aggressive caching (`expires 365d; Cache-Control: public, immutable`).
- Private internal location: `location ^~ /internal-media-private/` (`internal; alias /var/lib/verax/media/private/;`).
- API reverse proxy: `location /api/` and `location /health` forwarded to `http://127.0.0.1:4188`.
- Size limits: `client_max_body_size 12M`.
- Security headers: `X-Content-Type-Options "nosniff"`, `X-Frame-Options "DENY"`, `Referrer-Policy "strict-origin-when-cross-origin"`.

- [ ] **Step 2: Author safe deployment script**
Write `install-media-nginx.sh` to make timestamped backups of `/etc/nginx`, install configurations, validate with `nginx -t`, and reload Nginx.

---

### Task 8: Verax Press Integration Client

**Files:**
- Create: `D:\Projects\verax\src\lib\media-client.ts`
- Modify: `D:\Projects\verax\src\app\api\studio\media\route.ts`
- Modify: `D:\Projects\verax\.env.example`

- [ ] **Step 1: Implement media client library**
Create helper to sign upload authorizations using server-side HMAC secret (`VERAX_MEDIA_SECRET`), upload files, and delete assets.

- [ ] **Step 2: Update CMS media route**
Update `POST /api/studio/media` to stream uploads to the media storage service while creating `MediaAsset` records in Prisma and logging audit events.

---

### Task 9: End-to-End Test Suite & Verification

**Files:**
- Test: `/home/azureuser/verax-media-service/tests/test-suite.mjs`

- [ ] **Step 1: Run complete 20-point test suite on VM**
Verify all requirements:
1. Health endpoint.
2. SQLite database open & WAL mode.
3. Valid JPEG upload.
4. Valid PNG upload.
5. Valid WebP upload.
6. Rejection of unsupported file types.
7. Rejection of forged MIME types.
8. Rejection of oversized files.
9. Duplicate filenames do not overwrite existing files.
10. Rejection of unauthorized uploads.
11. Rejection of expired HMAC signatures.
12. Public media accessibility.
13. Private media inaccessibility without auth.
14. Authorized private retrieval.
15. Path traversal attempt rejection.
16. Database metadata consistency.
17. Soft deletion & quarantine verification.
18. Service persistence across process restart.
19. Existing services status verification (`forfh`, `kontrakpaham`, `webhook`, `rivals-evidence`, `vpn-api`).
20. Nginx configuration validation (`nginx -t`).

# Independent Post-Implementation Security & Integration Audit
**Service:** Verax Media Storage Service  
**Target Domain:** `media.aryariap.my.id`  
**Host:** `forfh-korea-vm` (Ubuntu 24.04.5 LTS, Azure Korea Central)  
**Date of Audit:** 2026-11-10  
**Status:** Audit Completed — Concrete Findings Identified  

---

## Executive Summary

An independent, evidence-based post-implementation audit of the newly deployed **Verax Media Storage Service** was conducted across six domains: Storage Consistency, Authentication Security, Public/Private Isolation, End-to-End CMS Integration, Backup & Recovery, and Operational Reliability.

The deployment report claims of operational readiness were verified against live system behavior. While the core microservice is running stably under PM2, stores files safely in SQLite/filesystem, and integrates with the Next.js CMS, **several critical security vulnerabilities and operational discrepancies were uncovered** that require remediation before public DNS and SSL activation.

### Overall Status Breakdown

| Evaluation Area | Status | Key Notes |
|---|---|---|
| **A. Storage Consistency** | **REQUIRES USER ACTION** | Active root is `~/verax-media-data/`, but Nginx config references `/var/lib/verax/media/`. |
| **B. Authentication Security** | **FAILED** | HMAC signature lacks HTTP method, URL path, and target ID binding; no replay protection; hardcoded secret fallback. |
| **C. Public/Private Isolation** | **VERIFIED** | Private media and metadata strictly return 401 without auth; sensitive files 404; cache headers isolated. |
| **D. End-to-End CMS Integration** | **VERIFIED (With Gaps)** | Live upload via `media-client` succeeded; Prisma `MediaAsset` consistent; GIF/SVG format discrepancy. |
| **E. Backup & Recovery** | **VERIFIED (With Risks)** | Online backup valid; 23/23 files matched SHA-256; restore script lacks confirmation and can overwrite live DB. |
| **F. Operational Reliability** | **VERIFIED (With Gaps)** | PM2 persistence enabled; memory ~71 MB; existing services 100% healthy; orphaned temp files found. |

---

## Section A: Storage Consistency

### A.1 Active Storage Root Identification
- **Configured Root:** In `ecosystem.config.cjs`, `MEDIA_STORAGE_ROOT` is set to `/var/lib/verax/media`.
- **Live Active Root:** `/home/azureuser/verax-media-data/`.
- **Technical Cause:** The user `azureuser` does not have passwordless `sudo` privileges. On process startup, `resolveStorageRoot()` in `src/storage.mjs` attempted `fs.mkdirSync('/var/lib/verax/media')`, which threw `EACCES: permission denied`. The service gracefully fell back to `config.fallbackStorageRoot` (`/home/azureuser/verax-media-data/`).
- **Disk State:**
  - `/var/lib/verax`: `No such file or directory`
  - `/home/azureuser/verax-media-data`: Active directory containing all production subdirectories.

### A.2 Subdirectory Tree & Permissions
```text
/home/azureuser/verax-media-data/ (0775, azureuser:azureuser)
├── database/     (0750, azureuser:azureuser) -> media.sqlite (0644), -shm (0644), -wal (0644)
├── public/       (0750, azureuser:azureuser)
│   ├── articles/     (0750) -> 13 files
│   ├── thumbnails/   (0750) -> 5 files
│   └── infographics/ (0750) -> 1 file
├── private/      (0750, azureuser:azureuser)
│   ├── editorial/    (0750) -> 4 files
│   ├── drafts/       (0750) -> 0 files
│   └── documents/    (0750) -> 0 files
├── quarantine/   (0750, azureuser:azureuser) -> 5 files
├── backups/      (0750, azureuser:azureuser) -> verax_media_backup_*.tar.gz
├── tmp/          (0750, azureuser:azureuser) -> 1 orphaned file
└── logs/         (0750, azureuser:azureuser)
```

### Findings in Section A:

#### FINDING A.1 (Severity: High) — Storage Root Mismatch with Nginx Configuration
- **File / Configuration:** `services/media-storage/media.aryariap.my.id.conf` (lines 25, 45) vs `src/storage.mjs`.
- **Technical Proof:**
  ```nginx
  location ^~ /public/ {
      alias /var/lib/verax/media/public/;
      ...
  }
  ```
  The active Node.js service is storing files in `/home/azureuser/verax-media-data/public/`. `/var/lib/verax/media` does not exist.
- **Impact:** Once Nginx is enabled, all requests to static public URLs (`https://media.aryariap.my.id/public/articles/<filename>`) will fail with HTTP 404 Not Found.
- **Remediation:** Either:
  1. Update `media.aryariap.my.id.conf` to use `alias /home/azureuser/verax-media-data/public/;`, or
  2. Run `install-media-nginx.sh` with `sudo`, copy existing files from `~/verax-media-data` to `/var/lib/verax/media`, set ownership `chown -R azureuser:www-data /var/lib/verax`, and restart PM2.

#### FINDING A.2 (Severity: Medium) — Public Storage Directory Mode 0750 Restricts Nginx Access
- **File / Configuration:** Permissions on `/home/azureuser/verax-media-data/public/`.
- **Technical Proof:** `public/` directory permissions are `drwxr-x--- (0750)` owned by `azureuser:azureuser`.
- **Impact:** Nginx worker processes run as `www-data`. Because `www-data` is not the owner or in group `azureuser`, Nginx will be denied read/execute access, causing HTTP 403 Forbidden on static asset delivery.
- **Remediation:** If serving statically from `/home/azureuser/verax-media-data/public`, change group to `www-data` (`chown -R azureuser:www-data public`) and set permissions `0750`, or adjust permissions to `0755` (and grant traverse permissions on `/home/azureuser`).

---

## Section B: Authentication Security

### B.1 HMAC Signature Implementation Review
The HMAC implementation in `src/security.mjs` was audited line-by-line:

```javascript
// Current implementation in src/security.mjs:
const { action, timestamp, expiresAt, uploadedBy } = payload;
// Signature computed over rawPayload JSON string
const expectedHmac = crypto.createHmac('sha256', config.hmacSecret).update(rawPayload).digest('hex');
```

### B.2 Client Bundle Secret Leakage Audit
- **Inspection:** Scanned all client components in `src/app/` and `src/components/`.
- **Result: VERIFIED (Clean).**
  - `VERAX_MEDIA_SECRET` and `MEDIA_HMAC_SECRET` are never referenced in client code.
  - Browser component `MediaUploader` submits standard `multipart/form-data` to internal server route `/api/studio/media`.
  - Next.js server route generates the HMAC headers on the server side prior to issuing requests to the VM. No secret reaches the browser.

### Findings in Section B:

#### FINDING B.1 (Severity: High) — HMAC Signature Lacks HTTP Method, URL Path, and Resource ID Binding
- **File / Configuration:** `services/media-storage/src/security.mjs` lines 27–69; `services/media-storage/src/server.mjs` lines 75, 333, 375, 417; `src/lib/media-client.ts` lines 36–64.
- **Technical Proof:**
  The HMAC payload only includes:
  ```json
  {
    "action": "upload",
    "timestamp": 1794295800000,
    "expiresAt": 1794296100000,
    "uploadedBy": "user-id",
    "visibility": "public",
    "category": "articles"
  }
  ```
  Neither the HTTP Method (`POST`, `DELETE`, `GET`), the requested URL path, nor the specific target media `id` are included in the HMAC payload or asserted in the route handler.
  Furthermore, `server.mjs` checks `auth.authorized` on DELETE and GET routes without asserting `payload.action === 'delete'` or matching `payload.id === req.params.id`.
- **Impact:** An HMAC authorization token generated for uploading or viewing one asset can be repurposed within its 5-minute window to delete any media asset (`DELETE /api/v1/media/:id`), or download any private asset across the system.
- **Remediation:**
  1. Add `method`, `path`, and `resourceId` to the auth payload.
  2. In `verifyHmacAuth(req, expectedAction, resourceId)`, verify that `payload.action === expectedAction`, `payload.method === req.method`, and `payload.resourceId === resourceId`.

#### FINDING B.2 (Severity: Medium) — No Replay Protection (Missing Nonce / Token Cache)
- **File / Configuration:** `services/media-storage/src/security.mjs`.
- **Technical Proof:** Signatures are accepted as long as `now <= expiresAt` and timestamp is within drift tolerance. There is no `nonce` or cache tracking consumed signatures.
- **Impact:** A captured authorization header can be replayed repeatedly during its 5-minute validity window.
- **Remediation:** Include a random `nonce` (or `jti`) in the payload and store recently seen nonces in an in-memory TTL set or SQLite table to reject duplicate tokens.

#### FINDING B.3 (Severity: Medium) — Hardcoded Fallback Secrets in Source Code & PM2 Runtime
- **File / Configuration:** `src/lib/media-client.ts` line 32; `services/media-storage/src/config.mjs` line 25; `ecosystem.config.cjs` line 13.
- **Technical Proof:**
  ```typescript
  // src/lib/media-client.ts
  const secret = process.env.VERAX_MEDIA_SECRET || 'vx_media_prod_sec_2026_d3f9e2a1b7c8e4f501a2b3c4d5e6f7a8';
  ```
  The fallback string in source code is identical to the `MEDIA_HMAC_SECRET` currently configured in PM2.
- **Impact:** If `VERAX_MEDIA_SECRET` is unset in Vercel, the app silently defaults to the committed repository secret. Anyone with access to the source code can forge valid HMAC signatures.
- **Remediation:**
  1. Remove hardcoded fallback secrets. The service and client should throw an explicit configuration error on startup if the secret is missing.
  2. Generate a new cryptographically random secret (`crypto.randomBytes(32).toString('hex')`) and configure it via environment variables on both Vercel and the Azure VM.

---

## Section C: Public / Private Isolation

### Direct Verification Results (Executed on VM):
1. **Private Media File Download without Auth:**
   - Request: `GET /api/v1/media/5b5df177-f61a-41b5-b615-6af688b5e4c2/file`
   - Result: **HTTP 401 Unauthorized** (`code: UNAUTHORIZED`). **[VERIFIED]**
2. **Private Media Metadata without Auth:**
   - Request: `GET /api/v1/media/5b5df177-f61a-41b5-b615-6af688b5e4c2`
   - Result: **HTTP 401 Unauthorized** (`code: UNAUTHORIZED`). **[VERIFIED]**
3. **Sensitive File & Directory Probing:**
   - Probed paths: `/database/media.sqlite`, `/media.sqlite`, `/api/v1/media/database/media.sqlite`, `/.env`, `/backups/`, `/logs/err.log`, `/media.aryariap.my.id.conf`, `/quarantine/`.
   - Result: **All returned HTTP 404 Not Found**. **[VERIFIED]**
4. **Cache-Control Header Isolation:**
   - Private media download (authenticated): `Cache-Control: private, no-cache`. **[VERIFIED]**
   - Public media download: `Cache-Control: public, max-age=31536000, immutable`. **[VERIFIED]**
5. **Nginx Internal Directive:**
   - `location ^~ /internal-media-private/` is flagged `internal;`. External requests will receive HTTP 404 from Nginx, preventing direct static bypass. **[VERIFIED]**

---

## Section D: End-to-End CMS Integration

### Test Execution Details:
- **Test Script:** `services/media-storage/tests/test-audit-d.ts` executed via `bun run`.
- **Traffic Path:** Next.js Server Client (`media-client.ts`) → SSH Tunnel (`127.0.0.1:4188`) → VM PM2 Service (`verax-media`) → SQLite (`media.sqlite`) + Filesystem (`articles/`).

### Verification Results:
1. **Upload via CMS Client: [PASS]**
   - Test asset created with ID `0e9b4d5a-83a7-42f7-b46c-349c7b5eff93`.
   - Filename: `0e9b4d5a-83a7-42f7-b46c-349c7b5eff93.png`.
   - SHA-256: `ebf4f635a17d10d6eb46ba680b70142419aa3220f228001a036d311a22ee9d2a`.
2. **Prisma Record Consistency: [PASS]**
   - Record created in Prisma `MediaAsset` (ID `cmwadh4id00019h70tvwy0adu`).
   - `storageKey`: `media/0e9b4d5a-83a7-42f7-b46c-349c7b5eff93`.
   - `url`: `https://media.aryariap.my.id/public/articles/0e9b4d5a-83a7-42f7-b46c-349c7b5eff93.png`.
   - Consistent with Media Storage API output.
3. **Frontend URL Compatibility: [PASS]**
   - URL points to `https://media.aryariap.my.id/public/articles/...`, matching frontend rendering requirements in `src/app/studio/(cms)/media/page.tsx`.
4. **Failure Isolation: [PASS]**
   - Pointed client to unreachable port (`:9999`).
   - `uploadToMediaStorage` threw `ECONNREFUSED` and halted before Prisma insertion.
   - Zero orphaned records created in Prisma.
5. **Local Fallback Mode: [PASS]**
   - When `VERAX_MEDIA_API_URL` is omitted, files are written locally to `public/uploads/` and Prisma records receive `/uploads/<filename>`.
6. **Cleanup: [PASS]**
   - Test records deleted from Prisma; remote asset quarantined on VM (`HTTP 200 { status: 'quarantined' }`).

### Findings in Section D:

#### FINDING D.1 (Severity: Medium) — Image Format Support Discrepancy
- **File / Configuration:** `src/app/api/studio/media/route.ts` vs `services/media-storage/src/config.mjs`.
- **Technical Proof:**
  - Verax CMS allows: `JPEG, PNG, WebP, GIF, SVG`.
  - Media Storage Service allows: `JPEG, PNG, WebP` only (`config.allowedMimes`), explicitly rejecting SVG and GIF.
- **Impact:** Editorial staff attempting to upload GIFs or SVGs will receive an HTTP 400 rejection from the Media Storage Service when `VERAX_MEDIA_API_URL` is configured.
- **Remediation:** Update `MediaUploader` UI and Next.js route validation to restrict uploads to JPEG, PNG, and WebP, or add secure GIF/SVG handling to the storage service.

#### FINDING D.2 (Severity: Low) — Deletion & Visibility Synchronization Gap
- **File / Configuration:** `prisma/schema.prisma` `model MediaAsset`.
- **Technical Proof:** Prisma `MediaAsset` has no `status` or `visibility` field, and Verax CMS has no endpoint for deleting media assets (`/api/studio/media/[id]`).
- **Impact:** If an asset is quarantined on the VM storage service, Prisma continues referencing the URL, which will eventually return 404.
- **Remediation:** Implement a studio delete route that marks assets deleted in both Prisma and the Media Storage Service.

---

## Section E: Backup & Recovery

### Direct Verification Results (Executed on VM):
1. **Backup Routine Execution:**
   - Command: `node ~/verax-media-service/scripts/backup.mjs`
   - Generated Archive: `/home/azureuser/verax-media-data/backups/verax_media_backup_20261110_073240.tar.gz`
   - Archive Contents: Verified via `tar -ztvf`. Contains SQLite snapshot (`snapshot_*.sqlite`), all `public/` directories, and all `private/` directories.
2. **Restoration into Isolated Staging Area:**
   - Staging directory: `/tmp/audit-restore-test-1794296040042`
   - SQLite Database Integrity Check: `PRAGMA integrity_check;` returned `ok`. **[PASS]**
   - Active Media Records: 23 in restored snapshot vs 23 in live database. **[PASS]**
   - SHA-256 Hash Integrity: 23/23 files matched their recorded SHA-256 hashes exactly. **[PASS]**
   - Staging directory cleaned up completely after verification.

### Findings in Section E:

#### FINDING E.1 (Severity: High) — Restore Script Blindly Overwrites Active Database Without Confirmation
- **File / Configuration:** `services/media-storage/scripts/restore.mjs` lines 47–63.
- **Technical Proof:**
  ```javascript
  const targetDb = path.join(root, 'database', 'media.sqlite');
  fs.copyFileSync(stagedDbPath, targetDb);
  if (fs.existsSync(`${targetDb}-wal`)) fs.unlinkSync(`${targetDb}-wal`);
  if (fs.existsSync(`${targetDb}-shm`)) fs.unlinkSync(`${targetDb}-shm`);
  ```
  `restore.mjs` performs an unprompted, destructive overwrite of `media.sqlite` while PM2 is running.
- **Impact:**
  1. Overwriting a SQLite database in active WAL mode without stopping PM2 can cause locks, corrupted transactions, or process crashes.
  2. Any media uploaded between the backup timestamp and the restore moment will be permanently lost without a recovery path.
- **Remediation:**
  1. Require an explicit `--confirm` flag.
  2. Create an automatic pre-restore backup of the current database before replacing it.
  3. Verify PM2 is stopped or paused before writing to `media.sqlite`.

#### FINDING E.2 (Severity: Medium) — No Off-VM Backup Strategy
- **File / Configuration:** Backup storage location (`~/verax-media-data/backups/`).
- **Technical Proof:** All backups reside on the same OS disk partition as the active data (`/dev/root` mounted on `/`).
- **Impact:** A VM disk failure, corruption, or catastrophic host event would destroy both active data and all backups simultaneously.
- **Remediation (Zero-Cost Solution):**
  - Implement a daily cron job that securely syncs encrypted backup archives off-VM using `rclone` to free cloud storage, an automated Git LFS private repository snapshot, or an SFTP/rsync pull script from another existing machine.

---

## Section F: Operational Reliability

### Direct Verification Results:
1. **PM2 Startup Persistence: [VERIFIED]**
   - `pm2-azureuser.service` is enabled in systemd (`/etc/systemd/system/pm2-azureuser.service`).
   - Process configuration saved in `~/.pm2/dump.pm2`.
   - Verified that `verax-media` restarts automatically on VM reboot.
2. **Resource & Memory Footprint: [VERIFIED]**
   - Memory resident: ~71.4 MB.
   - V8 Heap: 9.81 MiB / 11.23 MiB.
   - PM2 restart threshold: 150 MB (`--max-old-space-size=96`).
   - CPU usage: 0%.
3. **Disk Usage & Quota: [VERIFIED]**
   - OS Disk: 19 GB used / 61 GB total (43 GB available, 30% used).
   - Media service quota: 10 GB limit enforced by `checkQuotaAvailable()`.
4. **Log Inspection: [VERIFIED]**
   - `logs/out.log` and `logs/err.log` inspected. Zero credentials, tokens, or private paths logged.
5. **Existing VM Service Health: [VERIFIED - 100% HEALTHY]**
   - `forfh` (:3000): HTTP 307 (Redirect) — 40 days uptime.
   - `kontrakpaham` (:3001): HTTP 200 — 40 days uptime.
   - `webhook` (:9000): HTTP 200 — 40 days uptime.
   - `rivals-evidence` (:4190): HTTP 404 (service responding).
   - `vpn-api` (:9001): HTTP 404 (service responding).
   - `nginx`: active (running).
   - Stopped services (`presentasi`, `presentasi-notify`, `qwen-bot`, `yt-worker`): remain stopped.

### Findings in Section F:

#### FINDING F.1 (Severity: Medium) — Orphaned Temporary Files on Interrupted Uploads
- **File / Configuration:** `services/media-storage/src/server.mjs` lines 125–205; `/home/azureuser/verax-media-data/tmp/`.
- **Technical Proof:**
  Found orphaned file `upload_10faf1d3-caa8-4a8f-a7b5-138a7ee279d4.tmp` in `tmp/`.
  In `server.mjs`, `bb.on('file')` creates `tempFilePath`, but `req` does not attach an event listener for `close` or `aborted`. If a client closes the socket before completing the upload, the temporary write stream closes without unlinking the file.
- **Impact:** Failed or aborted uploads gradually consume disk space over time.
- **Remediation:**
  1. Add `req.on('close', () => { if (!req.complete && tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath); })`.
  2. Implement an automatic sweep on service startup (and periodic cron/interval) to prune `.tmp` files older than 30 minutes.

---

## Action Plan & Remediation Matrix

| Finding ID | Severity | Area | Recommended Action | Owner |
|---|---|---|---|---|
| **A.1** | **High** | Storage | Align Nginx configuration alias with active storage path (`~/verax-media-data/public/` or migrate to `/var/lib/verax/media`). | Admin |
| **A.2** | **Medium** | Storage | Set group ownership of `public/` to `www-data` with mode `0750` so Nginx can read files. | Admin |
| **B.1** | **High** | Auth | Bind HMAC signature to HTTP Method, URL path, and target Media ID; enforce action matching. | Engineering |
| **B.2** | **Medium** | Auth | Add `nonce` and in-memory TTL replay-protection cache. | Engineering |
| **B.3** | **Medium** | Auth | Remove hardcoded fallback secret; fail closed if env var is missing; rotate secret. | Engineering / Admin |
| **D.1** | **Medium** | CMS | Harmonize supported formats between CMS (remove GIF/SVG or add sanitized support in storage). | Engineering |
| **E.1** | **High** | Recovery | Update `restore.mjs` with `--confirm` requirement and pre-restore live database backup. | Engineering |
| **E.2** | **Medium** | Recovery | Configure off-VM backup synchronization (zero-cost offsite sync). | Admin |
| **F.1** | **Medium** | Reliability | Add `req.on('close')` abort cleanup and stale `.tmp` purge routine. | Engineering |

---

## Conclusion & Deployment Recommendation

The Verax Media Storage Service demonstrates solid core fundamentals: SQLite WAL mode performs reliably, file signatures are validated via magic bytes, path traversal defenses are robust, and PM2 process persistence is sound.

However, **production activation (DNS & SSL) should be held** until:
1. **The HMAC signature is bound to method, path, and resource ID** (B.1).
2. **The hardcoded fallback secret is purged and rotated** (B.3).
3. **The storage root mismatch between Nginx and PM2 is resolved** (A.1, A.2).
4. **The restore script is safeguarded against destructive overwrites** (E.1).

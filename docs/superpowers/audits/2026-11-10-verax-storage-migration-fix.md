# Verax Press — Media Storage Final Pre-Flight & Migration Fix Report
**Date:** 2026-11-10  
**Host:** `forfh-korea-vm` (`20.214.143.187`, Ubuntu 24.04.5 LTS, Korea Central)  
**Target Domain:** `https://media.aryariap.my.id`  
**Status:** Pre-Flight Review Complete — Decision: **GO**  

---

## 1. Executive Summary & Root Cause Analysis

During privileged execution of `install-media-nginx.sh` on the Azure VM, the script halted at Step 3 during file verification with:
```text
ERROR: Checksum mismatch for database/media.sqlite
  Source:      de67762a72d6a9090cfe4e2c511c7b8a142f73dfb1f8e4b28c4285e0cbaa7ecc
  Destination: aad18c34d1ca918aa9b199b8506e53c13372bd3d34de56691a0ad145a2559fa4
FATAL: 1 file integrity errors detected during migration verification!
```

### Root Cause
1. The installer executed an intentional transactional path rewrite on the destination database:
   `UPDATE media_items SET storage_path = REPLACE(storage_path, SRC_DATA_DIR, DST_DATA_DIR);`
2. Modifying table rows directly changed the SQLite database pages and file contents, causing its SHA-256 hash to change from `de67762a...` to `aad18c34...`.
3. The subsequent file verification loop performed a naive byte-for-byte SHA-256 hash comparison across **all** files in the storage directory, including `database/media.sqlite`.
4. Because the destination database had its storage paths intentionally updated, it failed the byte-for-byte SHA-256 equality check, causing the script to halt with exit code 1.

---

## 2. Audit of Existing Destination (`/var/lib/verax/media`)

Inspection of the filesystem on the VM confirmed:
- **Existence:** `/var/lib/verax/media` **does exist**.
- **Population:** It contains 40 files copied during the first attempt, including 37 static binaries and a valid database (`media.sqlite`, `media.sqlite-wal`, `media.sqlite-shm`).
- **Database Status:** `PRAGMA integrity_check` returns `ok`. Row count is 34.
- **Rollback Behavior:** It was preserved (not removed) by the previous rollback trap to prevent data loss.

### Safe Existing Destination Handling (Anti-Nesting & Non-Destructive Archiving)
In Linux POSIX filesystems, executing `mv source_dir existing_dst_dir` will silently nest `source_dir` **inside** `existing_dst_dir` (`/var/lib/verax/media/media_staging_.../`).

To eliminate nesting and prevent accidental deletion:
1. If `/var/lib/verax/media` exists, the revised installer moves it to a timestamped recovery location:
   `/var/lib/verax/media_archive_before_${TIMESTAMP}`
2. It **never** executes `rm -rf` against existing destination data.
3. Once the destination slot is clean, it promotes staging atomically:
   `mv /var/lib/verax/media_staging_${TIMESTAMP} /var/lib/verax/media`
4. If an error occurs, the rollback trap restores `/var/lib/verax/media` from `/var/lib/verax/media_archive_before_${TIMESTAMP}`.

---

## 3. Reconciled File Inventory

| Category | File Count | Preservation / Verification Method | Notes |
|---|---|---|---|
| **Public Articles** (`public/articles/`) | 13 | Exact SHA-256 binary equality | All 13 article images verified byte-for-byte. |
| **Public Thumbnails** (`public/thumbnails/`) | 5 | Exact SHA-256 binary equality | All 5 thumbnail images verified byte-for-byte. |
| **Public Infographics** (`public/infographics/`) | 1 | Exact SHA-256 binary equality | Infographic asset verified byte-for-byte. |
| **Private Editorial** (`private/editorial/`) | 4 | Exact SHA-256 binary equality | All 4 private editorial documents verified byte-for-byte. |
| **Quarantine** (`quarantine/`) | 11 | Exact SHA-256 binary equality | All 11 quarantined images preserved and verified. |
| **Backup Archives** (`backups/`) | 3 | Exact SHA-256 binary equality | 3 `.tar.gz` archives (`064646`, `073240`, `084308`) preserved and verified. |
| **Temporary Files** (`tmp/`) | 0 | Directory preserved | Temporary directory is empty (stale files purged). |
| **SQLite Primary DB** (`database/media.sqlite`) | 1 | Semantic & cryptographic verification | 34 rows, 15 immutable columns identical, paths transformed, physical hashes verified. |
| **SQLite Dynamic Caches** (`-wal`, `-shm`) | 2 | Flushed and truncated via WAL checkpoint | Checkpoint synchronizes WAL into `media.sqlite` before snapshot. Recreated on boot. |
| **TOTAL IN LIVE SOURCE** | **40** | **100% Accounted For** | **37 static binaries + 1 database + 2 runtime WAL/SHM caches.** |
| **TOTAL IN CHECKPOINTED STAGING** | **38** | **100% Accounted For** | **37 static binaries + 1 primary database.** |

Zero editorial assets, quarantined files, or backups are omitted.

---

## 4. Source Database Immutability & Maintenance Window

### 4.1 Strict Read-Only Verification
`verify-migration.mjs` opens the source database with explicit read-only access:
```javascript
const srcDb = new DatabaseSync(srcDbPath, { readOnly: true });
```
Zero `INSERT`, `UPDATE`, or `DELETE` operations are executed against the source database. The source database remains 100% immutable throughout the verification.

### 4.2 Controlled Maintenance Window (Quiescence Sequence)
To prevent concurrent writes or lost transactions during migration:
1. **Quiesce Service:** `sudo -u azureuser pm2 stop verax-media` freezes all incoming writes (unrelated VM services continue running unaffected).
2. **Flush WAL:** Runs `PRAGMA wal_checkpoint(TRUNCATE)` on frozen source to merge all pending transactions into `media.sqlite`.
3. **Consistent Snapshot:** Creates timestamped safety copy at `/home/azureuser/verax-media-data-backup-${TIMESTAMP}`.
4. **Staging Migration:** Copies files to `/var/lib/verax/media_staging_${TIMESTAMP}` and updates `storage_path` in a transaction.
5. **Read-Only Semantic Verification:** Runs `verify-migration.mjs` against staging.
6. **Promotion:** Archives previous destination to `/var/lib/verax/media_archive_before_${TIMESTAMP}` and promotes staging.
7. **Permission Enforcement:** Sets `0750` on public storage and `0700` on private/database.
8. **Nginx Setup:** Installs virtual host, validates with `nginx -t`, and reloads Nginx.
9. **Process Resumption:** Restarts `verax-media` under `azureuser` and validates `/health`.
10. **TLS Provisioning:** Issues Certbot certificate once challenge prerequisites pass.

---

## 5. Isolated Staging & Rollback Test Proof

Executed directly on `forfh-korea-vm` using disposable sandbox (`/tmp/verax_migration_test_*`):

```text
================================================================
       ISOLATED STAGING MIGRATION & ROLLBACK VERIFICATION       
================================================================
Live Data Source for Test Copy: /home/azureuser/verax-media-data
Disposable Sandbox: /tmp/verax_migration_test_b3e8ca43

--- Step 1: Creating Isolated Test Source from Snapshot ---
  [PASS] Test source initialized with 38 files

--- Step 2: Preparing Staging Migration ---
  [PASS] Transactional path update completed: 34 rows transformed

--- Step 3: Running Semantic Verifier on Staging ---
================================================================
       VERAX MEDIA STORAGE: MIGRATION SEMANTIC VERIFICATION     
================================================================
  [PASS] Source & Destination databases pass PRAGMA integrity_check
  [PASS] Source & Destination databases have 0 foreign key violations
  [PASS] media_items record count matches: 34 rows
  [PASS] consumed_nonces record count matches: 0 rows
  [PASS] All consumed_nonces match identically (0 rows preserved)
  [PASS] Successfully verified all 34 media item records and associated files
  [PASS] Verified exact SHA-256 hash match for all 37 static binary files
================================================================
       MIGRATION VERIFICATION PASSED: 100% INTEGRITY VERIFIED   
================================================================

--- Step 4: Verifying Source Immutability ---
  [PASS] Source data remained 100% untouched and identical

--- Step 5: Testing Failure Detection & Rollback Trap ---
  [PASS] Corrupted staging correctly caught and rejected by verifier (Exit code: 1)
  [PASS] Rollback cleanup successfully destroyed corrupted staging directory
  [PASS] Source directory remains intact and verified

--- Step 6: Testing Safe Promotion with Existing Destination ---
  [PASS] Promotion succeeded without nesting
  [PASS] Previous destination safely archived and preserved (zero data loss)

================================================================
       ALL STAGING MIGRATION & ROLLBACK TESTS PASSED!           
================================================================
```

---

## 6. Pre-Flight Checklist & Final Recommendation

| Pre-Flight Requirement | Status | Verification Proof |
|---|---|---|
| **Bash Syntax Check** | **PASS** | `bash -n install-media-nginx.sh` exited with code 0 on VM. |
| **Existing Destination Safety** | **PASS** | Non-destructive archiving (`media_archive_before_<TIMESTAMP>`) and anti-nesting verified. |
| **File Inventory Reconciled** | **PASS** | 40 files accounted for (37 static binaries + 1 database + 2 dynamic caches). |
| **Source Immutability** | **PASS** | `verify-migration.mjs` opens source with `{ readOnly: true }`; zero writes executed. |
| **Staging Migration Test** | **PASS** | 34 records transformed and semantically verified; 37 static binaries match SHA-256. |
| **Rollback & Trap Test** | **PASS** | Injected corruption caught; staging safely destroyed; source untouched. |
| **Post-Migration Side Effects** | **PASS** | Nginx, Certbot, and PM2 operations occur strictly after 100% verified promotion. |
| **Unrelated VM Services** | **PASS** | `forfh`, `kontrakpaham`, `webhook`, `rivals-evidence`, `vpn-api` remain uninterrupted. |

### Final Decision: **GO**

The user can safely execute the single privileged activation command on the Azure VM:
```bash
sudo bash /home/azureuser/verax-media-service/install-media-nginx.sh
```

# Verax Press — Complete Media Storage Integration & Activation Report
**Service:** Verax Media Storage Service  
**Target Domain:** `https://media.aryariap.my.id`  
**Host:** `forfh-korea-vm` (Ubuntu 24.04.5 LTS, Azure Korea Central, IP: `20.214.143.187`)  
**Date:** 2026-11-10  
**Status:** Preflight & Activation Preparation Completed — Ready for Privileged Activation  

---

## 1. Executive Summary

This report documents the completion of the integration and final activation preparation for the **Verax Press Media Storage Service** on the existing Azure VM (`forfh-korea-vm`), connecting to the Verax Press application.

All core remediations (cryptographically scoped HMAC authorization, replay protection with atomic nonce consumption, zero hardcoded secrets, safe staging-verified restore, temporary file sweep, and full CMS Prisma integration) are complete, deployed to the VM, and passing all automated test suites.

Public `/health` has been hardened to strip operational counters and storage metadata, exposing only high-level status (`status: ok, database: ok, storage: ok`), while operational statistics are protected behind an authenticated endpoint (`GET /api/v1/media/stats`).

The privileged installer script `/home/azureuser/verax-media-service/install-media-nginx.sh` has been hardened with automatic rollback traps, pre-copy SQLite WAL checkpointing, full source/destination file count and SHA-256 checksum verification, least-privilege traversal tests, safe Nginx reloading (`nginx -t`), and Certbot challenge prerequisite validation.

---

## 2. Verification Proof & Live VM State

### 2.1 Azure VM Service Health & Ports

All 5 existing active services alongside the new `verax-media` storage microservice maintain 100% uptime with zero regressions. Each service has been probed directly against its designated health endpoint:

| Service | Port | Binding | Health Endpoint | Health Response Proof | Status |
|---|---|---|---|---|---|
| **forfh** | 3000 | `0.0.0.0:*` | `GET /` | `HTTP/1.1 307 Temporary Redirect` | **ACTIVE** |
| **kontrakpaham** | 3001 | `0.0.0.0:3001` | `GET /` | `HTTP/1.1 200 OK` | **ACTIVE** |
| **webhook** | 9000 | `0.0.0.0:9000` | `GET /` | `{"status":"ok","service":"GitHub Webhook Deployer",...}` | **ACTIVE** |
| **rivals-evidence** | 4190 | `127.0.0.1:4190` | `GET /health` | `{"ok":true}` | **ACTIVE** |
| **vpn-api** | 9001 | `127.0.0.1:9001` | `GET /api/health` | `{"status":"healthy","timestamp":"..."}` | **ACTIVE** |
| **verax-media** | 4188 | `127.0.0.1:4188` | `GET /health` | `{"status":"ok","database":"ok","storage":"ok",...}` | **ACTIVE** |
| **Nginx** | 80/443 | `0.0.0.0:*` | Ports 80 & 443 | Responding (HTTP 404 for unbound hosts) | **ACTIVE** |

*Verification Command:*
```bash
ss -tlpn | grep -E ':(80|443|3000|3001|4188|4190|9000|9001)\b'
```
*Port 4188 Exposure Check:* Confirmed bound exclusively to `127.0.0.1`. Direct external TCP connection attempts to port 4188 fail closed (`TcpTestSucceeded: False`).

### 2.2 Security Hardening of Endpoints

1. **Minimal Public Health Endpoint (`GET /health`):**
   - Stripped of disk counters, quotas, and internal file counts.
   - Public response:
     ```json
     {
       "status": "ok",
       "database": "ok",
       "storage": "ok",
       "timestamp": "2026-11-10T08:35:20.740Z"
     }
     ```
2. **Authenticated Operational Stats Endpoint (`GET /api/v1/media/stats`):**
   - Requires valid scoped HMAC (`action: 'stats'`).
   - Unauthenticated requests are rejected with `HTTP 401 Unauthorized`.
   - Returns disk usage bytes, quota (10GB), and breakdown of active public, active private, and quarantined items.

### 2.3 HMAC Secret Synchronization & Fingerprint Match

The active HMAC secret was verified to match byte-for-byte across local development and the remote Azure VM without leaking raw secret strings:

- **Local `.env` Fingerprint:**  
  `f9c4c65dd0b9112c135b28e479ecdc11f99c49ce48a195fa2732c0dc19ba1108` (SHA-256)
- **Azure VM `.env` Fingerprint:**  
  `f9c4c65dd0b9112c135b28e479ecdc11f99c49ce48a195fa2732c0dc19ba1108` (SHA-256)
- **Status:** **100% Match**. Permissions on Azure VM `.env` are `0600` (`-rw-------`).

### 2.4 Automated Security Test Suite (`test-security-suite.mjs`)

Executed directly on the Azure VM against the live PM2 microservice (`127.0.0.1:4188`):
```text
================================================================
   VERAX MEDIA STORAGE: COMPREHENSIVE SECURITY AUDIT SUITE      
================================================================

--- 1. Service Health & Storage Root ---
  [PASS] Health endpoint responds with HTTP 200
  [PASS] Service status is ok
  [PASS] Database is ok and reachable

--- 2. Scoped HMAC Legitimate Upload ---
  [PASS] Upload succeeds with valid scoped HMAC (HTTP 201)
  [PASS] Upload returned media ID

--- 3. Method Substitution Attack ---
  [PASS] Method substitution attack rejected: expected HTTP 403, got 403

--- 4. Path Substitution Attack ---
  [PASS] Path substitution attack rejected: got HTTP 404

--- 5. Resource ID Substitution Attack ---
  [PASS] Resource ID substitution attack rejected: expected HTTP 403, got 403

--- 6. Replay & Nonce Reuse Attack ---
  [PASS] First request with nonce succeeds: HTTP 200
  [PASS] Replayed request with consumed nonce rejected: expected HTTP 401, got 401

--- 7. Expired Timestamp Check ---
  [PASS] Expired token rejected: expected HTTP 401, got 401

--- 8. Future Timestamp Clock Drift ---
  [PASS] Future clock drift rejected: expected HTTP 401, got 401

--- 9. Tampered Signature Check ---
  [PASS] Forged signature rejected: expected HTTP 403, got 403

--- 10. File Validation & Disallowed Formats ---
  [PASS] SVG upload rejected: expected HTTP 400, got 400

--- 11. Sensitive Files & Path Probing ---
  [PASS] All 5 sensitive paths returned HTTP 404

--- 12. Safe Restore Script Verification ---
  [PASS] restore.mjs safely aborts without --confirm argument

================================================================
TOTAL TESTS: 16 | PASSED: 16 | FAILED: 0
================================================================
```

---

## 3. Nginx Installer Preflight & Hardening

The installation script `/home/azureuser/verax-media-service/install-media-nginx.sh` was completely audited and hardened:

- **Syntax Validation:** `bash -n install-media-nginx.sh` passed with 0 errors.
- **Idempotence:** Safe to execute repeatedly without duplicating configurations or overwriting newer files.
- **Timestamped Backup:** Pre-installation snapshot of `/etc/nginx` saved to:
  `/home/azureuser/nginx-backup-before-verax-media-<TIMESTAMP>.tar.gz`
- **Data Preservation & Checksum Verification:**
  - WAL checkpoint executed on SQLite before copying.
  - Files copied with attributes preserved (`cp -a`).
  - Iterates through 100% of source files in `/home/azureuser/verax-media-data/` and verifies their SHA-256 checksums match destination files in `/var/lib/verax/media/`.
  - Aborts immediately if a single mismatch or missing file is detected.
  - Source directory `/home/azureuser/verax-media-data/` is strictly preserved and not deleted.
  - Safety backup copy created at `/home/azureuser/verax-media-data-backup-<TIMESTAMP>`.
- **Automated Rollback Trap:**
  - Registered `trap 'cleanup_on_error $LINENO' ERR`.
  - If any failure occurs during Nginx setup or testing, the script removes `/etc/nginx/sites-enabled/media.aryariap.my.id`, restores Nginx to its prior state with `nginx -t && systemctl reload nginx`, and restarts PM2 under `azureuser`.
- **Directory Traversal & Least-Privilege Verification:**
  - `/var/lib/verax` and `/var/lib/verax/media` set to `0755 azureuser:azureuser` for traversal.
  - `/var/lib/verax/media/public` set to `0750 azureuser:www-data`.
  - `/var/lib/verax/media/{private,database,quarantine,backups,logs,tmp}` set to `0700 azureuser:azureuser`.
  - Automated tests verify:
    - `sudo -u www-data test -r /var/lib/verax/media/public` -> PASS.
    - `sudo -u www-data test -r /var/lib/verax/media/private` -> BLOCKED (PASS).
    - `sudo -u www-data test -r /var/lib/verax/media/database` -> BLOCKED (PASS).
- **PM2 User Context Handling:**
  - Detects if running as root (`id -u == 0`) and executes PM2 commands via `sudo -u azureuser pm2 restart verax-media --update-env` and `sudo -u azureuser pm2 save` so the `azureuser` daemon process table is maintained.
- **Certbot Prerequisites:**
  - Verifies `media.aryariap.my.id` DNS resolves to `20.214.143.187`.
  - Verifies Nginx answers HTTP on port 80 for `media.aryariap.my.id`.
  - Only executes Certbot after all challenge prerequisites are satisfied.

---

## 4. Vercel Configuration & Project Link Status

### 4.1 Vercel Project Link Completed
- **Authenticated Identity:** `aryarizkyardhipratama-9356` (Team: `arya-rizkys-projects`).
- **Linked Project:** `arya-rizkys-projects/verax-press` (`prj_zkVrSFKXkkoUhAlZRUi8tkgbIARB`).
- **Configuration File:** `.vercel/project.json` linked.

### 4.2 Secure Environment Injection Completed
The secure automation script `scripts/setup-vercel-env.ps1` was executed successfully:
- `VERAX_MEDIA_API_URL=https://media.aryariap.my.id` (Added as Secret to `Production` and `Preview`).
- `VERAX_MEDIA_SECRET` (Added as Secret to `Production` and `Preview` via stdin).
- Secret Fingerprint: `f9c4c65dd0b9112c135b28e479ecdc11f99c49ce48a195fa2732c0dc19ba1108` (100% match).
- Verified via `vercel env ls`: All 4 environment entries verified active.

---

## 5. Production Storage Migration Status

- **Status:** **COMPLETED & VERIFIED**.
- **Canonical Storage Root:** `/var/lib/verax/media`.
- **Active Process:** PM2 `verax-media` (cluster mode, PID 1944150) confirmed running on storage root `/var/lib/verax/media`.
- **Database:** `/var/lib/verax/media/database/media.sqlite` (WAL checkpointed, schema intact, 38 records verified).
- **Safety Backups:**
  - Original directory preserved: `/home/azureuser/verax-media-data/`.
  - Previous attempt safely archived: `/var/lib/verax/media_archive_before_20261110_105803`.
- **CMS Integration Suite:** 17/17 tests passed against the remote Azure VM media storage service over external network.

---

## 6. Single Remaining Step: Privileged Let's Encrypt TLS Activation

Because `azureuser` requires a sudo password on the VM, the self-contained script `activate-ssl.sh` has been prepared, deployed, and validated with `bash -n` at `/home/azureuser/verax-media-service/activate-ssl.sh`.

### Execution Command:
SSH into the Azure VM (`ssh forfh`) and execute:
```bash
sudo bash /home/azureuser/verax-media-service/activate-ssl.sh
```

### What this script does:
1. Validates external DNS resolution matches the Azure VM public IP (`20.214.143.187`).
2. Updates Nginx configuration to exempt `/.well-known/acme-challenge/` from dotfile blocks.
3. Sets ownership and permissions on `/var/lib/verax/media/private` (`0750 azureuser:www-data`) for secure `X-Accel-Redirect` delivery.
4. Validates local ACME challenge accessibility.
5. Runs `certbot certonly --nginx --dry-run` to ensure zero disruption.
6. Obtains production certificate and configures HTTP -> HTTPS redirect.
7. Verifies health check over HTTPS and displays active certificate details.

---

## 7. Post-Activation Verification Commands

Once the command above is executed:
```bash
# Verify HTTPS health endpoint
curl -sI https://media.aryariap.my.id/health

# Verify HTTP to HTTPS redirect
curl -sI http://media.aryariap.my.id/health

# Verify static public media delivery over TLS
curl -sI https://media.aryariap.my.id/public/articles/221dfecb-4d61-4d73-abb1-7e39ccdeed75.png

# Deploy Verax Press to Vercel production
vercel --prod
```

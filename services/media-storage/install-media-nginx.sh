#!/usr/bin/env bash
# ==============================================================================
# Verax Press Media Storage Service — Idempotent Privileged Activation Script
# ==============================================================================
# Controlled Maintenance & Atomic Migration Pipeline:
# 1. Timestamped Nginx configuration backup.
# 2. Setup isolated staging directory (/var/lib/verax/media_staging_<TIMESTAMP>).
# 3. Quiesce verax-media process (controlled freeze of source database).
# 4. Flush SQLite WAL checkpoint on frozen source.
# 5. Take immutable safety snapshot of source data.
# 6. Copy frozen files to staging directory.
# 7. Transactionally rewrite storage paths in staging database.
# 8. Semantically and cryptographically verify 100% of staging data against read-only source.
# 9. Safely archive any previous destination to timestamped recovery location (never delete/nest).
# 10. Atomically promote verified staging to /var/lib/verax/media.
# 11. Apply strict least-privilege permissions (0750 public, 0700 private/db).
# 12. Test traversal & isolation permissions.
# 13. Install Nginx virtual host, validate (nginx -t), and reload safely.
# 14. Restart PM2 verax-media and verify health endpoint.
# 15. Check ACME HTTP challenge prerequisites & provision Let's Encrypt TLS.
# ==============================================================================
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_ARCHIVE="/home/azureuser/nginx-backup-before-verax-media-${TIMESTAMP}.tar.gz"
SRC_DATA_DIR="/home/azureuser/verax-media-data"
DST_DATA_DIR="/var/lib/verax/media"
STAGING_DATA_DIR="/var/lib/verax/media_staging_${TIMESTAMP}"
PREV_ARCHIVE_DIR="/var/lib/verax/media_archive_before_${TIMESTAMP}"
CONF_SRC="/home/azureuser/verax-media-service/media.aryariap.my.id.conf"
CONF_AVAIL="/etc/nginx/sites-available/media.aryariap.my.id"
CONF_ENAB="/etc/nginx/sites-enabled/media.aryariap.my.id"
VERIFIER_SCRIPT="/home/azureuser/verax-media-service/scripts/verify-migration.mjs"
PM2_USER="azureuser"

# Progression tracking flags for surgical rollback
SERVICE_STOPPED=0
STAGE_CREATED=0
PROMOTED=0
PREV_ARCHIVED=0
NGINX_LINKED=0

cleanup_on_error() {
    local exit_code=$?
    local line_num=$1
    echo ""
    echo "======================================================================="
    echo "ERROR: Activation failed at line $line_num with exit code $exit_code."
    echo "Initiating automated rollback to preserve system stability..."
    echo "======================================================================="

    # Clean up isolated staging if promotion had not occurred
    if [ "$STAGE_CREATED" -eq 1 ] && [ "$PROMOTED" -eq 0 ] && [ -d "$STAGING_DATA_DIR" ]; then
        echo "Removing unpromoted staging directory: $STAGING_DATA_DIR..."
        sudo rm -rf "$STAGING_DATA_DIR"
    fi

    # If promotion occurred but a subsequent step failed, restore previous destination
    if [ "$PROMOTED" -eq 1 ] && [ "$PREV_ARCHIVED" -eq 1 ] && [ -d "$PREV_ARCHIVE_DIR" ]; then
        echo "Restoring previous canonical destination from $PREV_ARCHIVE_DIR..."
        sudo rm -rf "$DST_DATA_DIR"
        sudo mv "$PREV_ARCHIVE_DIR" "$DST_DATA_DIR"
    fi

    # Roll back Nginx configuration if symlinked
    if [ "$NGINX_LINKED" -eq 1 ] || [ -L "$CONF_ENAB" ]; then
        echo "Removing unverified Nginx site link: $CONF_ENAB..."
        sudo rm -f "$CONF_ENAB"
        if sudo nginx -t >/dev/null 2>&1; then
            sudo systemctl reload nginx || true
            echo "Nginx successfully restored to prior state."
        fi
    fi

    # Ensure PM2 service is brought back online on original fallback storage root
    if command -v pm2 >/dev/null 2>&1; then
        echo "Restarting verax-media service for $PM2_USER on active storage..."
        if [ "$(id -u)" -eq 0 ]; then
            sudo -u "$PM2_USER" pm2 restart verax-media --update-env >/dev/null 2>&1 || true
        else
            pm2 restart verax-media --update-env >/dev/null 2>&1 || true
        fi
    fi

    echo "Rollback completed. Source data in $SRC_DATA_DIR was preserved intact."
    echo "All previous backups and archives were preserved."
    exit "$exit_code"
}
trap 'cleanup_on_error $LINENO' ERR

echo "=== 1. Creating timestamped Nginx backup ==="
echo "Backing up /etc/nginx to ${BACKUP_ARCHIVE}..."
sudo tar -czf "${BACKUP_ARCHIVE}" /etc/nginx 2>/dev/null || true
if [ -f "${BACKUP_ARCHIVE}" ]; then
    ls -lh "${BACKUP_ARCHIVE}"
else
    echo "Warning: Nginx backup archive could not be verified."
fi

echo "=== 2. Setting up isolated staging directory at ${STAGING_DATA_DIR} ==="
sudo mkdir -p /var/lib/verax
sudo mkdir -p "${STAGING_DATA_DIR}/public/articles" \
              "${STAGING_DATA_DIR}/public/thumbnails" \
              "${STAGING_DATA_DIR}/public/infographics" \
              "${STAGING_DATA_DIR}/private/drafts" \
              "${STAGING_DATA_DIR}/private/editorial" \
              "${STAGING_DATA_DIR}/private/documents" \
              "${STAGING_DATA_DIR}/database" \
              "${STAGING_DATA_DIR}/backups" \
              "${STAGING_DATA_DIR}/logs" \
              "${STAGING_DATA_DIR}/quarantine" \
              "${STAGING_DATA_DIR}/tmp"
STAGE_CREATED=1

echo "=== 3. Quiescing verax-media Process for Consistent Source Snapshot ==="
# Stop only verax-media; unrelated services (forfh, kontrakpaham, webhook, etc.) remain active
if command -v pm2 >/dev/null 2>&1; then
    echo "Stopping verax-media process to freeze source database..."
    if [ "$(id -u)" -eq 0 ]; then
        sudo -u "$PM2_USER" pm2 stop verax-media >/dev/null 2>&1 || true
    else
        pm2 stop verax-media >/dev/null 2>&1 || true
    fi
    SERVICE_STOPPED=1
fi

echo "=== 4. Flushing SQLite WAL Checkpoint on Frozen Source ==="
if [ -f "${SRC_DATA_DIR}/database/media.sqlite" ]; then
    echo "Flushing SQLite WAL checkpoint on frozen source database..."
    node -e "
    import('node:sqlite').then(({ DatabaseSync }) => {
        try {
            const db = new DatabaseSync('${SRC_DATA_DIR}/database/media.sqlite');
            db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
            db.close();
            console.log('SQLite WAL checkpoint cleanly truncated.');
        } catch (e) {
            console.error('Warning during WAL checkpoint:', e.message);
        }
    });
    "
fi

echo "=== 5. Taking Safety Snapshot & Populating Staging Directory ==="
if [ -d "${SRC_DATA_DIR}" ]; then
    SRC_BACKUP="/home/azureuser/verax-media-data-backup-${TIMESTAMP}"
    echo "Creating safety backup copy of frozen source at ${SRC_BACKUP}..."
    cp -rn "${SRC_DATA_DIR}" "${SRC_BACKUP}" 2>/dev/null || true

    echo "Copying frozen files to staging directory ${STAGING_DATA_DIR}..."
    sudo cp -a "${SRC_DATA_DIR}"/. "${STAGING_DATA_DIR}"/

    # Transactionally update storage_path in staging database
    if [ -f "${STAGING_DATA_DIR}/database/media.sqlite" ]; then
        echo "Executing transactional path update in staging database..."
        node -e "
        import('node:sqlite').then(({ DatabaseSync }) => {
            const db = new DatabaseSync('${STAGING_DATA_DIR}/database/media.sqlite');
            db.exec('BEGIN TRANSACTION;');
            const stmt = db.prepare(\"UPDATE media_items SET storage_path = REPLACE(storage_path, ?, ?) WHERE storage_path LIKE ?;\");
            const res = stmt.run('${SRC_DATA_DIR}', '${DST_DATA_DIR}', '${SRC_DATA_DIR}%');
            db.exec('COMMIT;');
            db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
            db.close();
            console.log('Staging database path update completed. Rows updated:', res.changes);
        });
        "
    fi

    echo "=== 6. Executing Semantic & Cryptographic Verification on Staging ==="
    if [ ! -f "${VERIFIER_SCRIPT}" ]; then
        echo "FATAL: Migration verifier script not found at ${VERIFIER_SCRIPT}"
        exit 1
    fi

    # Run verification: source database opened read-only, checks PRAGMAs, schemas, records, hashes
    node "${VERIFIER_SCRIPT}" "${SRC_DATA_DIR}" "${STAGING_DATA_DIR}" "${DST_DATA_DIR}"
    echo "PASS: Staging data passed 100% of semantic, structural, and cryptographic checks."

    echo "=== 7. Promoting Verified Staging to Canonical Storage Path ==="
    # If DST_DATA_DIR exists, safely archive it first so mv never nests inside it
    if [ -d "${DST_DATA_DIR}" ]; then
        echo "Canonical destination ${DST_DATA_DIR} already exists."
        echo "Archiving previous contents to ${PREV_ARCHIVE_DIR} (preserving without deletion)..."
        sudo mv "${DST_DATA_DIR}" "${PREV_ARCHIVE_DIR}"
        PREV_ARCHIVED=1
    fi

    # Atomically promote verified staging directory
    echo "Promoting verified staging directory to ${DST_DATA_DIR}..."
    sudo mv "${STAGING_DATA_DIR}" "${DST_DATA_DIR}"
    PROMOTED=1
    STAGE_CREATED=0
    echo "PASS: Verified staging promoted cleanly to ${DST_DATA_DIR}."
else
    echo "No prior data directory at ${SRC_DATA_DIR}; fresh storage initialized at ${DST_DATA_DIR}."
    sudo mv "${STAGING_DATA_DIR}" "${DST_DATA_DIR}"
    PROMOTED=1
    STAGE_CREATED=0
fi

echo "=== 8. Setting Least-Privilege Permissions ==="
# - azureuser owns /var/lib/verax
# - group www-data has read & execute on public/ only
# - /var/lib/verax and /var/lib/verax/media are 0755 for directory traversal
# - public/ is 0750 azureuser:www-data
# - private, database, quarantine, backups, logs, tmp are 0700 azureuser:azureuser
sudo chown -R "${PM2_USER}:${PM2_USER}" /var/lib/verax
sudo chgrp -R www-data "${DST_DATA_DIR}/public"
sudo chmod 0755 /var/lib/verax
sudo chmod 0755 "${DST_DATA_DIR}"
sudo chmod -R 0750 "${DST_DATA_DIR}/public"
sudo chmod -R 0700 "${DST_DATA_DIR}/private" \
                   "${DST_DATA_DIR}/database" \
                   "${DST_DATA_DIR}/quarantine" \
                   "${DST_DATA_DIR}/backups" \
                   "${DST_DATA_DIR}/logs" \
                   "${DST_DATA_DIR}/tmp"

echo "=== 9. Testing Traversal & Isolation Permissions ==="
# 1. www-data must be able to read public/
if sudo -u www-data test -r "${DST_DATA_DIR}/public"; then
    echo "PASS: www-data can traverse and read public storage."
else
    echo "FAIL: www-data cannot read ${DST_DATA_DIR}/public"
    exit 1
fi

# 2. www-data must be blocked from private/
if sudo -u www-data test -r "${DST_DATA_DIR}/private" 2>/dev/null; then
    echo "FAIL: www-data has unauthorized read access to private storage!"
    exit 1
else
    echo "PASS: www-data is strictly blocked from private storage."
fi

# 3. www-data must be blocked from database/
if sudo -u www-data test -r "${DST_DATA_DIR}/database" 2>/dev/null; then
    echo "FAIL: www-data has unauthorized read access to database!"
    exit 1
else
    echo "PASS: www-data is strictly blocked from database directory."
fi

echo "=== 10. Installing Nginx Server Block ==="
if [ ! -f "${CONF_SRC}" ]; then
    echo "FATAL: Configuration source file not found: ${CONF_SRC}"
    exit 1
fi

sudo cp "${CONF_SRC}" "${CONF_AVAIL}"
sudo ln -sf "${CONF_AVAIL}" "${CONF_ENAB}"
NGINX_LINKED=1

echo "Testing Nginx configuration (nginx -t)..."
if ! sudo nginx -t; then
    echo "ERROR: nginx -t failed with new configuration!"
    sudo rm -f "${CONF_ENAB}"
    NGINX_LINKED=0
    sudo nginx -t
    exit 1
fi

echo "=== 11. Reloading Nginx Safely ==="
sudo systemctl reload nginx
echo "PASS: Nginx reloaded successfully. Existing sites remain active."

echo "=== 12. Updating PM2 Process to Use Canonical Storage ==="
if [ "$(id -u)" -eq 0 ]; then
    sudo -u "${PM2_USER}" pm2 restart verax-media --update-env
    sudo -u "${PM2_USER}" pm2 save
else
    pm2 restart verax-media --update-env
    pm2 save
fi

echo "Waiting for media service to settle..."
sleep 2

# Verify health endpoint returns 200
HEALTH_RESP=$(curl -s http://127.0.0.1:4188/health || echo "{}")
if echo "$HEALTH_RESP" | grep -q '"status":"ok"'; then
    echo "PASS: verax-media service is healthy on port 4188."
else
    echo "WARNING: Unexpected health response from service: $HEALTH_RESP"
fi

echo "=== 13. Checking HTTP Challenge Prerequisites & Let's Encrypt SSL ==="
SERVER_IP=$(curl -s -m 5 -H Metadata:true "http://169.254.169.254/metadata/instance/network/interface/0/ipv4/ipAddress/0/publicIpAddress?api-version=2021-02-01&format=text" 2>/dev/null || ifconfig.me 2>/dev/null || echo "20.214.143.187")
RESOLVED_IP=$(dig +short media.aryariap.my.id 2>/dev/null | tail -n1 || true)

echo "VM Public IP:         ${SERVER_IP}"
echo "media.aryariap.my.id: ${RESOLVED_IP:-NOT CONFIGURED}"

# Verify Nginx is serving port 80 for this domain
HTTP_PORT80_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: media.aryariap.my.id" http://127.0.0.1/ || echo "000")
echo "Local Port 80 HTTP response for media.aryariap.my.id: ${HTTP_PORT80_STATUS}"

if [ "${RESOLVED_IP}" = "${SERVER_IP}" ] && [ "$HTTP_PORT80_STATUS" -ne 0 ]; then
    if command -v certbot >/dev/null 2>&1; then
        echo "DNS and HTTP challenge prerequisites verified! Requesting Let's Encrypt SSL certificate..."
        if sudo certbot --nginx -d media.aryariap.my.id --non-interactive --agree-tos --redirect -m admin@aryariap.my.id; then
            echo "PASS: SSL certificate provisioned successfully!"
            sudo systemctl reload nginx
        else
            echo "WARNING: Certbot execution encountered an issue. HTTP remains active."
        fi
    else
        echo "NOTICE: certbot is not installed. Run: sudo apt install certbot python3-certbot-nginx"
    fi
else
    echo "NOTICE: DNS A record (${RESOLVED_IP}) does not match server public IP (${SERVER_IP}) or port 80 is not answering."
    echo "Run Certbot manually once DNS propagates: sudo certbot --nginx -d media.aryariap.my.id"
fi

echo ""
echo "======================================================================="
echo "        VERAX PRESS MEDIA STORAGE ACTIVATION COMPLETED!                "
echo "======================================================================="
echo "Canonical Storage: ${DST_DATA_DIR}"
echo "Nginx Host:        /etc/nginx/sites-enabled/media.aryariap.my.id"
echo "Upstream Service:  http://127.0.0.1:4188 (PM2: verax-media)"
echo "Public Domain:     http(s)://media.aryariap.my.id"
echo "Original data preserved intact at: ${SRC_DATA_DIR}"
if [ "$PREV_ARCHIVED" -eq 1 ]; then
    echo "Prior partial destination archived at: ${PREV_ARCHIVE_DIR}"
fi
echo "======================================================================="

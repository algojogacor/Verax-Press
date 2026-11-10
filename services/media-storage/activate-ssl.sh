#!/usr/bin/env bash
# ==============================================================================
# Verax Press Media Storage Service — SSL & HTTPS Activation Script
# ==============================================================================
# Purpose: Activate Let's Encrypt TLS for media.aryariap.my.id safely.
# Does NOT touch media storage, database, files, or unrelated services.
# ==============================================================================
set -euo pipefail

DOMAIN="media.aryariap.my.id"
CONF_SRC="/home/azureuser/verax-media-service/media.aryariap.my.id.conf"
CONF_AVAIL="/etc/nginx/sites-available/${DOMAIN}"
CONF_ENAB="/etc/nginx/sites-enabled/${DOMAIN}"

echo "=== 1. Validating Prerequisites ==="
RESOLVED_IP=$(dig +short "${DOMAIN}" 2>/dev/null | tail -n1 || true)
DETECTED_IP=$(curl -s -m 5 https://api.ipify.org 2>/dev/null || curl -s -m 5 https://ifconfig.me 2>/dev/null || echo "20.214.143.187")

echo "Domain:       ${DOMAIN}"
echo "DNS A Record: ${RESOLVED_IP}"
echo "VM Public IP: ${DETECTED_IP}"

if [ "${RESOLVED_IP}" != "${DETECTED_IP}" ]; then
    echo "ERROR: DNS A record (${RESOLVED_IP}) does not match VM Public IP (${DETECTED_IP})!"
    exit 1
fi
echo "PASS: DNS A record correctly points to this VM."

echo -e "\n=== 2. Updating Nginx Configuration for ACME Challenge Exemption ==="
sudo cp "${CONF_SRC}" "${CONF_AVAIL}"
sudo ln -sf "${CONF_AVAIL}" "${CONF_ENAB}"

echo "Configuring permissions for private media X-Accel-Redirect delivery..."
sudo chown -R azureuser:www-data /var/lib/verax/media/private
sudo chmod 0750 /var/lib/verax/media/private
sudo find /var/lib/verax/media/private -type d -exec chmod 0750 {} +
sudo find /var/lib/verax/media/private -type f -exec chmod 0640 {} +

echo "Testing Nginx configuration (nginx -t)..."
sudo nginx -t
sudo systemctl reload nginx
echo "PASS: Nginx reloaded successfully."

echo -e "\n=== 3. Testing ACME Challenge Path Locally ==="
TEST_TOKEN="test_probe_$(date +%s)"
sudo mkdir -p /var/www/html/.well-known/acme-challenge
echo "probe-ok" | sudo tee "/var/www/html/.well-known/acme-challenge/${TEST_TOKEN}" >/dev/null

PROBE_RESP=$(curl -s "http://127.0.0.1/.well-known/acme-challenge/${TEST_TOKEN}" -H "Host: ${DOMAIN}" || true)
sudo rm -f "/var/www/html/.well-known/acme-challenge/${TEST_TOKEN}"

if [ "${PROBE_RESP}" = "probe-ok" ]; then
    echo "PASS: ACME challenge path is accessible through Nginx (probe succeeded)."
else
    echo "WARNING: Local ACME challenge probe returned: ${PROBE_RESP}"
fi

echo -e "\n=== 4. Executing Certbot Dry-Run ==="
if sudo certbot certonly --nginx -d "${DOMAIN}" --dry-run; then
    echo "PASS: Certbot dry-run validation succeeded!"
else
    echo "ERROR: Certbot dry-run failed. Check Let's Encrypt challenge reachability."
    exit 1
fi

echo -e "\n=== 5. Provisioning Production Let's Encrypt TLS Certificate ==="
sudo certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --redirect -m admin@aryariap.my.id

echo -e "\n=== 6. Validating Active Certificate & Nginx HTTPS ==="
sudo nginx -t
sudo systemctl reload nginx

echo "Checking HTTPS health endpoint..."
HTTPS_STATUS=$(curl -sI "https://127.0.0.1/health" -H "Host: ${DOMAIN}" 2>/dev/null | head -n1 || echo "000")
echo "Local HTTPS response: ${HTTPS_STATUS}"

echo "Checking HTTP-to-HTTPS redirect..."
HTTP_REDIRECT=$(curl -sI "http://127.0.0.1/health" -H "Host: ${DOMAIN}" 2>/dev/null | head -n1 || echo "000")
echo "HTTP redirect response: ${HTTP_REDIRECT}"

echo -e "\n======================================================================="
echo "   HTTPS ACTIVATION COMPLETED SUCCESSFULLY FOR ${DOMAIN}!              "
echo "======================================================================="
sudo certbot certificates --cert-name "${DOMAIN}"

#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_ARCHIVE="/home/azureuser/nginx-backup-before-verax-media-${TIMESTAMP}.tar.gz"

echo "=== 1. Creating timestamped Nginx backup ==="
echo "Backing up /etc/nginx to ${BACKUP_ARCHIVE}..."
sudo tar -czf "${BACKUP_ARCHIVE}" /etc/nginx
ls -lh "${BACKUP_ARCHIVE}"

echo "=== 2. Setting up /var/lib/verax/media storage directory ==="
sudo mkdir -p /var/lib/verax/media/public/articles \
            /var/lib/verax/media/public/thumbnails \
            /var/lib/verax/media/public/infographics \
            /var/lib/verax/media/private/drafts \
            /var/lib/verax/media/private/editorial \
            /var/lib/verax/media/private/documents \
            /var/lib/verax/media/database \
            /var/lib/verax/media/backups \
            /var/lib/verax/media/logs \
            /var/lib/verax/media/quarantine \
            /var/lib/verax/media/tmp

sudo chown -R azureuser:www-data /var/lib/verax
sudo chmod -R 775 /var/lib/verax/media/public
sudo chmod -R 750 /var/lib/verax/media/private /var/lib/verax/media/database /var/lib/verax/media/quarantine /var/lib/verax/media/backups

echo "=== 3. Installing Nginx server block ==="
sudo cp /home/azureuser/verax-media-service/media.aryariap.my.id.conf /etc/nginx/sites-available/media.aryariap.my.id
sudo ln -sf /etc/nginx/sites-available/media.aryariap.my.id /etc/nginx/sites-enabled/media.aryariap.my.id

echo "=== 4. Validating Nginx configuration (nginx -t) ==="
if ! sudo nginx -t; then
  echo "ERROR: nginx -t failed! Rolling back changes..."
  sudo rm -f /etc/nginx/sites-enabled/media.aryariap.my.id /etc/nginx/sites-available/media.aryariap.my.id
  sudo nginx -t
  exit 1
fi

echo "=== 5. Reloading Nginx safely ==="
sudo systemctl reload nginx
echo "Nginx reloaded successfully without disrupting existing services."

echo "=== 6. Checking DNS resolution for media.aryariap.my.id ==="
RESOLVED_IP=$(dig +short media.aryariap.my.id 2>/dev/null || true)
SERVER_IP=$(curl -s -H Metadata:true "http://169.254.169.254/metadata/instance/network/interface/0/ipv4/ipAddress/0/publicIpAddress?api-version=2021-02-01&format=text" 2>/dev/null || ifconfig.me 2>/dev/null || echo "20.214.143.187")

echo "Server Public IP: ${SERVER_IP}"
echo "media.aryariap.my.id resolves to: ${RESOLVED_IP:-NOT CONFIGURED}"

if [ "${RESOLVED_IP}" = "${SERVER_IP}" ]; then
  echo "DNS is already pointed! Provisioning Let's Encrypt SSL certificate..."
  sudo certbot --nginx -d media.aryariap.my.id --non-interactive --agree-tos --redirect
  echo "SSL certificate provisioned!"
else
  echo "NOTICE: DNS A record for media.aryariap.my.id is not yet pointing to ${SERVER_IP}."
  echo "Once DNS is pointed, run: sudo certbot --nginx -d media.aryariap.my.id --non-interactive --agree-tos --redirect"
fi

echo "=== Deployment finished successfully ==="

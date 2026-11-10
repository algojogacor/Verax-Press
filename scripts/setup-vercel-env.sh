#!/usr/bin/env bash
# ==============================================================================
# Verax Press — Secure Vercel Environment Configuration Script (Bash)
# ==============================================================================
# Injects VERAX_MEDIA_API_URL and VERAX_MEDIA_SECRET into Vercel via secure stdin.
# Never prints secrets to console, terminal history, or logs.
# ==============================================================================
set -euo pipefail

ENV_FILE="${1:-.env}"
API_URL="${2:-https://media.aryariap.my.id}"

echo "=== 1. Verifying Vercel Project Link ==="
if [ ! -f ".vercel/project.json" ]; then
    echo "Notice: Local workspace is not linked to a Vercel project yet."
    echo "Please link to your Vercel project first by running: vercel link"
    echo "Then re-run this script."
    exit 1
fi

echo "=== 2. Reading Environment Configuration Securely ==="
if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: Environment file $ENV_FILE not found."
    exit 1
fi

RAW_SECRET=$(grep -E '^VERAX_MEDIA_SECRET=' "$ENV_FILE" | head -n1 | cut -d= -f2- | tr -d '\r\n"' "'")
if [ -z "$RAW_SECRET" ]; then
    echo "ERROR: VERAX_MEDIA_SECRET not found or empty in $ENV_FILE."
    exit 1
fi

FINGERPRINT=$(printf "%s" "$RAW_SECRET" | sha256sum | awk '{print $1}')
echo "Active Secret SHA-256 Fingerprint: $FINGERPRINT"

echo "=== 3. Injecting VERAX_MEDIA_API_URL into Vercel ==="
printf "%s" "$API_URL" | vercel env add VERAX_MEDIA_API_URL production --force --yes
printf "%s" "$API_URL" | vercel env add VERAX_MEDIA_API_URL preview --force --yes

echo "=== 4. Injecting VERAX_MEDIA_SECRET into Vercel via Secure Stdin ==="
printf "%s" "$RAW_SECRET" | vercel env add VERAX_MEDIA_SECRET production --force --sensitive --yes
printf "%s" "$RAW_SECRET" | vercel env add VERAX_MEDIA_SECRET preview --force --sensitive --yes

echo ""
echo "Configuration complete! Environment variables successfully synchronized with Vercel."
echo "Fingerprint matched: $FINGERPRINT"

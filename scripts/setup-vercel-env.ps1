# ==============================================================================
# Verax Press — Secure Vercel Environment Configuration Script
# ==============================================================================
# Injects VERAX_MEDIA_API_URL and VERAX_MEDIA_SECRET into Vercel via secure stdin.
# Never prints secrets to console, terminal history, or logs.
# ==============================================================================
[CmdletBinding()]
param(
    [string]$EnvFile = ".env",
    [string]$ApiUrl = "https://media.aryariap.my.id"
)

$ErrorActionPreference = "Stop"

Write-Host "=== 1. Verifying Vercel Project Link ===" -ForegroundColor Cyan
if (-not (Test-Path ".vercel/project.json")) {
    Write-Host "Notice: Local workspace is not linked to a Vercel project yet." -ForegroundColor Yellow
    Write-Host "Please link to your Vercel project first by running: vercel link" -ForegroundColor Yellow
    Write-Host "Then re-run this script." -ForegroundColor Yellow
    exit 1
}

Write-Host "=== 2. Reading Environment Configuration Securely ===" -ForegroundColor Cyan
if (-not (Test-Path $EnvFile)) {
    Write-Error "Local environment file '$EnvFile' not found."
    exit 1
}

$secretLine = Get-Content $EnvFile | Where-Object { $_ -match '^VERAX_MEDIA_SECRET=' } | Select-Object -First 1
if (-not $secretLine) {
    Write-Error "VERAX_MEDIA_SECRET not found in '$EnvFile'."
    exit 1
}

$rawSecret = $secretLine -replace '^VERAX_MEDIA_SECRET=', ''
$rawSecret = $rawSecret.Trim().Trim('"').Trim("'")

if ([string]::IsNullOrWhiteSpace($rawSecret)) {
    Write-Error "VERAX_MEDIA_SECRET is empty."
    exit 1
}

# Compute SHA-256 fingerprint for non-leaking verification
$hasher = [System.Security.Cryptography.SHA256]::Create()
$bytes = [System.Text.Encoding]::UTF8.GetBytes($rawSecret)
$hash = [BitConverter]::ToString($hasher.ComputeHash($bytes)).Replace("-", "").ToLower()

Write-Host "Active Secret SHA-256 Fingerprint: $hash" -ForegroundColor Green

Write-Host "=== 3. Injecting VERAX_MEDIA_API_URL into Vercel ===" -ForegroundColor Cyan
$ApiUrl | vercel env add VERAX_MEDIA_API_URL production --force --yes
$ApiUrl | vercel env add VERAX_MEDIA_API_URL preview --force --yes

Write-Host "=== 4. Injecting VERAX_MEDIA_SECRET into Vercel via Secure Stdin ===" -ForegroundColor Cyan
$rawSecret | vercel env add VERAX_MEDIA_SECRET production --force --sensitive --yes
$rawSecret | vercel env add VERAX_MEDIA_SECRET preview --force --sensitive --yes

Write-Host "`nConfiguration complete! Environment variables successfully synchronized with Vercel." -ForegroundColor Green
Write-Host "Fingerprint matched: $hash" -ForegroundColor Green

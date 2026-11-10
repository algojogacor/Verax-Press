# ==============================================================================
# Verax Press — Secure Vercel Turso Environment Configuration Script
# ==============================================================================
# Injects TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, and DATABASE_URL into Vercel via stdin.
# Never prints secrets to console, terminal history, or logs.
# ==============================================================================
[CmdletBinding()]
param(
    [string]$EnvFile = ".env"
)

$ErrorActionPreference = "Stop"

Write-Host "=== 1. Verifying Vercel Project Link ===" -ForegroundColor Cyan
if (-not (Test-Path ".vercel/project.json")) {
    Write-Host "Notice: Local workspace is not linked to a Vercel project yet." -ForegroundColor Yellow
    exit 1
}

Write-Host "=== 2. Reading Turso Configuration Securely ===" -ForegroundColor Cyan
if (-not (Test-Path $EnvFile)) {
    Write-Error "Local environment file '$EnvFile' not found."
    exit 1
}

$urlLine = Get-Content $EnvFile | Where-Object { $_ -match '^TURSO_DATABASE_URL=' } | Select-Object -First 1
$tokenLine = Get-Content $EnvFile | Where-Object { $_ -match '^TURSO_AUTH_TOKEN=' } | Select-Object -First 1

if (-not $urlLine -or -not $tokenLine) {
    Write-Error "TURSO_DATABASE_URL or TURSO_AUTH_TOKEN not found in '$EnvFile'."
    exit 1
}

$rawUrl = ($urlLine -replace '^TURSO_DATABASE_URL=', '').Trim().Trim('"').Trim("'")
$rawToken = ($tokenLine -replace '^TURSO_AUTH_TOKEN=', '').Trim().Trim('"').Trim("'")

# Compute SHA-256 fingerprint for verification
$hasher = [System.Security.Cryptography.SHA256]::Create()
$bytes = [System.Text.Encoding]::UTF8.GetBytes($rawToken)
$hash = [BitConverter]::ToString($hasher.ComputeHash($bytes)).Replace("-", "").ToLower()

Write-Host "Turso Endpoint: $rawUrl"
Write-Host "Turso Token SHA-256 Fingerprint: $hash" -ForegroundColor Green

Write-Host "`n=== 3. Injecting TURSO_DATABASE_URL into Vercel ===" -ForegroundColor Cyan
$rawUrl | vercel env add TURSO_DATABASE_URL production --force
$rawUrl | vercel env add TURSO_DATABASE_URL preview --force

Write-Host "`n=== 4. Injecting DATABASE_URL into Vercel ===" -ForegroundColor Cyan
$rawUrl | vercel env add DATABASE_URL production --force
$rawUrl | vercel env add DATABASE_URL preview --force

Write-Host "`n=== 5. Injecting TURSO_AUTH_TOKEN into Vercel (Sensitive) ===" -ForegroundColor Cyan
$rawToken | vercel env add TURSO_AUTH_TOKEN production --force --sensitive
$rawToken | vercel env add TURSO_AUTH_TOKEN preview --force --sensitive

Write-Host "`n=================================================================" -ForegroundColor Green
Write-Host "   TURSO CREDENTIALS SUCCESSFULLY CONFIGURED ON VERCEL!          " -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green

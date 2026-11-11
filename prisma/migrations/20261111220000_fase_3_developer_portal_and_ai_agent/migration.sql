-- Migration: 20261111220000_fase_3_developer_portal_and_ai_agent
-- Menambahkan metadata ApiClient, tabel ApiClientCredential untuk rotasi kredensial,
-- tabel ApiRequestLog untuk pencatatan log permintaan, dan relasi apiClientId pada Submission.

-- 1. Tambah kolom pada Submission
ALTER TABLE "Submission" ADD COLUMN "apiClientId" TEXT REFERENCES "ApiClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "Submission_apiClientId_idx" ON "Submission"("apiClientId");

-- 2. Tambah kolom metadata pada ApiClient
ALTER TABLE "ApiClient" ADD COLUMN "description" TEXT;
ALTER TABLE "ApiClient" ADD COLUMN "ownerName" TEXT;
ALTER TABLE "ApiClient" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'DEVELOPMENT';
ALTER TABLE "ApiClient" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT '2026-11-11T00:00:00.000Z';

-- 3. Buat tabel ApiClientCredential untuk rotasi aman dan masa tenggang (grace period)
CREATE TABLE IF NOT EXISTS "ApiClientCredential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apiClientId" TEXT NOT NULL,
    "name" TEXT,
    "keyPrefix" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" DATETIME,
    "gracePeriodEndsAt" DATETIME,
    "lastUsedAt" DATETIME,
    "revokedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiClientCredential_apiClientId_fkey" FOREIGN KEY ("apiClientId") REFERENCES "ApiClient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ApiClientCredential_apiClientId_status_idx" ON "ApiClientCredential"("apiClientId", "status");

-- 4. Buat tabel ApiRequestLog untuk observability, pencatatan durasi, status HTTP, dan request ID
CREATE TABLE IF NOT EXISTS "ApiRequestLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apiClientId" TEXT,
    "requestId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "submissionId" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiRequestLog_apiClientId_fkey" FOREIGN KEY ("apiClientId") REFERENCES "ApiClient" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ApiRequestLog_requestId_key" ON "ApiRequestLog"("requestId");
CREATE INDEX IF NOT EXISTS "ApiRequestLog_apiClientId_createdAt_idx" ON "ApiRequestLog"("apiClientId", "createdAt");
CREATE INDEX IF NOT EXISTS "ApiRequestLog_requestId_idx" ON "ApiRequestLog"("requestId");
CREATE INDEX IF NOT EXISTS "ApiRequestLog_createdAt_idx" ON "ApiRequestLog"("createdAt");
CREATE INDEX IF NOT EXISTS "ApiRequestLog_statusCode_idx" ON "ApiRequestLog"("statusCode");

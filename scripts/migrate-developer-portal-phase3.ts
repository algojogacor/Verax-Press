import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

const targetDbs = [
  resolve(process.cwd(), "db/custom.db"),
  resolve(process.cwd(), "db/isolated-test.db"),
];

for (const dbPath of targetDbs) {
  if (!existsSync(dbPath)) {
    console.log(`[SKIP] Basis data ${dbPath} tidak ditemukan.`);
    continue;
  }

  console.log(`[MIGRASI FASE 3] Memulai migrasi pada ${dbPath}...`);
  const db = new DatabaseSync(dbPath);

  try {
    db.exec("PRAGMA foreign_keys = OFF;");

    // 1. Kolom Submission.apiClientId
    const submissionColumns = db.prepare("PRAGMA table_info(Submission);").all() as Array<{ name: string }>;
    if (!submissionColumns.some((col) => col.name === "apiClientId")) {
      db.exec('ALTER TABLE "Submission" ADD COLUMN "apiClientId" TEXT REFERENCES "ApiClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;');
      console.log("  + Kolom Submission.apiClientId ditambahkan.");
    }
    db.exec('CREATE INDEX IF NOT EXISTS "Submission_apiClientId_idx" ON "Submission"("apiClientId");');

    // 2. Kolom ApiClient metadata
    const apiClientColumns = db.prepare("PRAGMA table_info(ApiClient);").all() as Array<{ name: string }>;
    if (!apiClientColumns.some((col) => col.name === "description")) {
      db.exec('ALTER TABLE "ApiClient" ADD COLUMN "description" TEXT;');
      console.log("  + Kolom ApiClient.description ditambahkan.");
    }
    if (!apiClientColumns.some((col) => col.name === "ownerName")) {
      db.exec('ALTER TABLE "ApiClient" ADD COLUMN "ownerName" TEXT;');
      console.log("  + Kolom ApiClient.ownerName ditambahkan.");
    }
    if (!apiClientColumns.some((col) => col.name === "environment")) {
      db.exec("ALTER TABLE \"ApiClient\" ADD COLUMN \"environment\" TEXT NOT NULL DEFAULT 'DEVELOPMENT';");
      console.log("  + Kolom ApiClient.environment ditambahkan.");
    }
    if (!apiClientColumns.some((col) => col.name === "updatedAt")) {
      db.exec("ALTER TABLE \"ApiClient\" ADD COLUMN \"updatedAt\" DATETIME NOT NULL DEFAULT '2026-11-11T00:00:00.000Z';");
      console.log("  + Kolom ApiClient.updatedAt ditambahkan.");
    }

    // 3. Tabel ApiClientCredential
    db.exec(`
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
    `);
    db.exec('CREATE INDEX IF NOT EXISTS "ApiClientCredential_apiClientId_status_idx" ON "ApiClientCredential"("apiClientId", "status");');
    console.log("  + Tabel ApiClientCredential dan indeks dipastikan ada.");

    // 4. Tabel ApiRequestLog
    db.exec(`
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
    `);
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS "ApiRequestLog_requestId_key" ON "ApiRequestLog"("requestId");');
    db.exec('CREATE INDEX IF NOT EXISTS "ApiRequestLog_apiClientId_createdAt_idx" ON "ApiRequestLog"("apiClientId", "createdAt");');
    db.exec('CREATE INDEX IF NOT EXISTS "ApiRequestLog_requestId_idx" ON "ApiRequestLog"("requestId");');
    db.exec('CREATE INDEX IF NOT EXISTS "ApiRequestLog_createdAt_idx" ON "ApiRequestLog"("createdAt");');
    db.exec('CREATE INDEX IF NOT EXISTS "ApiRequestLog_statusCode_idx" ON "ApiRequestLog"("statusCode");');
    console.log("  + Tabel ApiRequestLog dan indeks dipastikan ada.");

    // 5. Backfill ApiClientCredential untuk ApiClient yang sudah ada
    const clients = db.prepare("SELECT id, secretHash, status, expiresAt, lastUsedAt, createdAt FROM ApiClient;").all() as Array<{
      id: string;
      secretHash: string | null;
      status: string;
      expiresAt: string | null;
      lastUsedAt: string | null;
      createdAt: string;
    }>;

    for (const c of clients) {
      if (!c.secretHash) continue;
      const existingCred = db.prepare("SELECT id FROM ApiClientCredential WHERE apiClientId = ? LIMIT 1;").get(c.id);
      if (!existingCred) {
        db.prepare(`
          INSERT INTO ApiClientCredential (
            id, apiClientId, name, keyPrefix, secretHash, status, expiresAt, lastUsedAt, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `).run(
          `cred_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
          c.id,
          "Kredensial Utama (Awal)",
          "vrtk_awal",
          c.secretHash,
          c.status,
          c.expiresAt,
          c.lastUsedAt,
          c.createdAt,
          c.createdAt
        );
        console.log(`  + Backfill kredensial untuk client ${c.id}.`);
      }
    }

    db.exec("PRAGMA foreign_keys = ON;");

    const integrity = db.prepare("PRAGMA integrity_check;").get() as { integrity_check?: string };
    const fkViolations = db.prepare("PRAGMA foreign_key_check;").all();

    console.log(`  Integrity: ${integrity?.integrity_check ?? "ok"}`);
    console.log(`  FK Violations: ${fkViolations.length}`);
    if (fkViolations.length > 0) {
      console.error("  FATAL: Ditemukan pelanggaran foreign key:", fkViolations);
      process.exit(1);
    }

    console.log(`[SUKSES] Migrasi Fase 3 berhasil diterapkan pada ${dbPath}.\n`);
  } catch (err) {
    console.error(`[ERROR] Gagal memigrasi ${dbPath}:`, err);
    process.exit(1);
  } finally {
    db.close();
  }
}

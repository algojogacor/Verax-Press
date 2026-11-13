/**
 * Verax Press — Migration Runner
 * Applies pending Prisma migrations to local SQLite databases.
 * Tracks applied migrations in `_prisma_migrations` matching Prisma Migrate's schema.
 *
 * Supports:
 * - Fresh databases (applies all migrations in sequence)
 * - Existing databases (baselines already applied tables and applies pending migrations)
 * - Idempotency (running migrations multiple times skips already applied migrations cleanly)
 * - Safety backups and integrity checks
 */

import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export interface MigrationResult {
  applied: string[];
  skipped: string[];
  success: boolean;
  targetDb: string;
}

export function runMigrationRunner(targetDbPathInput?: string): MigrationResult {
  let targetDbPath = targetDbPathInput;
  if (!targetDbPath) {
    const envUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "file:db/custom.db";
    targetDbPath = envUrl.replace(/^file:/, "");
  }

  // Safety checks: never touch remote Turso database
  const normalized = targetDbPath.toLowerCase();
  if (
    normalized.includes("turso") ||
    normalized.includes("libsql://") ||
    normalized.includes(".turso.io")
  ) {
    throw new Error(
      `SAFETY FATAL: Migration runner refused to run against remote production database! Target: ${targetDbPath}`
    );
  }

  const absolutePath = path.resolve(targetDbPath);
  const dbDir = path.dirname(absolutePath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const isExistingDb = fs.existsSync(absolutePath);
  if (isExistingDb) {
    const backupDir = path.resolve("db/backups");
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const backupFile = path.join(
      backupDir,
      `${path.basename(absolutePath, ".db")}_backup_${Date.now()}.bak`
    );
    try {
      fs.copyFileSync(absolutePath, backupFile);
    } catch {
      // If busy or unable, continue
    }
  }

  const db = new DatabaseSync(absolutePath);

  try {
    // 1. Ensure _prisma_migrations table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id"                    TEXT PRIMARY KEY NOT NULL,
        "checksum"              TEXT NOT NULL,
        "finished_at"           DATETIME,
        "migration_name"        TEXT NOT NULL,
        "logs"                  TEXT,
        "rolled_back_at"        DATETIME,
        "started_at"            DATETIME NOT NULL DEFAULT current_timestamp,
        "applied_steps_count"   INTEGER UNSIGNED NOT NULL DEFAULT 0
      );
    `);

    // 2. Read all migrations from prisma/migrations
    const migrationsDir = path.resolve("prisma/migrations");
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found: ${migrationsDir}`);
    }

    const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
    const migrationDirs = entries
      .filter((e) => e.isDirectory() && /^\d{14}_/.test(e.name))
      .map((e) => e.name)
      .sort();

    // 3. Get applied migrations
    const appliedRows = db
      .prepare(
        'SELECT migration_name FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL'
      )
      .all() as Array<{ migration_name: string }>;
    const appliedSet = new Set(appliedRows.map((r) => r.migration_name));

    // Check existing tables in DB to see if earlier migrations were applied before _prisma_migrations existed
    const existingTables = (
      db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>
    ).map((t) => t.name);

    const applied: string[] = [];
    const skipped: string[] = [];

    // Check if Article table exists and what columns it has
    const hasArticleTable = existingTables.includes("Article");
    let articleColumns: string[] = [];
    if (hasArticleTable) {
      articleColumns = (
        db.prepare("PRAGMA table_info(Article)").all() as Array<{ name: string }>
      ).map((c) => c.name);
    }

    for (const migName of migrationDirs) {
      if (appliedSet.has(migName)) {
        skipped.push(migName);
        continue;
      }

      const sqlPath = path.join(migrationsDir, migName, "migration.sql");
      if (!fs.existsSync(sqlPath)) {
        continue;
      }
      const sqlContent = fs.readFileSync(sqlPath, "utf8");
      const checksum = crypto.createHash("sha256").update(sqlContent).digest("hex");

      // Baseline detection: if db already had tables before _prisma_migrations was introduced
      if (migName.endsWith("_init") && existingTables.includes("StaffUser")) {
        db.prepare(`
          INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
          VALUES (?, ?, ?, ?, 1)
        `).run(crypto.randomUUID(), checksum, Date.now(), migName);
        skipped.push(migName);
        continue;
      }

      if (migName.includes("fase_1") && existingTables.includes("StaffInvitation")) {
        db.prepare(`
          INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
          VALUES (?, ?, ?, ?, 1)
        `).run(crypto.randomUUID(), checksum, Date.now(), migName);
        skipped.push(migName);
        continue;
      }

      if (migName.includes("fase_2") && existingTables.includes("ContributorInvitation")) {
        db.prepare(`
          INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
          VALUES (?, ?, ?, ?, 1)
        `).run(crypto.randomUUID(), checksum, Date.now(), migName);
        skipped.push(migName);
        continue;
      }

      if (migName.includes("fase_3") && existingTables.includes("ApiClientCredential")) {
        db.prepare(`
          INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
          VALUES (?, ?, ?, ?, 1)
        `).run(crypto.randomUUID(), checksum, Date.now(), migName);
        skipped.push(migName);
        continue;
      }

      if (migName.includes("fase_4") && existingTables.includes("ApiClient")) {
        db.prepare(`
          INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
          VALUES (?, ?, ?, ?, 1)
        `).run(crypto.randomUUID(), checksum, Date.now(), migName);
        skipped.push(migName);
        continue;
      }

      if (migName.includes("fase_5") && existingTables.includes("Submission")) {
        db.prepare(`
          INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
          VALUES (?, ?, ?, ?, 1)
        `).run(crypto.randomUUID(), checksum, Date.now(), migName);
        skipped.push(migName);
        continue;
      }

      if (migName.includes("add_editorial_metadata") && articleColumns.includes("topics")) {
        db.prepare(`
          INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
          VALUES (?, ?, ?, ?, 1)
        `).run(crypto.randomUUID(), checksum, Date.now(), migName);
        skipped.push(migName);
        continue;
      }

      // Execute migration
      const migId = crypto.randomUUID();
      const startedAt = new Date().toISOString();

      try {
        db.exec("PRAGMA foreign_keys = OFF;");
        db.exec("PRAGMA defer_foreign_keys = ON;");
        db.exec(sqlContent);
        db.exec("PRAGMA foreign_keys = ON;");
        db.exec("PRAGMA defer_foreign_keys = OFF;");

        db.prepare(`
          INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
          VALUES (?, ?, ?, ?, ?, 1)
        `).run(migId, checksum, Date.now(), migName, startedAt);

        applied.push(migName);
      } catch (err) {
        db.prepare(`
          INSERT INTO "_prisma_migrations" (id, checksum, rolled_back_at, migration_name, started_at, logs)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(migId, checksum, Date.now(), migName, startedAt, String(err));
        throw new Error(`Failed to apply migration ${migName}: ${err}`);
      }
    }

    // Integrity check
    const integrity = db.prepare("PRAGMA integrity_check").get() as { integrity_check?: string } | undefined;
    if (integrity?.integrity_check !== "ok") {
      throw new Error(`Integrity check failed: ${integrity?.integrity_check}`);
    }

    return {
      applied,
      skipped,
      success: true,
      targetDb: absolutePath,
    };
  } finally {
    db.close();
  }
}

// CLI entry point
if (process.argv[1] && process.argv[1].endsWith("migrate.ts")) {
  const arg = process.argv[2];
  const target = arg === "--test" ? "db/isolated-test.db" : arg;
  const result = runMigrationRunner(target);
  console.log(`[MIGRATION RUNNER] Target: ${result.targetDb}`);
  console.log(`[MIGRATION RUNNER] Applied: ${result.applied.length} (${result.applied.join(", ") || "none"})`);
  console.log(`[MIGRATION RUNNER] Skipped: ${result.skipped.length} (${result.skipped.join(", ") || "none"})`);
  console.log("[MIGRATION RUNNER] Migration completed successfully.");
}

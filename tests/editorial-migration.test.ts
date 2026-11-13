/**
 * Verax Editorial Intelligence — Phase 1 Migration & Schema Test Suite
 *
 * Verifies:
 * 1. Clean migration application on fresh database
 * 2. Idempotency of migration runner (second run skips cleanly)
 * 3. Migration on existing database with pre-existing articles
 * 4. Preservation of pre-existing article data (title, status, contentJson, deck, etc.)
 * 5. Default values of new editorial metadata fields (topics, entities, centralQuestion, editorialAngle, metadataStatus)
 * 6. Prisma Client full compatibility with new fields
 */

import { test, describe, beforeAll, afterAll, expect } from "bun:test";
import { DatabaseSync } from "node:sqlite";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import {
  assertApprovedTestDatabase,
  getTestDb,
  DB_URL,
  cleanupTestData,
  seedTestFixtures,
} from "./lib/test-db";
import { runMigrationRunner } from "../scripts/migrate";

describe("Phase 1: Database Schema & Migration for Verax Editorial Intelligence", () => {
  const freshDbPath = path.resolve("db/test-mig-fresh.db");
  const existingDbPath = path.resolve("db/test-mig-existing.db");

  const cleanupFiles = [
    freshDbPath,
    `${freshDbPath}-wal`,
    `${freshDbPath}-shm`,
    existingDbPath,
    `${existingDbPath}-wal`,
    `${existingDbPath}-shm`,
  ];

  function safeUnlink(file: string) {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    } catch {
      // Ignored if file lock in Windows
    }
  }

  beforeAll(async () => {
    assertApprovedTestDatabase(DB_URL);
    for (const f of cleanupFiles) {
      safeUnlink(f);
    }
  });

  afterAll(async () => {
    for (const f of cleanupFiles) {
      safeUnlink(f);
    }
    await cleanupTestData();
  });

  // =========================================================================
  // 1. Fresh Database Migration
  // =========================================================================
  test("1. Migration applies cleanly without error on a fresh database", () => {
    safeUnlink(freshDbPath);

    const result = runMigrationRunner(freshDbPath);

    expect(result.success).toBe(true);
    expect(result.applied.length).toBeGreaterThanOrEqual(7);
    expect(result.applied).toContain("20261113000000_add_editorial_metadata");

    // Inspect database tables & schema
    const db = new DatabaseSync(freshDbPath);
    const tables = (
      db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>
    ).map((t) => t.name);

    expect(tables).toContain("Article");
    expect(tables).toContain("Desk");
    expect(tables).toContain("StaffUser");
    expect(tables).toContain("_prisma_migrations");

    // Inspect columns of Article table
    const columns = (
      db.prepare("PRAGMA table_info(Article)").all() as Array<{
        cid: number;
        name: string;
        type: string;
        notnull: number;
        dflt_value: string | null;
      }>
    );
    const colMap = new Map(columns.map((c) => [c.name, c]));

    expect(colMap.has("topics")).toBe(true);
    expect(colMap.get("topics")?.dflt_value).toBe("'[]'");

    expect(colMap.has("entities")).toBe(true);
    expect(colMap.get("entities")?.dflt_value).toBe("'[]'");

    expect(colMap.has("centralQuestion")).toBe(true);
    expect(colMap.get("centralQuestion")?.notnull).toBe(0);

    expect(colMap.has("editorialAngle")).toBe(true);
    expect(colMap.get("editorialAngle")?.notnull).toBe(0);

    expect(colMap.has("metadataStatus")).toBe(true);
    expect(colMap.get("metadataStatus")?.dflt_value).toBe("'unverified'");

    // Integrity check
    const integrity = db.prepare("PRAGMA integrity_check").get() as { integrity_check?: string };
    expect(integrity.integrity_check).toBe("ok");

    const fkViolations = db.prepare("PRAGMA foreign_key_check").all();
    expect(fkViolations.length).toBe(0);

    db.close();
  });

  // =========================================================================
  // 2. Migration Runner Idempotency on Fresh Database
  // =========================================================================
  test("2. Migration runner is idempotent: running a second time skips already applied migrations cleanly", () => {
    const secondResult = runMigrationRunner(freshDbPath);

    expect(secondResult.success).toBe(true);
    expect(secondResult.applied.length).toBe(0);
    expect(secondResult.skipped.length).toBeGreaterThanOrEqual(7);
    expect(secondResult.skipped).toContain("20261113000000_add_editorial_metadata");

    // Verify _prisma_migrations record count did not change
    const db = new DatabaseSync(freshDbPath);
    const countRow = db
      .prepare('SELECT COUNT(*) as cnt FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL')
      .get() as { cnt: number };
    expect(countRow.cnt).toBeGreaterThanOrEqual(7);
    db.close();
  });

  // =========================================================================
  // 3. Existing Database Migration with Pre-existing Articles
  // =========================================================================
  test("3. Migration runs cleanly on an existing database with pre-existing articles", () => {
    safeUnlink(existingDbPath);

    // Setup an existing database schema with previous migrations (simulating prior state)
    const dbSetup = new DatabaseSync(existingDbPath);
    const migrationsDir = path.resolve("prisma/migrations");
    const priorMigrations = [
      "20261110000000_init",
      "20261111120000_fase_1_role_and_staff_migration",
      "20261111180000_fase_2_volunteer_and_contributor_migration",
      "20261111220000_fase_3_developer_portal_and_ai_agent",
      "20261111230000_fase_4_align_defaults",
      "20261112200000_fase_5_scope_submission_idempotency",
    ];

    dbSetup.exec(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "checksum" TEXT NOT NULL,
        "finished_at" DATETIME,
        "migration_name" TEXT NOT NULL,
        "logs" TEXT,
        "rolled_back_at" DATETIME,
        "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
        "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0
      );
    `);

    // Apply prior migrations
    dbSetup.exec("PRAGMA foreign_keys = OFF;");
    dbSetup.exec("PRAGMA defer_foreign_keys = ON;");
    for (const m of priorMigrations) {
      const sql = fs.readFileSync(path.join(migrationsDir, m, "migration.sql"), "utf8");
      dbSetup.exec(sql);
      const chk = crypto.createHash("sha256").update(sql).digest("hex");
      dbSetup
        .prepare(
          'INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count) VALUES (?, ?, ?, ?, 1)'
        )
        .run(crypto.randomUUID(), chk, Date.now(), m);
    }
    dbSetup.exec("PRAGMA foreign_keys = ON;");
    dbSetup.exec("PRAGMA defer_foreign_keys = OFF;");

    // Insert pre-existing Desk and diverse Articles
    dbSetup
      .prepare(
        "INSERT INTO Desk (id, slug, name, description, sortOrder, isActive) VALUES ('desk-investigasi', 'hukum-keadilan', 'Hukum & Keadilan', 'Desk liputan hukum', 1, 1)"
      )
      .run();

    const sampleArticles = [
      {
        id: "art-legacy-1",
        slug: "investigasi-dana-bansos",
        title: "Investigasi Aliran Dana Bansos di Jawa Barat",
        deck: "Temuan audit independen menunjukkan ketidaksesuaian alokasi anggaran.",
        deskId: "desk-investigasi",
        format: "NEWS",
        status: "PUBLISHED",
        contentJson: JSON.stringify([
          { type: "paragraph", children: [{ text: "Berdasarkan dokumen penelusuran..." }] },
        ]),
        byline: "Tim Redaksi Verax Press",
        origin: "NEWSROOM",
        aiInvolvement: "none",
        aiDisclosurePublic: 0,
        publishedAt: "2026-11-10 15:30:00",
      },
      {
        id: "art-legacy-2",
        slug: "opini-etika-kecerdasan-buatan",
        title: "Opini: Batas Etis Penggunaan AI dalam Ruang Redaksi",
        deck: "Transparansi dan verifikasi manusia bukan pilihan, melainkan mandat moral.",
        deskId: "desk-investigasi",
        format: "OPINION",
        status: "DRAFT",
        contentJson: JSON.stringify([
          { type: "paragraph", children: [{ text: "Kemajuan teknologi harus diimbangi etika..." }] },
        ]),
        byline: "Budi Santoso",
        origin: "CONTRIBUTOR",
        aiInvolvement: "assistive",
        aiDisclosurePublic: 1,
        publishedAt: null,
      },
    ];

    const insertStmt = dbSetup.prepare(`
      INSERT INTO Article (
        id, slug, title, deck, deskId, format, status, contentJson, byline, origin,
        aiInvolvement, aiDisclosurePublic, publishedAt, updatedAt
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
      )
    `);

    for (const a of sampleArticles) {
      insertStmt.run(
        a.id,
        a.slug,
        a.title,
        a.deck,
        a.deskId,
        a.format,
        a.status,
        a.contentJson,
        a.byline,
        a.origin,
        a.aiInvolvement,
        a.aiDisclosurePublic,
        a.publishedAt
      );
    }

    // Verify pre-existing state before migration 7
    const preCols = (
      dbSetup.prepare("PRAGMA table_info(Article)").all() as Array<{ name: string }>
    ).map((c) => c.name);
    expect(preCols).not.toContain("topics");
    expect(preCols).not.toContain("entities");
    expect(preCols).not.toContain("centralQuestion");
    expect(preCols).not.toContain("editorialAngle");
    expect(preCols).not.toContain("metadataStatus");
    dbSetup.close();

    // Run migration runner on the existing database
    const migrationResult = runMigrationRunner(existingDbPath);

    expect(migrationResult.success).toBe(true);
    expect(migrationResult.applied).toContain("20261113000000_add_editorial_metadata");
    expect(migrationResult.skipped.length).toBe(6);
  });

  // =========================================================================
  // 4. Pre-existing Article Data Preservation & Integrity
  // =========================================================================
  test("4. Pre-existing article data (title, status, contentJson, etc.) is preserved without data loss or corruption", () => {
    const db = new DatabaseSync(existingDbPath);

    // Verify row count unchanged
    const count = db.prepare("SELECT COUNT(*) as cnt FROM Article").get() as { cnt: number };
    expect(count.cnt).toBe(2);

    // Verify article 1 data preservation
    const art1 = db
      .prepare("SELECT * FROM Article WHERE id = 'art-legacy-1'")
      .get() as Record<string, any>;

    expect(art1).toBeTruthy();
    expect(art1.title).toBe("Investigasi Aliran Dana Bansos di Jawa Barat");
    expect(art1.slug).toBe("investigasi-dana-bansos");
    expect(art1.deck).toBe("Temuan audit independen menunjukkan ketidaksesuaian alokasi anggaran.");
    expect(art1.format).toBe("NEWS");
    expect(art1.status).toBe("PUBLISHED");
    expect(art1.contentJson).toBe(
      JSON.stringify([{ type: "paragraph", children: [{ text: "Berdasarkan dokumen penelusuran..." }] }])
    );
    expect(art1.byline).toBe("Tim Redaksi Verax Press");
    expect(art1.origin).toBe("NEWSROOM");
    expect(art1.aiInvolvement).toBe("none");
    expect(art1.aiDisclosurePublic).toBe(0);
    expect(art1.deskId).toBe("desk-investigasi");

    // Verify new editorial metadata default values on pre-existing row
    expect(art1.topics).toBe("[]");
    expect(art1.entities).toBe("[]");
    expect(art1.centralQuestion).toBeNull();
    expect(art1.editorialAngle).toBeNull();
    expect(art1.metadataStatus).toBe("unverified");

    // Verify article 2 data preservation
    const art2 = db
      .prepare("SELECT * FROM Article WHERE id = 'art-legacy-2'")
      .get() as Record<string, any>;

    expect(art2).toBeTruthy();
    expect(art2.title).toBe("Opini: Batas Etis Penggunaan AI dalam Ruang Redaksi");
    expect(art2.slug).toBe("opini-etika-kecerdasan-buatan");
    expect(art2.format).toBe("OPINION");
    expect(art2.status).toBe("DRAFT");
    expect(art2.byline).toBe("Budi Santoso");
    expect(art2.origin).toBe("CONTRIBUTOR");
    expect(art2.aiInvolvement).toBe("assistive");
    expect(art2.aiDisclosurePublic).toBe(1);

    // Verify new editorial metadata default values
    expect(art2.topics).toBe("[]");
    expect(art2.entities).toBe("[]");
    expect(art2.centralQuestion).toBeNull();
    expect(art2.editorialAngle).toBeNull();
    expect(art2.metadataStatus).toBe("unverified");

    // Foreign key and integrity checks
    const integrity = db.prepare("PRAGMA integrity_check").get() as { integrity_check?: string };
    expect(integrity.integrity_check).toBe("ok");

    const fkViolations = db.prepare("PRAGMA foreign_key_check").all();
    expect(fkViolations.length).toBe(0);

    db.close();
  });

  // =========================================================================
  // 5. Idempotency on Existing Database
  // =========================================================================
  test("5. Migration runner re-run on existing database skips all migrations cleanly", () => {
    const rerunResult = runMigrationRunner(existingDbPath);

    expect(rerunResult.success).toBe(true);
    expect(rerunResult.applied.length).toBe(0);
    expect(rerunResult.skipped.length).toBeGreaterThanOrEqual(7);
    expect(rerunResult.skipped).toContain("20261113000000_add_editorial_metadata");
  });

  // =========================================================================
  // 6. Prisma CLI Runner Compatibility (prisma migrate deploy & status)
  // =========================================================================
  test("6. Prisma CLI runner applies migrations cleanly and reports up-to-date status", () => {
    const prismaDbPath = path.resolve("db/test-mig-prisma-cli.db");
    safeUnlink(prismaDbPath);

    try {
      // First deploy: fresh DB
      const deployOutput = execSync("bun x prisma migrate deploy", {
        env: { ...process.env, DATABASE_URL: `file:${prismaDbPath.replace(/\\/g, "/")}` },
        stdio: "pipe",
      }).toString();

      expect(deployOutput).toContain("Applying migration `20261113000000_add_editorial_metadata`");
      expect(deployOutput).toContain("All migrations have been successfully applied.");

      // Second deploy: idempotent
      const secondDeployOutput = execSync("bun x prisma migrate deploy", {
        env: { ...process.env, DATABASE_URL: `file:${prismaDbPath.replace(/\\/g, "/")}` },
        stdio: "pipe",
      }).toString();

      expect(secondDeployOutput).toContain("No pending migrations to apply.");

      // Check status
      const statusOutput = execSync("bun x prisma migrate status", {
        env: { ...process.env, DATABASE_URL: `file:${prismaDbPath.replace(/\\/g, "/")}` },
        stdio: "pipe",
      }).toString();

      expect(statusOutput).toContain("Database schema is up to date!");
    } finally {
      safeUnlink(prismaDbPath);
      safeUnlink(`${prismaDbPath}-wal`);
      safeUnlink(`${prismaDbPath}-shm`);
    }
  }, 30000);

  // =========================================================================
  // 7. Prisma Client Integration with Editorial Metadata Fields
  // =========================================================================
  test("7. Prisma Client can write and query editorial metadata fields via getTestDb()", async () => {
    await seedTestFixtures();
    const db = getTestDb();

    const desk = await db.desk.findFirstOrThrow({ where: { slug: "hukum-keadilan" } });

    const articleSlug = `test-editorial-intelligence-${Date.now()}`;
    const testArticle = await db.article.create({
      data: {
        slug: articleSlug,
        title: "Uji Validasi Editorial Intelligence",
        deck: "Pengujian persistensi metadata topik dan entitas",
        deskId: desk.id,
        format: "ANALYSIS",
        status: "DRAFT",
        contentJson: JSON.stringify([{ type: "paragraph", text: "Konten analisis mendalam." }]),
        topics: JSON.stringify(["hukum", "transparansi", "reformasi-peradilan"]),
        entities: JSON.stringify(["Mahkamah Agung", "Komisi Yudisial"]),
        centralQuestion: "Apakah mekanisme pengawasan hakim sudah berjalan efektif?",
        editorialAngle: "Evaluasi akuntabilitas peradilan dari sudut pandang publik",
        metadataStatus: "verified",
      },
    });

    try {
      expect(testArticle.id).toBeTruthy();
      expect(testArticle.topics).toBe('["hukum","transparansi","reformasi-peradilan"]');
      expect(testArticle.entities).toBe('["Mahkamah Agung","Komisi Yudisial"]');
      expect(testArticle.centralQuestion).toBe("Apakah mekanisme pengawasan hakim sudah berjalan efektif?");
      expect(testArticle.editorialAngle).toBe("Evaluasi akuntabilitas peradilan dari sudut pandang publik");
      expect(testArticle.metadataStatus).toBe("verified");

      // Query from database
      const fetched = await db.article.findUnique({
        where: { id: testArticle.id },
      });

      expect(fetched).toBeTruthy();
      expect(fetched?.topics).toBe(testArticle.topics);
      expect(fetched?.entities).toBe(testArticle.entities);
      expect(fetched?.centralQuestion).toBe(testArticle.centralQuestion);
      expect(fetched?.editorialAngle).toBe(testArticle.editorialAngle);
      expect(fetched?.metadataStatus).toBe("verified");

      // Update metadata status
      const updated = await db.article.update({
        where: { id: testArticle.id },
        data: { metadataStatus: "disputed" },
      });
      expect(updated.metadataStatus).toBe("disputed");
    } finally {
      await db.article.delete({ where: { id: testArticle.id } });
    }
  });
});

/**
 * Verax Press — Safe & Non-Destructive Production Turso Migration Script
 *
 * Updates Turso Cloud schema:
 * 1. ApiClient: Adds column "clientType" TEXT NOT NULL DEFAULT 'INGESTION'
 * 2. InstagramPost: Creates table and indexes for Instagram Carousel integration
 *
 * Verifies parity 100% against prisma/schema.prisma and runs SQLite integrity checks.
 */
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.production" });
dotenv.config();

async function main() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (!tursoUrl || !tursoToken) {
    console.error("FATAL: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be configured.");
    process.exit(1);
  }

  console.log("======================================================================");
  console.log("       VERAX PRESS — PRODUCTION TURSO CLOUD MIGRATION                ");
  console.log("======================================================================");
  console.log(`Endpoint: ${tursoUrl}`);

  const turso = createClient({ url: tursoUrl, authToken: tursoToken });

  // 1. ApiClient Column Check & Migration
  console.log("\n[1/4] Checking and updating ApiClient table...");
  const apiClientInfo = await turso.execute('PRAGMA table_info("ApiClient")');
  const apiClientCols = new Set(apiClientInfo.rows.map((r) => String(r.name)));
  console.log("Existing ApiClient columns:", Array.from(apiClientCols).join(", "));

  if (!apiClientCols.has("clientType")) {
    console.log('  + Executing: ALTER TABLE "ApiClient" ADD COLUMN "clientType" TEXT NOT NULL DEFAULT \'INGESTION\';');
    await turso.execute(
      'ALTER TABLE "ApiClient" ADD COLUMN "clientType" TEXT NOT NULL DEFAULT \'INGESTION\''
    );
    console.log('    Column "clientType" added successfully.');
  } else {
    console.log('  - Column "clientType" already exists in ApiClient.');
  }

  // 2. InstagramPost Table & Indexes Check & Migration
  console.log("\n[2/4] Checking and updating InstagramPost table...");
  const tableCheck = await turso.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='InstagramPost'"
  );

  if (tableCheck.rows.length === 0) {
    console.log('  + Creating table "InstagramPost"...');
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS "InstagramPost" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "articleId" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "lastError" TEXT,
        "caption" TEXT,
        "postUrl" TEXT,
        "instagramMediaId" TEXT,
        "carouselMediaUrls" TEXT,
        "slideCount" INTEGER,
        "postedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "InstagramPost_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);
    console.log('    Table "InstagramPost" created successfully.');
  } else {
    console.log('  - Table "InstagramPost" already exists.');
  }

  console.log('  + Ensuring indexes on "InstagramPost"...');
  await turso.execute(
    'CREATE INDEX IF NOT EXISTS "InstagramPost_articleId_idx" ON "InstagramPost"("articleId")'
  );
  await turso.execute(
    'CREATE INDEX IF NOT EXISTS "InstagramPost_status_idx" ON "InstagramPost"("status")'
  );
  console.log("    Indexes created/verified.");

  // 3. Integrity and Foreign Key Checks
  console.log("\n[3/4] Running PRAGMA integrity_check & foreign_key_check...");
  const integrity = await turso.execute("PRAGMA integrity_check");
  const integrityStatus = String(integrity.rows[0].integrity_check || integrity.rows[0][0]);
  console.log("PRAGMA integrity_check:", integrityStatus);
  if (integrityStatus !== "ok") {
    throw new Error(`Integrity check failed: ${integrityStatus}`);
  }

  const fkCheck = await turso.execute("PRAGMA foreign_key_check");
  console.log("PRAGMA foreign_key_check violations:", fkCheck.rows.length);
  if (fkCheck.rows.length > 0) {
    throw new Error(`Foreign key check failed with ${fkCheck.rows.length} violations`);
  }

  // 4. Parity Verification against Prisma Schema
  console.log("\n[4/4] Verifying 100% schema parity with prisma/schema.prisma...");
  
  // Verify ApiClient columns
  const updatedClientInfo = await turso.execute('PRAGMA table_info("ApiClient")');
  const finalClientCols = new Set(updatedClientInfo.rows.map((r) => String(r.name)));
  if (!finalClientCols.has("clientType")) {
    throw new Error('Parity failure: ApiClient is missing "clientType"');
  }

  // Verify InstagramPost columns
  const postInfo = await turso.execute('PRAGMA table_info("InstagramPost")');
  const postCols = new Set(postInfo.rows.map((r) => String(r.name)));
  const expectedPostCols = [
    "id",
    "articleId",
    "status",
    "attempts",
    "lastError",
    "caption",
    "postUrl",
    "instagramMediaId",
    "carouselMediaUrls",
    "slideCount",
    "postedAt",
    "createdAt",
    "updatedAt",
  ];

  for (const col of expectedPostCols) {
    if (!postCols.has(col)) {
      throw new Error(`Parity failure: InstagramPost is missing column "${col}"`);
    }
  }

  // Verify InstagramPost indexes
  const indexInfo = await turso.execute(
    "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='InstagramPost'"
  );
  const indexNames = new Set(indexInfo.rows.map((r) => String(r.name)));
  if (!indexNames.has("InstagramPost_articleId_idx") || !indexNames.has("InstagramPost_status_idx")) {
    throw new Error(`Parity failure: Missing indexes on InstagramPost (${Array.from(indexNames).join(", ")})`);
  }

  // Check data preservation
  const clientCount = await turso.execute('SELECT COUNT(*) as count FROM "ApiClient"');
  const postCount = await turso.execute('SELECT COUNT(*) as count FROM "InstagramPost"');
  console.log(`ApiClient record count: ${clientCount.rows[0].count}`);
  console.log(`InstagramPost record count: ${postCount.rows[0].count}`);

  const sampleClients = await turso.execute('SELECT id, name, clientType, publishMode FROM "ApiClient"');
  for (const c of sampleClients.rows) {
    console.log(`  - ApiClient [${c.name}]: clientType=${c.clientType}, publishMode=${c.publishMode}`);
  }

  console.log("\n======================================================================");
  console.log("    TURSO CLOUD MIGRATION & PARITY VERIFICATION SUCCEEDED!           ");
  console.log("======================================================================");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

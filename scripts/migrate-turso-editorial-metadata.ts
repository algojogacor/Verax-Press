/**
 * Verax Press — Apply Editorial Metadata Columns to Turso Cloud
 *
 * Adds 5 editorial metadata columns to `Article` table in Turso Cloud:
 * - topics: TEXT NOT NULL DEFAULT '[]'
 * - entities: TEXT NOT NULL DEFAULT '[]'
 * - centralQuestion: TEXT
 * - editorialAngle: TEXT
 * - metadataStatus: TEXT NOT NULL DEFAULT 'unverified'
 *
 * Safe, idempotent, non-destructive migration.
 */

import { createClient } from "@libsql/client";

async function main() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (!tursoUrl || !tursoToken) {
    console.error("FATAL: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be configured.");
    process.exit(1);
  }

  console.log("======================================================================");
  console.log("    VERAX PRESS — TURSO CLOUD EDITORIAL METADATA MIGRATION           ");
  console.log("======================================================================");
  console.log(`Target Turso Endpoint: ${tursoUrl}`);

  const turso = createClient({ url: tursoUrl, authToken: tursoToken });

  // 1. Check current columns
  console.log("\n[1/3] Inspecting table_info(Article)...");
  const tableInfo = await turso.execute("PRAGMA table_info(Article)");
  const existingColumns = new Set(tableInfo.rows.map((r) => String(r.name)));
  console.log("Existing columns:", Array.from(existingColumns).join(", "));

  const columnsToAdd = [
    { name: "topics", ddl: 'ALTER TABLE "Article" ADD COLUMN "topics" TEXT NOT NULL DEFAULT \'[]\'' },
    { name: "entities", ddl: 'ALTER TABLE "Article" ADD COLUMN "entities" TEXT NOT NULL DEFAULT \'[]\'' },
    { name: "centralQuestion", ddl: 'ALTER TABLE "Article" ADD COLUMN "centralQuestion" TEXT' },
    { name: "editorialAngle", ddl: 'ALTER TABLE "Article" ADD COLUMN "editorialAngle" TEXT' },
    { name: "metadataStatus", ddl: 'ALTER TABLE "Article" ADD COLUMN "metadataStatus" TEXT NOT NULL DEFAULT \'unverified\'' },
  ];

  // 2. Apply missing columns
  console.log("\n[2/3] Applying missing columns...");
  for (const col of columnsToAdd) {
    if (existingColumns.has(col.name)) {
      console.log(`  - Column "${col.name}" already exists, skipping.`);
    } else {
      console.log(`  + Adding column "${col.name}"...`);
      await turso.execute(col.ddl);
      console.log(`    Column "${col.name}" added successfully.`);
    }
  }

  // 3. Verify columns and check data
  console.log("\n[3/3] Verifying Article table after migration...");
  const updatedInfo = await turso.execute("PRAGMA table_info(Article)");
  const updatedColumns = updatedInfo.rows.map((r) => String(r.name));
  console.log("Updated columns count:", updatedColumns.length);

  const missing = columnsToAdd.filter((c) => !updatedColumns.includes(c.name));
  if (missing.length > 0) {
    throw new Error(`Verification failed: columns missing: ${missing.map((m) => m.name).join(", ")}`);
  }

  const sampleRows = await turso.execute(
    'SELECT id, title, status, topics, entities, centralQuestion, editorialAngle, metadataStatus FROM "Article" LIMIT 5'
  );
  console.log(`\nSample rows verification (${sampleRows.rows.length} rows):`);
  for (const row of sampleRows.rows) {
    console.log(`  - [${row.status}] ${row.title}: metadataStatus=${row.metadataStatus}, topics=${row.topics}`);
  }

  console.log("\nSUCCESS: Turso Cloud Article table migration complete and verified!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

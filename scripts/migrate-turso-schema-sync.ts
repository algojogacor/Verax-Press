/**
 * Verax Press — Safe & Idempotent Turso Cloud Schema Synchronization
 *
 * Applies missing columns to Turso Cloud database:
 * 1. MediaAsset.isGeneric (BOOLEAN NOT NULL DEFAULT true)
 * 2. ApiClient.publishMode (TEXT NOT NULL DEFAULT 'standard')
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
  console.log("    VERAX PRESS — TURSO CLOUD SCHEMA SYNCHRONIZATION                  ");
  console.log("======================================================================");
  console.log(`Target Turso Endpoint: ${tursoUrl}`);

  const turso = createClient({ url: tursoUrl, authToken: tursoToken });

  // 1. MediaAsset
  console.log("\n[1/4] Checking MediaAsset table...");
  const mediaInfo = await turso.execute('PRAGMA table_info("MediaAsset")');
  const mediaCols = new Set(mediaInfo.rows.map((r) => String(r.name)));
  console.log("Existing MediaAsset columns:", Array.from(mediaCols).join(", "));

  if (!mediaCols.has("isGeneric")) {
    console.log('  + Adding missing column "isGeneric" to MediaAsset...');
    await turso.execute('ALTER TABLE "MediaAsset" ADD COLUMN "isGeneric" BOOLEAN NOT NULL DEFAULT true');
    console.log('    Column "isGeneric" added successfully.');
  } else {
    console.log('  - Column "isGeneric" already exists in MediaAsset.');
  }

  // 2. ApiClient
  console.log("\n[2/4] Checking ApiClient table...");
  const clientInfo = await turso.execute('PRAGMA table_info("ApiClient")');
  const clientCols = new Set(clientInfo.rows.map((r) => String(r.name)));
  console.log("Existing ApiClient columns:", Array.from(clientCols).join(", "));

  if (!clientCols.has("publishMode")) {
    console.log('  + Adding missing column "publishMode" to ApiClient...');
    await turso.execute('ALTER TABLE "ApiClient" ADD COLUMN "publishMode" TEXT NOT NULL DEFAULT \'standard\'');
    console.log('    Column "publishMode" added successfully.');
  } else {
    console.log('  - Column "publishMode" already exists in ApiClient.');
  }

  // 3. Verification & Integrity Checks
  console.log("\n[3/4] Verifying table info and schema integrity...");
  const verifyMedia = await turso.execute('PRAGMA table_info("MediaAsset")');
  const verifyClient = await turso.execute('PRAGMA table_info("ApiClient")');

  const mediaHasCol = verifyMedia.rows.some((r) => r.name === "isGeneric");
  const clientHasCol = verifyClient.rows.some((r) => r.name === "publishMode");

  if (!mediaHasCol || !clientHasCol) {
    throw new Error(`Verification failed! MediaAsset.isGeneric: ${mediaHasCol}, ApiClient.publishMode: ${clientHasCol}`);
  }

  const integrity = await turso.execute("PRAGMA integrity_check");
  const integrityStatus = String(integrity.rows[0].integrity_check || integrity.rows[0][0]);
  console.log("PRAGMA integrity_check:", integrityStatus);

  const fkCheck = await turso.execute("PRAGMA foreign_key_check");
  console.log("PRAGMA foreign_key_check violations:", fkCheck.rows.length);

  // 4. Data Preservation Verification
  console.log("\n[4/4] Verifying existing data preservation...");
  const mediaRows = await turso.execute('SELECT id, title, url, isGeneric FROM "MediaAsset"');
  console.log(`MediaAsset records count: ${mediaRows.rows.length}`);
  for (const row of mediaRows.rows) {
    console.log(`  - MediaAsset [${row.id}]: title="${row.title}", isGeneric=${row.isGeneric}`);
  }

  const clientRows = await turso.execute('SELECT id, name, clientId, publishMode FROM "ApiClient"');
  console.log(`ApiClient records count: ${clientRows.rows.length}`);
  for (const row of clientRows.rows) {
    console.log(`  - ApiClient [${row.name}]: clientId=${row.clientId}, publishMode=${row.publishMode}`);
  }

  console.log("\nSUCCESS: Turso Cloud schema synchronization complete and verified!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

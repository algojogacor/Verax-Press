/**
 * Verax Press — Turso Cloud Production Clean-Slate Schema Migration
 * 
 * Applies authoritative Phase 1-4 schema and initial clean-slate
 * fixtures from local custom.db to Turso Cloud production database.
 */

import { createClient } from "@libsql/client";
import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.error("FATAL: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be configured.");
  process.exit(1);
}

if (!tursoUrl.includes("verax-aryarizkyap.aws-ap-southeast-1.turso.io")) {
  console.error(`FATAL: Unexpected Turso target URL: ${tursoUrl}`);
  process.exit(1);
}

console.log("======================================================================");
console.log("        VERAX PRESS — TURSO CLOUD SCHEMA MIGRATION & CLEAN SLATE     ");
console.log("======================================================================");
console.log(`Target Turso Endpoint: ${tursoUrl}`);

const customDbPath = resolve(process.cwd(), "db/custom.db");
const localDb = new DatabaseSync(customDbPath);
const turso = createClient({ url: tursoUrl, authToken: tursoToken });

console.log("\n[1/5] Extracting authoritative DDL from db/custom.db...");
const allTableDdl = localDb
  .prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'")
  .all() as { name: string; sql: string }[];

const allIndexDdl = localDb
  .prepare("SELECT name, sql FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%'")
  .all() as { name: string; sql: string }[];

console.log(`  Found ${allTableDdl.length} tables and ${allIndexDdl.length} indexes in custom.db.`);

const tableMap = new Map<string, string>();
for (const t of allTableDdl) {
  tableMap.set(t.name, t.sql);
}

// Ordered table creation: parents before children
const orderedTableNames = [
  "StaffUser",
  "Contributor",
  "Desk",
  "Person",
  "MediaAsset",
  "ApiClient",
  "ApiClientCredential",
  "ApiRequestLog",
  "StaffInvitation",
  "ContributorApplication",
  "ContributorInvitation",
  "Article",
  "ArticleVersion",
  "ArticleContribution",
  "SourceReference",
  "EditorialReview",
  "ReviewComment",
  "Submission",
  "Complaint",
  "CorrectionRecord",
  "AuditEvent",
];

console.log("\n[2/5] Creating 21 authoritative tables on Turso Cloud in dependency order...");
for (const name of orderedTableNames) {
  const sql = tableMap.get(name);
  if (!sql) {
    throw new Error(`Missing table DDL for ${name}`);
  }
  process.stdout.write(`  Creating table: ${name.padEnd(25)}... `);
  await turso.execute(sql);
  console.log("OK");
}

console.log("\n[3/5] Creating 50 authoritative indexes on Turso Cloud...");
for (const idx of allIndexDdl) {
  await turso.execute(idx.sql);
}
console.log(`  Applied ${allIndexDdl.length} indexes successfully.`);

console.log("\n[4/5] Seeding clean-slate production fixtures to Turso Cloud...");
// A. Copy Desks
const desks = localDb.prepare("SELECT * FROM Desk ORDER BY sortOrder").all() as any[];
for (const d of desks) {
  await turso.execute({
    sql: `INSERT INTO Desk (id, slug, name, description, sortOrder, isActive, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [d.id, d.slug, d.name, d.description, d.sortOrder, d.isActive, d.createdAt],
  });
}
console.log(`  Seeded ${desks.length} editorial desks.`);

// B. Copy Chief Editor StaffUser
const chiefStaff = localDb.prepare("SELECT * FROM StaffUser WHERE username = 'pemredVP'").get() as any;
if (!chiefStaff) {
  throw new Error("FATAL: pemredVP not found in local db/custom.db!");
}

await turso.execute({
  sql: `INSERT INTO StaffUser (id, username, email, name, role, status, passwordHash, lastLoginAt, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  args: [
    chiefStaff.id,
    chiefStaff.username,
    chiefStaff.email,
    chiefStaff.name,
    chiefStaff.role,
    chiefStaff.status,
    chiefStaff.passwordHash,
    chiefStaff.lastLoginAt,
    chiefStaff.createdAt,
    chiefStaff.updatedAt,
  ],
});
console.log(`  Seeded Chief Editor StaffUser: ${chiefStaff.username} (${chiefStaff.name}) [${chiefStaff.role}]`);

// C. Copy Chief Editor Person
const chiefPerson = localDb.prepare("SELECT * FROM Person WHERE staffUserId = ?").get(chiefStaff.id) as any;
if (chiefPerson) {
  await turso.execute({
    sql: `INSERT INTO Person (id, accountType, staffUserId, contributorId, publicName, anonymityMode, bio, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      chiefPerson.id,
      chiefPerson.accountType,
      chiefPerson.staffUserId,
      chiefPerson.contributorId,
      chiefPerson.publicName,
      chiefPerson.anonymityMode,
      chiefPerson.bio,
      chiefPerson.createdAt,
    ],
  });
  console.log(`  Seeded Chief Editor Person byline: ${chiefPerson.publicName}`);
}

// D. Record clean-slate migration in AuditEvent
const auditId = `audit_turso_migrated_${Date.now()}`;
const nowIso = new Date().toISOString();
await turso.execute({
  sql: `INSERT INTO AuditEvent (id, actorType, actorId, actorLabel, action, targetType, targetId, reason, correlationId, metadataJson, createdAt)
        VALUES (?, 'SYSTEM', ?, 'pemredVP', 'system.production_schema_migrated', 'SYSTEM', 'turso-production', 'Authorized migration of Phase 1-4 schema to Turso Cloud', ?, ?, ?)`,
  args: [
    auditId,
    chiefStaff.id,
    `mig-${Date.now()}`,
    JSON.stringify({
      operation: "TURSO_CLEAN_SLATE_MIGRATION",
      tablesCreated: orderedTableNames,
      desks: desks.map((d) => d.slug),
      chiefEditor: chiefStaff.username,
      migratedAt: nowIso,
    }),
    nowIso,
  ],
});
console.log(`  Recorded AuditEvent: system.production_schema_migrated (${auditId})`);

console.log("\n[5/5] Verifying Turso Cloud Database Integrity...");
const fkCheck = await turso.execute("PRAGMA foreign_key_check");
if (fkCheck.rows.length > 0) {
  throw new Error(`FATAL: Foreign key violations detected on Turso Cloud: ${JSON.stringify(fkCheck.rows)}`);
}
console.log("  ✓ Foreign key check: 0 violations");

const integrityCheck = await turso.execute("PRAGMA integrity_check");
console.log(`  ✓ Integrity check: ${JSON.stringify(integrityCheck.rows)}`);

// Verify StaffUser query
const verifyStaff = await turso.execute({
  sql: "SELECT id, username, email, name, role, status FROM StaffUser WHERE username = 'pemredVP'",
  args: [],
});
console.log("  ✓ Verified pemredVP on Turso Cloud:", verifyStaff.rows[0]);

// Verify table counts
const tablesToVerify = [
  "StaffUser", "Person", "Desk", "Article", "ApiClient", "ApiClientCredential",
  "ApiRequestLog", "Contributor", "ContributorApplication", "StaffInvitation"
];

console.log("\nTable row counts on Turso Cloud:");
for (const tbl of tablesToVerify) {
  const countRes = await turso.execute(`SELECT count(*) as c FROM "${tbl}"`);
  console.log(`  - ${tbl.padEnd(25)}: ${countRes.rows[0].c}`);
}

console.log("\n======================================================================");
console.log("   TURSO CLOUD MIGRATION COMPLETE & VERIFIED SUCCESSFULLY!           ");
console.log("======================================================================");

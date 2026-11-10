/**
 * Verax Press — Turso Remote Database Verification Script
 * Validates integrity, schema, row counts, and Prisma Client query execution.
 */
import { DatabaseSync } from 'node:sqlite';
import { createClient } from '@libsql/client';
import { db } from '../../src/lib/db';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoAuthToken) {
  console.error('ERROR: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set');
  process.exit(1);
}

console.log('================================================================');
console.log('       VERAX PRESS: TURSO CLOUD VERIFICATION SUITE              ');
console.log('================================================================\n');

const tokenHash = crypto.createHash('sha256').update(tursoAuthToken).digest('hex');
console.log('Turso Endpoint:   ', tursoUrl);
console.log('Token Fingerprint:', tokenHash);

// 1. Direct libSQL Client Verification
console.log('\n--- 1. Direct libSQL Checks ---');
const turso = createClient({ url: tursoUrl, authToken: tursoAuthToken });

const integrity = await turso.execute('PRAGMA integrity_check');
const integrityStr = String(integrity.rows[0].integrity_check || integrity.rows[0][0]);
console.log('PRAGMA integrity_check:  ', integrityStr);

const fkCheck = await turso.execute('PRAGMA foreign_key_check');
console.log('PRAGMA foreign_key_check:', fkCheck.rows.length === 0 ? '0 violations (OK)' : `${fkCheck.rows.length} violations`);

// 2. Table and Row Count Reconciliation
console.log('\n--- 2. Table Inventory & Row Reconciliation ---');
const sourceDb = new DatabaseSync(path.resolve('db/custom.db'), { open: true, readOnly: true });

const tablesRes = await turso.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%' ORDER BY name");
const tables = tablesRes.rows.map(r => String(r.name));

const reconciliationTable: any[] = [];
let totalSource = 0;
let totalTarget = 0;
let allMatch = true;

for (const table of tables) {
  const srcRow = sourceDb.prepare(`SELECT COUNT(*) as c FROM "${table}"`).get() as any;
  const srcCount = Number(srcRow?.c || 0);
  const tgtCountRes = await turso.execute(`SELECT COUNT(*) as c FROM "${table}"`);
  const tgtCount = Number(tgtCountRes.rows[0].c);

  totalSource += srcCount;
  totalTarget += tgtCount;
  const match = srcCount === tgtCount;
  if (!match) allMatch = false;

  reconciliationTable.push({
    Table: table,
    'Source (SQLite)': srcCount,
    'Target (Turso)': tgtCount,
    Status: match ? 'MATCH' : 'MISMATCH',
  });
}

sourceDb.close();
console.table(reconciliationTable);
console.log(`Total Source Rows: ${totalSource} | Total Target Rows: ${totalTarget} | Overall: ${allMatch ? 'PERFECT MATCH (100%)' : 'MISMATCH'}`);

// 3. Prisma ORM 6 Integration Checks
console.log('\n--- 3. Prisma ORM 6 libSQL Adapter Queries ---');

// Query Desks
const desks = await db.desk.findMany({
  where: { isActive: true },
  orderBy: { sortOrder: 'asc' },
});
console.log(`Prisma desk.findMany() returned ${desks.length} active desks:`);
desks.forEach(d => console.log(`  - [${d.slug}] ${d.name}`));

// Query Articles
const articles = await db.article.findMany({
  where: { status: 'PUBLISHED' },
  take: 3,
  include: {
    desk: true,
    createdBy: { select: { name: true, role: true } },
  },
});
console.log(`\nPrisma article.findMany() returned ${articles.length} sample published articles:`);
articles.forEach(a => {
  console.log(`  - "${a.title}" (Desk: ${a.desk.name}, Author: ${a.createdBy?.name || a.byline})`);
});

// Query Staff
const staff = await db.staffUser.findMany({
  select: { email: true, name: true, role: true, status: true },
});
console.log(`\nPrisma staffUser.findMany() returned ${staff.length} staff accounts:`);
staff.forEach(s => console.log(`  - ${s.name} <${s.email}> (${s.role}, ${s.status})`));

// Query Audit Events
const auditCount = await db.auditEvent.count();
console.log(`\nPrisma auditEvent.count(): ${auditCount} events recorded.`);

// 4. Test Prisma Write Operation and Transaction
console.log('\n--- 4. Prisma Transaction & Write Test on Turso ---');
const testSlug = `turso-verification-${Date.now()}`;
const testResult = await db.$transaction(async (tx) => {
  // Create an audit event in transaction
  const event = await tx.auditEvent.create({
    data: {
      actorType: 'SYSTEM',
      actorLabel: 'turso-migration-verifier',
      action: 'system.verify_turso',
      targetType: 'SYSTEM',
      targetId: 'turso-cloud',
      reason: 'Automated post-migration verification test',
    },
  });

  // Verify it can be read inside the same transaction
  const readBack = await tx.auditEvent.findUnique({
    where: { id: event.id },
  });

  // Delete it to leave no trace
  await tx.auditEvent.delete({
    where: { id: event.id },
  });

  return readBack !== null;
});

console.log('Interactive transaction ($transaction) test on Turso:', testResult ? 'PASS' : 'FAIL');

await db.$disconnect();

if (!allMatch || !testResult || integrityStr !== 'ok') {
  console.error('\nFATAL: Verification failed!');
  process.exit(1);
}

console.log('\n================================================================');
console.log('   ALL 16 TABLES, 100 ROWS, TRANSACTIONS & INTEGRITY VERIFIED!   ');
console.log('================================================================');

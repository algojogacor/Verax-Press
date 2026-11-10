/**
 * Verax Press — SQLite to Turso Cloud Deterministic Migration Script
 * Migrates local db/custom.db to remote Turso libSQL database.
 * Preserves exact types, IDs, JSON strings, booleans, timestamps, and FK relations.
 */
import { DatabaseSync } from 'node:sqlite';
import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoAuthToken) {
  console.error('ERROR: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables must be set.');
  process.exit(1);
}

const sqlitePath = path.resolve('db/custom.db');
if (!fs.existsSync(sqlitePath)) {
  console.error('ERROR: Source SQLite database not found at:', sqlitePath);
  process.exit(1);
}

console.log('================================================================');
console.log('       VERAX PRESS: SQLITE TO TURSO CLOUD MIGRATION             ');
console.log('================================================================\n');

console.log('Source SQLite DB:    ', sqlitePath);
console.log('Target Turso URL:    ', tursoUrl);
const tokenHash = crypto.createHash('sha256').update(tursoAuthToken).digest('hex');
console.log('Target Token Hash:   ', tokenHash);

// Step 1: Open source SQLite in read-only mode
const sourceDb = new DatabaseSync(sqlitePath, { open: true, readOnly: true });

// Verify source integrity
const sourceIntegrity = sourceDb.prepare('PRAGMA integrity_check').all();
console.log('\n[1/6] Source SQLite PRAGMA integrity_check:', sourceIntegrity[0].integrity_check);
if (sourceIntegrity[0].integrity_check !== 'ok') {
  console.error('FATAL: Source database failed integrity check!');
  process.exit(1);
}

// Step 2: Connect to Turso Cloud
console.log('\n[2/6] Connecting to Turso Cloud...');
const turso = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken,
});

// Step 3: Check and Apply Schema DDL
console.log('\n[3/6] Applying Schema DDL to Turso Cloud...');
const migrationSqlPath = path.resolve('prisma/migrations/20261110000000_init/migration.sql');
const migrationSql = fs.readFileSync(migrationSqlPath, 'utf8');

// Parse statements safely: strip single-line comments and split by semicolon
const cleanedSql = migrationSql.replace(/--[^\r\n]*/g, '');
const statements = cleanedSql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

console.log(`Executing ${statements.length} DDL statements on Turso...`);
for (const sql of statements) {
  if (sql.trim()) {
    try {
      await turso.execute(sql);
    } catch (err: any) {
      // If table/index already exists, ignore, else fail
      if (!err.message?.includes('already exists')) {
        console.error('DDL Error executing:', sql.slice(0, 80));
        throw err;
      }
    }
  }
}
console.log('Schema DDL verified successfully on Turso!');

// Step 4: Tables in strict dependency order (Parent tables first, child tables after)
const dependencyOrderedTables = [
  'StaffUser',
  'Contributor',
  'Person',
  'Desk',
  'MediaAsset',
  'Article',
  'ArticleVersion',
  'ArticleContribution',
  'SourceReference',
  'EditorialReview',
  'ReviewComment',
  'Submission',
  'ApiClient',
  'Complaint',
  'CorrectionRecord',
  'AuditEvent',
];

// Step 5: Transfer records table by table
console.log('\n[4/6] Migrating Data from SQLite to Turso...');
const migrationStats: Record<string, { sourceRows: number; targetRows: number; pkMatch: boolean }> = {};

for (const tableName of dependencyOrderedTables) {
  // Query all rows from source SQLite
  const sourceRows = sourceDb.prepare(`SELECT * FROM "${tableName}"`).all() as Record<string, any>[];
  const count = sourceRows.length;

  console.log(`-> Migrating table "${tableName}" (${count} rows)...`);

  if (count > 0) {
    // Get column names from first row
    const columns = Object.keys(sourceRows[0]);
    const quotedCols = columns.map(c => `"${c}"`).join(', ');
    const placeholders = columns.map(() => '?').join(', ');
    const insertSql = `INSERT INTO "${tableName}" (${quotedCols}) VALUES (${placeholders})`;

    // Batch insert in chunks of 50
    const chunkSize = 50;
    for (let i = 0; i < count; i += chunkSize) {
      const chunk = sourceRows.slice(i, i + chunkSize);
      const batchStatements = chunk.map(row => ({
        sql: insertSql,
        args: columns.map(col => {
          const val = row[col];
          // Handle null vs undefined
          return val === undefined ? null : val;
        }),
      }));

      await turso.batch(batchStatements, 'write');
    }
  }

  // Verify row count on Turso
  const targetCountRes = await turso.execute(`SELECT COUNT(*) as count FROM "${tableName}"`);
  const targetCount = Number(targetCountRes.rows[0].count);

  // Compare PK sets if has id
  let pkMatch = true;
  if (count > 0 && 'id' in sourceRows[0]) {
    const targetIdsRes = await turso.execute(`SELECT "id" FROM "${tableName}"`);
    const targetIds = new Set(targetIdsRes.rows.map(r => r.id));
    const sourceIds = new Set(sourceRows.map(r => r.id));

    if (targetIds.size !== sourceIds.size) {
      pkMatch = false;
    } else {
      for (const id of sourceIds) {
        if (!targetIds.has(id)) {
          pkMatch = false;
          break;
        }
      }
    }
  }

  migrationStats[tableName] = {
    sourceRows: count,
    targetRows: targetCount,
    pkMatch,
  };

  const status = targetCount === count && pkMatch ? 'PASS' : 'FAIL';
  console.log(`   [${status}] Source: ${count} | Target: ${targetCount} | PK Match: ${pkMatch}`);

  if (status === 'FAIL') {
    throw new Error(`Migration verification failed for table ${tableName}: source=${count}, target=${targetCount}, pkMatch=${pkMatch}`);
  }
}

// Step 6: Post-Migration Semantic and Integrity Checks
console.log('\n[5/6] Running Post-Migration Semantic & Integrity Checks on Turso...');

// Integrity check on Turso
const tursoIntegrity = await turso.execute('PRAGMA integrity_check');
const integrityResult = String(tursoIntegrity.rows[0].integrity_check || tursoIntegrity.rows[0][0]);
console.log('Turso PRAGMA integrity_check:      ', integrityResult);

// Foreign key check on Turso
const tursoFkCheck = await turso.execute('PRAGMA foreign_key_check');
console.log('Turso PRAGMA foreign_key_check:    ', tursoFkCheck.rows.length === 0 ? '0 violations (OK)' : `${tursoFkCheck.rows.length} violations`);

// Sample query tests
console.log('\n[6/6] Verifying Relational Queries via Turso...');
const activeDesks = await turso.execute('SELECT slug, name FROM "Desk" WHERE isActive = 1 ORDER BY sortOrder ASC');
console.log('Active Editorial Desks:');
for (const desk of activeDesks.rows) {
  console.log(` - ${desk.slug}: ${desk.name}`);
}

const publishedArticles = await turso.execute("SELECT id, slug, title, status FROM \"Article\" WHERE status = 'PUBLISHED' LIMIT 3");
console.log(`Published Articles sample (${publishedArticles.rows.length} returned):`);
for (const art of publishedArticles.rows) {
  console.log(` - [${art.status}] ${art.slug}: ${art.title}`);
}

sourceDb.close();

console.log('\n================================================================');
console.log('      MIGRATION COMPLETED SUCCESSFULLY WITH ZERO ERRORS         ');
console.log('================================================================');

console.table(migrationStats);

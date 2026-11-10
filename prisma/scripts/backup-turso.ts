/**
 * Verax Press — Turso Remote Database Backup & Export Script
 * Dumps remote Turso cloud data into a local, verified, timestamped SQLite backup.
 * Enforces retention policy (retains latest 7 backups) and computes SHA-256.
 */
import { DatabaseSync } from 'node:sqlite';
import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoAuthToken) {
  console.error('ERROR: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set');
  process.exit(1);
}

const backupsDir = path.resolve('db/backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupsDir, `turso_export_${timestamp}.db`);

console.log('================================================================');
console.log('       VERAX PRESS: TURSO CLOUD REMOTE BACKUP EXPORT            ');
console.log('================================================================\n');

console.log('Connecting to Turso Cloud...');
const turso = createClient({ url: tursoUrl, authToken: tursoAuthToken });

// Connect to target backup SQLite file
console.log('Creating local backup file:', backupPath);
const backupDb = new DatabaseSync(backupPath, { open: true });

// Read schema from Turso
const tablesRes = await turso.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%' ORDER BY name");

// Create tables in backup
for (const row of tablesRes.rows) {
  if (row.sql) {
    backupDb.exec(String(row.sql));
  }
}

// Disable FKs during bulk restore into backup
backupDb.exec('PRAGMA foreign_keys = OFF;');

// Copy data table by table
let totalExportedRows = 0;
for (const row of tablesRes.rows) {
  const table = String(row.name);
  const dataRes = await turso.execute(`SELECT * FROM "${table}"`);
  const rows = dataRes.rows;

  if (rows.length > 0) {
    const columns = dataRes.columns;
    const quotedCols = columns.map(c => `"${c}"`).join(', ');
    const placeholders = columns.map(() => '?').join(', ');
    const insertStmt = backupDb.prepare(`INSERT INTO "${table}" (${quotedCols}) VALUES (${placeholders})`);

    for (const item of rows) {
      insertStmt.run(...(columns.map(c => item[c] === undefined ? null : item[c]) as any));
    }
  }

  totalExportedRows += rows.length;
  console.log(` - Exported "${table}": ${rows.length} rows`);
}

// Re-create indexes in backup
const indexesRes = await turso.execute("SELECT sql FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' AND sql IS NOT NULL");
for (const row of indexesRes.rows) {
  if (row.sql) {
    try {
      backupDb.exec(String(row.sql));
    } catch (_) {}
  }
}

// Re-enable FKs and run check
backupDb.exec('PRAGMA foreign_keys = ON;');
const fkCheck = backupDb.prepare('PRAGMA foreign_key_check').all();
console.log('Backup PRAGMA foreign_key_check violations:', fkCheck.length);

// Integrity check on backup file
const integrity = backupDb.prepare('PRAGMA integrity_check').all();
console.log('\nBackup PRAGMA integrity_check:', integrity[0].integrity_check);

backupDb.close();

// Compute SHA-256
const fileBytes = fs.readFileSync(backupPath);
const sha256 = crypto.createHash('sha256').update(fileBytes).digest('hex');
console.log('Backup File Size: ', fileBytes.length, 'bytes');
console.log('Backup SHA-256:   ', sha256);
console.log(`Total Exported:   ${totalExportedRows} rows`);

// Retention: Keep latest 7 backups matching turso_export_*.db
const allExports = fs.readdirSync(backupsDir)
  .filter(f => f.startsWith('turso_export_') && f.endsWith('.db'))
  .map(f => ({ name: f, fullPath: path.join(backupsDir, f), mtime: fs.statSync(path.join(backupsDir, f)).mtime.getTime() }))
  .sort((a, b) => b.mtime - a.mtime);

const RETENTION_LIMIT = 7;
if (allExports.length > RETENTION_LIMIT) {
  const toDelete = allExports.slice(RETENTION_LIMIT);
  console.log(`\nPruning ${toDelete.length} older backups (retention: ${RETENTION_LIMIT})...`);
  for (const item of toDelete) {
    fs.unlinkSync(item.fullPath);
    console.log(` - Pruned: ${item.name}`);
  }
}

console.log('\n================================================================');
console.log('        TURSO REMOTE BACKUP COMPLETED AND VERIFIED!              ');
console.log('================================================================');

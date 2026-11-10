import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

const ARCHIVE = process.argv[2];
if (!ARCHIVE) {
  console.error('Usage: node test-audit-e.mjs <archive-path>');
  process.exit(1);
}

const STAGING_DIR = '/tmp/audit-restore-test-' + Date.now();
fs.mkdirSync(STAGING_DIR, { recursive: true });

console.log('=== AUDIT SECTION E: BACKUP & RECOVERY VERIFICATION ===');
console.log(`[E.1] Staging directory created: ${STAGING_DIR}`);
console.log(`[E.2] Extracting archive: ${ARCHIVE}`);
execSync(`tar -xzf "${ARCHIVE}" -C "${STAGING_DIR}"`);

const files = fs.readdirSync(STAGING_DIR);
console.log(`      Extracted items:`, files);

const sqliteFile = files.find(f => f.endsWith('.sqlite'));
if (!sqliteFile) {
  throw new Error('E.FAILED: No SQLite file found in extracted backup');
}

const stagedDbPath = path.join(STAGING_DIR, sqliteFile);
console.log(`\n[E.3] Testing SQLite database integrity on restored snapshot: ${sqliteFile}`);
const db = new DatabaseSync(stagedDbPath);
const integrity = db.prepare('PRAGMA integrity_check;').get();
console.log('      PRAGMA integrity_check result:', integrity);
if (integrity?.integrity_check !== 'ok') {
  throw new Error('E.FAILED: SQLite integrity_check was NOT ok: ' + JSON.stringify(integrity));
}
console.log('      [PASS] Database integrity is OK.');

console.log('\n[E.4] Matching records and file SHA-256 integrity...');
const records = db.prepare("SELECT * FROM media_items WHERE status = 'active'").all();
console.log(`      Active media records in restored database: ${records.length}`);

let matches = 0;
let mismatches = 0;

for (const row of records) {
  // Relative path in archive is visibility/category/stored_filename
  const relPath = path.join(row.visibility, row.category, row.stored_filename);
  const stagedFilePath = path.join(STAGING_DIR, relPath);

  if (!fs.existsSync(stagedFilePath)) {
    console.error(`      [MISSING] File not found in backup: ${relPath}`);
    mismatches++;
    continue;
  }

  const content = fs.readFileSync(stagedFilePath);
  const hash = crypto.createHash('sha256').update(content).digest('hex');

  if (hash !== row.sha256) {
    console.error(`      [MISMATCH] ${row.stored_filename}: DB hash ${row.sha256} vs File hash ${hash}`);
    mismatches++;
  } else {
    matches++;
  }
}

console.log(`      Verified matching files: ${matches}/${records.length}`);
if (mismatches > 0) {
  throw new Error(`E.FAILED: ${mismatches} files were missing or had corrupted SHA-256 hashes`);
}
console.log('      [PASS] 100% of referenced files exist in backup with matching SHA-256 hashes.');

// Compare count with live database
const liveDbPath = '/home/azureuser/verax-media-data/database/media.sqlite';
const liveDb = new DatabaseSync(liveDbPath);
const liveCount = liveDb.prepare("SELECT COUNT(*) as count FROM media_items WHERE status = 'active'").get();
console.log(`\n[E.5] Record count comparison:`);
console.log(`      Restored active count: ${records.length}`);
console.log(`      Live DB active count:  ${liveCount.count}`);
if (records.length === liveCount.count) {
  console.log('      [PASS] Record counts match live database exactly.');
} else {
  console.log('      [WARN] Counts differ (possibly due to concurrent test insertions/deletions).');
}

db.close();
liveDb.close();

// Clean up staging directory
try {
  fs.rmSync(STAGING_DIR, { recursive: true, force: true });
  console.log(`\n[E.6] Staging directory ${STAGING_DIR} removed cleanly.`);
} catch (_) {}
console.log('>>> SECTION E VERIFICATION COMPLETED SUCCESSFULLY <<<');

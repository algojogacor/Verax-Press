#!/usr/bin/env node
// ==============================================================================
// Verax Media Storage Service — Semantic & Cryptographic Migration Verifier
// ==============================================================================
// Usage: node verify-migration.mjs <srcRoot> <dstRoot> [targetCanonicalRoot]
// ==============================================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const [srcRootArg, dstRootArg, canonicalRootArg] = process.argv.slice(2);

if (!srcRootArg || !dstRootArg) {
  console.error('Usage: node verify-migration.mjs <srcRoot> <dstRoot> [targetCanonicalRoot]');
  process.exit(1);
}

const srcRoot = path.resolve(srcRootArg);
const dstRoot = path.resolve(dstRootArg);
// canonicalRoot is the path that records in dstRoot are expected to point to (defaults to dstRoot)
const canonicalRoot = canonicalRootArg ? path.resolve(canonicalRootArg) : dstRoot;

console.log('================================================================');
console.log('       VERAX MEDIA STORAGE: MIGRATION SEMANTIC VERIFICATION     ');
console.log('================================================================');
console.log(`Source Root:      ${srcRoot}`);
console.log(`Destination Root: ${dstRoot}`);
console.log(`Canonical Target: ${canonicalRoot}`);
console.log('');

function computeSha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

let errors = [];

function assert(condition, message) {
  if (!condition) {
    errors.push(message);
    console.error(`  [FAIL] ${message}`);
  } else {
    console.log(`  [PASS] ${message}`);
  }
}

// -----------------------------------------------------------------------------
// 1. Database Files & SQLite PRAGMA Checks
// -----------------------------------------------------------------------------
console.log('--- 1. Database SQLite PRAGMAs & Structural Integrity ---');
const srcDbPath = path.join(srcRoot, 'database', 'media.sqlite');
const dstDbPath = path.join(dstRoot, 'database', 'media.sqlite');

assert(fs.existsSync(srcDbPath), `Source database exists at ${srcDbPath}`);
assert(fs.existsSync(dstDbPath), `Destination database exists at ${dstDbPath}`);

if (errors.length > 0) {
  console.error('\nFATAL: Database files missing. Aborting verification.');
  process.exit(1);
}

const srcDb = new DatabaseSync(srcDbPath, { readOnly: true });
const dstDb = new DatabaseSync(dstDbPath);

// Integrity Check
const srcIntegrity = srcDb.prepare('PRAGMA integrity_check').all();
assert(srcIntegrity.length === 1 && srcIntegrity[0].integrity_check === 'ok', 'Source database passes PRAGMA integrity_check');

const dstIntegrity = dstDb.prepare('PRAGMA integrity_check').all();
assert(dstIntegrity.length === 1 && dstIntegrity[0].integrity_check === 'ok', 'Destination database passes PRAGMA integrity_check');

// Foreign Key Check
const srcFk = srcDb.prepare('PRAGMA foreign_key_check').all();
assert(srcFk.length === 0, 'Source database has 0 foreign key violations');

const dstFk = dstDb.prepare('PRAGMA foreign_key_check').all();
assert(dstFk.length === 0, 'Destination database has 0 foreign key violations');

// Schema Check
const expectedTables = ['media_items', 'consumed_nonces'].sort();
const srcTables = srcDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r => r.name).sort();
const dstTables = dstDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r => r.name).sort();

assert(JSON.stringify(srcTables) === JSON.stringify(expectedTables), `Source tables match expected: ${JSON.stringify(srcTables)}`);
assert(JSON.stringify(dstTables) === JSON.stringify(expectedTables), `Destination tables match expected: ${JSON.stringify(dstTables)}`);

// Index Check
const expectedIndexes = ['idx_media_visibility_cat', 'idx_media_sha256', 'idx_media_status', 'idx_nonces_expires'].sort();
const srcIndexes = srcDb.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'").all().map(r => r.name).sort();
const dstIndexes = dstDb.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'").all().map(r => r.name).sort();

assert(JSON.stringify(srcIndexes) === JSON.stringify(expectedIndexes), `Source indexes match expected: ${JSON.stringify(srcIndexes)}`);
assert(JSON.stringify(dstIndexes) === JSON.stringify(expectedIndexes), `Destination indexes match expected: ${JSON.stringify(dstIndexes)}`);

// -----------------------------------------------------------------------------
// 2. Table Record Counts
// -----------------------------------------------------------------------------
console.log('\n--- 2. Record Counts & Operational Metadata ---');
const srcItemCount = srcDb.prepare('SELECT COUNT(*) as count FROM media_items').get().count;
const dstItemCount = dstDb.prepare('SELECT COUNT(*) as count FROM media_items').get().count;
assert(srcItemCount === dstItemCount, `media_items record count matches: ${srcItemCount} rows`);

const srcNonceCount = srcDb.prepare('SELECT COUNT(*) as count FROM consumed_nonces').get().count;
const dstNonceCount = dstDb.prepare('SELECT COUNT(*) as count FROM consumed_nonces').get().count;
assert(srcNonceCount === dstNonceCount, `consumed_nonces record count matches: ${srcNonceCount} rows`);

const srcNonces = srcDb.prepare('SELECT nonce, action, consumed_at, expires_at FROM consumed_nonces ORDER BY nonce').all();
const dstNonces = dstDb.prepare('SELECT nonce, action, consumed_at, expires_at FROM consumed_nonces ORDER BY nonce').all();
assert(JSON.stringify(srcNonces) === JSON.stringify(dstNonces), `All consumed_nonces match identically (${srcNonces.length} rows preserved)`);

// -----------------------------------------------------------------------------
// 3. Media Items Semantic & Field-Level Equivalence
// -----------------------------------------------------------------------------
console.log('\n--- 3. Media Items Field-Level Equivalence & Transformation Audit ---');
const srcItems = srcDb.prepare('SELECT * FROM media_items ORDER BY id').all();
const dstItems = dstDb.prepare('SELECT * FROM media_items ORDER BY id').all();

const dstMap = new Map();
for (const item of dstItems) {
  dstMap.set(item.id, item);
}

let itemsVerified = 0;
for (const srcItem of srcItems) {
  const dstItem = dstMap.get(srcItem.id);
  if (!dstItem) {
    assert(false, `Media item ID ${srcItem.id} missing from destination database`);
    continue;
  }

  // Check all immutable metadata fields
  const immutableFields = [
    'original_filename',
    'stored_filename',
    'visibility',
    'category',
    'mime_type',
    'file_extension',
    'file_size',
    'sha256',
    'width',
    'height',
    'uploaded_by',
    'created_at',
    'updated_at',
    'status',
    'deleted_at',
  ];

  for (const field of immutableFields) {
    if (srcItem[field] !== dstItem[field]) {
      assert(false, `Field '${field}' mismatch for ID ${srcItem.id}: source='${srcItem[field]}' vs dest='${dstItem[field]}'`);
    }
  }

  // Check storage_path: Must be strictly transformed from srcRoot to canonicalRoot
  const expectedCanonicalPath = srcItem.storage_path.replace(srcRoot, canonicalRoot);
  if (dstItem.storage_path !== expectedCanonicalPath) {
    assert(false, `storage_path mismatch for ID ${srcItem.id}:\n  Expected: ${expectedCanonicalPath}\n  Actual:   ${dstItem.storage_path}`);
  }

  // Check that the physical file exists in the destination storage tree
  // In staging, the file will be located under dstRoot (replacing canonicalRoot with dstRoot if staging)
  const physicalDstPath = dstItem.storage_path.replace(canonicalRoot, dstRoot);
  if (srcItem.status === 'active') {
    if (!fs.existsSync(physicalDstPath)) {
      assert(false, `Active file missing on disk: ${physicalDstPath}`);
    } else {
      // Verify physical file size and SHA-256 match recorded database hash
      const physicalSize = fs.statSync(physicalDstPath).size;
      if (physicalSize !== dstItem.file_size) {
        assert(false, `File size on disk (${physicalSize}) does not match record (${dstItem.file_size}) for ${physicalDstPath}`);
      }
      const physicalHash = computeSha256(physicalDstPath);
      if (physicalHash !== dstItem.sha256) {
        assert(false, `Physical file SHA-256 (${physicalHash}) does not match recorded SHA-256 (${dstItem.sha256}) for ${physicalDstPath}`);
      }
    }
  } else if (srcItem.status === 'quarantined') {
    // Quarantined files are located in quarantine/<timestamp>_<stored_filename>
    const quarantineDir = path.join(dstRoot, 'quarantine');
    const qFiles = fs.readdirSync(quarantineDir);
    const matchingQFile = qFiles.find(f => f.endsWith(`_${dstItem.stored_filename}`));
    if (!matchingQFile) {
      assert(false, `Quarantined file matching stored_filename '${dstItem.stored_filename}' not found in ${quarantineDir}`);
    } else {
      const qFilePath = path.join(quarantineDir, matchingQFile);
      const qHash = computeSha256(qFilePath);
      if (qHash !== dstItem.sha256) {
        assert(false, `Quarantined file SHA-256 mismatch for ${qFilePath}`);
      }
    }
  }

  itemsVerified++;
}

assert(itemsVerified === srcItemCount, `Successfully verified all ${itemsVerified} media item records and associated files`);

// -----------------------------------------------------------------------------
// 4. Binary File Checksum Equality (All non-database files)
// -----------------------------------------------------------------------------
console.log('\n--- 4. Static Binary Files SHA-256 Exact Equality ---');
function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(full, fileList);
    } else if (entry.isFile()) {
      fileList.push(full);
    }
  }
  return fileList;
}

const allSrcFiles = getAllFiles(srcRoot);
let binaryFilesChecked = 0;

for (const srcFile of allSrcFiles) {
  const rel = path.relative(srcRoot, srcFile);
  
  // Skip database files (sqlite, wal, shm) as they are verified semantically
  if (rel.startsWith('database') || rel.includes('media.sqlite')) {
    continue;
  }

  const dstFile = path.join(dstRoot, rel);
  if (!fs.existsSync(dstFile)) {
    assert(false, `Destination static file missing: ${dstFile}`);
    continue;
  }

  const srcHash = computeSha256(srcFile);
  const dstHash = computeSha256(dstFile);

  if (srcHash !== dstHash) {
    assert(false, `SHA-256 mismatch for binary file ${rel}:\n  Source: ${srcHash}\n  Dest:   ${dstHash}`);
  }
  binaryFilesChecked++;
}

assert(binaryFilesChecked > 0, `Verified exact SHA-256 hash match for all ${binaryFilesChecked} static binary files`);

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n================================================================');
if (errors.length === 0) {
  console.log('       MIGRATION VERIFICATION PASSED: 100% INTEGRITY VERIFIED   ');
  console.log('================================================================');
  process.exit(0);
} else {
  console.error(`       MIGRATION VERIFICATION FAILED: ${errors.length} ERROR(S) DETECTED `);
  console.error('================================================================');
  for (const err of errors) {
    console.error(` - ${err}`);
  }
  process.exit(1);
}

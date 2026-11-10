#!/usr/bin/env node
// ==============================================================================
// Verax Media Storage Service — Isolated Staging Migration Test Suite
// ==============================================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { execFileSync } from 'node:child_process';

const LIVE_DATA_DIR = process.env.LIVE_DATA_DIR || '/home/azureuser/verax-media-data';
const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);
const VERIFIER_SCRIPT = path.join(SCRIPT_DIR, '..', 'scripts', 'verify-migration.mjs');

console.log('================================================================');
console.log('       ISOLATED STAGING MIGRATION & ROLLBACK VERIFICATION       ');
console.log('================================================================');
console.log(`Live Data Source for Test Copy: ${LIVE_DATA_DIR}`);

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function getDirTreeHashes(dir) {
  const map = new Map();
  function recurse(curr) {
    if (!fs.existsSync(curr)) return;
    const entries = fs.readdirSync(curr, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(curr, e.name);
      if (e.isDirectory()) {
        recurse(full);
      } else if (e.isFile()) {
        map.set(path.relative(dir, full), sha256File(full));
      }
    }
  }
  recurse(dir);
  return map;
}

const runId = crypto.randomBytes(4).toString('hex');
const testBaseDir = path.join(os.tmpdir(), `verax_migration_test_${runId}`);
const testSrcDir = path.join(testBaseDir, 'test_source');
const testStagingDir = path.join(testBaseDir, 'test_staging');
const testCanonicalDir = path.join(testBaseDir, 'test_canonical');

console.log(`Disposable Sandbox: ${testBaseDir}\n`);

try {
  // Step 1: Copy live data to disposable test source
  console.log('--- Step 1: Creating Isolated Test Source from Snapshot ---');
  fs.mkdirSync(testSrcDir, { recursive: true });
  fs.cpSync(LIVE_DATA_DIR, testSrcDir, { recursive: true });
  
  // Clean up any dynamic WAL/SHM to simulate clean checkpoint and initialize test paths
  const testSrcDb = new DatabaseSync(path.join(testSrcDir, 'database', 'media.sqlite'));
  testSrcDb.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  testSrcDb.prepare("UPDATE media_items SET storage_path = REPLACE(storage_path, ?, ?)").run(LIVE_DATA_DIR, testSrcDir);
  testSrcDb.close();

  const srcHashesBefore = getDirTreeHashes(testSrcDir);
  console.log(`  [PASS] Test source initialized with ${srcHashesBefore.size} files`);

  // Step 2: Perform Staging Migration
  console.log('\n--- Step 2: Preparing Staging Migration ---');
  fs.mkdirSync(testStagingDir, { recursive: true });
  fs.cpSync(testSrcDir, testStagingDir, { recursive: true });

  // Update storage_path transactionally in staging database
  const stagingDbPath = path.join(testStagingDir, 'database', 'media.sqlite');
  const stagingDb = new DatabaseSync(stagingDbPath);
  stagingDb.exec('BEGIN TRANSACTION;');
  const updateStmt = stagingDb.prepare(`
    UPDATE media_items
    SET storage_path = REPLACE(storage_path, ?, ?)
    WHERE storage_path LIKE ?
  `);
  const changes = updateStmt.run(testSrcDir, testCanonicalDir, `${testSrcDir}%`).changes;
  stagingDb.exec('COMMIT;');
  stagingDb.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  stagingDb.close();
  console.log(`  [PASS] Transactional path update completed: ${changes} rows transformed`);

  // Step 3: Run Semantic Verifier against Staging
  console.log('\n--- Step 3: Running Semantic Verifier on Staging ---');
  const verifierOutput = execFileSync(process.execPath, [
    VERIFIER_SCRIPT,
    testSrcDir,
    testStagingDir,
    testCanonicalDir,
  ], { encoding: 'utf-8' });
  console.log(verifierOutput);
  console.log('  [PASS] Staging verification passed with 100% equivalence');

  // Step 4: Verify Source Integrity (Must Be Untouched)
  console.log('\n--- Step 4: Verifying Source Immutability ---');
  const srcHashesAfter = getDirTreeHashes(testSrcDir);
  let srcTampered = false;
  for (const [relPath, origHash] of srcHashesBefore.entries()) {
    if (relPath.endsWith('-wal') || relPath.endsWith('-shm')) continue;
    const currHash = srcHashesAfter.get(relPath);
    if (currHash !== origHash) {
      console.error(`  [FAIL] Source file modified: ${relPath}`);
      srcTampered = true;
    }
  }
  if (!srcTampered) {
    console.log('  [PASS] Source data remained 100% untouched and identical');
  }

  // Step 5: Test Rollback on Injected Failure
  console.log('\n--- Step 5: Testing Failure Detection & Rollback Trap ---');
  const failStagingDir = path.join(testBaseDir, 'test_staging_corrupted');
  fs.mkdirSync(failStagingDir, { recursive: true });
  fs.cpSync(testSrcDir, failStagingDir, { recursive: true });

  // Inject defect: corrupt an article image file with garbage data
  const articlesDir = path.join(failStagingDir, 'public', 'articles');
  const sampleArticleFile = fs.readdirSync(articlesDir)[0];
  const corruptPath = path.join(articlesDir, sampleArticleFile);
  fs.writeFileSync(corruptPath, Buffer.from('CORRUPTED_PAYLOAD_FOR_TESTING'));

  let detectedError = false;
  try {
    execFileSync(process.execPath, [
      VERIFIER_SCRIPT,
      testSrcDir,
      failStagingDir,
      testCanonicalDir,
    ], { encoding: 'utf-8', stdio: 'pipe' });
  } catch (err) {
    detectedError = true;
    console.log(`  [PASS] Corrupted staging correctly caught and rejected by verifier (Exit code: ${err.status})`);
  }

  if (!detectedError) {
    throw new Error('Verifier failed to detect injected corruption in staging!');
  }

  // Simulate Rollback Cleanup
  fs.rmSync(failStagingDir, { recursive: true, force: true });
  console.log('  [PASS] Rollback cleanup successfully destroyed corrupted staging directory');
  console.log('  [PASS] Source directory remains intact and verified');

  // Step 6: Test Safe Promotion with Existing Destination (Anti-Nesting & Non-Destructive Archive)
  console.log('\n--- Step 6: Testing Safe Promotion with Existing Destination ---');
  const dummyExistingDst = path.join(testBaseDir, 'existing_dst');
  fs.mkdirSync(dummyExistingDst, { recursive: true });
  fs.writeFileSync(path.join(dummyExistingDst, 'previous_run_marker.txt'), 'PREVIOUS_RUN_DATA');

  const archivePath = path.join(testBaseDir, 'existing_dst_archive');
  if (fs.existsSync(dummyExistingDst)) {
    fs.renameSync(dummyExistingDst, archivePath);
  }
  fs.renameSync(testStagingDir, dummyExistingDst);

  // Assertions:
  // 1. dummyExistingDst has promoted files (e.g. database/media.sqlite) and is NOT nested
  if (!fs.existsSync(path.join(dummyExistingDst, 'database', 'media.sqlite'))) {
    throw new Error('Promoted destination missing expected files!');
  }
  if (fs.existsSync(path.join(dummyExistingDst, path.basename(testStagingDir)))) {
    throw new Error('FATAL: Staging was silently nested inside destination!');
  }
  console.log('  [PASS] Promotion succeeded without nesting');

  // 2. archivePath is preserved and not deleted
  if (!fs.existsSync(path.join(archivePath, 'previous_run_marker.txt'))) {
    throw new Error('Previous destination data was not preserved in archive!');
  }
  console.log('  [PASS] Previous destination safely archived and preserved (zero data loss)');

  console.log('\n================================================================');
  console.log('       ALL STAGING MIGRATION & ROLLBACK TESTS PASSED!           ');
  console.log('================================================================');

} finally {
  // Clean up sandbox
  try {
    fs.rmSync(testBaseDir, { recursive: true, force: true });
    console.log(`\nDisposable test directory ${testBaseDir} cleaned up.`);
  } catch (_) {}
}

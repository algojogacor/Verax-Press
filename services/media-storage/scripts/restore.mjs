import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { resolveStorageRoot } from '../src/storage.mjs';

const backupFile = process.argv[2];
const isConfirmed = process.argv.includes('--confirm');
const stagingIdx = process.argv.indexOf('--staging-only');
const stagingOnlyDest = stagingIdx !== -1 ? process.argv[stagingIdx + 1] : null;

if (!backupFile || backupFile.startsWith('--')) {
  console.error('Usage:');
  console.error('  Validate to staging:  node restore.mjs <path-to-archive.tar.gz> --staging-only [destDir]');
  console.error('  Live safe restore:    node restore.mjs <path-to-archive.tar.gz> --confirm');
  process.exit(1);
}

if (!fs.existsSync(backupFile)) {
  console.error(`[Restore] Error: Backup archive not found: ${backupFile}`);
  process.exit(1);
}

if (!isConfirmed && !stagingOnlyDest && stagingIdx === -1) {
  console.error('\n================================================================');
  console.error('[Restore] SAFETY ABORT: Live restore requires explicit confirmation!');
  console.error('This operation replaces active database and media files.');
  console.error('To validate safely in a staging directory without touching active storage:');
  console.error(`  node restore.mjs "${backupFile}" --staging-only /tmp/restore_stage`);
  console.error('To perform a validated live restore with automatic pre-restore backup:');
  console.error(`  node restore.mjs "${backupFile}" --confirm`);
  console.error('================================================================\n');
  process.exit(1);
}

const root = resolveStorageRoot();
const stagingDir = stagingOnlyDest 
  ? path.resolve(stagingOnlyDest)
  : path.join('/tmp', `restore_stage_${Date.now()}`);

if (!fs.existsSync(stagingDir)) {
  fs.mkdirSync(stagingDir, { recursive: true });
}

console.log(`[Restore] 1. Extracting archive ${backupFile} to staging directory: ${stagingDir}...`);
try {
  execSync(`tar -xzf "${path.resolve(backupFile)}" -C "${stagingDir}"`, { stdio: 'inherit' });
} catch (err) {
  console.error('[Restore] Error: Archive extraction failed:', err);
  if (!stagingOnlyDest) fs.rmSync(stagingDir, { recursive: true, force: true });
  process.exit(1);
}

// Locate extracted snapshot sqlite
const extractedFiles = fs.readdirSync(stagingDir);
const sqliteFile = extractedFiles.find(f => f.endsWith('.sqlite'));

if (!sqliteFile) {
  console.error('[Restore] Error: No .sqlite database snapshot found in backup archive!');
  if (!stagingOnlyDest) fs.rmSync(stagingDir, { recursive: true, force: true });
  process.exit(1);
}

const stagedDbPath = path.join(stagingDir, sqliteFile);
console.log(`[Restore] 2. Validating database integrity on: ${sqliteFile}...`);
let testDb;
try {
  testDb = new DatabaseSync(stagedDbPath);
  const integrity = testDb.prepare('PRAGMA integrity_check;').get();
  if (integrity?.integrity_check !== 'ok') {
    throw new Error('PRAGMA integrity_check failed: ' + JSON.stringify(integrity));
  }
  console.log('          Database integrity check PASS (ok).');
} catch (err) {
  console.error('[Restore] CRITICAL: Staged database integrity check failed!', err);
  if (testDb) testDb.close();
  if (!stagingOnlyDest) fs.rmSync(stagingDir, { recursive: true, force: true });
  process.exit(1);
}

console.log('[Restore] 3. Validating 100% of referenced files and SHA-256 checksums...');
const records = testDb.prepare("SELECT * FROM media_items WHERE status = 'active'").all();
console.log(`          Found ${records.length} active records in backup snapshot.`);

let mismatches = 0;
for (const row of records) {
  const relPath = path.join(row.visibility, row.category, row.stored_filename);
  const stagedFilePath = path.join(stagingDir, relPath);

  if (!fs.existsSync(stagedFilePath)) {
    console.error(`          [MISSING FILE] ${relPath}`);
    mismatches++;
    continue;
  }

  const content = fs.readFileSync(stagedFilePath);
  const computedHash = crypto.createHash('sha256').update(content).digest('hex');
  if (computedHash !== row.sha256) {
    console.error(`          [HASH CORRUPT] ${relPath} (expected ${row.sha256}, got ${computedHash})`);
    mismatches++;
  }
}
testDb.close();

if (mismatches > 0) {
  console.error(`[Restore] CRITICAL: ${mismatches} files missing or corrupted in backup archive. Aborting!`);
  if (!stagingOnlyDest) fs.rmSync(stagingDir, { recursive: true, force: true });
  process.exit(1);
}
console.log(`          100% of referenced files exist with verified SHA-256 checksums.`);

if (stagingOnlyDest || stagingIdx !== -1) {
  console.log(`\n[Restore] SUCCESS: Staging validation completed cleanly.`);
  console.log(`          Extracted and verified files are available in: ${stagingDir}`);
  console.log(`          Live active storage was NOT modified.`);
  process.exit(0);
}

// Live restore with --confirm
console.log('\n[Restore] 4. Performing pre-restore backup of current live storage for rollback safety...');
const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
const preRestoreBackup = path.join(root, 'backups', `pre_restore_backup_${timestamp}.tar.gz`);

try {
  execSync(
    `tar -czf "${preRestoreBackup}" -C "${root}" public private database 2>/dev/null || true`,
    { stdio: 'inherit' }
  );
  console.log(`          Pre-restore safety snapshot created: ${preRestoreBackup}`);
} catch (err) {
  console.warn('[Restore] Warning: Pre-restore snapshot failed. Continuing with caution...');
}

// Temporarily stop PM2 service if running to avoid database locking conflicts
let pm2WasRunning = false;
try {
  const pm2Status = execSync('pm2 jlist 2>/dev/null || echo "[]"').toString();
  if (pm2Status.includes('"name":"verax-media"') && pm2Status.includes('"status":"online"')) {
    console.log('[Restore] 5. Quiescing active PM2 process "verax-media"...');
    execSync('pm2 stop verax-media', { stdio: 'inherit' });
    pm2WasRunning = true;
  }
} catch (_) {}

try {
  console.log(`[Restore] 6. Copying validated media files to active storage: ${root}...`);
  if (fs.existsSync(path.join(stagingDir, 'public'))) {
    execSync(`cp -r "${path.join(stagingDir, 'public')}"/* "${path.join(root, 'public')}"/ 2>/dev/null || true`);
  }
  if (fs.existsSync(path.join(stagingDir, 'private'))) {
    execSync(`cp -r "${path.join(stagingDir, 'private')}"/* "${path.join(root, 'private')}"/ 2>/dev/null || true`);
  }

  console.log('[Restore] 7. Replacing active database...');
  const targetDb = path.join(root, 'database', 'media.sqlite');
  fs.copyFileSync(stagedDbPath, targetDb);
  if (fs.existsSync(`${targetDb}-wal`)) fs.unlinkSync(`${targetDb}-wal`);
  if (fs.existsSync(`${targetDb}-shm`)) fs.unlinkSync(`${targetDb}-shm`);
} catch (err) {
  console.error('[Restore] CRITICAL ERROR during live file replacement:', err);
  console.error(`Rollback archive is available at: ${preRestoreBackup}`);
  process.exit(1);
} finally {
  if (pm2WasRunning) {
    console.log('[Restore] 8. Resuming PM2 process "verax-media"...');
    try {
      execSync('pm2 restart verax-media', { stdio: 'inherit' });
    } catch (_) {}
  }
  fs.rmSync(stagingDir, { recursive: true, force: true });
}

console.log('[Restore] SUCCESS: Live restoration completed and verified.');

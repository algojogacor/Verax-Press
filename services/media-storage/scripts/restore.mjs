import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { resolveStorageRoot } from '../src/storage.mjs';

const backupFile = process.argv[2];
if (!backupFile) {
  console.error('Usage: node restore.mjs <path-to-verax_media_backup_*.tar.gz>');
  process.exit(1);
}

if (!fs.existsSync(backupFile)) {
  console.error(`Error: Backup file not found: ${backupFile}`);
  process.exit(1);
}

const root = resolveStorageRoot();
const stagingDir = path.join(root, 'tmp', `restore_stage_${Date.now()}`);
fs.mkdirSync(stagingDir, { recursive: true });

console.log(`[Restore] Extracting ${backupFile} to staging area...`);
execSync(`tar -xzf "${path.resolve(backupFile)}" -C "${stagingDir}"`, { stdio: 'inherit' });

// Locate extracted snapshot sqlite
const extractedFiles = fs.readdirSync(stagingDir);
const sqliteFile = extractedFiles.find(f => f.endsWith('.sqlite'));

if (!sqliteFile) {
  console.error('[Restore] Error: No .sqlite database found in backup archive!');
  fs.rmSync(stagingDir, { recursive: true, force: true });
  process.exit(1);
}

const stagedDbPath = path.join(stagingDir, sqliteFile);
console.log(`[Restore] Verifying database integrity: ${stagedDbPath}...`);
const testDb = new DatabaseSync(stagedDbPath);
const integrity = testDb.prepare('PRAGMA integrity_check;').get();
testDb.close();

if (integrity?.integrity_check !== 'ok') {
  console.error(`[Restore] Error: Database integrity check failed! Result:`, integrity);
  fs.rmSync(stagingDir, { recursive: true, force: true });
  process.exit(1);
}

console.log(`[Restore] Database integrity check PASS (ok). Restoring files to ${root}...`);

// Restore public and private folders
if (fs.existsSync(path.join(stagingDir, 'public'))) {
  execSync(`cp -r "${path.join(stagingDir, 'public')}"/* "${path.join(root, 'public')}"/ 2>/dev/null || true`);
}
if (fs.existsSync(path.join(stagingDir, 'private'))) {
  execSync(`cp -r "${path.join(stagingDir, 'private')}"/* "${path.join(root, 'private')}"/ 2>/dev/null || true`);
}

// Restore database
const targetDb = path.join(root, 'database', 'media.sqlite');
fs.copyFileSync(stagedDbPath, targetDb);
// Remove wal and shm files so database opens fresh
if (fs.existsSync(`${targetDb}-wal`)) fs.unlinkSync(`${targetDb}-wal`);
if (fs.existsSync(`${targetDb}-shm`)) fs.unlinkSync(`${targetDb}-shm`);

fs.rmSync(stagingDir, { recursive: true, force: true });
console.log(`[Restore] Restoration completed successfully.`);

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { resolveStorageRoot } from '../src/storage.mjs';
import { backupDatabase } from '../src/db.mjs';

const root = resolveStorageRoot();
const backupsDir = path.join(root, 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
const tempDbSnapshot = path.join(backupsDir, `snapshot_${timestamp}.sqlite`);

console.log(`[Backup] Starting online SQLite backup...`);
backupDatabase(tempDbSnapshot);
console.log(`[Backup] SQLite online snapshot saved to: ${tempDbSnapshot}`);

const tarballPath = path.join(backupsDir, `verax_media_backup_${timestamp}.tar.gz`);
console.log(`[Backup] Archiving media files and snapshot to: ${tarballPath}`);

try {
  // Archive snapshot and storage dirs
  execSync(
    `tar -czf "${tarballPath}" -C "${root}" public private -C "${backupsDir}" "snapshot_${timestamp}.sqlite"`,
    { stdio: 'inherit' }
  );
  // Remove temporary uncompressed sqlite snapshot
  if (fs.existsSync(tempDbSnapshot)) {
    fs.unlinkSync(tempDbSnapshot);
  }
} catch (err) {
  console.error(`[Backup] Archive creation failed:`, err);
  process.exit(1);
}

const stat = fs.statSync(tarballPath);
console.log(`[Backup] SUCCESS! Created ${tarballPath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);

// Retention cleanup: retain last 7 backups or max 7 days
console.log(`[Backup] Checking retention policy (max 7 backups)...`);
const files = fs.readdirSync(backupsDir)
  .filter(f => f.startsWith('verax_media_backup_') && f.endsWith('.tar.gz'))
  .map(f => ({ name: f, path: path.join(backupsDir, f), mtime: fs.statSync(path.join(backupsDir, f)).mtime }))
  .sort((a, b) => b.mtime - a.mtime);

if (files.length > 7) {
  for (const oldFile of files.slice(7)) {
    console.log(`[Backup] Pruning old backup archive: ${oldFile.name}`);
    fs.unlinkSync(oldFile.path);
  }
}
console.log(`[Backup] Backup routine completed cleanly.`);

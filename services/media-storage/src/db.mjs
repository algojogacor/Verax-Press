import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { resolveStorageRoot } from './storage.mjs';

let dbInstance = null;
let dbFilePath = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  const root = resolveStorageRoot();
  const dbDir = path.join(root, 'database');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true, mode: 0o700 });
  }

  dbFilePath = path.join(dbDir, 'media.sqlite');
  dbInstance = new DatabaseSync(dbFilePath);

  // Performance and durability settings
  dbInstance.exec('PRAGMA journal_mode = WAL;');
  dbInstance.exec('PRAGMA synchronous = NORMAL;');
  dbInstance.exec('PRAGMA foreign_keys = ON;');
  dbInstance.exec('PRAGMA busy_timeout = 5000;');

  // Initialize schema
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS media_items (
      id TEXT PRIMARY KEY,
      original_filename TEXT NOT NULL,
      stored_filename TEXT NOT NULL UNIQUE,
      storage_path TEXT NOT NULL,
      visibility TEXT CHECK(visibility IN ('public', 'private')) NOT NULL,
      category TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_extension TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      sha256 TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      uploaded_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      status TEXT CHECK(status IN ('active', 'quarantined', 'deleted')) DEFAULT 'active',
      deleted_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_media_visibility_cat ON media_items(visibility, category, status);
    CREATE INDEX IF NOT EXISTS idx_media_sha256 ON media_items(sha256);
    CREATE INDEX IF NOT EXISTS idx_media_status ON media_items(status);
  `);

  return dbInstance;
}

export function insertMediaRecord(record) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO media_items (
      id, original_filename, stored_filename, storage_path,
      visibility, category, mime_type, file_extension,
      file_size, sha256, width, height, uploaded_by,
      created_at, updated_at, status
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, 'active'
    )
  `);

  const now = new Date().toISOString();
  stmt.run(
    record.id,
    record.original_filename,
    record.stored_filename,
    record.storage_path,
    record.visibility,
    record.category,
    record.mime_type,
    record.file_extension,
    record.file_size,
    record.sha256,
    record.width ?? null,
    record.height ?? null,
    record.uploaded_by,
    now,
    now
  );

  return getMediaRecordById(record.id);
}

export function getMediaRecordById(id) {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM media_items WHERE id = ?`);
  return stmt.get(id);
}

export function getMediaRecordByStoredFilename(storedFilename) {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM media_items WHERE stored_filename = ?`);
  return stmt.get(storedFilename);
}

export function softDeleteMediaRecord(id) {
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE media_items
    SET status = 'quarantined', deleted_at = ?, updated_at = ?
    WHERE id = ? AND status = 'active'
  `);
  const result = stmt.run(now, now, id);
  return result.changes > 0;
}

export function getMediaStats() {
  const db = getDb();
  const countRow = db.prepare(`
    SELECT 
      COUNT(*) AS total_items,
      SUM(CASE WHEN visibility = 'public' AND status = 'active' THEN 1 ELSE 0 END) AS active_public,
      SUM(CASE WHEN visibility = 'private' AND status = 'active' THEN 1 ELSE 0 END) AS active_private,
      SUM(CASE WHEN status != 'active' THEN 1 ELSE 0 END) AS quarantined_items,
      TOTAL(file_size) AS total_file_bytes
    FROM media_items
  `).get();

  return countRow;
}

export function backupDatabase(destPath) {
  const db = getDb();
  // Using VACUUM INTO for atomic online consistent backup in WAL mode
  const sanitizedDest = path.resolve(destPath);
  if (fs.existsSync(sanitizedDest)) {
    fs.unlinkSync(sanitizedDest);
  }
  // SQLite VACUUM INTO safely creates a consistent standalone copy without lock issues
  db.exec(`VACUUM INTO '${sanitizedDest.replace(/'/g, "''")}';`);
  return sanitizedDest;
}

import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.mjs';

let activeStorageRoot = null;

export function resolveStorageRoot() {
  if (activeStorageRoot) return activeStorageRoot;

  const primary = config.storageRoot;
  try {
    if (!fs.existsSync(primary)) {
      fs.mkdirSync(primary, { recursive: true });
    }
    fs.accessSync(primary, fs.constants.R_OK | fs.constants.W_OK);
    activeStorageRoot = primary;
    return activeStorageRoot;
  } catch (err) {
    // Fall back to user home directory storage
    const fallback = config.fallbackStorageRoot;
    if (!fs.existsSync(fallback)) {
      fs.mkdirSync(fallback, { recursive: true });
    }
    fs.accessSync(fallback, fs.constants.R_OK | fs.constants.W_OK);
    activeStorageRoot = fallback;
    return activeStorageRoot;
  }
}

export function initStorageTree() {
  const root = resolveStorageRoot();
  const subdirs = [
    'public/articles',
    'public/thumbnails',
    'public/infographics',
    'private/drafts',
    'private/editorial',
    'private/documents',
    'database',
    'backups',
    'logs',
    'quarantine',
    'tmp'
  ];

  for (const dir of subdirs) {
    const fullPath = path.join(root, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true, mode: 0o750 });
    }
  }

  return root;
}

export function getSafeFilePath(visibility, category, filename) {
  const root = resolveStorageRoot();
  
  if (visibility !== 'public' && visibility !== 'private') {
    throw new Error('Invalid visibility');
  }

  const validCategories = config.categories[visibility];
  if (!validCategories || !validCategories.includes(category)) {
    throw new Error(`Invalid category "${category}" for visibility "${visibility}"`);
  }

  // Prevent path traversal in filename
  const sanitizedFilename = path.basename(filename);
  if (!sanitizedFilename || sanitizedFilename !== filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new Error('Path traversal attempt detected in filename');
  }

  const targetDir = path.join(root, visibility, category);
  const targetPath = path.join(targetDir, sanitizedFilename);

  // Assert targetPath is strictly inside targetDir
  const rel = path.relative(targetDir, targetPath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Path traversal assertion failed');
  }

  return targetPath;
}

export function getStorageStats() {
  const root = resolveStorageRoot();
  
  function getDirSize(dir) {
    let size = 0;
    if (!fs.existsSync(dir)) return 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        size += getDirSize(full);
      } else if (entry.isFile()) {
        try {
          size += fs.statSync(full).size;
        } catch (_) {}
      }
    }
    return size;
  }

  const usedBytes = getDirSize(root);
  const quotaBytes = config.quotaBytes;
  const freeBytes = Math.max(0, quotaBytes - usedBytes);

  return {
    storageRoot: root,
    usedBytes,
    quotaBytes,
    freeBytes,
    usagePercent: ((usedBytes / quotaBytes) * 100).toFixed(2),
  };
}

export function checkQuotaAvailable(additionalBytes = 0) {
  const stats = getStorageStats();
  if (stats.usedBytes + additionalBytes > stats.quotaBytes) {
    const err = new Error(`Storage quota exceeded. Used: ${stats.usedBytes} bytes, Quota: ${stats.quotaBytes} bytes`);
    err.code = 'QUOTA_EXCEEDED';
    err.statusCode = 507;
    throw err;
  }
}

export function moveToQuarantine(currentPath, storedFilename) {
  const root = resolveStorageRoot();
  const quarantineDir = path.join(root, 'quarantine');
  if (!fs.existsSync(quarantineDir)) {
    fs.mkdirSync(quarantineDir, { recursive: true, mode: 0o700 });
  }

  const destination = path.join(quarantineDir, `${Date.now()}_${path.basename(storedFilename)}`);
  if (fs.existsSync(currentPath)) {
    fs.renameSync(currentPath, destination);
  }
  return destination;
}

export function cleanupStaleTempFiles(maxAgeMs = 15 * 60 * 1000) {
  const root = resolveStorageRoot();
  const tmpDir = path.join(root, 'tmp');
  if (!fs.existsSync(tmpDir)) return 0;

  const now = Date.now();
  let cleaned = 0;
  try {
    const entries = fs.readdirSync(tmpDir);
    for (const entry of entries) {
      if (entry.startsWith('upload_') && entry.endsWith('.tmp')) {
        const fullPath = path.join(tmpDir, entry);
        try {
          const stat = fs.statSync(fullPath);
          if (now - stat.mtimeMs > maxAgeMs) {
            fs.unlinkSync(fullPath);
            cleaned++;
          }
        } catch (_) {}
      }
    }
  } catch (_) {}
  return cleaned;
}

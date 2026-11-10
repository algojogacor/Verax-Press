import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Load .env file automatically from service directory or cwd if present
try {
  const serviceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const serviceEnv = path.join(serviceDir, '.env');
  if (fs.existsSync(serviceEnv)) {
    process.loadEnvFile(serviceEnv);
  } else {
    process.loadEnvFile();
  }
} catch (_) {}

// Read environment variables or load defaults
export const config = {
  port: parseInt(process.env.MEDIA_PORT || '4188', 10),
  host: process.env.MEDIA_HOST || '127.0.0.1',
  
  // Storage paths
  storageRoot: process.env.MEDIA_STORAGE_ROOT || '/var/lib/verax/media',
  fallbackStorageRoot: path.join(process.env.HOME || '/home/azureuser', 'verax-media-data'),
  
  // Storage Quota: 10 GB limit (in bytes)
  quotaBytes: parseInt(process.env.MEDIA_QUOTA_BYTES || String(10 * 1024 * 1024 * 1024), 10),
  
  // Max individual upload: 10 MB (in bytes)
  maxFileSize: parseInt(process.env.MEDIA_MAX_FILE_SIZE || String(10 * 1024 * 1024), 10),
  
  // Allowed image MIME types
  allowedMimes: ['image/jpeg', 'image/png', 'image/webp'],
  
  // Allowed categories
  categories: {
    public: ['articles', 'thumbnails', 'infographics'],
    private: ['drafts', 'editorial', 'documents'],
  },
  
  // HMAC secret for authenticated operations (must be set; fails closed if missing)
  hmacSecret: (() => {
    const secret = process.env.MEDIA_HMAC_SECRET || process.env.VERAX_MEDIA_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === 'production' || process.env.REQUIRE_MEDIA_SECRET === 'true') {
        throw new Error('FATAL CONFIGURATION ERROR: MEDIA_HMAC_SECRET or VERAX_MEDIA_SECRET environment variable is required and missing.');
      }
    }
    return secret || '';
  })(),
  
  // Allowed CORS origins
  corsOrigins: (process.env.MEDIA_CORS_ORIGINS || 'https://verax.aryariap.my.id,https://verax-press.vercel.app,http://localhost:3000')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
    
  publicBaseUrl: process.env.MEDIA_PUBLIC_BASE_URL || 'https://media.aryariap.my.id/public',
};

import path from 'node:path';
import crypto from 'node:crypto';

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
  
  // HMAC secret for authenticated operations (must be set in production)
  hmacSecret: process.env.MEDIA_HMAC_SECRET || 'verax_media_secret_change_me_in_production_f7a8b9c0d1e2f3',
  
  // Allowed CORS origins
  corsOrigins: (process.env.MEDIA_CORS_ORIGINS || 'https://verax.aryariap.my.id,https://verax-press.vercel.app,http://localhost:3000')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
    
  publicBaseUrl: process.env.MEDIA_PUBLIC_BASE_URL || 'https://media.aryariap.my.id/public',
};

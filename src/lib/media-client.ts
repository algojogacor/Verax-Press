// Verax Press Media Storage Client (Server-to-Server HMAC Authenticated)
// Connects Verax (Vercel) to the persistent Media Storage Service on Azure VM.
import crypto from 'node:crypto';

export interface UploadMediaParams {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  visibility?: 'public' | 'private';
  category?: 'articles' | 'thumbnails' | 'infographics' | 'drafts' | 'editorial' | 'documents';
  uploadedBy: string;
}

export interface UploadMediaResult {
  id: string;
  storedFilename: string;
  originalFilename: string;
  visibility: string;
  category: string;
  mimeType: string;
  fileExtension: string;
  fileSize: number;
  sha256: string;
  width: number | null;
  height: number | null;
  publicUrl: string | null;
  createdAt: string;
}

function getMediaConfig() {
  const apiUrl = process.env.VERAX_MEDIA_API_URL || 'https://media.aryariap.my.id';
  const secret = process.env.VERAX_MEDIA_SECRET || 'vx_media_prod_sec_2026_d3f9e2a1b7c8e4f501a2b3c4d5e6f7a8';
  return { apiUrl, secret };
}

export function generateMediaAuthHeaders(options: {
  action: 'upload' | 'download' | 'delete';
  uploadedBy?: string;
  visibility?: 'public' | 'private';
  category?: string;
  ttlMs?: number;
}) {
  const { secret } = getMediaConfig();
  const now = Date.now();
  const payload = {
    action: options.action,
    timestamp: now,
    expiresAt: now + (options.ttlMs || 300_000), // 5 minutes valid
    uploadedBy: options.uploadedBy || 'system',
    visibility: options.visibility || 'public',
    category: options.category || 'articles',
  };

  const rawPayload = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(rawPayload)
    .digest('hex');

  return {
    'X-Media-Auth-Signature': signature,
    'X-Media-Auth-Payload': rawPayload,
  };
}

export async function uploadToMediaStorage(params: UploadMediaParams): Promise<UploadMediaResult> {
  const { apiUrl } = getMediaConfig();
  const authHeaders = generateMediaAuthHeaders({
    action: 'upload',
    uploadedBy: params.uploadedBy,
    visibility: params.visibility || 'public',
    category: params.category || 'articles',
  });

  const boundary = `----VeraxMediaBoundary${crypto.randomBytes(8).toString('hex')}`;
  const head = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${params.filename}"\r\n` +
    `Content-Type: ${params.mimeType}\r\n\r\n`
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([head, params.buffer, tail]);

  const endpoint = `${apiUrl.replace(/\/$/, '')}/api/v1/media/upload`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      ...authHeaders,
    },
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Media storage upload failed with HTTP ${res.status}`);
  }

  return data as UploadMediaResult;
}

export async function deleteFromMediaStorage(id: string): Promise<void> {
  const { apiUrl } = getMediaConfig();
  const authHeaders = generateMediaAuthHeaders({
    action: 'delete',
  });

  const endpoint = `${apiUrl.replace(/\/$/, '')}/api/v1/media/${encodeURIComponent(id)}`;
  const res = await fetch(endpoint, {
    method: 'DELETE',
    headers: {
      ...authHeaders,
    },
  });

  if (!res.ok && res.status !== 404) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || `Media deletion failed with HTTP ${res.status}`);
  }
}

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

export function isMediaConfigured(): boolean {
  return Boolean(process.env.VERAX_MEDIA_API_URL && process.env.VERAX_MEDIA_SECRET);
}

function getMediaConfig() {
  const apiUrl = process.env.VERAX_MEDIA_API_URL;
  const secret = process.env.VERAX_MEDIA_SECRET;
  if (!apiUrl || !secret) {
    throw new Error('VERAX_MEDIA_API_URL and VERAX_MEDIA_SECRET must be configured');
  }
  return { apiUrl: apiUrl.replace(/\/$/, ''), secret };
}

export function generateMediaAuthHeaders(options: {
  method: 'POST' | 'GET' | 'DELETE' | 'HEAD';
  path: string;
  action: 'upload' | 'download' | 'delete' | 'metadata';
  resourceId?: string | null;
  uploadedBy?: string;
  visibility?: 'public' | 'private';
  category?: string;
  ttlMs?: number;
}) {
  const { secret } = getMediaConfig();
  const now = Date.now();
  const nonce = crypto.randomUUID();
  const canonicalPath = options.path.split('?')[0].replace(/\/+$/, '') || '/';

  const payload = {
    method: options.method.toUpperCase(),
    path: canonicalPath,
    action: options.action,
    resourceId: options.resourceId ? String(options.resourceId) : null,
    timestamp: now,
    expiresAt: now + (options.ttlMs || 300_000), // 5 minutes valid
    nonce,
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
  const path = '/api/v1/media/upload';
  const authHeaders = generateMediaAuthHeaders({
    method: 'POST',
    path,
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

  const endpoint = `${apiUrl}${path}`;
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

export async function deleteFromMediaStorage(id: string, uploadedBy: string = 'system'): Promise<void> {
  const { apiUrl } = getMediaConfig();
  const path = `/api/v1/media/${encodeURIComponent(id)}`;
  const authHeaders = generateMediaAuthHeaders({
    method: 'DELETE',
    path,
    action: 'delete',
    resourceId: id,
    uploadedBy,
  });

  const endpoint = `${apiUrl}${path}`;
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

export async function getMediaMetadata(id: string): Promise<UploadMediaResult> {
  const { apiUrl } = getMediaConfig();
  const path = `/api/v1/media/${encodeURIComponent(id)}`;
  const authHeaders = generateMediaAuthHeaders({
    method: 'GET',
    path,
    action: 'metadata',
    resourceId: id,
  });

  const endpoint = `${apiUrl}${path}`;
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      ...authHeaders,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Media metadata request failed with HTTP ${res.status}`);
  }

  return data as UploadMediaResult;
}

export async function fetchPrivateMediaStream(id: string): Promise<Response> {
  const { apiUrl } = getMediaConfig();
  const path = `/api/v1/media/${encodeURIComponent(id)}/file`;
  const authHeaders = generateMediaAuthHeaders({
    method: 'GET',
    path,
    action: 'download',
    resourceId: id,
  });

  const endpoint = `${apiUrl}${path}`;
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      ...authHeaders,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch private media file with HTTP ${res.status}`);
  }

  return res;
}

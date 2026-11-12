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

const INVISIBLE_ENV_CHARS_RE = /[\uFEFF\u200B-\u200D\u2060]/g;
const REQUEST_TIMEOUT_MS = 30_000;

function sanitizeEnvValue(raw: string | undefined): string {
  return (raw ?? "").replace(INVISIBLE_ENV_CHARS_RE, "").trim();
}

export function isMediaConfigured(): boolean {
  return Boolean(
    sanitizeEnvValue(process.env.VERAX_MEDIA_API_URL) &&
      sanitizeEnvValue(process.env.VERAX_MEDIA_SECRET),
  );
}

function getMediaConfig() {
  const apiUrl = sanitizeEnvValue(process.env.VERAX_MEDIA_API_URL).replace(/\/+$/, "");
  const secret = sanitizeEnvValue(process.env.VERAX_MEDIA_SECRET);
  if (!apiUrl || !secret) {
    throw new Error('VERAX_MEDIA_API_URL and VERAX_MEDIA_SECRET must be configured');
  }
  try {
    const parsed = new URL(apiUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Unsupported protocol: ${parsed.protocol}`);
    }
  } catch (err) {
    throw new Error(
      `VERAX_MEDIA_API_URL is invalid (${err instanceof Error ? err.message : 'parse error'})`,
    );
  }
  return { apiUrl, secret };
}

async function readJsonSafe(res: Response): Promise<Record<string, unknown> | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
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

  const safeFilename = params.filename.replace(/[\r\n"\\]/g, '_');
  const boundary = `----VeraxMediaBoundary${crypto.randomBytes(8).toString('hex')}`;
  const head = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${safeFilename}"\r\n` +
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
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const data = await readJsonSafe(res);
  if (!res.ok) {
    const remoteError = typeof data?.error === 'string' ? data.error : null;
    throw new Error(remoteError || `Media storage upload failed with HTTP ${res.status}`);
  }
  if (!data) {
    throw new Error(`Media storage returned empty or non-JSON response (HTTP ${res.status})`);
  }

  return data as unknown as UploadMediaResult;
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

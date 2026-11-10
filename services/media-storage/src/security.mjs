import crypto from 'node:crypto';
import { config } from './config.mjs';

export function verifyHmacAuth(req) {
  const signature = req.headers['x-media-auth-signature'];
  const rawPayload = req.headers['x-media-auth-payload'];

  if (!signature || !rawPayload) {
    return {
      authorized: false,
      error: 'Missing required authentication headers (X-Media-Auth-Signature, X-Media-Auth-Payload)',
      statusCode: 401,
    };
  }

  let payload;
  try {
    payload = JSON.parse(rawPayload);
  } catch {
    return {
      authorized: false,
      error: 'Invalid authentication payload JSON',
      statusCode: 400,
    };
  }

  const { action, timestamp, expiresAt, uploadedBy } = payload;
  if (!action || !timestamp || !expiresAt) {
    return {
      authorized: false,
      error: 'Authentication payload missing required fields (action, timestamp, expiresAt)',
      statusCode: 400,
    };
  }

  const now = Date.now();
  if (now > expiresAt) {
    return {
      authorized: false,
      error: 'Upload authorization signature has expired',
      statusCode: 401,
    };
  }

  // Allow max 5 minutes backward clock drift
  if (timestamp > now + 60_000 || timestamp < now - 300_000) {
    return {
      authorized: false,
      error: 'Authorization timestamp out of valid window',
      statusCode: 401,
    };
  }

  // Compute expected HMAC
  const expectedHmac = crypto
    .createHmac('sha256', config.hmacSecret)
    .update(rawPayload)
    .digest('hex');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expBuf = Buffer.from(expectedHmac, 'utf8');

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return {
      authorized: false,
      error: 'Invalid authentication signature',
      statusCode: 403,
    };
  }

  return {
    authorized: true,
    payload,
  };
}

export function generateUploadAuth({ action = 'upload', uploadedBy = 'system', visibility = 'public', category = 'articles', ttlMs = 300_000, secret = config.hmacSecret }) {
  const now = Date.now();
  const payload = {
    action,
    timestamp: now,
    expiresAt: now + ttlMs,
    uploadedBy,
    visibility,
    category,
  };
  const rawPayload = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(rawPayload)
    .digest('hex');

  return {
    signature,
    payload: rawPayload,
  };
}

export function applyCors(req, res) {
  const origin = req.headers['origin'];
  if (origin && config.corsOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Media-Auth-Signature, X-Media-Auth-Payload, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
}

import crypto from 'node:crypto';
import { config } from './config.mjs';
import { consumeNonce } from './db.mjs';

function normalizeCanonicalPath(p) {
  if (!p) return '/';
  const clean = p.split('?')[0].replace(/\/+$/, '');
  return clean === '' ? '/' : clean;
}

export function verifyHmacAuth(req, expectedScope = {}) {
  if (!config.hmacSecret) {
    return {
      authorized: false,
      error: 'Media service HMAC secret is not configured',
      statusCode: 500,
    };
  }

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

  const { method, path: signedPath, action, timestamp, expiresAt, nonce } = payload;
  if (!method || !signedPath || !action || !timestamp || !expiresAt || !nonce) {
    return {
      authorized: false,
      error: 'Authentication payload missing required scope fields (method, path, action, timestamp, expiresAt, nonce)',
      statusCode: 400,
    };
  }

  const now = Date.now();
  if (now > expiresAt) {
    return {
      authorized: false,
      error: 'Authorization signature has expired',
      statusCode: 401,
    };
  }

  // Allow max 5 minutes backward clock drift, max 1 minute future drift
  if (timestamp > now + 60_000 || timestamp < now - 300_000) {
    return {
      authorized: false,
      error: 'Authorization timestamp out of valid window',
      statusCode: 401,
    };
  }

  // Verify HMAC signature in constant time
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

  // Cryptographically Bound Scope Verification:
  // 1. Method verification
  const reqMethod = (req.method || 'GET').toUpperCase();
  const signedMethod = method.toUpperCase();
  if (reqMethod !== signedMethod) {
    return {
      authorized: false,
      error: `HTTP method mismatch: signature bound to ${signedMethod}, actual request is ${reqMethod}`,
      statusCode: 403,
    };
  }
  if (expectedScope.method && expectedScope.method.toUpperCase() !== signedMethod) {
    return {
      authorized: false,
      error: `HTTP method not authorized for this operation: expected ${expectedScope.method.toUpperCase()}`,
      statusCode: 403,
    };
  }

  // 2. Action verification
  if (expectedScope.action && expectedScope.action !== action) {
    return {
      authorized: false,
      error: `Action mismatch: signature bound to action '${action}', expected '${expectedScope.action}'`,
      statusCode: 403,
    };
  }

  // 3. Canonical path verification
  const reqPath = normalizeCanonicalPath(req.url);
  const normSignedPath = normalizeCanonicalPath(signedPath);
  if (reqPath !== normSignedPath) {
    return {
      authorized: false,
      error: `Request path mismatch: signature bound to '${normSignedPath}', actual request is '${reqPath}'`,
      statusCode: 403,
    };
  }
  if (expectedScope.path) {
    const normExpectedPath = normalizeCanonicalPath(expectedScope.path);
    if (normSignedPath !== normExpectedPath) {
      return {
        authorized: false,
        error: `Scope path mismatch: expected '${normExpectedPath}', signature has '${normSignedPath}'`,
        statusCode: 403,
      };
    }
  }

  // 4. Resource ID verification (when applicable)
  if (expectedScope.resourceId !== undefined && expectedScope.resourceId !== null) {
    const signedResourceId = payload.resourceId ? String(payload.resourceId) : '';
    const expectedResourceId = String(expectedScope.resourceId);
    if (signedResourceId !== expectedResourceId) {
      return {
        authorized: false,
        error: `Resource ID mismatch: signature bound to media '${signedResourceId || 'none'}', expected '${expectedResourceId}'`,
        statusCode: 403,
      };
    }
  }

  // 5. One-time Nonce consumption (Replay protection)
  const consumed = consumeNonce(nonce, action, expiresAt);
  if (!consumed) {
    return {
      authorized: false,
      error: 'Authentication nonce has already been consumed (replay attack prevented)',
      statusCode: 401,
    };
  }

  return {
    authorized: true,
    payload,
  };
}

export function generateAuthHeaders({
  method,
  path: reqPath,
  action = 'upload',
  resourceId = null,
  uploadedBy = 'system',
  visibility = 'public',
  category = 'articles',
  ttlMs = 300_000,
  secret = config.hmacSecret,
}) {
  if (!secret) {
    throw new Error('HMAC secret is required to generate authentication headers');
  }
  if (!method || !reqPath || !action) {
    throw new Error('method, path, and action are mandatory to generate scoped auth headers');
  }

  const now = Date.now();
  const canonicalPath = normalizeCanonicalPath(reqPath);
  const payload = {
    method: method.toUpperCase(),
    path: canonicalPath,
    action,
    resourceId: resourceId ? String(resourceId) : null,
    timestamp: now,
    expiresAt: now + ttlMs,
    nonce: crypto.randomUUID(),
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
    'X-Media-Auth-Signature': signature,
    'X-Media-Auth-Payload': rawPayload,
  };
}

// Backward-compatible alias for existing test helpers
export function generateUploadAuth(options = {}) {
  return generateAuthHeaders({
    method: 'POST',
    path: '/api/v1/media/upload',
    action: options.action || 'upload',
    resourceId: options.resourceId || null,
    uploadedBy: options.uploadedBy || 'system',
    visibility: options.visibility || 'public',
    category: options.category || 'articles',
    ttlMs: options.ttlMs || 300_000,
    secret: options.secret || config.hmacSecret,
  });
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

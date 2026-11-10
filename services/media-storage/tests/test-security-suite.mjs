import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { generateAuthHeaders } from '../src/security.mjs';
import { config } from '../src/config.mjs';

const PORT = 4188;

function makeRequest({ method = 'GET', path: reqPath, headers = {}, body = null }) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port: PORT,
        path: reqPath,
        method,
        headers: {
          Connection: 'close',
          ...headers,
        },
        agent: false,
      },
      (res) => {
        let chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString();
          let json = null;
          try { json = JSON.parse(raw); } catch (_) {}
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: raw,
            json,
          });
        });
      }
    );
    req.on('error', (err) => resolve({ error: err.message }));
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

function createMultipartBody(filename, mimeType, fileBuffer) {
  const boundary = `----AuditBoundary${crypto.randomBytes(8).toString('hex')}`;
  const head = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: Buffer.concat([head, fileBuffer, tail]),
  };
}

const TINY_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
  'hex'
);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('   VERAX MEDIA STORAGE: COMPREHENSIVE SECURITY AUDIT SUITE      ');
  console.log('================================================================\n');

  // 1. Health check
  console.log('--- 1. Service Health & Storage Root ---');
  const health = await makeRequest({ method: 'GET', path: '/health' });
  assert(health.statusCode === 200, 'Health endpoint responds with HTTP 200');
  assert(health.json?.status === 'ok', 'Service status is ok');
  assert(health.json?.database === 'ok', 'Database is ok and reachable');

  // 2. Legitimate Upload with Scoped HMAC
  console.log('\n--- 2. Scoped HMAC Legitimate Upload ---');
  const uploadAuth = generateAuthHeaders({
    method: 'POST',
    path: '/api/v1/media/upload',
    action: 'upload',
    uploadedBy: 'sec-tester',
    visibility: 'public',
    category: 'articles',
  });
  const uploadData = createMultipartBody('test-scoped.png', 'image/png', TINY_PNG);
  const uploadRes = await makeRequest({
    method: 'POST',
    path: '/api/v1/media/upload',
    headers: {
      'Content-Type': uploadData.contentType,
      ...uploadAuth,
    },
    body: uploadData.body,
  });

  assert(uploadRes.statusCode === 201, `Upload succeeds with valid scoped HMAC (HTTP ${uploadRes.statusCode}): ${uploadRes.body}`);
  assert(Boolean(uploadRes.json?.id), 'Upload returned media ID');
  const testMediaId = uploadRes.json?.id;

  // 3. Method Substitution Attack
  console.log('\n--- 3. Method Substitution Attack ---');
  // Attempt to use upload authorization signature (POST) to perform a DELETE request
  const methodAttackAuth = generateAuthHeaders({
    method: 'POST',
    path: '/api/v1/media/upload',
    action: 'upload',
  });
  const methodAttackRes = await makeRequest({
    method: 'DELETE',
    path: `/api/v1/media/${testMediaId}`,
    headers: methodAttackAuth,
  });
  assert(
    methodAttackRes.statusCode === 403,
    `Method substitution attack rejected: expected HTTP 403, got ${methodAttackRes.statusCode}`
  );

  // 4. Path Substitution Attack
  console.log('\n--- 4. Path Substitution Attack ---');
  // Generate auth for /api/v1/media/upload but send to /api/v1/media/<id>
  const pathAttackAuth = generateAuthHeaders({
    method: 'POST',
    path: '/api/v1/media/upload',
    action: 'upload',
  });
  const pathAttackRes = await makeRequest({
    method: 'POST',
    path: `/api/v1/media/${testMediaId}`,
    headers: pathAttackAuth,
  });
  assert(
    pathAttackRes.statusCode === 403 || pathAttackRes.statusCode === 404,
    `Path substitution attack rejected: got HTTP ${pathAttackRes.statusCode}`
  );

  // 5. Resource ID Substitution Attack
  console.log('\n--- 5. Resource ID Substitution Attack ---');
  // Generate auth for a fake ID 'fake-uuid-1234', send to testMediaId
  const fakeId = '00000000-0000-0000-0000-000000000000';
  const idAttackAuth = generateAuthHeaders({
    method: 'DELETE',
    path: `/api/v1/media/${testMediaId}`,
    action: 'delete',
    resourceId: fakeId,
  });
  const idAttackRes = await makeRequest({
    method: 'DELETE',
    path: `/api/v1/media/${testMediaId}`,
    headers: idAttackAuth,
  });
  assert(
    idAttackRes.statusCode === 403,
    `Resource ID substitution attack rejected: expected HTTP 403, got ${idAttackRes.statusCode}`
  );

  // 6. Replay & Nonce Reuse Attack
  console.log('\n--- 6. Replay & Nonce Reuse Attack ---');
  // Generate a valid delete signature
  const deleteAuth = generateAuthHeaders({
    method: 'DELETE',
    path: `/api/v1/media/${testMediaId}`,
    action: 'delete',
    resourceId: testMediaId,
    uploadedBy: 'sec-tester',
  });

  // First request: valid delete
  const replayRes1 = await makeRequest({
    method: 'DELETE',
    path: `/api/v1/media/${testMediaId}`,
    headers: deleteAuth,
  });
  assert(replayRes1.statusCode === 200, `First request with nonce succeeds: HTTP ${replayRes1.statusCode}`);

  // Second request: exact same signature + nonce replayed
  const replayRes2 = await makeRequest({
    method: 'DELETE',
    path: `/api/v1/media/${testMediaId}`,
    headers: deleteAuth,
  });
  assert(
    replayRes2.statusCode === 401,
    `Replayed request with consumed nonce rejected: expected HTTP 401, got ${replayRes2.statusCode}`
  );

  // 7. Expired Timestamp Check
  console.log('\n--- 7. Expired Timestamp Check ---');
  const expiredPayload = {
    method: 'POST',
    path: '/api/v1/media/upload',
    action: 'upload',
    timestamp: Date.now() - 600_000, // 10 minutes ago
    expiresAt: Date.now() - 300_000, // expired 5 minutes ago
    nonce: crypto.randomUUID(),
  };
  const rawExpired = JSON.stringify(expiredPayload);
  const expiredSig = crypto.createHmac('sha256', config.hmacSecret).update(rawExpired).digest('hex');
  const expiredRes = await makeRequest({
    method: 'POST',
    path: '/api/v1/media/upload',
    headers: {
      'Content-Type': uploadData.contentType,
      'X-Media-Auth-Signature': expiredSig,
      'X-Media-Auth-Payload': rawExpired,
    },
    body: uploadData.body,
  });
  assert(expiredRes.statusCode === 401, `Expired token rejected: expected HTTP 401, got ${expiredRes.statusCode}`);

  // 8. Future Timestamp (Clock Drift > 1 min)
  console.log('\n--- 8. Future Timestamp Clock Drift ---');
  const futurePayload = {
    method: 'POST',
    path: '/api/v1/media/upload',
    action: 'upload',
    timestamp: Date.now() + 120_000, // 2 minutes in future
    expiresAt: Date.now() + 420_000,
    nonce: crypto.randomUUID(),
  };
  const rawFuture = JSON.stringify(futurePayload);
  const futureSig = crypto.createHmac('sha256', config.hmacSecret).update(rawFuture).digest('hex');
  const futureRes = await makeRequest({
    method: 'POST',
    path: '/api/v1/media/upload',
    headers: {
      'Content-Type': uploadData.contentType,
      'X-Media-Auth-Signature': futureSig,
      'X-Media-Auth-Payload': rawFuture,
    },
    body: uploadData.body,
  });
  assert(futureRes.statusCode === 401, `Future clock drift rejected: expected HTTP 401, got ${futureRes.statusCode}`);

  // 9. Tampered Signature Check
  console.log('\n--- 9. Tampered Signature Check ---');
  const tamperedAuth = generateAuthHeaders({
    method: 'POST',
    path: '/api/v1/media/upload',
    action: 'upload',
  });
  const tamperedRes = await makeRequest({
    method: 'POST',
    path: '/api/v1/media/upload',
    headers: {
      'Content-Type': uploadData.contentType,
      'X-Media-Auth-Signature': 'a'.repeat(64), // forged hex signature
      'X-Media-Auth-Payload': tamperedAuth['X-Media-Auth-Payload'],
    },
    body: uploadData.body,
  });
  assert(tamperedRes.statusCode === 403, `Forged signature rejected: expected HTTP 403, got ${tamperedRes.statusCode}`);

  // 10. File Validation: Reject SVG & Disallowed Formats
  console.log('\n--- 10. File Validation & Disallowed Formats ---');
  const svgContent = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  const svgUpload = createMultipartBody('exploit.svg', 'image/svg+xml', svgContent);
  const svgAuth = generateAuthHeaders({
    method: 'POST',
    path: '/api/v1/media/upload',
    action: 'upload',
  });
  const svgRes = await makeRequest({
    method: 'POST',
    path: '/api/v1/media/upload',
    headers: {
      'Content-Type': svgUpload.contentType,
      ...svgAuth,
    },
    body: svgUpload.body,
  });
  assert(svgRes.statusCode === 400, `SVG upload rejected: expected HTTP 400, got ${svgRes.statusCode}`);

  // 11. Sensitive Path Probing
  console.log('\n--- 11. Sensitive Files & Path Probing ---');
  const sensitivePaths = ['/database/media.sqlite', '/.env', '/backups/', '/logs/err.log', '/quarantine/'];
  let sensitiveBlocked = 0;
  for (const sp of sensitivePaths) {
    const r = await makeRequest({ method: 'GET', path: sp });
    if (r.statusCode === 404) sensitiveBlocked++;
  }
  assert(sensitiveBlocked === sensitivePaths.length, `All ${sensitivePaths.length} sensitive paths returned HTTP 404`);

  // 12. Safe Restore Script Validation
  console.log('\n--- 12. Safe Restore Script Verification ---');
  // Test running restore without --confirm -> must fail
  const { execSync } = await import('node:child_process');
  let restoreFailedWithoutConfirm = false;
  try {
    execSync('node scripts/restore.mjs /nonexistent/backup.tar.gz', { stdio: 'pipe' });
  } catch (err) {
    restoreFailedWithoutConfirm = true;
  }
  assert(restoreFailedWithoutConfirm, 'restore.mjs safely aborts without --confirm argument');

  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

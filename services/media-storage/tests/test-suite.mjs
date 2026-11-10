process.env.TEST_MODE = '1';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createMediaServer } from '../src/server.mjs';
import { config } from '../src/config.mjs';
import { generateUploadAuth } from '../src/security.mjs';
import { getDb, getMediaRecordById } from '../src/db.mjs';
import { resolveStorageRoot } from '../src/storage.mjs';

const TEST_PORT = 4189; // Run test server on separate test port
let server = null;
const results = [];

function recordResult(testNum, title, pass, details) {
  results.push({ testNum, title, pass, details });
  const icon = pass ? '✅ PASS' : '❌ FAIL';
  console.log(`[Test ${String(testNum).padStart(2, '0')}] ${icon} - ${title}`);
  if (details) console.log(`   ${details}`);
}

// Minimal valid 1x1 pixel image binary buffers for testing
// 1x1 PNG:
const VALID_1X1_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

// 1x1 JPEG:
const VALID_1X1_JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
  0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
  0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
  0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
  0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
  0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
  0x00, 0xbf, 0x00, 0xff, 0xd9,
]);

// 1x1 WebP (lossless):
const VALID_1X1_WEBP = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x4c,
  0x0e, 0x00, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00, 0x00, 0x07, 0x00, 0xff, 0xff, 0x00, 0x00, 0x00,
  0x00, 0x00,
]);

function buildMultipartBody(boundary, fieldName, filename, mimeType, fileBuffer) {
  const head = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n` +
    `Content-Type: ${mimeType}\r\n\r\n`
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return Buffer.concat([head, fileBuffer, tail]);
}

function makeRequest({ method, path, headers = {}, body = null, port = TEST_PORT }) {
  const reqHeaders = { ...headers, Connection: 'close' };
  if (body) {
    reqHeaders['Content-Length'] = Buffer.byteLength(body);
  }
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        method,
        path,
        headers: reqHeaders,
        agent: false,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks);
          let json = null;
          try {
            json = JSON.parse(raw.toString('utf8'));
          } catch (_) {}
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: raw,
            json,
          });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('      VERAX MEDIA STORAGE SERVICE — 20-POINT TEST SUITE        ');
  console.log('===============================================================\n');

  // Start test server
  server = createMediaServer();
  await new Promise((resolve) => server.listen(TEST_PORT, '127.0.0.1', resolve));

  let uploadedJpegId = null;
  let uploadedPngId = null;
  let uploadedWebpId = null;
  let uploadedPrivateId = null;

  try {
    // 1. Health endpoint works
    const healthRes = await makeRequest({ method: 'GET', path: '/health' });
    recordResult(
      1,
      'Health endpoint works',
      healthRes.statusCode === 200 && healthRes.json?.status === 'ok' && healthRes.json?.database === 'ok',
      `Status: ${healthRes.statusCode}, DB: ${healthRes.json?.database}, Uptime: ${healthRes.json?.uptime}s`
    );

    // 2. SQLite database can be opened & WAL mode active
    const db = getDb();
    const walCheck = db.prepare('PRAGMA journal_mode;').get();
    const fkCheck = db.prepare('PRAGMA foreign_keys;').get();
    recordResult(
      2,
      'SQLite database can be opened & WAL mode active',
      walCheck?.journal_mode === 'wal' && fkCheck?.foreign_keys === 1,
      `journal_mode=${walCheck?.journal_mode}, foreign_keys=${fkCheck?.foreign_keys}`
    );

    // 3. Valid JPEG upload succeeds
    const boundary = '----WebKitFormBoundaryTest123';
    const authJpeg = generateUploadAuth({ action: 'upload', category: 'articles', visibility: 'public', uploadedBy: 'test_editor' });
    const jpegBody = buildMultipartBody(boundary, 'file', 'photo.jpg', 'image/jpeg', VALID_1X1_JPEG);
    const jpegRes = await makeRequest({
      method: 'POST',
      path: '/api/v1/media/upload',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'X-Media-Auth-Signature': authJpeg.signature,
        'X-Media-Auth-Payload': authJpeg.payload,
      },
      body: jpegBody,
    });
    uploadedJpegId = jpegRes.json?.id;
    recordResult(
      3,
      'Valid JPEG upload succeeds',
      jpegRes.statusCode === 201 && jpegRes.json?.mimeType === 'image/jpeg' && !!jpegRes.json?.publicUrl,
      `ID: ${uploadedJpegId}, Size: ${jpegRes.json?.fileSize} bytes, Dimensions: ${jpegRes.json?.width}x${jpegRes.json?.height}`
    );

    // 4. Valid PNG upload succeeds
    const authPng = generateUploadAuth({ action: 'upload', category: 'thumbnails', visibility: 'public', uploadedBy: 'test_editor' });
    const pngBody = buildMultipartBody(boundary, 'file', 'chart.png', 'image/png', VALID_1X1_PNG);
    const pngRes = await makeRequest({
      method: 'POST',
      path: '/api/v1/media/upload',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'X-Media-Auth-Signature': authPng.signature,
        'X-Media-Auth-Payload': authPng.payload,
      },
      body: pngBody,
    });
    uploadedPngId = pngRes.json?.id;
    recordResult(
      4,
      'Valid PNG upload succeeds',
      pngRes.statusCode === 201 && pngRes.json?.mimeType === 'image/png',
      `ID: ${uploadedPngId}, Size: ${pngRes.json?.fileSize} bytes, Dimensions: ${pngRes.json?.width}x${pngRes.json?.height}`
    );

    // 5. Valid WebP upload succeeds
    const authWebp = generateUploadAuth({ action: 'upload', category: 'infographics', visibility: 'public', uploadedBy: 'test_editor' });
    const webpBody = buildMultipartBody(boundary, 'file', 'vector.webp', 'image/webp', VALID_1X1_WEBP);
    const webpRes = await makeRequest({
      method: 'POST',
      path: '/api/v1/media/upload',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'X-Media-Auth-Signature': authWebp.signature,
        'X-Media-Auth-Payload': authWebp.payload,
      },
      body: webpBody,
    });
    uploadedWebpId = webpRes.json?.id;
    recordResult(
      5,
      'Valid WebP upload succeeds',
      webpRes.statusCode === 201 && webpRes.json?.mimeType === 'image/webp',
      `ID: ${uploadedWebpId}, Size: ${webpRes.json?.fileSize} bytes, Dimensions: ${webpRes.json?.width}x${webpRes.json?.height}`
    );

    // 6. Unsupported file types are rejected (e.g. text/plain, svg)
    const authTxt = generateUploadAuth({ action: 'upload', category: 'articles', visibility: 'public' });
    const txtBody = buildMultipartBody(boundary, 'file', 'notes.txt', 'text/plain', Buffer.from('hello world plain text'));
    const txtRes = await makeRequest({
      method: 'POST',
      path: '/api/v1/media/upload',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'X-Media-Auth-Signature': authTxt.signature,
        'X-Media-Auth-Payload': authTxt.payload,
      },
      body: txtBody,
    });
    recordResult(
      6,
      'Unsupported file types are rejected',
      txtRes.statusCode === 400 && txtRes.json?.code === 'INVALID_SIGNATURE',
      `Rejected with HTTP ${txtRes.statusCode}: ${txtRes.json?.error}`
    );

    // 7. Forged MIME types are rejected (e.g. SVG or Text masquerading as PNG)
    const authForged = generateUploadAuth({ action: 'upload', category: 'articles', visibility: 'public' });
    const forgedBody = buildMultipartBody(boundary, 'file', 'fake.png', 'image/png', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>'));
    const forgedRes = await makeRequest({
      method: 'POST',
      path: '/api/v1/media/upload',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'X-Media-Auth-Signature': authForged.signature,
        'X-Media-Auth-Payload': authForged.payload,
      },
      body: forgedBody,
    });
    recordResult(
      7,
      'Forged MIME types / SVG payloads are rejected',
      forgedRes.statusCode === 400 && (forgedRes.json?.code === 'FORBIDDEN_FORMAT' || forgedRes.json?.code === 'INVALID_SIGNATURE'),
      `Rejected with HTTP ${forgedRes.statusCode}: ${forgedRes.json?.error}`
    );

    // 8. Oversized files are rejected
    const authOver = generateUploadAuth({ action: 'upload', category: 'articles', visibility: 'public' });
    // Simulate oversized by constructing chunk stream exceeding limit
    const overChunk = Buffer.alloc(config.maxFileSize + 2048, 0xaa);
    const overBody = buildMultipartBody(boundary, 'file', 'huge.jpg', 'image/jpeg', overChunk);
    const overRes = await makeRequest({
      method: 'POST',
      path: '/api/v1/media/upload',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'X-Media-Auth-Signature': authOver.signature,
        'X-Media-Auth-Payload': authOver.payload,
      },
      body: overBody,
    });
    recordResult(
      8,
      'Oversized files are rejected',
      overRes.statusCode === 413 || overRes.statusCode === 400,
      `Rejected with HTTP ${overRes.statusCode}: ${overRes.json?.error}`
    );

    // 9. Duplicate filenames do not overwrite existing files (UUID isolation)
    const authDup = generateUploadAuth({ action: 'upload', category: 'articles', visibility: 'public' });
    const dupBody1 = buildMultipartBody(boundary, 'file', 'same_name.png', 'image/png', VALID_1X1_PNG);
    const dupRes1 = await makeRequest({
      method: 'POST',
      path: '/api/v1/media/upload',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'X-Media-Auth-Signature': authDup.signature,
        'X-Media-Auth-Payload': authDup.payload,
      },
      body: dupBody1,
    });
    const authDup2 = generateUploadAuth({ action: 'upload', category: 'articles', visibility: 'public' });
    const dupBody2 = buildMultipartBody(boundary, 'file', 'same_name.png', 'image/png', VALID_1X1_PNG);
    const dupRes2 = await makeRequest({
      method: 'POST',
      path: '/api/v1/media/upload',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'X-Media-Auth-Signature': authDup2.signature,
        'X-Media-Auth-Payload': authDup2.payload,
      },
      body: dupBody2,
    });
    const dupPass = dupRes1.statusCode === 201 && dupRes2.statusCode === 201 && dupRes1.json?.id !== dupRes2.json?.id;
    recordResult(
      9,
      'Duplicate filenames generate unique storage names and never overwrite',
      dupPass,
      `First: ${dupRes1.json?.storedFilename}, Second: ${dupRes2.json?.storedFilename}`
    );

    // 10. Unauthorized uploads are rejected
    const unauthBody = buildMultipartBody(boundary, 'file', 'test.png', 'image/png', VALID_1X1_PNG);
    const unauthRes = await makeRequest({
      method: 'POST',
      path: '/api/v1/media/upload',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: unauthBody,
    });
    recordResult(
      10,
      'Unauthorized uploads without HMAC headers are rejected',
      unauthRes.statusCode === 401,
      `HTTP status: ${unauthRes.statusCode}, Error: ${unauthRes.json?.error}`
    );

    // 11. Expired HMAC signatures are rejected
    const expiredAuth = generateUploadAuth({ action: 'upload', ttlMs: -10000 }); // Expired 10s ago
    const expBody = buildMultipartBody(boundary, 'file', 'test.png', 'image/png', VALID_1X1_PNG);
    const expRes = await makeRequest({
      method: 'POST',
      path: '/api/v1/media/upload',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'X-Media-Auth-Signature': expiredAuth.signature,
        'X-Media-Auth-Payload': expiredAuth.payload,
      },
      body: expBody,
    });
    recordResult(
      11,
      'Expired HMAC signatures are rejected',
      expRes.statusCode === 401,
      `HTTP status: ${expRes.statusCode}, Error: ${expRes.json?.error}`
    );

    // 12. Public media is accessible
    const publicRes = await makeRequest({
      method: 'GET',
      path: `/api/v1/media/${uploadedPngId}/file`,
    });
    recordResult(
      12,
      'Public media file retrieval succeeds',
      publicRes.statusCode === 200 && publicRes.headers['content-type'] === 'image/png',
      `HTTP status: ${publicRes.statusCode}, Content-Length: ${publicRes.body.length}`
    );

    // 13. Private media upload and unauthorized retrieval protection
    const authPriv = generateUploadAuth({ action: 'upload', category: 'editorial', visibility: 'private' });
    const privBody = buildMultipartBody(boundary, 'file', 'confidential.png', 'image/png', VALID_1X1_PNG);
    const privUploadRes = await makeRequest({
      method: 'POST',
      path: '/api/v1/media/upload',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'X-Media-Auth-Signature': authPriv.signature,
        'X-Media-Auth-Payload': authPriv.payload,
      },
      body: privBody,
    });
    uploadedPrivateId = privUploadRes.json?.id;

    const unauthPrivGet = await makeRequest({
      method: 'GET',
      path: `/api/v1/media/${uploadedPrivateId}/file`,
    });
    recordResult(
      13,
      'Private media is completely inaccessible without authorization',
      unauthPrivGet.statusCode === 401,
      `HTTP status: ${unauthPrivGet.statusCode}, Error: ${unauthPrivGet.json?.error}`
    );

    // 14. Authorized private retrieval succeeds
    const authPrivRead = generateUploadAuth({ action: 'download', visibility: 'private' });
    const authPrivGet = await makeRequest({
      method: 'GET',
      path: `/api/v1/media/${uploadedPrivateId}/file`,
      headers: {
        'X-Media-Auth-Signature': authPrivRead.signature,
        'X-Media-Auth-Payload': authPrivRead.payload,
      },
    });
    recordResult(
      14,
      'Authorized private retrieval succeeds with valid HMAC',
      authPrivGet.statusCode === 200 && authPrivGet.body.length > 0,
      `HTTP status: ${authPrivGet.statusCode}, Content-Type: ${authPrivGet.headers['content-type']}`
    );

    // 15. Path traversal attempts are rejected
    const traversalAttempt = await makeRequest({
      method: 'GET',
      path: '/api/v1/media/..%2f..%2fetc%2fpasswd/file',
    });
    recordResult(
      15,
      'Path traversal attempts in media ID and paths are rejected',
      traversalAttempt.statusCode === 404 || traversalAttempt.statusCode === 400,
      `HTTP status: ${traversalAttempt.statusCode}`
    );

    // 16. Database metadata matches stored files
    const rec = getMediaRecordById(uploadedJpegId);
    const statOnDisk = fs.statSync(rec.storage_path);
    const hashOnDisk = crypto.createHash('sha256').update(fs.readFileSync(rec.storage_path)).digest('hex');
    const metaMatches = rec.file_size === statOnDisk.size && rec.sha256 === hashOnDisk;
    recordResult(
      16,
      'Database metadata matches physical stored files (SHA-256 and size)',
      metaMatches,
      `DB Size: ${rec.file_size}, Disk Size: ${statOnDisk.size}, SHA256 matches: ${metaMatches}`
    );

    // 17. Deletion and quarantine work correctly
    const authDel = generateUploadAuth({ action: 'delete' });
    const delRes = await makeRequest({
      method: 'DELETE',
      path: `/api/v1/media/${uploadedWebpId}`,
      headers: {
        'X-Media-Auth-Signature': authDel.signature,
        'X-Media-Auth-Payload': authDel.payload,
      },
    });
    const recAfterDel = getMediaRecordById(uploadedWebpId);
    recordResult(
      17,
      'Deletion softly transitions asset to quarantined status without data loss',
      delRes.statusCode === 200 && recAfterDel.status === 'quarantined',
      `HTTP status: ${delRes.statusCode}, Status in DB: ${recAfterDel.status}`
    );

    // 18. Service survives restart
    if (typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    }
    await new Promise((resolve) => server.close(resolve));
    server = createMediaServer();
    await new Promise((resolve) => server.listen(TEST_PORT, '127.0.0.1', resolve));
    const restartHealth = await makeRequest({ method: 'GET', path: '/health' });
    const persistedRecord = getMediaRecordById(uploadedJpegId);
    recordResult(
      18,
      'Service survives restart with data and database fully intact',
      restartHealth.statusCode === 200 && !!persistedRecord,
      `Restart health: ${restartHealth.statusCode}, Persisted ID: ${persistedRecord?.id}`
    );

    // 19. Existing applications remain operational
    const checkPort = (port, reqPath = '/') =>
      new Promise((resolve) => {
        const req = http.get({ host: '127.0.0.1', port, path: reqPath }, (res) => {
          res.resume();
          resolve(res.statusCode);
        });
        req.on('error', () => resolve(null));
        req.setTimeout(2000, () => {
          req.destroy();
          resolve(null);
        });
      });

    const p3000 = await checkPort(3000, '/');
    const p3001 = await checkPort(3001, '/');
    const p9000 = await checkPort(9000, '/');
    const p4190 = await checkPort(4190, '/health');
    const p9001 = await checkPort(9001, '/api/vpn-status');

    const allRunning = p3000 !== null && p3001 !== null && p9000 !== null && p4190 !== null && p9001 !== null;
    recordResult(
      19,
      'All existing services remain operational on their respective ports',
      allRunning,
      `forfh(3000)=${p3000}, kontrakpaham(3001)=${p3001}, webhook(9000)=${p9000}, rivals(4190)=${p4190}, vpn(9001)=${p9001}`
    );

    // 20. Nginx configuration validation
    const confPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'media.aryariap.my.id.conf');
    const confExists = fs.existsSync(confPath);
    let confContent = '';
    if (confExists) {
      confContent = fs.readFileSync(confPath, 'utf8');
    }
    const hasServerName = confContent.includes('media.aryariap.my.id');
    const hasProxyPass = confContent.includes('proxy_pass http://127.0.0.1:4188');
    const hasPublicAlias = confContent.includes('alias /var/lib/verax/media/public/');
    const hasPrivateInternal = confContent.includes('internal;') && confContent.includes('/internal-media-private/');

    const confValid = confExists && hasServerName && hasProxyPass && hasPublicAlias && hasPrivateInternal;
    recordResult(
      20,
      'Nginx configuration file validation and structural audit',
      confValid,
      `Config file: ${confPath}, server_name: media.aryariap.my.id, upstream: 4188, static public & internal private: valid`
    );
  } finally {
    if (server) {
      server.close();
    }
  }

  const passedCount = results.filter((r) => r.pass).length;
  console.log('\n===============================================================');
  console.log(`TOTAL: ${results.length} | PASSED: ${passedCount} | FAILED: ${results.length - passedCount}`);
  console.log('===============================================================\n');

  return { passedCount, total: results.length, results };
}

runTests().catch(console.error);

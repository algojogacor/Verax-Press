import http from 'node:http';
import { generateUploadAuth } from '../src/security.mjs';

const PORT = 4188;

function req(path, method = 'GET', headers = {}) {
  return new Promise((resolve) => {
    const r = http.request(
      {
        host: '127.0.0.1',
        port: PORT,
        path,
        method,
        headers: { Connection: 'close', ...headers },
        agent: false,
      },
      (res) => {
        let chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString(),
          });
        });
      }
    );
    r.on('error', (e) => resolve({ error: e.message }));
    r.end();
  });
}

async function run() {
  console.log('=== AUDIT SECTION C: PUBLIC/PRIVATE ISOLATION ===');

  // C.1: Access private media file without auth
  // Let's find an existing private media ID from SQLite
  const { getDb } = await import('../src/db.mjs');
  const db = getDb();
  const privRow = db.prepare("SELECT * FROM media_items WHERE visibility = 'private' AND status = 'active' LIMIT 1").get();
  
  if (privRow) {
    const unauthRes = await req(`/api/v1/media/${privRow.id}/file`);
    console.log(`[C.1] Unauthenticated GET /api/v1/media/${privRow.id}/file:`);
    console.log(`      Status: ${unauthRes.statusCode} (Expected: 401)`);
    console.log(`      Body: ${unauthRes.body}`);

    // C.1b: Access private media metadata without auth
    const unauthMeta = await req(`/api/v1/media/${privRow.id}`);
    console.log(`[C.1b] Unauthenticated GET metadata /api/v1/media/${privRow.id}:`);
    console.log(`      Status: ${unauthMeta.statusCode} (Expected: 401)`);
    console.log(`      Body: ${unauthMeta.body}`);
  } else {
    console.log('[C.1] No private row found to test');
  }

  // C.3: Access database / backups / config / logs via HTTP
  const sensitivePaths = [
    '/database/media.sqlite',
    '/media.sqlite',
    '/api/v1/media/database/media.sqlite',
    '/.env',
    '/backups/',
    '/logs/err.log',
    '/media.aryariap.my.id.conf',
    '/quarantine/',
  ];
  console.log('\n[C.3] Checking sensitive file probing on Media API:');
  for (const p of sensitivePaths) {
    const r = await req(p);
    console.log(`      ${p} -> HTTP ${r.statusCode} (Expected: 404)`);
  }

  // C.4 & C.5: Check Cache-Control headers on Private vs Public downloads
  if (privRow) {
    const authPriv = generateUploadAuth({ action: 'download', visibility: 'private', secret: process.env.VERAX_MEDIA_SECRET || 'dev_secret' });
    const authRes = await req(`/api/v1/media/${privRow.id}/file`, 'GET', {
      'X-Media-Auth-Signature': authPriv.signature,
      'X-Media-Auth-Payload': authPriv.payload,
    });
    console.log(`\n[C.5] Private media download headers:`);
    console.log(`      Cache-Control: ${authRes.headers['cache-control']} (Expected: private, no-cache)`);
  }

  const pubRow = db.prepare("SELECT * FROM media_items WHERE visibility = 'public' AND status = 'active' LIMIT 1").get();
  if (pubRow) {
    const pubRes = await req(`/api/v1/media/${pubRow.id}/file`);
    console.log(`\n[C.5b] Public media download headers:`);
    console.log(`      Cache-Control: ${pubRes.headers['cache-control']} (Expected: public, max-age=31536000, immutable)`);
  }
}

run().catch(console.error);

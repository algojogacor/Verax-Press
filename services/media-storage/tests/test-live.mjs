import { generateUploadAuth } from './verax-media-service/src/security.mjs';
import http from 'node:http';

const auth = generateUploadAuth({
  action: 'upload',
  category: 'articles',
  visibility: 'public',
  uploadedBy: 'admin',
  secret: process.env.VERAX_MEDIA_SECRET || 'dev_secret',
});
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const boundary = '----TestBoundary';
const body = Buffer.concat([
  Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="banner.png"\r\nContent-Type: image/png\r\n\r\n`),
  png,
  Buffer.from(`\r\n--${boundary}--\r\n`)
]);

const req = http.request({
  host: '127.0.0.1',
  port: 4188,
  method: 'POST',
  path: '/api/v1/media/upload',
  headers: {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': body.length,
    'X-Media-Auth-Signature': auth.signature,
    'X-Media-Auth-Payload': auth.payload
  }
}, res => {
  let chunks = [];
  res.on('data', c => chunks.push(c));
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('RESPONSE:', Buffer.concat(chunks).toString());
  });
});
req.write(body);
req.end();

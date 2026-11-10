import { generateUploadAuth } from './verax-media-service/src/security.mjs';
import http from 'node:http';

const id = '3630056e-c663-49d5-9e86-dc39563601fb';
const auth = generateUploadAuth({
  action: 'delete',
  secret: 'vx_media_prod_sec_2026_d3f9e2a1b7c8e4f501a2b3c4d5e6f7a8',
});

const req = http.request({
  host: '127.0.0.1',
  port: 4188,
  method: 'DELETE',
  path: `/api/v1/media/${id}`,
  headers: {
    'X-Media-Auth-Signature': auth.signature,
    'X-Media-Auth-Payload': auth.payload,
  }
}, res => {
  let chunks = [];
  res.on('data', c => chunks.push(c));
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('RESPONSE:', Buffer.concat(chunks).toString());
  });
});
req.end();

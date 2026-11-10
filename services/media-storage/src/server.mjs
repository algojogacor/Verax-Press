import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import busboy from 'busboy';

import { config } from './config.mjs';
import { initStorageTree, resolveStorageRoot, getSafeFilePath, getStorageStats, checkQuotaAvailable, moveToQuarantine, cleanupStaleTempFiles } from './storage.mjs';
import { getDb, insertMediaRecord, getMediaRecordById, softDeleteMediaRecord, getMediaStats, cleanupExpiredNonces } from './db.mjs';
import { verifyHmacAuth, applyCors } from './security.mjs';
import { detectMagicMime, isDisallowedFormat, extractDimensions } from './detector.mjs';

// Initialize storage directories and database
const rootDir = initStorageTree();
getDb();

// Purge stale temporary uploads and expired nonces on boot
try {
  cleanupStaleTempFiles(15 * 60 * 1000);
  cleanupExpiredNonces();
} catch (_) {}

// Periodic maintenance sweep (every 15 minutes)
setInterval(() => {
  try {
    cleanupStaleTempFiles(15 * 60 * 1000);
    cleanupExpiredNonces();
  } catch (_) {}
}, 15 * 60 * 1000).unref();

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message, code = 'ERROR') {
  sendJson(res, statusCode, { error: message, code });
}

export function createMediaServer() {
  return http.createServer(async (req, res) => {
    applyCors(req, res);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    const pathname = parsedUrl.pathname;

    try {
      // 1. Health check (minimal, non-sensitive public health status)
      if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/health') {
        let dbOk = false;
        try {
          const db = getDb();
          const row = db.prepare('SELECT 1 AS alive').get();
          dbOk = row?.alive === 1;
        } catch (_) {}

        sendJson(res, dbOk ? 200 : 503, {
          status: dbOk ? 'ok' : 'degraded',
          database: dbOk ? 'ok' : 'unavailable',
          storage: 'ok',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // 1b. Authenticated internal stats (disk and media counters)
      if (req.method === 'GET' && pathname === '/api/v1/media/stats') {
        const auth = verifyHmacAuth(req, {
          method: 'GET',
          path: '/api/v1/media/stats',
          action: 'stats',
        });
        if (!auth.authorized) {
          sendError(res, auth.statusCode || 401, auth.error, 'UNAUTHORIZED');
          return;
        }

        const storageStats = getStorageStats();
        const mediaStats = getMediaStats();

        sendJson(res, 200, {
          status: 'ok',
          uptime: Math.round(process.uptime()),
          storage: {
            usedBytes: storageStats.usedBytes,
            quotaBytes: storageStats.quotaBytes,
            freeBytes: storageStats.freeBytes,
            usagePercent: storageStats.usagePercent,
          },
          media: {
            activePublic: mediaStats?.active_public || 0,
            activePrivate: mediaStats?.active_private || 0,
            quarantined: mediaStats?.quarantined_items || 0,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // 2. Upload media
      if (req.method === 'POST' && pathname === '/api/v1/media/upload') {
        const auth = verifyHmacAuth(req, {
          method: 'POST',
          path: '/api/v1/media/upload',
          action: 'upload',
        });
        if (!auth.authorized) {
          sendError(res, auth.statusCode || 401, auth.error, 'UNAUTHORIZED');
          return;
        }

        const authPayload = auth.payload;
        const requestedVisibility = authPayload.visibility || 'public';
        const requestedCategory = authPayload.category || 'articles';
        const uploadedBy = authPayload.uploadedBy || 'system';

        if (requestedVisibility !== 'public' && requestedVisibility !== 'private') {
          sendError(res, 400, 'Invalid visibility specified in auth payload', 'BAD_REQUEST');
          return;
        }

        const validCategories = config.categories[requestedVisibility];
        if (!validCategories.includes(requestedCategory)) {
          sendError(res, 400, `Invalid category "${requestedCategory}" for visibility "${requestedVisibility}"`, 'BAD_REQUEST');
          return;
        }

        // Verify quota is not exceeded
        try {
          checkQuotaAvailable(1024);
        } catch (err) {
          sendError(res, err.statusCode || 507, err.message, err.code || 'INSUFFICIENT_STORAGE');
          return;
        }

        const contentType = req.headers['content-type'];
        if (!contentType || !contentType.includes('multipart/form-data')) {
          sendError(res, 400, 'Content-Type must be multipart/form-data', 'BAD_REQUEST');
          return;
        }

        let bb;
        try {
          bb = busboy({
            headers: req.headers,
            limits: {
              files: 1,
              fileSize: config.maxFileSize,
            },
          });
        } catch (err) {
          sendError(res, 400, 'Failed to parse multipart request: ' + err.message, 'BAD_REQUEST');
          return;
        }

        let fileHandled = false;
        let tempFilePath = null;
        let originalFilename = 'file';
        let uploadError = null;
        let responseSent = false;
        let isCleanedUp = false;
        let writeStream = null;

        const cleanupTemp = () => {
          if (isCleanedUp) return;
          isCleanedUp = true;
          if (tempFilePath && fs.existsSync(tempFilePath)) {
            try { fs.unlinkSync(tempFilePath); } catch (_) {}
          }
        };

        const respond = (status, payload, isErr = false) => {
          if (responseSent) return;
          responseSent = true;
          if (isErr) {
            cleanupTemp();
            sendError(res, status, payload.message, payload.code);
          } else {
            sendJson(res, status, payload);
          }
        };

        // Listen for client disconnect or abort during streaming
        req.on('close', () => {
          if (!req.complete && !responseSent) {
            uploadError = { statusCode: 499, message: 'Client closed connection prematurely', code: 'CLIENT_ABORTED' };
            if (writeStream && !writeStream.destroyed) {
              try { writeStream.destroy(); } catch (_) {}
            }
            cleanupTemp();
          }
        });

        bb.on('file', (name, fileStream, info) => {
          if (fileHandled) {
            fileStream.resume();
            return;
          }
          fileHandled = true;
          originalFilename = path.basename(info.filename || 'upload');

          const tempId = crypto.randomUUID();
          const tmpDir = path.join(resolveStorageRoot(), 'tmp');
          if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true, mode: 0o700 });
          }
          tempFilePath = path.join(tmpDir, `upload_${tempId}.tmp`);

          writeStream = fs.createWriteStream(tempFilePath);
          const hash = crypto.createHash('sha256');
          let totalBytes = 0;
          const headChunks = [];
          let headBytes = 0;
          let fileTruncated = false;

          fileStream.on('data', (chunk) => {
            if (writeStream.destroyed) return;
            totalBytes += chunk.length;
            hash.update(chunk);

            if (headBytes < 4096) {
              headChunks.push(chunk);
              headBytes += chunk.length;
            }

            writeStream.write(chunk);
          });

          writeStream.on('error', () => {
            // Prevent unhandled error event if destroyed during limit abort
          });

          fileStream.on('limit', () => {
            fileTruncated = true;
            uploadError = {
              statusCode: 413,
              message: `File size exceeds the limit of ${config.maxFileSize / 1024 / 1024}MB`,
              code: 'FILE_TOO_LARGE',
            };
            fileStream.resume();
            writeStream.destroy();
            cleanupTemp();
            respond(413, uploadError, true);
          });

          fileStream.on('end', () => {
            writeStream.end();
          });

          fileStream.on('error', (err) => {
            uploadError = {
              statusCode: 500,
              message: 'Error during file upload stream: ' + err.message,
              code: 'STREAM_ERROR',
            };
            writeStream.destroy();
            cleanupTemp();
            respond(500, uploadError, true);
          });

          writeStream.on('finish', async () => {
            if (uploadError) {
              cleanupTemp();
              respond(uploadError.statusCode, uploadError, true);
              return;
            }

            if (totalBytes === 0) {
              uploadError = { statusCode: 400, message: 'Uploaded file is empty', code: 'EMPTY_FILE' };
              cleanupTemp();
              respond(400, uploadError, true);
              return;
            }

            const headBuffer = Buffer.concat(headChunks);

            // 1. Check disallowed formats (SVG, executables, scripts)
            const disallowedCheck = isDisallowedFormat(headBuffer);
            if (disallowedCheck.rejected) {
              uploadError = { statusCode: 400, message: disallowedCheck.reason, code: 'FORBIDDEN_FORMAT' };
              cleanupTemp();
              respond(400, uploadError, true);
              return;
            }

            // 2. Validate magic bytes against allowed mimes
            const detected = detectMagicMime(headBuffer);
            if (!detected || !config.allowedMimes.includes(detected.mime)) {
              uploadError = {
                statusCode: 400,
                message: `Unsupported or invalid file signature. Allowed types: ${config.allowedMimes.join(', ')}`,
                code: 'INVALID_SIGNATURE',
              };
              cleanupTemp();
              respond(400, uploadError, true);
              return;
            }

            // 3. Check storage quota with actual file size
            try {
              checkQuotaAvailable(totalBytes);
            } catch (err) {
              uploadError = { statusCode: 507, message: err.message, code: 'INSUFFICIENT_STORAGE' };
              cleanupTemp();
              respond(507, uploadError, true);
              return;
            }

            // 4. Extract dimensions
            const dimensions = extractDimensions(headBuffer, detected.mime);

            // 5. Generate secure UUID filename
            const mediaId = crypto.randomUUID();
            const storedFilename = `${mediaId}.${detected.ext}`;
            const targetPath = getSafeFilePath(requestedVisibility, requestedCategory, storedFilename);

            // 6. Move file atomically to destination
            fs.renameSync(tempFilePath, targetPath);
            isCleanedUp = true;

            // 7. Store record in SQLite
            const sha256Hex = hash.digest('hex');
            const record = insertMediaRecord({
              id: mediaId,
              original_filename: originalFilename,
              stored_filename: storedFilename,
              storage_path: targetPath,
              visibility: requestedVisibility,
              category: requestedCategory,
              mime_type: detected.mime,
              file_extension: detected.ext,
              file_size: totalBytes,
              sha256: sha256Hex,
              width: dimensions.width,
              height: dimensions.height,
              uploaded_by: uploadedBy,
            });

            // 8. Return response (no internal filesystem paths disclosed)
            respond(201, {
              id: record.id,
              storedFilename: record.stored_filename,
              originalFilename: record.original_filename,
              visibility: record.visibility,
              category: record.category,
              mimeType: record.mime_type,
              fileExtension: record.file_extension,
              fileSize: record.file_size,
              sha256: record.sha256,
              width: record.width,
              height: record.height,
              publicUrl: record.visibility === 'public'
                ? `${config.publicBaseUrl}/${record.category}/${record.stored_filename}`
                : null,
              createdAt: record.created_at,
            });
          });
        });

        bb.on('error', (err) => {
          if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
          respond(500, { message: 'Multipart processing failed: ' + err.message, code: 'PROCESSING_ERROR' }, true);
        });

        bb.on('finish', () => {
          if (!fileHandled) {
            respond(400, { message: 'No file provided in multipart body', code: 'NO_FILE' }, true);
          } else if (uploadError) {
            respond(uploadError.statusCode, uploadError, true);
          }
        });

        req.pipe(bb);
        return;
      }

      // 3. Retrieve media metadata: GET/HEAD /api/v1/media/:id
      const metaMatch = pathname.match(/^\/api\/v1\/media\/([a-zA-Z0-9_-]+)$/);
      if ((req.method === 'GET' || req.method === 'HEAD') && metaMatch) {
        const id = metaMatch[1];
        const record = getMediaRecordById(id);

        if (!record || record.status !== 'active') {
          sendError(res, 404, 'Media asset not found', 'NOT_FOUND');
          return;
        }

        // Private media metadata requires HMAC authorization
        if (record.visibility === 'private') {
          const auth = verifyHmacAuth(req, {
            method: req.method,
            path: `/api/v1/media/${id}`,
            action: 'metadata',
            resourceId: id,
          });
          if (!auth.authorized) {
            sendError(res, auth.statusCode || 401, 'Private media metadata requires authentication: ' + auth.error, 'UNAUTHORIZED');
            return;
          }
        }

        sendJson(res, 200, {
          id: record.id,
          storedFilename: record.stored_filename,
          originalFilename: record.original_filename,
          visibility: record.visibility,
          category: record.category,
          mimeType: record.mime_type,
          fileExtension: record.file_extension,
          fileSize: record.file_size,
          sha256: record.sha256,
          width: record.width,
          height: record.height,
          uploadedBy: record.uploaded_by,
          publicUrl: record.visibility === 'public'
            ? `${config.publicBaseUrl}/${record.category}/${record.stored_filename}`
            : null,
          createdAt: record.created_at,
          updatedAt: record.updated_at,
        });
        return;
      }

      // 4. Download / Serve file: GET/HEAD /api/v1/media/:id/file
      const fileMatch = pathname.match(/^\/api\/v1\/media\/([a-zA-Z0-9_-]+)\/file$/);
      if ((req.method === 'GET' || req.method === 'HEAD') && fileMatch) {
        const id = fileMatch[1];
        const record = getMediaRecordById(id);

        if (!record || record.status !== 'active') {
          sendError(res, 404, 'Media asset not found', 'NOT_FOUND');
          return;
        }

        // Private media requires authorization
        if (record.visibility === 'private') {
          const auth = verifyHmacAuth(req, {
            method: req.method,
            path: `/api/v1/media/${id}/file`,
            action: 'download',
            resourceId: id,
          });
          if (!auth.authorized) {
            sendError(res, auth.statusCode || 401, 'Private media download requires authentication: ' + auth.error, 'UNAUTHORIZED');
            return;
          }
        }

        // Support Nginx X-Accel-Redirect for optimized delivery when configured
        if (req.headers['x-accel-internal']) {
          res.writeHead(200, {
            'X-Accel-Redirect': `/internal-media-private/${record.category}/${record.stored_filename}`,
            'Content-Type': record.mime_type,
            'Content-Disposition': `inline; filename="${record.original_filename}"`,
          });
          res.end();
          return;
        }

        let activePath = record.storage_path;
        try {
          const resolved = getSafeFilePath(record.visibility, record.category, record.stored_filename);
          if (fs.existsSync(resolved)) {
            activePath = resolved;
          }
        } catch (_) {}

        if (!activePath || !fs.existsSync(activePath)) {
          sendError(res, 404, 'Stored file is missing from disk', 'FILE_MISSING');
          return;
        }

        res.writeHead(200, {
          'Content-Type': record.mime_type,
          'Content-Length': record.file_size,
          'Content-Disposition': `inline; filename="${record.original_filename}"`,
          'Cache-Control': record.visibility === 'public' ? 'public, max-age=31536000, immutable' : 'private, no-cache',
          'X-Content-Type-Options': 'nosniff',
        });
        if (req.method === 'HEAD') {
          res.end();
          return;
        }
        fs.createReadStream(activePath).pipe(res);
        return;
      }

      // 5. Delete (quarantine) media: DELETE /api/v1/media/:id
      if (req.method === 'DELETE' && metaMatch) {
        const id = metaMatch[1];
        const auth = verifyHmacAuth(req, {
          method: 'DELETE',
          path: `/api/v1/media/${id}`,
          action: 'delete',
          resourceId: id,
        });
        if (!auth.authorized) {
          sendError(res, auth.statusCode || 401, 'Delete operations require authentication: ' + auth.error, 'UNAUTHORIZED');
          return;
        }

        const record = getMediaRecordById(id);
        if (!record || record.status !== 'active') {
          sendError(res, 404, 'Media asset not found or already deleted', 'NOT_FOUND');
          return;
        }

        // Move to quarantine folder to avoid accidental permanent data loss
        let activePath = record.storage_path;
        try {
          const resolved = getSafeFilePath(record.visibility, record.category, record.stored_filename);
          if (fs.existsSync(resolved)) {
            activePath = resolved;
          }
        } catch (_) {}

        if (activePath && fs.existsSync(activePath)) {
          moveToQuarantine(activePath, record.stored_filename);
        }

        softDeleteMediaRecord(id);

        sendJson(res, 200, {
          message: 'Media asset quarantined successfully',
          id,
          status: 'quarantined',
        });
        return;
      }

      // Unknown route
      sendError(res, 404, `Route ${req.method} ${pathname} not found`, 'NOT_FOUND');
    } catch (err) {
      console.error('Unhandled server error:', err);
      sendError(res, 500, 'Internal server error', 'INTERNAL_SERVER_ERROR');
    }
  });
}

// Start server unless TEST_MODE is active
if (!process.env.TEST_MODE) {
  const server = createMediaServer();
  server.listen(config.port, config.host, () => {
    console.log(`[Verax Media Storage] Service listening on http://${config.host}:${config.port}`);
    console.log(`[Verax Media Storage] Storage root: ${resolveStorageRoot()}`);
    console.log(`[Verax Media Storage] Quota: ${(config.quotaBytes / 1024 / 1024 / 1024).toFixed(1)} GB`);
  });
}

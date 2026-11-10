import fs from 'node:fs';

export function detectMagicMime(buffer) {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: 'png' };
  }

  // WebP: RIFF ... WEBP
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }

  return null;
}

export function isDisallowedFormat(buffer) {
  if (!buffer || buffer.length === 0) return true;

  // Check for SVG / XML
  const headText = buffer.subarray(0, 512).toString('utf8').trimStart().toLowerCase();
  if (headText.startsWith('<?xml') || headText.startsWith('<svg') || headText.includes('<svg')) {
    return { rejected: true, reason: 'SVG and XML images are rejected by security policy' };
  }

  // Check for common executables / scripts
  // MZ (Windows PE)
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return { rejected: true, reason: 'Executable PE binaries are rejected' };
  }
  // ELF (Linux executable)
  if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    return { rejected: true, reason: 'ELF binaries are rejected' };
  }
  // Shebang script
  if (buffer[0] === 0x23 && buffer[1] === 0x21) {
    return { rejected: true, reason: 'Shell script execution headers are rejected' };
  }
  // HTML tags
  if (headText.startsWith('<!doctype html') || headText.startsWith('<html') || headText.includes('<script')) {
    return { rejected: true, reason: 'HTML/Script content is rejected' };
  }

  return { rejected: false };
}

export function extractDimensions(buffer, mime) {
  try {
    if (mime === 'image/png') {
      if (buffer.length >= 24) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        return { width, height };
      }
    } else if (mime === 'image/jpeg') {
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xff) {
          offset++;
          continue;
        }
        const marker = buffer[offset + 1];
        // SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2)
        if (marker >= 0xc0 && marker <= 0xc3 && marker !== 0xc4) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        // Jump segment length
        const segmentLength = buffer.readUInt16BE(offset + 2);
        offset += 2 + segmentLength;
      }
    } else if (mime === 'image/webp') {
      // Chunk format check
      const chunkType = buffer.toString('ascii', 12, 16);
      if (chunkType === 'VP8 ' && buffer.length >= 30) {
        const width = buffer.readUInt16LE(26) & 0x3fff;
        const height = buffer.readUInt16LE(28) & 0x3fff;
        return { width, height };
      } else if (chunkType === 'VP8L' && buffer.length >= 25) {
        const b1 = buffer[21];
        const b2 = buffer[22];
        const b3 = buffer[23];
        const b4 = buffer[24];
        const width = 1 + (((b2 & 0x3f) << 8) | b1);
        const height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
        return { width, height };
      } else if (chunkType === 'VP8X' && buffer.length >= 30) {
        const width = 1 + buffer.readUIntLE(24, 3);
        const height = 1 + buffer.readUIntLE(27, 3);
        return { width, height };
      }
    }
  } catch (_) {}

  return { width: null, height: null };
}

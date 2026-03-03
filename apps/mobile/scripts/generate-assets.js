#!/usr/bin/env node
/**
 * Generates placeholder PNG assets for the Expo mobile app.
 * No external dependencies — uses only Node.js built-ins (zlib, fs).
 * Replace these with real artwork before App Store / Play Store submission.
 *
 * Usage: node apps/mobile/scripts/generate-assets.js
 */

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ── CRC-32 (required by PNG spec) ─────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.concat([typeBuf, data]);
  const out = Buffer.alloc(4 + 4 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  typeBuf.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(crcBuf), 8 + data.length);
  return out;
}

/**
 * Creates a PNG buffer from pixel rows.
 * Each row is [r,g,b,a, r,g,b,a, ...] (RGBA, 4 bytes per pixel).
 */
function buildPNG(width, height, getPixel) {
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: width, height, 8-bit depth, RGBA (colorType=6)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  // [10,11,12] = 0 (compression, filter, interlace)

  // Raw scanlines: filter-byte (0) + RGBA bytes
  const rowLen = 1 + width * 4;
  const raw = Buffer.alloc(rowLen * height);
  for (let y = 0; y < height; y++) {
    const base = y * rowLen;
    raw[base] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const p = base + 1 + x * 4;
      raw[p] = r; raw[p + 1] = g; raw[p + 2] = b; raw[p + 3] = a;
    }
  }

  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    PNG_SIG,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Pixel generators ──────────────────────────────────────────────────────

/** Solid colour fill */
function solid(r, g, b, a = 255) {
  return () => [r, g, b, a];
}

/**
 * Purple circle on dark background (icon style).
 * Draws a rounded square in the centre with a simple "F" highlight.
 */
function iconPixel(x, y, w, h) {
  const cx = w / 2, cy = h / 2;
  const radius = w * 0.42;

  // Distance from centre (for rounded-square approximation)
  const dx = (x - cx) / radius;
  const dy = (y - cy) / radius;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background: very dark navy
  const BG = [3, 7, 18, 255];
  // Circle fill: brand purple
  const PURPLE = [124, 58, 237, 255];
  // Lighter purple highlight
  const LIGHT = [167, 106, 249, 255];

  if (dist > 1.0) return BG;

  // Soft edge anti-alias
  if (dist > 0.96) {
    const t = (dist - 0.96) / 0.04;
    return PURPLE.map((v, i) => Math.round(v * (1 - t) + BG[i] * t));
  }

  // Simple "F" lettermark in the top-left quadrant of the circle
  const nx = (x - cx + radius) / (radius * 2); // 0..1
  const ny = (y - cy + radius) / (radius * 2); // 0..1

  // Vertical stroke of F
  if (nx > 0.38 && nx < 0.48 && ny > 0.25 && ny < 0.75) return LIGHT;
  // Top horizontal bar
  if (nx > 0.38 && nx < 0.68 && ny > 0.25 && ny < 0.35) return LIGHT;
  // Middle horizontal bar
  if (nx > 0.38 && nx < 0.62 && ny > 0.46 && ny < 0.56) return LIGHT;

  return PURPLE;
}

/** Dark background with centred wordmark placeholder */
function splashPixel(x, y, w, h) {
  // Very dark navy background
  return [3, 7, 18, 255];
}

// ── Asset definitions ─────────────────────────────────────────────────────

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

const assets = [
  { name: 'icon.png',              w: 1024, h: 1024, pixel: iconPixel },
  { name: 'adaptive-icon.png',     w: 1024, h: 1024, pixel: iconPixel },
  { name: 'splash.png',            w: 1284, h: 2778, pixel: splashPixel },
  { name: 'notification-icon.png', w: 96,   h: 96,   pixel: solid(124, 58, 237) },
  { name: 'favicon.png',           w: 48,   h: 48,   pixel: solid(124, 58, 237) },
];

// ── Generate ──────────────────────────────────────────────────────────────

console.log('Generating Expo placeholder assets...\n');
fs.mkdirSync(ASSETS_DIR, { recursive: true });

for (const { name, w, h, pixel } of assets) {
  process.stdout.write(`  ${name.padEnd(28)} ${w}x${h} ... `);
  const png = buildPNG(w, h, pixel);
  fs.writeFileSync(path.join(ASSETS_DIR, name), png);
  console.log(`${(png.length / 1024).toFixed(1)} KB`);
}

console.log('\nDone. Assets written to apps/mobile/assets/');
console.log('Replace with real artwork before App Store / Play Store submission.');

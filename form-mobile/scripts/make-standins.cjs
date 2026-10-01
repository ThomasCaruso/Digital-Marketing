/**
 * One-shot: emit tonal stand-in PNGs for the product placeholder slots.
 * The manifest in src/data/photography.ts requires every product file to
 * exist, so each slot ships as a flat tonal block (product hex blended into
 * paper) until the real studio pack overwrites the same filenames under
 * assets/placeholders/products/<category>/. Demo-only imagery.
 * Run: node scripts/make-standins.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const PAPER = [0xf7, 0xf5, 0xf1];
/** Same product hexes as src/data/catalog.ts (kept literal — the script runs before Metro). */
const PRODUCTS = {
  jacket: ['outerwear', '#493529'], overshirt: ['outerwear', '#29231d'],
  crew: ['tops', '#e4dace'], shirt: ['tops', '#e4dace'], 'fine-knit': ['tops', '#9a8a79'], 'warm-knit': ['tops', '#29313f'],
  pleat: ['bottoms', '#44423f'], straight: ['bottoms', '#91918e'], linen: ['bottoms', '#e4dace'], relaxed: ['bottoms', '#9a8a79'],
  sneaker: ['shoes', '#e4ded2'], loafer: ['shoes', '#29231d'], canvas: ['shoes', '#29231d'], runner: ['shoes', '#91918e'],
};
const OUT = path.join(__dirname, '..', 'assets', 'placeholders', 'products');
const WIDTH = 400, HEIGHT = 500;

let crcTable;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c; }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function tonalPng(width, height, [r, g, b]) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit truecolor RGB
  const rowLength = 1 + width * 3;
  const row = Buffer.alloc(rowLength);
  for (let x = 0; x < width; x++) { row[1 + x * 3] = r; row[2 + x * 3] = g; row[3 + x * 3] = b; }
  const raw = Buffer.alloc(rowLength * height);
  for (let y = 0; y < height; y++) row.copy(raw, y * rowLength);
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function blend(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [0, 1, 2].map(i => Math.round(0.35 * [(n >> 16) & 255, (n >> 8) & 255, n & 255][i] + 0.65 * PAPER[i]));
}
fs.mkdirSync(OUT, { recursive: true });
for (const [id, [category, hex]] of Object.entries(PRODUCTS)) {
  const file = path.join(OUT, category, `${id}.png`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, tonalPng(WIDTH, HEIGHT, blend(hex)));
  console.log('stand-in:', path.relative(path.join(__dirname, '..'), file), hex);
}
console.log(`Done. ${Object.keys(PRODUCTS).length} tonal stand-ins in assets/placeholders/products/`);

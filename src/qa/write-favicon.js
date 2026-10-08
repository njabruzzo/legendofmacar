'use strict';
/**
 * Build a 32×32 favicon.ico from assets/ui/icon_pack.png.
 * Run: node src/qa/write-favicon.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.join(__dirname, '../..');
const src = path.join(root, 'assets/ui/icon_pack.png');
const dest = path.join(root, 'favicon.ico');

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePng(buf) {
  if (buf.toString('ascii', 1, 4) !== 'PNG') throw new Error('not a png');
  let pos = 8, width = 0, height = 0, color = 0, idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    pos += 12 + len;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[10] !== 0) throw new Error('unsupported png');
      color = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
  }
  const bpp = color === 6 ? 4 : color === 2 ? 3 : color === 0 ? 1 : 0;
  if (!bpp) throw new Error('unsupported color type ' + color);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const out = Buffer.alloc(width * height * 4);
  let prev = Buffer.alloc(stride);
  let rp = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++];
    const row = Buffer.from(raw.subarray(rp, rp + stride));
    rp += stride;
    for (let i = 0; i < stride; i++) {
      const left = i >= bpp ? row[i - bpp] : 0;
      const up = prev[i];
      const ul = i >= bpp ? prev[i - bpp] : 0;
      if (filter === 1) row[i] = (row[i] + left) & 255;
      else if (filter === 2) row[i] = (row[i] + up) & 255;
      else if (filter === 3) row[i] = (row[i] + ((left + up) >> 1)) & 255;
      else if (filter === 4) row[i] = (row[i] + paeth(left, up, ul)) & 255;
      else if (filter !== 0) throw new Error('bad filter ' + filter);
    }
    for (let x = 0; x < width; x++) {
      const s = x * bpp, d = (y * width + x) * 4;
      if (bpp === 4) { out[d] = row[s]; out[d + 1] = row[s + 1]; out[d + 2] = row[s + 2]; out[d + 3] = row[s + 3]; }
      else if (bpp === 3) { out[d] = row[s]; out[d + 1] = row[s + 1]; out[d + 2] = row[s + 2]; out[d + 3] = 255; }
      else { out[d] = out[d + 1] = out[d + 2] = row[s]; out[d + 3] = 255; }
    }
    prev = row;
  }
  return {width, height, rgba: out};
}

function sample(img, size) {
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx0 = Math.floor(x * img.width / size);
      const sx1 = Math.max(sx0 + 1, Math.floor((x + 1) * img.width / size));
      const sy0 = Math.floor(y * img.height / size);
      const sy1 = Math.max(sy0 + 1, Math.floor((y + 1) * img.height / size));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const p = (sy * img.width + sx) * 4;
          const al = img.rgba[p + 3];
          r += img.rgba[p] * al; g += img.rgba[p + 1] * al; b += img.rgba[p + 2] * al; a += al; n++;
        }
      }
      const d = (y * size + x) * 4;
      if (a) { out[d] = r / a; out[d + 1] = g / a; out[d + 2] = b / a; out[d + 3] = a / n; }
    }
  }
  return out;
}

function writeIco(rgba, size) {
  const header = 40;
  const xor = size * size * 4;
  const andRow = Math.ceil(size / 32) * 4;
  const and = andRow * size;
  const dib = header + xor + and;
  const buf = Buffer.alloc(6 + 16 + dib);
  buf.writeUInt16LE(0, 0);
  buf.writeUInt16LE(1, 2);
  buf.writeUInt16LE(1, 4);
  buf[6] = size; buf[7] = size; buf[8] = 0; buf[9] = 0;
  buf.writeUInt16LE(1, 10);
  buf.writeUInt16LE(32, 12);
  buf.writeUInt32LE(dib, 14);
  buf.writeUInt32LE(22, 18);
  buf.writeUInt32LE(40, 22);
  buf.writeInt32LE(size, 26);
  buf.writeInt32LE(size * 2, 30);
  buf.writeUInt16LE(1, 34);
  buf.writeUInt16LE(32, 36);
  let p = 22 + header;
  for (let y = size - 1; y >= 0; y--) {
    for (let x = 0; x < size; x++) {
      const s = (y * size + x) * 4;
      buf[p++] = rgba[s + 2];
      buf[p++] = rgba[s + 1];
      buf[p++] = rgba[s];
      buf[p++] = rgba[s + 3];
    }
  }
  return buf;
}

function main() {
  const img = decodePng(fs.readFileSync(src));
  const size = 32;
  const small = sample(img, size);
  fs.writeFileSync(dest, writeIco(small, size));
  console.log('wrote favicon.ico ' + size + 'x' + size + ' from ' + path.relative(root, src) + ' (' + img.width + 'x' + img.height + ')');
}

if (require.main === module) main();

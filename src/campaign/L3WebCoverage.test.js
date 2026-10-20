/**
 * Overhead webs must not cover Macar on the cage-to-mock walk.
 * Pure Node: project the shared-atlas sprite and the sheet alpha.
 * No browser and no WebSocket. The sheets are always included, which is
 * what draws once the room is explored. A count taken before that wait
 * is a false 0, so this test does not gate on tileExplored.
 * Run: node src/campaign/L3WebCoverage.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Webs = require('./L3Webs');
const Shell = require('./L3Shell');
const { readRgba } = require('../qa/pngRgba');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

const root = path.join(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const SHEETS = ['web_sheet_corner_b', 'web_sheet_span_a', 'web_sheet_span_b'];
const SIZE = 896, FEET = 650, BODY_H = 400, MAUL = 0.53;
const LENGTH = BODY_H * MAUL;
const FIT = MAUL * SIZE / LENGTH;
const FOOT_Y = FEET / SIZE;
const DIRS = ['s', 'se', 'e', 'ne', 'n'];
const ORIGIN = { x: Shell.points.pixie.x - Webs.cage[0], y: Shell.points.pixie.y - Webs.cage[1] };

assert(/function l3WebSheet[\s\S]{0,900}L3Webs\.trim/.test(html), 'sheet blit applies the source trim');
assert(/t===0\|\|t===3\|\|t===4/.test(html.slice(html.indexOf('function l3WebFloorCanvas'), html.indexOf('function l3WebFloorCanvas') + 1600)),
  'floor webs clip to walkable tiles');
assert(/tileExplored\(o\.x, o\.y\)/.test(html), 'overhead webs still wait until the tile is explored');

const bodyPng = readRgba(path.join(root, 'assets/creatures/shared/macar-body-v1.png'));
const weapPng = readRgba(path.join(root, 'assets/creatures/shared/macar-weapons-v1.png'));
const pngs = {};
for (const key of Webs.keys) pngs[key] = readRgba(path.join(root, Webs.file(key)));

function cell(row, col) {
  const sw = bodyPng.w / 6, sh = bodyPng.h / 5;
  const w = Math.ceil(sw), h = Math.ceil(sh);
  const data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(bodyPng.h - 1, Math.floor(row * sh + y));
    data.set(bodyPng.data.subarray(sy * bodyPng.w * 4, (sy * bodyPng.w + w) * 4), y * w * 4);
  }
  const visited = new Uint8Array(w * h);
  const components = [];
  for (let n = 0; n < w * h; n++) {
    if (visited[n] || data[n * 4 + 3] <= 40) continue;
    const component = [n];
    visited[n] = 1;
    for (let q = 0; q < component.length; q++) {
      const at = component[q], x = at % w, y = (at / w) | 0;
      const nexts = [x > 0 ? at - 1 : -1, x + 1 < w ? at + 1 : -1, y > 0 ? at - w : -1, y + 1 < h ? at + w : -1];
      for (const next of nexts) {
        if (next >= 0 && !visited[next] && data[next * 4 + 3] > 40) { visited[next] = 1; component.push(next); }
      }
    }
    components.push(component);
  }
  let largest = 0;
  for (const c of components) if (c.length > largest) largest = c.length;
  const minimum = Math.max(100, largest * 0.025);
  for (const component of components) if (component.length < minimum) for (const at of component) data[at * 4 + 3] = 0;
  let top = h, bot = 0, left = w, right = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > 80) {
      if (y < top) top = y; if (y > bot) bot = y;
      if (x < left) left = x; if (x > right) right = x;
    }
  }
  return { w, h, data, top, bot, left, right };
}
const cellCache = new Map();
function bounds(row, col) {
  const k = row + ':' + col;
  if (!cellCache.has(k)) cellCache.set(k, cell(row, col));
  return cellCache.get(k);
}

const CARRIES = [
  [[88, 58], [91, 57], [92, 60], [89, 59], [90, 60]],
  [[97, 50], [96, 46], [104, 49], [98, 53], [90, 52]],
  [[132, 44], [123, 43], [138, 44], [127, 43], [119, 44]],
  [[165, 63], [169, 65], [170, 63], [167, 62], [169, 62]],
  [[177, 64], [179, 64], [177, 65], [176, 63], [180, 65]]
];
const ANGLES = [-0.28, -1.20, Math.PI + 0.55, Math.PI + 0.4, Math.PI + 0.32];

function stampNearest(mask, src, sw, sh, dx, dy, dw, dh) {
  const x0 = Math.max(0, Math.floor(dx)), y0 = Math.max(0, Math.floor(dy));
  const x1 = Math.min(SIZE, Math.ceil(dx + dw)), y1 = Math.min(SIZE, Math.ceil(dy + dh));
  for (let y = y0; y < y1; y++) {
    const v = ((y + 0.5) - dy) / dh;
    if (v < 0 || v >= 1) continue;
    const sy = Math.min(sh - 1, Math.floor(v * sh));
    for (let x = x0; x < x1; x++) {
      const u = ((x + 0.5) - dx) / dw;
      if (u < 0 || u >= 1) continue;
      const sx = Math.min(sw - 1, Math.floor(u * sw));
      if (src[(sy * sw + sx) * 4 + 3] >= 128) mask[y * SIZE + x] = 1;
    }
  }
}
function stampWeapon(mask, ax, ay, angle) {
  const scale = LENGTH / (941 - 80);
  const dw = 1254 * scale, dh = 627 * scale;
  const dx = -80 * scale, dy = -348 * scale;
  const c = Math.cos(angle), s = Math.sin(angle);
  const corners = [[dx, dy], [dx + dw, dy], [dx, dy + dh], [dx + dw, dy + dh]].map(function (p) {
    return [ax + p[0] * c - p[1] * s, ay + p[0] * s + p[1] * c];
  });
  let minX = SIZE, minY = SIZE, maxX = 0, maxY = 0;
  for (const p of corners) {
    minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]);
    maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]);
  }
  const xa = Math.max(0, Math.floor(minX) - 1), ya = Math.max(0, Math.floor(minY) - 1);
  const xb = Math.min(SIZE, Math.ceil(maxX) + 1), yb = Math.min(SIZE, Math.ceil(maxY) + 1);
  for (let y = ya; y < yb; y++) {
    for (let x = xa; x < xb; x++) {
      const lx = (x + 0.5) - ax, ly = (y + 0.5) - ay;
      const u = (lx * c + ly * s - dx) / dw;
      const v = (-lx * s + ly * c - dy) / dh;
      if (u < 0 || v < 0 || u >= 1 || v >= 1) continue;
      const sx = Math.min(1253, Math.floor(u * 1254));
      const sy = Math.min(626, Math.floor(v * 627));
      if (weapPng.data[(sy * weapPng.w + sx) * 4 + 3] >= 128) mask[y * SIZE + x] = 1;
    }
  }
}
const poseCache = new Map();
function poseMask(dir, stage) {
  const key = dir + ':' + stage;
  if (poseCache.has(key)) return poseCache.get(key);
  const row = DIRS.indexOf(dir);
  const col = stage === 'idle' ? 0 : 1 + Number(stage.slice(4));
  const idle = bounds(row, 0);
  const b = bounds(row, col);
  const sc = BODY_H / (idle.bot - idle.top);
  const bx = SIZE / 2 - (idle.left + idle.right) / 2 * sc;
  const by = FEET - b.bot * sc;
  const mask = new Uint8Array(SIZE * SIZE);
  const carry = CARRIES[row][stage === 'idle' ? 0 : 1 + Number(stage.slice(4))];
  const angle = ANGLES[row];
  const ux = Math.cos(angle), uy = Math.sin(angle);
  stampWeapon(mask, bx + carry[0] * sc - LENGTH * 0.16 * ux, by + carry[1] * sc - LENGTH * 0.16 * uy, angle);
  stampNearest(mask, b.data, b.w, b.h, bx, by, b.w * sc, b.h * sc);
  poseCache.set(key, mask);
  return mask;
}

function viewOf(name) {
  if (name === 'laptop') return { name: name, TW: 116, TH: 58, ZOOM: 1.38 };
  return { name: name, TW: 66, TH: 34, ZOOM: 0.78 };
}
function hall(v) { return 298 * (v.TH / 96) * 0.70; }
function octant(v, fdx, fdy) {
  const sx = (fdx - fdy) * (v.TW / 2), sy = (fdx + fdy) * (v.TH / 2);
  if (!(sx || sy)) return 's';
  const deg = ((Math.atan2(sy, sx) * 180 / Math.PI) + 360) % 360;
  return ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'][Math.round(deg / 45) % 8];
}
function sharedDir(oct) { return { w: 'e', sw: 'se', nw: 'ne' }[oct] || oct || 's'; }
function samplesFor(v) {
  const locals = [[3.9, 3.4], [3.3, 3.2], [2.0, 3.2], [1.3, 2.6]];
  const out = [];
  function face(name) {
    const ang = { e: 0, se: 45, s: 90, sw: 135, w: 180, nw: 225, n: 270, ne: 315 }[name] * Math.PI / 180;
    const sx = Math.cos(ang), sy = Math.sin(ang);
    return { fdx: (sy / (v.TH / 2) + sx / (v.TW / 2)) / 2, fdy: (sy / (v.TH / 2) - sx / (v.TW / 2)) / 2 };
  }
  for (let i = 0; i < locals.length - 1; i++) {
    const a = locals[i], b = locals[i + 1];
    const steps = i === 1 ? 4 : 3;
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      const lx = a[0] + (b[0] - a[0]) * u, ly = a[1] + (b[1] - a[1]) * u;
      out.push({ tag: 'walk-' + i + '.' + s, x: ORIGIN.x + lx, y: ORIGIN.y + ly, fdx: b[0] - a[0], fdy: b[1] - a[1], moving: 1, gait: (s % 4) * 0.25 });
      const se = face('se'), sw = face('sw');
      out.push({ tag: 'se-' + i + '.' + s, x: ORIGIN.x + lx, y: ORIGIN.y + ly, fdx: se.fdx, fdy: se.fdy, moving: 0, gait: 0 });
      out.push({ tag: 'sw-' + i + '.' + s, x: ORIGIN.x + lx, y: ORIGIN.y + ly, fdx: sw.fdx, fdy: sw.fdy, moving: 1, gait: 0.5 });
    }
  }
  const spot = { x: ORIGIN.x + Webs.macar[0], y: ORIGIN.y + Webs.macar[1] };
  ['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw'].forEach(function (name) {
    const h = face(name);
    out.push({ tag: 'spot-' + name, x: spot.x, y: spot.y, fdx: h.fdx, fdy: h.fdy, moving: 0, gait: 0 });
  });
  return out;
}

function trimMask(key) {
  const img = pngs[key];
  const m = new Uint8Array(img.w * img.h);
  const trim = Webs.trim(key);
  if (!trim || !trim.runs) return m;
  for (const run of trim.runs) {
    const y = run[0], x0 = run[1], x1 = run[2];
    for (let x = x0; x < x1; x++) if (y >= 0 && y < img.h && x >= 0 && x < img.w) m[y * img.w + x] = 1;
  }
  return m;
}
const masks = {};
SHEETS.forEach(function (key) { masks[key] = trimMask(key); });

function spriteBox(mask, destX, destY, W, H, flip) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, n = 0;
  const pw = W / SIZE, ph = H / SIZE;
  for (let i = 0; i < mask.length; i++) if (mask[i]) {
    let mx = i % SIZE;
    const my = (i / SIZE) | 0;
    if (flip) mx = SIZE - 1 - mx;
    const x0 = destX + mx * pw, y0 = destY + my * ph;
    if (x0 < minX) minX = x0;
    if (y0 < minY) minY = y0;
    if (x0 + pw > maxX) maxX = x0 + pw;
    if (y0 + ph > maxY) maxY = y0 + ph;
    n++;
  }
  return n ? { minX: minX, minY: minY, maxX: maxX, maxY: maxY } : null;
}

function cover(v, useTrim) {
  const FH = hall(v), k = v.TW / 116, H = 78 * v.ZOOM * FIT, W = H;
  let maxOp = 0, maxBox = 0, above = 0;
  const worst = { tag: 'none', boxTag: 'none', per: {}, uOp: 0, uBox: 0 };
  const spotSe = {};
  for (const s of samplesFor(v)) {
    const oct = octant(v, s.fdx, s.fdy);
    const flip = (s.fdx - s.fdy) < -0.02;
    const stage = s.moving ? ('walk' + Math.min(3, Math.floor((((s.gait || 0) % 1) + 1) % 1 * 4))) : 'idle';
    const mask = poseMask(sharedDir(oct), stage);
    const bob = s.moving ? Math.sin(s.gait * Math.PI * 2) * 1.6 * v.ZOOM : 0;
    const destX = (s.x - s.y) * (v.TW / 2) - W * 0.5;
    const destY = (s.x + s.y) * (v.TH / 2) - bob - H * FOOT_Y;
    const box = spriteBox(mask, destX, destY, W, H, flip);
    const per = {};
    let uOp = 0, uBox = 0;
    for (let r = 0; r < Webs.over.length; r++) {
      const row = Webs.over[r];
      if (SHEETS.indexOf(row[0]) < 0) continue;
      const key = row[0], img = pngs[key], pv = Webs.pivot(key);
      const cut = useTrim ? masks[key] : null;
      const wx = ORIGIN.x + row[1], wy = ORIGIN.y + row[2];
      const up = FH - (row[3] || 0) + (row[4] || 0) * k;
      const sx = (wx - wy) * (v.TW / 2), sy = (wx + wy) * (v.TH / 2);
      const dw = Math.round(img.w * k), dh = Math.round(img.h * k);
      const dx = Math.round(sx - pv[0] * k), dy = Math.round(sy - up - pv[1] * k);
      const capY = sy - FH;
      let n = 0;
      for (let py = 0; py < dh; py++) {
        const isy = Math.min(img.h - 1, Math.floor((py + 0.5) * img.h / dh));
        for (let px = 0; px < dw; px++) {
          const isx = Math.min(img.w - 1, Math.floor((px + 0.5) * img.w / dw));
          const si = isy * img.w + isx;
          if (cut && cut[si]) continue;
          if (img.data[si * 4 + 3] < 128) continue;
          if (dy + py + 0.5 < capY - 2) above++;
          const cx = dx + px + 0.5, cy = dy + py + 0.5;
          const u = (cx - destX) / W, vv = (cy - destY) / H;
          const inBox = box && cx >= box.minX && cx < box.maxX && cy >= box.minY && cy < box.maxY;
          if (inBox) uBox++;
          if (u < 0 || vv < 0 || u >= 1 || vv >= 1) continue;
          let mx = Math.min(SIZE - 1, Math.floor(u * SIZE));
          const my = Math.min(SIZE - 1, Math.floor(vv * SIZE));
          if (flip) mx = SIZE - 1 - mx;
          if (mask[my * SIZE + mx]) { n++; uOp++; }
        }
      }
      per[key] = n;
    }
    if (s.tag === 'spot-se') { spotSe.per = per; spotSe.uOp = uOp; spotSe.uBox = uBox; }
    if (uOp > maxOp) { maxOp = uOp; worst.tag = s.tag; worst.per = per; worst.uOp = uOp; }
    if (uBox > maxBox) { maxBox = uBox; if (!worst.boxTag || uBox === maxBox) worst.boxTag = s.tag; worst.uBox = uBox; }
  }
  return { maxOp: maxOp, maxBox: maxBox, above: above, worst: worst, spotSe: spotSe };
}

function h2(x, y) {
  let n = (x | 0) * 374761393 + (y | 0) * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}
function h3(x, y, s) {
  let n = (x | 0) * 374761393 + (y | 0) * 668265263 + (s | 0) * 1442695041;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}
function newGrid(w, h, f) {
  const g = [];
  for (let y = 0; y < h; y++) { const r = new Uint8Array(w); r.fill(f); g.push(r); }
  return g;
}
function rect(g, x, y, w, h, t) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j] && g[j][i] !== undefined) g[j][i] = t;
}
function sealOuter(g) {
  const h = g.length, w = g[0].length;
  for (let i = 0; i < w; i++) { g[0][i] = 1; g[h - 1][i] = 1; }
  for (let j = 0; j < h; j++) { g[j][0] = 1; g[j][w - 1] = 1; }
}
function caveDisk(g, cx, cy, rx, ry, t) {
  rx = Math.max(1.2, rx); ry = Math.max(1.2, ry);
  const j0 = Math.floor(cy - ry - 1), j1 = Math.ceil(cy + ry + 1);
  const i0 = Math.floor(cx - rx - 1), i1 = Math.ceil(cx + rx + 1);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    if (!g[j] || g[j][i] === undefined) continue;
    const nx = (i + 0.5 - cx) / rx, ny = (j + 0.5 - cy) / ry;
    if (nx * nx + ny * ny < 0.72 + h2(i, j) * 0.32) g[j][i] = t;
  }
}
function carvePath(g, pts, rad, t) {
  rad = rad || 2.2; t = t === undefined ? 0 : t;
  for (let n = 0; n < pts.length - 1; n++) {
    const a = pts[n], b = pts[n + 1];
    const steps = Math.max(3, (Math.hypot(b[0] - a[0], b[1] - a[1]) * 2.2) | 0);
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      const wob = (h2((a[0] + s) | 0, (a[1] + n) | 0) - 0.5) * 1.15;
      const wob2 = (h3((a[0] + s) | 0, (a[1] + n) | 0, 4) - 0.5) * 1.15;
      caveDisk(g, a[0] + (b[0] - a[0]) * u + wob, a[1] + (b[1] - a[1]) * u + wob2, rad + (h2(s, n) - 0.5) * 0.55, rad * 0.82, t);
    }
  }
}
function floorBleed(v, grid) {
  const pieces = Webs.build(grid, Shell.points.pixie, Shell.rooms).filter(function (p) {
    return p.layer === 'floor' && p.room === 'north-web';
  });
  const k = v.TW / 116;
  let raw117 = 0, clip117 = 0, clipPx = 0, rawBad = 0, clipBad = 0;
  for (const piece of pieces) {
    const img = pngs[piece.key], pv = Webs.pivot(piece.key) || [0, 0];
    const dw = Math.round(img.w * k), dh = Math.round(img.h * k);
    const dx0 = Math.round((piece.x - piece.y) * (v.TW / 2) - pv[0] * k);
    const dy0 = Math.round((piece.x + piece.y) * (v.TH / 2) - pv[1] * k);
    const hx = v.TW / 2, hy = v.TH / 2;
    for (let py = 0; py < dh; py++) {
      const isy = Math.min(img.h - 1, Math.floor((py + 0.5) * img.h / dh));
      for (let px = 0; px < dw; px++) {
        const isx = Math.min(img.w - 1, Math.floor((px + 0.5) * img.w / dw));
        if (img.data[(isy * img.w + isx) * 4 + 3] < 128) continue;
        const ix = dx0 + px + 0.5, iy = dy0 + py + 0.5;
        const wx = (iy / hy + ix / hx) / 2, wy = (iy / hy - ix / hx) / 2;
        const ti = Math.floor(wx), tj = Math.floor(wy);
        const t = grid[tj] ? grid[tj][ti] : 1;
        const walk = t === 0 || t === 3 || t === 4;
        if (!walk) { rawBad++; if (ti === 117 && tj === 94) raw117++; }
        else clipPx++;
      }
    }
  }
  return { raw117: raw117, clip117: clip117, clipPx: clipPx, rawBad: rawBad, clipBad: clipBad };
}

const grid = newGrid(144, 118, 1);
Shell.carve(grid, { caveDisk: caveDisk, rect: rect, carvePath: carvePath });
sealOuter(grid);
const pieces = Webs.build(grid, Shell.points.pixie, Shell.rooms);
const west = pieces.filter(function (p) { return p.room === 'north-web' && SHEETS.indexOf(p.key) >= 0; });
assert(west.length === 3, 'the cage room has the three west sheets');
assert(west.every(function (p) { return p.rise === 0 && p.lx === -0.02; }), 'west sheets stay on the inner face with no rise');
const anchors = {};
west.forEach(function (p) { anchors[p.key] = p.ly; });
assert(anchors.web_sheet_corner_b === 2.0 && anchors.web_sheet_span_a === 2.59 && anchors.web_sheet_span_b === 3.21,
  'west sheet anchors are unchanged');
SHEETS.forEach(function (key) {
  const trim = Webs.trim(key), img = pngs[key], cut = masks[key];
  assert(trim && trim.runs && trim.runs.length > 0, key + ' trim is strand runs');
  let cap = 0, keptBelow = 0, flat = 0, run = 0, prev = -2, minY = img.h, painted = 0;
  for (const row of trim.runs) {
    if (row[0] < minY) minY = row[0];
    for (let x = row[1]; x < row[2]; x++) if (img.data[(row[0] * img.w + x) * 4 + 3] < 128) painted++;
  }
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const i = y * img.w + x;
    if (img.data[i * 4 + 3] < 128) continue;
    if (!cut[i] && y < minY + 4) cap++;
    if (!cut[i] && y > minY) keptBelow++;
  }
  for (let x = 0; x < img.w; x++) {
    let bot = -1;
    for (let y = img.h - 1; y >= 0; y--) {
      const i = y * img.w + x;
      if (img.data[i * 4 + 3] >= 128 && !cut[i]) { bot = y; break; }
    }
    const cutHere = bot >= 0 && bot + 1 < img.h && cut[(bot + 1) * img.w + x];
    if (cutHere && bot === prev) run++;
    else { if (run > flat) flat = run; run = cutHere ? 1 : 0; }
    prev = cutHere ? bot : -2;
  }
  if (run > flat) flat = run;
  assert(painted === 0, key + ' deletes only existing strand pixels (' + painted + ' empty)');
  assert(cap > 0, key + ' keeps the cap strand (' + cap + ' px in the rows above the first delete)');
  assert(keptBelow > 0, key + ' keeps strand pixels below the first delete, so the edge is not a horizontal crop');
  assert(flat <= 1, key + ' trimmed edge is not a straight horizontal cut (flat run ' + flat + ')');
});

const results = {};
['laptop', 'phone'].forEach(function (name) {
  const v = viewOf(name);
  const raw = cover(v, false);
  const cut = cover(v, true);
  const floor = floorBleed(v, grid);
  results[name] = { raw: raw, cut: cut, floor: floor };
  console.log('RESULT ' + name + ' untrimmed ' + raw.spotSe.uOp +
    ' span_a ' + raw.spotSe.per.web_sheet_span_a + ' span_b ' + raw.spotSe.per.web_sheet_span_b +
    ' box ' + raw.maxBox + ' trimmed ' + cut.maxOp + ' trimmedBox ' + cut.maxBox + ' above ' + cut.above +
    ' floor117 ' + floor.clip117 + '/' + floor.raw117);
  assert(raw.spotSe.per.web_sheet_span_a > 0 && raw.spotSe.per.web_sheet_span_b > 0,
    name + ' still sees the untrimmed sag (span_a ' + raw.spotSe.per.web_sheet_span_a + ', span_b ' + raw.spotSe.per.web_sheet_span_b + ')');
  assert(raw.maxBox > 0, name + ' untrimmed sheet still crosses Macar\'s box (' + raw.maxBox + ')');
  assert(cut.maxOp === 0, name + ' trimmed coverage along the cage-to-mock walk is 0 px (' + cut.maxOp + ' at ' + cut.worst.tag + ')');
  assert(cut.maxBox === 0, name + ' trimmed sheet misses Macar\'s box (' + cut.maxBox + ' at ' + cut.worst.boxTag + ')');
  assert(cut.above === 0, name + ' no trimmed sheet pixel sits above the cap (' + cut.above + ')');
  assert(floor.raw117 > 0, name + ' had north-wall floor bleed at 117,94 before the clip (' + floor.raw117 + ')');
  assert(floor.clip117 === 0 && floor.clipBad === 0 && floor.clipPx > 0,
    name + ' floor clip clears unwalkable tiles and still paints the floor (' + floor.clipPx + ')');
});

if (failed) { console.error(failed + ' failed'); process.exit(1); }
console.log('coverage ok');

/**
 * L3 web kit v3c: files, floor anchors, lane clearance, bridge ring.
 * Run: node src/campaign/L3Webs.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Webs = require('./L3Webs');
const { readRgba } = require('../qa/pngRgba');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

const root = path.join(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

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

const Shell = require('./L3Shell');
const grid = newGrid(144, 118, 1);
Shell.carve(grid, { caveDisk: caveDisk, rect: rect, carvePath: carvePath });
sealOuter(grid);
const pieces = Webs.build(grid, Shell.points.pixie, Shell.rooms);

assert(Webs.keys.length === 38, 'every web sheet has a sprite key');
Webs.keys.forEach(function (key) {
  const rel = Webs.file(key);
  const abs = path.join(root, rel);
  assert(fs.existsSync(abs), key + ' resolves to ' + rel);
  assert(html.indexOf("SPRITE_FILES." + key + "='" + rel + "'") >= 0, key + ' is registered in SPRITE_FILES');
  const rgba = readRgba(abs);
  let semi = 0;
  for (let i = 3; i < rgba.data.length; i += 4) {
    const a = rgba.data[i];
    if (a !== 0 && a !== 255) semi++;
  }
  assert(semi === 0, key + ' alpha is binary');
});
assert(html.indexOf('cage_paint') < 0 && html.indexOf('l3_pixie_cage') < 0, 'cage paint v2c is not bound');
assert(/ASSET_VER='134'/.test(html), 'ASSET_VER is 134');
assert(/imageSmoothingEnabled=false/.test(html.slice(html.indexOf('function drawL3WebPiece'), html.indexOf('function drawL3WebPiece') + 1800)),
  'web draws disable smoothing');

const cage = pieces.filter(function (p) { return p.room === 'north-web'; });
assert(cage.length > 0, 'the cage room receives the kit');
const bridge = cage.filter(function (p) { return p.key === 'web_bridge_a_N'; })[0];
assert(bridge && bridge.bridge === 1, 'only the cage room carries the bridge');
assert(pieces.filter(function (p) { return p.key === 'web_bridge_a_N'; }).length === 1, 'other rooms do not grow a bridge');

function locals(layer) {
  return cage.filter(function (p) { return p.layer === layer; }).map(function (p) { return [p.lx, p.ly, p.key]; });
}
assert(locals('floor').length === 7, 'each 5x5 has the floor set (back, two bases, three front corners, tangle)');
assert(locals('floor-prop').length === 2 && locals('overhead').filter(function (p) { return p[2].indexOf('cocoon') >= 0; }).length === 2,
  'four cocoons sit along the walls');
assert(cage.some(function (p) { return p.key === 'l3_queen_web' && p.ly === 0; }), 'the queen web is on the north wall');

cage.forEach(function (p) {
  if (p.layer !== 'floor' && p.layer !== 'overhead' && p.layer !== 'floor-prop') return;
  const d = Webs.laneDist(p.lx, p.ly);
  assert(d > 0.30, p.key + ' anchor stays off the lane (' + d.toFixed(2) + ')');
});

const queen = pieces.filter(function (p) { return p.room === 'queen-hall' && p.layer === 'floor'; });
assert(queen.length === 7, 'the queen hall 5x5 gets the floor anchors');
queen.forEach(function (p) {
  assert(Webs.walk(grid, p.x + 0.05, p.y + 0.05), p.key + ' anchor is inside the queen hall floor');
});

const tangle = cage.filter(function (p) { return p.key === 'web_cage_base_tangle'; })[0];
assert(Math.abs(tangle.x - Shell.points.pixie.x) < 1e-6 && Math.abs(tangle.y - Shell.points.pixie.y) < 1e-6,
  'the cage tangle sits on the cage spot');
assert(Webs.walk(grid, tangle.x, tangle.y), 'the cage spot is floor');
['web_floor_corner_S', 'web_floor_corner_E', 'web_floor_corner_W'].forEach(function (key) {
  const p = cage.filter(function (q) { return q.key === key; })[0];
  assert(Webs.walk(grid, p.x, p.y), key + ' is inside the cage-room floor');
});
const back = cage.filter(function (p) { return p.key === 'web_floor_corner_back'; })[0];
assert(!Webs.walk(grid, back.x, back.y) && Webs.walk(grid, back.x + 1.05, back.y + 1.05),
  'the back-corner anchor is the wall-base line, with floor inside the room');

const feet = { x: Shell.points.pixie.x, y: Shell.points.pixie.y };
[[116, 58], [66, 34]].forEach(function (pair) {
  const TW = pair[0], TH = pair[1];
  const FH = 298 * TH / 96 * 0.70;
  const sol = Webs.solveBridge(TW, TH, FH, feet);
  const end = Webs.endScreen(TW, TH, FH, sol.x, sol.y, { x: 0, y: 0 });
  const ringS = {
    x: (sol.ring.x - sol.ring.y) * TW / 2,
    y: (sol.ring.x + sol.ring.y) * TH / 2
  };
  const err = Math.hypot(end.x - ringS.x, end.y - ringS.y);
  assert(err < 0.75, 'bridge pixel (3,86) meets the chain ring at ' + TW + 'x' + TH + ' (' + err.toFixed(3) + 'px)');
});
const lap = Webs.solveBridge(116, 58, 298 * 58 / 96 * 0.70, feet);
assert(Math.abs((lap.x - feet.x) - (Webs.bridgePivot[0] - Webs.cage[0])) < 0.02
  && Math.abs((lap.y - feet.y) - (Webs.bridgePivot[1] - Webs.cage[1])) < 0.02,
  'laptop bridge pivot stays on the mock anchor');

const manifest = fs.readFileSync(path.join(root, 'src/assets/asset-manifest.js'), 'utf8');
Webs.keys.forEach(function (key) {
  assert(manifest.indexOf(JSON.stringify(Webs.file(key))) >= 0, key + ' is in the asset manifest');
});

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('L3 webs ok');

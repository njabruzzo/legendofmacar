/**
 * Floor variants, game-size diamonds, wall-face keys, and wall-top stops.
 * Run: node src/dungeon/FloorVariant.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');

function grab(name) {
  const start = html.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('missing ' + name);
  let i = html.indexOf('{', start);
  let depth = 0;
  for (; i < html.length; i++) {
    const ch = html[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  throw new Error('unclosed ' + name);
}

const caps = html.match(/const WALL_CAP_BAKE=\[[^\]]+\];\nconst WALL_CAP_FILL=\[[^\]]+\];/);
if (!caps) throw new Error('wall cap defaults missing');
const src = caps[0] + '\n' + [
  'floorVariantIndex', 'floorLevelSeed', 'floorVariantKey', 'floorSheetBox',
  'floorDiamondMatches', 'floorBlitBox', 'floorPickKey',
  'floorNativeKey', 'floorDrawSource', 'wallCapStops', 'thresholdAlpha'
].map(grab).join('\n');

function fullBox(w, h) {
  return { x0: 0, y0: 0, x1: w, y1: h, w: w, h: h };
}
const SPR = {
  floor_mine: { width: 512, height: 256, __floorBox: fullBox(512, 256) },
  floor_mine_w1: { width: 512, height: 256, __floorBox: fullBox(512, 256) },
  floor_mine_w2: { width: 288, height: 250, __floorBox: { x0: 3, y0: 4, x1: 285, y1: 249, w: 282, h: 245 } },
  floor_fungi: { width: 512, height: 256 },
  floor_fungi_116: { width: 116, height: 58 },
  floor_mine_66: { width: 66, height: 34 }
};
const ctx = {
  SPR: SPR, TW: 100, Math: Math, Array: Array,
  sprReady: function (k) { return !!(SPR[k] && SPR[k].width); }
};
vm.createContext(ctx);
vm.runInContext(src, ctx);

assert(ctx.floorVariantIndex(2, 4, 9) === ctx.floorVariantIndex(2, 4, 9), 'variant hash is stable');
assert(ctx.floorVariantIndex(2, 4, 9) !== ctx.floorVariantIndex(3, 4, 9), 'level changes the floor hash');
const seen = { 0: 0, 1: 0, 2: 0 };
for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) seen[ctx.floorVariantIndex(2, x, y)]++;
assert(seen[0] > 0 && seen[1] > 0 && seen[2] > 0, 'a floor uses base, _w1, and _w2');
assert([0, 1, 2].indexOf(ctx.floorVariantIndex(4, 1, 1)) >= 0, 'variant slot stays in range');

assert(ctx.floorPickKey('floor_mine', 2, 0, 0, false) === 'floor_mine', 'Chapter I does not swap the base sheet');
let varied = false;
for (let y = 0; y < 8 && !varied; y++) {
  for (let x = 0; x < 8; x++) {
    const key = ctx.floorPickKey('floor_mine', 2, x, y, true);
    if (key === 'floor_mine_w1') varied = true;
  }
}
assert(varied, 'a tileset floor picks _w1 when that sheet matches the base diamond');
let mismatched = false;
for (let y = 0; y < 16 && !mismatched; y++) {
  for (let x = 0; x < 16; x++) {
    if (ctx.floorVariantIndex(2, x, y) !== 2) continue;
    assert(ctx.floorPickKey('floor_mine', 2, x, y, true) === 'floor_mine', 'a variant whose diamond does not match stays on the base sheet');
    mismatched = true;
  }
}
assert(mismatched, 'the hash still visits the mismatched _w2 slot');
assert(ctx.floorPickKey('floor_fungi', 3, 1, 2, true) === 'floor_fungi', 'a missing _w1/_w2 falls back to the base sheet');

ctx.TW = 116;
const desk = ctx.floorDrawSource('floor_fungi', 3, 1, 1, true);
assert(desk && desk.native && desk.key === 'floor_fungi_116', 'TW 116 draws the _116 sheet 1:1');
ctx.TW = 66;
const phone = ctx.floorDrawSource('floor_mine', 2, 3, 3, false);
assert(phone && phone.native && phone.key === 'floor_mine_66', 'TW 66 draws the _66 sheet 1:1');
ctx.TW = 90;
const mid = ctx.floorDrawSource('floor_fungi', 3, 2, 2, true);
assert(mid && mid.native === false && mid.key === 'floor_fungi', 'other tile sizes scale the 512 sheet');
delete SPR.floor_fungi_116;
ctx.TW = 116;
const missing = ctx.floorDrawSource('floor_fungi', 3, 1, 1, true);
assert(missing && missing.native === false && missing.img === SPR.floor_fungi, 'a missing game-size file falls back to the 512 sheet');

const data = new Uint8ClampedArray([10, 20, 30, 40, 1, 2, 3, 200, 4, 5, 6, 127]);
ctx.thresholdAlpha(data, 128);
assert(data[3] === 0 && data[7] === 255 && data[11] === 0, 'alpha below 128 drops and the rest stays solid');

const floorCell = grab('drawFloorCell');
assert(/if\(!\(L&&L\.tileset\)\)[\s\S]*floorBlit\|\|/.test(floorCell), 'a level with no tileset still draws TILEBLIT.floor');
assert(/tintedFloorBlit\(floorBlit, L\.tileset\.tint\)/.test(floorCell), 'a tinted level draws TILEBLIT.floor with only a tint');
assert(/h2\(x,y\)\*variants\.length/.test(floorCell), 'an untinted floor hashes variants the way main does');
assert(/variantFloorBlit\(pick, m, sx, sy\)/.test(floorCell), 'a fungi variant uses the main floor rect');
assert(!/floorBlitBox\(/.test(floorCell) && !/hardFloor\(/.test(floorCell), 'the base sheet is not resized or alpha-cut');
assert(!/floorPickKey\(/.test(floorCell), 'fungi variants are not dropped by the diamond gate');
assert(/floorNativeKey\(key\)/.test(floorCell) && /sprReady\(nativeKey\)/.test(floorCell), 'a real _116 or _66 sheet still draws 1:1');
assert(/SPRITE_FILES\[k\+'_116'\]/.test(html) && /SPRITE_FILES\[k\+'_66'\]/.test(html), 'game-size floor keys are registered when the file exists');

assert(/wall_'\+stem\+'_face'/.test(html) || /'wall_'\+stem\+'_face'/.test(html), 'a wall key looks up tile_wall_<key>_face');
assert(/paintWorkedBricks\(x,w,h,lit\)/.test(html), 'a missing face sheet still draws masonry');
assert(/stem!=='cave' && stem!=='worked' && stem!=='face'/.test(html), 'only a new wall stem opts into the masonry fallback');

const stops = ctx.wallCapStops(null, false);
assert(stops[0] === '#e2c49a' && stops[3] === '#3a2818', 'the default wall top is still the Chapter I tan');
const baked = ctx.wallCapStops(null, true);
assert(baked[0] === '#e2c59a' && baked[3] === '#4a3424', 'the baked cap default is unchanged');
const custom = ctx.wallCapStops({ wallTop: ['#111111', '#222222', '#333333', '#444444'] }, false);
assert(custom[0] === '#111111' && custom[3] === '#444444', 'a palette wallTop replaces the tan');
assert(/wallCapStops\(G\.lvl&&G\.lvl\.pal, false\)/.test(html), 'the iso cap reads the level palette');
assert(/makeWorkedCap\([\s\S]*?L&&L\.pal\)/.test(html), 'the baked cap reads the level palette');
assert(/L\.title='Chapter I'; L\.sub='The Rubble and the Ruby'; L\.pal=PAL\.mine;/.test(html), 'Chapter I still starts on the mine palette');
assert(!/if\(n===1\)\{[^}]{0,400}L\.tileset/.test(html), 'Chapter I makeChapter does not assign a tileset');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('floor variant checks passed');

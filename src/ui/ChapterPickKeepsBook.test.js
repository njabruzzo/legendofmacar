'use strict';
/**
 * A title chapter card keeps the stored book, and a later manual Save
 * does not throw away unlocked chapters, clears, gold, or ghost allies.
 * Run: node src/ui/ChapterPickKeepsBook.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
const saveSrc = fs.readFileSync(path.join(__dirname, '../saves/GameSave.js'), 'utf8');

function grab(n){
  const m = html.match(new RegExp('function ' + n + '\\([\\s\\S]*?\\n\\}'));
  if(!m) throw new Error('missing ' + n);
  return m[0];
}

const saveCtx = { globalThis: {} };
saveCtx.globalThis = saveCtx;
vm.createContext(saveCtx);
vm.runInContext(saveSrc, saveCtx);
const GameSave = saveCtx.GameSave;

const store = {};
const localStorage = {
  getItem(k){ return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
  setItem(k, v){ store[k] = String(v); },
  removeItem(k){ delete store[k]; }
};

const packed = [];
const equipped = [];
let keptFlag = null;
const G = {
  ch: 0, unlocked: 1, cleared: {}, scene: 'chapters',
  coin: { gp: 0 }, ghostAllies: {}
};
function startChapter(n){
  keptFlag = !!G._keepProgress;
  G._keepProgress = 0;
  if(!keptFlag){
    G.unlocked = 1;
    G.cleared = {};
    G.coin = { gp: 0 };
    G.ghostAllies = {};
  }
  G.ch = n;
  G.scene = 'play';
}
function ensurePacks(){ packed.push(G.ch); }
function applyEquipped(){ equipped.push(1); }

const ctx = { localStorage, GameSave, G, startChapter, ensurePacks, applyEquipped, isFinite: Number.isFinite };
vm.createContext(ctx);
vm.runInContext(grab('beginChapterFromList'), ctx);

function wipe(){
  Object.keys(store).forEach(k => delete store[k]);
  G.ch = 0; G.unlocked = 1; G.cleared = {}; G.scene = 'chapters';
  G.coin = { gp: 0 }; G.ghostAllies = {}; G._keepProgress = 0;
  packed.length = 0; equipped.length = 0; keptFlag = null;
}

const book = {
  v: 2, schemaVersion: 2, scene: 'play', ch: 5, unlocked: 4,
  cleared: { 1: 1, 2: 1, 3: 1 },
  coin: { cp: 0, sp: 0, ep: 0, gp: 180, pp: 0 },
  ghostAllies: { pordoom: 1 },
  play: { x: 12, y: 8, flags: { boss: 1 } }
};

wipe();
assert.strictEqual(GameSave.write(localStorage, book), true, 'the stored book is writable');
ctx.beginChapterFromList(3);
assert.strictEqual(keptFlag, true, 'the chapter starts with the book kept');
assert.strictEqual(packed.length, 1, 'packs are ensured from the book');
assert.strictEqual(equipped.length, 1, 'worn gear is applied from the book');
assert.strictEqual(G.ch, 3, 'the picked chapter is the one that starts');
assert.ok(G.unlocked >= 4, 'unlocked does not fall back to chapter I');
assert.strictEqual(G.cleared[1], 1);
assert.strictEqual(G.cleared[2], 1);
assert.strictEqual(G.cleared[3], 1);
assert.strictEqual(G.cleared[4], undefined, 'a skipped chapter is not invented as cleared');
assert.ok(G.coin.gp >= 180, 'gold survives the chapter card');
assert.ok(G.ghostAllies.pordoom, 'ghost allies survive the chapter card');

const before = {
  unlocked: G.unlocked,
  cleared: Object.assign({}, G.cleared),
  gp: G.coin.gp,
  ghost: G.ghostAllies.pordoom
};
const snap = GameSave.snapshot(G, { scene: 'play', play: { x: 3, y: 4, flags: {} } });
assert.strictEqual(GameSave.write(localStorage, snap), true, 'a manual Save after the pick commits');
const again = GameSave.read(localStorage);
assert.ok(again.unlocked >= before.unlocked, 'the save does not lower unlocked');
assert.strictEqual(again.cleared[1], before.cleared[1]);
assert.strictEqual(again.cleared[2], before.cleared[2]);
assert.strictEqual(again.cleared[3], before.cleared[3]);
assert.ok(again.coin.gp >= before.gp, 'the save does not lower gold');
assert.ok(again.ghostAllies.pordoom, 'the save does not drop ghost allies');

wipe();
ctx.beginChapterFromList(1);
assert.strictEqual(keptFlag, false, 'with no book on disk the chapter starts fresh');
assert.strictEqual(G.ch, 1);
assert.strictEqual(packed.length, 0, 'an empty shelf does not apply a campaign');
assert.strictEqual(G.coin.gp, 0);

const ruby = html.match(/The ruby seals the descent from this floor\./);
assert.ok(ruby, 'the ruby door line is unchanged');
assert.ok(/if\(!keep && \(!G\.res\|\|!G\.res\.ironstone&&G\.res\.ironstone!==0\)\) initEconomy\(\)/.test(html),
  'a kept book is not replaced by a blank economy');

console.log('a title chapter keeps the book, and Save does not thin it');

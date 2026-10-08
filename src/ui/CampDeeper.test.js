'use strict';
/**
 * Camp Go deeper walks I→II→III→IV→V and stops.
 * A book made while III skipped to V still loads in V.
 * Run: node src/ui/CampDeeper.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
const saveSrc = fs.readFileSync(path.join(__dirname, '../saves/GameSave.js'), 'utf8');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

assert(!/G\.ch===3\?5/.test(html), 'nothing maps chapter 3 to 5');
assert(/function deeperChapter\(ch\)/.test(html), 'deeperChapter names the next descent');

const meta = html.match(/const CH_META=\{[\s\S]*?\};/)[0];
const chapters = html.match(/const CHAPTERS=\[[^\]]+\];/)[0];
const fn = html.match(/function deeperChapter\(ch\)\{[\s\S]*?\n\}/)[0];
const ctx = {};
vm.createContext(ctx);
vm.runInContext(meta + '\n' + chapters + '\n' + fn + '\nthis.CH_META=CH_META;', ctx);

const expect = { 1: 2, 2: 3, 3: 4, 4: 5, 5: 0 };
[1, 2, 3, 4, 5].forEach(function (ch) {
  const nxt = ctx.deeperChapter(ch);
  const open = ctx.CH_META[nxt] && !ctx.CH_META[nxt].locked ? nxt : 0;
  assert(open === expect[ch], 'camp after ' + ch + ' offers ' + (expect[ch] || 'no further chapter'));
});
assert(ctx.deeperChapter(5) === 0, 'after V the next id is not chapter 6');

const camp = html.match(/function drawCamp\(g\)\{[\s\S]*?\nfunction drawDead/)[0];
const between = html.match(/function drawBetween\(g\)\{[\s\S]*?\nfunction drawCamp/)[0];
assert(/const nxt=deeperChapter\(G\.ch\)/.test(camp), 'camp Go deeper uses deeperChapter');
assert(/const nxt=deeperChapter\(G\.ch\)/.test(between), 'between plate uses the same next chapter');
assert(/if\(CH_META\[nxt\]&&!CH_META\[nxt\]\.locked\)/.test(camp), 'camp starts a chapter only when that chapter exists');
assert(!/startChapter\(6\)/.test(html), 'nothing calls startChapter(6)');

assert(/G\.unlocked=Math\.max\(G\.unlocked,G\.ch\+1\)/.test(html), 'clearing a chapter unlocks the next one');
const select = html.match(/function drawChapterSelect\(g\)\{[\s\S]*?\nfunction enterPlayFromIntro/)[0];
assert(/const book=chapterSelectProgress\(\)/.test(select) && /locked=m\.locked\|\|n>book\.unlocked/.test(select),
  'chapter list seals anything past unlocked');
function sealed(n, unlocked) { return n > unlocked; }
assert(!sealed(4, 4) && sealed(5, 4), 'after III, IV is open on the list and V stays sealed');
assert(!sealed(5, 5), 'clearing IV opens V');

assert(/L\.n===3\?'the dead city'/.test(html), 'chapter III stair still names the dead city');
const lever = html.match(/function openFloorLever\(\)\{[\s\S]*?\n\}/)[0];
const travel = html.match(/function travelFloor\(n\)\{[\s\S]*?\n\}/)[0];
assert(/n\+1/.test(lever) && !/===3\?5/.test(lever), 'floor lever steps one floor');
assert(/n<1\|\|n>5/.test(travel) && /Math\.abs\(n-L\.n\)!==1/.test(travel), 'travel stays on the next or previous floor, 1 through 5');
assert(/CHAPTERS=\[1,2,3,4,5\]/.test(chapters), 'chapter order is I through V');
assert(/4:\{t:'The Dead City'/.test(meta) && /5:\{t:'The Holy Sacrifice'/.test(meta), 'IV is the dead city and V is the sacrifice');

const sctx = { globalThis: null };
sctx.globalThis = sctx;
vm.createContext(sctx);
vm.runInContext(saveSrc, sctx);
const GS = sctx.GameSave;

function storeOf(raw) {
  const store = {
    setItem: function (k, v) { this[k] = v; },
    getItem: function (k) { return this[k] || null; },
    removeItem: function (k) { delete this[k]; }
  };
  store[GS.KEY] = JSON.stringify(raw);
  return store;
}

const inV = GS.read(storeOf({
  v: 2, schemaVersion: 2, scene: 'play', ch: 5, unlocked: 4,
  cleared: { 1: 1, 2: 1, 3: 1 },
  play: { x: 12, y: 8, flags: { w1: 1 } }
}));
assert(inV && inV.ch === 5, 'a book already in V still loads there');
assert(inV.unlocked === 5, 'V stays unlocked when the skip had left it at 4');
assert(!inV.cleared[4], 'skipped IV is not marked cleared');
assert(inV.cleared[3] === 1 && inV.play.x === 12, 'III and the dungeon mark stay');

const won = GS.migrate({
  v: 2, schemaVersion: 2, scene: 'win', ch: 5, unlocked: 4,
  cleared: { 1: 1, 2: 1, 3: 1, 5: 1 }
});
assert(won && won.ch === 5 && won.unlocked === 5 && won.cleared[5] === 1, 'a cleared V stays cleared and open');
assert(!won.cleared[4], 'winning V through the skip does not invent a clear of IV');

const G = {};
GS.applyCampaign(G, { v: 2, scene: 'play', ch: 5, unlocked: 4, cleared: { 3: 1 } });
assert(G.ch === 5 && G.unlocked === 5 && !G.cleared[4], 'apply keeps them in V and opens the list');

const campSave = GS.migrate({
  v: 2, schemaVersion: 2, scene: 'camp', ch: 3, unlocked: 4,
  cleared: { 1: 1, 2: 1, 3: 1 }
});
assert(campSave.unlocked === 4 && campSave.ch === 3, 'camp after III still leaves V sealed');
assert(sealed(5, campSave.unlocked) && !sealed(4, campSave.unlocked), 'that book can start IV and not V');

const walkedBack = GS.migrate({
  v: 2, schemaVersion: 2, scene: 'play', ch: 4, unlocked: 4,
  cleared: { 3: 1 },
  floorWorlds: { 5: { x: 8, y: 28, flags: {} } }
});
assert(walkedBack.ch === 4 && walkedBack.unlocked === 5, 'a saved V floor stays reachable after walking up');

const legacy = GS.migrate({
  v: 1, scene: 'play', ch: 5, unlocked: 4, cleared: { 3: 1 },
  play: { x: 3, y: 4 }
});
assert(legacy && legacy.v === 2 && legacy.ch === 5 && legacy.unlocked === 5, 'a v1 book in V still loads');

const legacyFloor = GS.toLegacy({
  v: 2, ch: 4, unlocked: 4, cleared: {},
  floorWorlds: { 4: { x: 1, y: 2, flags: {} }, 6: { x: 9, y: 9 } }
});
assert(legacyFloor.floorWorlds[4] && !legacyFloor.floorWorlds[6], 'legacy mirror keeps IV and drops a sixth floor');

if (failed) { console.error('\n' + failed + ' failed'); process.exit(1); }
console.log('\ncamp deeper checks passed');

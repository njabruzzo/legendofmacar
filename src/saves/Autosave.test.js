'use strict';
/**
 * Autosave policy: only loadable books, fresh descent before any gap,
 * and a throttled hide / interval write. Burn it must not clear the slot
 * before that fresh book is stored.
 * Run: node src/saves/Autosave.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const src = fs.readFileSync(path.join(__dirname, 'Autosave.js'), 'utf8');
const gsSrc = fs.readFileSync(path.join(__dirname, 'GameSave.js'), 'utf8');

const ctx = { globalThis: {} };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(src, ctx);
vm.runInContext(gsSrc, ctx);
const A = ctx.Autosave;
const GS = ctx.GameSave;

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

const hero = { hero: 1, dead: 0, x: 12, y: 8, hp: 20 };
const level = { n: 1, flags: {} };

assert(A.PERIOD_SEC >= 60 && A.PERIOD_SEC <= 120, 'periodic save sits in the 60–120s window');
assert(A.HIDE_GAP_MS >= 200 && A.HIDE_GAP_MS <= 2000, 'hide debounce collapses a double event without skipping a real dismiss');

assert(A.loadable({ scene: 'play', lvl: level, ents: [hero] }) === true, 'living play is loadable');
assert(A.loadable({ scene: 'play', paused: true, lvl: level, ents: [hero] }) === true, 'pause is still the play book');
assert(A.loadable({ scene: 'camp' }) === true, 'camp loads without a level');
assert(A.loadable({ scene: 'pack', packFrom: 'play', lvl: level, ents: [hero] }) === true, 'pack opened from the seam saves the descent');
assert(A.loadable({ scene: 'pack', packFrom: 'camp' }) === true, 'pack opened from camp stays a camp book');
assert(A.loadable({ scene: 'craft', craftFrom: 'play', lvl: level, ents: [hero] }) === true, 'craft at the seam is loadable');
assert(A.loadable({ scene: 'craft', craftFrom: 'camp' }) === true, 'craft from camp stays a camp book');
assert(A.loadable({ scene: 'trade', lvl: level, ents: [hero] }) === true, 'trade keeps the descent');

assert(A.loadable({ scene: 'title', lvl: level, ents: [hero] }) === false, 'title never overwrites a book');
assert(A.loadable({ scene: 'title_menu', lvl: level, ents: [hero] }) === false, 'title menu never overwrites a book');
assert(A.loadable({ scene: 'dead', lvl: level, ents: [hero] }) === false, 'death screen is not saved');
assert(A.loadable({ scene: 'win', lvl: level, ents: [hero] }) === false, 'win plate is not saved');
assert(A.loadable({ scene: 'intro', lvl: level, ents: [hero] }) === false, 'intro is not saved');
assert(A.loadable({ scene: 'chapters', lvl: level, ents: [hero] }) === false, 'chapter list is not saved in place');
assert(A.loadable({ scene: 'credits', lvl: level, ents: [hero] }) === false, 'credits is not saved in place');
assert(A.loadable({ scene: 'play', talk: { key: 'noz' }, lvl: level, ents: [hero] }) === false, 'mid-dialog is not saved');
assert(A.loadable({ scene: 'play', mercyTalk: 1, lvl: level, ents: [hero] }) === false, 'mercy talk is not saved');
assert(A.loadable({ scene: 'play', lvl: level, ents: [{ hero: 1, dead: 1 }] }) === false, 'a fallen hero is not written as play');
assert(A.loadable({ scene: 'play', ents: [hero] }) === false, 'play without a level is not saved');
assert(A.loadable(null) === false, 'missing state is not saved');

assert(A.bookScene({ scene: 'camp' }) === 'camp', 'camp book stays camp');
assert(A.bookScene({ scene: 'pack', packFrom: 'camp' }) === 'camp', 'camp pack is stored as camp');
assert(A.bookScene({ scene: 'craft', craftFrom: 'camp' }) === 'camp', 'camp craft is stored as camp');
assert(A.bookScene({ scene: 'play' }) === 'play', 'play book stays play');
assert(A.bookScene({ scene: 'pack', packFrom: 'play' }) === 'play', 'seam pack is stored as play');
assert(A.bookScene({ scene: 'chapters' }) === 'play', 'a flushed chapter list still names the descent');

assert(A.due('fresh', 0, 0, 0, 0) === true, 'a new descent saves immediately');
assert(A.due('tick', 89, 0, 0, 0) === false, 'tick waits out the interval');
assert(A.due('tick', 90, 0, 0, 0) === true, 'tick saves once the interval elapses');
assert(A.due('tick', 10, 0, 0, 0) === false, 'a fresh book is not rewritten a few seconds later');
assert(A.due('hide', 1, 0, 1000, 700) === false, 'visibilitychange and pagehide share one write');
assert(A.due('hide', 1, 0, 1000, 1000 - A.HIDE_GAP_MS) === true, 'a later hide writes again');
assert(A.due('hide', 0, 0, 5000, 0) === true, 'the first hide of a session writes');

assert(/src\/saves\/Autosave\.js/.test(html), 'index.html loads Autosave');
assert(/function beginFreshDescent\(/.test(html), 'new runs go through beginFreshDescent');
{
  const fresh = (html.match(/function beginFreshDescent\(\)\{[\s\S]*?\n\}/) || [])[0] || '';
  assert(/startChapter\(1\)/.test(fresh) && /autosaveNow\('fresh'\)/.test(fresh), 'fresh descent saves after the chapter exists');
  const startAt = fresh.indexOf('startChapter(1)');
  const saveAt = fresh.indexOf("autosaveNow('fresh')");
  assert(startAt >= 0 && saveAt > startAt, 'the save runs after startChapter returns');
  assert(!/GameSave\.clear/.test(fresh), 'beginFreshDescent does not wipe the slot');
}
{
  const at = html.indexOf("menuBtn(g,'Burn it'");
  const burn = at < 0 ? '' : html.slice(at, at + 220);
  assert(/beginFreshDescent\(\)/.test(burn), 'Burn it starts a fresh descent');
  assert(!/GameSave\.clear/.test(burn), 'Burn it does not clear the book before the new save');
}
assert(/menuBtn\(g,'New descent', VW\/2, y, bw, btnH, \(\)=>beginFreshDescent\(\)/.test(html), 'blank New descent saves the new run');
assert(/function autosaveNow\(/.test(html) && /autosaveNow\('tick'\)/.test(html), 'play ticks a quiet save');
assert(/visibilitychange/.test(html) && /pagehide/.test(html) && /autosaveNow\('hide'\)/.test(html), 'hide and unload flush a quiet save');
assert(/function openChapters\(/.test(html) && /autosaveNow\('hide'\)/.test((html.match(/function openChapters\(\)\{[\s\S]*?\n\}/) || [])[0] || ''), 'leaving for the chapter list flushes first');
assert(/function openCredits\(/.test(html) && /autosaveNow\('hide'\)/.test((html.match(/function openCredits\([\s\S]*?\n\}/) || [])[0] || ''), 'leaving for credits flushes first');
assert(/function noteQuietSave\(/.test(html) && /noteQuietSave\(\)/.test((html.match(/function loadSavedGame\(\)\{[\s\S]*?\n\}/) || [])[0] || ''), 'Continue does not immediately rewrite the book it just opened');
assert(!/GameSave\.clear\(localStorage\)/.test(html), 'the page no longer erases the slot out from under a new run');

/* Burn it used to clear, then hope a later checkpoint rewrote the slot.
   Overwriting with the fresh book leaves a readable save even if the
   player reloads before the next camp. */
function memStore() {
  const s = {};
  s.setItem = function (k, v) { this[k] = v; };
  s.getItem = function (k) { return this[k] || null; };
  s.removeItem = function (k) { delete this[k]; };
  return s;
}
const oldBook = GS.snapshot({
  scene: 'play', ch: 2, unlocked: 3, cleared: { 1: 1 },
  packs: { macar: { ammo: 3 } }, coin: { gp: 12 }
}, { scene: 'play', play: { x: 40, y: 12, hp: 30, maxhp: 40, flags: { placed: 1 } } });
const freshBook = GS.snapshot({
  scene: 'play', ch: 1, unlocked: 1, cleared: {},
  packs: { macar: { ammo: 0 } }, coin: { gp: 0 }
}, { scene: 'play', play: { x: 20.5, y: 22, hp: 48, maxhp: 48, flags: {} } });
const store = memStore();
assert(GS.write(store, oldBook) === true, 'an older book can be stored');
assert(GS.write(store, freshBook) === true, 'the fresh descent overwrites that slot');
const kept = GS.read(store);
assert(kept && kept.ch === 1 && kept.play && Math.abs(kept.play.x - 20.5) < 0.01, 'reload after Burn it still has the new run');
assert(GS.has(store) === true, 'Burn it does not leave the book empty');

const legacy = memStore();
legacy.setItem(GS.KEY_V1, JSON.stringify({
  v: 1, scene: 'play', ch: 1, unlocked: 2, cleared: {},
  play: { x: 20.5, y: 22, hp: 40, maxhp: 40, flags: { broke: 1 }, secrets: [], loot: [], party: [] }
}));
const old = GS.read(legacy);
assert(old && old.ch === 1 && old.play && old.play.flags && old.play.flags.broke === 1, 'a v1 book still opens');
assert(GS.has(legacy) === true, 'Continue still sees a legacy slot');

if (failed) { console.error('\n' + failed + ' failed'); process.exit(1); }
console.log('\nAutosave checks passed');

'use strict';
/**
 * Title Chapters reads the book's unlocked chapter without loading the run.
 * Run: node src/ui/ChapterSelectUnlock.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
function grab(n){
  const m = html.match(new RegExp('function ' + n + '\\([\\s\\S]*?\\n\\}'));
  if(!m) throw new Error('missing ' + n);
  return m[0];
}

const store = {};
const localStorage = {
  getItem(k){ return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
  setItem(){ throw new Error('chapter list must not write the save'); },
  removeItem(){ throw new Error('chapter list must not clear the save'); }
};
const GameSave = {
  KEY: 'legendofmacar.save.v2',
  KEY_PENDING: 'legendofmacar.save.v2.pending',
  KEY_GOOD: 'legendofmacar.save.v2.good',
  KEY_V1: 'legendofmacar.save.v1',
  read(store){
    const raw = store.getItem(GameSave.KEY);
    if(!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  },
  applyCampaign(G, snap){
    if(typeof snap.unlocked==='number') G.unlocked=snap.unlocked;
    if(snap.cleared) G.cleared=snap.cleared;
    if(snap.coin) G.coin=snap.coin;
    if(snap.ghostAllies) G.ghostAllies=snap.ghostAllies;
    return snap;
  }
};
const G = { ch: 0, unlocked: 1, cleared: {} };
const started = [];
function startChapter(n){ started.push(n); }
const ctx = { localStorage, GameSave, G, startChapter, isFinite: Number.isFinite };
vm.createContext(ctx);
vm.runInContext(
  ['bookSnapUsable', 'savedBookProgress', 'chapterSelectProgress', 'beginChapterFromList'].map(grab).join('\n'),
  ctx
);

function put(key, obj){ store[key] = JSON.stringify(obj); }
function wipe(){
  Object.keys(store).forEach(k => delete store[k]);
  G.ch = 0; G.unlocked = 1; G.cleared = {};
  started.length = 0;
}

wipe();
assert.strictEqual(ctx.savedBookProgress(), null, 'a blank book has nothing to peek');
assert.strictEqual(ctx.chapterSelectProgress().unlocked, 1);

wipe();
put(GameSave.KEY, { v: 2, schemaVersion: 2, ch: 4, unlocked: 4, cleared: { 1: 1, 2: 1, 3: 1 }, scene: 'play' });
put(GameSave.KEY_GOOD, { v: 2, unlocked: 1, cleared: {} });
let book = ctx.chapterSelectProgress();
assert.strictEqual(book.unlocked, 4, 'title list uses the live slot unlock');
assert.strictEqual(book.cleared[3], 1, 'title list can mark chapters the book already cleared');
assert.strictEqual(G.unlocked, 1, 'peeking does not copy unlock onto the session');
assert.deepStrictEqual(G.cleared, {}, 'peeking does not copy cleared onto the session');
assert.strictEqual(G.ch, 0, 'peeking does not start a chapter');

ctx.beginChapterFromList(4);
assert.deepStrictEqual(started, [4], 'a chapter card still starts that chapter');
assert.strictEqual(G.unlocked, 4, 'choosing a card adopts the book unlock into the session');
assert.strictEqual(store[GameSave.KEY].includes('"unlocked":4'), true, 'the stored book is untouched');

wipe();
put(GameSave.KEY, '{not-json');
put(GameSave.KEY_GOOD, { v: 2, ch: 4, unlocked: 4, cleared: { 1: 1 } });
book = ctx.savedBookProgress();
assert.strictEqual(book.unlocked, 4, 'a broken live slot falls through to last-known-good');

wipe();
put(GameSave.KEY, { v: 2, ch: 4, unlocked: 9, play: { ents: 'nope' } });
put(GameSave.KEY_GOOD, { v: 2, ch: 3, unlocked: 3, cleared: {} });
assert.strictEqual(ctx.savedBookProgress().unlocked, 3, 'a snap the book would reject does not win');

wipe();
put(GameSave.KEY_PENDING, { v: 2, ch: 3, unlocked: 3 });
put(GameSave.KEY_GOOD, { v: 2, ch: 5, unlocked: 5 });
assert.strictEqual(ctx.savedBookProgress().unlocked, 3, 'pending is preferred over good when live is missing');

wipe();
put(GameSave.KEY_V1, { v: 1, ch: 4, unlocked: 4, cleared: { 1: 1, 2: 1, 3: 1 } });
assert.strictEqual(ctx.savedBookProgress().unlocked, 4, 'a v1 book still names its unlock');

wipe();
put(GameSave.KEY, { v: 2, scene: 'play' });
assert.strictEqual(ctx.savedBookProgress().unlocked, 1, 'a book with no chapter and no unlock stays at chapter I');

wipe();
put(GameSave.KEY, {
  v: 2, ch: 5, unlocked: 4, cleared: { 1: 1, 2: 1, 3: 1 },
  floorWorlds: { 5: { x: 8, y: 28, flags: {} } }
});
book = ctx.chapterSelectProgress();
assert.strictEqual(book.unlocked, 5, 'an old skip into V is on the list');
assert.strictEqual(book.cleared[4], undefined, 'the skipped chapter is not marked cleared');
assert.strictEqual(G.unlocked, 1, 'listing a reached chapter does not copy the book onto the session');

wipe();
put(GameSave.KEY, { v: 2, ch: 4, unlocked: 4 });
G.ch = 2; G.unlocked = 2; G.cleared = { 1: 1 };
book = ctx.chapterSelectProgress();
assert.strictEqual(book.unlocked, 2, 'a run already in memory keeps its own unlock');
assert.strictEqual(book.cleared[1], 1);
ctx.beginChapterFromList(2);
assert.strictEqual(G.unlocked, 2, 'an in-run chapter pick does not import the book');
assert.deepStrictEqual(started, [2]);

const select = html.match(/function drawChapterSelect\(g\)\{[\s\S]*?\nfunction enterPlayFromIntro/)[0];
assert.ok(/chapterSelectProgress\(\)/.test(select), 'the chapter list asks the book');
assert.ok(/beginChapterFromList\(n\)/.test(select), 'cards start through the list helper');
assert.ok(/locked=m\.locked\|\|n>book\.unlocked/.test(select), 'the list seals on the book progress');
assert.ok(!/n>G\.unlocked/.test(select), 'the list no longer locks on the blank session unlock');
assert.ok(!/loadSavedGame\(/.test(select), 'opening the list does not load the run');
const listFn = grab('beginChapterFromList');
assert.ok(/GameSave\.read\(/.test(listFn) && /applyCampaign\(/.test(listFn),
  'a title card loads the stored book before play');
assert.ok(/ensurePacks\(/.test(listFn) && /applyEquipped\(/.test(listFn) && /G\._keepProgress=1/.test(listFn),
  'the loaded book is kept into the chapter');
assert.ok(/fn:\(\)=>startChapter\(n\)/.test(listFn),
  'the card starts play through startChapter');
assert.ok(!/writeGameSave\(/.test(listFn) && !/autosaveNow\(/.test(listFn),
  'picking a chapter does not write the book');
const peekFns = ['bookSnapUsable', 'savedBookProgress', 'chapterSelectProgress'].map(grab).join('\n');
assert.ok(!/migrate\(/.test(peekFns) && !/applyCampaign\(/.test(peekFns),
  'the peek does not call migrate or applyCampaign');

const menu = html.match(/function drawTitleMenu\(g\)\{[\s\S]*?\nfunction drawCredits/)[0];
const chapterBtns = [];
const chapterBtnRe = /menuBtn\(g,'Chapters',/g;
let chapterBtnAt;
while((chapterBtnAt = chapterBtnRe.exec(menu))){
  const call = menu.slice(chapterBtnAt.index).match(/menuBtn\(g,'Chapters',[\s\S]*?\)\s*=>\s*\{[\s\S]*?\}/);
  assert.ok(call, 'a Chapters button has a handler');
  chapterBtns.push(call[0]);
}
assert.ok(chapterBtns.length>=1, 'the title menu has a Chapters button');
chapterBtns.forEach(function(handler){
  const direct = /G\.scene='chapters'/.test(handler);
  const via = /openChapters\(\)/.test(handler);
  assert.ok((direct || via) && direct!==via,
    'the title Chapters button still only changes the scene');
  assert.ok(!/startChapter\(/.test(handler) && !/beginChapterFromList\(/.test(handler),
    'the title Chapters button does not open a chapter');
});
const openChaptersFn = html.match(/function openChapters\(\)\{[\s\S]*?\n\}/);
if(openChaptersFn){
  const body = openChaptersFn[0];
  assert.ok(/G\.scene='chapters'/.test(body), 'openChapters switches to the chapter list');
  assert.ok(/autosaveNow\(/.test(body), 'openChapters flushes the book');
  const calls = (body.match(/[A-Za-z_][A-Za-z0-9_]*\(/g) || []).filter(function(c){
    return c!=='openChapters(' && c!=='autosaveNow(' && c!=='if(';
  });
  assert.deepStrictEqual(calls, [], 'openChapters only flushes, then shows the list');
  assert.ok(!/startChapter\(/.test(body) && !/beginChapterFromList\(/.test(body) && !/G\.ch\s*=/.test(body),
    'openChapters does not open a chapter');
}

console.log('title chapters follow the saved unlock without loading the run');

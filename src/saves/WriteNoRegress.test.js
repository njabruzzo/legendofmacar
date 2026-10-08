'use strict';
/**
 * Quiet saves keep a stored unlock and every stored clear.
 * Manual Save and Burn it still replace the book.
 * Run: node src/saves/WriteNoRegress.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
const src = fs.readFileSync(path.join(__dirname, 'GameSave.js'), 'utf8');

function grab(n) {
  const m = html.match(new RegExp('function ' + n + '\\([\\s\\S]*?\\n\\}'));
  if (!m) throw new Error('missing ' + n);
  return m[0];
}

const ctx = { globalThis: null };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(src, ctx);
const GS = ctx.GameSave;

function mem() {
  const s = {
    setItem: function (k, v) { this[k] = v; },
    getItem: function (k) { return this[k] || null; },
    removeItem: function (k) { delete this[k]; }
  };
  return s;
}

const store = mem();
const book = GS.snapshot({
  ch: 4, unlocked: 4, cleared: { 1: 1, 2: 1, 3: 1 },
  coin: { gp: 40 }, scene: 'play'
}, { scene: 'play', play: { x: 12, y: 8, flags: { kept: 1 } } });
assert.strictEqual(GS.write(store, book), true);

const thin = GS.snapshot({
  ch: 1, unlocked: 1, cleared: {},
  coin: { gp: 0 }, scene: 'play'
}, { scene: 'play', play: { x: 3, y: 4, flags: { lever: 1 } } });
assert.strictEqual(GS.writeNoRegress(store, thin), true, 'a quiet save still writes');
const kept = GS.read(store);
assert.ok(kept.unlocked >= 4, 'a quiet save does not lower unlocked');
assert.strictEqual(kept.cleared[1], 1);
assert.strictEqual(kept.cleared[2], 1);
assert.strictEqual(kept.cleared[3], 1, 'a quiet save does not drop a cleared mark');
assert.strictEqual(kept.ch, 1, 'the quiet save still records the chapter now in play');
assert.ok(kept.play && kept.play.flags && kept.play.flags.lever === 1, 'the quiet save still records the new mark');

const raised = GS.snapshot({
  ch: 4, unlocked: 5, cleared: { 1: 1, 2: 1, 3: 1, 4: 1 },
  scene: 'play'
}, { scene: 'camp' });
assert.strictEqual(GS.writeNoRegress(store, raised), true);
const opened = GS.read(store);
assert.ok(opened.unlocked >= 5, 'a later unlock is kept');
assert.strictEqual(opened.cleared[4], 1, 'a new clear is kept');
assert.strictEqual(opened.cleared[2], 1, 'older clears stay beside the new one');

const falsy = mem();
GS.write(falsy, GS.snapshot({
  ch: 3, unlocked: 3, cleared: { 1: 1, 2: 0 }, scene: 'play'
}, { scene: 'play' }));
GS.writeNoRegress(falsy, GS.snapshot({
  ch: 1, unlocked: 1, cleared: {}, scene: 'play'
}, { scene: 'play' }));
const marks = GS.read(falsy);
assert.strictEqual(marks.cleared[1], 1, 'a real clear is put back');
assert.ok(!marks.cleared[2], 'a falsy cleared mark is not progress');

const bare = mem();
assert.strictEqual(GS.writeNoRegress(bare, thin), true, 'an empty slot accepts the first quiet save');
assert.strictEqual(GS.read(bare).unlocked, 1);

const manual = mem();
GS.write(manual, book);
assert.strictEqual(GS.write(manual, thin), true, 'manual Save still overwrites');
const replaced = GS.read(manual);
assert.strictEqual(replaced.unlocked, 1, 'manual Save may lower unlocked');
assert.ok(!replaced.cleared[3], 'manual Save may drop a cleared mark');

const writer = grab('writeGameSave');
assert.ok(/const passed=!!snap;/.test(writer), 'a prepared snap is told apart from a checkpoint');
assert.ok(/quiet && !passed && typeof GameSave\.writeNoRegress==='function'/.test(writer), 'a checkpoint uses writeNoRegress');
assert.ok(/GameSave\.writeNoRegress\(localStorage, snap\)/.test(writer));
assert.ok(/else ok=!!GameSave\.write\(localStorage, snap\)/.test(writer), 'manual Save and a prepared snap still call write');
const confirm = writer.match(/if\(!quiet\)\{[\s\S]*?\n  \}/);
assert.ok(confirm && !/writeNoRegress/.test(confirm[0]), 'the spoken Save does not guard the book');

['beginCh1ElevatorDescent', 'travelFloor', 'campRest', 'endChapter'].forEach(function (name) {
  assert.ok(/writeGameSave\(true\)/.test(grab(name)), name + ' is a quiet save');
});
assert.ok(/G\.cleared\[5\]=1;writeGameSave\(true\)/.test(html), 'the king\'s death is a quiet save');

const burnAt = html.indexOf("menuBtn(g,'Burn it'");
const burn = burnAt < 0 ? '' : html.slice(burnAt, burnAt + 280);
assert.ok(!/writeNoRegress/.test(burn), 'Burn it is not the quiet-save guard');
assert.ok(/GameSave\.clear\(localStorage\)/.test(burn) || /beginFreshDescent\(\)/.test(burn), 'Burn it replaces the book on its own');
assert.ok(/menuBtn\(g,'Save game'[\s\S]{0,180}writeGameSave\(\)/.test(html), 'pause Save is the unguarded write');

console.log('writeNoRegress keeps unlocks and clears on a quiet save');

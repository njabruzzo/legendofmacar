'use strict';
/**
 * Quill's ruby and lever lines apply only on chapters III and IV.
 * I, II, and V keep the older sentences.
 * Run: node src/ui/QuillFloorCopy.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
function grab(n){
  const m = html.match(new RegExp('function ' + n + '\\([\\s\\S]*?\\n\\}'));
  if (!m) throw new Error('missing ' + n);
  return m[0];
}

const OLD_SEAL = 'The ruby seals the descent from this floor.';
const OLD_OPEN = 'The ruby has opened the way down.';
const OLD_LEVER = 'Choose a floor. The ruby seals the way down.';
const NEW_SEAL = 'The ruby holds the old lever. The stair waits past the boss.';
const NEW_OPEN = 'The ruby has freed the old lever.';
const NEW_LEVER = 'Choose a floor. The ruby holds this lever.';

assert.ok(html.includes(OLD_SEAL) && html.includes(OLD_OPEN) && html.includes(OLD_LEVER), 'older ruby lines stay in the source');
assert.ok(html.includes(NEW_SEAL) && html.includes(NEW_OPEN) && html.includes(NEW_LEVER), 'Quill lines are in the source');

const c = {
  G: { lvl: null, props: [], talk: null, paused: false },
  floorTravelReady(){ return false; },
  startTalkObj(pack){
    c.G.talk = { key: pack.key, who: pack.who, line: pack.line, choices: (pack.choices || []).slice() };
  }
};
vm.createContext(c);
vm.runInContext(['floorRubyLine', 'floorLeverLine', 'openFloorLever', 'openFloorRuby'].map(grab).join('\n'), c);

function lvl(n, on){
  return { n: n, flags: { floorRubyActivated: on ? 1 : 0 } };
}

[1, 2, 5].forEach(function (n) {
  assert.strictEqual(c.floorRubyLine(lvl(n, 0)), OLD_SEAL, 'chapter ' + n + ' ruby door keeps the sealed descent');
  assert.strictEqual(c.floorRubyLine(lvl(n, 1)), OLD_OPEN, 'chapter ' + n + ' ruby door keeps the opened way');
  assert.strictEqual(c.floorLeverLine(lvl(n, 0)), OLD_LEVER, 'chapter ' + n + ' lever keeps the sealed way');
});
[3, 4].forEach(function (n) {
  assert.strictEqual(c.floorRubyLine(lvl(n, 0)), NEW_SEAL, 'chapter ' + n + ' ruby door names the old lever');
  assert.strictEqual(c.floorRubyLine(lvl(n, 1)), NEW_OPEN, 'chapter ' + n + ' ruby door frees the lever');
  assert.strictEqual(c.floorLeverLine(lvl(n, 0)), NEW_LEVER, 'chapter ' + n + ' lever says the ruby holds it');
});

[1, 2].forEach(function (n) {
  c.G.lvl = lvl(n, 0);
  c.G.props = [{ k: 'floorRubyDoor', x: 1, y: 1 }];
  c.openFloorRuby();
  assert.strictEqual(c.G.talk.who, 'RUBY DOOR');
  assert.strictEqual(c.G.talk.line, OLD_SEAL, 'openFloorRuby on ' + n + ' speaks the old seal');
  c.openFloorLever();
  assert.strictEqual(c.G.talk.who, 'FLOOR LEVER');
  assert.strictEqual(c.G.talk.line, OLD_LEVER, 'openFloorLever on ' + n + ' speaks the old seal');
  c.G.lvl.flags.floorRubyActivated = 1;
  c.openFloorRuby();
  assert.strictEqual(c.G.talk.line, OLD_OPEN, 'an activated ruby on ' + n + ' keeps the old line');
});
[3, 4].forEach(function (n) {
  c.G.lvl = lvl(n, 0);
  c.G.props = [{ k: 'floorRubyDoor', x: 1, y: 1 }];
  c.openFloorRuby();
  assert.strictEqual(c.G.talk.who, 'RUBY DOOR');
  assert.strictEqual(c.G.talk.line, NEW_SEAL, 'openFloorRuby on ' + n + ' speaks Quill');
  c.openFloorLever();
  assert.strictEqual(c.G.talk.who, 'FLOOR LEVER');
  assert.strictEqual(c.G.talk.line, NEW_LEVER, 'openFloorLever on ' + n + ' speaks Quill');
  c.G.lvl.flags.floorRubyActivated = 1;
  c.openFloorRuby();
  assert.strictEqual(c.G.talk.line, NEW_OPEN, 'an activated ruby on ' + n + ' frees the lever');
});

console.log('Quill ruby copy: III and IV, older lines on I, II, and V');

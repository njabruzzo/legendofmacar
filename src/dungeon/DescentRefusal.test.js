'use strict';
/**
 * Stair refusal names what is actually still shut.
 * The boolean gate (when the stair opens) stays as it was.
 * Run: node src/dungeon/DescentRefusal.test.js
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

const hints = [];
const c = {
  G: { lvl: null, props: [], ents: [], scene: 'play' },
  hint(t){ hints.push(t); },
  floorTravelReady(){ return !!c.ruby; },
  endChapter(){ c.G.scene = 'camp'; },
  player(){ return c.hero; },
  ruby: false,
  hero: null
};
vm.createContext(c);
vm.runInContext(['livingFloorFoes', 'foeBearingWord', 'chapterDescentRefusal', 'useChapterDescent'].map(grab).join('\n'), c);

function foe(x, y, extra){
  return Object.assign({ team: 'foe', dead: false, npc: false, x: x, y: y, name: 'Foe' }, extra || {});
}
function setup(n, opts){
  opts = opts || {};
  hints.length = 0;
  c.G.scene = 'play';
  c.G.ents = opts.ents || [];
  c.hero = opts.hero === undefined ? { x: 0, y: 0 } : opts.hero;
  c.ruby = !!opts.ruby;
  c.G.lvl = {
    n: n,
    stair: opts.stair === false ? null : { x: 0, y: 0 },
    flags: { done: opts.done ? 1 : 0, boss: opts.boss ? 1 : 0 },
    objs: []
  };
}
function oldOpens(n, done, ruby, hasStair){
  if(!hasStair) return false;
  if((n === 3 || n === 4) && !done) return false;
  if(!ruby) return false;
  return true;
}

for(const n of [2, 3, 4, 5]){
  for(const done of [0, 1]){
    for(const ruby of [0, 1]){
      for(const count of [0, 2]){
        setup(n, {
          done: done, ruby: ruby,
          ents: count ? [foe(8, 0), foe(0, 6)] : []
        });
        const got = c.useChapterDescent();
        const want = oldOpens(n, done, ruby, true);
        assert.strictEqual(got, want, 'gate n=' + n + ' done=' + done + ' ruby=' + ruby + ' foes=' + count);
        assert.strictEqual(c.G.scene, want ? 'camp' : 'play');
      }
    }
  }
}

setup(3, { done: 1, ruby: 1, stair: false });
assert.strictEqual(c.useChapterDescent(), false, 'no stair, no descent');
assert.strictEqual(hints.length, 0, 'a missing stair does not scold');

const RUBY = 'Activate this floor\u2019s ruby door before descending.';

setup(3, { done: 0, ruby: 1, ents: [foe(10, 0, { name: 'Duergar' }), foe(0, 40, { name: 'Orc' })] });
assert.strictEqual(c.useChapterDescent(), false);
assert.strictEqual(hints[0], '2 foes still hold this floor, to the east.');
assert.ok(!/guardian before descending/i.test(hints[0]), 'III does not ask for a guardian already dead');

setup(4, {
  done: 0, ruby: 0,
  ents: [foe(0, -4, { name: 'Mind Flayer' }), foe(-20, 0, { name: 'Mustard Jelly' })]
});
assert.strictEqual(c.useChapterDescent(), false);
assert.strictEqual(hints[0], '2 foes remain, to the north. The ruby is still dark.');
assert.ok(hints[0].length <= 54, 'IV combined refusal fits the hint plate');
assert.ok(!/guardian/i.test(hints[0]));

setup(3, { done: 0, ruby: 0, ents: [] });
c.useChapterDescent();
assert.strictEqual(hints[0], 'The guardian has not fallen. The ruby is still dark.');

setup(4, { done: 0, ruby: 1, ents: [] });
c.useChapterDescent();
assert.strictEqual(hints[0], 'This floor\u2019s guardian has not fallen.');

setup(3, { done: 1, ruby: 0, ents: [foe(5, 0)] });
c.useChapterDescent();
assert.strictEqual(hints[0], RUBY, 'once done is on, later foes do not change the refusal');
assert.ok(!/foe/.test(hints[0]));

setup(3, { done: 1, ruby: 1, ents: [foe(5, 0)] });
assert.strictEqual(c.useChapterDescent(), true, 'done plus a lit ruby opens even if a foe spawned later');

setup(2, { done: 0, ruby: 0, ents: [foe(4, 0), foe(0, 9)] });
c.useChapterDescent();
assert.strictEqual(hints[0], RUBY, 'II refusal is the ruby, not the packs');

setup(2, { done: 0, ruby: 1, ents: [foe(4, 0)] });
assert.strictEqual(c.useChapterDescent(), true, 'II opens on the ruby alone');

setup(3, { done: 0, ruby: 1, ents: [foe(0.3, 0.2)] });
c.useChapterDescent();
assert.strictEqual(hints[0], 'One foe still holds this floor, beside you.');

assert.strictEqual(c.foeBearingWord({ x: 0, y: 0 }, { x: 5, y: 0 }), 'east');
assert.strictEqual(c.foeBearingWord({ x: 0, y: 0 }, { x: 0, y: 5 }), 'south');
assert.strictEqual(c.foeBearingWord({ x: 0, y: 0 }, { x: 0, y: -5 }), 'north');
assert.strictEqual(c.foeBearingWord({ x: 0, y: 0 }, { x: -5, y: 0 }), 'west');
assert.strictEqual(c.foeBearingWord({ x: 0, y: 0 }, { x: 5, y: -5 }), 'northeast');

setup(4, { done: 0, ruby: 0, ents: [foe(0.2, 0.2)] });
c.useChapterDescent();
assert.strictEqual(hints[0], 'One foe remains, beside you. The ruby is still dark.');
assert.ok(hints[0].length <= 54);

const many = [];
for(let i = 0; i < 12; i++) many.push(foe(12, -12));
setup(3, { done: 0, ruby: 0, ents: many });
c.useChapterDescent();
assert.ok(/12 foes remain/.test(hints[0]) && /northeast/.test(hints[0]) && /ruby is still dark/.test(hints[0]), hints[0]);
assert.ok(hints[0].length <= 54, hints[0]);

setup(4, { done: 0, ruby: 1, hero: null, ents: [foe(4, 1), foe(-9, 0)] });
c.useChapterDescent();
assert.strictEqual(hints[0], '2 foes still hold this floor.', 'no hero, so no false direction');

assert.ok(!html.includes('Defeat this floor'), 'the guardian-only refusal is gone');
assert.ok(/L\.flags\.boss&&!L\.flags\.done&&!foesLeft\(\)/.test(html), 'III and IV still set done from every living foe');
assert.ok(/!G\.ents\.some\(e=>e\.kind==='king'&&!e\.dead\)/.test(html), 'V waits on the Undying King alone');
assert.ok(/function rubyGuardiansLeft\(\)/.test(html) && /!rubyGuardiansLeft\(\)/.test(html),
  'I cleared waits on the ruby guardians, not the whole floor');
const warren = html.match(/interact\('Descend to the Goblin King'[\s\S]{0,220}/);
assert.ok(warren && /enterGoblinKingLevel\(L\)/.test(warren[0]) && !/hint\(/.test(warren[0]),
  'the Goblin King stair has no refusal');
assert.ok(/if\(elev&&elev\.action==='ride'\) interact\('Ride the elevator down'/.test(html),
  'I offers the ride plate only once the elevator is ready');

console.log('descent refusal tells the truth; the stair gate is unchanged');

'use strict';
/**
 * The descent stair opens when that chapter's boss is dead.
 * Chapters with no single boss keep their old gate.
 * Run: node src/dungeon/DescentRefusal.test.js
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

const hints = [];
const c = {
  G: { lvl: null, props: [], ents: [], scene: 'play', cleared: {} },
  hint(t){ hints.push(t); },
  floorTravelReady(){ return !!c.ruby; },
  endChapter(){ c.G.scene = 'camp'; c.ended = (c.ended || 0) + 1; },
  player(){ return c.hero; },
  ruby: false,
  hero: null
};
vm.createContext(c);
vm.runInContext([
  'chapterBossOf', 'foeMatchesChapterBoss', 'bindChapterBoss', 'chapterBossSlain',
  'noteChapterBossDown', 'chapterDescentRefusal', 'useChapterDescent'
].map(grab).join('\n'), c);

function foe(x, y, extra){
  return Object.assign({ team: 'foe', dead: false, npc: false, x: x, y: y, name: 'Foe', kind: 'orc' }, extra || {});
}
function setup(n, opts){
  opts = opts || {};
  hints.length = 0;
  c.ended = 0;
  c.G.scene = 'play';
  c.G.cleared = {};
  c.G.ents = opts.ents || [];
  c.hero = opts.hero === undefined ? { x: 0, y: 0 } : opts.hero;
  c.ruby = !!opts.ruby;
  c.G.lvl = {
    n: n,
    stair: opts.stair === false ? null : { x: 0, y: 0 },
    flags: Object.assign({ done: opts.done ? 1 : 0 }, opts.flags || {}),
    objs: opts.objs || [{ t: 'earlier', d: 0 }, { t: 'boss', d: 0 }]
  };
}

const RUBY = 'Activate this floor\u2019s ruby door before descending.';
const GUARD = 'The Ruin Guard still stands.';
const BRAIN = 'The Elder Brain still lives.';

assert.strictEqual(c.chapterBossOf(1), null, 'I has no single boss');
assert.strictEqual(c.chapterBossOf(2), null, 'II has no single boss');
assert.strictEqual(c.chapterBossOf(3).kind, 'construct');
assert.strictEqual(c.chapterBossOf(4).kind, 'elderbrain');
assert.strictEqual(c.chapterBossOf(5).kind, 'king');
assert.strictEqual(c.chapterBossOf(5).name, 'THE UNDYING KING');

setup(3, {
  ruby: 0,
  flags: { boss: 1 },
  ents: [
    foe(48, 39, { kind: 'construct', name: 'Ruby Construct', hp: 1 }),
    foe(26, 28, { name: 'Duergar' }),
    foe(46, 20, { name: 'Orc' })
  ]
});
assert.strictEqual(c.useChapterDescent(), false);
assert.strictEqual(hints[0], GUARD);
assert.strictEqual(c.G.scene, 'play');
assert.strictEqual(c.G.lvl.objs[0].d, 0, 'refusal does not check an earlier objective');

c.G.ents[0].hp = 0;
c.G.ents[0].dead = 1;
hints.length = 0;
assert.strictEqual(c.noteChapterBossDown(c.G.lvl), true);
assert.strictEqual(c.G.lvl.flags.done, 1);
assert.strictEqual(c.G.lvl.objs[0].d, 0, 'boss death does not finish the barracks objective');
assert.strictEqual(c.G.cleared[3], undefined, 'boss death does not mark the chapter cleared');
assert.strictEqual(c.useChapterDescent(), true, 'III opens with the guard dead and packs alive');
assert.strictEqual(c.G.scene, 'camp');
assert.ok(c.G.ents.some(e => e.name === 'Duergar' && !e.dead));

setup(3, {
  ruby: 0,
  flags: { boss: 1 },
  ents: [
    foe(26, 8, { kind: 'construct', name: 'Ruby Construct' }),
    foe(48.2, 40, { kind: 'construct', name: 'Ruby Construct', dead: 1 }),
    foe(30, 58, { name: 'Orc' })
  ]
});
assert.strictEqual(c.useChapterDescent(), true, 'the dead guard at the anchor is the boss, not the workshop construct');
assert.strictEqual(c.G.ents.find(e => e.x === 26).chapterBoss, undefined);

setup(3, {
  ruby: 1,
  flags: { boss: 0 },
  ents: [foe(26, 8, { kind: 'construct', name: 'Ruby Construct' })]
});
assert.strictEqual(c.useChapterDescent(), false, 'a pack construct is not the boss before the encounter');
assert.strictEqual(hints[0], GUARD);

setup(4, {
  ruby: 0,
  flags: { boss: 1 },
  ents: [
    foe(52, 42, { kind: 'elderbrain', name: 'ELDER BRAIN', boss: 1 }),
    foe(46, 40, { kind: 'deathtyrant', name: 'DEATH TYRANT', boss: 1 }),
    foe(50, 16, { kind: 'mindflayer', name: 'Mind Flayer' })
  ]
});
assert.strictEqual(c.useChapterDescent(), false);
assert.strictEqual(hints[0], BRAIN);
c.G.ents[0].dead = 1;
hints.length = 0;
assert.strictEqual(c.useChapterDescent(), true, 'IV opens when the Elder Brain dies');
assert.ok(c.G.ents.some(e => e.kind === 'deathtyrant' && !e.dead));
assert.ok(c.G.ents.some(e => e.kind === 'mindflayer' && !e.dead));

setup(4, {
  ruby: 0, done: 1,
  flags: { boss: 1 },
  ents: [foe(80, 70, { name: 'Mustard Jelly' })]
});
assert.strictEqual(c.useChapterDescent(), true, 'an old clear, with the brain already gone, still opens');

setup(4, {
  ruby: 1, done: 1,
  flags: { boss: 1 },
  ents: [foe(52, 42, { kind: 'elderbrain', name: 'ELDER BRAIN', chapterBoss: 1 })]
});
assert.strictEqual(c.useChapterDescent(), false, 'a living boss keeps the stair shut');
assert.strictEqual(hints[0], BRAIN);

setup(5, {
  stair: false,
  flags: { start: 1 },
  ents: [
    foe(29, 16, { kind: 'king', name: 'THE UNDYING KING' }),
    foe(22, 20, { kind: 'golem', name: 'Brass Golem' })
  ]
});
assert.strictEqual(c.chapterBossSlain(c.G.lvl), false);
c.G.ents[0].dead = 1;
assert.strictEqual(c.chapterBossSlain(c.G.lvl), true, 'V is the king, not the rest of the temple');
assert.strictEqual(c.noteChapterBossDown(c.G.lvl), true);
assert.strictEqual(c.G.cleared[5], undefined, 'the helper does not award the chapter');
assert.strictEqual(c.G.lvl.objs[0].d, 0);

setup(2, { ruby: 0, ents: [foe(4, 0), foe(0, 9)] });
c.useChapterDescent();
assert.strictEqual(hints[0], RUBY, 'II still refuses on the ruby');
assert.strictEqual(c.G.scene, 'play');
setup(2, { ruby: 1, ents: [foe(4, 0, { kind: 'goblin', name: 'Goblin Boss', boss: 1 })] });
assert.strictEqual(c.useChapterDescent(), true, 'II still opens on the ruby alone');

setup(3, { done: 1, ruby: 1, stair: false, flags: { boss: 1 } });
assert.strictEqual(c.useChapterDescent(), false);
assert.strictEqual(hints.length, 0);

assert.ok(!html.includes('Defeat this floor'), 'the old guardian scolding is gone');
assert.ok(html.includes(GUARD) && html.includes(BRAIN));
assert.ok(!/L\.flags\.boss&&!L\.flags\.done&&!foesLeft\(\)/.test(html), 'III and IV no longer wait on every foe');
function between(a, b){
  const i = html.indexOf(a);
  const j = html.indexOf(b, i + a.length);
  return html.slice(i, j);
}
const ch3 = between('if(n===3)', 'if(n===4)');
const ch4 = between('if(n===4)', 'if(n===5)');
assert.ok(!ch3.includes('foesLeft') && !ch4.includes('foesLeft'));
assert.ok(ch3.includes('noteChapterBossDown(L)') && ch4.includes('noteChapterBossDown(L)'));
assert.ok(!ch3.includes('G.cleared') && !ch4.includes('G.cleared'));
assert.ok(!ch3.includes('floorRubyActivated') && !ch4.includes('floorRubyActivated'));
assert.ok(/noteChapterBossDown\(L\)\)\{\s*L\.objs\[1\]\.d=1; G\.cleared\[5\]=1/.test(html),
  'V still clears the book only when the king falls');
assert.ok(/b\.chapterBoss=1/.test(html));
assert.ok(/function rubyGuardiansLeft\(\)/.test(html) && /!rubyGuardiansLeft\(\)/.test(html),
  'I still waits on the six ruby guardians');
const warren = html.match(/interact\('Descend to the Goblin King'[\s\S]{0,220}/);
assert.ok(warren && /enterGoblinKingLevel\(L\)/.test(warren[0]) && !/hint\(/.test(warren[0]),
  'the Goblin King stair still has no gate');
assert.ok(/if\(elev&&elev\.action==='ride'\) interact\('Ride the elevator down'/.test(html),
  'I still offers the ride only once the elevator is ready');
assert.ok(/function floorTravelReady\(\)/.test(html) && /The ruby door must be activated first/.test(html),
  'the floor lever still wants the ruby');
assert.ok(/chapterBoss/.test(saveSrc) && !/function migrate\(snap\)\{[\s\S]*chapterBoss/.test(saveSrc),
  'boss identity is copied on the ent, not by migrate');

const saveCtx = { globalThis: {} };
saveCtx.globalThis = saveCtx;
vm.createContext(saveCtx);
vm.runInContext(saveSrc, saveCtx);
const stamped = {};
saveCtx.GameSave.stampEnt(stamped, { kind: 'construct', name: 'Ruby Construct', team: 'foe', dead: 1, chapterBoss: 1, x: 48, y: 39 });
assert.strictEqual(stamped.chapterBoss, true);
const plain = {};
saveCtx.GameSave.stampEnt(plain, { kind: 'construct', name: 'Ruby Construct', team: 'foe', dead: 1, x: 48, y: 39 });
assert.strictEqual(plain.chapterBoss, undefined, 'an old ent with no chapterBoss field stays unmarked');

console.log('descent opens on the chapter boss; I, II, and the warren keep their gates');

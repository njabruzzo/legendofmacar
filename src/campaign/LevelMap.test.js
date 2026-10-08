/**
 * Level-map loader. The live five chapters fit the format.
 * Run: node src/campaign/LevelMap.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Map = require('./LevelMap');
const T = require('./CampaignTable');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

const root = path.join(__dirname, '../..');
const live = Map.load(fs.readFileSync(path.join(__dirname, 'maps/live-chapters.json'), 'utf8'));
const campaign = Map.load(fs.readFileSync(path.join(__dirname, 'maps/campaign-levels.json'), 'utf8'));

assert(live.ok, live.ok ? 'live chapter book loads' : live.errors.join('; '));
assert(campaign.ok, campaign.ok ? 'campaign book loads' : campaign.errors.join('; '));
assert(live.book.affectsPlay === false && campaign.book.affectsPlay === false, 'neither book affects play');
assert(live.book.levels.length === 5, 'five live chapters');
assert(campaign.book.levels.length === 10, 'ten campaign maps');

const c1 = live.book.levels[0];
assert(c1.rubyDoor.x === 36.5 && c1.rubyDoor.y === 7.28, 'chapter I ruby door');
assert(c1.guardian.count === 6 && c1.guardian.spawns[0].x === 33.6, 'chapter I six Thin One spawns');
assert(c1.lever.x === 37.15 && c1.lever.y === 22.05, 'chapter I lever');
assert(c1.elevator.x === 36.5 && c1.elevator.y === 21.5, 'chapter I elevator');
assert(c1.boss == null, 'chapter I has no separate boss');
assert(c1.setPieces.some(function (p) { return p.id === 'dwarf-mouth' && p.x === 43.2; }), 'chapter I dwarf mouth');

const c2 = live.book.levels[1];
assert(c2.boss.key === 'goblinKing' && c2.boss.x === 74 && c2.boss.y === 67.6 && c2.boss.optional === true, 'chapter II Goblin King is optional');
assert(c2.rubyDoor.placement === 'procedural' && c2.guardian.placement === 'none', 'chapter II ruby door is procedural and has no guardian fight');
assert(c2.elevator.x === 40 && c2.elevator.y === 7.55, 'chapter II arrival lift');

const c3 = live.book.levels[2];
assert(c3.rubyDoor.x === 48 && c3.rubyDoor.y === 34.28, 'chapter III ruby door');
assert(c3.boss.key === 'construct' && c3.boss.x === 48 && c3.boss.y === 39, 'chapter III Ruin Guard');

const c4 = live.book.levels[3];
assert(c4.boss.key === 'elderbrain' && c4.boss.x === 52 && c4.boss.y === 42, 'chapter IV Elder Brain');
assert(c4.setPieces.some(function (p) { return p.key === 'deathtyrant' && p.x === 46; }), 'chapter IV death tyrant');

const c5 = live.book.levels[4];
assert(c5.boss.key === 'king' && c5.boss.x === 29 && c5.boss.y === 16, 'chapter V Undying King');
assert(c5.elevator.placement === 'none', 'chapter V has no elevator');
assert(c5.setPieces.some(function (p) { return p.id === 'altar' && p.y === 14.5; }), 'chapter V altar');

campaign.book.levels.forEach(function (row, i) {
  const design = T.level(i + 1);
  assert(row.id === design.id, 'map id matches the campaign table');
  assert(row.guardian.tier === design.rubyGuardian.tier, row.id + ' guardian tier');
  assert(row.elevator.transitionCard === design.elevator.transitionCard, row.id + ' transition card');
  assert(fs.existsSync(path.join(root, row.elevator.transitionCard)), row.id + ' stand-in art exists');
  if (row.id === 'L1') {
    assert(row.boss.status === 'tbd' && row.boss.pending === 'Sage' && !row.boss.key, 'L1 map boss is TBD pending Sage and has no key yet');
    assert(design.boss.status === 'tbd' && design.boss.separateFromGuardian === true, 'L1 table boss stays separate from the guardian');
  } else if (row.id === 'L9') {
    assert(row.elevator.note === design.elevator.note, 'L9 map keeps the deep-dragon stand-in note');
    assert(row.boss && row.boss.key === design.boss.key, row.id + ' boss key');
  } else {
    assert(row.boss && row.boss.key === design.boss.key, row.id + ' boss key');
  }
  Map.FEATURES.forEach(function (feature) {
    assert(Object.prototype.hasOwnProperty.call(row, feature), row.id + ' has ' + feature);
  });
});

const l4 = campaign.book.levels[3];
assert(l4.setPieces.some(function (p) { return p.kind === 'ogre-cave' && p.ref === 'OgreCave'; }), 'L4 map carries the ogre cave set piece');

const unnamedBook = JSON.parse(JSON.stringify(campaign.book));
delete unnamedBook.levels[1].boss.key;
delete unnamedBook.levels[1].boss.status;
const unnamed = Map.load(unnamedBook);
assert(!unnamed.ok && unnamed.errors.some(function (e) { return e.indexOf('boss needs a key') >= 0; }), 'a boss without a key or a TBD mark fails');

const broken = JSON.parse(JSON.stringify(campaign.book));
delete broken.levels[3].rubyDoor;
const bad = Map.load(broken);
assert(!bad.ok && bad.errors.some(function (e) { return e.indexOf('rubyDoor') >= 0; }), 'a map without a ruby door fails');

const dup = JSON.parse(JSON.stringify(campaign.book));
dup.levels[1].id = 'L1';
assert(!Map.load(dup).ok, 'duplicate ids fail');

const play = JSON.parse(JSON.stringify(live.book));
play.affectsPlay = true;
assert(!Map.load(play).ok, 'a book that claims to affect play fails');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('level maps ok');

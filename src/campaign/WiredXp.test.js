/**
 * Placed fighting-monster XP plus a stored non-kill remainder
 * equals each level's cumulative delta.
 * Run: node src/campaign/WiredXp.test.js
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

const campaign = Map.load(fs.readFileSync(path.join(__dirname, 'maps/campaign-levels.json'), 'utf8'));
assert(campaign.ok, campaign.ok ? 'campaign book validates' : campaign.errors.join('; '));

/**
 * Treasure and other non-kill awards. These are the gaps left after
 * the ruled kill XP, written here so a reverted monster xp fails.
 * The L4 ogress (185, fights false) stays out of the kill sum.
 * The L7 elemental drop to 910 and 2,864 is inside the L7 remainder.
 */
const NON_KILL = {
  2: 4335,
  3: 8409,
  4: 15335,
  5: 18394,
  6: 28937,
  7: 41708,
  8: 66498,
  9: 118584,
  10: 60285
};

function placedKillXp(level, monsters) {
  let sum = 0;
  (level.spawns || []).forEach(function (group) {
    (group.members || []).forEach(function (member) {
      const mon = monsters[member.key];
      if (!mon || mon.fights === false) return;
      sum += mon.xp * member.count;
    });
  });
  if (level.guardian && monsters[level.guardian.key]) {
    const also = (level.spawns || []).some(function (group) {
      return (group.members || []).some(function (member) { return member.key === level.guardian.key; });
    });
    if (!also) sum += monsters[level.guardian.key].xp * (level.guardian.count || 1);
  }
  return sum;
}

function countKey(level, key) {
  let n = 0;
  (level.spawns || []).forEach(function (group) {
    (group.members || []).forEach(function (member) {
      if (member.key === key) n += member.count;
    });
  });
  return n;
}

assert(T.level(1).pacing.cumulativeXp === 13000, 'L1 cumulative is 13000');
assert(T.pathXp() === 501800, 'path XP is 501800');
const beetle = T.level(1).residents.filter(function (row) { return row.key === 'beetle'; })[0];
assert(beetle && beetle.glands === 3, 'the L1 fire beetle has 3 glands');

let previous = T.level(1).pacing.cumulativeXp;
for (let n = 2; n <= 10; n++) {
  const L = require('./L' + n);
  const level = campaign.book.levels[n - 1];
  const kill = placedKillXp(level, L.MONSTERS);
  const delta = T.level(n).pacing.cumulativeXp - previous;
  assert(kill + NON_KILL[n] === delta, 'L' + n + ' wired kill XP ' + kill + ' plus ' + NON_KILL[n] + ' is the cumulative delta ' + delta);
  previous = T.level(n).pacing.cumulativeXp;
}

const l4 = campaign.book.levels[3];
const L4 = require('./L4');
assert(countKey(l4, 'orcGuard') === 6 && L4.MONSTERS.orcGuard.xp === 80, 'six chief guards are 80 XP each');
assert(countKey(l4, 'orcLeader') === 3 && L4.MONSTERS.orcLeader.xp === 18, 'three leaders and assistants are 18 XP each');
assert(L4.MONSTERS.ogress.fights === false && L4.MONSTERS.ogress.xp === 185, 'the ogress rescue XP stays off the kill sum');

const l5 = campaign.book.levels[4];
const L5 = require('./L5');
assert(countKey(l5, 'drowPriestess') === 1 && L5.MONSTERS.drowPriestess.xp === 400, 'the priestess is 400 XP');

const l9 = campaign.book.levels[8];
const L9 = require('./L9');
assert(countKey(l9, 'firegiant') === 2 && L9.MONSTERS.firegiant.xp === 2840 && L9.MONSTERS.firegiant.bandXp == null, 'two fire giants are 2840 XP and bandXp is retired');

function rowXp(level, key) {
  const lists = [].concat(level.residents || [], level.minions || [], level.boss ? [level.boss] : []);
  const row = lists.filter(function (mon) { return mon.key === key; })[0];
  return row ? row.xp : null;
}
assert(rowXp(T.level(4), 'orcGuard') === 80 && rowXp(T.level(4), 'orcLeader') === 18, 'the L4 table xp matches the guards and leaders');
assert(rowXp(T.level(5), 'drowPriestess') === 400, 'the L5 table xp matches the priestess');
assert(rowXp(T.level(9), 'firegiant') === 2840, 'the L9 table xp matches the fire giants');
assert(rowXp(T.level(7), 'earthElemental8') === 910 && rowXp(T.level(7), 'earthElemental12') === 2864, 'the L7 table xp matches the elementals');
assert(rowXp(T.level(10), 'duergarPriest') === 393 && rowXp(T.level(10), 'skeleton') === 19, 'the L10 table xp matches the priest and the skeleton');
const L10 = require('./L10');
const clear = T.level(10).pacing.cumulativeXp;
const saved = L10.RITUAL.xpOnce;
L10.RITUAL.xpOnce = 1;
assert(T.pathXp() === clear + 1, 'path XP reads RITUAL.xpOnce');
L10.RITUAL.xpOnce = saved;
assert(T.pathXp() === 501800 && clear + L10.RITUAL.xpOnce + T.level(10).pacing.ritualXp === 511800 && T.pathXp() !== 511800, 'a second ritual award would make the path 511800');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('wired XP matches the cumulatives');

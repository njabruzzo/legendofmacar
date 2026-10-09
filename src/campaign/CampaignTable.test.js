/**
 * Campaign table: ten levels, guardians, pacing, reuse.
 * Run: node src/campaign/CampaignTable.test.js
 */
'use strict';
const T = require('./CampaignTable');
const Cave = require('./OgreCave');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

assert(T.wired === false, 'campaign table is not wired into play');
assert(T.LEVELS.length === 10, 'ten levels');
assert(T.LOCKED.poisonMode === 'h1', 'poison mode is h1');
assert(T.LOCKED.decisions.D3 === 'B', 'D3 locked to B');
assert(T.LOCKED.decisions.D5 === 'B', 'D5 locked to B');
assert(T.LOCKED.decisions.D11 === 'A', 'D11 no egg stacking');
assert(T.LOCKED.decisions.D15 === 'A', 'D15 shaman moves to L4');
assert(T.LOCKED.decisions.D17 === 'A', 'D17 keeps six Thin Ones');

const names = [
  'The Rubble and the Ruby',
  'Noz and the Goblin King',
  'The Webbed Deep and the Spider Queen',
  'Orc Hold and the Ogre Cave',
  'The Drow Deep',
  'The Burning Halls',
  'The Deep Stone',
  'The Eye Tyrant and the Holy Hammer',
  'The Red Dragon and the Holy Anvil',
  'The Undying King and the Ritual'
];
T.LEVELS.forEach(function (lvl, i) {
  assert(lvl.level === i + 1 && lvl.id === 'L' + (i + 1), 'id L' + (i + 1));
  assert(lvl.name === names[i], 'name ' + names[i]);
  assert(lvl.rubyDoor && lvl.rubyDoor.present, 'L' + lvl.level + ' has a ruby door');
  assert(lvl.lever && lvl.lever.needsBoss === false, 'L' + lvl.level + ' lever does not need the boss');
  assert(lvl.elevator && lvl.elevator.auto && lvl.elevator.standIn && lvl.elevator.newArt === false, 'L' + lvl.level + ' auto elevator uses a stand-in card');
  assert(lvl.rubyGuardian && lvl.rubyGuardian.tier === lvl.level, 'L' + lvl.level + ' guardian tier');
  assert(lvl.wander.length === 6, 'L' + lvl.level + ' wander table has 6 slots');
  assert(T.formulaXp(lvl.rubyGuardian.formula) === lvl.rubyGuardian.formula.xp, 'L' + lvl.level + ' guardian XP formula');
});

assert(T.GUARDIANS[0].count === 6 && T.GUARDIANS[0].formula.xp === 52, 'guardian I is six Thin Ones at 52 XP');
assert(T.GUARDIANS[0].formula.xp * 6 === 312, 'six guardians total 312 XP');
assert(T.GUARDIANS[9].hitOnlyBy === 3 && T.GUARDIANS[9].formula.xp === 16800, 'guardian X needs +3 and is 16800 XP');
assert(T.GUARDIANS.map(g => g.formula.xp).join() === '52,181,441,1030,2640,3852,5212,8420,10800,16800', 'guardian XP line');

const teeth = T.LEVELS.slice(0, 7).map(l => l.quest.id);
assert(teeth[0] === 'grond_tooth_electrum', 'tooth 1 keeps the live id');
assert(teeth[6] === 'grond_tooth_electrum_7', 'tooth 7 id');
assert(T.level(7).quest.lastTooth === true, 'tooth 7 is the last tooth');
assert(T.LEVELS.slice(0, 6).every(function (lvl) { return lvl.quest.lastTooth !== true; }), 'only tooth 7 carries the last-tooth flag');
assert(new Set(teeth).size === 7, 'seven distinct tooth ids');
assert(T.LEVELS[1].optionalQuest.id === 'grond_tooth_bronze' && T.LEVELS[1].optionalQuest.countsForRitual === false, 'bronze tooth is not one of the seven');
assert(T.level(8).quest.id === 'holy_hammer' && T.level(8).quest.plus === 3, 'L8 Holy Hammer +3');
assert(T.level(9).quest.id === 'holy_anvil' && T.level(9).quest.displayName === 'Holy Anvil of Truth', 'L9 quest id is holy_anvil and the display name is Holy Anvil of Truth');
assert(T.level(9).elevator.transitionCard === 'assets/creatures/mon_deepdragon.png', 'L9 card keeps the deep dragon stand-in');
assert(T.level(9).elevator.note === 'Keep this deep-dragon stand-in on the L9 card until red dragon art passes.', 'L9 keeps the stand-in until red dragon art passes');
assert(T.level(1).boss == null && T.level(1).stairsOpenOn === 'lever', 'L1 has no boss and the lever opens the stairs');
assert(T.level(1).rubyGuardian.key === 'thinOne' && T.level(1).rubyGuardian.count === 6 && T.level(1).rubyGuardian.bossFlagOnIndividual === false, 'the six Thin Ones are the L1 guardian and none wears a boss flag');
T.LEVELS.forEach(function (lvl) {
  if (lvl.level === 1) return;
  assert(lvl.boss && typeof lvl.boss.xp === 'number' && lvl.stairsOpenOn === 'bossKill', lvl.id + ' has a boss and the boss kill opens the stairs');
});
assert(T.level(6).minions.every(function (m) { return m.locked && m.option === 'A'; }), 'L6 minions are locked as written');
assert(T.level(7).minions.every(function (m) { return m.locked && m.option === 'A'; }), 'L7 minions are locked as written');
assert(T.level(10).minions.every(function (m) { return m.locked; }) && T.LOCKED.recommendationsLocked === true, 'L10 retinue and the other unnumbered picks are locked');
[8, 9, 10].forEach(function (n) {
  assert(T.level(n).quest.behindBoss === true && T.level(n).lever.needsBoss === false, 'L' + n + ' quest sits behind the boss and the lever does not');
});
assert(T.level(10).quest.kind === 'ritual' && T.level(10).quest.xpOnce === 10000 && T.level(10).pacing.ritualXp === 10000, 'L10 ritual is 10,000 XP');

assert(!T.level(2).residents.some(m => /spider/i.test(m.key)), 'L2 residents have no spiders');
assert(!T.level(2).wander.some(m => /spider/i.test(m.key)), 'L2 wander has no spiders');
assert(T.level(2).residents.some(m => m.key === 'goblinShaman' && m.casterLevel === 2 && m.kingHall === false), 'L2 shaman is 2nd level and not in the king hall');
assert(T.level(3).boss.key === 'spiderQueen' && T.level(3).boss.decision === 'D4-A', 'L3 boss is the Spider Queen');
assert(T.level(4).residents.some(m => m.key === 'orcShaman' && m.decision === 'D15-A'), 'L4 orc shaman carries the 7th-level map');
assert(T.level(4).setPieces.indexOf('ogre-cave') >= 0, 'L4 lists the ogre cave');
assert(T.level(4).residents.some(m => m.key === 'wolf' && m.artStandIn === 'warg'), 'wolf uses the warg stand-in');

assert(T.CUT_CHAPTERS.map(c => c.chapter).join() === '3,4', 'chapters III and IV are cut as chapters');
assert(T.CUT_CHAPTERS[0].reusedOn.join() === '4,10', 'chapter III content is reused on L4 and L10');
assert(T.CUT_CHAPTERS[1].reusedOn.join() === '8,10', 'chapter IV content is reused on L8 and L10');
assert(T.level(4).reuse.cutAsChapter === true && T.level(4).builtFrom.chapter === 3, 'L4 is built from cut chapter III');
assert(T.level(8).reuse.fromChapter === 4, 'L8 is built from cut chapter IV');
assert(T.level(10).reuse.alsoFromChapters.join() === '3,4', 'L10 reuses III and IV undead');
assert(T.level(1).builtFrom.chapter === 1 && T.level(10).builtFrom.chapter === 5, 'L1 keeps chapter I and L10 keeps the chapter V finale');

T.LEVELS.forEach(function (lvl) {
  const fromBlocks = T.statBossGuardianXp(lvl);
  assert(lvl.pacing.bossPlusGuardianXp === fromBlocks && lvl.pacing.bossPlusGuardianSource === 'stat-block', lvl.id + ' boss-plus-guardian XP is the stat blocks');
});
assert(T.statBossGuardianXp(T.level(1)) === 52 * 6 && T.level(1).pacing.bossPlusGuardianXp === 312, 'L1 Thin One XP counts under the guardian, 312');
assert(T.statBossGuardianXp(T.level(1)) === T.level(1).rubyGuardian.formula.xp * T.level(1).rubyGuardian.count, 'the L1 column is the guardian line only');
assert(T.statBossGuardianXp(T.level(2)) === 181 + 260, 'L2 is Guardian II plus the Goblin King');
const hit = T.LEVELS.map(l => l.pacing.hitOnlyBy);
assert(hit.join() === '0,0,0,0,1,2,2,2,2,3', 'weapon-plus requirement climbs');
assert(T.level(6).pacing.guardianHitOnlyBy === 1 && T.level(6).rubyGuardian.hitOnlyBy === 1, 'L6 guardian needs +1 while the floor elementals need +2');

T.LEVELS.forEach(function (lvl) {
  const xp = lvl.pacing.cumulativeXp;
  const macar = lvl.pacing.macar;
  const floor = T.FIGHTER_XP[macar];
  const nextKey = 'F' + (parseInt(macar.slice(1), 10) + 1);
  const next = T.FIGHTER_XP[nextKey];
  if (lvl.level === 10) {
    assert(xp === 491800 && floor === 500001, 'the L10 clear stays 491,800, under the F10 line');
    assert(lvl.pacing.xpFloor == null && lvl.pacing.xpVersusF10Threshold == null, 'there is no XP floor');
    assert(T.pathXp() === xp + lvl.quest.xpOnce && T.pathXp() === 501800, 'the path adds the 10,000 ritual and nothing else');
    assert(T.pathXp() >= floor, 'the full L1-L10 path plus the ritual clears 500,001');
  } else {
    assert(xp >= floor && (next == null || xp < next), lvl.id + ' XP sits in the ' + macar + ' band');
  }
});

const cave = Cave.OGRE_CAVE;
assert(cave.level === 4 && cave.boulders.count === 3 && cave.goldenEggs.count === 3, 'ogre cave counts match the table level');
assert(cave.prisoner.fights === false && cave.prisoner.rescueXp === 185, 'ogress rescue XP is 185 and she does not fight');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('campaign table ok');

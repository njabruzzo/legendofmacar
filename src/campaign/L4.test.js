/**
 * Level 4 campaign data. Not wired into play.
 * Run: node src/campaign/L4.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Map = require('./LevelMap');
const T = require('./CampaignTable');
const E = require('./ExitRules');
const Q = require('./QuestRegistry');
const Cave = require('./OgreCave');
const L4 = require('./L4');
const B = require('../combat/BattleBuffs');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

const root = path.join(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const save = fs.readFileSync(path.join(root, 'src/saves/GameSave.js'), 'utf8');
const l4Book = Map.load(fs.readFileSync(path.join(__dirname, 'maps/l4.json'), 'utf8'));
const campaign = Map.load(fs.readFileSync(path.join(__dirname, 'maps/campaign-levels.json'), 'utf8'));

assert(l4Book.ok, l4Book.ok ? 'L4 map validates' : l4Book.errors.join('; '));
assert(campaign.ok, campaign.ok ? 'campaign book still validates' : campaign.errors.join('; '));
assert(l4Book.book.affectsPlay === false && l4Book.book.levels.length === 1, 'the L4 book is data and holds one level');
assert(JSON.stringify(campaign.book.levels[3]) === JSON.stringify(l4Book.book.levels[0]), 'the campaign book carries the same L4 map');

const level = l4Book.book.levels[0];
assert(level.id === 'L4' && level.wired === false && level.level === 4, 'L4 is unwired');
assert(level.stairsOpenOn === 'bossKill', 'L4 stairs open on the boss kill');
assert(level.boss && level.boss.key === 'orcChief' && level.guardian && level.guardian.key === 'rubyGuardian', 'L4 has a boss and a guardian');
assert(level.boss.placement === 'fixed' && level.boss.x === 46 && level.boss.y === 20 && level.boss.hp === 33 && level.boss.ac === 3, 'the orc chief is fixed in the Hall of Names');
assert(level.boss.bossFlagOnIndividual === false && level.boss.separateFromGuardian === true, 'the chief is a separate fight and wears no boss flag');
assert(level.boss.key !== level.guardian.key, 'the guardian and the boss are different creatures');
assert(level.guardian.placement === 'fixed' && level.guardian.tier === 4 && level.guardian.count === 1 && level.guardian.hp === 48 && level.guardian.ac === 3, 'guardian is Ruby Guardian IV');
assert(level.guardian.x === 48 && level.guardian.y === 39 && level.guardian.bossFlagOnIndividual === false, 'guardian stands where the Ruin Guard stood and wears no boss flag');
assert(level.rubyDoor.placement === 'fixed' && level.lever.enablesWhen === 'rubyGuardianDead' && level.lever.needsBoss === false && level.lever.opensStairs === false, 'the lever needs the guardian and does not open the stairs');
assert(level.elevator.auto === true && level.elevator.standIn === true && level.elevator.gate === 'guardian', 'the elevator is automatic and the guardian is its gate');
assert(level.elevator.transitionCard === 'assets/creatures/mon_orc.png', 'the transition card is the orc sheet');
assert(level.elevator.transitionCard === T.level(4).elevator.transitionCard, 'the card matches the campaign table');
assert(fs.existsSync(path.join(root, level.elevator.transitionCard)), 'the stand-in art file exists');
assert(level.stairs.opensOn === 'bossKill' && level.stairs.stairsOpenOn === 'bossKill' && level.stairs.x === 48.1 && level.stairs.y === 61.4, 'the stair opens when the chief dies');
assert(level.tooth.id === 'grond_tooth_electrum_4' && level.tooth.cursed === true && level.tooth.countsForRitual === true && level.tooth.n === 4, 'electrum tooth 4 is cursed and counts toward the seven');

const cave = level.setPieces.filter(function (p) { return p.id === 'ogre-cave'; })[0];
assert(cave && cave.placed === true && cave.ref === 'OgreCave' && cave.x === 32 && cave.y === 50, 'the ogre cave is placed');
assert(cave.boulders.count === 3 && cave.boulders.secondsEach === 10, 'three boulders, ten seconds each');
assert(cave.prisoner.key === 'ogress' && cave.prisoner.fights === false && cave.prisoner.onBouldersCleared === 'flee' && cave.prisoner.rescueXp === 185, 'the ogress flees and never fights');
assert(cave.eggs.count === 3 && cave.eggs.id === 'golden_egg' && cave.ogreCorpses === false && cave.ogreLoot === false, 'the cave holds three golden eggs and no ogre loot');
assert(L4.CAVE === Cave.OGRE_CAVE, 'L4.CAVE is the OgreCave record');
const flee = Cave.fleeScript(L4.CAVE);
assert(flee.flees === true && flee.fights === false && flee.targetable === false && flee.xp === 185 && flee.eggs === 3 && flee.afterBoulders === 3, 'clearing the boulders sends her out with the rescue XP');
assert(level.ogreCave.boulders.length === 3 && level.ogreCave.eggs.length === 3 && level.ogreCave.exitTile.x === 28 && level.ogreCave.exitTile.y === 76, 'the cave map names boulder tiles, egg tiles, and an exit tile');

const keys = Object.keys(L4.MONSTERS);
level.spawns.forEach(function (group) {
  group.members.forEach(function (member) {
    assert(keys.indexOf(member.key) >= 0, group.id + ' member ' + member.key + ' is an L4 stat block');
  });
});
assert(!level.spawns.some(function (group) {
  return group.members.some(function (member) {
    return member.key === 'drow' || member.key === 'spider' || member.key === 'bugbear' || member.key === 'beetle' || member.key === 'goblin';
  });
}), 'drow, spiders, the bugbear, the beetle, and goblins are not on L4');
const hall = level.spawns.filter(function (group) { return group.id === 'hall-of-names'; })[0];
assert(hall.members.some(function (member) { return member.key === 'orcChief' && member.count === 1; }), 'the hall has the chief');
assert(hall.members.some(function (member) { return member.key === 'orcGuard' && member.count === 6; }), 'the hall has six guards');
assert(hall.members.some(function (member) { return member.key === 'orcShaman' && member.count === 1 && member.decision === 'D15-A'; }), 'the 7th-level shaman stands in the hall');
function countOf(key) {
  var n = 0;
  level.spawns.forEach(function (group) {
    group.members.forEach(function (member) {
      if (member.key === key) n += member.count;
    });
  });
  return n;
}
assert(countOf('orc') === 8, 'eight orcs from the live packs stay');
assert(countOf('warg') === 9, 'nine wargs: the ruin pack plus the packs moved from L2');
assert(countOf('wolf') === 2, 'two wolves stand in the den');
assert(level.spawns.filter(function (group) { return group.movedFrom === 'L2'; }).length === 3, 'three warg packs keep their L2 points');

assert(level.wander.slots.length === 6, 'section 5 gives L4 six wander slots');
assert(JSON.stringify(level.wander.slots) === JSON.stringify(L4.WANDER), 'the map wander table matches the encounter data');
assert(JSON.stringify(L4.WANDER) === JSON.stringify(T.level(4).wander), 'the wander table matches the campaign table');
assert(level.wander.check.chance === '1 in 6' && level.wander.check.every === '3 turns', 'wandering monsters check 1 in 6 every 3 turns');
assert(level.loot.caches.count === 16 && level.loot.caches.places.length === 16 && level.loot.caches.level === 4, 'sixteen level-4 caches');
assert(level.loot.chiefCorpse.letter === 'U' && level.loot.chiefChest.onCorpse === false && level.loot.chiefChest.qTimes === 10, 'the chief corpse is U and the chest is the lair, not the corpse');
assert(level.loot.chiefChest.letters.join() === 'C,O,Q,S', 'the chest names C, O, Q, and S');
assert(level.loot.guardianRuby.gp === 1000, 'Guardian IV drops the 1000 gp ruby');

const exit = E.forLevel(4);
assert(exit.elevator === 'guardian' && exit.stairs === 'bossKill' && exit.stairsOpenOn === 'bossKill', 'Guardian IV is the elevator and the chief kill opens the stairs');
assert(exit.boss != null && exit.separateEncounters === true, 'L4 keeps a boss and is not the L1 exception');
assert(level.exit.elevator === exit.elevator && level.exit.stairs === exit.stairs && level.exit.stairsOpenOn === exit.stairsOpenOn, 'the map exit uses the same gates');
assert(E.validate().length === 0, 'the ten exit rows still pass');
const bare = E.LEVELS.map(function (row) { return Object.assign({}, row); });
bare[3] = Object.assign({}, bare[3], { boss: null });
assert(E.validate(bare).some(function (err) { return err.indexOf('L4') >= 0 && err.indexOf('boss') >= 0; }), 'L4 stairs still require a boss');
const stripped = JSON.parse(JSON.stringify(campaign.book));
stripped.levels[3].boss = null;
delete stripped.levels[3].stairsOpenOn;
const noBoss = Map.load(stripped);
assert(!noBoss.ok && noBoss.errors.some(function (err) { return err.indexOf('L4') >= 0 && err.indexOf('boss') >= 0; }), 'a boss-less L4 map fails validation');

Object.keys(L4.XP).forEach(function (key) {
  const mon = L4.MONSTERS[key];
  assert(mon.xp === L4.XP[key], key + ' printed XP is ' + L4.XP[key]);
  assert(L4.printedXp(mon) === mon.xp, key + ' XP formula sums to the printed total');
  assert(mon.art && mon.art.newArt === false && typeof mon.art.key === 'string', key + ' art is a stand-in key and binds nothing new');
  if (mon.art.file) assert(fs.existsSync(path.join(root, mon.art.file)), key + ' art file exists');
});
assert(L4.MONSTERS.ogress.art.file == null && L4.MONSTERS.ogress.fights === false, 'the ogress binds no file and never fights');
assert(L4.MONSTERS.warg.art.standIn === false && L4.MONSTERS.warg.art.file === 'assets/creatures/mon_warg.png', 'worgs use their own sheet');
assert(L4.MONSTERS.wolf.art.standIn === true && L4.MONSTERS.wolf.art.file === 'assets/creatures/mon_warg.png', 'wolves use the warg sheet');
assert(L4.MONSTERS.rubyGuardian.art.file === 'assets/creatures/mon_construct.png' && L4.MONSTERS.rubyGuardian.art.standIn === true, 'Guardian IV uses the Ruin Guard sheet');
assert(L4.bossGuardianXp() === 1030 + 255 && L4.bossGuardianXp() === 1285, 'L4 boss-plus-guardian XP is the stat blocks, 1285');
assert(L4.FORECAST_BOSS_GUARDIAN_XP === 2990 && T.level(4).pacing.bossPlusGuardianXp === 1285, 'the 1.12 forecast of 2990 is not the pacing total');
assert(L4.forecastPackXp() === 2793, 'the annotated pack sums to 2793, not the printed 2990');
assert(T.statBossGuardianXp(T.level(4)) === L4.bossGuardianXp(), 'the campaign table uses the same L4 stat-block total');
assert(T.level(4).pacing.cumulativeXp === 51000 && T.level(4).pacing.macar === 'F6', 'the L4 clear stays at the 1.12 F6 row, 51000');
assert(T.level(4).pacing.cumulativeXp >= T.FIGHTER_XP.F6 && T.level(4).pacing.cumulativeXp < T.FIGHTER_XP.F7, '51000 sits in the F6 band');
assert(T.pathXp() === 510000 && T.pathXp() >= 500001, 'the L1-L10 clear plus the ritual stays 510000');

assert(L4.MONSTERS.orc.hd === 1 && L4.MONSTERS.orc.ac === 6 && L4.MONSTERS.orc.xp === 15, 'an orc is 1 HD, AC 6, 15 XP');
assert(L4.MONSTERS.orcLeader.hd === 2 && L4.MONSTERS.orcLeader.ac === 5 && L4.MONSTERS.orcLeader.attacks[0].damage === '1d10' && L4.MONSTERS.orcLeader.countVerify === true, 'leaders stay HD 2, AC 5, 1d10, marked verify');
assert(L4.MONSTERS.orcGuard.hd === 2 && L4.MONSTERS.orcGuard.ac === 4 && L4.MONSTERS.orcGuard.attacks[0].damage === '2d4' && L4.MONSTERS.orcGuard.countVerify === true, 'guards stay HD 2, AC 4, 2d4, marked verify');
assert(L4.MONSTERS.warg.hd === '3+3' && L4.MONSTERS.warg.ac === 6 && L4.MONSTERS.warg.xp === 126 && L4.MONSTERS.warg.ttVerify === true && L4.MONSTERS.warg.movedFrom === 'L2', 'worgs are 3+3, AC 6, 126 XP, moved from L2');
assert(L4.MONSTERS.wolf.hd === '2+2' && L4.MONSTERS.wolf.ac === 7 && L4.MONSTERS.wolf.xp === 68, 'wolves are 2+2, AC 7, 68 XP');
assert(L4.MONSTERS.orcShaman.hd === 7 && L4.MONSTERS.orcShaman.hp === 32 && L4.MONSTERS.orcShaman.ac === 5 && L4.MONSTERS.orcShaman.casterLevel === 7 && L4.MONSTERS.orcShaman.decision === 'D15-A', 'the shaman is 7 HD, 32 hp, AC 5, 7th level, D15-A');
assert(L4.MONSTERS.orcChief.hd === 5 && L4.MONSTERS.orcChief.hp === 33 && L4.MONSTERS.orcChief.ac === 3 && L4.MONSTERS.orcChief.attacks[0].damage === '1d8+3' && L4.MONSTERS.orcChief.str === '18/50', 'the chief is 5 HD, 33 hp, AC 3, axe 1d8+3');
assert(L4.MONSTERS.ogress.hd === '4+1' && L4.MONSTERS.ogress.ac === 5 && L4.MONSTERS.ogress.xp === 185, 'the ogress is 4+1, AC 5, 185 rescue XP');
assert(L4.MONSTERS.rubyGuardian.hd === 8 && L4.MONSTERS.rubyGuardian.hp === 48 && L4.MONSTERS.rubyGuardian.ac === 3 && L4.MONSTERS.rubyGuardian.attacks[0].damage === '2d8', 'Guardian IV is 8 HD, 48 hp, AC 3, 2d8');
assert(L4.MONSTERS.rubyGuardian.cone.damage === '2d6' && L4.MONSTERS.rubyGuardian.cone.range === '3"' && L4.MONSTERS.rubyGuardian.cone.save === 'vs breath for half', 'the shard cone is 2d6 at 3 inches, save vs breath for half');
assert(L4.MONSTERS.rubyGuardian.xp === T.level(4).rubyGuardian.formula.xp, 'Guardian IV XP matches the guardian line');

assert(L4.SHAMAN.level === 7 && L4.SHAMAN.decision === 'D15-A' && L4.SHAMAN.slots[1] === 5 && L4.SHAMAN.slots[2] === 3 && L4.SHAMAN.slots[3] === 2 && L4.SHAMAN.slots[4] === 1, 'shaman slots are 5/3/2/1 with the WIS 14 bonus');
assert(L4.SHAMAN.emptySlots.join() === '3,4', 'the 3rd and 4th slots stay empty as written');
var lockedFirst = ['Bless', 'Cause Fear', 'Darkness', 'Cause Light Wounds', 'Cause Light Wounds'];
var prepared = L4.SHAMAN.houseList.slice();
lockedFirst.forEach(function (name) {
  var at = prepared.indexOf(name);
  assert(at >= 0, name + ' is prepared as a locked 1st-level spell');
  if (at >= 0) prepared.splice(at, 1);
});
assert(lockedFirst.length === L4.SHAMAN.slots[1] && lockedFirst.length === 5, 'the five locked 1st-level spells fill the five 1st-level slots');
assert(L4.SHAMAN.houseList.length === 7 && L4.SHAMAN.bless.range === '5"' && L4.SHAMAN.bless.rounds === 6 && L4.SHAMAN.spellEverySec === 2, 'the house list and Bless timing are the printed lines');
assert(L4.CHIEF.priority.length === 4 && L4.CHIEF.moraleBelowHpFraction === 0.25 && L4.CHIEF.fallback === 'ogre-cave' && L4.CHIEF.helplessHitsLand === true, 'the chief has four steps and falls back to the cave below a quarter');
assert(L4.CHIEF.bossFlagOnIndividual === false && L4.CHIEF.separateFromGuardian === true, 'the chief stays separate from Guardian IV');

assert(L4.EGGS.k === 'egg' && L4.EGGS.acDelta === -4 && L4.EGGS.battles === 1 && L4.EGGS.count === 3 && L4.EGGS.oneAtATime === true && L4.EGGS.section6 === 2, 'golden eggs are the egg buff, +4 AC, one battle, one at a time');
assert(L4.EGGS.acDelta === B.KINDS.egg.acDelta && L4.EGGS.sellGp === 50 && L4.EGGS.descending === true, 'the egg AC shift matches BattleBuffs and sells for 50 gp');
assert(L4.EGGS.stacksWith.join() === 'armor,shields,rings,protection', 'an egg stacks with armor, shields, rings, and protection');
const eggState = B.create(0);
const eggs = [{ id: 'golden_egg', k: 'egg' }, { id: 'golden_egg', k: 'egg' }];
const firstEgg = B.use(eggState, eggs, eggs[0], 0);
assert(firstEgg.ok && firstEgg.buff.state === 'armed' && eggs.length === 1, 'the first egg arms outside a fight and leaves the pack');
const blocked = B.use(eggState, eggs, eggs[0], 1);
assert(!blocked.ok && blocked.reason === 'egg-blocked' && eggs.length === 1, 'a second egg is blocked while one is armed');
B.beginFight(eggState, { key: 'orcChief' }, 5);
assert(eggState.battleBuffs[0].state === 'active' && B.acDelta(eggState) === -4, 'beginFight activates the egg and the AC shift is -4');
const stillBlocked = B.use(eggState, eggs, eggs[0], 6);
assert(!stillBlocked.ok && stillBlocked.reason === 'egg-blocked', 'a second egg stays blocked while one is active');

assert(L4.LOOT.individual.U.magic.chance === 55 && L4.LOOT.lair.onCorpse === false, 'U magic is 55% and the lair chest is not a corpse drop');
assert(L4.LOOT.lair.C.cp.dice === '1d10' && L4.LOOT.lair.C.cp.times === 1000 && L4.LOOT.lair.O == null && L4.LOOT.lair.Q == null, 'lair C uses the live copper die, and O and Q dice are unset');
assert(L4.LOOT.lair.S.chance === 40 && L4.LOOT.lair.S.count === '1-8' && L4.LOOT.lair.S.kind === 'potions', 'lair S is 40% for 1-8 potions');
assert(L4.LOOT.caches.row.gp.chance === 50 && L4.LOOT.caches.row.gp.min === 3 && L4.LOOT.caches.row.gp.max === 18, 'the level-4 cache row keeps the live gold range');
assert(L4.LOOT.components.worg_pelt.perKill === 1 && L4.LOOT.components.hide.source === 'worg_pelt', 'each warg or wolf kill is one pelt, and hide comes from that pelt');

L4.ingredientIds().forEach(function (id) {
  assert(Q.SOURCES[id] && Q.SOURCES[id].level <= 4, id + ' resolves in the registry at or before L4');
});
L4.itemIds().forEach(function (id) {
  const item = Q.QUEST_ITEMS.filter(function (it) { return it.id === id; })[0];
  assert(item && item.usableByMacar === 'Y', id + ' resolves as a usable quest item');
});
assert(Q.SOURCES.worg_pelt.level === 4 && Q.SOURCES.hide.level === 4, 'pelts and hide are L4 sources');
const shield = Q.FORGE_RECIPES.filter(function (row) { return row.id === 'shield_plus_1'; })[0];
assert(shield.neededBy === 4, 'Shield +1 is first useful on L4');
Object.keys(shield.ingredientSets[0]).forEach(function (ing) {
  assert(Q.SOURCES[ing] && Q.SOURCES[ing].level <= 4, 'shield ingredient ' + ing + ' resolves by L4');
});

var resolvedBy12 = ['shaman-wis-bonus', 'shaman-list-versus-slots'];
assert(L4.OPEN.length === 25, 'L4 still records 25 choice notes');
L4.OPEN.forEach(function (row) {
  assert(row.id && row.note, row.id + ' has a note');
  if (resolvedBy12.indexOf(row.id) >= 0) {
    assert(row.note.indexOf('§1.2') >= 0 && row.note.indexOf('Resolved') === 0 && row.note.indexOf('(open)') < 0 && row.note.indexOf('not printed') < 0, row.id + ' cites section 1.2 as resolved');
  } else {
    assert(row.note.indexOf('(open)') >= 0, row.id + ' stays marked open');
  }
});
assert(L4.MONSTERS.orcLeader.countVerify === true && L4.MONSTERS.warg.ttVerify === true, 'the verify figures stay marked');
assert(html.indexOf('L4.js') < 0 && html.indexOf('maps/l4.json') < 0, 'index.html does not load the L4 data');
assert(save.indexOf('L4.js') < 0 && save.indexOf('maps/l4.json') < 0, 'GameSave does not load the L4 data');
assert(L4.wired === false && B.wired === false && Cave.wired === false, 'the L4 module, the buff queue, and the cave are not wired');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('L4 campaign data ok');

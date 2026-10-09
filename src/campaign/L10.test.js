/**
 * Level 10 campaign data. Not wired into play.
 * Run: node src/campaign/L10.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Map = require('./LevelMap');
const T = require('./CampaignTable');
const E = require('./ExitRules');
const Q = require('./QuestRegistry');
const L10 = require('./L10');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

const root = path.join(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const save = fs.readFileSync(path.join(root, 'src/saves/GameSave.js'), 'utf8');
const l10Book = Map.load(fs.readFileSync(path.join(__dirname, 'maps/l10.json'), 'utf8'));
const campaign = Map.load(fs.readFileSync(path.join(__dirname, 'maps/campaign-levels.json'), 'utf8'));

assert(l10Book.ok, l10Book.ok ? 'L10 map validates' : l10Book.errors.join('; '));
assert(campaign.ok, campaign.ok ? 'campaign book still validates' : campaign.errors.join('; '));
assert(l10Book.book.affectsPlay === false && l10Book.book.levels.length === 1, 'the L10 book is data and holds one level');
assert(JSON.stringify(campaign.book.levels[9]) === JSON.stringify(l10Book.book.levels[0]), 'the campaign book carries the same L10 map');
assert(campaign.book.levels[8].id === 'L9', 'L9 stays in place');

const level = l10Book.book.levels[0];
assert(level.id === 'L10' && level.wired === false && level.level === 10, 'L10 is unwired');
assert(level.stairsOpenOn === 'bossKill', 'L10 stairs open on the boss kill');
assert(level.boss && level.boss.key === 'king' && level.guardian && level.guardian.key === 'rubyGuardian', 'L10 has a boss and a guardian');
assert(level.boss.placement === 'fixed' && level.boss.x === 29 && level.boss.y === 16 && level.boss.hp === 72 && level.boss.ac === 0 && level.boss.room === 'throne-room', 'the Undying King is fixed at the Chapter V point');
assert(level.boss.bossFlagOnIndividual === false && level.boss.separateFromGuardian === true, 'the King is a separate fight and wears no boss flag');
assert(level.guardian.placement === 'fixed' && level.guardian.tier === 10 && level.guardian.count === 1 && level.guardian.hp === 120 && level.guardian.ac === -3 && level.guardian.hitOnlyBy === 3, 'guardian is Ruby Guardian X and needs a +3 weapon');
assert(level.guardian.bossFlagOnIndividual === false, 'the guardian wears no boss flag');
assert(level.rubyDoor.placement === 'fixed' && level.lever.enablesWhen === 'rubyGuardianDead' && level.lever.needsBoss === false && level.lever.opensStairs === false, 'the lever needs the guardian and does not open the stairs');
assert(level.elevator.auto === true && level.elevator.standIn === true && level.elevator.gate === 'guardian', 'the elevator is automatic and the guardian is its gate');
assert(level.elevator.transitionCard === 'assets/ui/intro_ch5.jpg', 'the transition card is the Chapter V intro');
assert(level.elevator.transitionCard === T.level(10).elevator.transitionCard, 'the card matches the campaign table');
assert(level.elevator.standInFor === T.level(10).elevator.standInFor, 'the card keeps the temple stand-in line');
assert(fs.existsSync(path.join(root, level.elevator.transitionCard)), 'the stand-in art file exists');
assert(level.stairs.opensOn === 'bossKill' && level.stairs.stairsOpenOn === 'bossKill', 'the stair opens when the King dies');
assert(!level.tooth && !level.loot.tooth, 'L10 has no electrum tooth of its own');

const braziers = level.setPieces.filter(function (p) { return p.id === 'ritual-braziers'; })[0];
const dais = level.setPieces.filter(function (p) { return p.id === 'throne-dais'; })[0];
const throne = level.spawns.filter(function (group) { return group.id === 'throne-room'; })[0];
const court = level.spawns.filter(function (group) { return group.id === 'south-court'; })[0];
assert(braziers && braziers.placed === true && braziers.count === 7 && braziers.places.length === 7, 'seven ritual braziers are placed');
assert(dais && dais.placed === true && dais.altar.x === 29 && dais.altar.y === 14.5 && dais.anvil === 'holy_anvil', 'the anvil sits on the altar');
assert(level.ritual.id === 'temple-ritual' && level.ritual.xpOnce === 10000 && level.ritual.teeth === 7 && level.ritual.hammer === 'holy_hammer' && level.ritual.anvil === 'holy_anvil' && level.ritual.behindBoss === true, 'the temple ritual spends the seven teeth, the hammer, and the anvil');
assert(throne.room === level.boss.room, 'the throne spawn is the boss room');
assert(throne.members.some(function (member) { return member.key === 'king' && member.count === 1 && member.role === 'boss'; }), 'the throne room has the King');
assert(throne.members.some(function (member) { return member.key === 'wight' && member.count === 2 && member.role === 'minion'; }), 'two wights stand in the boss room');
assert(throne.members.some(function (member) { return member.key === 'wraith' && member.count === 2 && member.role === 'minion'; }), 'two wraiths stand in the boss room');
assert(court.room === 'south-court' && court.members.some(function (member) { return member.key === 'duergar' && member.count === 4 && member.role === 'population'; }), 'four duergar stand in the south court');
assert(court.members.some(function (member) { return member.key === 'duergarPriest' && member.count === 1 && member.role === 'population'; }), 'the priest stands with the duergar');
assert(L10.KING.coveringUnit == null && L10.KING.priority.length === 5 && L10.KING.neverLeaves === true, 'the five steps name the throne room and no covering creature');
assert(!level.spawns.some(function (group) {
  return group.members.some(function (member) { return member.role === 'cover'; });
}), 'no covering unit is placed');

const keys = Object.keys(L10.MONSTERS);
level.spawns.forEach(function (group) {
  group.members.forEach(function (member) {
    assert(keys.indexOf(member.key) >= 0, group.id + ' member ' + member.key + ' is an L10 stat block');
  });
});
level.wander.slots.forEach(function (slot) {
  assert(keys.indexOf(slot.key) >= 0, 'wander ' + slot.key + ' is an L10 stat block');
});

assert(level.wander.slots.length === 6, 'section 5 gives L10 six wander slots');
assert(JSON.stringify(level.wander.slots) === JSON.stringify(L10.WANDER), 'the map wander table matches the encounter data');
assert(JSON.stringify(L10.WANDER) === JSON.stringify(T.level(10).wander), 'the wander table matches the campaign table');
assert(level.loot.caches.count === 16 && level.loot.caches.places.length === 16 && level.loot.caches.level === 8 && level.loot.caches.floor === 10, 'sixteen caches use the level-8 row');
assert(level.loot.lordCorpse.letter === 'U' && level.loot.lordChest.onCorpse === false && level.loot.lordChest.contents === 'chapter-v-hoard' && level.loot.lordChest.includesRuby === false && level.loot.lordChest.letter == null, 'the corpse is U and the chest is the Chapter V hoard, not the ruby');
assert(level.loot.guardianRuby.gp === 2500 && level.loot.guardianRuby.with === 'rubyGuardian', 'Guardian X keeps the 2500 gp ruby');
assert(L10.LOOT.bossChest.includesRuby === false && L10.LOOT.guardianRuby.with === 'rubyGuardian', 'the ruby is listed with the guardian only');

const exit = E.forLevel(10);
assert(exit.elevator === 'guardian' && exit.stairs === 'bossKill' && exit.stairsOpenOn === 'bossKill', 'Guardian X is the elevator and the King\'s kill opens the stairs');
assert(exit.guardian.count === 1 && exit.boss != null && exit.separateEncounters === true, 'L10 keeps one guardian and a boss');
assert(level.exit.elevator === exit.elevator && level.exit.stairs === exit.stairs && level.exit.stairsOpenOn === exit.stairsOpenOn && level.exit.win === 'mortalKing', 'the map exit uses the same gates and the mortal-king win');
assert(E.validate().length === 0, 'the ten exit rows still pass');
const bare = E.LEVELS.map(function (row) { return Object.assign({}, row); });
bare[9] = Object.assign({}, bare[9], { boss: null });
assert(E.validate(bare).some(function (err) { return err.indexOf('L10') >= 0 && err.indexOf('boss') >= 0; }), 'L10 stairs still require a boss');
const stripped = JSON.parse(JSON.stringify(campaign.book));
stripped.levels[9].boss = null;
delete stripped.levels[9].stairsOpenOn;
const noBoss = Map.load(stripped);
assert(!noBoss.ok && noBoss.errors.some(function (err) { return err.indexOf('L10') >= 0 && err.indexOf('boss') >= 0; }), 'a boss-less L10 map fails validation');
const doubled = JSON.parse(JSON.stringify(campaign.book));
doubled.levels[9].guardian.count = 2;
const two = Map.load(doubled);
assert(!two.ok && two.errors.some(function (err) { return err.indexOf('L10') >= 0 && err.indexOf('count') >= 0; }), 'a guardian count of 2 fails on L10');

Object.keys(L10.XP).forEach(function (key) {
  const mon = L10.MONSTERS[key];
  assert(mon.xp === L10.XP[key], key + ' wired XP is the printed ' + L10.XP[key]);
  if (mon.bandXp != null) {
    assert(L10.printedXp(mon) === mon.bandXp && mon.bandXp !== mon.xp, key + ' band figure stays a side field');
  } else {
    assert(L10.printedXp(mon) === mon.xp, key + ' XP formula sums to the printed total');
  }
  assert(mon.art && mon.art.newArt === false, key + ' art binds nothing new');
  if (mon.art.file) assert(fs.existsSync(path.join(root, mon.art.file)), key + ' art file exists');
});
assert(L10.bossGuardianXp() === 16800 + 5552 && L10.bossGuardianXp() === 22352, 'L10 boss-plus-guardian XP is the stat blocks, 22352');
assert(L10.bossGuardianXp() === L10.XP.king + L10.XP.rubyGuardian, 'the boss-plus-guardian sum uses the printed xp fields');
assert(L10.bossGuardianXp() !== L10.XP.king + L10.XP.rubyGuardian + L10.MONSTERS.skeleton.bandXp, 'the skeleton band is not in the boss-plus-guardian total');
assert(L10.FORECAST_BOSS_GUARDIAN_XP === 22352 && T.level(10).pacing.bossPlusGuardianXp === 22352, 'the 1.12 column matches the stat blocks, 22352');
assert(T.statBossGuardianXp(T.level(10)) === L10.bossGuardianXp(), 'the campaign table uses the same L10 stat-block total');
assert(T.level(10).boss.xp === 5552 && T.level(10).rubyGuardian.formula.xp === 16800, 'the table xp fields are the printed King and guardian totals');
assert(T.level(9).pacing.cumulativeXp === 406800, 'the clear through L9 stays 406800');
assert(T.level(10).pacing.cumulativeXp === 491800 && T.level(10).pacing.macar === 'F10', 'the L10 clear stays 491800');
assert(L10.PATH.throughL9 === 406800 && L10.PATH.l10Clear === 85000 && L10.PATH.ritual === 10000 && L10.PATH.total === 501800, 'L10\'s 85000 plus the 10000 ritual reach 501800 from 406800');
assert(T.level(10).quest.xpOnce === 10000 && T.pathXp() === 501800 && T.pathXp() >= 500001, 'the L1-L10 clear plus the ritual stays 501800');
assert(T.pathXp() === T.level(9).pacing.cumulativeXp + (T.level(10).pacing.cumulativeXp - T.level(9).pacing.cumulativeXp) + T.level(10).quest.xpOnce, 'the path is the L9 cumulative, the L10 clear, and the ritual');

assert(L10.MONSTERS.king.hp === 72 && L10.MONSTERS.king.xp === 5552 && L10.MONSTERS.king.regeneration.hpPerRound === 2, 'the King is 72 hp, 5552 XP, and regenerates 2 while a brazier burns');
assert(L10.MONSTERS.skeleton.xp === 15 && L10.MONSTERS.skeleton.bandXp === 14.5, 'the skeleton wired xp is 15 and the band is 14.5');
assert(L10.MONSTERS.duergarPriest.xp === 400 && L10.MONSTERS.duergarPriest.bandXp === 277.5, 'the priest wired xp is 400 and the band is 277.5');
assert(L10.MONSTERS.rubyGuardian.xp === 16800 && L10.MONSTERS.rubyGuardian.cone.damage === '4d6' && L10.MONSTERS.rubyGuardian.hitOnlyBy === 3, 'Guardian X is 16800 XP, the cone is 4d6, and only +3 hits');
assert(L10.MINIONS.locked === true && L10.MINIONS.guard.inBossRoom === true && L10.MINIONS.guard.counts.wight === 2 && L10.MINIONS.guard.counts.wraith === 2, 'two wights and two wraiths are the locked guard and stand with the King');
assert(L10.MINIONS.population.inBossRoom === false && L10.MINIONS.animated.placed === false, 'the duergar are the population, and Animate Dead is not a placed pack');
assert(L10.RITUAL.xpOnce === 10000 && L10.RITUAL.toothIds.length === 7 && L10.RITUAL.hammer.from === 'L8' && L10.RITUAL.anvil.from === 'L9', 'the ritual is 10000 XP and uses the seven teeth, the L8 hammer, and the L9 anvil');
assert(L10.RITUAL.steps.length === 6 && L10.RITUAL.steps[5] === 'Killing the mortal King wins.', 'the ritual ends when the mortal King dies');

assert(L10.POISON.mode === 'h1' && L10.POISON.floor === 2 && L10.POISON.floorRule === '6 #12' && L10.POISON.mods === T.poisonSave, 'H1 points at CampaignTable.poisonSave and floors at 2');
assert(L10.POISON.residentsUsePoison === false && L10.POISON.appliesTo.length === 0, 'no L10 attack is a poison save, so the spider mods are not applied');
['large', 'huge', 'giant', 'phase', 'queen'].forEach(function (size) {
  assert(typeof L10.POISON.mods[size] === 'number', 'the shared poison table still has ' + size);
});
assert(L10.LOOT.caches.row.cp == null && L10.LOOT.caches.row.gp.chance === 65 && L10.LOOT.caches.row.gp.min === 8 && L10.LOOT.caches.row.gp.max === 48, 'the level-8 cache row keeps the live gold range');

L10.RITUAL.toothIds.forEach(function (id) {
  const item = Q.QUEST_ITEMS.filter(function (it) { return it.id === id; })[0];
  assert(item && item.usableByMacar === 'Y', id + ' is a ritual tooth');
});
assert(Q.QUEST_ITEMS.some(function (it) { return it.id === 'holy_hammer' && it.usableByMacar === 'Y'; }), 'the Holy Hammer resolves');
assert(Q.QUEST_ITEMS.some(function (it) { return it.id === 'holy_anvil' && it.displayName === 'Holy Anvil of Truth'; }), 'the Holy Anvil of Truth resolves');
L10.itemIds().forEach(function (id) {
  const item = Q.QUEST_ITEMS.filter(function (it) { return it.id === id; })[0];
  assert(item && item.kind === 'ritual' && item.usableByMacar === 'Y', id + ' resolves as the temple ritual');
});
assert(L10.ingredientIds().length === 0, 'L10 adds no new crafting ingredient');
const chain = Q.FORGE_RECIPES.filter(function (row) { return row.id === 'adamantine_chain_2'; })[0];
assert(chain && chain.neededBy === 10 && chain.availableFrom <= 10, 'Adamantine Chain +2 is due by L10');
chain.ingredientSets.forEach(function (set) {
  Object.keys(set).forEach(function (ing) {
    assert(Q.SOURCES[ing] && Q.SOURCES[ing].level <= 10, 'adamantine_chain_2 ingredient ' + ing + ' resolves by L10');
  });
});
assert(T.level(10).quest.id === 'temple-ritual' && T.level(10).quest.xpOnce === 10000 && T.level(10).pacing.keyItems[0] === 'ritual complete', 'the level table tracks the temple ritual and its XP');

assert(L10.OPEN.length === 21 && L10.OPEN.every(function (row) { return row.id && row.note.indexOf('(open)') >= 0; }), 'each open L10 choice is marked in the data');
assert(html.indexOf('L10.js') < 0 && html.indexOf('maps/l10.json') < 0, 'index.html does not load the L10 data');
assert(save.indexOf('L10.js') < 0 && save.indexOf('maps/l10.json') < 0, 'GameSave does not load the L10 data');
assert(L10.wired === false, 'the L10 module is not wired');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('L10 campaign data ok');

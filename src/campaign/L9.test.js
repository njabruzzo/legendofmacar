/**
 * Level 9 campaign data. Not wired into play.
 * Run: node src/campaign/L9.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Map = require('./LevelMap');
const T = require('./CampaignTable');
const E = require('./ExitRules');
const Q = require('./QuestRegistry');
const L9 = require('./L9');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

const root = path.join(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const save = fs.readFileSync(path.join(root, 'src/saves/GameSave.js'), 'utf8');
const l9Book = Map.load(fs.readFileSync(path.join(__dirname, 'maps/l9.json'), 'utf8'));
const campaign = Map.load(fs.readFileSync(path.join(__dirname, 'maps/campaign-levels.json'), 'utf8'));

assert(l9Book.ok, l9Book.ok ? 'L9 map validates' : l9Book.errors.join('; '));
assert(campaign.ok, campaign.ok ? 'campaign book still validates' : campaign.errors.join('; '));
assert(l9Book.book.affectsPlay === false && l9Book.book.levels.length === 1, 'the L9 book is data and holds one level');
assert(JSON.stringify(campaign.book.levels[8]) === JSON.stringify(l9Book.book.levels[0]), 'the campaign book carries the same L9 map');
assert(campaign.book.levels[7].id === 'L8' && campaign.book.levels[9].id === 'L10', 'L8 and L10 stay in place');

const level = l9Book.book.levels[0];
assert(level.id === 'L9' && level.wired === false && level.level === 9, 'L9 is unwired');
assert(level.stairsOpenOn === 'bossKill', 'L9 stairs open on the boss kill');
assert(level.boss && level.boss.key === 'redDragon' && level.guardian && level.guardian.key === 'rubyGuardian', 'L9 has a boss and a guardian');
assert(level.boss.placement === 'fixed' && level.boss.hp === 66 && level.boss.ac === -1 && level.boss.age === 'old' && level.boss.room === 'dragon-lair', 'the old red dragon is fixed in the lair');
assert(level.boss.bossFlagOnIndividual === false && level.boss.separateFromGuardian === true, 'the dragon is a separate fight and wears no boss flag');
assert(level.guardian.placement === 'fixed' && level.guardian.tier === 9 && level.guardian.count === 1 && level.guardian.hp === 108 && level.guardian.ac === -2 && level.guardian.hitOnlyBy === 2, 'guardian is Ruby Guardian IX and needs a +2 weapon');
assert(level.guardian.bossFlagOnIndividual === false, 'the guardian wears no boss flag');
assert(level.rubyDoor.placement === 'fixed' && level.lever.enablesWhen === 'rubyGuardianDead' && level.lever.needsBoss === false && level.lever.opensStairs === false, 'the lever needs the guardian and does not open the stairs');
assert(level.elevator.auto === true && level.elevator.standIn === true && level.elevator.gate === 'guardian', 'the elevator is automatic and the guardian is its gate');
assert(level.elevator.transitionCard === 'assets/creatures/mon_deepdragon.png', 'the transition card is the deep-dragon sheet');
assert(level.elevator.transitionCard === T.level(9).elevator.transitionCard, 'the card matches the campaign table');
assert(level.elevator.note === T.level(9).elevator.note, 'the card keeps the stand-in note');
assert(fs.existsSync(path.join(root, level.elevator.transitionCard)), 'the stand-in art file exists');
assert(level.stairs.opensOn === 'bossKill' && level.stairs.stairsOpenOn === 'bossKill', 'the stair opens when the dragon dies');
assert(!level.tooth && !level.loot.tooth, 'L9 has no electrum tooth');
assert(level.anvil.id === 'holy_anvil' && level.anvil.displayName === 'Holy Anvil of Truth' && level.anvil.behindBoss === true && level.anvil.room === 'dragon-lair' && level.anvil.forgeTier === 'top' && level.anvil.usableByMacar === 'Y', 'the Holy Anvil of Truth is the L9 quest item and sits behind the boss');

const hoard = level.setPieces.filter(function (p) { return p.id === 'dragon-hoard'; })[0];
const lair = level.spawns.filter(function (group) { return group.id === 'dragon-lair'; })[0];
assert(hoard && hoard.placed === true && hoard.room === level.boss.room && hoard.quest === 'holy_anvil' && hoard.includesRuby === false && hoard.letter === 'H', 'the hoard is in the lair and holds the anvil, not the ruby');
assert(lair.room === level.boss.room, 'the lair spawn is the boss room');
assert(lair.members.some(function (member) { return member.key === 'redDragon' && member.count === 1 && member.role === 'boss'; }), 'the lair has the dragon');
assert(lair.members.some(function (member) { return member.key === 'firegiant' && member.count === 2 && member.role === 'minion'; }), 'two fire giants stand in the boss room');
assert(lair.members.some(function (member) { return member.key === 'hellHound' && member.count === 2 && member.role === 'minion'; }), 'two hell hounds stand in the boss room');
assert(L9.DRAGON.coveringUnit == null && L9.DRAGON.priority.length === 4 && L9.DRAGON.inLair === true, 'the four steps name the lair and no covering creature');
assert(!level.spawns.some(function (group) {
  return group.members.some(function (member) { return member.role === 'cover'; });
}), 'no covering unit is placed');

const keys = Object.keys(L9.MONSTERS);
level.spawns.forEach(function (group) {
  group.members.forEach(function (member) {
    assert(keys.indexOf(member.key) >= 0, group.id + ' member ' + member.key + ' is an L9 stat block');
  });
});
level.wander.slots.forEach(function (slot) {
  assert(keys.indexOf(slot.key) >= 0, 'wander ' + slot.key + ' is an L9 stat block');
});

assert(level.wander.slots.length === 6, 'section 5 gives L9 six wander slots');
assert(JSON.stringify(level.wander.slots) === JSON.stringify(L9.WANDER), 'the map wander table matches the encounter data');
assert(JSON.stringify(L9.WANDER) === JSON.stringify(T.level(9).wander), 'the wander table matches the campaign table');
assert(level.loot.caches.count === 16 && level.loot.caches.places.length === 16 && level.loot.caches.level === 8 && level.loot.caches.floor === 9, 'sixteen caches use the level-8 row');
assert(level.loot.lordCorpse.letter === 'U' && level.loot.lordChest.onCorpse === false && level.loot.lordChest.contents === 'lair-H' && level.loot.lordChest.includesRuby === false && level.loot.lordChest.quest === 'holy_anvil' && level.loot.lordChest.room === 'dragon-lair', 'the corpse is U and the chest is lair H with the anvil, not the ruby');
assert(level.loot.guardianRuby.gp === 2250 && level.loot.guardianRuby.with === 'rubyGuardian', 'Guardian IX keeps the 2250 gp ruby');
assert(L9.LOOT.bossChest.includesRuby === false && L9.LOOT.guardianRuby.with === 'rubyGuardian', 'the ruby is listed with the guardian only');
assert(level.loot.scales.count === 3 && level.loot.scales.id === 'dragon_scale', 'the corpse yields three dragon scales');

const exit = E.forLevel(9);
assert(exit.elevator === 'guardian' && exit.stairs === 'bossKill' && exit.stairsOpenOn === 'bossKill', 'Guardian IX is the elevator and the dragon\'s kill opens the stairs');
assert(exit.boss != null && exit.separateEncounters === true, 'L9 keeps a boss and is not the L1 exception');
assert(level.exit.elevator === exit.elevator && level.exit.stairs === exit.stairs && level.exit.stairsOpenOn === exit.stairsOpenOn, 'the map exit uses the same gates');
assert(E.validate().length === 0, 'the ten exit rows still pass');
const bare = E.LEVELS.map(function (row) { return Object.assign({}, row); });
bare[8] = Object.assign({}, bare[8], { boss: null });
assert(E.validate(bare).some(function (err) { return err.indexOf('L9') >= 0 && err.indexOf('boss') >= 0; }), 'L9 stairs still require a boss');
const stripped = JSON.parse(JSON.stringify(campaign.book));
stripped.levels[8].boss = null;
delete stripped.levels[8].stairsOpenOn;
const noBoss = Map.load(stripped);
assert(!noBoss.ok && noBoss.errors.some(function (err) { return err.indexOf('L9') >= 0 && err.indexOf('boss') >= 0; }), 'a boss-less L9 map fails validation');

Object.keys(L9.XP).forEach(function (key) {
  const mon = L9.MONSTERS[key];
  assert(mon.xp === L9.XP[key], key + ' wired XP is the printed ' + L9.XP[key]);
  if (mon.bandXp != null) {
    assert(L9.printedXp(mon) === mon.bandXp && mon.bandXp !== mon.xp, key + ' band figure stays a side field');
  } else {
    assert(L9.printedXp(mon) === mon.xp, key + ' XP formula sums to the printed total');
  }
  assert(mon.art && mon.art.newArt === false, key + ' art binds nothing new');
  if (mon.art.file) assert(fs.existsSync(path.join(root, mon.art.file)), key + ' art file exists');
});
assert(L9.MONSTERS.redDragon.speakingXp === 4756 && L9.MONSTERS.redDragon.speakingXp !== L9.MONSTERS.redDragon.xp, 'the speaking column is a side field');
assert(L9.bossGuardianXp() === 10800 + 3906 && L9.bossGuardianXp() === 14706, 'L9 boss-plus-guardian XP is the stat blocks, 14706');
assert(L9.bossGuardianXp() === L9.XP.redDragon + L9.XP.rubyGuardian, 'the boss-plus-guardian sum uses the printed xp fields');
assert(L9.bossGuardianXp() !== L9.MONSTERS.redDragon.speakingXp + L9.XP.rubyGuardian, 'the speaking column is not in the boss-plus-guardian total');
assert(L9.FORECAST_BOSS_GUARDIAN_XP === 21260 && T.level(9).pacing.bossPlusGuardianXp === 14706, 'the 1.12 forecast of 21260 is not the pacing total');
assert(T.statBossGuardianXp(T.level(9)) === L9.bossGuardianXp(), 'the campaign table uses the same L9 stat-block total');
assert(T.level(9).boss.xp === 3906 && T.level(9).boss.speakingXp === 4756 && T.level(9).rubyGuardian.formula.xp === 10800, 'the table xp fields keep the printed dragon and the speaking side column');
assert(T.level(9).pacing.cumulativeXp === 410000 && T.level(9).pacing.macar === 'F9', 'the L9 clear stays at the 1.12 F9 row, 410000');
assert(T.level(9).pacing.cumulativeXp >= T.FIGHTER_XP.F9 && T.level(9).pacing.cumulativeXp < T.FIGHTER_XP.F10, '410000 sits in the F9 band');
assert(T.pathXp() === 510000 && T.pathXp() >= 500001, 'the L1-L10 clear plus the ritual stays 510000');

assert(L9.MONSTERS.redDragon.age === 'old' && L9.MONSTERS.redDragon.hp === 66 && L9.MONSTERS.redDragon.xp === 3906 && L9.MONSTERS.redDragon.breath.perDay === 3 && L9.MONSTERS.redDragon.breath.applyDmgG === false, 'the old red is 66 hp, 3906 XP, and breathes for its current HP');
assert(L9.MONSTERS.firegiant.xp === 2960 && L9.MONSTERS.firegiant.bandXp === 2840 && L9.MONSTERS.firegiant.immune.indexOf('fire') >= 0, 'the fire giant wired xp is 2960 and the band is 2840');
assert(L9.MONSTERS.hellHound.xp === 315 && L9.MONSTERS.hellHound.breath.save === 'vs breath for half', 'the hound is the printed 315 and breathes for its HP');
assert(L9.MONSTERS.rubyGuardian.xp === 10800 && L9.MONSTERS.rubyGuardian.cone.damage === '3d6', 'Guardian IX is 10800 XP and the cone is 3d6');
assert(L9.MINIONS.locked === true && L9.MINIONS.decision === 'D7-B' && L9.MINIONS.inBossRoom === true && L9.MINIONS.counts.firegiant === 2 && L9.MINIONS.counts.hellHound === 2, 'two giants and two hounds are the locked minions and stand with the dragon');
assert(L9.DRAGON.subdual === false && L9.DRAGON.takeoff.belowHpFraction === 0.5 && L9.DRAGON.takeoff.stillCanHit.indexOf('thrown Holy Hammer') >= 0, 'subdual is off, and the takeoff still allows the thrown hammer');
assert(L9.ANVIL.id === 'holy_anvil' && L9.ANVIL.displayName === 'Holy Anvil of Truth' && L9.ANVIL.behindBoss === true, 'the anvil id and display name match section 6');

assert(L9.POISON.mode === 'h1' && L9.POISON.floor === 2 && L9.POISON.floorRule === '6 #12' && L9.POISON.mods === T.poisonSave, 'H1 points at CampaignTable.poisonSave and floors at 2');
assert(L9.POISON.residentsUsePoison === false && L9.POISON.appliesTo.length === 0, 'no L9 attack is a poison save, so the spider mods are not applied');
['large', 'huge', 'giant', 'phase', 'queen'].forEach(function (size) {
  assert(typeof L9.POISON.mods[size] === 'number', 'the shared poison table still has ' + size);
});
assert(L9.LOOT.caches.row.cp == null && L9.LOOT.caches.row.gp.chance === 65 && L9.LOOT.caches.row.gp.min === 8 && L9.LOOT.caches.row.gp.max === 48, 'the level-8 cache row keeps the live gold range');
assert(L9.LOOT.lair.H.onCorpse === false && L9.LOOT.lair.H.magic.items === 4 && L9.LOOT.lair.H.magic.potion === 1 && L9.LOOT.lair.H.magic.scroll === 1 && L9.LOOT.lair.H.magic.scrollFilter === 'protection', 'lair H stays off the corpse and keeps the printed magic mix');
assert(L9.LOOT.components.dragon_scale.perKill === 3, 'three scales come off the dragon');

L9.ingredientIds().forEach(function (id) {
  assert(Q.SOURCES[id] && Q.SOURCES[id].level <= 9, id + ' resolves in the registry at or before L9');
});
L9.itemIds().forEach(function (id) {
  const item = Q.QUEST_ITEMS.filter(function (it) { return it.id === id; })[0];
  assert(item && item.usableByMacar === 'Y' && item.displayName === 'Holy Anvil of Truth', id + ' resolves as the Holy Anvil of Truth');
});
assert(Q.SOURCES.dragon_scale.level === 9 && Q.SOURCES.holy_anvil.level === 9, 'scales and the anvil are L9 sources');
const chain = Q.FORGE_RECIPES.filter(function (row) { return row.id === 'adamantine_chain_2'; })[0];
assert(chain && chain.availableFrom === 9 && chain.neededBy <= 10, 'Adamantine Chain +2 is available on L9');
chain.ingredientSets.forEach(function (set) {
  Object.keys(set).forEach(function (ing) {
    assert(Q.SOURCES[ing] && Q.SOURCES[ing].level <= 9, 'adamantine_chain_2 ingredient ' + ing + ' resolves by L9');
  });
});
assert(T.level(9).quest.id === 'holy_anvil' && T.level(9).quest.displayName === 'Holy Anvil of Truth' && T.level(9).pacing.keyItems[0] === 'Holy Anvil of Truth', 'the level table tracks the Holy Anvil of Truth');

assert(L9.OPEN.length === 17 && L9.OPEN.every(function (row) { return row.id && row.note.indexOf('(open)') >= 0; }), 'each open L9 choice is marked in the data');
assert(html.indexOf('L9.js') < 0 && html.indexOf('maps/l9.json') < 0, 'index.html does not load the L9 data');
assert(save.indexOf('L9.js') < 0 && save.indexOf('maps/l9.json') < 0, 'GameSave does not load the L9 data');
assert(L9.wired === false, 'the L9 module is not wired');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('L9 campaign data ok');

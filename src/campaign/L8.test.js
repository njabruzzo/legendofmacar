/**
 * Level 8 campaign data. Not wired into play.
 * Run: node src/campaign/L8.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Map = require('./LevelMap');
const T = require('./CampaignTable');
const E = require('./ExitRules');
const Q = require('./QuestRegistry');
const L8 = require('./L8');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

const root = path.join(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const save = fs.readFileSync(path.join(root, 'src/saves/GameSave.js'), 'utf8');
const l8Book = Map.load(fs.readFileSync(path.join(__dirname, 'maps/l8.json'), 'utf8'));
const campaign = Map.load(fs.readFileSync(path.join(__dirname, 'maps/campaign-levels.json'), 'utf8'));
const l7Map = JSON.parse(fs.readFileSync(path.join(__dirname, 'maps/l7.json'), 'utf8'));

assert(l8Book.ok, l8Book.ok ? 'L8 map validates' : l8Book.errors.join('; '));
assert(campaign.ok, campaign.ok ? 'campaign book still validates' : campaign.errors.join('; '));
assert(l8Book.book.affectsPlay === false && l8Book.book.levels.length === 1, 'the L8 book is data and holds one level');
assert(JSON.stringify(campaign.book.levels[7]) === JSON.stringify(l8Book.book.levels[0]), 'the campaign book carries the same L8 map');
assert(campaign.book.levels[6].id === 'L7' && campaign.book.levels[8].id === 'L9', 'L7 and L9 stay in place');
assert(T.level(7).quest.lastTooth === true && l7Map.levels[0].tooth.lastTooth === true, 'the L7 table tooth matches the L7 map last-tooth flag');

const level = l8Book.book.levels[0];
assert(level.id === 'L8' && level.wired === false && level.level === 8, 'L8 is unwired');
assert(level.stairsOpenOn === 'bossKill', 'L8 stairs open on the boss kill');
assert(level.boss && level.boss.key === 'beholder' && level.guardian && level.guardian.key === 'rubyGuardian', 'L8 has a boss and a guardian');
assert(level.boss.placement === 'fixed' && level.boss.x === 52 && level.boss.y === 42 && level.boss.hp === 60 && level.boss.ac === 0, 'the beholder is fixed at the Chapter IV elder-brain point');
assert(level.boss.bossFlagOnIndividual === false && level.boss.separateFromGuardian === true, 'the beholder is a separate fight and wears no boss flag');
assert(level.guardian.placement === 'fixed' && level.guardian.tier === 8 && level.guardian.count === 1 && level.guardian.hp === 96 && level.guardian.ac === -1 && level.guardian.hitOnlyBy === 2, 'guardian is Ruby Guardian VIII and needs a +2 weapon');
assert(level.guardian.bossFlagOnIndividual === false, 'the guardian wears no boss flag');
assert(level.rubyDoor.placement === 'fixed' && level.lever.enablesWhen === 'rubyGuardianDead' && level.lever.needsBoss === false && level.lever.opensStairs === false, 'the lever needs the guardian and does not open the stairs');
assert(level.elevator.auto === true && level.elevator.standIn === true && level.elevator.gate === 'guardian', 'the elevator is automatic and the guardian is its gate');
assert(level.elevator.transitionCard === 'assets/creatures/mon_beholder.png', 'the transition card is the beholder sheet');
assert(level.elevator.transitionCard === T.level(8).elevator.transitionCard, 'the card matches the campaign table');
assert(fs.existsSync(path.join(root, level.elevator.transitionCard)), 'the stand-in art file exists');
assert(level.stairs.opensOn === 'bossKill' && level.stairs.x === 50.1 && level.stairs.y === 61.2, 'the chapter stair opens when the beholder dies');
assert(!level.tooth && !level.loot.tooth, 'L8 has no electrum tooth');
assert(level.hammer.id === 'holy_hammer' && level.hammer.plus === 3 && level.hammer.behindBoss === true && level.hammer.room === 'beholder-lair' && level.hammer.usableByMacar === 'Y', 'the Holy Hammer is the L8 quest item and sits behind the boss');

const hoard = level.setPieces.filter(function (p) { return p.id === 'beholder-hoard'; })[0];
const shaft = level.setPieces.filter(function (p) { return p.id === 'shaft'; })[0];
const lair = level.spawns.filter(function (group) { return group.id === 'beholder-lair'; })[0];
assert(hoard && hoard.placed === true && hoard.room === level.boss.room && hoard.quest === 'holy_hammer' && hoard.includesRuby === false, 'the hoard is in the beholder lair and holds the hammer, not the ruby');
assert(shaft && shaft.placed === true && shaft.room === level.boss.room && shaft.x === 50 && shaft.y === 38, 'the shaft stays at the lair north entrance');
assert(L8.BEHOLDER.retreat.wiringNote.indexOf('arrival') >= 0 && L8.BEHOLDER.retreat.wiringNote.indexOf('wiring pass') >= 0, 'the retreat toward the arrival is flagged for the wiring pass');
assert(lair.room === level.boss.room, 'the lair spawn is the boss room');
assert(lair.members.some(function (member) { return member.key === 'beholder' && member.count === 1; }), 'the lair has the beholder');
assert(lair.members.some(function (member) { return member.key === 'duergar' && member.count === 4 && member.role === 'minion' && member.charmed === true; }), 'four charmed duergar stand in the boss room');
assert(lair.members.some(function (member) { return member.key === 'umberhulk' && member.count === 1 && member.role === 'minion' && member.charmed === true; }), 'one charmed umber hulk stands in the boss room');
assert(L8.BEHOLDER.coveringUnit == null && L8.BEHOLDER.shaftInRoom === true && L8.BEHOLDER.priority.length === 5, 'the five steps name the shaft and no covering creature');
assert(!level.spawns.some(function (group) {
  return group.members.some(function (member) { return member.role === 'cover' || member.key === 'elderbrain' || member.key === 'deathtyrant'; });
}), 'no covering unit, elder brain, or death tyrant is placed');
assert(level.lairArt.file === 'assets/creatures/mon_deathtyrant.png' && fs.existsSync(path.join(root, level.lairArt.file)), 'the death-tyrant sheet is lair art');

const keys = Object.keys(L8.MONSTERS);
level.spawns.forEach(function (group) {
  group.members.forEach(function (member) {
    assert(keys.indexOf(member.key) >= 0, group.id + ' member ' + member.key + ' is an L8 stat block');
  });
});

assert(level.wander.slots.length === 6, 'section 5 gives L8 six wander slots');
assert(JSON.stringify(level.wander.slots) === JSON.stringify(L8.WANDER), 'the map wander table matches the encounter data');
assert(JSON.stringify(L8.WANDER) === JSON.stringify(T.level(8).wander), 'the wander table matches the campaign table');
assert(level.loot.caches.count === 16 && level.loot.caches.places.length === 16 && level.loot.caches.level === 8, 'sixteen level-8 caches');
assert(level.loot.lordCorpse.letter === 'U' && level.loot.lordChest.onCorpse === false && level.loot.lordChest.contents === 'lair-I' && level.loot.lordChest.includesRuby === false && level.loot.lordChest.quest === 'holy_hammer' && level.loot.lordChest.room === 'beholder-lair', 'the corpse is U and the chest is lair I with the hammer, not the ruby');
assert(level.loot.guardianRuby.gp === 2000 && level.loot.guardianRuby.with === 'rubyGuardian', 'Guardian VIII keeps the 2000 gp ruby');
assert(L8.LOOT.bossChest.includesRuby === false && L8.LOOT.guardianRuby.with === 'rubyGuardian', 'the ruby is listed with the guardian only');

const exit = E.forLevel(8);
assert(exit.elevator === 'guardian' && exit.stairs === 'bossKill' && exit.stairsOpenOn === 'bossKill', 'Guardian VIII is the elevator and the beholder\'s kill opens the stairs');
assert(exit.boss != null && exit.separateEncounters === true, 'L8 keeps a boss and is not the L1 exception');
assert(level.exit.elevator === exit.elevator && level.exit.stairs === exit.stairs && level.exit.stairsOpenOn === exit.stairsOpenOn, 'the map exit uses the same gates');
assert(E.validate().length === 0, 'the ten exit rows still pass');
const bare = E.LEVELS.map(function (row) { return Object.assign({}, row); });
bare[7] = Object.assign({}, bare[7], { boss: null });
assert(E.validate(bare).some(function (err) { return err.indexOf('L8') >= 0 && err.indexOf('boss') >= 0; }), 'L8 stairs still require a boss');
const stripped = JSON.parse(JSON.stringify(campaign.book));
stripped.levels[7].boss = null;
delete stripped.levels[7].stairsOpenOn;
const noBoss = Map.load(stripped);
assert(!noBoss.ok && noBoss.errors.some(function (err) { return err.indexOf('L8') >= 0 && err.indexOf('boss') >= 0; }), 'a boss-less L8 map fails validation');

Object.keys(L8.XP).forEach(function (key) {
  const mon = L8.MONSTERS[key];
  assert(mon.xp === L8.XP[key], key + ' wired XP is the printed ' + L8.XP[key]);
  if (mon.bandXp != null) {
    assert(L8.printedXp(mon) === mon.bandXp && mon.bandXp !== mon.xp, key + ' band figure stays a side field');
  } else {
    assert(L8.printedXp(mon) === mon.xp, key + ' XP formula sums to the printed total');
  }
  assert(mon.art && mon.art.newArt === false, key + ' art binds nothing new');
  if (mon.art.file) assert(fs.existsSync(path.join(root, mon.art.file)), key + ' art file exists');
});
assert(L8.bossGuardianXp() === 8420 + 7910 && L8.bossGuardianXp() === 16330, 'L8 boss-plus-guardian XP is the stat blocks, 16330');
assert(L8.bossGuardianXp() === L8.XP.beholder + L8.XP.rubyGuardian, 'the boss-plus-guardian sum uses the printed xp fields');
assert(L8.FORECAST_BOSS_GUARDIAN_XP === 16330 && T.level(8).pacing.bossPlusGuardianXp === 16330, 'the 1.12 column matches the stat blocks, 16330');
assert(T.statBossGuardianXp(T.level(8)) === L8.bossGuardianXp(), 'the campaign table uses the same L8 stat-block total');
assert(T.level(8).boss.xp === 7910 && T.level(8).rubyGuardian.formula.xp === 8420, 'the table xp fields are the printed beholder and guardian totals');
assert(T.level(8).pacing.cumulativeXp === 267200 && T.level(8).pacing.macar === 'F9', 'the L8 clear stays at the 1.12 F9 row, 267200');
assert(T.level(8).pacing.cumulativeXp >= T.FIGHTER_XP.F9 && T.level(8).pacing.cumulativeXp < T.FIGHTER_XP.F10, '267200 sits in the F9 band');
assert(T.pathXp() === 501800 && T.pathXp() >= 500001, 'the L1-L10 clear plus the ritual stays 501800');

assert(L8.MONSTERS.beholder.hp === 60 && L8.MONSTERS.beholder.xp === 7910 && L8.MONSTERS.beholder.acBody === 0 && L8.MONSTERS.beholder.acCentralEye === 7 && L8.MONSTERS.beholder.acEyestalk === 2, 'the beholder is 60 hp, AC 0/7/2, 7910 XP');
assert(L8.MONSTERS.duergar.xp === 86 && L8.MONSTERS.duergar.hd === '1+2' && L8.MONSTERS.duergar.immune.indexOf('poison') >= 0, 'the duergar is 1+2, 86 XP, and immune to poison');
assert(L8.MONSTERS.orc.xp === 15 && L8.MONSTERS.orc.bandXp === 14.5, 'the orc wired xp is the printed 15 and the band is 14.5');
assert(L8.MONSTERS.umberhulk.xp === 1828 && L8.MONSTERS.umberhulk.gaze.save === 'vs spell', 'the hulk is 1828 XP and its gaze is a spell save');
assert(L8.MONSTERS.rubyGuardian.xp === 8420 && L8.MONSTERS.rubyGuardian.cone.damage === '3d6', 'Guardian VIII is 8420 XP and the cone is 3d6');
assert(L8.MINIONS.locked === true && L8.MINIONS.decision === 'D6-B' && L8.MINIONS.inBossRoom === true && L8.MINIONS.counts.duergar === 4 && L8.MINIONS.counts.umberhulk === 1, 'four duergar and one hulk are the locked thralls and stand with the beholder');
assert(L8.MINIONS.onBeholderDeath.duergar === 'flee' && L8.MINIONS.onBeholderDeath.umberhulk === 'hostile', 'freed duergar flee and the hulk turns hostile');
assert(L8.BEHOLDER.cone.lengthTiles === 14 && L8.BEHOLDER.rays.perSec === 2 && L8.BEHOLDER.eyestalks.specialtyTotal === 19 && L8.BEHOLDER.retreat.belowHpFraction === 0.3, 'the cone, the rays, the stalks, and the retreat match the printed steps');
assert(L8.HAMMER.plus === 3 && L8.HAMMER.behindBoss === true && L8.HAMMER.thrown.range === '6"' && L8.HAMMER.thrown.returns === true, 'the hammer is +3, throwable 6", and returns');

assert(L8.POISON.mode === 'h1' && L8.POISON.floor === 2 && L8.POISON.floorRule === '6 #12' && L8.POISON.mods === T.poisonSave, 'H1 points at CampaignTable.poisonSave and floors at 2');
assert(L8.POISON.residentsUsePoison === false && L8.POISON.appliesTo.length === 0, 'no L8 attack is a poison save, so the spider mods are not applied');
['large', 'huge', 'giant', 'phase', 'queen'].forEach(function (size) {
  assert(typeof L8.POISON.mods[size] === 'number', 'the shared poison table still has ' + size);
});
assert(L8.LOOT.caches.row.cp == null && L8.LOOT.caches.row.gp.chance === 65 && L8.LOOT.caches.row.gp.min === 8 && L8.LOOT.caches.row.gp.max === 48, 'the level-8 cache row keeps the live gold range');
assert(L8.LOOT.lair.I.onCorpse === false && L8.LOOT.lair.I.magic.chance === 15 && L8.LOOT.lair.I.magic.count === 1, 'lair I stays off the corpse');

L8.itemIds().forEach(function (id) {
  const item = Q.QUEST_ITEMS.filter(function (it) { return it.id === id; })[0];
  assert(item && item.usableByMacar === 'Y', id + ' resolves as a usable quest item');
});
assert(L8.ingredientIds().length === 0, 'L8 adds no new crafting ingredient');
const chain = Q.FORGE_RECIPES.filter(function (row) { return row.id === 'adamantine_chain_1'; })[0];
assert(chain && chain.neededBy === 8 && chain.availableFrom <= 8, 'Adamantine Chain +1 is due by L8');
chain.ingredientSets.forEach(function (set) {
  Object.keys(set).forEach(function (ing) {
    assert(Q.SOURCES[ing] && Q.SOURCES[ing].level <= 8, 'adamantine_chain_1 ingredient ' + ing + ' resolves by L8');
  });
});
assert(T.level(8).pacing.keyItems[0] === 'Holy Hammer +3' && T.level(8).quest.id === 'holy_hammer', 'the L8 key item is the Holy Hammer');

assert(L8.OPEN.length === 18 && L8.OPEN.every(function (row) { return row.id && row.note.indexOf('(open)') >= 0; }), 'each open L8 choice is marked in the data');
const forecast = L8.OPEN.filter(function (row) { return row.id === 'forecast-pack'; })[0];
assert(forecast.note.indexOf('18,502') >= 0 && forecast.note.indexOf('rounds to the printed 18,500') >= 0, '18,502 rounds to the printed 18,500');
assert(html.indexOf('L8.js') < 0 && html.indexOf('maps/l8.json') < 0, 'index.html does not load the L8 data');
assert(save.indexOf('L8.js') < 0 && save.indexOf('maps/l8.json') < 0, 'GameSave does not load the L8 data');
assert(L8.wired === false, 'the L8 module is not wired');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('L8 campaign data ok');

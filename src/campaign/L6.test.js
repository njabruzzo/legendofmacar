/**
 * Level 6 campaign data. Not wired into play.
 * Run: node src/campaign/L6.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Map = require('./LevelMap');
const T = require('./CampaignTable');
const E = require('./ExitRules');
const Q = require('./QuestRegistry');
const L6 = require('./L6');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

const root = path.join(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const save = fs.readFileSync(path.join(root, 'src/saves/GameSave.js'), 'utf8');
const l6Book = Map.load(fs.readFileSync(path.join(__dirname, 'maps/l6.json'), 'utf8'));
const campaign = Map.load(fs.readFileSync(path.join(__dirname, 'maps/campaign-levels.json'), 'utf8'));

assert(l6Book.ok, l6Book.ok ? 'L6 map validates' : l6Book.errors.join('; '));
assert(campaign.ok, campaign.ok ? 'campaign book still validates' : campaign.errors.join('; '));
assert(l6Book.book.affectsPlay === false && l6Book.book.levels.length === 1, 'the L6 book is data and holds one level');
assert(JSON.stringify(campaign.book.levels[5]) === JSON.stringify(l6Book.book.levels[0]), 'the campaign book carries the same L6 map');
assert(campaign.book.levels[4].id === 'L5' && campaign.book.levels[6].id === 'L7', 'L5 and L7 stay in place');

const level = l6Book.book.levels[0];
assert(level.id === 'L6' && level.wired === false && level.level === 6, 'L6 is unwired');
assert(level.stairsOpenOn === 'bossKill', 'L6 stairs open on the boss kill');
assert(level.boss && level.boss.key === 'emberLord' && level.guardian && level.guardian.key === 'rubyGuardian', 'L6 has a boss and a guardian');
assert(level.boss.placement === 'fixed' && level.boss.x === 8 && level.boss.y === 74 && level.boss.hp === 72 && level.boss.ac === 2 && level.boss.hitOnlyBy === 2, 'the Ember Lord is fixed in the west vestry');
assert(level.boss.bossFlagOnIndividual === false && level.boss.separateFromGuardian === true, 'the lord is a separate fight and wears no boss flag');
assert(level.guardian.placement === 'fixed' && level.guardian.tier === 6 && level.guardian.count === 1 && level.guardian.hp === 72 && level.guardian.ac === 1 && level.guardian.hitOnlyBy === 1, 'guardian is Ruby Guardian VI and needs a +1 weapon');
assert(level.guardian.bossFlagOnIndividual === false, 'the guardian wears no boss flag');
assert(level.rubyDoor.placement === 'fixed' && level.lever.enablesWhen === 'rubyGuardianDead' && level.lever.needsBoss === false && level.lever.opensStairs === false, 'the lever needs the guardian and does not open the stairs');
assert(level.elevator.auto === true && level.elevator.standIn === true && level.elevator.gate === 'guardian', 'the elevator is automatic and the guardian is its gate');
assert(level.elevator.transitionCard === 'assets/creatures/mon_magmaelem.png', 'the transition card is the magma sheet');
assert(level.elevator.transitionCard === T.level(6).elevator.transitionCard, 'the card matches the campaign table');
assert(fs.existsSync(path.join(root, level.elevator.transitionCard)), 'the stand-in art file exists');
assert(level.stairs.opensOn === 'bossKill' && level.stairs.stairsOpenOn === 'bossKill', 'the stair opens when the lord dies');
assert(level.tooth.id === 'grond_tooth_electrum_6' && level.tooth.n === 6 && level.tooth.cursed === true && level.tooth.countsForRitual === true && level.tooth.countsForTeethCarried === true, 'electrum tooth 6 is cursed and counts toward the seven');

const pool = level.setPieces.filter(function (p) { return p.id === 'water-pool'; })[0];
const hall = level.spawns.filter(function (group) { return group.id === 'ember-hall'; })[0];
assert(pool && pool.placed === true && pool.room === 'ember-hall' && pool.room === level.boss.room, 'the pool tile is in the Ember Lord\'s room');
assert(hall.members.some(function (member) { return member.key === 'emberLord' && member.count === 1; }), 'the hall has the lord');
assert(hall.members.some(function (member) { return member.key === 'salamander' && member.role === 'minion'; }), 'a salamander stands in the boss room');
assert(hall.members.some(function (member) { return member.key === 'hellHound' && member.role === 'minion'; }), 'a hell hound stands in the boss room');
assert(L6.LORD.coveringUnit == null && L6.LORD.poolInRoom === true && L6.LORD.priority.length === 4, 'the four steps name the pool and no covering creature');
assert(!level.spawns.some(function (group) {
  return group.members.some(function (member) { return member.key === 'firegiant' || member.role === 'cover'; });
}), 'fire giants are not placed and no member is a cover');

const keys = Object.keys(L6.MONSTERS);
level.spawns.forEach(function (group) {
  group.members.forEach(function (member) {
    assert(keys.indexOf(member.key) >= 0, group.id + ' member ' + member.key + ' is an L6 stat block');
  });
});

assert(level.wander.slots.length === 6, 'section 5 gives L6 six wander slots');
assert(JSON.stringify(level.wander.slots) === JSON.stringify(L6.WANDER), 'the map wander table matches the encounter data');
assert(JSON.stringify(L6.WANDER) === JSON.stringify(T.level(6).wander), 'the wander table matches the campaign table');
assert(level.loot.caches.count === 16 && level.loot.caches.places.length === 16 && level.loot.caches.level === 6, 'sixteen level-6 caches');
assert(level.loot.lordCorpse.letter === 'U' && level.loot.lordChest.onCorpse === false && level.loot.lordChest.contents === 'guardian-ruby' && level.loot.lordChest.extraHoard === false, 'the lord corpse is U and the chest is the ruby only');
assert(level.loot.guardianRuby.gp === 1500, 'Guardian VI drops the 1500 gp ruby');

const exit = E.forLevel(6);
assert(exit.elevator === 'guardian' && exit.stairs === 'bossKill' && exit.stairsOpenOn === 'bossKill', 'Guardian VI is the elevator and the lord\'s kill opens the stairs');
assert(exit.boss != null && exit.separateEncounters === true, 'L6 keeps a boss and is not the L1 exception');
assert(level.exit.elevator === exit.elevator && level.exit.stairs === exit.stairs && level.exit.stairsOpenOn === exit.stairsOpenOn, 'the map exit uses the same gates');
assert(E.validate().length === 0, 'the ten exit rows still pass');
const bare = E.LEVELS.map(function (row) { return Object.assign({}, row); });
bare[5] = Object.assign({}, bare[5], { boss: null });
assert(E.validate(bare).some(function (err) { return err.indexOf('L6') >= 0 && err.indexOf('boss') >= 0; }), 'L6 stairs still require a boss');
const stripped = JSON.parse(JSON.stringify(campaign.book));
stripped.levels[5].boss = null;
delete stripped.levels[5].stairsOpenOn;
const noBoss = Map.load(stripped);
assert(!noBoss.ok && noBoss.errors.some(function (err) { return err.indexOf('L6') >= 0 && err.indexOf('boss') >= 0; }), 'a boss-less L6 map fails validation');

Object.keys(L6.XP).forEach(function (key) {
  const mon = L6.MONSTERS[key];
  assert(mon.xp === L6.XP[key], key + ' printed XP is ' + L6.XP[key]);
  assert(L6.printedXp(mon) === mon.xp, key + ' XP formula sums to the printed total');
  assert(mon.art && mon.art.newArt === false, key + ' art binds nothing new');
  if (mon.art.file) assert(fs.existsSync(path.join(root, mon.art.file)), key + ' art file exists');
});
assert(L6.bossGuardianXp() === 3852 + 5090 && L6.bossGuardianXp() === 8942, 'L6 boss-plus-guardian XP is the stat blocks, 8942');
assert(L6.FORECAST_BOSS_GUARDIAN_XP === 8942 && T.level(6).pacing.bossPlusGuardianXp === 8942, 'the 1.12 column matches the stat blocks, 8942');
assert(T.statBossGuardianXp(T.level(6)) === L6.bossGuardianXp(), 'the campaign table uses the same L6 stat-block total');
assert(T.level(6).pacing.cumulativeXp === 120200 && T.level(6).pacing.macar === 'F7', 'the L6 clear stays at the 1.12 F7 row, 120200');
assert(T.level(6).pacing.cumulativeXp >= T.FIGHTER_XP.F7 && T.level(6).pacing.cumulativeXp < T.FIGHTER_XP.F8, '120200 sits in the F7 band');
assert(T.pathXp() === 501800 && T.pathXp() >= 500001, 'the L1-L10 clear plus the ritual stays 501800');

assert(L6.MONSTERS.beetle.hd === '1+2' && L6.MONSTERS.beetle.ac === 4 && L6.MONSTERS.beetle.xp === 32, 'the fire beetle is 1+2, AC 4, 32 XP');
assert(L6.MONSTERS.hellHound.hd === 5 && L6.MONSTERS.hellHound.hdRange === '4-7' && L6.MONSTERS.hellHound.breath.save === 'vs breath for half', 'the hound is the 5 HD choice and breathes for its HP');
assert(L6.MONSTERS.salamander.hd === '7+7' && L6.MONSTERS.salamander.acHead === 5 && L6.MONSTERS.salamander.acBody === 3 && L6.MONSTERS.salamander.hitOnlyBy === 1, 'the salamander is 7+7, AC 5/3, hit only by +1');
assert(L6.MONSTERS.fireElemental8.hitOnlyBy === 2 && L6.MONSTERS.fireElemental12.hitOnlyBy === 2 && L6.MONSTERS.emberLord.hitOnlyBy === 2, 'fire elementals, including the lord, need a +2 weapon');
assert(L6.MONSTERS.rubyGuardian.xp === T.level(6).rubyGuardian.formula.xp && L6.MONSTERS.rubyGuardian.immune.indexOf('fire') >= 0, 'Guardian VI XP matches the guardian line and fire does not harm it');
assert(L6.MINIONS.locked === true && L6.MINIONS.option === 'A' && L6.MINIONS.inBossRoom === true, 'salamander and hell hound minions are the locked option and stand with the lord');
assert(L6.LORD.ignite.chance === '1 in 6' && L6.LORD.ignite.fireResistanceNegates === true && L6.LORD.flare.once === true && L6.LORD.flare.belowHpFraction === 0.25, 'bombs detonate 1 in 6, and the flare is once below a quarter');

assert(L6.POISON.mode === 'h1' && L6.POISON.floor === 2 && L6.POISON.floorRule === '6 #12' && L6.POISON.mods === T.poisonSave, 'H1 points at CampaignTable.poisonSave and floors at 2');
assert(L6.POISON.residentsUsePoison === false && L6.POISON.appliesTo.length === 0, 'no L6 special is a poison save, so the spider mods are not applied');
['large', 'huge', 'giant', 'phase', 'queen'].forEach(function (size) {
  assert(typeof L6.POISON.mods[size] === 'number', 'the shared poison table still has ' + size);
});
assert(L6.LOOT.components.magma_shard.perKill === 1 && L6.LOOT.components.fire_beetle_gland.perKill === 2 && L6.LOOT.components.fire_beetle_gland.glandsVerify === true, 'one shard per elemental and two glands per beetle');
assert(L6.LOOT.caches.row.cp == null && L6.LOOT.caches.row.gp.chance === 55 && L6.LOOT.caches.row.gp.min === 5 && L6.LOOT.caches.row.gp.max === 30, 'the level-6 cache row keeps the live gold range');
assert(L6.LOOT.lair.C.onCorpse === false && L6.LOOT.lair.F.onCorpse === false, 'lair C and F stay off the corpse');

L6.ingredientIds().forEach(function (id) {
  assert(Q.SOURCES[id] && Q.SOURCES[id].level <= 6, id + ' resolves in the registry at or before L6');
});
L6.itemIds().forEach(function (id) {
  const item = Q.QUEST_ITEMS.filter(function (it) { return it.id === id; })[0];
  assert(item && item.usableByMacar === 'Y', id + ' resolves as a usable quest item');
});
assert(Q.SOURCES.magma_shard.level === 6, 'magma shards are an L6 source');
['potion_fire_resistance', 'rune_hammer'].forEach(function (id) {
  const recipe = Q.FORGE_RECIPES.filter(function (row) { return row.id === id; })[0];
  assert(recipe && recipe.neededBy <= 6, id + ' is due by L6');
  recipe.ingredientSets.forEach(function (set) {
    Object.keys(set).forEach(function (ing) {
      assert(Q.SOURCES[ing] && Q.SOURCES[ing].level <= 6, id + ' ingredient ' + ing + ' resolves by L6');
    });
  });
});

assert(L6.OPEN.length === 22 && L6.OPEN.every(function (row) { return row.id && row.note.indexOf('(open)') >= 0; }), 'each open L6 choice is marked in the data');
assert(html.indexOf('L6.js') < 0 && html.indexOf('maps/l6.json') < 0, 'index.html does not load the L6 data');
assert(save.indexOf('L6.js') < 0 && save.indexOf('maps/l6.json') < 0, 'GameSave does not load the L6 data');
assert(L6.wired === false, 'the L6 module is not wired');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('L6 campaign data ok');

/**
 * Level 7 campaign data. Not wired into play.
 * Run: node src/campaign/L7.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Map = require('./LevelMap');
const T = require('./CampaignTable');
const E = require('./ExitRules');
const Q = require('./QuestRegistry');
const L7 = require('./L7');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

const root = path.join(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const save = fs.readFileSync(path.join(root, 'src/saves/GameSave.js'), 'utf8');
const l7Book = Map.load(fs.readFileSync(path.join(__dirname, 'maps/l7.json'), 'utf8'));
const campaign = Map.load(fs.readFileSync(path.join(__dirname, 'maps/campaign-levels.json'), 'utf8'));

assert(l7Book.ok, l7Book.ok ? 'L7 map validates' : l7Book.errors.join('; '));
assert(campaign.ok, campaign.ok ? 'campaign book still validates' : campaign.errors.join('; '));
assert(l7Book.book.affectsPlay === false && l7Book.book.levels.length === 1, 'the L7 book is data and holds one level');
assert(JSON.stringify(campaign.book.levels[6]) === JSON.stringify(l7Book.book.levels[0]), 'the campaign book carries the same L7 map');
assert(campaign.book.levels[5].id === 'L6' && campaign.book.levels[7].id === 'L8', 'L6 and L8 stay in place');

const level = l7Book.book.levels[0];
assert(level.id === 'L7' && level.wired === false && level.level === 7, 'L7 is unwired');
assert(level.stairsOpenOn === 'bossKill', 'L7 stairs open on the boss kill');
assert(level.boss && level.boss.key === 'stoneLord' && level.guardian && level.guardian.key === 'rubyGuardian', 'L7 has a boss and a guardian');
assert(level.boss.placement === 'fixed' && level.boss.x === 88 && level.boss.y === 40 && level.boss.hp === 72 && level.boss.ac === 2 && level.boss.hitOnlyBy === 2, 'the Stone Lord is fixed in the stone hall');
assert(level.boss.bossFlagOnIndividual === false && level.boss.separateFromGuardian === true, 'the lord is a separate fight and wears no boss flag');
assert(level.guardian.placement === 'fixed' && level.guardian.tier === 7 && level.guardian.count === 1 && level.guardian.hp === 84 && level.guardian.ac === 0 && level.guardian.hitOnlyBy === 2, 'guardian is Ruby Guardian VII and needs a +2 weapon');
assert(level.guardian.bossFlagOnIndividual === false, 'the guardian wears no boss flag');
assert(level.rubyDoor.placement === 'fixed' && level.lever.enablesWhen === 'rubyGuardianDead' && level.lever.needsBoss === false && level.lever.opensStairs === false, 'the lever needs the guardian and does not open the stairs');
assert(level.elevator.auto === true && level.elevator.standIn === true && level.elevator.gate === 'guardian', 'the elevator is automatic and the guardian is its gate');
assert(level.elevator.transitionCard === 'assets/creatures/mon_earthelem.png', 'the transition card is the earth elemental sheet');
assert(level.elevator.transitionCard === T.level(7).elevator.transitionCard, 'the card matches the campaign table');
assert(fs.existsSync(path.join(root, level.elevator.transitionCard)), 'the stand-in art file exists');
assert(level.stairs.opensOn === 'bossKill' && level.stairs.stairsOpenOn === 'bossKill', 'the stair opens when the lord dies');
assert(level.tooth.id === 'grond_tooth_electrum_7' && level.tooth.n === 7 && level.tooth.lastTooth === true && level.tooth.cursed === true && level.tooth.countsForRitual === true && level.tooth.countsForTeethCarried === true, 'electrum tooth 7 is the last tooth and counts toward the seven');

const vein = level.setPieces.filter(function (p) { return p.id === 'heartstone-vein'; })[0];
const hall = level.spawns.filter(function (group) { return group.id === 'stone-hall'; })[0];
assert(vein && vein.placed === true && vein.pickup === 'starmetal', 'the table set piece is a placed starmetal vein');
assert(hall.room === level.boss.room, 'the stone hall is the boss room');
assert(hall.members.some(function (member) { return member.key === 'stoneLord' && member.count === 1; }), 'the hall has the lord');
assert(hall.members.some(function (member) { return member.key === 'xorn' && member.role === 'cover'; }), 'the xorn the steps name stands in the boss room');
assert(hall.members.some(function (member) { return member.key === 'umberhulk' && member.role === 'minion'; }), 'an umber hulk stands in the boss room');
assert(L7.LORD.coveringUnit && L7.LORD.coveringUnit.key === 'xorn' && L7.LORD.coveringUnit.inBossRoom === true && L7.LORD.priority.length === 4, 'the covering unit is the xorn in the boss room');
assert(level.spawns.filter(function (group) {
  return group.members.some(function (member) { return member.role === 'cover'; });
}).every(function (group) { return group.room === level.boss.room; }), 'every covering unit is in the boss room');

const keys = Object.keys(L7.MONSTERS);
level.spawns.forEach(function (group) {
  group.members.forEach(function (member) {
    assert(keys.indexOf(member.key) >= 0, group.id + ' member ' + member.key + ' is an L7 stat block');
  });
});

assert(level.wander.slots.length === 6, 'section 5 gives L7 six wander slots');
assert(JSON.stringify(level.wander.slots) === JSON.stringify(L7.WANDER), 'the map wander table matches the encounter data');
assert(JSON.stringify(L7.WANDER) === JSON.stringify(T.level(7).wander), 'the wander table matches the campaign table');
assert(level.loot.caches.count === 16 && level.loot.caches.places.length === 16 && level.loot.caches.level === 7, 'sixteen level-7 caches');
assert(level.loot.lordCorpse.letter === 'U' && level.loot.lordChest.onCorpse === false && level.loot.lordChest.contents === 'lair-G' && level.loot.lordChest.includesRuby === false && level.loot.lordChest.room === 'stone-hall', 'the lord corpse is U and the chest is lair G without the ruby');
assert(level.loot.guardianRuby.gp === 1750 && level.loot.guardianRuby.with === 'rubyGuardian', 'Guardian VII keeps the 1750 gp ruby');
assert(L7.LOOT.bossChest.includesRuby === false && L7.LOOT.guardianRuby.with === 'rubyGuardian', 'the ruby is listed with the guardian only');

const exit = E.forLevel(7);
assert(exit.elevator === 'guardian' && exit.stairs === 'bossKill' && exit.stairsOpenOn === 'bossKill', 'Guardian VII is the elevator and the lord\'s kill opens the stairs');
assert(exit.boss != null && exit.separateEncounters === true, 'L7 keeps a boss and is not the L1 exception');
assert(level.exit.elevator === exit.elevator && level.exit.stairs === exit.stairs && level.exit.stairsOpenOn === exit.stairsOpenOn, 'the map exit uses the same gates');
assert(E.validate().length === 0, 'the ten exit rows still pass');
const bare = E.LEVELS.map(function (row) { return Object.assign({}, row); });
bare[6] = Object.assign({}, bare[6], { boss: null });
assert(E.validate(bare).some(function (err) { return err.indexOf('L7') >= 0 && err.indexOf('boss') >= 0; }), 'L7 stairs still require a boss');
const stripped = JSON.parse(JSON.stringify(campaign.book));
stripped.levels[6].boss = null;
delete stripped.levels[6].stairsOpenOn;
const noBoss = Map.load(stripped);
assert(!noBoss.ok && noBoss.errors.some(function (err) { return err.indexOf('L7') >= 0 && err.indexOf('boss') >= 0; }), 'a boss-less L7 map fails validation');

Object.keys(L7.XP).forEach(function (key) {
  const mon = L7.MONSTERS[key];
  assert(mon.xp === L7.XP[key], key + ' printed XP is ' + L7.XP[key]);
  if (mon.xpApprox) assert(L7.printedXp(mon) === mon.bandXp, key + ' band XP is the average-hp formula');
  else assert(L7.printedXp(mon) === mon.xp, key + ' XP formula sums to the printed total');
  assert(mon.art && mon.art.newArt === false, key + ' art binds nothing new');
  if (mon.art.file) assert(fs.existsSync(path.join(root, mon.art.file)), key + ' art file exists');
});
assert(L7.bossGuardianXp() === 5212 + 5090 && L7.bossGuardianXp() === 10302, 'L7 boss-plus-guardian XP is the stat blocks, 10302');
assert(L7.FORECAST_BOSS_GUARDIAN_XP === 11582 && T.level(7).pacing.bossPlusGuardianXp === 10302, 'the 1.12 forecast of 11582 is not the pacing total');
assert(T.statBossGuardianXp(T.level(7)) === L7.bossGuardianXp(), 'the campaign table uses the same L7 stat-block total');
assert(T.level(7).pacing.cumulativeXp === 185000 && T.level(7).pacing.macar === 'F8', 'the L7 clear stays at the 1.12 F8 row, 185000');
assert(T.level(7).pacing.cumulativeXp >= T.FIGHTER_XP.F8 && T.level(7).pacing.cumulativeXp < T.FIGHTER_XP.F9, '185000 sits in the F8 band');
assert(T.pathXp() === 510000 && T.pathXp() >= 500001, 'the L1-L10 clear plus the ritual stays 510000');

assert(L7.MONSTERS.earthElemental8.hd === 8 && L7.MONSTERS.earthElemental8.hitOnlyBy === 2 && L7.MONSTERS.earthElemental8.xp === 1020 && L7.MONSTERS.earthElemental8.bandXp === 910, 'the 8 HD elemental is the printed 1020, and the band at 36 hp is 910');
assert(L7.MONSTERS.earthElemental12.xp === 3080 && L7.MONSTERS.earthElemental12.bandXp === 2864 && L7.MONSTERS.earthElemental12.hitOnlyBy === 2, 'the 12 HD elemental is the printed 3080, and the band at 54 hp is 2864');
assert(L7.MONSTERS.xorn.hd === '7+7' && L7.MONSTERS.xorn.ac === -2 && L7.MONSTERS.xorn.xp === 1280, 'the xorn is 7+7, AC -2, 1280 XP');
assert(L7.MONSTERS.umberhulk.hd === '8+8' && L7.MONSTERS.umberhulk.gaze.save === 'vs spell' && L7.MONSTERS.umberhulk.xp === 1828, 'the hulk is 8+8 and its gaze is a spell save');
assert(L7.MONSTERS.stoneLord.hp === 72 && L7.MONSTERS.stoneLord.hitOnlyBy === 2 && L7.MONSTERS.stoneLord.xp === 5090, 'the Stone Lord is 16 HD, 72 hp, hit only by +2');
assert(L7.MONSTERS.rubyGuardian.xp === T.level(7).rubyGuardian.formula.xp && L7.MONSTERS.rubyGuardian.cone.save === 'vs breath for half', 'Guardian VII XP matches the guardian line');
assert(L7.MINIONS.locked === true && L7.MINIONS.option === 'A' && L7.MINIONS.inBossRoom === true && L7.MINIONS.keys[0] === 'xorn' && L7.MINIONS.keys[1] === 'umberhulk', 'xorn and umber hulk minions are the locked option and stand with the lord');
assert(L7.LORD.sink.surprise === '1-3 on d6' && L7.LORD.sink.stonecunning === '1 in 6' && L7.LORD.tremor.once === true && L7.LORD.tremor.belowHpFraction === 0.25, 'surprise is 1-3, stonecunning cuts it, and the tremor is once below a quarter');

assert(L7.POISON.mode === 'h1' && L7.POISON.floor === 2 && L7.POISON.floorRule === '6 #12' && L7.POISON.mods === T.poisonSave, 'H1 points at CampaignTable.poisonSave and floors at 2');
assert(L7.POISON.residentsUsePoison === false && L7.POISON.appliesTo.length === 0, 'no L7 special is a poison save, so the spider mods are not applied');
['large', 'huge', 'giant', 'phase', 'queen'].forEach(function (size) {
  assert(typeof L7.POISON.mods[size] === 'number', 'the shared poison table still has ' + size);
});
assert(L7.LOOT.components.heartstone.perKill === 1 && L7.LOOT.components.heartstone.from.length === 3, 'one heartstone per earth elemental, including the lord');
assert(L7.LOOT.caches.row.cp == null && L7.LOOT.caches.row.sp == null && L7.LOOT.caches.row.gp.chance === 60 && L7.LOOT.caches.row.gp.min === 6 && L7.LOOT.caches.row.gp.max === 36, 'the level-7 cache row keeps the live gold range');
assert(L7.LOOT.lair.G.onCorpse === false && L7.LOOT.lair.G.gp.chance === 75, 'lair G stays off the corpse');

L7.ingredientIds().forEach(function (id) {
  assert(Q.SOURCES[id] && Q.SOURCES[id].level <= 7, id + ' resolves in the registry at or before L7');
});
L7.itemIds().forEach(function (id) {
  const item = Q.QUEST_ITEMS.filter(function (it) { return it.id === id; })[0];
  assert(item && item.usableByMacar === 'Y', id + ' resolves as a usable quest item');
});
assert(Q.SOURCES.heartstone.level === 7, 'heartstones are an L7 source');
assert(Q.SOURCES.starmetal.level <= 7, 'starmetal veins resolve by L7');
const chain = Q.FORGE_RECIPES.filter(function (row) { return row.id === 'adamantine_chain_1'; })[0];
assert(chain && chain.availableFrom === 7 && chain.neededBy <= 8, 'Adamantine Chain +1 is available on L7');
chain.ingredientSets.forEach(function (set) {
  Object.keys(set).forEach(function (ing) {
    assert(Q.SOURCES[ing] && Q.SOURCES[ing].level <= 7, 'adamantine_chain_1 ingredient ' + ing + ' resolves by L7');
  });
});
const bolts = Q.FORGE_RECIPES.filter(function (row) { return row.id === 'bolts_plus_1'; })[0];
assert(bolts && bolts.neededBy <= 7 && bolts.availableFrom <= 7, 'Bolts +1 are due by L7');
assert(Q.LIVE_PLAN.marrow_draught && Q.LIVE_PLAN.marrow_draught.status === 'keep' && Q.LIVE_PLAN.marrow_draught.neededBy <= 7, 'Greater Healing stays the kept marrow draught');

assert(L7.OPEN.length === 19 && L7.OPEN.every(function (row) { return row.id && row.note.indexOf('(open)') >= 0; }), 'each open L7 choice is marked in the data');
assert(html.indexOf('L7.js') < 0 && html.indexOf('maps/l7.json') < 0, 'index.html does not load the L7 data');
assert(save.indexOf('L7.js') < 0 && save.indexOf('maps/l7.json') < 0, 'GameSave does not load the L7 data');
assert(L7.wired === false, 'the L7 module is not wired');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('L7 campaign data ok');

/**
 * Level 3 campaign data. Not wired into play.
 * Run: node src/campaign/L3.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Map = require('./LevelMap');
const T = require('./CampaignTable');
const E = require('./ExitRules');
const Q = require('./QuestRegistry');
const L3 = require('./L3');
const P = require('../combat/SpiderPoison');
const B = require('../combat/BattleBuffs');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

const root = path.join(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const save = fs.readFileSync(path.join(root, 'src/saves/GameSave.js'), 'utf8');
const l3Book = Map.load(fs.readFileSync(path.join(__dirname, 'maps/l3.json'), 'utf8'));
const campaign = Map.load(fs.readFileSync(path.join(__dirname, 'maps/campaign-levels.json'), 'utf8'));

assert(l3Book.ok, l3Book.ok ? 'L3 map validates' : l3Book.errors.join('; '));
assert(campaign.ok, campaign.ok ? 'campaign book still validates' : campaign.errors.join('; '));
assert(l3Book.book.affectsPlay === false && l3Book.book.levels.length === 1, 'the L3 book is data and holds one level');
assert(JSON.stringify(campaign.book.levels[2]) === JSON.stringify(l3Book.book.levels[0]), 'the campaign book carries the same L3 map');

const level = l3Book.book.levels[0];
assert(level.id === 'L3' && level.wired === false, 'L3 is unwired');
assert(level.stairsOpenOn === 'bossKill', 'L3 stairs open on the boss kill');
assert(level.boss && level.boss.key === 'spiderQueen' && level.guardian && level.guardian.key === 'rubyGuardian', 'L3 has a boss and a guardian');
assert(level.boss.placement === 'fixed' && level.boss.x === 10.1 && level.boss.y === 31 && level.boss.hp === 44, 'the Spider Queen is fixed in the old lord den');
assert(level.boss.bossFlagOnIndividual === false && level.boss.separateFromGuardian === true, 'the Queen is a separate fight and wears no boss flag');
assert(level.boss.key !== level.guardian.key, 'the guardian and the boss are different creatures');
assert(level.guardian.placement === 'fixed' && level.guardian.tier === 3 && level.guardian.count === 1 && level.guardian.hp === 36, 'guardian is Ruby Guardian III');
assert(level.guardian.x === 16.4 && level.guardian.y === 16.4, 'guardian has a fixed point');
assert(level.rubyDoor.placement === 'fixed' && level.lever.enablesWhen === 'rubyGuardianDead' && level.lever.needsBoss === false && level.lever.opensStairs === false, 'the lever needs the guardian and does not open the stairs');
assert(level.elevator.auto === true && level.elevator.standIn === true && level.elevator.gate === 'guardian', 'the elevator is automatic and the guardian is its gate');
assert(level.elevator.transitionCard === 'assets/creatures/mon_spider_giant.png', 'the transition card is the giant-spider sheet');
assert(level.elevator.transitionCard === T.level(3).elevator.transitionCard, 'the card matches the campaign table');
assert(fs.existsSync(path.join(root, level.elevator.transitionCard)), 'the stand-in art file exists');
assert(level.stairs.opensOn === 'bossKill' && level.stairs.x === 40.1 && level.stairs.y === 51.6, 'the south stair opens when the Queen dies');
assert(level.tooth.id === 'grond_tooth_electrum_3' && level.tooth.cursed === true && level.tooth.countsForRitual === true, 'electrum tooth 3 is cursed and counts toward the seven');
const pixie = level.setPieces.filter(function (p) { return p.id === 'trapped-pixie'; })[0];
assert(pixie && pixie.placed === true && pixie.fights === false && pixie.freeRounds === 1 && pixie.gives === 'pixie_dust' && pixie.vanishes === true, 'freeing the pixie takes one round and she gives dust, then vanishes');
assert(level.loot.caches.count === 16 && level.loot.caches.places.length === 16 && level.loot.caches.level === 3, 'sixteen level-3 caches');
assert(level.loot.queenCorpse.letter === 'U' && level.loot.queenChest.letter === 'C' && level.loot.queenChest.onCorpse === false, 'the Queen corpse is U and the chest is lair C');
assert(level.loot.guardianRuby.gp === 750, 'Guardian III drops the 750 gp ruby');
assert(level.loot.venom.perSpider === 0.5 && level.loot.venom.queen === 1, 'venom is 50% per spider and certain from the Queen');
assert(level.retired.indexOf('spiderLord') >= 0 && level.retired.indexOf('forceLordHoard') >= 0, 'the Spider Lord and forceLordHoard are retired');
assert(level.webCorpses.keep === 'rollWebCorpse' && level.webCorpses.count === '4-6', 'web corpses keep rollWebCorpse');
const lairSrc = fs.readFileSync(path.join(root, 'src/loot/SpiderLair.js'), 'utf8');
[[11.5, '29.7'], [8.7, '30.2'], [12.6, '32.0'], [9.1, '32.8'], [11.9, '33.5'], [8.3, '28.9'], [13.1, '30.6']].forEach(function (spot) {
  assert(lairSrc.indexOf(spot[0] + ', ' + spot[1]) >= 0, 'web corpse spot ' + spot.join(',') + ' is a live silk-room spot');
});
assert(level.webCorpses.spots.length === 7, 'the map keeps all seven silk-room spots');
assert(!level.spawns.some(function (group) {
  return group.members.some(function (member) { return member.key === 'spiderLord' || member.key === 'goblin'; });
}), 'the lord and the goblins are not on L3');

const keys = Object.keys(L3.MONSTERS);
level.spawns.forEach(function (group) {
  group.members.forEach(function (member) {
    assert(keys.indexOf(member.key) >= 0, group.id + ' member ' + member.key + ' is an L3 stat block');
  });
});
const queenPack = level.spawns.filter(function (group) { return group.id === 'queen-hall'; })[0];
assert(queenPack.members.some(function (member) { return member.key === 'spiderQueen' && member.count === 1; }), 'the hall has the Queen');
assert(queenPack.members.some(function (member) { return member.key === 'spider' && member.count === 3; }), 'the lord\'s three large spiders stay with the Queen');

assert(level.wander.slots.length === 6, 'section 5 gives L3 six wander slots');
assert(JSON.stringify(level.wander.slots) === JSON.stringify(L3.WANDER), 'the map wander table matches the encounter data');
assert(JSON.stringify(L3.WANDER) === JSON.stringify(T.level(3).wander), 'the wander table matches the campaign table');
assert(level.wander.check.chance === '1 in 6' && level.wander.check.every === '3 turns', 'wandering monsters check 1 in 6 every 3 turns');

const exit = E.forLevel(3);
assert(exit.elevator === 'guardian' && exit.stairs === 'bossKill' && exit.stairsOpenOn === 'bossKill', 'Guardian III is the elevator and the Queen kill opens the stairs');
assert(exit.boss != null && exit.separateEncounters === true, 'L3 keeps a boss and is not the L1 exception');
assert(level.exit.elevator === exit.elevator && level.exit.stairs === exit.stairs && level.exit.stairsOpenOn === exit.stairsOpenOn, 'the map exit uses the same gates');
assert(E.validate().length === 0, 'the ten exit rows still pass');
const bare = E.LEVELS.map(function (row) { return Object.assign({}, row); });
bare[2] = Object.assign({}, bare[2], { boss: null });
assert(E.validate(bare).some(function (err) { return err.indexOf('L3') >= 0 && err.indexOf('boss') >= 0; }), 'L3 stairs still require a boss');
const stripped = JSON.parse(JSON.stringify(campaign.book));
stripped.levels[2].boss = null;
delete stripped.levels[2].stairsOpenOn;
const noBoss = Map.load(stripped);
assert(!noBoss.ok && noBoss.errors.some(function (err) { return err.indexOf('L3') >= 0 && err.indexOf('boss') >= 0; }), 'a boss-less L3 map fails validation');

Object.keys(L3.XP).forEach(function (key) {
  const mon = L3.MONSTERS[key];
  assert(mon.xp === L3.XP[key], key + ' printed XP is ' + L3.XP[key]);
  assert(L3.printedXp(mon) === mon.xp, key + ' XP formula sums to the printed total');
  assert(mon.art && mon.art.newArt === false && typeof mon.art.key === 'string', key + ' art is a stand-in key and binds nothing new');
  if (mon.art.file) assert(fs.existsSync(path.join(root, mon.art.file)), key + ' art file exists');
});
assert(L3.MONSTERS.spiderQueen.art.file === 'assets/creatures/mon_spider_giant.png' && L3.MONSTERS.spiderQueen.art.standIn === true, 'the Queen uses the giant-spider sheet');
assert(L3.MONSTERS.pixie.art.file == null && L3.MONSTERS.pixie.fights === false, 'the pixie binds no new file and never fights');
assert(L3.bossGuardianXp() === 441 + 1828 && L3.bossGuardianXp() === 2269, 'L3 boss-plus-guardian XP is the stat blocks, 2269');
assert(L3.FORECAST_BOSS_GUARDIAN_XP === 2269 && T.level(3).pacing.bossPlusGuardianXp === 2269, 'the 1.12 column matches the stat blocks, 2269');
assert(T.statBossGuardianXp(T.level(3)) === L3.bossGuardianXp(), 'the campaign table uses the same L3 stat-block total');
assert(T.level(3).pacing.cumulativeXp === 32000 && T.level(3).pacing.macar === 'F5', 'the L3 clear stays at the 1.12 F5 row, 32000');
assert(T.level(3).pacing.cumulativeXp >= T.FIGHTER_XP.F5 && T.level(3).pacing.cumulativeXp < T.FIGHTER_XP.F6, '32000 sits in the F5 band');
assert(T.pathXp() === 501800 && T.pathXp() >= 500001, 'the L1-L10 clear plus the ritual stays 501800');

assert(L3.MONSTERS.spider.hd === '1+1' && L3.MONSTERS.spider.ac === 8 && L3.MONSTERS.spider.poisonSave === 2, 'large spider is 1+1, AC 8, save +2');
assert(L3.MONSTERS.spiderHuge.hd === '2+2' && L3.MONSTERS.spiderHuge.ac === 6 && L3.MONSTERS.spiderHuge.poisonSave === 1, 'huge spider is 2+2, AC 6, save +1');
assert(L3.MONSTERS.spiderGiant.hd === '4+4' && L3.MONSTERS.spiderGiant.ac === 4 && L3.MONSTERS.spiderGiant.attacks[0].damage === '2d4' && L3.MONSTERS.spiderGiant.poisonSave === 0, 'giant spider is 4+4, AC 4, bite 2d4, save unmodified');
assert(L3.MONSTERS.phasespider.hd === '5+5' && L3.MONSTERS.phasespider.ac === 7 && L3.MONSTERS.phasespider.poisonSave === -2, 'phase spider is 5+5, AC 7, save -2');
assert(L3.MONSTERS.spiderQueen.hd === '8+8' && L3.MONSTERS.spiderQueen.hp === 44 && L3.MONSTERS.spiderQueen.ac === 3 && L3.MONSTERS.spiderQueen.attacks[0].damage === '2d6', 'the Queen is 8+8 HD, 44 hp, AC 3, bite 2d6');
assert(L3.MONSTERS.rubyGuardian.hd === 6 && L3.MONSTERS.rubyGuardian.hp === 36 && L3.MONSTERS.rubyGuardian.ac === 4 && L3.MONSTERS.rubyGuardian.attacks[0].damage === '2d6', 'Guardian III is 6 HD, 36 hp, AC 4, 2d6');
assert(L3.MONSTERS.rubyGuardian.shard.damage === '1d6' && L3.MONSTERS.rubyGuardian.shard.range === '6"', 'the shard is 1d6 at 6 inches');
assert(L3.MONSTERS.rubyGuardian.xp === T.level(3).rubyGuardian.formula.xp, 'Guardian III XP matches the guardian line');

assert(L3.POISON.mode === 'h1' && L3.POISON.only === true && L3.POISON.mods.queen === -2 && L3.POISON.floor === 2, 'poison is H1 only, Queen modifier -2, floor 2');
assert(L3.POISON.mods === T.poisonSave, 'L3.POISON.mods is CampaignTable.poisonSave');
['large', 'huge', 'giant', 'phase', 'queen'].forEach(function (size) {
  assert(L3.POISON.mods[size] === T.poisonSave[size], 'L3 poison mod for ' + size + ' is the shared table');
});
assert(P.POISON_MODE === 'h1' && P.SPIDERS.spiderQueen.size === 'queen', 'SpiderPoison is H1 and knows the Queen');
assert(P.saveTarget({ spider: 'spiderQueen', level: 5, con: 16 }) === 9, 'F5 CON 16 versus the Queen needs 9');
assert(P.saveTarget({ spider: 'spider', level: 5, con: 16 }) === 5, 'F5 versus a large spider needs 5');
assert(P.saveTarget({ spider: 'spiderHuge', level: 5, con: 16 }) === 6, 'F5 versus a huge spider needs 6');
assert(P.saveTarget({ spider: 'spiderGiant', level: 5, con: 16 }) === 7, 'F5 versus a giant spider needs 7');
assert(P.saveTarget({ spider: 'phasespider', level: 5, con: 16 }) === 9, 'F5 versus a phase spider needs 9');
assert(P.saveTarget({ spider: 'spiderQueen', level: 5, con: 16, antitoxin: true, periaptPlus: 5 }) === 2, 'antitoxin and a +5 periapt floor the Queen save at 2');
assert(P.resolve({ hp: 40, ghost: true }, { spider: 'spiderQueen', level: 5, con: 16, roll: 1 }).immune === true, 'a ghost is immune to the Queen\'s poison');
assert(L3.QUEEN.ghostsImmuneToPoison === true && L3.QUEEN.priority.length === 4, 'the Queen\'s four steps include ghost immunity');
assert(L3.QUEEN.web.range === '3"' && L3.QUEEN.web.stuckSec === 2 && L3.QUEEN.web.cooldownSec === 6, 'the web shot is 3 inches, stuck 2 s, cooldown 6 s');
assert(L3.QUEEN.brood.huge === '1d4' && L3.QUEEN.brood.giant === 1 && L3.QUEEN.brood.once === true && L3.QUEEN.brood.belowHpFraction === 0.5, 'the brood is once, below half, 1d4 huge and 1 giant');
assert(L3.QUEEN.ceiling.seconds === 3 && L3.QUEEN.ceiling.meleeReaches === false && L3.QUEEN.ceiling.missilesReach === true, 'the ceiling climb lasts 3 s and blocks melee only');

assert(L3.PIXIE.fights === false && L3.PIXIE.free.rounds === 1 && L3.PIXIE.gives.count === 1 && L3.PIXIE.vanishes === true, 'the rescue is one round, one dust, then she vanishes');
assert(L3.PIXIE.dust.k === 'haste' && L3.PIXIE.dust.moveMul === 2 && L3.PIXIE.dust.cdMul === 0.5 && L3.PIXIE.dust.ageing === 0, 'Pixie Dust is haste at 2.0 / 0.5 with no ageing');
assert(L3.PIXIE.dust.cap === 300 && L3.PIXIE.dust.capStarts === 'beginFight' && L3.PIXIE.dust.armedOutsideFight === true, 'the 300 s cap starts at beginFight');
assert(L3.PIXIE.dust.specialty.indexOf('Specialty Attack') >= 0, 'a hasted round keeps the Specialty Attack rule from 1.3');
const dustState = B.create(0);
const pack = [{ id: 'pixie_dust', k: 'haste', n: 'Pixie Dust' }];
const used = B.use(dustState, pack, pack[0], 0);
assert(used.ok && used.buff.state === 'armed' && used.buff.t0 == null && pack.length === 0, 'dust used outside a fight is armed and leaves the pack');
B.beginFight(dustState, { key: 'spiderQueen' }, 10);
assert(dustState.battleBuffs[0].state === 'active' && dustState.battleBuffs[0].t0 === 10, 'beginFight starts the haste timer');
assert(B.moveMul(dustState, 1.35) === 2 && B.cdMul(dustState, 1) === 0.5 && B.effects(dustState).ageing === 0, 'haste takes the higher moveMul, halves the cooldown, and does not age');
B.expire(dustState, 311);
assert(dustState.battleBuffs.length === 0, 'the cap drops haste after 300 s of the fight');

assert(L3.LOOT.individual.U.magic.chance === 55 && L3.LOOT.lairC.onCorpse === false, 'U magic is 55% and lair C is not a corpse drop');
assert(L3.LOOT.webCorpse.keep === 'rollWebCorpse' && L3.LOOT.webCorpse.emptyChance === 50, 'web corpses still roll empty half the time');
assert(L3.LOOT.caches.row.gp.chance === 45 && L3.LOOT.caches.row.gp.min === 2 && L3.LOOT.caches.row.gp.max === 12, 'the level-3 cache row keeps the live gold range');
assert(L3.LOOT.components.spider_venom.perSpider === 0.5 && L3.LOOT.components.spider_venom.queen === 1, 'venom rates match 3.5');

L3.ingredientIds().forEach(function (id) {
  assert(Q.SOURCES[id] && Q.SOURCES[id].level <= 3, id + ' resolves in the registry at or before L3');
});
L3.itemIds().forEach(function (id) {
  const item = Q.QUEST_ITEMS.filter(function (it) { return it.id === id; })[0];
  assert(item && item.usableByMacar === 'Y', id + ' resolves as a usable quest item');
});
assert(Q.SOURCES.silk.level === 3 && Q.SOURCES.spider_venom.level <= 3, 'silk is an L3 source and venom is available by L3');
const anti = Q.FORGE_RECIPES.filter(function (row) { return row.id === 'antitoxin'; })[0];
assert(anti.neededBy === 3, 'Antitoxin is first useful on L3');
Object.keys(anti.ingredientSets[0]).forEach(function (ing) {
  assert(Q.SOURCES[ing] && Q.SOURCES[ing].level <= 3, 'antitoxin ingredient ' + ing + ' resolves by L3');
});

assert(L3.OPEN.length > 0, 'L3 still records its choice notes');
L3.OPEN.forEach(function (row) {
  assert(row.id && row.note, row.id + ' has a note');
  if (row.note.indexOf('Resolved') === 0) assert(row.note.indexOf('(open)') < 0, row.id + ' is marked resolved');
  else assert(row.note.indexOf('(open)') >= 0, row.id + ' stays marked open');
});
assert(L3.LOOT.lairC.cp.dice === '1d12' && L3.MONSTERS.spiderGiant.corpseBand === 'high' && L3.MONSTERS.phasespider.corpseBand === 'high', 'lair C is 1d12 and spider lair letters stay off the corpse');
assert(L3.MONSTERS.phasespider.phaseWindow.sec === 0.5 && L3.MONSTERS.spiderGiant.web.stuckSec === 2, 'the phase window is 0.5 s and the giant web holds for 2 s');
assert(L3.MONSTERS.rubyGuardian.ruby.gp === 750 && L3.MONSTERS.rubyGuardian.ruby.band == null, 'Guardian III ruby is exactly 750 gp');
assert(L3.MONSTERS.spider.poisonSaveVerify === true && L3.MONSTERS.spider.ttVerify === true, 'the large-spider verify figures stay marked');
assert(html.indexOf('L3.js') < 0 && html.indexOf('maps/l3.json') < 0, 'index.html does not load the L3 data');
assert(save.indexOf('L3.js') < 0 && save.indexOf('maps/l3.json') < 0, 'GameSave does not load the L3 data');
assert(L3.wired === false && P.wired === false && B.wired === false, 'the L3 module and the buff and poison modules are not wired');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('L3 campaign data ok');

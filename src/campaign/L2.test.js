/**
 * Level 2 campaign data. Not wired into play.
 * Run: node src/campaign/L2.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Map = require('./LevelMap');
const T = require('./CampaignTable');
const E = require('./ExitRules');
const Q = require('./QuestRegistry');
const L2 = require('./L2');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

const root = path.join(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const save = fs.readFileSync(path.join(root, 'src/saves/GameSave.js'), 'utf8');
const l2Book = Map.load(fs.readFileSync(path.join(__dirname, 'maps/l2.json'), 'utf8'));
const campaign = Map.load(fs.readFileSync(path.join(__dirname, 'maps/campaign-levels.json'), 'utf8'));

assert(l2Book.ok, l2Book.ok ? 'L2 map validates' : l2Book.errors.join('; '));
assert(campaign.ok, campaign.ok ? 'campaign book still validates' : campaign.errors.join('; '));
assert(l2Book.book.affectsPlay === false && l2Book.book.levels.length === 1, 'the L2 book is data and holds one level');
assert(JSON.stringify(campaign.book.levels[1]) === JSON.stringify(l2Book.book.levels[0]), 'the campaign book carries the same L2 map');

const level = l2Book.book.levels[0];
assert(level.id === 'L2' && level.wired === false, 'L2 is unwired');
assert(level.layout && level.layout.rooms.length >= 10, 'L2 has a room layout');
assert(Array.isArray(level.spawns) && level.spawns.length > 0, 'L2 has spawns');
assert(level.rubyDoor.placement === 'fixed' && level.rubyDoor.x === 10.2 && level.rubyDoor.y === 25.8, 'ruby door is a fixed point in the ruby den');
assert(level.guardian.placement === 'fixed' && level.guardian.key === 'rubyGuardian' && level.guardian.tier === 2 && level.guardian.count === 1, 'guardian is Ruby Guardian II');
assert(level.guardian.x === 10.1 && level.guardian.y === 31, 'guardian has a fixed point');
assert(level.lever.placement === 'fixed' && level.lever.enablesWhen === 'rubyGuardianDead' && level.lever.needsBoss === false, 'the lever needs the guardian and not the boss');
assert(level.elevator.placement === 'fixed' && level.elevator.auto === true && level.elevator.standIn === true, 'the elevator is automatic and a stand-in');
assert(level.elevator.transitionCard === 'assets/ui/intro_ch2.jpg', 'L2 transition card is the Chapter II intro plate');
assert(level.elevator.transitionCard === T.level(2).elevator.transitionCard, 'the card matches the campaign table');
assert(fs.existsSync(path.join(root, level.elevator.transitionCard)), 'the stand-in art file exists');
assert(level.elevator.gate === 'guardian', 'the elevator gate is the guardian');
assert(level.boss.placement === 'fixed' && level.boss.key === 'goblinKing' && level.boss.x === 74 && level.boss.y === 67.6, 'the Goblin King is a fixed boss');
assert(level.boss.bossFlagOnIndividual === false && level.boss.separateFromGuardian === true, 'the king is a separate fight and wears no boss flag');
assert(level.boss.key !== level.guardian.key, 'the guardian and the boss are different creatures');
assert(level.stairs.opensOn === 'bossKill' && level.stairs.x === 40.1 && level.stairs.y === 51.6, 'the south stair opens when the boss dies');
assert(level.tooth.id === 'grond_tooth_electrum_2' && level.tooth.x === 74 && level.tooth.y === 59.2, 'electrum tooth 2 is on the king hall back wall');
assert(level.tooth.countsForRitual === true && level.tooth.cursed === true, 'tooth 2 counts for the ritual and is cursed');
const hourglass = level.secrets.filter(function (s) { return s.id === 'bronze-hourglass'; })[0];
assert(hourglass && hourglass.optional === true && hourglass.room.raidSeconds === 10, 'the bronze hourglass stays an optional 10-second secret');
assert(hourglass.room.toothId === 'grond_tooth_bronze' && hourglass.room.face.x === 141.35, 'the bronze tooth stays in the hourglass face');
assert(level.loot.caches.count === 16 && level.loot.caches.places.length === 16, 'sixteen level-2 caches');
assert(level.loot.kingCorpse.letter === 'U' && level.loot.kingChest.letter === 'C' && level.loot.kingChest.onCorpse === false, 'the king corpse is U and the chest is lair C');
assert(level.loot.guardianRuby.id === 'ruby_guardian_2' && level.loot.guardianRuby.gp === 500, 'Guardian II drops the 500 gp ruby');

const banned = /spider|kobold|orc|warg|wolf|warlord|chieftain/i;
level.spawns.forEach(function (group) {
  assert(group.parley !== true && group.bargain !== true, group.id + ' does not parley or bargain');
  group.members.forEach(function (member) {
    assert(!banned.test(member.key) && L2.MONSTERS[member.key], group.id + ' member ' + member.key + ' is an L2 stat block');
  });
});
assert(!level.removed.some(function (row) { return row.to === 'L2'; }), 'removed packs are not left on L2');
const shamans = [];
level.spawns.forEach(function (group) {
  group.members.forEach(function (member) {
    if (member.key === 'goblinShaman') shamans.push({ group: group.id, member: member });
  });
});
assert(shamans.length === 2 && shamans[0].group === 'camp' && shamans[1].group === 'warren-shaman', 'one shaman at the camp and one in the warrens');
assert(shamans.every(function (row) { return row.member.kingHall === false; }), 'neither shaman stands in the king hall');
const hall = level.spawns.filter(function (group) { return group.id === 'king-hall'; })[0];
assert(hall.members.every(function (member) { return member.key !== 'goblinShaman'; }), 'the king hall has no shaman');
assert(hall.members.filter(function (member) { return member.role === 'bodyguard'; }).length === 6, 'six chief bodyguards stand with the king');
assert(hall.members.some(function (member) { return member.key === 'goblinLeader' && member.count === 1; }), 'the hall has one leader');
assert(hall.members.some(function (member) { return member.role === 'assistants' && member.count === 4; }), 'the hall has four assistants');

assert(level.wander.slots.length === 6, 'section 5 gives L2 six wander slots');
assert(JSON.stringify(level.wander.slots) === JSON.stringify(L2.WANDER), 'the map wander table matches the encounter data');
assert(JSON.stringify(L2.WANDER) === JSON.stringify(T.level(2).wander), 'the wander table matches the campaign table');
assert(level.wander.check.chance === '1 in 6' && level.wander.check.every === '3 turns', 'wandering monsters check 1 in 6 every 3 turns');

const exit = E.forLevel(2);
assert(exit.elevator === 'guardian' && exit.stairs === 'bossKill', 'Nick: the guardian is the elevator and the boss kill opens the stairs');
assert(exit.livingBossBlocksElevator === false && exit.bossOptionalForElevator === true, 'a living boss does not block the L2 elevator');
assert(exit.separateEncounters === true && exit.authoritativeLeverGate === 'rubyGuardian', 'L2 guardian and boss stay separate encounters');
assert(level.exit.elevator === exit.elevator && level.exit.stairs === exit.stairs, 'the map exit uses the same two gates');
assert(E.validate().length === 0, 'the ten exit rows still pass');

Object.keys(L2.XP).forEach(function (key) {
  const mon = L2.MONSTERS[key];
  assert(mon.xp === L2.XP[key], key + ' printed XP is ' + L2.XP[key]);
  assert(L2.printedXp(mon) === mon.xp, key + ' XP formula sums to the printed total');
  assert(mon.art && mon.art.newArt === false && typeof mon.art.key === 'string', key + ' art is a stand-in key and binds nothing new');
});
assert(L2.bossGuardianXp() === 181 + 260, 'L2 boss-plus-guardian XP is 441');
assert(T.statBossGuardianXp(T.level(2)) === L2.bossGuardianXp(), 'the campaign table uses the same L2 stat-block total');
assert(T.level(2).pacing.bossPlusGuardianXp === 441, 'the L2 pacing total is the stat blocks, 441');
assert(L2.MONSTERS.goblin.hd === '1-1' && L2.MONSTERS.goblin.ac === 6 && L2.MONSTERS.goblin.attacks[0].damage === '1d6', 'goblin HD, AC, and damage match 1.2');
assert(L2.MONSTERS.goblinLeader.hd === '1+1' && L2.MONSTERS.goblinLeader.attacks[0].damage === '1d8', 'leader HD and damage match 1.2');
assert(L2.MONSTERS.goblinBoss.hd === 2 && L2.MONSTERS.goblinBoss.ac === 5 && L2.MONSTERS.goblinBoss.attacks[0].damage === '2d4', 'bodyguard HD, AC, and damage match 1.2');
assert(L2.MONSTERS.rat.hd === '1/2' && L2.MONSTERS.rat.ac === 7 && L2.MONSTERS.rat.attacks[0].damage === '1d3', 'giant rat HD, AC, and damage match 1.2');
assert(L2.MONSTERS.goblinShaman.hp === 9 && L2.MONSTERS.goblinShaman.casterLevel === 2 && L2.MONSTERS.goblinShaman.kingHall === false, 'the shaman is 2nd level, 9 hp, and not a king-hall caster');
assert(L2.MONSTERS.goblinKing.hp === 26 && L2.MONSTERS.goblinKing.ac === 3 && L2.MONSTERS.goblinKing.attacks[0].damage === '1d8+2', 'the king is 4+1 HD at 26 hp, AC 3, 1d8+2');
assert(L2.MONSTERS.rubyGuardian.hp === 24 && L2.MONSTERS.rubyGuardian.ac === 5 && L2.MONSTERS.rubyGuardian.attacks[0].damage === '1d10', 'Guardian II is 4 HD, 24 hp, AC 5, 1d10');
assert(L2.MONSTERS.rubyGuardian.xpFormula.xp === T.level(2).rubyGuardian.formula.xp, 'Guardian II XP matches the guardian line');

assert(L2.SHAMAN.slots[1] === 2 && L2.SHAMAN.wis === 12 && L2.SHAMAN.bonusSpells === 0, 'a 2nd-level shaman with WIS 12 has two 1st-level spells and no bonus');
assert(L2.SHAMAN.memorized.map(function (s) { return s.name; }).join() === 'Command,Cause Light Wounds', 'the memorized pair is Command and Cause Light Wounds');
assert(L2.SHAMAN.memorized[0].segments === 1 && L2.SHAMAN.memorized[0].windupSec === 0.1 && L2.SHAMAN.memorized[0].stunSec === 1, 'Command is 1 segment, 0.1 s, and stuns for 1 s');
assert(L2.SHAMAN.memorized[1].segments === 5 && L2.SHAMAN.memorized[1].damage === '1d8', 'Cause Light Wounds is 5 segments and 1d8');
assert(L2.SHAMAN.swap.map(function (s) { return s.name; }).join() === 'Darkness,Cause Fear', 'the swap set is Darkness and Cause Fear');
assert(L2.SHAMAN.swap[0].attackPenalty === -4 && L2.SHAMAN.swap[1].flee === '1 round per level', 'Darkness is -4 and Cause Fear flees one round per level');
assert(L2.SHAMAN.cadence.length === 4 && L2.SHAMAN.spellEverySec === 2 && L2.SHAMAN.fleeAtHpFraction === 0.5, 'the shaman cadence is the four-step ruling');
assert(L2.KING.priority.length === 5 && L2.KING.inventsSpawns === false, 'the king priority list has five steps and invents no spawns');
assert(L2.DIALOGUE.mode === 'insults-only' && L2.DIALOGUE.parley === false && L2.DIALOGUE.bargain === false, 'goblins only insult');
assert(L2.DIALOGUE.retired.indexOf('maybeGoblinMercy') >= 0, 'the mercy beg is retired on L2');

L2.ingredientIds().forEach(function (id) {
  assert(Q.SOURCES[id] && Q.SOURCES[id].level <= 2, id + ' resolves in the registry at or before L2');
});
L2.itemIds().forEach(function (id) {
  const item = Q.QUEST_ITEMS.filter(function (it) { return it.id === id; })[0];
  assert(item && item.usableByMacar === 'Y', id + ' resolves as a usable quest item');
});
assert(Q.SOURCES.barley.level === 2 && Q.SOURCES.starmetal.level === 2 && Q.SOURCES.ruby_guardian_2.level === 2, 'barley, starmetal, and the L2 ruby are L2 sources');
assert(Q.QUEST_ITEMS.filter(function (it) { return it.id === 'grond_tooth_electrum_2'; }).length === 1, 'electrum tooth 2 is registered once');
const live = JSON.parse(fs.readFileSync(path.join(root, 'src/crafting/recipes.json'), 'utf8'));
['healing_potion', 'cave_ale', 'star_hammer', 'borgas_burp'].forEach(function (id) {
  const recipe = live.recipes.filter(function (row) { return row.id === id; })[0];
  assert(Q.LIVE_PLAN[id] && Q.LIVE_PLAN[id].neededBy <= 2, id + ' is a registry recipe needed by L2');
  Object.keys(recipe.ingredients).forEach(function (ing) {
    assert(Q.SOURCES[ing] && Q.SOURCES[ing].level <= 2, id + ' ingredient ' + ing + ' resolves by L2');
  });
});
const bolts = Q.FORGE_RECIPES.filter(function (row) { return row.id === 'bolts_plus_1'; })[0];
assert(bolts.availableFrom === 2, 'Bolts +1 are available from L2');
Object.keys(bolts.ingredientSets[0]).forEach(function (ing) {
  assert(Q.SOURCES[ing] && Q.SOURCES[ing].level <= 2, 'bolts ingredient ' + ing + ' resolves by L2');
});
assert(L2.LOOT.caches.count === 16 && L2.LOOT.caches.row.gp.chance === 40, 'the level-2 cache row keeps the 40% gold chance');
assert(L2.LOOT.individual.U.magic.chance === 55 && L2.LOOT.lairC.onCorpse === false, 'U magic is 55% and lair C is not a corpse drop');
assert(L2.LOOT.questItems[1].countsForRitual === false, 'the bronze tooth is not a ritual tooth');

assert(L2.OPEN.length > 0 && L2.OPEN.every(function (row) { return row.id && row.note.indexOf('(open)') >= 0; }), 'each open L2 choice is marked in the data');
assert(/ASSET_VER='131'/.test(html), 'ASSET_VER stays 131');
assert(html.indexOf('L2.js') < 0 && html.indexOf('maps/l2.json') < 0, 'index.html does not load the L2 data');
assert(save.indexOf('L2.js') < 0 && save.indexOf('maps/l2.json') < 0, 'GameSave does not load the L2 data');
assert(L2.wired === false, 'the L2 module is not wired');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('L2 campaign data ok');

/**
 * Level 5 campaign data. Not wired into play.
 * Run: node src/campaign/L5.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Map = require('./LevelMap');
const T = require('./CampaignTable');
const E = require('./ExitRules');
const Q = require('./QuestRegistry');
const L5 = require('./L5');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

const root = path.join(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const save = fs.readFileSync(path.join(root, 'src/saves/GameSave.js'), 'utf8');
const l5Book = Map.load(fs.readFileSync(path.join(__dirname, 'maps/l5.json'), 'utf8'));
const campaign = Map.load(fs.readFileSync(path.join(__dirname, 'maps/campaign-levels.json'), 'utf8'));

assert(l5Book.ok, l5Book.ok ? 'L5 map validates' : l5Book.errors.join('; '));
assert(campaign.ok, campaign.ok ? 'campaign book still validates' : campaign.errors.join('; '));
assert(l5Book.book.affectsPlay === false && l5Book.book.levels.length === 1, 'the L5 book is data and holds one level');
assert(JSON.stringify(campaign.book.levels[4]) === JSON.stringify(l5Book.book.levels[0]), 'the campaign book carries the same L5 map');
assert(campaign.book.levels[0].id === 'L1' && campaign.book.levels[1].id === 'L2' && campaign.book.levels[2].id === 'L3' && campaign.book.levels[3].id === 'L4', 'L1 through L4 stay in place');

const level = l5Book.book.levels[0];
assert(level.id === 'L5' && level.wired === false && level.level === 5, 'L5 is unwired');
assert(level.stairsOpenOn === 'bossKill', 'L5 stairs open on the boss kill');
assert(level.boss && level.boss.key === 'drowMatron' && level.guardian && level.guardian.key === 'rubyGuardian', 'L5 has a boss and a guardian');
assert(level.boss.placement === 'fixed' && level.boss.x === 88 && level.boss.y === 40 && level.boss.hp === 32 && level.boss.ac === 1, 'the Matron is fixed in her hall');
assert(level.boss.bossFlagOnIndividual === false && level.boss.separateFromGuardian === true, 'the Matron is a separate fight and wears no boss flag');
assert(level.boss.key !== level.guardian.key, 'the guardian and the boss are different creatures');
assert(level.guardian.placement === 'fixed' && level.guardian.tier === 5 && level.guardian.count === 1 && level.guardian.hp === 60 && level.guardian.ac === 2 && level.guardian.hitOnlyBy === 1, 'guardian is Ruby Guardian V and needs a +1 weapon');
assert(level.guardian.bossFlagOnIndividual === false, 'the guardian wears no boss flag');
assert(level.rubyDoor.placement === 'fixed' && level.lever.enablesWhen === 'rubyGuardianDead' && level.lever.needsBoss === false && level.lever.opensStairs === false, 'the lever needs the guardian and does not open the stairs');
assert(level.elevator.auto === true && level.elevator.standIn === true && level.elevator.gate === 'guardian', 'the elevator is automatic and the guardian is its gate');
assert(level.elevator.transitionCard === 'assets/creatures/mon_drow.png', 'the transition card is the drow sheet');
assert(level.elevator.transitionCard === T.level(5).elevator.transitionCard, 'the card matches the campaign table');
assert(fs.existsSync(path.join(root, level.elevator.transitionCard)), 'the stand-in art file exists');
assert(level.stairs.opensOn === 'bossKill' && level.stairs.stairsOpenOn === 'bossKill', 'the stair opens when the Matron dies');
assert(level.tooth.id === 'grond_tooth_electrum_5' && level.tooth.n === 5 && level.tooth.cursed === true && level.tooth.countsForRitual === true && level.tooth.countsForTeethCarried === true, 'electrum tooth 5 is cursed and counts toward the seven');
const sword = level.setPieces.filter(function (p) { return p.id === 'drow-plus-two-sword'; })[0];
assert(sword && sword.placed === true && sword.plus === 2 && sword.always === true && sword.usableByMacar === 'Y', 'the Matron\'s guard carries a +2 short sword Macar can use');

const keys = Object.keys(L5.MONSTERS);
level.spawns.forEach(function (group) {
  group.members.forEach(function (member) {
    assert(keys.indexOf(member.key) >= 0, group.id + ' member ' + member.key + ' is an L5 stat block');
  });
});
assert(!level.spawns.some(function (group) {
  return group.members.some(function (member) {
    return member.key !== 'drow' && member.key !== 'drowMage' && member.key !== 'drowPriestess' && member.key !== 'drowMatron';
  });
}), 'the placed residents are the drow ranks');
const hall = level.spawns.filter(function (group) { return group.id === 'matron-hall'; })[0];
assert(hall.members.some(function (member) { return member.key === 'drowMatron' && member.count === 1; }), 'the hall has the Matron');
assert(hall.members.some(function (member) { return member.key === 'drow' && member.role === 'guard' && member.sword === 'drow_short_sword_plus_2' && member.adamantite === 2; }), 'her guard carries the sword and always drops 2 adamantite');

assert(level.wander.slots.length === 6, 'section 5 gives L5 six wander slots');
assert(JSON.stringify(level.wander.slots) === JSON.stringify(L5.WANDER), 'the map wander table matches the encounter data');
assert(JSON.stringify(L5.WANDER) === JSON.stringify(T.level(5).wander), 'the wander table matches the campaign table');
assert(level.wander.check.chance === '1 in 6' && level.wander.check.every === '3 turns', 'wandering monsters check 1 in 6 every 3 turns');
assert(level.loot.caches.count === 16 && level.loot.caches.places.length === 16 && level.loot.caches.level === 5, 'sixteen level-5 caches');
assert(level.loot.matronCorpse.letter === 'U' && level.loot.matronChest.onCorpse === false && level.loot.matronChest.letter == null, 'the Matron corpse is U and the FF lair letter is unset');
assert(level.loot.guardianRuby.gp === 1250, 'Guardian V drops the 1250 gp ruby');

const exit = E.forLevel(5);
assert(exit.elevator === 'guardian' && exit.stairs === 'bossKill' && exit.stairsOpenOn === 'bossKill', 'Guardian V is the elevator and the Matron kill opens the stairs');
assert(exit.boss != null && exit.separateEncounters === true, 'L5 keeps a boss and is not the L1 exception');
assert(level.exit.elevator === exit.elevator && level.exit.stairs === exit.stairs && level.exit.stairsOpenOn === exit.stairsOpenOn, 'the map exit uses the same gates');
assert(E.validate().length === 0, 'the ten exit rows still pass');
const bare = E.LEVELS.map(function (row) { return Object.assign({}, row); });
bare[4] = Object.assign({}, bare[4], { boss: null });
assert(E.validate(bare).some(function (err) { return err.indexOf('L5') >= 0 && err.indexOf('boss') >= 0; }), 'L5 stairs still require a boss');
const stripped = JSON.parse(JSON.stringify(campaign.book));
stripped.levels[4].boss = null;
delete stripped.levels[4].stairsOpenOn;
const noBoss = Map.load(stripped);
assert(!noBoss.ok && noBoss.errors.some(function (err) { return err.indexOf('L5') >= 0 && err.indexOf('boss') >= 0; }), 'a boss-less L5 map fails validation');

Object.keys(L5.XP).forEach(function (key) {
  const mon = L5.MONSTERS[key];
  assert(mon.xp === L5.XP[key], key + ' printed XP is ' + L5.XP[key]);
  if (mon.xpApprox) {
    assert(L5.printedXp(mon) === mon.bandXp && mon.bandXp !== mon.xp, key + ' band sum sits beside the printed approximation');
  } else {
    assert(L5.printedXp(mon) === mon.xp, key + ' XP formula sums to the printed total');
  }
  assert(mon.art && mon.art.newArt === false && typeof mon.art.key === 'string', key + ' art is a stand-in key and binds nothing new');
  if (mon.art.file) assert(fs.existsSync(path.join(root, mon.art.file)), key + ' art file exists');
});
assert(L5.MONSTERS.drowPriestess.art.standIn === true && L5.MONSTERS.drowPriestess.art.file === 'assets/creatures/mon_drow_matron.png', 'the priestess uses the matron sheet');
assert(L5.MONSTERS.drowMatron.art.standIn === false, 'the Matron uses her own sheet');
assert(L5.bossGuardianXp() === 2640 + 956 && L5.bossGuardianXp() === 3596, 'L5 boss-plus-guardian XP is the stat blocks, 3596');
assert(L5.FORECAST_BOSS_GUARDIAN_XP === 5270 && T.level(5).pacing.bossPlusGuardianXp === 3596, 'the 1.12 forecast of 5270 is not the pacing total');
assert(T.statBossGuardianXp(T.level(5)) === L5.bossGuardianXp(), 'the campaign table uses the same L5 stat-block total');
assert(T.level(5).pacing.cumulativeXp === 78000 && T.level(5).pacing.macar === 'F7', 'the L5 clear stays at the 1.12 F7 row, 78000');
assert(T.level(5).pacing.cumulativeXp >= T.FIGHTER_XP.F7 && T.level(5).pacing.cumulativeXp < T.FIGHTER_XP.F8, '78000 sits in the F7 band');
assert(T.pathXp() === 510000 && T.pathXp() >= 500001, 'the L1-L10 clear plus the ritual stays 510000');

assert(L5.MONSTERS.drow.hd === 2 && L5.MONSTERS.drow.hp === 11 && L5.MONSTERS.drow.ac === 3 && L5.MONSTERS.drow.mr === 52 && L5.MONSTERS.drow.acVerify === true, 'the warrior is 2 HD, 11 hp, AC 3, MR 52%, marked verify');
assert(L5.MONSTERS.drowMage.hd === 5 && L5.MONSTERS.drowMage.hp === 14 && L5.MONSTERS.drowMage.ac === 4 && L5.MONSTERS.drowMage.mr === 60, 'the mage is 5 HD, 14 hp, AC 4, MR 60%');
assert(L5.MONSTERS.drowPriestess.hd === 5 && L5.MONSTERS.drowPriestess.hp === 24 && L5.MONSTERS.drowPriestess.ac === 3 && L5.MONSTERS.drowPriestess.mr === 60 && L5.MONSTERS.drowPriestess.xp === 380, 'the priestess is 5 HD, 24 hp, AC 3, MR 60%, about 380 XP');
assert(L5.MONSTERS.drowMatron.hd === 7 && L5.MONSTERS.drowMatron.hp === 32 && L5.MONSTERS.drowMatron.ac === 1 && L5.MONSTERS.drowMatron.mr === 64 && L5.MONSTERS.drowMatron.attacks[0].extra === '1d4', 'the Matron is 7 HD, 32 hp, AC 1, MR 64%, whip 1d4+1d4');
assert(L5.MONSTERS.rubyGuardian.hd === 10 && L5.MONSTERS.rubyGuardian.hp === 60 && L5.MONSTERS.rubyGuardian.ac === 2 && L5.MONSTERS.rubyGuardian.attacks[0].damage === '2d10' && L5.MONSTERS.rubyGuardian.hitOnlyBy === 1, 'Guardian V is 10 HD, 60 hp, AC 2, 2d10, hit only by +1');
assert(L5.MONSTERS.rubyGuardian.cone.damage === '2d6' && L5.MONSTERS.rubyGuardian.cone.range === '3"' && L5.MONSTERS.rubyGuardian.xp === T.level(5).rubyGuardian.formula.xp, 'the cone matches IV and the XP matches the guardian line');

assert(L5.MAGE.slots[1] === 4 && L5.MAGE.slots[2] === 2 && L5.MAGE.slots[3] === 1 && L5.MAGE.list.length === 7, 'the mage list fills 4/2/1');
assert(L5.MAGE.sleep.affects === '4+1 HD or less' && L5.MAGE.sleep.ghosts === 'immune', 'Sleep skips Macar\'s band and the ghosts');
assert(L5.PRIESTESS.slots[1] === 3 && L5.PRIESTESS.slots[2] === 3 && L5.PRIESTESS.slots[3] === 1 && L5.PRIESTESS.list.length === 7 && L5.PRIESTESS.wis == null, 'the priestess list fills 3/3/1 and adds no unprinted Wisdom bonus');
assert(L5.MATRON.slots[1] === 3 && L5.MATRON.slots[2] === 3 && L5.MATRON.slots[3] === 2 && L5.MATRON.slots[4] === 1 && L5.MATRON.list.length === 9 && L5.MATRON.wis == null, 'the Matron list fills 3/3/2/1 and adds no unprinted Wisdom bonus');
assert(L5.MATRON.priority.length === 5 && L5.MATRON.levitateBelowHpFraction === 0.3 && L5.MATRON.darkness.attackMod === -4 && L5.MATRON.causeSerious.damage === '2d8+1', 'the Matron has five steps, darkness at -4, and Cause Serious Wounds 2d8+1');
assert(L5.MATRON.bossFlagOnIndividual === false && L5.MATRON.separateFromGuardian === true, 'the Matron stays separate from Guardian V');

assert(L5.POISON.kind === 'sleep' && L5.POISON.h1Damage === false && L5.POISON.usesSpiderTable === false && L5.POISON.spiderTable === T.poisonSave, 'drow sleep points at the spider table and does not apply those mods');
assert(L5.POISON.ffModifier == null && L5.POISON.ffModifierVerify === true && L5.POISON.save === 'vs poison', 'the FF poison modifier stays unset');
assert(L5.POISON.durationTurns === '2d4' && L5.POISON.secondsPerTurn === 5 && L5.POISON.wakeOnDamage === true && L5.POISON.rawSlay === false && L5.POISON.autoHit === true, 'sleep lasts 2d4 turns of 5 s, hits land, and damage wakes the target');
assert(L5.POISON.ghostsImmune === true && L5.POISON.antitoxinPlus === 4 && L5.POISON.saveFloor === 2 && L5.POISON.floorRule === '6 #12', 'ghosts are immune, antitoxin is +4, and the poison save floors at 2');
assert(L5.SWORD.plus === 2 && L5.SWORD.always === true && L5.SWORD.usableByMacar === 'Y' && L5.LOOT.components.drow_adamantite.perWarrior === 0.5 && L5.LOOT.components.drow_adamantite.guardAlways === 2, 'the sword is guaranteed and adamantite is 50% per warrior, 2 from the guard');
assert(L5.LOOT.individual.U.magic.chance === 55 && L5.LOOT.lair.onCorpse === false && L5.LOOT.lair.letter == null, 'U magic is 55% and the FF lair dice are not stored');
assert(L5.LOOT.caches.row.gp.chance === 50 && L5.LOOT.caches.row.gp.min === 4 && L5.LOOT.caches.row.gp.max === 24 && L5.LOOT.caches.row.magic.count === 2, 'the level-5 cache row keeps the live gold range and two magic rolls');
assert(L5.TRAITS.sunlight.present === false && L5.TRAITS.sunlight.gearKeepsPower === true && L5.LOOT.armorRefit === 'D12-B', 'dungeon gear keeps its plus, and the forge refits chain');

L5.ingredientIds().forEach(function (id) {
  assert(Q.SOURCES[id] && Q.SOURCES[id].level <= 5, id + ' resolves in the registry at or before L5');
});
L5.itemIds().forEach(function (id) {
  const item = Q.QUEST_ITEMS.filter(function (it) { return it.id === id; })[0];
  assert(item && item.usableByMacar === 'Y', id + ' resolves as a usable quest item');
});
assert(Q.SOURCES.drow_adamantite.level === 5, 'adamantite is an L5 source');
const chain = Q.FORGE_RECIPES.filter(function (row) { return row.id === 'adamantine_chain'; })[0];
assert(chain.neededBy === 5, 'Adamantine Chain is first useful on L5');
Object.keys(chain.ingredientSets[0]).forEach(function (ing) {
  assert(Q.SOURCES[ing] && Q.SOURCES[ing].level <= 5, 'adamantine chain ingredient ' + ing + ' resolves by L5');
});
const hammer = Q.FORGE_RECIPES.filter(function (row) { return row.id === 'rune_hammer'; })[0];
assert(hammer.availableFrom === 5, 'the Rune Hammer +2 recipe can be forged from L5');
Object.keys(hammer.ingredientSets[0]).forEach(function (ing) {
  assert(Q.SOURCES[ing] && Q.SOURCES[ing].level <= 5, 'rune hammer ingredient ' + ing + ' resolves by L5');
});

assert(L5.OPEN.length === 22 && L5.OPEN.every(function (row) { return row.id && row.note.indexOf('(open)') >= 0; }), 'each open L5 choice is marked in the data');
assert(L5.MONSTERS.drow.acVerify === true && L5.MONSTERS.drow.ttVerify === true && L5.MONSTERS.drowPriestess.innateFemaleVerify === true, 'the verify figures stay marked');
assert(html.indexOf('L5.js') < 0 && html.indexOf('maps/l5.json') < 0, 'index.html does not load the L5 data');
assert(save.indexOf('L5.js') < 0 && save.indexOf('maps/l5.json') < 0, 'GameSave does not load the L5 data');
assert(L5.wired === false, 'the L5 module is not wired');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('L5 campaign data ok');

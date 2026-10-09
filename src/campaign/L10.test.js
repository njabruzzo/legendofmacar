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
assert(level.ritual.id === 'temple-ritual' && level.ritual.xpOnce == null && level.ritual.teeth === 7 && level.ritual.hammer === 'holy_hammer' && level.ritual.anvil === 'holy_anvil' && level.ritual.behindBoss === true && level.ritual.unlocksOn === 'kingKill', 'the temple ritual uses the seven teeth, the hammer, and the anvil after the King dies');
assert(throne.room === level.boss.room, 'the throne spawn is the boss room');
assert(throne.members.some(function (member) { return member.key === 'king' && member.count === 1 && member.role === 'boss'; }), 'the throne room has the King');
assert(throne.members.some(function (member) { return member.key === 'wight' && member.count === 2 && member.role === 'minion'; }), 'two wights stand in the boss room');
assert(throne.members.some(function (member) { return member.key === 'wraith' && member.count === 2 && member.role === 'minion'; }), 'two wraiths stand in the boss room');
assert(court.room === 'south-court' && court.members.some(function (member) { return member.key === 'duergar' && member.count === 4 && member.role === 'population'; }), 'four duergar stand in the south court');
assert(court.members.some(function (member) { return member.key === 'duergarPriest' && member.count === 1 && member.role === 'population'; }), 'the priest stands with the duergar');
assert(L10.KING.coveringUnit == null && L10.KING.priority.length === 4 && L10.KING.neverLeaves === true && L10.KING.diesBeforeRitual === true, 'the four steps name the throne room and the King dies before the ritual');
assert(L10.MONSTERS.king.unslayableWhile == null && L10.MONSTERS.king.atZeroHp == null && L10.MONSTERS.king.regeneration.hpPerRound === 2, 'the King dies at 0 HP and still regenerates 2');
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
[[48, 50], [40, 70], [80, 40]].forEach(function (tile) {
  assert(!level.loot.caches.places.some(function (place) { return place[0] === tile[0] && place[1] === tile[1]; }), 'no cache sits in solid rock at ' + tile.join(','));
});
[[60, 44], [36, 62], [70, 44]].forEach(function (tile) {
  assert(level.loot.caches.places.some(function (place) { return place[0] === tile[0] && place[1] === tile[1]; }), 'a cache sits on the floor at ' + tile.join(','));
});
[[70, 18], [92, 18], [86, 12]].forEach(function (tile) {
  const chapel = braziers.places.filter(function (place) { return place.x === tile[0] && place.y === tile[1]; })[0];
  assert(chapel && chapel.room === 'side-chapel', 'the brazier at ' + tile.join(',') + ' is a side chapel');
});
assert(level.loot.lordCorpse.letter === 'U' && level.loot.lordChest.onCorpse === false && level.loot.lordChest.contents === 'chapter-v-hoard' && level.loot.lordChest.includesRuby === false && level.loot.lordChest.letter == null, 'the corpse is U and the chest is the Chapter V hoard, not the ruby');
assert(level.loot.guardianRuby.gp === 2500 && level.loot.guardianRuby.with === 'rubyGuardian', 'Guardian X keeps the 2500 gp ruby');
assert(L10.LOOT.bossChest.includesRuby === false && L10.LOOT.guardianRuby.with === 'rubyGuardian', 'the ruby is listed with the guardian only');

const exit = E.forLevel(10);
assert(exit.elevator === 'guardian' && exit.stairs === 'bossKill' && exit.stairsOpenOn === 'bossKill', 'Guardian X is the elevator and the King\'s kill opens the stairs');
assert(exit.guardian.count === 1 && exit.boss != null && exit.separateEncounters === true, 'L10 keeps one guardian and a boss');
assert(level.exit.elevator === exit.elevator && level.exit.stairs === exit.stairs && level.exit.stairsOpenOn === exit.stairsOpenOn && level.exit.win === 'ritualComplete', 'the map exit uses the same gates and the ritual win');
assert(level.exit.stairNext === null && level.exit.elevatorNext === null && level.exit.beforeWin === L10.EXIT.stair.beforeWin && L10.EXIT.elevator.next === null, 'both exits are next null and show the altar hint before the win');
assert(level.exit.altarUnlocksOn === 'kingKill' && L10.RITUAL.unlocksOn === 'kingKill', 'the King\'s kill unlocks the altar');
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
assert(L10.bossGuardianXp() !== L10.XP.king + L10.XP.rubyGuardian + L10.XP.skeleton, 'skeleton XP is not in the boss-plus-guardian total');
assert(L10.FORECAST_BOSS_GUARDIAN_XP === 22352 && T.level(10).pacing.bossPlusGuardianXp === 22352, 'the 1.12 column matches the stat blocks, 22352');
assert(T.statBossGuardianXp(T.level(10)) === L10.bossGuardianXp(), 'the campaign table uses the same L10 stat-block total');
assert(T.level(10).boss.xp === 5552 && T.level(10).rubyGuardian.formula.xp === 16800, 'the table xp fields are the printed King and guardian totals');
assert(T.level(9).pacing.cumulativeXp === 406800, 'the clear through L9 stays 406800');
assert(T.level(10).pacing.cumulativeXp === 491800 && T.level(10).pacing.macar === 'F10', 'the L10 clear stays 491800');
assert(L10.PATH.ritual == null && L10.PATH.throughL9 === 406800 && L10.PATH.l10Clear === 85000 && L10.PATH.throughL9 + L10.PATH.l10Clear + L10.RITUAL.xpOnce === L10.PATH.total && L10.PATH.total === 501800, 'the path total is the clear plus the one ritual award');
assert(T.level(10).quest.xpOnce == null && T.level(10).pacing.ritualXp == null && level.ritual.xpOnce == null, 'the table and the map do not store a second ritual award');
assert(T.pathXp() === 501800 && T.pathXp() >= 500001, 'the L1-L10 clear plus the ritual stays 501800');
const savedXp = L10.RITUAL.xpOnce;
L10.RITUAL.xpOnce = 1;
assert(T.pathXp() === T.level(10).pacing.cumulativeXp + 1, 'path XP reads RITUAL.xpOnce and not the other copies');
L10.RITUAL.xpOnce = savedXp;
assert(T.pathXp() === 501800 && T.level(10).pacing.cumulativeXp + L10.RITUAL.xpOnce + L10.RITUAL.xpOnce === 511800 && T.pathXp() !== 511800, 'adding the ritual a second time would be 511800');

assert(L10.MONSTERS.king.hp === 72 && L10.MONSTERS.king.xp === 5552 && L10.MONSTERS.king.regeneration.hpPerRound === 2, 'the King is 72 hp, 5552 XP, and regenerates 2 while a brazier burns');
assert(L10.MONSTERS.skeleton.xp === 19 && L10.MONSTERS.skeleton.bandXp == null && L10.MONSTERS.skeleton.corpseBand === 'mid', 'the skeleton wired xp is 19 and the corpse uses the mid band');
assert(L10.MONSTERS.duergarPriest.xp === 393 && L10.MONSTERS.duergarPriest.bandXp == null && L10.MONSTERS.duergarPriest.corpseLetters.M === 1 && L10.MONSTERS.duergarPriest.corpseLetters.Q === 1, 'the priest is 393 XP and rolls M and Q');
assert(L10.MONSTERS.spectre.tt.join() === 'Q,Q,Q,X,Y' && L10.MONSTERS.spectre.onCorpse === true, 'spectre treasure is Q, Q, Q, X, and Y on the corpse');
assert(L10.MONSTERS.ghoul.corpseLetters.T === 1 && L10.MONSTERS.ghoul.bandCoinsOnly === true && L10.MONSTERS.wight.corpseBand === 'high' && L10.MONSTERS.wraith.corpseBand === 'high', 'a ghoul corpse rolls T plus mid-band coins, and wights and wraiths use O+M');
assert(L10.LOOT.bossChest.once === true && L10.LOOT.bossChest.includesRuby === false && L10.MONSTERS.rubyGuardian.ruby.gp === 2500 && L10.MONSTERS.rubyGuardian.ruby.band == null, 'the hoard rolls once without the ruby, and Guardian X\'s ruby is exactly 2500');
assert(L10.LOOT.corpseCoinRule === T.corpseCoinRule && T.corpseCoinRule.extraBandMagic === false && T.corpseCoinRule.appliesOn === 'every level', 'letters with no coins add the band\'s coins only, on every level');
assert(L10.MONSTERS.rubyGuardian.xp === 16800 && L10.MONSTERS.rubyGuardian.cone.damage === '4d6' && L10.MONSTERS.rubyGuardian.hitOnlyBy === 3, 'Guardian X is 16800 XP, the cone is 4d6, and only +3 hits');
assert(L10.MINIONS.locked === true && L10.MINIONS.guard.inBossRoom === true && L10.MINIONS.guard.counts.wight === 2 && L10.MINIONS.guard.counts.wraith === 2, 'two wights and two wraiths are the locked guard and stand with the King');
assert(L10.MINIONS.population.inBossRoom === false && L10.MINIONS.animated.placed === false, 'the duergar are the population, and Animate Dead is not a placed pack');
assert(L10.RITUAL.xpOnce > 0 && L10.RITUAL.alsoCalled == null && L10.RITUAL.altar.x === 29 && L10.RITUAL.altar.y === 14.5, 'the ritual award sits on the temple altar');
assert(L10.RITUAL.toothIds.length === 7 && L10.RITUAL.hammer.from === 'L8' && L10.RITUAL.anvil.tool === true && L10.RITUAL.anvil.consumed === false, 'the ritual uses the seven teeth, the L8 hammer, and the anvil as a tool');
assert(L10.RITUAL.smash.sec === 1 && L10.RITUAL.smash.interruptedBy === 'any hit' && L10.RITUAL.smash.putsOut === 'nearest brazier' && L10.RITUAL.smash.by === 1, 'each smash takes 1 s, any hit interrupts it, and it puts out the nearest brazier');
assert(L10.RITUAL.teethCounted.join() === 'party,altar' && L10.RITUAL.unclaimedTooth.goesTo.level === 10 && L10.RITUAL.unclaimedTooth.goesTo.x === 29, 'the ritual counts party teeth plus altar teeth, and a missed tooth goes to the altar');
assert(L10.RITUAL.questLock.until === 'ritual ends' && L10.RITUAL.questLock.teethMayMoveBetweenPacks === true && L10.RITUAL.questLock.cannot.join() === 'sell,drop,break,recipe', 'the anvil, the hammer, and the teeth stay locked until the ritual ends');
assert(L10.RITUAL.questLock.ids.length === 9 && L10.RITUAL.steps.length === 5 && L10.RITUAL.win === 'ritualComplete', 'the lock covers nine items and the seventh smash wins');

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
    assert(ing !== 'holy_anvil' && Q.SOURCES[ing] && Q.SOURCES[ing].level <= 10, 'adamantine_chain_2 ingredient ' + ing + ' resolves by L10');
  });
});
assert(chain.requires.join() === 'holy_anvil' && chain.consumesRequires === false, 'Adamantine Chain +2 requires the anvil and does not spend it');
assert(T.level(10).quest.id === 'temple-ritual' && T.level(10).quest.xpOnce == null && T.level(10).pacing.keyItems[0] === 'ritual complete', 'the level table tracks the temple ritual');

assert(L10.OPEN.length === 23, 'L10 records 23 choice notes');
L10.OPEN.forEach(function (row) {
  assert(row.id && row.note, row.id + ' has a note');
  if (row.note.indexOf('Resolved') === 0) assert(row.note.indexOf('(open)') < 0, row.id + ' is marked resolved');
  else assert(row.note.indexOf('(open)') >= 0, row.id + ' stays marked open');
});
const nick = L10.OPEN.filter(function (row) { return row.note.indexOf('(open)') >= 0; });
assert(nick.length === 2 && nick[0].id === 'undying-rise' && nick[1].id === 'elevator-epilogue', 'the two Nick flags stay open');
['king', 'duergar', 'skeleton', 'zombie', 'ghoul', 'wight', 'wraith', 'spectre', 'duergarPriest'].forEach(function (key) {
  assert(L10.MONSTERS[key].immune.indexOf('poison') >= 0, key + ' lists poison immunity');
});
function filesIn(dir, out) {
  fs.readdirSync(dir).forEach(function (name) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) filesIn(full, out);
    else out.push(full);
  });
}
const awardFiles = [];
filesIn(__dirname, awardFiles);
const awardDigits = String(L10.RITUAL.xpOnce);
const awardComma = awardDigits.slice(0, awardDigits.length - 3) + ',' + awardDigits.slice(-3);
const awardHits = [];
awardFiles.forEach(function (file) {
  fs.readFileSync(file, 'utf8').split('\n').forEach(function (line, i) {
    if (line.indexOf(awardDigits) < 0 && line.indexOf(awardComma) < 0) return;
    awardHits.push(path.relative(__dirname, file) + ':' + (i + 1));
  });
});
assert(awardHits.length === 1 && awardHits[0].indexOf('L10.js:') === 0, 'the ritual award appears only at L10.RITUAL.xpOnce (' + awardHits.join(', ') + ')');
const awardLine = fs.readFileSync(path.join(__dirname, 'L10.js'), 'utf8').split('\n')[Number(awardHits[0].split(':')[1]) - 1];
assert(/xpOnce:/.test(awardLine) && awardLine.indexOf(awardDigits) >= 0, 'the one ritual award is the xpOnce field');

function templeGrid() {
  function newGrid(w, h, fill) {
    const g = [];
    for (let y = 0; y < h; y++) {
      const row = [];
      for (let x = 0; x < w; x++) row.push(fill);
      g.push(row);
    }
    return g;
  }
  function rect(g, x, y, w, h, t) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j] && g[j][i] !== undefined) g[j][i] = t;
  }
  function corridor(g, x1, y1, x2, y2, wd, t) {
    const hw = (wd / 2) | 0;
    const sx = Math.min(x1, x2);
    const ex = Math.max(x1, x2);
    const sy = Math.min(y1, y2);
    const ey = Math.max(y1, y2);
    rect(g, sx, y1 - hw, ex - sx + 1, wd, t);
    rect(g, x2 - hw, sy, wd, ey - sy + 1, t);
  }
  const g = newGrid(108, 98, 1);
  rect(g, 6, 40, 12, 8, 3); corridor(g, 16, 44, 28, 44, 6, 0); rect(g, 18, 36, 24, 8, 0);
  rect(g, 14, 8, 30, 28, 0); rect(g, 26, 12, 6, 6, 3);
  corridor(g, 44, 22, 66, 22, 5, 0); rect(g, 64, 14, 18, 16, 0);
  corridor(g, 29, 36, 29, 58, 5, 0); rect(g, 18, 56, 22, 14, 0);
  corridor(g, 10, 44, 10, 62, 4, 0); rect(g, 4, 60, 14, 12, 0);
  corridor(g, 44, 16, 56, 10, 4, 0); rect(g, 52, 6, 16, 12, 0);
  corridor(g, 72, 22, 92, 22, 5, 0); rect(g, 88, 14, 16, 16, 0);
  corridor(g, 29, 68, 29, 86, 5, 0); rect(g, 16, 80, 26, 14, 0);
  corridor(g, 10, 70, 10, 86, 4, 0); rect(g, 4, 82, 14, 12, 0);
  corridor(g, 60, 10, 80, 8, 4, 0); rect(g, 76, 4, 18, 12, 0);
  corridor(g, 44, 30, 62, 40, 4, 0); rect(g, 56, 36, 18, 14, 0);
  corridor(g, 18, 70, 8, 74, 4, 0); rect(g, 4, 70, 12, 10, 0);
  return g;
}
function nearestChestTile() {
  const g = templeGrid();
  const altar = { x: 29, y: 14.5 };
  const door = { x: 29, y: 35 };
  const altarCell = { x: Math.floor(altar.x), y: Math.floor(altar.y) };
  const props = [[29, 14.5], [29, 10], [20, 16], [38, 16], [20, 28], [38, 28], [18, 12], [40, 12], [18, 31], [40, 31], [24, 33], [34, 33], [24, 22], [34, 22]];
  const blocked = {};
  props.forEach(function (p) { blocked[Math.floor(p[0]) + ',' + Math.floor(p[1])] = true; });
  function walkable(x, y) { return g[y] && (g[y][x] === 0 || g[y][x] === 3); }
  function key(x, y) { return x + ',' + y; }
  const path = {};
  const prev = {};
  const queue = [door];
  prev[key(door.x, door.y)] = null;
  while (queue.length) {
    const cell = queue.shift();
    if (cell.x === altarCell.x && cell.y === altarCell.y) break;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (step) {
      const nx = cell.x + step[0];
      const ny = cell.y + step[1];
      if (!walkable(nx, ny) || Object.prototype.hasOwnProperty.call(prev, key(nx, ny))) return;
      prev[key(nx, ny)] = cell;
      queue.push({ x: nx, y: ny });
    });
  }
  let step = altarCell;
  while (step) {
    path[key(step.x, step.y)] = true;
    step = prev[key(step.x, step.y)];
  }
  const seen = {};
  const reach = [{ x: 10, y: 44 }];
  seen[key(10, 44)] = true;
  while (reach.length) {
    const cell = reach.shift();
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
      const nx = cell.x + d[0];
      const ny = cell.y + d[1];
      if (!walkable(nx, ny) || seen[key(nx, ny)]) return;
      seen[key(nx, ny)] = true;
      reach.push({ x: nx, y: ny });
    });
  }
  let best = null;
  for (let y = 8; y < 36; y++) {
    for (let x = 14; x < 44; x++) {
      if (!walkable(x, y) || !seen[key(x, y)] || blocked[key(x, y)] || path[key(x, y)]) continue;
      const dist = Math.hypot(x + 0.5 - altar.x, y + 0.5 - altar.y);
      if (dist < 2) continue;
      if (!best || dist < best.dist - 1e-9 || (Math.abs(dist - best.dist) <= 1e-9 && (y < best.y || (y === best.y && x < best.x)))) {
        best = { x: x, y: y, dist: dist };
      }
    }
  }
  return best;
}
const chestTile = nearestChestTile();
const chest = level.loot.lordChest;
assert(chest.x === chestTile.x && chest.y === chestTile.y && chest.x === 28 && chest.y === 12, 'the boss chest is the nearest open temple tile off the altar');
assert(!(chest.x === 29 && chest.y === 14.5) && Math.hypot(chest.x + 0.5 - 29, chest.y + 0.5 - 14.5) >= 2, 'the chest is at least 2 tiles from the altar');
assert(L10.LOOT.bossChest.x === chest.x && L10.LOOT.bossChest.y === chest.y && L10.LOOT.bossChest.includesRuby === false, 'the encounter chest uses the same tile and does not hold the ruby');
assert(html.indexOf('L10.js') < 0 && html.indexOf('maps/l10.json') < 0, 'index.html does not load the L10 data');
assert(save.indexOf('L10.js') < 0 && save.indexOf('maps/l10.json') < 0, 'GameSave does not load the L10 data');
assert(L10.wired === false, 'the L10 module is not wired');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('L10 campaign data ok');

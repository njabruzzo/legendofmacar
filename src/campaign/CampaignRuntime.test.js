/**
 * Campaign runtime: load any level, play Level 2 after Level 1.
 * Run: node src/campaign/CampaignRuntime.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L2 = require('./L2');
const L10 = require('./L10');
require('./CampaignTable');
require('./ExitRules');
const R = require('./CampaignRuntime');
require('../saves/GameSave');
const GS = global.GameSave;

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

const root = path.join(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const l2 = R.load(2);
const l1 = R.load(1);
const l3 = R.load(3);
assert(l2 && l2.map && l2.map.rubyDoor.x === 10.2 && l2.map.rubyDoor.y === 25.8, 'L2 loads the ruby door from the map');
assert(l2.enter === true && l2.data.wired === false && l2.map.wired === false, 'L2 is the live floor and the data stays unwired');
assert(l2.map.guardian.x === 10.1 && l2.map.guardian.y === 31 && l2.map.guardian.hp === 24, 'L2 guardian point comes from the map');
assert(l2.map.boss.x === 74 && l2.map.boss.y === 67.6 && l2.map.boss.bossFlagOnIndividual === false, 'L2 boss point comes from the map and wears no flag');
assert(l1 && l1.enter === false && l1.stairsOpenOn === 'lever' && l1.boss == null, 'L1 is the lever exception and is not installed');
assert(l1.guardian && l1.guardian.key === 'thinOne' && l1.guardian.count === 6, 'L1 guardian is the six Thin Ones');
assert(l3 && l3.enter === false && l3.map.rubyDoor.x === 16.2 && l3.map.rubyDoor.y === 14.8, 'L3 loads from its map and is not entered');
assert(l3.map.rubyDoor.x !== l2.map.rubyDoor.x, 'the loader keeps each level\'s own ruby door');

const run = R.beginRun(l2);
assert(run.leverEnabled === false && run.stairsOpen === false && run.bossAlive === true && run.bossFlag === false, 'L2 starts with the lever locked and the boss alive');
assert(R.kill(run, 'rubyGuardian') === L2.XP.rubyGuardian, 'the guardian awards the printed ruby-guardian xp');
assert(run.leverEnabled === true && run.stairsOpen === false && run.bossAlive === true, 'the guardian kill unlocks the lever while the boss still lives');
assert(R.pullLever(run) === true && run.card === 'assets/ui/intro_ch2.jpg' && run.stairsOpen === false, 'the lever calls the elevator card and does not open the stairs');
assert(R.kill(run, 'goblinKing') === L2.XP.goblinKing && run.stairsOpen === true && run.bossFlag === false, 'the boss kill opens the stairs and sets no boss flag');
assert(run.xp === L2.XP.rubyGuardian + L2.XP.goblinKing, 'guardian plus boss xp is the printed pair');

const early = R.beginRun(l2);
R.kill(early, 'goblinKing');
assert(early.stairsOpen === true && early.leverEnabled === false, 'a living guardian still holds the lever after the boss dies');
assert(R.pullLever(early) === false, 'the lever stays shut until the guardian is dead');

const l1run = R.beginRun(l1);
for (let i = 0; i < 6; i++) R.kill(l1run, 'thinOne');
assert(l1run.leverEnabled === true && l1run.bossAlive === false && l1run.bossKey == null, 'six Thin One kills unlock the L1 lever and L1 has no boss');
assert(R.pullLever(l1run) === true && l1run.stairsOpen === true && l1run.card == null, 'the L1 lever opens the way down without an elevator card');

let sum = 0;
Object.keys(L2.XP).forEach(function (key) {
  const one = R.beginRun(l2);
  const got = R.kill(one, key);
  assert(got === L2.XP[key], key + ' xp is the printed value');
  sum += got;
});
assert(sum === 13 + 31 + 38 + 8 + 83 + 260 + 181, 'one of each L2 printed xp sums to the printed total');
assert(sum !== 501800 && R.kill(R.beginRun(l2), 'ritual') === 0, 'kills do not award the path total or the ritual');
assert(L10.RITUAL.xpOnce > sum && R.printed(l2, 'ritual') == null, 'ritual xp stays on L10 and is not a kill value');

const counted = R.spawnCount(l2);
l2.open[0].note = 'changed open note';
assert(R.spawnCount(l2) === counted && counted > 0, 'spawn counts come from the map, not an OPEN note');
assert(R.gaps(l2).indexOf('insults') >= 0 && R.gaps(l2).indexOf('elevator-returns-to-camp') >= 0, 'open insult lines stay listed and the L2 elevator returns to camp');

const l8 = R.load(8);
const l9 = R.load(9);
assert(l8.quest.id === 'holy_hammer' && l8.questSkipWired === false, 'the holy hammer skip stays unwired');
assert(l9.quest.id === 'holy_anvil' && l9.questSkipWired === false, 'the holy anvil skip stays unwired');
assert(R.gaps(l8).indexOf('holy_hammer') >= 0 && R.gaps(l9).indexOf('holy_anvil') >= 0, 'the unwired quest ids are reported');

assert(R.nextLevel(1) === 2, 'Level 1 leads to Level 2');
const left = { ch: 1, campaignLevel: 1 };
assert(R.noteCleared(left) === 2 && left.campaignLevel === 2, 'clearing Level 1 records Level 2');
const later = { ch: 2, campaignLevel: 2 };
assert(R.noteCleared(later) == null && later.campaignLevel === 2, 'leaving Level 2 does not advance into Level 3');
assert(R.shouldInstall({ campaignLevel: 1, lvl: { n: 2 } }) === false, 'an old chapter 2 save is not the campaign floor');
assert(R.shouldInstall({ campaignLevel: 2, lvl: { n: 2 } }) === true, 'campaign Level 2 installs onto chapter 2');
assert(R.shouldInstall({ lvl: { n: 2 } }) === false, 'a missing campaign level stays on the old chapter');

const zero = function () { return 0; };
assert(R.rollCount('1d6', zero).main === 1, 'a 1d6 wander roll uses the printed die');
assert(R.rollCount('2d4', zero).main === 2, 'a 2d4 wander roll uses the printed dice');
const mix = R.rollCount('1+1d4 goblins', zero);
assert(mix.main === 1 && mix.extraKey === 'goblin' && mix.extra === 1, 'a leader slot keeps one leader plus the printed goblin die');

function foe(name, extra) {
  return function () {
    return Object.assign({ team: 'foe', name: name, hp: 10, maxhp: 10, boss: 0, kind: name, sprite: name }, extra || {});
  };
}
const factories = {
  goblin: foe('Goblin', { kind: 'goblin', sprite: 'goblin' }),
  rat: foe('Cave Rat', { kind: 'rat', sprite: 'rat' }),
  goblinBoss: foe('Goblin Boss', { kind: 'goblin', sprite: 'goblin' }),
  goblinKing: foe('Goblin King', { kind: 'goblin', sprite: 'goblin_king', boss: 1 }),
  goblinShaman: foe('Goblin Shaman', { kind: 'goblin', shaman: 1, npc: 1 }),
  thinone: foe('Thin One', { kind: 'statue', sprite: 'thinone', rubyDrop: 1 })
};
const G = {
  campaignLevel: 2,
  ch: 2,
  ents: [{ team: 'party', hero: 1, x: 40, y: 8, col: { key: 'macar' }, hp: 20, maxhp: 20 }],
  props: [{ k: 'floorlever', x: 50, y: 16 }, { k: 'floorRubyDoor', x: 48, y: 16 }, { k: 'stairs', x: 40.1, y: 54.15 }, { k: 'web', x: 1, y: 1 }],
  lvl: {
    n: 2, w: 144, h: 118, grid: null, secrets: [],
    flags: {},
    spawn: { x: 40.15, y: 8.55 },
    stair: { x: 40.1, y: 51.6 },
    objs: [{ t: 'a', d: 0 }, { t: 'b', d: 0 }, { t: 'c', d: 0 }, { t: 'd', d: 0 }, { t: 'e', d: 0 }, { t: 'f', d: 0 }],
    tick: function () { this._inner = 1; }
  }
};
assert(R.install(G, { scale: 4, fresh: true, foe: factories, ally: { noz: function () { return { team: 'neutral', name: 'Noz', tied: 1 }; } }, rollExpr: function () { return 4; } }) === true, 'install accepts the chapter shell');
assert(G.lvl.flags.campaign === 1 && G.lvl.title === 'Noz and the Goblin King', 'the shell is marked as the campaign floor');
const gob = G.ents.filter(function (e) { return e.campaignKey === 'goblin'; })[0];
assert(gob && gob.campaignXp === 13 && gob.hp === 10 && gob.insultsOnly === 1 && gob.boss === 0, 'a goblin keeps stand-in hp, printed xp, and insults only');
const shaman = G.ents.filter(function (e) { return e.campaignKey === 'goblinShaman' && e.spellSet === 'memorized'; })[0];
assert(shaman && shaman.caster === 1 && shaman.shaman === 0 && shaman.name !== 'Goblin Shaman' && shaman.hp === 36 && shaman.campaignXp === 83, 'the camp shaman is a caster stand-in with printed hp and xp');
const warren = G.ents.filter(function (e) { return e.campaignKey === 'goblinShaman' && e.spellSet === 'swap'; })[0];
assert(warren && warren.spellSet === 'swap', 'the warren shaman keeps the swap set from the map');
const king = G.ents.filter(function (e) { return e.campaignRole === 'boss'; })[0];
assert(king && king.campaignXp === 260 && king.boss === 0 && king.chapterBoss === 0 && king.hp === 104, 'the king has printed xp and hp and wears no boss flag');
const guard = G.ents.filter(function (e) { return e.campaignRole === 'guardian'; })[0];
assert(guard && guard.rubyGp === 500 && guard.kind !== 'statue' && guard.name !== 'Thin One' && guard.sprite === 'thinone' && guard.sleeping === 1 && guard.hp === 96, 'the guardian uses the Thin One sheet, sleeps, and drops 500 gp');
assert(G.ents.some(function (e) { return e.name === 'Noz'; }), 'Noz is kept on the floor');
assert(!G.props.some(function (p) { return p.k === 'floorRubyDoor' || p.k === 'web'; }), 'the procedural ruby door and spider webs are not left on the floor');
assert(G.props.some(function (p) { return p.k === 'floorlever' && p.campaign && p.x === 8.2 && p.y === 33.6; }), 'the lever is the map lever');
assert(G.props.some(function (p) { return p.k === 'rubydoor' && p.x === 10.2; }), 'the ruby door prop is the map door');
const before = G.ents.length;
assert(R.install(G, { scale: 4, fresh: false, foe: factories, ally: { noz: function () { return { team: 'neutral', name: 'Noz' }; } } }) === true, 'a loaded floor rebinds');
assert(G.ents.length === before, 'reload does not spawn a second set');
G.lvl.tick(0.1);
assert(G.lvl._inner === 1, 'the chapter tick still runs under the campaign tick');

G.ents.forEach(function (e) { if (e.campaignRole === 'guardian') e.dead = 1; });
G.lvl.campaignSpec = l2;
const atLever = { hero: 1, x: 8.2, y: 33.6, dead: 0 };
G.ents.unshift(atLever);
let ended = 0;
global.endChapter = function () { ended++; };
global.interact = function (label, fn) { global._prompt = { label: label, fn: fn }; };
R.tick(G, 0.1);
assert(global._prompt && global._prompt.label === 'Pull the lever', 'a dead guardian lets the player pull the lever');
global._prompt.fn();
assert(G.scene === 'campaign-card' && G.campaignCard.line === 'The elevator descends.' && G.campaignCard.key === 'intro_ch2', 'the lever shows the elevator card');
assert(ended === 0 && G.campaignLevel === 2, 'the card does not enter the next level by itself');
R.finishCard(G);
assert(ended === 1 && G.campaignLevel === 2 && G.campaignCard == null, 'Descend ends the floor at camp and stays on Level 2');

const snap = GS.snapshot({ campaignLevel: 2, ch: 2, scene: 'play' });
assert(snap.campaignLevel === 2, 'a save records the current level');
const back = {};
GS.applyCampaign(back, snap);
assert(back.campaignLevel === 2, 'loading that save restores Level 2');
const old = {};
GS.applyCampaign(old, { v: 2, ch: 2, scene: 'play' });
assert(old.campaignLevel === 1, 'an old save with no level field loads as Level 1');
const blank = { campaignLevel: 4, ch: 3 };
GS.applyBlankCampaign(blank);
assert(blank.campaignLevel === 1, 'a new game blanks the level back to Level 1');

const worldG = {
  ents: [
    { hero: 1, team: 'party', col: { key: 'macar' }, hp: 12, maxhp: 12, x: 3, y: 4 },
    { team: 'foe', kind: 'goblin', name: 'Goblin', hp: 10, maxhp: 10, x: 5, y: 6, campaignKey: 'goblin', campaignXp: 13, campaignRole: 'resident', caster: 1, spellSet: 'memorized', insultsOnly: 1, rubyGp: 500 }
  ],
  props: [{ x: 8.2, y: 33.6, k: 'floorlever', campaign: 1 }],
  loot: [],
  lvl: { n: 2, w: 2, h: 1, grid: [[0, 0]], seen: [[1, 1]], wallHP: {}, flags: { campaign: 1 }, secrets: [], objs: [] }
};
const world = GS.captureWorld(worldG);
assert(world && world.ents[0].campaignXp === 13 && world.ents[0].campaignKey === 'goblin' && world.ents[0].insultsOnly === true, 'foe xp and role round-trip on the world');
assert(world.props[0].campaign === 1, 'a campaign prop keeps its mark');
const restored = {};
GS.stampEnt(restored, world.ents[0]);
assert(restored.campaignXp === 13 && restored.caster === true && restored.spellSet === 'memorized', 'stampEnt writes the campaign fields back');

assert(html.indexOf('src/campaign/CampaignBoot.js') >= 0, 'the page boots the runtime');
const boot = fs.readFileSync(path.join(__dirname, 'CampaignBoot.js'), 'utf8');
const ogreAt = boot.indexOf('src/campaign/OgreCave.js');
const l4At = boot.indexOf('src/campaign/L4.js');
assert(ogreAt >= 0 && l4At > ogreAt, 'the boot loads OgreCave before L4');
assert(html.indexOf('L2.js') < 0 && html.indexOf('maps/l2.json') < 0, 'the page does not name the L2 files');
assert(/CampaignRuntime\.install\(G,\{scale:ADD_SCALE/.test(html), 'startChapter installs a live level');
assert(/CampaignRuntime\.noteCleared\(G\)/.test(html), 'endChapter records the next level');
assert(/e\.campaignXp!=null\) return e\.campaignXp\|0/.test(html), 'kills pay the printed xp');
assert(/e\.rubyGp!=null/.test(html), 'a printed ruby amount drops that amount');
assert(/flags\.campaign\) return/.test(html), 'a campaign floor skips the procedural ruby lever');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('campaign runtime ok');

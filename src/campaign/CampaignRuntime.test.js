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
assert(l3 && l3.enter === true && l3.map.rubyDoor.x === 16.2 && l3.map.rubyDoor.y === 14.8, 'L3 loads from its map and is entered');
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
assert(R.gaps(l2).indexOf('insults') < 0 && R.gaps(l2).indexOf('goblin-hp') < 0 && R.gaps(l2).indexOf('elevator-returns-to-camp') < 0, 'ruled L2 gaps stay closed and the elevator enters Level 3');

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
assert(R.shouldInstall({ campaignLevel: 3, lvl: { n: 2 } }) === true, 'campaign Level 3 installs onto the chapter 2 shell');
assert(R.shouldInstall({ campaignLevel: 3, lvl: { n: 3 } }) === false, 'campaign Level 3 does not install onto the old ruin');
assert(R.shouldInstall({ lvl: { n: 2 } }) === false, 'a missing campaign level stays on the old chapter');

const zero = function () { return 0; };
assert(R.rollCount('1d6', zero).main === 1, 'a 1d6 wander roll uses the printed die');
assert(R.rollCount('2d4', zero).main === 2, 'a 2d4 wander roll uses the printed dice');
const mix = R.rollCount('1+1d4 goblins', zero);
assert(mix.main === 1 && mix.extraKey === 'goblin' && mix.extra === 1, 'a leader slot keeps one leader plus the printed goblin die');

function foe(name, extra) {
  return function () {
    return Object.assign({ team: 'foe', name: name, hp: 10, maxhp: 10, boss: 0, kind: name, sprite: name, sa: '+1', strMul: 2 }, extra || {});
  };
}
const factories = {
  goblin: foe('Goblin', { kind: 'goblin', sprite: 'goblin', hp: 28, maxhp: 28 }),
  rat: foe('Cave Rat', { kind: 'rat', sprite: 'rat', hp: 16, maxhp: 16, poison: 1, sa: 'Poison' }),
  goblinBoss: foe('Goblin Boss', { kind: 'goblin', sprite: 'goblin', hp: 160, maxhp: 160 }),
  goblinKing: foe('Goblin King', { kind: 'goblin', sprite: 'goblin_king', boss: 1, hp: 160, maxhp: 160, sa: '+1', strMul: 2 }),
  goblinShaman: foe('Goblin Shaman', { kind: 'goblin', shaman: 1, npc: 1, hp: 28, maxhp: 28 }),
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
assert(R.install(G, { scale: 4, fresh: true, foe: factories, ally: { noz: function () { return { team: 'neutral', name: 'Noz', tied: 1 }; } }, rollExpr: function () { return 4; }, rng: function () { return 0; } }) === true, 'install accepts the chapter shell');
assert(G.lvl.flags.campaign === 1 && G.lvl.title === 'Noz and the Goblin King', 'the shell is marked as the campaign floor');
const gob = G.ents.filter(function (e) { return e.campaignKey === 'goblin' && e.campaignRole !== 'assistants'; })[0];
assert(gob && gob.campaignXp === 13 && gob.hp === 4 && gob.hp !== 28 && gob.insultsOnly === 1 && gob.boss === 0, 'a goblin rolls 1d8-1, not the factory 28');
const lead = G.ents.filter(function (e) { return e.campaignKey === 'goblinLeader'; })[0];
assert(lead && lead.hp === 8 && lead.hp !== 28 && lead.hd === 1.25 && lead.dice === '1d8', 'a leader rolls 1d8+1 and hits as 1+1');
const asst = G.ents.filter(function (e) { return e.campaignRole === 'assistants'; })[0];
assert(asst && asst.hp === 8 && asst.hd === 1.25 && asst.dice === '1d8' && asst.name === 'Goblin assistant' && asst.campaignKey === 'goblin' && asst.campaignXp === 13, 'an assistant uses the leader sheet and keeps goblin xp');
const rat = G.ents.filter(function (e) { return e.campaignKey === 'rat'; })[0];
assert(rat && rat.hp === 4 && rat.hp !== 16 && rat.diseaseBite === 5 && !rat.poison && !rat.sa, 'a rat rolls 1d4 and keeps only the disease bite');
const body = G.ents.filter(function (e) { return e.campaignKey === 'goblinBoss'; })[0];
assert(body && body.hp === 8 && body.hp !== 160 && body.hd === 2 && body.dice === '2d4', 'a bodyguard rolls 2d8 and hits as 2 HD');
const shaman = G.ents.filter(function (e) { return e.campaignKey === 'goblinShaman' && e.spellSet === 'memorized'; })[0];
assert(shaman && shaman.caster === 1 && shaman.shaman === 0 && shaman.name !== 'Goblin Shaman' && shaman.hp === 36 && shaman.campaignXp === 83, 'the camp shaman is a caster stand-in with printed hp and xp');
const warren = G.ents.filter(function (e) { return e.campaignKey === 'goblinShaman' && e.spellSet === 'swap'; })[0];
assert(warren && warren.spellSet === 'swap', 'the warren shaman keeps the swap set from the map');
const king = G.ents.filter(function (e) { return e.campaignRole === 'boss'; })[0];
assert(king && king.campaignXp === 260 && king.boss === 0 && king.chapterBoss === 0 && king.hp === 104 && king.toHit === 1 && king.dice === '1d8+2' && king.hd === 4.25 && !king.sa && !king.strMul, 'the king has printed xp and hp, one to-hit, and wears no boss flag');
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
let started = 0;
global.startChapter = function (n) { started = n; };
R.finishCard(G);
assert(ended === 0 && started === 2 && G.campaignLevel === 3 && G.campaignCard == null, 'Descend from Level 2 enters Level 3 on the chapter 2 shell');

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
const poisonAt = boot.indexOf('src/combat/SpiderPoison.js');
const runtimeAt = boot.indexOf('src/campaign/CampaignRuntime.js');
assert(ogreAt >= 0 && l4At > ogreAt, 'the boot loads OgreCave before L4');
assert(poisonAt >= 0 && runtimeAt > poisonAt, 'the boot loads SpiderPoison before the runtime');
assert(html.indexOf('L2.js') < 0 && html.indexOf('maps/l2.json') < 0, 'the page does not name the L2 files');
assert(/CampaignRuntime\.install\(G,\{scale:ADD_SCALE/.test(html), 'startChapter installs a live level');
assert(/CampaignRuntime\.noteCleared\(G\)/.test(html), 'endChapter records the next level');
assert(/e\.campaignXp!=null\) return e\.campaignXp\|0/.test(html), 'kills pay the printed xp');
assert(/e\.rubyGp!=null/.test(html), 'a printed ruby amount drops that amount');
assert(/flags\.campaign\) return/.test(html), 'a campaign floor skips the procedural ruby lever');

const clearedChapter = { ch: 1, campaignLevel: 1, cleared: { 1: 1 } };
assert(R.campGoDeeper(clearedChapter) === 'enter' && clearedChapter.campaignLevel === 2, 'a cleared Chapter I save enters campaign Level 2');
const afterLevel2 = { ch: 2, campaignLevel: 2, cleared: { 1: 1, 2: 1 } };
assert(R.campGoDeeper(afterLevel2) === 'enter' && afterLevel2.campaignLevel === 3, 'after Level 2, Go deeper enters Level 3');
const afterLevel3 = { ch: 2, campaignLevel: 3, cleared: { 1: 1, 2: 1 } };
assert(R.campGoDeeper(afterLevel3) === 'soon' && afterLevel3.campaignLevel === 3, 'after Level 3, Go deeper stays at camp');
const oldChapterTwo = { ch: 2, campaignLevel: 1, cleared: { 1: 1, 2: 1 } };
assert(R.campGoDeeper(oldChapterTwo) === 'enter' && oldChapterTwo.campaignLevel === 2, 'an old chapter II clear still enters campaign Level 2');
const freshCamp = { ch: 1, campaignLevel: 1, cleared: {} };
assert(R.campGoDeeper(freshCamp) === 'chapter' && freshCamp.campaignLevel === 1, 'an uncleared chapter keeps the old descent');
assert(/pressGoDeeper\(/.test(html) && /More coming\./.test(html), 'camp says more coming instead of opening the next old chapter');

const ver = (html.match(/ASSET_VER='(\d+)'/) || [])[1];
assert(ver && html.indexOf('CampaignBoot.js?v=' + ver) >= 0, 'the boot script carries ASSET_VER');
assert(/function bust\(url\)/.test(boot) && /bust\(url\)/.test(boot) && /\+ 'v=' \+ ver/.test(boot), 'campaign data requests use that version');
assert(/preloadCard\(spec\)/.test(fs.readFileSync(path.join(__dirname, 'CampaignRuntime.js'), 'utf8')), 'level setup preloads the elevator card');
assert(/function campaignCardArt\(/.test(html) && /loadSpriteKeyNow\(key\)/.test(html), 'showing the card loads the jpg if it is still missing');
const loader = html.slice(html.indexOf('function loadSpriteKeyNow'), html.indexOf('let MACAR_EQUIP_ART_SIG'));
const retryAt = loader.indexOf('img.__retried');
const giveAt = loader.indexOf('SPRITE_GAVE_UP[k]=1');
assert(loader.indexOf('if(SPRITE_GAVE_UP[k])') > 0 && loader.indexOf('if(SPRITE_GAVE_UP[k])') < retryAt && giveAt > retryAt && /k==='intro_ch2'/.test(loader), 'intro_ch2 retries once, then the loader stops');
const cardArt = html.slice(html.indexOf('function campaignCardArt'), html.indexOf('function drawCampaignCard'));
assert(cardArt.indexOf('if(key && SPRITE_GAVE_UP[key]) return null;') >= 0, 'a failed intro_ch2 keeps the plain card fallback');
const cardFn = html.slice(html.indexOf('function drawCampaignCard'));
assert(cardFn.indexOf('if(!(art&&art.width)) return;') < 0, 'the card does not wait on the jpg');
assert(cardFn.indexOf("g.fillStyle='#1a140e'") >= 0 && cardFn.indexOf("g.fillStyle='#1a140e'") < cardFn.indexOf("card.title||'The elevator'"), 'a plain fallback paints before the title');
assert(cardFn.indexOf("menuBtn(g,'Descend'") > cardFn.indexOf("g.fillStyle='#1a140e'"), 'Descend is drawn when the art is missing');

const L3 = require('./L3');
require('../combat/SpiderPoison');
assert(G.poisonMode === '' || G.poisonMode == null, 'Level 2 leaves the poison mode off');
const G3 = {
  campaignLevel: 3,
  ch: 2,
  ents: [{ team: 'party', hero: 1, x: 40.15, y: 8.55, hp: 168, maxhp: 168, con: 18, lvl: 3, dead: 0 }],
  props: [{ k: 'web', x: 26.2, y: 14.6 }, { k: 'stairs', x: 40.1, y: 54.15 }, { k: 'floorRubyDoor', x: 1, y: 1 }],
  lvl: {
    n: 2, w: 144, h: 118, grid: null, secrets: [],
    flags: {},
    spawn: { x: 40.15, y: 8.55 },
    tick: function () { this._inner = (this._inner || 0) + 1; }
  }
};
const spiderFactory = foe('Cave Spider', { kind: 'spider', sprite: 'spider', hp: 36, maxhp: 36, poison: 1 });
assert(R.install(G3, { scale: 4, fresh: true, foe: { spider: spiderFactory, thinone: factories.thinone }, rollExpr: function () { return 4; } }) === true, 'Level 3 installs onto the chapter 2 shell');
assert(G3.poisonMode === 'h1', 'Level 3 uses the H1 poison mode');
assert(G3.lvl.title === 'The Webbed Deep and the Spider Queen', 'Level 3 keeps its own name on the shell');
G3.lvl.tick(0.05);
assert(!G3.lvl._inner, 'the chapter 2 tick does not run under Level 3');
const large = G3.ents.filter(function (e) { return e.campaignKey === 'spider'; })[0];
assert(large && large.campaignXp === 76 && large.hp === 36 && large.boss === 0, 'a large spider keeps factory hp and the printed xp');
const pix = G3.ents.filter(function (e) { return e.campaignKey === 'pixie'; })[0];
assert(pix && pix.team === 'neutral' && pix.npc === 1 && pix.campaignXp === 0 && L3.PIXIE.fights === false, 'the pixie does not fight');
const queen = G3.ents.filter(function (e) { return e.campaignRole === 'boss'; })[0];
assert(queen && queen.campaignXp === 1828 && queen.hp === 176 && queen.boss === 0 && queen.sprite === 'spider_giant', 'the queen has printed xp and hp and wears no boss flag');
const guard3 = G3.ents.filter(function (e) { return e.campaignRole === 'guardian'; })[0];
assert(guard3 && guard3.rubyGp === 750 && guard3.hp === 144 && guard3.sprite === 'thinone' && guard3.sleeping === 1 && guard3.name !== 'Thin One', 'the Level 3 guardian sleeps on the Thin One sheet and drops 750 gp');
let l3sum = 0;
Object.keys(L3.XP).forEach(function (key) { l3sum += R.kill(R.beginRun(l3), key); });
assert(l3sum === L3.XP.spider + L3.XP.spiderHuge + L3.XP.spiderGiant + L3.XP.phasespider + L3.XP.pixie + L3.XP.spiderQueen + L3.XP.rubyGuardian, 'one of each L3 printed xp sums without the ritual');
assert(R.gaps(l3).indexOf('ghost-poison-gap') >= 0 && R.gaps(l3).indexOf('elevator-returns-to-camp') >= 0, 'Level 3 still lists the open ghost note and returns to camp');
const bitten = { hp: 168, maxhp: 168, con: 18, lvl: 3, ghost: 0 };
const fail = R.poisonHit({ campaignKey: 'spider', campaignPoison: 1 }, bitten, { roll: 1, con: 18, level: 3 });
assert(fail && fail.saved === false && fail.damage === 84 && fail.killed === false && fail.slow && fail.slow.moveMul === 0.5 && fail.slow.seconds === 2, 'a failed H1 save takes half and slows for 2 seconds');
const capped = R.applyPoison({ campaignKey: 'spider' }, { hp: 10, con: 18, lvl: 3 }, 8, { roll: 1, con: 18, level: 3 });
assert(capped && capped.dmg === 9 && capped.poison === 1, 'poison stops at 1 HP when the bite already landed');
const lethalBite = R.applyPoison({ campaignKey: 'spider' }, { hp: 10, con: 18, lvl: 3 }, 12, { roll: 1, con: 18, level: 3 });
assert(lethalBite && lethalBite.dmg === 12 && lethalBite.poison === 0, 'a killing bite gets no extra poison');
const ghostBite = R.poisonHit({ campaignKey: 'spiderQueen' }, { hp: 40, ghost: 1, con: 18, lvl: 3 }, { roll: 1, con: 18, level: 3 });
assert(ghostBite && ghostBite.immune === true && ghostBite.damage === 0 && ghostBite.slow == null, 'a ghost is immune to H1 poison');
const lowCon = R.poisonHit({ campaignKey: 'spider' }, { hp: 40, con: 10, lvl: 3 }, { roll: 1, con: 10, level: 3 });
assert(lowCon == null, 'a CON bonus outside 14-18 skips the poison');
global.roundSec = function (n) { return (n || 1) * 1; };
let gifted = null;
global.giveMagic = function (it) { gifted = it; return it.n; };
const hero3 = G3.ents.filter(function (e) { return e.hero; })[0];
hero3.x = pix.x;
hero3.y = pix.y + 0.4;
R.tick(G3, 0.4);
assert(!gifted && !pix.vanished, 'the pixie waits out the free round');
R.tick(G3, 0.7);
assert(gifted && gifted.id === 'pixie_dust' && pix.vanished === 1, 'a round beside the web gives pixie dust and the pixie vanishes');
const beforeBrood = G3.ents.length;
queen.hp = queen.maxhp * 0.5;
R.tick(G3, 0.1);
assert(queen.broodCalled === 1 && queen.ceiling === 3, 'the queen calls the brood once and climbs for 3 seconds');
assert(G3.ents.filter(function (e) { return e.fromBrood && e.campaignKey === 'spiderHuge'; }).length >= 1, 'the brood includes huge spiders from the tunnels');
assert(G3.ents.filter(function (e) { return e.fromBrood && e.campaignKey === 'spiderGiant'; }).length === 1, 'the brood includes one giant spider');
const afterBrood = G3.ents.length;
R.tick(G3, 0.1);
assert(G3.ents.length === afterBrood && afterBrood > beforeBrood, 'the brood is called once');
const phase = G3.ents.filter(function (e) { return e.campaignKey === 'phasespider'; })[0];
assert(phase && phase.phased === 1 && phase.phaseWindowSec === 0.5, 'the phase spider opens a half-second window when the bite lands');
assert(/o\.ceiling>0 && !e\.ranged/.test(html), 'melee cannot reach a ceiling');
assert(/o\.phased && !\(o\.phaseOpen>0\)/.test(html), 'a phased spider is skipped until the window is open');
const card3 = { campaignLevel: 3, campaignCard: { key: 'mon_spider_giant' }, lvl: { n: 2, campaignSpec: l3 } };
let ended3 = 0;
let started3 = 0;
global.endChapter = function () { ended3++; };
global.startChapter = function () { started3++; };
R.finishCard(card3);
assert(ended3 === 1 && started3 === 0 && card3.campaignLevel === 3 && card3.campaignCard == null, 'Descend from Level 3 returns to camp');
assert(html.indexOf('SpiderPoison') < 0, 'the page does not name SpiderPoison');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('campaign runtime ok');

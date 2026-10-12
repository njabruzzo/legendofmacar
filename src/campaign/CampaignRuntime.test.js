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
G.lvl.tick(0);
assert(G.lvl._inner === 1 && G.lvl.objs.length === 6, 'Level 2 still runs its chapter script');
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
G.cleared = { 1: 1 };
G.unlocked = 2;
R.finishCard(G);
assert(ended === 0 && started === 2 && G.campaignLevel === 3 && G.campaignCard == null, 'Descend from Level 2 enters Level 3 on the chapter 2 shell');
assert(G.cleared[1] === 1 && G.cleared[2] === 1 && G.unlocked === 3, 'Descend from Level 2 clears 1 and 2 and unlocks 3');

const stairG = {
  campaignLevel: 2,
  ch: 2,
  cleared: { 1: 1 },
  unlocked: 2,
  ents: [{ hero: 1, x: l2.map.stairs.x, y: l2.map.stairs.y, dead: 0, hp: 20 }],
  props: [],
  lvl: { n: 2, flags: { campaign: 1, stairsOpen: 1 }, campaignSpec: l2 }
};
let stairStarted = 0;
global.startChapter = function (n) { stairStarted = n; };
global.interact = function (label, fn) { global._stairPrompt = { label: label, fn: fn }; };
R.tick(stairG, 0.1);
assert(global._stairPrompt && global._stairPrompt.label === 'Climb the stair', 'an open Level 2 stair offers the climb');
global._stairPrompt.fn();
assert(stairStarted === 2 && stairG.campaignLevel === 3 && stairG.cleared[1] === 1 && stairG.cleared[2] === 1 && stairG.unlocked === 3, 'the Level 2 stair clears 1 and 2 and unlocks 3');

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
const buffAt = boot.indexOf('src/combat/BattleBuffs.js');
const runtimeAt = boot.indexOf('src/campaign/CampaignRuntime.js');
assert(ogreAt >= 0 && l4At > ogreAt, 'the boot loads OgreCave before L4');
assert(poisonAt >= 0 && runtimeAt > poisonAt, 'the boot loads SpiderPoison before the runtime');
assert(buffAt > poisonAt && runtimeAt > buffAt, 'the boot loads BattleBuffs before the runtime');
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
const afterLevel3 = { ch: 2, campaignLevel: 3, unlocked: 4, cleared: { 1: 1, 2: 1, 3: 1 } };
assert(R.campGoDeeper(afterLevel3) === 'enter' && afterLevel3.campaignLevel === 4, 'after Level 3, Go deeper enters Level 4');
const afterLevel4 = { ch: 4, campaignLevel: 4, unlocked: 5, cleared: { 1: 1, 2: 1, 3: 1, 4: 1 } };
assert(R.campGoDeeper(afterLevel4) === 'soon' && afterLevel4.campaignLevel === 4 && afterLevel4.unlocked === 5, 'after Level 4, Go deeper stays at camp');
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
assert(loader.indexOf('if(SPRITE_GAVE_UP[k])') > 0 && loader.indexOf('if(SPRITE_GAVE_UP[k])') < retryAt && giveAt > retryAt && /k==='intro_ch2'/.test(loader) && loader.indexOf('optionalArt(k)') > giveAt - 80, 'optional art retries once, then the loader stops');
assert(loader.indexOf('WORLD_ART_KEYS') < 0, 'required level art is not marked given up');
const optSrc = html.slice(html.indexOf('function optionalArt'), html.indexOf('function loadSpriteKeyNow'));
const readySrc = html.slice(html.indexOf('function sprReady'), html.indexOf('const SPRITE_LOADING'))
  + html.slice(html.indexOf('function worldArtReady'), html.indexOf('function loadSprites'));
const bootCtx = require('vm').createContext({
  SPRITE_FILES: {
    intro_ch2: 'assets/ui/intro_ch2.jpg',
    demon_dwarfface: 'assets/props/prop_demon_dwarfface.png',
    title_splash: 'assets/ui/title_splash.jpg',
    macar: 'assets/dwarves/macar.png',
    floor_mine: 'assets/tiles/tile_floor_mine.png'
  },
  OPTIONAL_ART: {},
  SPRITE_GAVE_UP: { demon_dwarfface: 1 },
  SPR: { floor_mine: { width: 4 }, macar: { width: 8 }, wall_cave: { width: 4 } },
  WORLD_ART_KEYS: { 2: ['floor_mine', 'macar', 'wall_cave', 'demon_dwarfface'] },
  G: { ch: 2, scene: 'intro', _wantPlay: 1, taught: {} },
  hint: function () {}
});
require('vm').runInContext(optSrc + '\n' + readySrc + '\nthis.optionalArt=optionalArt; this.worldArtReady=worldArtReady;', bootCtx);
assert(bootCtx.optionalArt('intro_ch2') === true && bootCtx.optionalArt('demon_dwarfface') === true && bootCtx.optionalArt('title_splash') === true, 'cards, faces, and splashes are optional');
assert(bootCtx.optionalArt('macar') === false && bootCtx.optionalArt('floor_mine') === false && bootCtx.optionalArt('macar_w1') === false, 'Macar and level art keep retrying');
assert(bootCtx.worldArtReady(2) === true, 'a blocked optional face does not hold the level');
bootCtx.SPR.macar = { width: 0 };
assert(bootCtx.worldArtReady(2) === false, 'a missing Macar sheet still holds the level');
bootCtx.SPR.macar = { width: 8 };
const enterSrc = html.slice(html.indexOf('function tryEnterPlay'), html.indexOf('function goldTitleLine'));
require('vm').runInContext(enterSrc + '\nthis.tryEnterPlay=tryEnterPlay;', bootCtx);
assert(bootCtx.tryEnterPlay() === true && bootCtx.G.scene === 'play', 'a blocked optional image does not block boot');
const loaderSrc = html.slice(html.indexOf('function loadSpriteKeyNow'), html.indexOf('let MACAR_EQUIP_ART_SIG'));
const sprFn = html.slice(html.indexOf('function sprReady'), html.indexOf('const SPRITE_LOADING'));
const retryImages = [];
function RetryImage() { retryImages.push(this); }
Object.defineProperty(RetryImage.prototype, 'src', {
  set: function (v) { this._src = v; },
  get: function () { return this._src; }
});
const retryTimers = [];
const retryCtx = require('vm').createContext({
  Image: RetryImage,
  setTimeout: function (fn, ms) { retryTimers.push({ fn: fn, ms: ms }); return retryTimers.length; },
  SPRITE_FILES: {
    floor_mine: 'assets/tiles/tile_floor_mine.png',
    demon_dwarfface: 'assets/props/prop_demon_dwarfface.png',
    macar: 'assets/dwarves/macar.png'
  },
  SPRITE_GAVE_UP: {},
  SPRITE_RETRY: {},
  SPRITE_LOADING: {},
  SPR: {},
  OPTIONAL_ART: {},
  assetUrl: function (s) { return '/' + s; }
});
require('vm').runInContext(optSrc + '\n' + sprFn + '\n' + loaderSrc + '\nthis.loadSpriteKeyNow=loadSpriteKeyNow;', retryCtx);
retryCtx.loadSpriteKeyNow('floor_mine', function () {});
assert(retryImages.length === 1, 'a required sheet starts one request');
retryImages[0].onerror();
retryImages[0].onerror();
assert(!retryCtx.SPRITE_GAVE_UP.floor_mine && retryTimers.length === 1 && retryTimers[0].ms === 400, 'required art waits and tries again after two failures');
retryTimers[0].fn();
assert(retryImages.length === 2, 'the backoff starts another request for the required sheet');
retryImages[1].onerror();
retryImages[1].onerror();
assert(retryTimers.length === 2 && retryTimers[1].ms === 800, 'the next miss waits longer');
const beforeOptional = retryTimers.length;
retryCtx.loadSpriteKeyNow('demon_dwarfface', function () {});
const faceImg = retryImages[retryImages.length - 1];
faceImg.onerror();
faceImg.onerror();
assert(retryCtx.SPRITE_GAVE_UP.demon_dwarfface === 1 && retryTimers.length === beforeOptional, 'a blocked optional image stops instead of holding the loader');
const cardArt = html.slice(html.indexOf('function campaignCardArt'), html.indexOf('function fitCampaignTitle'));
assert(cardArt.indexOf('if(key && SPRITE_GAVE_UP[key]) return null;') >= 0, 'a failed intro_ch2 keeps the plain card fallback');
assert(cardArt.indexOf('punchCampaignCard') >= 0, 'the campaign card keys magenta out of the splash');
const cardFn = html.slice(html.indexOf('function drawCampaignCard'));
assert(cardFn.indexOf('if(!(art&&art.width)) return;') < 0, 'the card does not wait on the jpg');
assert(cardFn.indexOf("g.fillStyle='#1a140e'") >= 0 && cardFn.indexOf("g.fillStyle='#1a140e'") < cardFn.indexOf("card.title||'The elevator'"), 'a plain fallback paints before the title');
assert(cardFn.indexOf('fitCampaignTitle') > cardFn.indexOf("g.fillStyle='#1a140e'") && cardFn.indexOf('fitCampaignTitle') < cardFn.indexOf("menuBtn(g,'Descend'"), 'the title fits on the painted card and the plain card');
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
assert(R.install(G3, { scale: 4, fresh: true, foe: { spider: spiderFactory, thinone: factories.thinone }, rng: function () { return 0; }, rollExpr: function () { return 4; } }) === true, 'Level 3 installs onto the chapter 2 shell');
assert(G3.poisonMode === 'h1', 'Level 3 uses the H1 poison mode');
assert(G3.lvl.title === 'The Webbed Deep and the Spider Queen', 'Level 3 keeps its own name on the shell');
G3.lvl.tick(0.05);
assert(!G3.lvl._inner, 'the chapter 2 tick does not run under Level 3');
const large = G3.ents.filter(function (e) { return e.campaignKey === 'spider'; })[0];
assert(large && large.campaignXp === 76 && large.hp === 8 && large.hp !== 36 && large.boss === 0, 'a large spider rolls 1d8+1 instead of the factory hp');
const huge = G3.ents.filter(function (e) { return e.campaignKey === 'spiderHuge'; })[0];
const giant = G3.ents.filter(function (e) { return e.campaignKey === 'spiderGiant' && !e.fromBrood; })[0];
const phaseSpider = G3.ents.filter(function (e) { return e.campaignKey === 'phasespider'; })[0];
assert(huge && huge.hp === 16 && giant && giant.hp === 32 && phaseSpider && phaseSpider.hp === 40, 'huge, giant, and phase spiders roll 2d8+2, 4d8+4, and 5d8+5');
const pix = G3.ents.filter(function (e) { return e.campaignKey === 'pixie'; })[0];
assert(pix && pix.team === 'neutral' && pix.npc === 1 && pix.campaignXp === 0 && L3.PIXIE.fights === false && pix.scale === 0.4, 'the pixie does not fight and stands at pixie size');
const queen = G3.ents.filter(function (e) { return e.campaignRole === 'boss'; })[0];
assert(queen && queen.campaignXp === 1828 && queen.hp === 176 && queen.boss === 0 && queen.sprite === 'spider_giant', 'the queen has printed xp and hp and wears no boss flag');
const guard3 = G3.ents.filter(function (e) { return e.campaignRole === 'guardian'; })[0];
assert(guard3 && guard3.rubyGp === 750 && guard3.hp === 144 && guard3.sprite === 'thinone' && guard3.sleeping === 1 && guard3.name !== 'Thin One', 'the Level 3 guardian sleeps on the Thin One sheet and drops 750 gp');
let l3sum = 0;
Object.keys(L3.XP).forEach(function (key) { l3sum += R.kill(R.beginRun(l3), key); });
assert(l3sum === L3.XP.spider + L3.XP.spiderHuge + L3.XP.spiderGiant + L3.XP.phasespider + L3.XP.pixie + L3.XP.spiderQueen + L3.XP.rubyGuardian, 'one of each L3 printed xp sums without the ritual');
assert(R.gaps(l3).indexOf('ghost-poison-gap') < 0 && R.gaps(l3).indexOf('elevator-returns-to-camp') < 0, 'ghosts are immune, and Level 3 enters Level 4');
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
assert(lowCon && lowCon.saved === false && lowCon.target === 13 && lowCon.immune === false, 'CON 10 still rolls the poison save');
const below = R.poisonHit({ campaignKey: 'spider' }, { hp: 40, con: 3, lvl: 3 }, { roll: 20, con: 3, level: 3 });
assert(below && below.saved === true && below.target === 15, 'CON below 4 is +0 and the save is not skipped');
const liveF1 = R.poisonHit({ campaignKey: 'spider' }, { hp: 40, con: 16, lvl: 1 }, { roll: 20, con: 16 });
const liveF9 = R.poisonHit({ campaignKey: 'spider' }, { hp: 40, con: 16, lvl: 9 }, { roll: 20, con: 16 });
assert(liveF1 && liveF1.target === 12 && liveF9 && liveF9.target === 6, 'the save reads the live fighter level');
const natOne = R.poisonHit({ campaignKey: 'spider' }, { hp: 40, con: 18, lvl: 3 }, { roll: 1, con: 18, level: 3 });
assert(natOne && natOne.saved === false && natOne.target === 10, 'a natural 1 fails the live-level save');
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
assert(R.inchesToTiles('6"') === 12 && R.inchesToTiles('3"') === 6, 'one inch is two tiles');
guard3.sleeping = 0;
hero3.x = guard3.x + 12;
hero3.y = guard3.y;
hero3.webbed = 0;
let shots = [];
global.shoot = function (from, tx, ty, dmg, kind, col, spd) {
  const s = { from: from, x: from.x, y: from.y, tx: tx, ty: ty, dmg: dmg, kind: kind, col: col, spd: spd, life: 2 };
  shots.push(s);
  return s;
};
R.tick(G3, 0.05);
assert(shots.length === 1 && shots[0].kind === 'shard' && shots[0].dice === '1d6', 'the ruby shard fires at 12 tiles');
R.tick(G3, 0.05);
assert(shots.length === 1, 'the shard waits 4 seconds');
hero3.x = guard3.x + 1;
R.tick(G3, 4);
assert(shots.length === 1, 'the shard does not fire inside 2 tiles');
hero3.x = guard3.x + 13;
R.tick(G3, 0.05);
assert(shots.length === 1, 'the shard does not fire past 12 tiles');
hero3.x = queen.x + 6;
hero3.y = queen.y;
hero3.webbed = 0;
shots = [];
R.tick(G3, 0.05);
assert(shots.length === 1 && shots[0].kind === 'queenweb' && shots[0].stuckSec === 2, 'the queen web reaches 6 tiles');
global.savingThrow = function () { return false; };
const webbed = { x: queen.x, y: queen.y, hp: 40, dead: 0, webbed: 0 };
assert(R.resolveWeb(G3, webbed, shots[0]).saved === false && webbed.webbed === 2, 'a failed spell save sticks for 2 seconds');
global.savingThrow = function () { return true; };
const loose = { x: queen.x, y: queen.y, hp: 40, dead: 0, webbed: 0 };
assert(R.resolveWeb(G3, loose, shots[0]).saved === true && !(loose.webbed > 0), 'a spell save avoids the web');
G3.lvl._campaignHost.rollExpr = function (expr) { return expr === '1d6' ? 1 : 4; };
const shardTarget = { hp: 40, dead: 0 };
assert(R.resolveShard(G3, shardTarget, { dice: '1d6', from: guard3 }).dmg === 4 && shardTarget.hp === 36, 'the ruby shard is 1d6, scaled');
assert(/s\.kind==='queenweb'/.test(html) && /s\.kind==='shard'/.test(html), 'the page resolves the queen web and the ruby shard');
const face3 = G3.props.filter(function (p) { return p && p.itemId === 'grond_tooth_electrum_3'; })[0];
assert(face3 && face3.k === 'demonface' && face3.x === 10.1 && face3.y === 26.8 && !face3.emptySocket, 'Electrum Tooth 3 is in the demon face');
let stowedTooth = null;
let convertedCoins = 0;
global.stowPackItem = function (it) { stowedTooth = it; G3.packs = { macar: { magic: [it] } }; };
global.convertCoinsToElectrum = function () { convertedCoins++; };
const pry3 = R.pryTooth(G3, face3);
assert(pry3.ok === 1 && stowedTooth.id === 'grond_tooth_electrum_3' && stowedTooth.n === 'Electrum Tooth 3' && stowedTooth.grondTooth === 'electrum' && stowedTooth.curse === 'coin' && stowedTooth.bind === false && !stowedTooth.cursed, 'tooth 3 is a coin curse with no bind');
assert(G3.lvl.flags.electrumTooth3 === 1 && !G3.lvl.flags.electrumTooth2 && !G3.lvl.flags.electrumTooth && face3.emptySocket === 1 && convertedCoins === 1, 'the pry sets electrumTooth3 and converts coins');
assert(L10.RITUAL.toothIds.indexOf('grond_tooth_electrum_3') >= 0 && l3.map.tooth.countsForRitual === true, 'tooth 3 is on the ritual list');
assert(!R.pryTooth(G3, face3).ok && convertedCoins === 1, 'the face does not give up a second tooth');
const play3 = JSON.parse(JSON.stringify(GS.captureWorld(G3)));
const packs3 = JSON.parse(JSON.stringify(G3.packs));
const restored3 = {
  ents: [{ hero: 1, team: 'party', hp: 10, maxhp: 10, col: { key: 'macar' } }],
  props: [],
  packs: packs3,
  lvl: { w: G3.lvl.w, h: G3.lvl.h, flags: {}, objs: [] }
};
restored3.lvl.flags = Object.assign({}, play3.flags || {});
GS.applyWorld(restored3, play3);
const back3 = restored3.props.filter(function (p) { return p && p.itemId === 'grond_tooth_electrum_3'; })[0];
assert(restored3.lvl.flags.electrumTooth3 === 1 && back3 && back3.emptySocket === 1 && restored3.packs.macar.magic[0].n === 'Electrum Tooth 3' && restored3.packs.macar.magic[0].grondTooth === 'electrum', 'tooth 3 round-trips in the save');
assert(/toothFace\.itemId==='grond_tooth_electrum_2'\|\|toothFace\.itemId==='grond_tooth_electrum_3'/.test(html), 'the page offers the Level 3 tooth');
const card3 = { ch: 2, campaignLevel: 3, unlocked: 3, cleared: { 1: 1, 2: 1 }, campaignCard: { key: 'mon_spider_giant' }, lvl: { n: 2, campaignSpec: l3 } };
let ended3 = 0;
let started3 = 0;
global.endChapter = function () { ended3++; };
global.startChapter = function (n) { started3 = n; };
R.finishCard(card3);
assert(ended3 === 0 && started3 === 4 && card3.campaignLevel === 4 && card3.campaignCard == null, 'Descend from Level 3 enters Level 4 on the chapter 4 shell');
assert(card3.cleared[1] === 1 && card3.cleared[2] === 1 && card3.cleared[3] === 1 && card3.unlocked === 4, 'Descend from Level 3 clears 1, 2, and 3 and unlocks 4');
assert(html.indexOf('SpiderPoison') < 0, 'the page does not name SpiderPoison');

const L4 = require('./L4');
require('../combat/BattleBuffs');
const G4 = {
  campaignLevel: 4,
  ch: 4,
  t: 0,
  ents: [{ team: 'party', hero: 1, x: 1, y: 1, hp: 40, maxhp: 40, ac: 4, dead: 0, col: { key: 'macar' } }],
  props: [{ k: 'floorRubyDoor', x: 1, y: 1 }, { k: 'floorlever', x: 2, y: 2 }, { k: 'trap', trap: 'trap_spikes', x: 28, y: 28 }, { k: 'trap', trap: 'trap_runes', x: 46, y: 16 }],
  cam: { x: 0, y: 0 },
  lvl: {
    n: 4, w: 132, h: 106, grid: null, secrets: [],
    flags: {},
    spawn: { x: 20, y: 20 },
    objs: [{ t: 'Destroy the Elder Brain', d: 0 }],
    tick: function () { G4.lvl._shell = 1; }
  }
};
const orcFactory = foe('Orc', { kind: 'orc', sprite: 'orc', scale: 1.05, hp: 42, maxhp: 42 });
assert(R.install(G4, { scale: 4, fresh: true, foe: { orc: orcFactory, statue: factories.thinone, construct: foe('Construct', { kind: 'construct', sprite: 'construct', scale: 1.35 }) }, rng: function () { return 0; } }) === true, 'Level 4 installs onto the chapter 4 shell');
G4.lvl.tick(0.1);
assert(!G4.lvl._shell && !G4.props.some(function (p) { return p && p.k === 'trap'; }) && G4.lvl.objs.length === 0, 'Level 4 leaves the dead-city script, traps, and objectives behind');
assert(G4.lvl.title === 'Orc Hold and the Ogre Cave' && G4.poisonMode === '', 'Level 4 keeps its name and does not turn poison on');
const hero4 = G4.ents.filter(function (e) { return e.hero; })[0];
assert(hero4.x === 8 && hero4.y === 28, 'Macar arrives at the Level 4 spawn');
const orcs = G4.ents.filter(function (e) { return e.campaignKey === 'orc'; });
const shaman4 = G4.ents.filter(function (e) { return e.campaignKey === 'orcShaman'; })[0];
assert(orcs.length === 8 && orcs[0].sprite === 'orc' && orcs[0].scale === 1.05 && orcs[0].hp === 20 && orcs[0].campaignXp === 15, 'eight orcs use the orc sheet at Macar size and 5 hit points');
assert(shaman4 && shaman4.sprite === 'orc' && shaman4.scale === 1.05 && shaman4.hp === 128 && shaman4.ac === 5 && shaman4.campaignXp === 656 && shaman4.caster === 1 && isFinite(shaman4.scale), 'the shaman stands in on the orc sheet, sized to Macar');
const chief = G4.ents.filter(function (e) { return e.campaignRole === 'boss'; })[0];
assert(chief && chief.campaignKey === 'orcChief' && chief.hp === 132 && chief.ac === 3 && chief.campaignXp === 255 && chief.boss === 0 && chief.dice === '1d8+3', 'the chief has printed hit points and wears no boss flag');
const guard4 = G4.ents.filter(function (e) { return e.campaignRole === 'guardian'; })[0];
assert(guard4 && guard4.hp === 192 && guard4.rubyGp === 1000 && guard4.sleeping === 1 && guard4.sprite === 'construct' && guard4.boss === 0, 'Guardian IV sleeps on the construct sheet and drops 1000 gp');
const face4 = G4.props.filter(function (p) { return p && p.itemId === 'grond_tooth_electrum_4'; })[0];
assert(face4 && face4.k === 'demonface' && face4.x === 46 && face4.y === 14 && !face4.emptySocket, 'Electrum Tooth 4 is in the demon face at its data point');
const seals = G4.props.filter(function (p) { return p && p.campaign === 'ogre-seal' && !p.gone; });
const eggProps = G4.props.filter(function (p) { return p && p.campaign === 'golden-egg'; });
const ogress = G4.ents.filter(function (e) { return e.campaignKey === 'ogress'; })[0];
assert(seals.length === 3 && seals[0].seconds === 10 && eggProps.length === 3, 'three boulders seal the cave, and the eggs are inside');
assert(ogress && ogress.team === 'neutral' && ogress.scale === 1 && isFinite(ogress.scale) && ogress.sprite === '' && ogress.artStandIn && ogress.campaignXp == null && !ogress.fleeTo, 'the ogress is a drawn stand-in at Macar size and does not fight');
hero4.x = seals[0].x;
hero4.y = seals[0].y;
global.interact = function (label, fn) { global._ogrePrompt = { label: label, fn: fn }; };
global.say = function () {};
global.hint = function () {};
R.tick(G4, 0.1);
assert(global._ogrePrompt && global._ogrePrompt.label === 'Clear the boulder', 'a sealed boulder offers the clear');
global._ogrePrompt.fn();
R.tick(G4, 10);
assert(seals.filter(function (s) { return !s.gone; }).length === 2 && !ogress.fleeTo, 'one boulder takes ten seconds, and she stays while two remain');
hero4.x = seals[1].x; hero4.y = seals[1].y;
R.tick(G4, 0.1);
global._ogrePrompt.fn();
R.tick(G4, 10);
hero4.x = seals[2].x; hero4.y = seals[2].y;
R.tick(G4, 0.1);
global._ogrePrompt.fn();
R.tick(G4, 10);
assert(ogress._fleeing === 1 && ogress.glanceBack === 0.9 && ogress.fleeTo && ogress.team === 'neutral', 'clearing the boulders sends her out, and she glances back');
let rescueXp = 0;
global.awardPartyXp = function (n) { rescueXp += n; };
ogress.x = ogress.fleeTo.x;
ogress.y = ogress.fleeTo.y;
ogress.fleePath = [];
ogress.fleeTo = null;
ogress.onArrive();
assert(ogress.vanished === 1 && ogress.dead === 1 && rescueXp === 185 && G4.lvl.flags.ogressXp === 1, 'she is gone at the exit and the rescue is 185 XP');
hero4.x = eggProps[0].x; hero4.y = eggProps[0].y;
R.tick(G4, 0.1);
assert(global._ogrePrompt && global._ogrePrompt.label === 'Take the golden egg', 'the eggs can be taken once the cave is open');
let stowedEgg = null;
global.stowPackItem = function (it) { stowedEgg = it; G4.packs = { macar: { magic: [it, { id: 'golden_egg', k: 'egg', n: 'Golden Egg' }] } }; };
global._ogrePrompt.fn();
assert(eggProps[0].gone === 1 && stowedEgg && stowedEgg.k === 'egg' && stowedEgg.id === 'golden_egg', 'a golden egg goes into the pack');
const bag = G4.packs.macar.magic;
const armed = R.armEgg(G4, bag[0], bag);
assert(armed.ok && bag.length === 1 && hero4.eggAc === -4, 'using the egg is already 4 AC better for the next battle');
const blockedEgg = R.armEgg(G4, bag[0], bag);
assert(!blockedEgg.ok && blockedEgg.reason === 'egg-blocked' && bag.length === 1, 'a second egg waits while one is armed');
R.noteFight(G4);
assert(hero4.eggAc === -4, 'the battle turns the egg into +4 AC');
R.noteFightEnd(G4);
assert(hero4.eggAc === 0 && G4._battleBuffs.battleBuffs.length === 0, 'the egg ends when the battle ends');
let stowed4 = null;
global.stowPackItem = function (it) { stowed4 = it; };
const pry4 = R.pryTooth(G4, face4);
assert(pry4.ok === 1 && stowed4.id === 'grond_tooth_electrum_4' && stowed4.n === 'Electrum Tooth 4' && stowed4.curse === 'coin' && stowed4.bind === false && !stowed4.cursed && stowed4.grondTooth === 'electrum', 'tooth 4 is a coin curse with no bind');
assert(G4.lvl.flags.electrumTooth4 === 1 && face4.emptySocket === 1, 'the pry sets electrumTooth4');
assert(/toothFace\.itemId==='grond_tooth_electrum_4'/.test(html), 'the page offers the Level 4 tooth');
guard4.dead = 1;
hero4.x = 45.5; hero4.y = 41.2;
global.interact = function (label, fn) { global._l4Prompt = { label: label, fn: fn }; };
R.tick(G4, 0.1);
assert(global._l4Prompt && global._l4Prompt.label === 'Pull the lever', 'a dead guardian lets the player pull the Level 4 lever');
global._l4Prompt.fn();
assert(G4.scene === 'campaign-card' && G4.campaignCard.key === 'mon_orc' && G4.campaignCard.title === 'Orc Hold and the Ogre Cave', 'the lever shows the orc elevator card');
let ended4 = 0;
let started4 = 0;
global.endChapter = function () { ended4++; };
global.startChapter = function () { started4++; };
G4.cleared = { 1: 1, 2: 1, 3: 1 };
G4.unlocked = 4;
R.finishCard(G4);
assert(ended4 === 1 && started4 === 0 && G4.campaignLevel === 4 && G4.cleared[4] === 1 && G4.unlocked === 5, 'the Level 4 elevator clears 1 through 4, unlocks 5, and returns to camp');
assert(R.campGoDeeper(G4) === 'soon' && G4.campaignLevel === 4, 'Go deeper after Level 4 says more coming');
G4.scene = 'play';
G4.lvl.flags.stairsOpen = 0;
G4.lvl.flags.bossDead = 0;
chief.dead = 0;
R.tick(G4, 0.05);
assert(G4.lvl.flags.stairsOpen === 0, 'the stair stays shut while the chief lives');
chief.dead = 1;
hero4.x = 48.1; hero4.y = 61.4;
R.tick(G4, 0.1);
assert(G4.lvl.flags.stairsOpen === 1 && global._l4Prompt && global._l4Prompt.label === 'Climb the stair', 'the chief kill opens the stair');
G4.cleared = { 1: 1, 2: 1, 3: 1 };
G4.unlocked = 4;
G4.campaignLevel = 4;
ended4 = 0;
global._l4Prompt.fn();
assert(ended4 === 1 && G4.cleared[1] === 1 && G4.cleared[2] === 1 && G4.cleared[3] === 1 && G4.cleared[4] === 1 && G4.unlocked === 5 && G4.campaignLevel === 4, 'the Level 4 stair records 1 through 4 and unlocks 5');
assert(R.gaps(R.load(4)).indexOf('elevator-returns-to-camp') >= 0, 'Level 5 is unwired, so the elevator still returns to camp');
assert(L4.wired === false, 'the L4 data module stays unwired');

const ch4Art = html.match(/4:\[[\s\S]*?\],\s*\n\s*5:/);
assert(ch4Art && /'orc'/.test(ch4Art[0]) && /'warg'/.test(ch4Art[0]) && /'construct'/.test(ch4Art[0]), 'Level 4 preloads the orc, warg, and construct sheets');
assert(/ASSET_VER='132'/.test(html), 'asset version stays 132');
assert(/if\(e && e\.artStandIn && !\(e\.sprite && SPRITE_FILES\[e\.sprite\]\)\) return ''/.test(html), 'a stand-in with no file is drawn');
assert(!/ogress:'assets/.test(html) && !/ogress:"assets/.test(html), 'the page does not register an ogress sheet');

const guards4 = G4.ents.filter(function (e) { return e.campaignKey === 'orcGuard'; });
const leaders4 = G4.ents.filter(function (e) { return e.campaignKey === 'orcLeader'; });
const wargs4 = G4.ents.filter(function (e) { return e.campaignKey === 'warg'; });
const wolves4 = G4.ents.filter(function (e) { return e.campaignKey === 'wolf'; });
assert(guards4.length === 6 && guards4.every(function (e) { return e.sprite === 'orc' && e.hd === 3 && e.ac === 4 && e.hp === 60 && isFinite(e.scale); }), 'guards use the orc sheet, AC 4, attack as 3 HD, and 15 hp');
assert(chief.hd === 5 && chief.ac === 3 && chief.hp === 132 && chief.sprite === 'orc', 'the chief attacks as 5 HD at AC 3');
assert(shaman4.hd === 7 && shaman4.ac === 5 && shaman4.sprite === 'orc', 'the shaman attacks as 7 HD at AC 5');
assert(guard4.hd === 8 && guard4.ac === 3 && guard4.hp === 192, 'the guardian attacks as 8 HD at AC 3');
assert(leaders4.length >= 1 && leaders4.every(function (e) { return e.sprite === 'orc' && e.ac === 6 && isFinite(e.scale); }), 'leaders bind the orc sheet');
assert(wargs4.length === 9 && wolves4.length === 2 && L4.FORECAST_PACK.worgs === 4, 'the floor places nine worgs and two wolves; the forecast column is four worgs');
assert(wolves4.every(function (e) { return e.hd === 2 && e.ac === 7 && e.hp !== 144 && e.hp1e !== 36; }) && wargs4.every(function (e) { return e.hd === 3 && e.ac === 6 && e.hp !== 144; }), 'wolves roll 2+2 HD and worgs roll 3+3 HD, not the warg factory');
assert(wolves4[0].hp1e === 4 && 2 * ((8 + 1) / 2) + 2 === 11, 'a minimum 2d8+2 wolf is 4, and the dice average 11');

const vm = require('vm');
function extractFn(name) {
  const re = new RegExp('function ' + name + '\\([\\s\\S]*?\\n\\}');
  const m = html.match(re);
  if (!m) throw new Error('missing ' + name);
  return m[0];
}
const acCtx = { clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; }, isRearAttack: function () { return false; }, partyAC: function () { return 6; } };
vm.createContext(acCtx);
vm.runInContext(extractFn('effectiveAC'), acCtx);
assert(acCtx.effectiveAC(guards4[0]) === 4 && acCtx.effectiveAC(chief) === 3 && acCtx.effectiveAC(guard4) === 3 && acCtx.effectiveAC(shaman4) === 5, 'effective AC is the printed armor class');
assert(acCtx.effectiveAC({ team: 'party', hero: 1, eggAc: -4, stun: 0, prone: 0, held: 0 }) === 2, 'an armed egg makes AC 6 into AC 2 for that battle');

const eggPack = [];
const oneEgg = { id: 'golden_egg', k: 'egg', n: 'Golden Egg' };
assert(R.stackMagic(eggPack, oneEgg) && R.stackMagic(eggPack, { id: 'golden_egg', k: 'egg', n: 'Golden Egg' }) && R.stackMagic(eggPack, { id: 'golden_egg', k: 'egg', n: 'Golden Egg' }) && eggPack.length === 1 && eggPack[0].qty === 3, 'three golden eggs stack as one item');
const eggHero = { team: 'party', hero: 1, dead: 0, hp: 40, maxhp: 40 };
const eggG = { t: 0, ents: [eggHero], lvl: G4.lvl };
const stackedArm = R.armEgg(eggG, eggPack[0], eggPack);
assert(stackedArm.ok && eggPack[0].qty === 2 && eggHero.eggAc === -4, 'arming one egg from a stack of three leaves two and applies the AC');
const stackedBlock = R.armEgg(eggG, eggPack[0], eggPack);
assert(!stackedBlock.ok && stackedBlock.reason === 'egg-blocked' && eggPack[0].qty === 2, 'a second egg does not leave the stack while one is pending');
R.noteFight(eggG);
assert(eggHero.eggAc === -4, 'the battle keeps the egg AC');
R.noteFightEnd(eggG);
assert(eggHero.eggAc === 0 && eggG._battleBuffs.battleBuffs.length === 0, 'the egg AC clears when the battle ends');

let peltN = 0;
global.stowPackItem = function (it) { if (it && it.id === 'worg_pelt') peltN++; };
R.onDown(G4, { campaignKey: 'warg', campaignRole: 'resident' });
R.onDown(G4, { campaignKey: 'wolf', campaignRole: 'resident' });
assert(peltN === 2, 'each worg and wolf kill drops one worg pelt');

const caches4 = (G4.loot || []).filter(function (z) { return z && String(z.label || '').indexOf('Dungeon cache') === 0 && !z.gone; });
function cacheAt(x, y) {
  return caches4.some(function (z) { return z.x === x && z.y === y; });
}
assert(caches4.length === 16 && cacheAt(26, 28) && cacheAt(46, 20) && cacheAt(48, 42), 'sixteen caches sit on the printed places');
const chest4 = G4.props.filter(function (p) { return p && p.campaign === 'lair-chest'; })[0];
assert(chest4 && chest4.x === 48.4 && chest4.y === 22.2, 'the lair chest is at the chief chest point');
G4.lvl._campaignHost.d100 = function () { return 1; };
G4.lvl._campaignHost.rng = function () { return 0; };
const hoard4 = R.openLairChest(G4, chest4);
assert(hoard4 && hoard4.coins.cp === 2000 && hoard4.coins.sp === 2000 && hoard4.gems === 11 && hoard4.potions === 1 && chest4.gone === 1, 'the lair chest rolls the printed C, O, Qx10, and S dice');

G4.packs = { macar: { magic: [{ id: 'golden_egg', k: 'egg', n: 'Golden Egg', qty: 2 }] } };
G4.coin = { gp: 0 };
let soldXp = 0;
global.awardPartyXp = function (n) { soldXp += n; };
global.addCoin = function (k, n) { G4.coin[k] = (G4.coin[k] || 0) + n; };
assert(R.eggPrice(G4) === 50, 'Noz buys a golden egg for the printed 50 gp');
const sold = R.sellEgg(G4);
assert(sold.ok && sold.gp === 50 && G4.packs.macar.magic[0].qty === 1 && G4.coin.gp === 50 && soldXp === 50, 'selling an egg pays 50 gp and awards that treasure xp');
assert(/Sell a golden egg/.test(html) && /CampaignRuntime\.sellEgg/.test(html) && /CampaignRuntime\.eggPrice/.test(html), 'the Noz trade screen offers the egg sale');

(function nozBuysEggsOnL2() {
  const tradeG = G;
  tradeG.packs = { macar: { magic: [{ id: 'golden_egg', k: 'egg', n: 'Golden Egg', qty: 2 }] } };
  tradeG.coin = { gp: 3 };
  let xp = 0;
  global.addCoin = function (k, n) { tradeG.coin[k] = (tradeG.coin[k] || 0) + n; };
  global.awardPartyXp = function (n) { xp += n; };
  assert(tradeG.lvl.n === 2 && !(tradeG.lvl.campaignSpec.data && tradeG.lvl.campaignSpec.data.EGGS), 'Noz stands on Level 2, which has no egg table');
  assert(R.eggPrice(tradeG) === 50, 'the trade price is Level 4 egg sellGp even on Level 2');
  const tradeCtx = {
    menuHits: [],
    UIS: 1,
    VW: 800,
    VH: 600,
    PORT: false,
    G: tradeG,
    CampaignRuntime: R,
    g: { fillStyle: '', font: '', textAlign: 'left', fillRect: function () {}, fillText: function () {} },
    giveGnomeThanks: function () {},
    embers: function () {},
    darken: function () {},
    plate: function () {},
    wareCostGp: function () { return 0; },
    gpTotal: function () { return 100; },
    say: function () {},
    spendGp: function () {},
    addToPack: function () {}
  };
  vm.createContext(tradeCtx);
  vm.runInContext(
    'function menuBtn(g,label,cx,cy,w,h,fn){ menuHits.push({label:label, fn:fn}); }\n' +
    extractFn('warePriceText') + '\n' + extractFn('gnomeWares') + '\n' + extractFn('drawTrade') + '\n drawTrade(g);',
    tradeCtx
  );
  const btn = tradeCtx.menuHits.filter(function (h) { return h.label === 'Sell a golden egg (50 gp)'; })[0];
  assert(btn && typeof btn.fn === 'function', 'Noz offers to buy an egg that is in the pack');
  btn.fn();
  assert(tradeG.packs.macar.magic[0].qty === 1 && tradeG.coin.gp === 53 && xp === 50, 'the Level 2 sale pays 50 gp and awards that treasure xp');
  tradeG.packs.macar.magic = [];
  vm.runInContext('drawTrade(g);', tradeCtx);
  assert(!tradeCtx.menuHits.some(function (h) { return /Sell a golden egg/.test(h.label); }), 'Noz does not offer an egg when the pack has none');
})();

function bootL4(extra) {
  const g = {
    campaignLevel: 4,
    ch: 4,
    t: 0,
    ents: [{ team: 'party', hero: 1, x: 12, y: 34, hp: 40, maxhp: 40, dead: 0, col: { key: 'macar' }, name: 'Macar' }],
    props: [{ k: 'trap', x: 28, y: 28 }, { k: 'slime', x: 17, y: 29 }, { k: 'boulder', campaign: 'ogre-seal', x: 1, y: 1 }, { k: 'boulder', campaign: 'ogre-seal', x: 2, y: 2 }, { k: 'boulder', campaign: 'ogre-seal', x: 3, y: 3 }],
    loot: [],
    cam: { x: 0, y: 0 },
    lvl: {
      n: 4, w: 132, h: 106, grid: null, secrets: [],
      flags: {},
      objs: [{ t: 'Destroy the Elder Brain', d: 0 }, { t: 'Clear the drowned streets', d: 0 }],
      tick: function () { g.lvl._shell = 1; }
    }
  };
  if (extra && extra.kin) g.ents.push({ team: 'party', x: 44.2, y: 18.4, hp: 20, maxhp: 20, dead: 0, name: 'Kin' });
  const opts = { scale: 4, fresh: true, foe: { orc: orcFactory, statue: factories.thinone, construct: foe('Construct', { kind: 'construct', sprite: 'construct', scale: 1.35 }) }, rng: function () { return 0; }, rollExpr: function () { return 7; } };
  assert(R.install(g, opts) === true, 'a Level 4 boot installs');
  return g;
}

(function chiefRoar() {
  const g = bootL4({ kin: 1 });
  const hero = g.ents.filter(function (e) { return e.hero; })[0];
  const boss = g.ents.filter(function (e) { return e.campaignRole === 'boss'; })[0];
  const shaman = g.ents.filter(function (e) { return e.campaignKey === 'orcShaman'; })[0];
  const kin = g.ents.filter(function (e) { return e.name === 'Kin'; })[0];
  hero.x = boss.x;
  hero.y = boss.y;
  if (kin) { kin.x = shaman.x; kin.y = shaman.y; }
  g.lvl._campaignHost.save = function (who, kind) { g._save = kind; return false; };
  global.say = function () {};
  global.interact = function () {};
  R.tick(g, 1.1);
  const blessed = g.ents.filter(function (e) { return e.campaignKey === 'orcGuard' && e.blessHit === 1; });
  assert(boss.roared === 1 && blessed.length >= 1 && String(shaman.spellsSpent || '').indexOf('Bless') >= 0, 'the chief roars and the shaman blesses the orcs');
  let guard = 0;
  while (guard < 8 && String(shaman.spellsSpent || '').indexOf('Hold Person') < 0) {
    R.tick(g, 1.1);
    guard++;
  }
  assert(String(shaman.spellsSpent || '').indexOf('Hold Person') >= 0 && g._save === 'spell', 'the shaman spends Hold Person and calls a save vs spell');
  assert(hero.held > 0 && hero.holdSrc === 'campaign', 'a failed Hold Person save holds Macar');
  guard = 0;
  while (guard < 8 && String(shaman.spellsSpent || '').indexOf("Silence 15' r.") < 0) {
    R.tick(g, 1.1);
    guard++;
  }
  assert(String(shaman.spellsSpent || '').indexOf("Silence 15' r.") >= 0, 'the shaman then spends Silence on a kin');
  assert(hero.silenced > 0 && hero.silenceSrc === 'campaign', 'a failed Silence save silences Macar');
})();

(function holdAndSilence() {
  const runtimeSrc = fs.readFileSync(path.join(__dirname, 'CampaignRuntime.js'), 'utf8');
  assert(/PLACEHOLDER pending Sage §7\.15[\s\S]{0,80}holdPersonSec: 6[\s\S]{0,40}silenceSec: 8/.test(runtimeSrc), 'Hold 6 s and Silence 8 s share one placeholder block');
  assert(R.PLACEHOLDER.holdPersonSec === 6 && R.PLACEHOLDER.silenceSec === 8, 'the placeholder durations are 6 s and 8 s');
  const g = bootL4({ kin: 1 });
  const hero = g.ents.filter(function (e) { return e.hero; })[0];
  const boss = g.ents.filter(function (e) { return e.campaignRole === 'boss'; })[0];
  const shaman = g.ents.filter(function (e) { return e.campaignKey === 'orcShaman'; })[0];
  const kin = g.ents.filter(function (e) { return e.name === 'Kin'; })[0];
  hero.x = boss.x;
  hero.y = boss.y;
  if (kin) { kin.x = shaman.x; kin.y = shaman.y; }
  g.lvl._campaignHost.save = function (who, kind) {
    g._save = kind;
    g._saveHero = !!(who && who.hero);
    return false;
  };
  global.say = function () {};
  global.interact = function () {};
  global.hint = function () {};
  let steps = 0;
  while (steps < 160 && !(hero.held > 0)) { R.tick(g, 0.05); steps++; }
  assert(steps < 160 && hero.holdSrc === 'campaign' && g._save === 'spell' && g._saveHero, 'Hold Person fails Macar\'s save vs spell');
  assert(hero.held <= 6 && hero.held > 6 - 0.051, 'the hold clock starts at 6 seconds');
  const gate = { hint: function () {}, say: function () {} };
  vm.createContext(gate);
  vm.runInContext(extractFn('stunnedHold') + '\n' + extractFn('refuseAttack'), gate);
  const mover = { held: hero.held, stun: 0, dest: { x: 4, y: 4 }, moving: 1, ix: 1, iy: 1, atk: 1, aim: boss };
  assert(gate.stunnedHold(mover) === true && mover.moving === 0 && mover.dest === null && mover.atk === 0 && mover.aim === null, 'Hold Person stops Macar from moving');
  assert(gate.refuseAttack({ held: hero.held, defending: 0 }) === true, 'Hold Person stops Macar from attacking');
  const auto = html.slice(html.indexOf('// auto-attack while standing'), html.indexOf('G.cam.x=lerp'));
  assert(/!\(\(p\.held\|\|0\)>0\)/.test(auto), 'a held Macar does not start a standing attack');
  const atkCtx = {
    G: { fightOn: 1, lvl: g.lvl, equipped: null },
    beginFight: function () {},
    effectiveAC: function () { return 10; },
    thacNeed: function () { return 20; },
    isRearAttack: function () { return false; },
    specialtyBand: function () { return null; },
    d20: function () { return 1; },
    hitBonus: function () { return 0; },
    dist: function () { return 1; },
    say: function () {},
    ftext: function () {},
    hitChancePct: function () { return 5; },
    rollExpr: function () { return 4; },
    strMods: function () { return { dmg: 0, hit: 0 }; },
    entityAbil: function () { return {}; },
    meleeStrAbil: function () { return {}; },
    ADD_SCALE: 4,
    wepMult: function () { return 1; },
    rnd: function () { return 1; }
  };
  vm.createContext(atkCtx);
  vm.runInContext(extractFn('addAttack'), atkCtx);
  const chiefAtk = { name: 'Chief', campaignRole: 'boss', team: 'foe', dice: '1d8+3', dmg: 8, x: 0, y: 0 };
  const heldMac = { name: 'Macar', team: 'party', held: hero.held, stun: 0, prone: 0, x: 1, y: 0 };
  const freeMac = { name: 'Macar', team: 'party', held: 0, stun: 0, prone: 0, x: 1, y: 0 };
  assert(atkCtx.addAttack(chiefAtk, freeMac) === 0, 'the chief still misses a save-or-miss when Macar is free');
  assert(atkCtx.addAttack(chiefAtk, heldMac) > 0, 'the chief helpless-hits path lands while Macar is held');
  assert(atkCtx.addAttack({ name: 'Orc', campaignRole: 'resident', team: 'foe', dice: '1d6', dmg: 6, x: 0, y: 0 }, heldMac) === 0, 'a held Macar is not an automatic hit for every orc');
  const left = hero.held;
  R.tick(g, left);
  assert(!(hero.held > 0) && !hero.holdSrc, 'Hold Person expires');
  const walked = { held: 0, stun: 0, dest: { x: 2, y: 2 }, moving: 1, ix: 1, iy: 0 };
  assert(gate.stunnedHold(walked) === false && walked.dest && walked.dest.x === 2, 'Macar can move again after Hold Person expires');
  assert(gate.refuseAttack({ held: 0, defending: 0 }) === false, 'Macar can attack again after Hold Person expires');
  steps = 0;
  while (steps < 200 && !(hero.silenced > 0)) { R.tick(g, 0.05); steps++; }
  assert(steps < 200 && hero.silenceSrc === 'campaign' && g._saveHero, 'Silence fails Macar\'s save vs spell');
  assert(hero.silenced <= 8 && hero.silenced > 8 - 0.051, 'the silence clock starts at 8 seconds');
  const cast = {
    said: 0,
    healed: 0,
    crownChecks: 0,
    G: { equipped: {}, animateDeadSpent: 0, ents: [], thrallId: null },
    say: function () { cast.said++; },
    applyHeal: function () { cast.healed++; },
    clearPoison: function () {},
    nearestFoe: function () { return null; },
    damage: function () {},
    rollDice: function () { return 6; },
    ADD_SCALE: 4,
    burst: function () {},
    wearingBoneCrown: function () { cast.crownChecks++; return false; },
    hint: function () {}
  };
  vm.createContext(cast);
  vm.runInContext(extractFn('useScrollByName') + '\n' + extractFn('tryAnimateDead'), cast);
  const shut = cast.useScrollByName({ n: 'Scroll of 1 Spell', k: 'scroll', d: 'heal' }, { silenced: hero.silenced });
  const muted = cast.tryAnimateDead({ hero: 1, silenced: hero.silenced }, { id: 3, dead: 1, corpse: 1, hp: 0, maxhp: 8 });
  assert(shut === 'silenced' && cast.healed === 0, 'Silence blocks scroll use');
  assert(muted && muted.reason === 'silenced' && cast.crownChecks === 0 && cast.G.animateDeadSpent === 0, 'Silence blocks spellcasting');
  assert(/spent!=='silenced'/.test(html), 'a silenced scroll stays in the pack');
  R.tick(g, hero.silenced);
  assert(!(hero.silenced > 0) && !hero.silenceSrc, 'Silence expires');
  const read = cast.useScrollByName({ n: 'Heal', k: 'scroll', d: 'cure' }, { silenced: 0 });
  const again = cast.tryAnimateDead({ hero: 1, silenced: 0 }, { id: 4, dead: 1, corpse: 1, hp: 0, maxhp: 8 });
  assert(read === 'cure' && cast.healed === 1, 'a scroll works after Silence expires');
  assert(again && again.reason === 'no-crown' && cast.crownChecks === 1, 'spellcasting works after Silence expires');

  const saved = bootL4({ kin: 1 });
  const savedHero = saved.ents.filter(function (e) { return e.hero; })[0];
  const savedBoss = saved.ents.filter(function (e) { return e.campaignRole === 'boss'; })[0];
  const savedShaman = saved.ents.filter(function (e) { return e.campaignKey === 'orcShaman'; })[0];
  const savedKin = saved.ents.filter(function (e) { return e.name === 'Kin'; })[0];
  savedHero.x = savedBoss.x;
  savedHero.y = savedBoss.y;
  if (savedKin) { savedKin.x = savedShaman.x; savedKin.y = savedShaman.y; }
  saved.lvl._campaignHost.save = function () { return true; };
  steps = 0;
  while (steps < 12 && String(savedShaman.spellsSpent || '').indexOf("Silence 15' r.") < 0) {
    R.tick(saved, 1.1);
    steps++;
  }
  assert(String(savedShaman.spellsSpent || '').indexOf('Hold Person') >= 0 && !(savedHero.held > 0), 'a successful save is not held');
  assert(String(savedShaman.spellsSpent || '').indexOf("Silence 15' r.") >= 0 && !(savedHero.silenced > 0), 'a successful save is not silenced');

  const immune = bootL4({ kin: 1 });
  const immuneHero = immune.ents.filter(function (e) { return e.hero; })[0];
  const immuneBoss = immune.ents.filter(function (e) { return e.campaignRole === 'boss'; })[0];
  const immuneShaman = immune.ents.filter(function (e) { return e.campaignKey === 'orcShaman'; })[0];
  immuneHero.x = immuneBoss.x;
  immuneHero.y = immuneBoss.y;
  immune.lvl._campaignHost.save = function () { return false; };
  global.wearingFreeAction = function () { return true; };
  steps = 0;
  while (steps < 12 && String(immuneShaman.spellsSpent || '').indexOf('Hold Person') < 0) {
    R.tick(immune, 1.1);
    steps++;
  }
  delete global.wearingFreeAction;
  assert(String(immuneShaman.spellsSpent || '').indexOf('Hold Person') >= 0 && !(immuneHero.held > 0), 'Free Action keeps Hold Person from landing');
})();

(function chiefMorale() {
  const g = bootL4();
  const boss = g.ents.filter(function (e) { return e.campaignRole === 'boss'; })[0];
  const hero = g.ents.filter(function (e) { return e.hero; })[0];
  hero.x = 1;
  hero.y = 1;
  boss.hp = Math.floor(boss.maxhp * 0.25) - 1;
  g.lvl._campaignHost.d100 = function () { return 65; };
  R.kingStep(g, boss);
  assert(boss.moraleHold === 1 && !boss.fleeTo, 'a morale roll of 65 holds the chief');
  R.kingStep(g, boss);
  assert(boss.moraleHold === 1 && !boss.fleeTo, 'the chief rolls morale once');
  const g2 = bootL4();
  const boss2 = g2.ents.filter(function (e) { return e.campaignRole === 'boss'; })[0];
  g2.ents.filter(function (e) { return e.hero; })[0].x = 1;
  g2.ents.filter(function (e) { return e.hero; })[0].y = 1;
  boss2.hp = Math.floor(boss2.maxhp * 0.25) - 1;
  g2.lvl._campaignHost.d100 = function () { return 66; };
  R.kingStep(g2, boss2);
  const followed = g2.ents.filter(function (e) { return e.campaignKey === 'orcGuard' && e.fleeTo && e.fleeTo.x === 32 && e.fleeTo.y === 50; });
  assert(boss2.moraleHold === 0 && boss2.fleeTo && boss2.fleeTo.x === 32 && boss2.fleeTo.y === 50 && followed.length === 6, 'a morale roll of 66 sends the chief and his guards to the ogre cave');
})();

(function guardianCone() {
  const g = bootL4();
  const hero = g.ents.filter(function (e) { return e.hero; })[0];
  const guard = g.ents.filter(function (e) { return e.campaignRole === 'guardian'; })[0];
  guard.sleeping = 0;
  hero.x = guard.x;
  hero.y = guard.y + 4;
  g.lvl._campaignHost.rollExpr = function () { return 7; };
  g.lvl._campaignHost.save = function (who, kind) { g._breath = kind; return true; };
  let hits = [];
  global.damage = function (t, n) { hits.push(n); };
  global.interact = function () {};
  R.tick(g, 0.2);
  assert(hits.length === 1 && hits[0] === 14 && g._breath === 'breath' && guard.coneCd === 4, 'the cone is 2d6, save vs breath for half, out to 6 tiles');
  R.tick(g, 0.2);
  assert(hits.length === 1, 'the cone waits four seconds');
  hits = [];
  guard.coneCd = 0;
  hero.y = guard.y + 1;
  R.tick(g, 0.2);
  assert(hits.length === 0, 'the cone does not fire inside 2 tiles');
})();

(function continueL4() {
  const g = bootL4();
  const seals0 = g.props.filter(function (p) { return p && p.campaign === 'ogre-seal'; });
  seals0[0].gone = 1;
  const wolf = g.ents.filter(function (e) { return e.campaignKey === 'wolf'; })[0];
  wolf.hp = 144;
  wolf.maxhp = 144;
  g.lvl.flags.ogressXp = 1;
  const ogress0 = g.ents.filter(function (e) { return e.campaignKey === 'ogress'; })[0];
  ogress0.vanished = 1;
  ogress0.dead = 1;
  const hero = g.ents.filter(function (e) { return e.hero; })[0];
  hero.x = 12;
  hero.y = 34;
  const play = GS.captureWorld(g);
  const shell = {
    campaignLevel: 4,
    ch: 4,
    t: 0,
    ents: [
      { team: 'party', hero: 1, x: 1, y: 1, hp: 40, maxhp: 40, dead: 0, col: { key: 'macar' } },
      { team: 'foe', kind: 'aboleth', name: 'Aboleth', x: 28, y: 26, hp: 280, maxhp: 280 }
    ],
    props: [
      { k: 'trap', trap: 'trap_spikes', x: 28, y: 28 },
      { k: 'slime', x: 17, y: 29 },
      { k: 'boulder', campaign: 'ogre-seal', x: 1, y: 1 },
      { k: 'boulder', campaign: 'ogre-seal', x: 2, y: 2 },
      { k: 'boulder', campaign: 'ogre-seal', x: 3, y: 3 },
      { k: 'boulder', campaign: 'ogre-seal', x: 4, y: 4 },
      { k: 'boulder', campaign: 'ogre-seal', x: 5, y: 5 },
      { k: 'boulder', campaign: 'ogre-seal', x: 6, y: 6 }
    ],
    loot: [],
    cam: { x: 0, y: 0 },
    lvl: {
      n: 4, w: 132, h: 106, grid: null, secrets: [],
      flags: {},
      objs: [{ t: 'Destroy the Elder Brain', d: 0 }, { t: 'Clear the drowned streets', d: 0 }],
      tick: function () { shell.lvl._shell = 1; }
    }
  };
  GS.applyWorld(shell, play);
  shell.lvl.flags = Object.assign({}, play.flags || {});
  const asked = [];
  global.loadSpriteKeyNow = function (k) { asked.push(k); };
  let xp = 0;
  global.awardPartyXp = function (n) { xp += n; };
  assert(R.install(shell, { scale: 4, fresh: false, foe: { orc: orcFactory }, rng: function () { return 0; } }) === true, 'Continue reinstalls Level 4 from the save');
  const seals = shell.props.filter(function (p) { return p && p.campaign === 'ogre-seal'; });
  const gone = seals.filter(function (p) { return p.gone; });
  const back = shell.ents.filter(function (e) { return e.hero; })[0];
  const wolf2 = shell.ents.filter(function (e) { return e.campaignKey === 'wolf'; })[0];
  const ogress2 = shell.ents.filter(function (e) { return e.campaignKey === 'ogress'; })[0];
  shell.lvl.tick(0.1);
  assert(seals.length === 3 && gone.length === 1, 'Continue places three boulders and keeps the cleared one cleared');
  assert(ogress2 && ogress2.vanished && xp === 0, 'a freed ogress stays gone and does not award the rescue again');
  assert(shell.lvl.objs.length === 0 && !shell.props.some(function (p) { return p && (p.k === 'trap' || p.k === 'slime'); }) && !shell.lvl._shell, 'Continue drops the dead-city objectives, traps, and slime');
  assert(!shell.ents.some(function (e) { return e && e.kind === 'aboleth'; }), 'Continue does not keep the dead-city residents');
  assert(back.x === 12 && back.y === 34, 'Continue keeps Macar where the save left him');
  assert(wolf2 && wolf2.hp !== 144 && wolf2.hd === 2, 'a saved warg-factory wolf comes back on the printed dice');
  assert(asked.indexOf('orc') >= 0 && asked.indexOf('warg') >= 0 && asked.indexOf('construct') >= 0, 'Continue asks for the orc, warg, and construct sheets again');
  R.install(shell, { scale: 4, fresh: false, foe: { orc: orcFactory }, rng: function () { return 0; } });
  const seals2 = shell.props.filter(function (p) { return p && p.campaign === 'ogre-seal'; });
  assert(seals2.length === 3 && seals2.filter(function (p) { return p.gone; }).length === 1, 'a second Continue does not duplicate the boulders');
})();

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('campaign runtime ok');

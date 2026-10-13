/**
 * Sage §7.15. The shaman is 7th level. 1 inch is 2 tiles.
 * Run: node src/campaign/Sage715.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const L4 = require('./L4');
require('./CampaignTable');
require('./ExitRules');
const R = require('./CampaignRuntime');
require('../systems/PartyOrders');
require('../packs/EquipmentSlots');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

const root = path.join(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const PO = global.PartyOrders;
const ES = global.EquipmentSlots;

function extractFn(name) {
  const re = new RegExp('function ' + name + '\\([\\s\\S]*?\\n\\}');
  const m = html.match(re);
  if (!m) throw new Error('missing ' + name);
  return m[0];
}

function foe(name, extra) {
  return function () {
    return Object.assign({ team: 'foe', name: name, hp: 10, maxhp: 10, boss: 0, kind: name, sprite: name, range: 1, cd: 1.05 }, extra || {});
  };
}

function boot(extra) {
  const g = {
    campaignLevel: 4,
    ch: 4,
    t: 0,
    scene: 'play',
    fightOn: 0,
    ents: [{ team: 'party', hero: 1, race: 'dwarf', kind: 'dwarf', x: 12, y: 34, hp: 280, maxhp: 280, dead: 0, col: { key: 'macar' }, name: 'Macar', abil: { con: 18, str: 18, exc: 76, dex: 11 }, lvl: 5, cls: 'f' }],
    props: [],
    loot: [],
    cam: { x: 0, y: 0 },
    packs: { macar: { magic: [] } },
    lvl: {
      n: 4, w: 132, h: 106, grid: null, secrets: [],
      flags: {},
      objs: [],
      tick: function () {}
    },
    _saves: []
  };
  if (extra && extra.kin) g.ents.push({ team: 'party', x: 80, y: 80, hp: 40, maxhp: 40, dead: 0, name: 'Kin', id: 2, col: { key: 'kin' } });
  const opts = {
    scale: 4,
    fresh: true,
    foe: {
      orc: foe('Orc', { kind: 'orc', sprite: 'orc' }),
      statue: foe('Construct', { kind: 'construct', sprite: 'construct' }),
      construct: foe('Construct', { kind: 'construct', sprite: 'construct' })
    },
    rng: function () { return 0; },
    rollExpr: function () { return 5; },
    d20: function () { return 20; },
    need: function () { return 10; },
    save: function (who, kind) {
      g._saves.push({ hero: !!(who && who.hero), kind: kind });
      return !!(extra && extra.save);
    },
    ri: function (a) { return (extra && extra.face) || 1; }
  };
  assert(R.install(g, opts) === true, 'a Level 4 boot installs for §7.15');
  g.lvl._campaignHost = Object.assign(g.lvl._campaignHost || {}, opts);
  return g;
}

function actors(g) {
  return {
    hero: g.ents.filter(function (e) { return e.hero; })[0],
    shaman: g.ents.filter(function (e) { return e.campaignKey === 'orcShaman'; })[0],
    boss: g.ents.filter(function (e) { return e.campaignRole === 'boss'; })[0],
    guard: g.ents.filter(function (e) { return e.campaignRole === 'guardian'; })[0],
    kin: g.ents.filter(function (e) { return e.name === 'Kin'; })[0]
  };
}

function ready(shaman, boss, only) {
  boss.roared = 1;
  shaman.spellCd = 0;
  shaman._wind = null;
  const all = ['Bless', 'Cause Fear', 'Darkness', 'Cause Light Wounds', 'Cause Light Wounds', 'Hold Person', "Silence 15' r."];
  shaman.spellsSpent = all.filter(function (n) { return n !== only; }).join(',');
}

function until(g, pred, max) {
  let i = 0;
  const cap = max || 12;
  while (i < cap && !pred()) { R.tick(g, 0.5); i++; }
  return i;
}

assert(L4.SHAMAN.level === 7 && L4.SHAMAN.holdPerson.rangeTiles === 12 && L4.SHAMAN.holdPerson.capSec === 3, 'Hold Person is 12 tiles and caps at 3 seconds');
assert(L4.SHAMAN.holdPerson.save === 'vs spell' && L4.SHAMAN.holdPerson.dwarfBonus === true && L4.SHAMAN.holdPerson.resaveOnDamage === true && L4.SHAMAN.holdPerson.onePerFight === true, 'Hold Person saves vs spell, uses the dwarf bonus, re-saves on damage, and is once per fight');

(function holdPerson() {
  const g = boot();
  const a = actors(g);
  ready(a.shaman, a.boss, 'Hold Person');
  a.hero.x = a.shaman.x + 12;
  a.hero.y = a.shaman.y;
  const steps = until(g, function () { return a.hero.held > 0; });
  assert(steps < 12 && a.hero.holdSrc === 'campaign' && a.hero.held <= 3 && a.hero.held > 2.4, 'a failed save at 12 tiles holds Macar for 3 seconds');
  assert(g._saves.some(function (s) { return s.kind === 'spell' && s.hero; }), 'the hold save is vs spell');

  const far = boot();
  const f = actors(far);
  ready(f.shaman, f.boss, 'Hold Person');
  f.hero.x = f.shaman.x + 12.5;
  f.hero.y = f.shaman.y;
  until(far, function () { return false; }, 8);
  assert(String(f.shaman.spellsSpent || '').indexOf('Hold Person') < 0 && !(f.hero.held > 0), 'Hold Person does not reach past 12 tiles');

  const again = boot();
  const b = actors(again);
  ready(b.shaman, b.boss, 'Hold Person');
  b.hero.x = b.shaman.x;
  b.hero.y = b.shaman.y;
  until(again, function () { return b.hero.held > 0; });
  const left = b.hero.held;
  b.shaman.spellsSpent = String(b.shaman.spellsSpent || '').split(',').filter(function (n) { return n !== 'Hold Person'; }).join(',');
  b.shaman.spellCd = 0;
  b.shaman._wind = null;
  R.tick(again, 0.5);
  assert(b.shaman.holdFight === 1 && b.hero.held < left && b.hero.held > 0, 'a second Hold in the same fight does not refresh the clock');
  R.noteFightEnd(again);
  b.hero.held = 0;
  b.hero.holdSrc = 0;
  b.shaman.spellCd = 0;
  until(again, function () { return b.hero.held > 0; });
  assert(b.hero.held > 2, 'the next fight can Hold again');

  again.lvl._campaignHost.save = function () { return true; };
  assert(R.resaveHold(again, b.hero) === true && !(b.hero.held > 0) && !b.hero.holdSrc, 'damage while held calls a new save, and a success breaks the hold');
  b.hero.held = 3;
  b.hero.holdSrc = 'campaign';
  again.lvl._campaignHost.save = function () { return false; };
  assert(R.resaveHold(again, b.hero) === false && b.hero.held === 3, 'a failed re-save keeps the hold');
  const dmgAt = html.indexOf('function damage(');
  assert(/CampaignRuntime\.resaveHold/.test(html.slice(dmgAt, dmgAt + 4000)), 'any hit while held asks for that re-save');
})();

(function dwarfSpellSave() {
  const ctx = { entityAbil: function (e) { return e.abil || null; } };
  vm.createContext(ctx);
  vm.runInContext(extractFn('isDwarf') + '\n' + extractFn('dwarfConSaveAdj') + '\n' + extractFn('dwarfSaveCon') + '\n' + extractFn('dwarfSaveBonus'), ctx);
  const mac = { race: 'dwarf', kind: 'dwarf', abil: { con: 18 } };
  assert(ctx.dwarfSaveBonus(mac, 'spell') === ctx.dwarfSaveBonus(mac, 'poison') && ctx.dwarfSaveBonus(mac, 'spell') === ctx.dwarfConSaveAdj(18), 'Macar\'s spell save uses the same dwarf CON table as poison');
  assert(ctx.dwarfSaveBonus(mac, 'breath') === 0 && ctx.dwarfConSaveAdj(18) === 5, 'the CON 18 dwarf bonus is the poison figure, and breath does not take it');
})();

(function helpless() {
  const ctx = {
    G: { fightOn: 1 },
    beginFight: function () {},
    effectiveAC: function () { return 8; },
    thacNeed: function () { return 20; },
    isRearAttack: function () { return false; },
    specialtyBand: function (k) { return k ? { n: 'I', mult: 2 } : null; },
    specialtyInBand: function () { return true; },
    specialtyHitBonus: function () { return 0; },
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
  vm.createContext(ctx);
  vm.runInContext(extractFn('addAttack') + '\n' + extractFn('foeAttackCount') + '\n' + extractFn('armFoeSpecialty'), ctx);
  const held = { name: 'Macar', team: 'party', held: 3, x: 1, y: 0 };
  const free = { name: 'Macar', team: 'party', held: 0, x: 1, y: 0 };
  const orc = { name: 'Orc', team: 'foe', dice: '1d6', specialty: 2, x: 0, y: 0 };
  assert(ctx.addAttack(orc, free) === 0, 'a free Macar still takes a real to-hit roll');
  const plain = ctx.addAttack({ name: 'Orc', team: 'foe', dice: '1d6', specialty: 0, x: 0, y: 0 }, held);
  const spec = ctx.addAttack(orc, held);
  assert(plain === 16 && spec === plain, 'a helpless hit auto-hits for normal damage and does not multiply');
  assert(ctx.foeAttackCount({ team: 'foe', printedAttacks: 1 }) === 1 && ctx.foeAttackCount({ team: 'foe', printedAttacks: 3 }) === 3 && ctx.foeAttackCount({ team: 'foe' }) === 1, 'a monster swings its printed attack count');
  assert(!/fighterMatrixRow\(/.test(html.slice(html.indexOf('function foeAttackCount'), html.indexOf('function foeAttackCount') + 900)), 'foe attacks do not use the fighter multi-attack table');
})();

(function silence() {
  const g = boot({ kin: 1, save: false });
  const a = actors(g);
  ready(a.shaman, a.boss, "Silence 15' r.");
  a.hero.x = a.shaman.x + 20;
  a.hero.y = a.shaman.y;
  a.kin.x = a.hero.x + 2;
  a.kin.y = a.hero.y;
  const edge = { team: 'party', name: 'Edge', x: a.hero.x + 6, y: a.hero.y, hp: 10, dead: 0 };
  const far = { team: 'party', name: 'Far', x: a.hero.x + 7, y: a.hero.y, hp: 10, dead: 0 };
  g.ents.push(edge, far);
  const steps = until(g, function () { return (g.silenceZones || []).length > 0; });
  const zone = g.silenceZones[0];
  assert(steps < 12 && zone && zone.r === 6 && zone.t === 14 && zone.follow === a.hero, 'a failed center save puts a 15-foot zone on Macar for 14 seconds');
  assert(a.hero.silenced <= 14 && a.hero.silenced > 13 && a.kin.silenced > 0 && edge.silenced > 0 && !(far.silenced > 0), 'everyone inside 6 tiles is silenced, and the tile beyond is not');
  a.hero.x += 4;
  R.tick(g, 0.05);
  assert(Math.abs(g.silenceZones[0].x - a.hero.x) < 1e-6, 'a failed save makes the zone follow the center');

  const saved = boot({ kin: 1, save: true });
  const s = actors(saved);
  ready(s.shaman, s.boss, "Silence 15' r.");
  s.hero.x = s.shaman.x + 20;
  s.hero.y = s.shaman.y;
  s.kin.x = s.hero.x + 2;
  s.kin.y = s.hero.y;
  until(saved, function () { return (saved.silenceZones || []).length > 0; });
  const floor = saved.silenceZones[0];
  const spot = floor.x;
  assert(!floor.follow && !(s.hero.silenced > 0) && !(s.kin.silenced > 0), 'a successful center save leaves the zone on the floor and silences nobody');
  s.hero.x += 5;
  R.tick(saved, 0.2);
  assert(saved.silenceZones[0].x === spot, 'the floor zone stays where the save planted it');

  const kinCenter = boot({ kin: 1, save: false });
  const k = actors(kinCenter);
  ready(k.shaman, k.boss, "Silence 15' r.");
  k.hero.x = k.shaman.x + 10;
  k.hero.y = k.shaman.y;
  k.kin.x = k.shaman.x;
  k.kin.y = k.shaman.y;
  until(kinCenter, function () { return (kinCenter.silenceZones || []).length > 0; });
  assert(kinCenter.silenceZones[0].follow === k.kin && !(k.hero.silenced > 0), 'without a kin within 3 tiles the zone centers on that kin, not on Macar');

  const solo = boot();
  const so = actors(solo);
  ready(so.shaman, so.boss, "Silence 15' r.");
  so.hero.x = so.shaman.x;
  so.hero.y = so.shaman.y;
  until(solo, function () { return false; }, 6);
  assert(String(so.shaman.spellsSpent || '').indexOf("Silence 15' r.") < 0, 'with no living kin the shaman does not spend Silence');

  const deadKin = boot({ kin: 1 });
  const d = actors(deadKin);
  d.kin.dead = 1;
  ready(d.shaman, d.boss, "Silence 15' r.");
  d.hero.x = d.shaman.x;
  d.hero.y = d.shaman.y;
  until(deadKin, function () { return false; }, 6);
  assert(String(d.shaman.spellsSpent || '').indexOf("Silence 15' r.") < 0, 'a dead kin does not draw Silence onto Macar');

  const shut = PO.issue('hold', { voiceShut: function () { return true; } });
  assert(shut.ok === false && shut.reason === 'silenced', 'Silence blocks a PartyOrders shout');
  const heard = PO.decide({ id: 2, team: 'party', col: { key: 'kin' } }, {}, { inSilenceZone: function () { return true; } });
  assert(heard.silenced === true && heard.handled === false, 'a kin inside the zone does not take the order');

  const cast = {
    said: 0,
    healed: 0,
    G: { equipped: {}, animateDeadSpent: 0, ents: [], silenceZones: [{ x: 0, y: 0, r: 6, t: 14 }] },
    say: function () { cast.said++; },
    applyHeal: function () { cast.healed++; },
    clearPoison: function () {},
    inSilenceZone: function (e) { return !!(e && e.x === 0); }
  };
  vm.createContext(cast);
  vm.runInContext(extractFn('useScrollByName') + '\n' + extractFn('commandWordItem') + '\n' + extractFn('useMagicItem'), cast);
  assert(cast.useScrollByName({ n: 'Heal', k: 'scroll', d: 'cure' }, { silenced: 2 }) === 'silenced' && cast.healed === 0, 'Silence blocks a spell scroll');
  const word = cast.useMagicItem({ n: 'Broom of Flying', d: 'Speak the command word.', k: 'misc' }, { silenced: 0, x: 0, y: 0 });
  assert(word === 'silenced', 'a command word fails inside the zone');
  assert(L4.SHAMAN.silence.rangeTiles === 24 && L4.SHAMAN.silence.durationSec === 14 && L4.SHAMAN.silence.recenterOnSave === 'floor' && L4.SHAMAN.silence.centerOnMacarIfKinWithin === 3, 'Silence is 24 tiles, 14 seconds, and recenters on a save');
})();

(function causeFear() {
  const miss = boot();
  const m = actors(miss);
  ready(m.shaman, m.boss, 'Cause Fear');
  m.hero.x = m.shaman.x;
  m.hero.y = m.shaman.y;
  miss.lvl._campaignHost.d20 = function () { return 1; };
  miss.lvl._campaignHost.need = function () { return 20; };
  until(miss, function () { return String(m.shaman.spellsSpent || '').indexOf('Cause Fear') >= 0; });
  assert(!(m.hero.causeFear > 0) && !(m.hero.fearT > 0), 'Cause Fear needs a touch hit');

  const g = boot();
  const a = actors(g);
  ready(a.shaman, a.boss, 'Cause Fear');
  a.hero.x = a.shaman.x;
  a.hero.y = a.shaman.y;
  until(g, function () { return a.hero.causeFear > 0; });
  assert(a.hero.causeFear === 7 && a.hero.fearT === 7 && g._saves.some(function (s) { return s.kind === 'spell'; }), 'a failed spell save makes Macar flee for 7 seconds');

  const saved = boot({ save: true });
  const s = actors(saved);
  ready(s.shaman, s.boss, 'Cause Fear');
  s.hero.x = s.shaman.x;
  s.hero.y = s.shaman.y;
  until(saved, function () { return String(s.shaman.spellsSpent || '').indexOf('Cause Fear') >= 0; });
  assert(!(s.hero.causeFear > 0), 'a successful spell save ignores Cause Fear');
  assert(L4.SHAMAN.causeFear.touch === true && L4.SHAMAN.causeFear.fleeSec === 7 && L4.SHAMAN.causeFear.dwarfBonus === true, 'Cause Fear is a touch spell with the dwarf spell bonus');
})();

(function darkness() {
  const g = boot();
  const a = actors(g);
  ready(a.shaman, a.boss, 'Darkness');
  a.hero.x = a.shaman.x + 4;
  a.hero.y = a.shaman.y;
  until(g, function () { return (g.darkZones || []).length > 0; });
  const z = g.darkZones[0];
  assert(z.r === 4 && z.t === 130 && z.magical === 1 && z.infravision === false, 'Darkness is a 4-tile magical zone for 130 seconds, and infravision does not see through it');
  const dwarf = true;
  assert(R.darkPenalty({ x: z.x, y: z.y }, g.darkZones, dwarf, { x: z.x + 9, y: z.y }) === -4, 'an attack out of the zone is at -4');
  assert(R.darkPenalty({ x: z.x + 9, y: z.y }, g.darkZones, dwarf, { x: z.x, y: z.y }) === -4, 'an attack into the zone is at -4');
  assert(R.darkPenalty({ x: 0, y: 0 }, [{ x: 0, y: 0, r: 2, t: 8 }], true) === 0, 'ordinary darkness still spares a dwarf');
  assert(L4.SHAMAN.darkness.radiusTiles === 4 && L4.SHAMAN.darkness.durationSec === 130 && L4.SHAMAN.darkness.infravision === false && L4.SHAMAN.darkness.attackPenalty === -4, 'the Darkness line is the printed radius, duration, and penalty');
})();

(function causeLightWounds() {
  const hits = [];
  global.damage = function (t, n) { hits.push(n); };
  const g = boot();
  const a = actors(g);
  ready(a.shaman, a.boss, 'Cause Light Wounds');
  a.hero.x = a.shaman.x;
  a.hero.y = a.shaman.y;
  const before = g._saves.length;
  until(g, function () { return hits.length > 0; });
  assert(hits[0] === 20 && g._saves.length === before, 'Cause Light Wounds is 1d8 scaled like a weapon and allows no save');

  hits.length = 0;
  const miss = boot();
  const m = actors(miss);
  ready(m.shaman, m.boss, 'Cause Light Wounds');
  m.hero.x = m.shaman.x;
  m.hero.y = m.shaman.y;
  miss.lvl._campaignHost.d20 = function () { return 1; };
  miss.lvl._campaignHost.need = function () { return 20; };
  until(miss, function () { return String(m.shaman.spellsSpent || '').indexOf('Cause Light Wounds') >= 0; });
  assert(hits.length === 0, 'Cause Light Wounds needs a touch hit');
  delete global.damage;
  assert(L4.SHAMAN.causeLightWounds.damage === '1d8' && L4.SHAMAN.causeLightWounds.save === false && L4.SHAMAN.causeLightWounds.touchHit === true && L4.SHAMAN.causeLightWounds.scale === 'weapon', 'the Cause Light Wounds line is 1d8, no save, touch');
})();

(function hideArmor() {
  const short = { packs: { macar: { magic: [{ id: 'worg_pelt', qty: 2 }] } }, scene: 'camp' };
  assert(R.beginHideCraft(short).reason === 'pelts' && R.peltCount(short) === 2, 'hide armor needs three worg pelts');
  const g = { packs: { macar: { magic: [{ id: 'worg_pelt', qty: 3 }] } }, scene: 'play' };
  assert(R.beginHideCraft(g).ok === true && R.beginHideCraft(g).reason === 'working', 'curing the pelts starts a 10 second job');
  assert(R.tickHideCraft(g, 10) == null && g._hideCraft, 'the cure waits while Macar is not in camp');
  g.scene = 'camp';
  assert(R.tickHideCraft(g, 9) == null, 'nine seconds at camp leaves the pelts uncut');
  const done = R.tickHideCraft(g, 1);
  assert(done && done.ok && done.item.ac === 6 && done.item.weight === 30 && done.item.slot === 'chest' && done.item.body === 1 && done.item.armorType === 'hide', 'three pelts become body hide armor, AC 6, weight 30');
  assert(R.peltCount(g) === 0, 'the three pelts are spent');
  assert(ES.ARMOR_AC.hide === 6 && ES.inferArmorType('Hide Armor') === 'hide' && ES.inferArmorType('Hide Cloak') === 'leather', 'hide armor is AC 6 and a hide cloak stays leather');
  assert(/Cure three worg pelts into hide armor/.test(html), 'camp offers the pelt cure');
  assert(L4.LOOT.components.hide.pelts === 3 && L4.LOOT.components.hide.sec === 10 && L4.LOOT.components.hide.ac === 6 && L4.LOOT.components.hide.weight === 30 && L4.LOOT.components.hide.slot === 'body', 'the hide recipe is 3 pelts, 10 seconds, AC 6, weight 30, body');
})();

(function wanderClock() {
  const g = boot({ face: 2 });
  g.scene = 'play';
  g.fightOn = 0;
  R.tick(g, 29);
  assert(!g._wanderLast, 'the wander die waits out the 30 seconds');
  R.tick(g, 1);
  assert(g._wanderLast && g._wanderLast.roll === 2 && g._wanderLast.hit === false, 'a 2 on 1d6 is not a wander encounter');
  g._wanderT = 30;
  g._wanderLast = null;
  g.lvl._campaignHost.ri = function () { return 1; };
  global.wearingElvenkind = function () { return true; };
  R.tick(g, 0.1);
  assert(g._wanderLast && g._wanderLast.roll === 1 && g._wanderLast.hit === false && g._wanderLast.silent === 1, 'elvenkind turns the 1 into a miss');
  delete global.wearingElvenkind;
  g._wanderT = 30;
  g._wanderLast = null;
  R.tick(g, 0.1);
  assert(g._wanderLast && g._wanderLast.hit === true && g._wanderLast.roll === 1, 'a 1 on 1d6 every 30 seconds brings a wanderer');
  const marked = g._wanderLast;
  g.fightOn = 1;
  g._wanderT = 30;
  R.tick(g, 0.1);
  assert(g._wanderLast === marked, 'a fight does not roll the wander die');
  const book = g.lvl.campaignSpec.map.wander.check.every;
  g.lvl.campaignSpec.map.wander.check.every = '3 turns';
  g.fightOn = 0;
  g._wanderT = 0;
  g._wanderLast = null;
  R.tick(g, 40);
  assert(!g._wanderLast, 'a 3-turn check stays on the dungeon-turn clock');
  g.lvl.campaignSpec.map.wander.check.every = book;
  assert(L4.FORECAST_PACK.worgs === 9 && L4.FORECAST_PACK.wolves === 2 && L4.forecastPackXp() === 3811, 'the forecast column is 9 worgs and 2 wolves');
})();

(function magicCap() {
  const ctx = { G: { campaignLevel: 1 } };
  vm.createContext(ctx);
  vm.runInContext(extractFn('magicArmorCap') + '\n' + extractFn('lootLevel') + '\n' + extractFn('stepMagicArmor'), ctx);
  assert(ctx.magicArmorCap(1) === 2 && ctx.magicArmorCap(4) === 2 && ctx.magicArmorCap(5) === 3 && ctx.magicArmorCap(7) === 3 && ctx.magicArmorCap(8) === 5, 'magic armor and shields cap at +2, +3, and +5');
  ctx.G.campaignLevel = 6;
  const plate = { plus: 5, n: 'Plate Mail +5', k: 'armor' };
  ctx.stepMagicArmor(plate);
  assert(plate.plus === 3 && plate.n === 'Plate Mail +3', 'a higher roll steps down to the level cap');
  const cursed = { plus: 1, n: 'Shield -1', k: 'armor', cursed: 1 };
  ctx.stepMagicArmor(cursed);
  assert(cursed.plus === 1 && cursed.n === 'Shield -1', 'a cursed piece keeps its roll');
  ctx.G.campaignLevel = 9;
  const shield = { plus: 5, n: 'Shield +5', k: 'armor' };
  ctx.stepMagicArmor(shield);
  assert(shield.plus === 5, 'level 8 and above keep a +5 shield');
  assert(/function rollDmgArmor\(\)\{ const r=pickRange\(DMG_ARMOR\); return stepMagicArmor\(/.test(html), 'armor and shield rolls pass through the cap');
  assert(/function rollDmgSword\(\)\{ const r=pickRange\(DMG_SWORD\); return magItem\(/.test(html) && /function rollDmgWeapon\(\)\{ const r=pickRange\(DMG_WEAP\); return magItem\(/.test(html), 'weapons keep their own rolls');
})();

(function specialty() {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(extractFn('armFoeSpecialty') + '\n' + extractFn('foeAttackCount'), ctx);
  const chief = { team: 'foe', campaignRole: 'boss', campaignKey: 'orcChief', attackForm: 'battle axe', specialty: 0 };
  const mac = { team: 'party', held: 0 };
  assert(ctx.armFoeSpecialty(chief, mac) === 1 && chief.specialty === 1, 'the chief\'s axe uses the Specialty Attack');
  mac.held = 3;
  assert(ctx.armFoeSpecialty(chief, mac) === 0 && chief.specialty === 0, 'the chief does not use it on a held target');
  const slam = { team: 'foe', campaignRole: 'boss', campaignKey: 'orcChief', attackForm: 'slam', specialty: 1 };
  assert(ctx.armFoeSpecialty(slam, { held: 0 }) === 0, 'Specialty Attack is a weapon swing');
  const guard = { team: 'foe', kind: 'construct', campaignRole: 'guardian', campaignKey: 'rubyGuardian', attackForm: 'slam', specialty: 1, noSpecialty: 1 };
  assert(ctx.armFoeSpecialty(guard, { held: 0 }) === 0 && guard.specialty === 0, 'a ruby guardian never uses a Specialty Attack');
  const orc = { team: 'foe', campaignRole: 'resident', campaignKey: 'orc', attackForm: 'weapon', specialty: 0 };
  assert(ctx.armFoeSpecialty(orc, { held: 0 }) === 0, 'a plain monster does not roll a specialty');

  const g = boot();
  const a = actors(g);
  a.hero.x = a.boss.x;
  a.hero.y = a.boss.y;
  a.hero.held = 0;
  a.boss.attackForm = 'battle axe';
  R.kingStep(g, a.boss);
  assert(a.boss.specialty === 1, 'adjacent, the chief sets the specialty for the swing');
  a.hero.held = 2;
  R.kingStep(g, a.boss);
  assert(a.boss.specialty === 0, 'a held Macar is not a specialty target');
  assert(/armFoeSpecialty\(e,/.test(html), 'foe swings arm specialty from the printed weapon rule');
})();

(function guardian() {
  const g = boot();
  const guard = actors(g).guard;
  assert(guard.hd === 8 && guard.ac === 3 && guard.dice === '1d8' && guard.cd === 1.5 && guard.attackForm === 'slam' && guard.printedAttacks === 1 && guard.noSpecialty === 1 && guard.specialty === 0, 'Guardian IV slams for 1d8 every 1.5 seconds at AC 3 and 8 HD');
  assert(guard.kind === 'construct' && L4.MONSTERS.rubyGuardian.cone.damage === '2d6' && L4.MONSTERS.rubyGuardian.cone.everySec === 4, 'the guardian stays a construct and keeps the shard cone');
  assert(!/PLACEHOLDER/.test(fs.readFileSync(path.join(__dirname, 'CampaignRuntime.js'), 'utf8')), 'no placeholder remains in the runtime');
})();

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('sage 7.15 ok');

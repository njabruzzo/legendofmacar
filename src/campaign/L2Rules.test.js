/**
 * Sage's L2 rulings, wired through CampaignRuntime.
 * Run: node src/campaign/L2Rules.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const L2 = require('./L2');
require('./CampaignTable');
require('./ExitRules');
const R = require('./CampaignRuntime');
require('../loot/LoreClues');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

assert(L2, 'L2 data loads');
assert(R.rollHpExpr('1d8-1', function () { return 0; }, 1) === 1, 'goblin 1d8-1 floors at 1');
assert(R.rollHpExpr('1d8-1', function () { return 0.999; }, 1) === 7, 'goblin 1d8-1 tops at 7');
assert(R.rollHpExpr('1d4', function () { return 0; }, 1) === 1, 'rat 1d4 floors at 1');
assert(R.rollHpExpr('1d4', function () { return 0.999; }, 1) === 4, 'rat 1d4 tops at 4');
assert(R.rollHpExpr('1d8+1', function () { return 0; }, 1) === 2, 'leader 1d8+1 floors at 2');
assert(R.rollHpExpr('1d8+1', function () { return 0.999; }, 1) === 9, 'leader 1d8+1 tops at 9');
assert(R.rollHpExpr('2d8', function () { return 0; }, 1) === 2, 'bodyguard 2d8 floors at 2');
assert(R.rollHpExpr('2d8', function () { return 0.999; }, 1) === 16, 'bodyguard 2d8 tops at 16');

const spec = R.load(2);
const GHOST = [
  'Your ghosts are see-through. Like you!',
  'Boo! Ha! Dead dwarfs can\'t scare us!',
  'Ghost friends? Real friends all died.',
  'Hey ghosty! You forgot your body!'
];

function world(extra) {
  const host = Object.assign({ scale: 4, rng: function () { return 0; } }, extra && extra.host);
  const ents = (extra && extra.ents) || [];
  return {
    ents: ents,
    props: [],
    lvl: {
      n: 2,
      flags: Object.assign({ campaign: 1 }, (extra && extra.flags) || {}),
      campaignSpec: spec,
      _campaignHost: host
    }
  };
}

const mac = { hero: 1, team: 'party', x: 0, y: 0, hp: 40, maxhp: 40, lvl: 1, dead: 0 };
const rat = { campaignKey: 'rat', diseaseBite: 5, team: 'foe', name: 'Giant Rat' };

(function diseaseMiss() {
  const g = world({ ents: [mac] });
  g.lvl._campaignHost.d100 = function () { return 6; };
  g.lvl._campaignHost.save = function () { return false; };
  const hp = mac.hp;
  assert(R.onFoeHit(g, rat, mac) === false && !mac.ratFever && mac.hp === hp, 'a d100 of 6 does not infect');
})();

(function diseaseSave() {
  const who = { hero: 1, team: 'party', hp: 40, maxhp: 40 };
  const g = world({ ents: [who] });
  g.lvl._campaignHost.d100 = function () { return 5; };
  g.lvl._campaignHost.save = function () { return true; };
  assert(R.onFoeHit(g, rat, who) === false && !who.ratFever && who.hp === 40, 'a poison save negates rat fever');
})();

(function diseaseHit() {
  const who = { hero: 1, team: 'party', hp: 30, maxhp: 40 };
  const g = world({ ents: [who] });
  g.lvl._campaignHost.d100 = function () { return 5; };
  g.lvl._campaignHost.save = function () { return false; };
  assert(R.onFoeHit(g, rat, who) === true && who.ratFever === 1 && who.hp === 30 && g.lvl.flags.ratFever === 1, 'a failed bite sets rat fever and never kills');
  assert(R.attackMod(who) === -1, 'rat fever is -1 to hit');
  assert(R.healKindBlocked(who, 'rest') && R.healKindBlocked(who, 'regen') && !R.healKindBlocked(who, 'potion'), 'fever blocks rest and regen, not a potion');
  const before = who.hp;
  assert(R.applyHealKind(who, 5, 'rest', 4) === 0 && who.hp === before, 'a rest heal adds nothing while the fever holds');
  assert(R.applyHealKind(who, 2, 'potion', 4) === 8 && who.hp === before + 8, 'a healing potion still lands');
  assert(R.noteCampRest(g, who, 359) === false && who.ratFever === 1, '359 seconds of camp does not cure the fever');
  assert(R.noteCampRest(g, who, 1) === true && !who.ratFever && !g.lvl.flags.ratFever, 'a full 360 seconds of camp cures the fever');
  who.ratFever = 1;
  g.lvl.flags.ratFever = 1;
  who.campRestSec = 0;
  R.cureDisease(g, who);
  assert(!who.ratFever && !g.lvl.flags.ratFever, 'Cure Disease clears rat fever');
})();

assert(R.darkPenalty({ x: 0, y: 0 }, [{ x: 0, y: 0, r: 2, t: 80, magical: 1 }], true) === -4, 'magical darkness is -4 even for a dwarf');
assert(R.darkPenalty({ x: 0, y: 0 }, [{ x: 0, y: 0, r: 2, t: 8 }], true) === 0, 'ordinary darkness still spares a dwarf');
assert(R.darkPenalty({ x: 0, y: 0 }, [{ x: 0, y: 0, r: 2, t: 8 }], false) === -4, 'ordinary darkness penalizes anyone else');

function kingWorld(d100, rng) {
  const king = {
    campaignRole: 'boss', campaignKey: 'goblinKing', name: 'Goblin King', team: 'foe',
    x: 74, y: 67.6, hp: 20, maxhp: 104, room: 'king-hall', range: 0.9, dead: 0
  };
  const hallA = { campaignKey: 'goblin', team: 'foe', x: 69, y: 67, hp: 8, maxhp: 8, room: 'king-hall', dead: 0 };
  const hallB = { campaignKey: 'goblin', team: 'foe', x: 70, y: 68, hp: 8, maxhp: 8, room: 'king-hall', dead: 0 };
  const camp = { campaignKey: 'goblin', team: 'foe', x: 10, y: 10, hp: 8, maxhp: 8, room: 'camp', dead: 0 };
  const hero = { hero: 1, team: 'party', x: 74, y: 72, hp: 40, maxhp: 40, dead: 0, lvl: 1 };
  const g = world({
    ents: [hero, king, hallA, hallB, camp],
    host: { d100: function () { return d100; }, rng: rng || function () { return 0; } }
  });
  return { g: g, king: king, hallA: hallA, hallB: hallB, camp: camp, hero: hero };
}

(function hold() {
  const w = kingWorld(55);
  const n = w.g.ents.length;
  R.kingStep(w.g, w.king);
  assert(w.king.moraleHold === 1 && w.king.moraleChecked === 1 && !w.king.fleeTo && !w.king.called, 'd100 55 holds and does not call the hall');
  R.kingStep(w.g, w.king);
  assert(w.king.moraleHold === 1 && !w.king.fleeTo && w.g.ents.length === n, 'the king does not roll morale again');
})();

(function flee() {
  const w = kingWorld(56, function () { return 0.999; });
  const n = w.g.ents.length;
  R.kingStep(w.g, w.king);
  assert(w.king.moraleHold === 0 && w.king.called === 1 && w.g.ents.length === n, 'a failed morale calls existing goblins and invents none');
  assert(w.hallA.aggro === 99 && w.hallB.aggro === 99 && w.hallA.engaged === 1 && w.camp.aggro == null, 'only king-hall goblins answer, and only as many as exist');
  assert(w.king.fleeTo && w.king.fleeTo.x === 78 && w.king.fleeTo.y === 58, 'he flees through the throne door');
  assert(w.king.fleePath && w.king.fleePath[0].x === 78 && w.king.fleePath[0].y === 53, 'the path ends in the corner room');
  assert(w.g.campaignBark && w.g.campaignBark.speaker === 'KING' && w.g.campaignBark.text === 'Guards! GUARDS! King is busy!', 'the flee line is Quill\'s');
  w.king.onArrive();
  assert(w.king.cornered === 1 && !w.king.fleeTo, 'arriving corners him');
  w.g.lvl._campaignHost.d100 = function () { return 99; };
  R.kingStep(w.g, w.king);
  assert(w.king.cornered === 1 && !w.king.fleeTo && w.king.called === 1, 'a cornered king does not check morale or flee again');
  w.king.dead = 1;
  w.king.hp = 0;
  R.tick(w.g, 0.2);
  assert(w.g.lvl.flags.stairsOpen === 1, 'a dead king opens the stair, even from the back room');
})();

(function kingLines() {
  const w = kingWorld(55);
  w.king.hp = 90;
  w.king.moraleChecked = 1;
  R.onHurt(w.g, w.king);
  R.onHurt(w.g, w.king);
  assert(w.king.kingLines === 'hurt' && w.g.campaignBark.text === 'You scratched the KING?!', 'the hurt line plays once');
  w.king.hp = 0;
  w.king.dead = 1;
  R.onDown(w.g, w.king);
  assert(w.g.campaignBark.speaker === 'KING' && w.g.campaignBark.text === 'Not... my... crown...', 'the death line plays once');
})();

(function target() {
  const king = { campaignRole: 'boss', x: 0, y: 0 };
  const macar = { hero: 1, team: 'party', x: 3, y: 0, dead: 0 };
  const kin = { team: 'party', x: 1, y: 0, dead: 0, ghost: 1 };
  const g = world({ ents: [macar, kin, king] });
  assert(R.kingTarget(king, g) === macar, 'within 4 tiles the king stays on Macar');
  macar.x = 6;
  assert(R.kingTarget(king, g) === kin, 'past 4 tiles he turns on the closer ghost');
})();

function castWorld(shaman, hero) {
  hero = hero || { hero: 1, team: 'party', x: 0, y: 0, hp: 40, maxhp: 40, lvl: 5, dead: 0 };
  const g = world({ ents: [hero, shaman] });
  g.lvl._campaignHost.d20 = function () { return 20; };
  g.lvl._campaignHost.save = function () { g.saves = (g.saves || 0) + 1; return true; };
  return g;
}

(function darkness() {
  const shaman = {
    caster: 1, team: 'foe', spellSet: 'swap', dead: 0, x: 4, y: 0, hp: 36, maxhp: 36, range: 0.8
  };
  const g = castWorld(shaman);
  R.tick(g, 0);
  R.tick(g, 0.5);
  assert(g.darkZones && g.darkZones[0] && g.darkZones[0].t === 80 && g.darkZones[0].magical === 1, 'the warren shaman casts Darkness for 80 s');
})();

(function fear() {
  const shaman = {
    caster: 1, team: 'foe', spellSet: 'swap', dead: 0, x: 0.5, y: 0, hp: 36, maxhp: 36,
    range: 0.8, spellsSpent: 'Darkness'
  };
  const g = castWorld(shaman);
  g.lvl._campaignHost.save = function () { return false; };
  R.tick(g, 0);
  R.tick(g, 0.5);
  const hero = g.ents[0];
  assert(hero.causeFear === 2 && hero.fearT === 2 && hero.fearFlee === 1, 'Cause Fear lasts 2 s after a failed save');
  assert(hero.fleeTo && Math.hypot(hero.fleeTo.x - shaman.x, hero.fleeTo.y - shaman.y) > Math.hypot(hero.x - shaman.x, hero.y - shaman.y), 'the flee point is away from the shaman');
  const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
  const fearSrc = html.slice(html.indexOf('function fearStand('), html.indexOf('function stepFoeFlee('));
  assert(fearSrc.indexOf('function heroFearStep(') > 0 && fearSrc.indexOf('function fearFleePoint(') > 0, 'hero movement has a fear step (old code only set the flag)');
  const ctx = { steerWalk: function (e, dx, dy, sp, dt) {
    const m = Math.hypot(dx, dy) || 1;
    e.x += (dx / m) * sp * dt;
    e.y += (dy / m) * sp * dt;
    e.moving = 1;
  } };
  vm.createContext(ctx);
  vm.runInContext(fearSrc + '\nthis.heroFearStep=heroFearStep; this.fearFleePoint=fearFleePoint; this.releaseHeroFear=releaseHeroFear;', ctx);
  const step = { x: hero.x, y: hero.y, sp: 4, causeFear: 2, fearFlee: 1, fleeTo: { x: hero.fleeTo.x, y: hero.fleeTo.y }, dest: { x: shaman.x, y: shaman.y }, ix: 2, iy: 1 };
  const before = Math.hypot(step.x - shaman.x, step.y - shaman.y);
  assert(ctx.heroFearStep(step, 0.4) === true, 'fear movement accepts the flee point');
  assert(Math.hypot(step.x - shaman.x, step.y - shaman.y) > before + 0.5, 'Macar walks away along the flee point');
  assert(step.dest === null && step.ix === 0, 'stick and tap destinations are ignored while fear holds');
  const quiet = { x: step.x, y: 0, causeFear: 0, fearFlee: 0, fleeTo: null, dest: { x: 9, y: 0 } };
  assert(ctx.heroFearStep(quiet, 0.4) === false && quiet.x === step.x && quiet.dest.x === 9, 'after the flag clears, fear no longer steals the step');
  const upd = html.slice(html.indexOf('function update(dt){'), html.indexOf('function w2s('));
  const fearAt = upd.indexOf('heroFearStep(p, dt)');
  const steerAt = upd.indexOf('steerWalk(p,');
  assert(fearAt > 0 && steerAt > fearAt && upd.indexOf('if(!routed && !feared)') > fearAt, 'the fear step runs instead of player input');
  R.tick(g, 2.1);
  assert(hero.causeFear === 0 && !hero.fearFlee && hero.fleeTo == null && hero.dest == null, 'fear ends cleanly after 2 s');
  const rt = fs.readFileSync(path.join(__dirname, 'CampaignRuntime.js'), 'utf8');
  assert(rt.indexOf("eng('releaseHeroFear')") > 0, 'clearing fear asks the host to unwedge Macar');

  /* Campaign warren at the reported corner. x is offset from 48.
     Away and the ±45/±90 lines sit in rock; the open floor is north and east. */
  function warrenRow(rocks) {
    let s = '';
    for (let i = 0; i < 9; i++) s += i < rocks ? '1' : '0';
    return s;
  }
  const warrenRows = {
    51: warrenRow(2),
    52: warrenRow(3),
    53: warrenRow(5),
    54: warrenRow(6),
    55: warrenRow(8),
    56: warrenRow(9)
  };
  function warrenTile(x, y) {
    const row = warrenRows[Math.floor(y)];
    if (!row) return 1;
    const col = Math.floor(x) - 48;
    if (col < 0 || col >= row.length) return 1;
    return row.charCodeAt(col) - 48;
  }
  function cornerFree(x, y, r) {
    r = r == null ? 0.36 : r;
    const samples = [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r],
      [r * 0.7, r * 0.7], [-r * 0.7, r * 0.7], [r * 0.7, -r * 0.7], [-r * 0.7, -r * 0.7]];
    for (let i = 0; i < samples.length; i++) {
      if (warrenTile(x + samples[i][0], y + samples[i][1]) !== 0) return false;
    }
    return true;
  }
  const walls = {
    canBe: function (x, y, r) { return cornerFree(x, y, r); },
    steerWalk: function (e, dx, dy, sp, dt) {
      const m = Math.hypot(dx, dy) || 1;
      let left = sp * (dt || 0);
      while (left > 0.05) {
        const step = Math.min(0.2, left);
        const nx = e.x + (dx / m) * step, ny = e.y + (dy / m) * step;
        if (!cornerFree(nx, ny, e.r)) break;
        e.x = nx; e.y = ny;
        left -= step;
      }
    }
  };
  vm.createContext(walls);
  vm.runInContext(fearSrc + '\nthis.heroFearStep=heroFearStep; this.fearFleePoint=fearFleePoint; this.releaseHeroFear=releaseHeroFear;', walls);
  const rock = { x: 49.7, y: 56.2 };
  const corner = {
    x: 53, y: 53.9, r: 0.36, sp: 4, causeFear: 2, fearFlee: 1,
    fleeTo: { x: rock.x, y: rock.y }, dest: { x: 54, y: 53 }, ix: 1, iy: 1
  };
  assert(!cornerFree(corner.x, corner.y, corner.r) && !cornerFree(rock.x, rock.y, 0.36), 'the reported corner overlaps the wall and the raw flee point is rock');
  assert(walls.heroFearStep(corner, 0.35) === true, 'fear still owns the step in the corner');
  assert(cornerFree(corner.x, corner.y, corner.r), 'Macar is not left wedged in the corner');
  assert(Math.hypot(corner.x - 53.5, corner.y - 53.5) > 0.45, 'he flees past the unwedge tile instead of standing still');
  assert(corner.fleeTo && cornerFree(corner.fleeTo.x, corner.fleeTo.y, corner.r) && Math.hypot(corner.fleeTo.x - rock.x, corner.fleeTo.y - rock.y) > 1, 'the flee point is a stand, not the rock');
  assert(corner.dest === null && corner.ix === 0, 'player input stays ignored while the corner fear runs');
  const wedged = { x: 53, y: 53.9, r: 0.36, fearFlee: 1, fleeTo: { x: rock.x, y: rock.y }, dest: { x: 4, y: 4 }, moving: 1, ix: 2, iy: 2 };
  walls.releaseHeroFear(wedged);
  assert(wedged.fearFlee === 0 && wedged.fleeTo == null && wedged.dest == null && wedged.moving === 0, 'fear clears after the corner');
  assert(cornerFree(wedged.x, wedged.y, wedged.r) && Math.abs((wedged.x % 1) - 0.5) < 1e-6 && Math.abs((wedged.y % 1) - 0.5) < 1e-6, 'a wedged Macar snaps to the nearest walkable tile center when fear ends');

  const open = {
    x: 10, y: 10, r: 0.36, sp: 4, causeFear: 2, fearFlee: 1,
    fleeTo: { x: 14, y: 10 }, dest: { x: 9, y: 10 }, ix: 3, iy: 1
  };
  const openCtx = {
    canBe: function () { return true; },
    steerWalk: function (e, dx, dy, sp, dt) {
      const m = Math.hypot(dx, dy) || 1;
      e.x += (dx / m) * sp * dt;
      e.y += (dy / m) * sp * dt;
    }
  };
  vm.createContext(openCtx);
  vm.runInContext(fearSrc + '\nthis.heroFearStep=heroFearStep; this.releaseHeroFear=releaseHeroFear;', openCtx);
  const openBefore = open.x;
  assert(openCtx.heroFearStep(open, 0.35) === true, 'open floor still accepts fear');
  assert(open.x > openBefore + 0.8 && Math.abs(open.y - 10) < 0.25, 'open floor flees along the away line');
  assert(open.fleeTo && Math.hypot(open.fleeTo.x - 14, open.fleeTo.y - 10) < 0.35, 'open floor keeps the far flee point');
  const parked = { x: 10, y: 10, r: 0.36, fearFlee: 1, fleeTo: { x: 14, y: 10 }, dest: { x: 1, y: 1 }, moving: 1, ix: 1, iy: 0 };
  openCtx.releaseHeroFear(parked);
  assert(parked.x === 10 && parked.y === 10 && parked.fleeTo == null, 'open floor does not snap a Macar who is already standing');
})();

(function commandRange() {
  const far = {
    caster: 1, team: 'foe', spellSet: 'memorized', dead: 0, x: 4, y: 0, hp: 36, maxhp: 36, range: 0.8
  };
  const g = castWorld(far);
  R.tick(g, 1);
  assert(!far.spellsSpent && !(g.ents[0].stun > 0), 'Command does not reach 4 tiles');
  far.x = 1.5;
  g.saves = 0;
  R.tick(g, 0);
  R.tick(g, 0.2);
  assert(g.ents[0].stun === 1 && !g.saves, 'level 5 takes Command with no save');
  const high = { hero: 1, team: 'party', x: 0, y: 0, hp: 40, maxhp: 40, lvl: 6, dead: 0 };
  const near = {
    caster: 1, team: 'foe', spellSet: 'memorized', dead: 0, x: 1.5, y: 0, hp: 36, maxhp: 36, range: 0.8
  };
  const g6 = castWorld(near, high);
  R.tick(g6, 0);
  R.tick(g6, 0.2);
  assert(g6.saves === 1 && !(high.stun > 0) && String(near.spellsSpent).indexOf('Command') >= 0, 'level 6 saves against Command and the spell is still spent');
})();

(function clw() {
  const shaman = {
    caster: 1, team: 'foe', spellSet: 'memorized', dead: 0, x: 0.4, y: 0, hp: 36, maxhp: 36,
    range: 0.8, spellsSpent: 'Command'
  };
  const g = castWorld(shaman);
  g.lvl._campaignHost.d20 = function () { return 1; };
  g.saves = 0;
  const hero = g.ents[0];
  R.tick(g, 0);
  R.tick(g, 0.6);
  assert(hero.hp === 40 && !g.saves && String(shaman.spellsSpent).indexOf('Cause Light Wounds') >= 0, 'a missed Cause Light Wounds spends the spell and deals nothing');
  shaman.spellsSpent = 'Command';
  shaman._wind = null;
  shaman.spellCd = 0;
  g.lvl._campaignHost.d20 = function () { return 20; };
  R.tick(g, 0);
  R.tick(g, 0.6);
  assert(hero.hp < 40 && !g.saves, 'a landed Cause Light Wounds deals damage with no save');
})();

(function tooth() {
  const g = world({ ents: [mac] });
  const face = { k: 'demonface', itemId: 'grond_tooth_electrum_2', x: 74, y: 59.2, emptySocket: 0 };
  let stowed = null;
  let converted = 0;
  global.stowPackItem = function (it) { stowed = it; };
  global.convertCoinsToElectrum = function () { converted++; };
  const first = R.pryTooth(g, face);
  assert(first.ok === 1 && stowed && stowed.id === 'grond_tooth_electrum_2' && stowed.grondTooth === 'electrum', 'tooth 2 is a distinct electrum tooth');
  const dataTooth = g.lvl.campaignSpec.map.tooth;
  assert(stowed.n === 'Electrum Tooth 2' && stowed.n !== "Grond's Electrum Tooth" && !stowed.cursed && dataTooth.cursed === true && dataTooth.curse === 'coin' && dataTooth.bind === false, 'tooth 2 keeps its name; the data curse converts coins and does not bind');
  assert(g.lvl.flags.electrumTooth2 === 1 && !g.lvl.flags.electrumTooth && face.emptySocket === 1 && converted === 1, 'the pry sets electrumTooth2 and converts coins');
  const second = R.pryTooth(g, face);
  assert(!second.ok && converted === 1, 'the face does not give up a second tooth');
})();

(function barks() {
  const gob = { insultsOnly: 1, team: 'foe', dead: 0, x: 1, y: 0, room: 'den', campaignKey: 'goblin' };
  const hero = { hero: 1, team: 'party', x: 0, y: 0, hp: 20, maxhp: 20, dead: 0 };
  const g = world({ ents: [hero, gob], host: { rng: function () { return 0.55; } } });
  const quiet = R.goblinLines(g);
  assert(quiet.length === 16 && quiet.every(function (line) { return GHOST.indexOf(line) < 0; }), 'ghost lines stay unused until a kin ghost rises');
  R.tickBarks(g, 0);
  assert(g.campaignBark && g.campaignBark.speaker === 'GOBLIN' && GHOST.indexOf(g.campaignBark.text) < 0, 'the first bark is a living-kin insult');
  const first = g.campaignBark.text;
  R.tickBarks(g, 1);
  assert(g.campaignBark.text === first, 'the same room does not bark again inside 6 s');
  g.ents.push({ team: 'party', ghost: 1, hero: 0, dead: 0, x: 2, y: 0 });
  g.lvl._barkAt = {};
  g.campaignBark = null;
  R.tickBarks(g, 0);
  assert(g.campaignBark && GHOST.indexOf(g.campaignBark.text) >= 0, 'a risen kin ghost opens lines 12-15');
})();

(function ribbon() {
  const portrait = { x: 8, y: 8, w: 118, h: 30 };
  const face = { x: 167, y: 390, w: 56, h: 64 };
  const box = R.barkRect(390, 844, portrait, face);
  function hit(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  assert(!hit(box, portrait) && !hit(box, face), 'the phone ribbon misses the portrait and Macar\'s face');
  const pause = { x: 254, y: 8, w: 44, h: 44 };
  const mini = { x: 306, y: 8, w: 76, h: 76 };
  assert(!hit(box, pause) && !hit(box, mini), 'the phone ribbon stays clear of Pause and the minimap');
  assert(box.font && box.font !== 12, 'the phone ribbon font scales with the viewport');
  const laptop = R.barkRect(1280, 800, { x: 16, y: 16, w: 188, h: 50 }, { x: 600, y: 360, w: 80, h: 90 });
  const lapMini = { x: 1280 - Math.round(96 * Math.min(1.3, 800 / 700)) - Math.round(10 * Math.min(1.3, 800 / 700)), y: 8, w: Math.round(96 * Math.min(1.3, 800 / 700)), h: Math.round(96 * Math.min(1.3, 800 / 700)) };
  assert(laptop.x >= 16 + 188 && laptop.y >= 8 && !hit(laptop, lapMini), 'the laptop ribbon sits to the right of the portrait and clear of the minimap');
  assert(laptop.font > 12, 'the laptop ribbon font scales up with the viewport');
})();

(function holdFace() {
  const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
  const img = html.slice(html.indexOf('function demonFaceImg'), html.indexOf('function demonFaceHalf'));
  const tooth = img.indexOf("p.itemId==='grond_tooth_electrum_2'");
  const empty = img.indexOf('SPR.demon_dwarfface_empty');
  assert(tooth > 0 && empty > tooth && img.indexOf('SPR.demon_dwarfface||SPR.demonface') > 0, 'tooth 2 keeps the portrait instead of the chapel empty plate');
  assert(img.indexOf("loadSpriteKeyNow('demon_dwarfface')") > tooth, 'tooth 2 and tooth 3 load the portrait when it is missing');
  const drawFace = html.slice(html.indexOf('function drawDemonDwarfFace'), html.indexOf('function drawFloorDust'));
  assert(drawFace.indexOf("p.itemId==='grond_tooth_electrum_3'") > 0 && drawFace.indexOf('!(img&&img.width)) return;') > 0, 'an unloaded electrum face draws nothing');
  const worldArt = html.slice(html.indexOf('const WORLD_ART_KEYS'), html.indexOf('Object.keys(WORLD_ART_KEYS)'));
  assert(/2:\[[\s\S]*?'demon_dwarfface'/.test(worldArt), 'chapter 2 preloads the demon face');
  const loop = html.slice(html.indexOf('if(typeof tickSpellZones'), html.indexOf('function render('));
  const fleeAt = loop.indexOf('if(!e.hero && e.fleeTo)');
  const stepAt = loop.indexOf('else { stepFoeFlee(e, dt); continue; }');
  const gateAt = loop.indexOf('if(e.hidden || e.sleeping || e.crushed || e.tied)');
  assert(fleeAt >= 0 && gateAt > fleeAt && stepAt > gateAt, 'monster flee runs only after hidden, sleeping, and tied are clear');
  const noz = html.slice(html.indexOf('noz.fleePath=['), html.indexOf('noz.onArrive'));
  assert(/noz\.fleeTo=noz\.fleePath\.shift\(\)/.test(noz), 'Noz still flees on his own path');
  const toothAt = html.indexOf("interact('Take the electrum tooth'");
  const tickAt = html.indexOf('if(L.tick) L.tick(dt);');
  assert(toothAt > tickAt, 'the tooth prompt is armed after other interact prompts');
  const promptFn = html.slice(html.indexOf('function drawPromptBtn'), html.indexOf('function drawHint'));
  assert(/const slop=24/.test(promptFn), 'the phone prompt hit rect has finger slop so the first tap registers');
})();

(function nail() {
  const LC = global.LoreClues;
  const campaign = LC.forEntity({ name: 'Goblin King', campaignKey: 'goblinKing' });
  const book = LC.forEntity({ name: 'Goblin King' });
  assert(campaign == null, 'the campaign king drops no Stolen Throne-Nail');
  assert(book && book.n === 'Stolen Throne-Nail', 'a Book I Goblin King still drops the nail');
})();

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('L2 rules ok');

'use strict';
/**
 * HOLD kills K1–K8 on consumable use.
 * Run: node src/combat/ConsumableKills.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
require('./NecklaceMissiles.js');

const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}
function extractFn(name) {
  const re = new RegExp('function ' + name + '\\([\\s\\S]*?\\n\\}');
  const m = html.match(re);
  if (!m) throw new Error('missing ' + name);
  return m[0];
}

const NM = globalThis.NecklaceMissiles;

/* ---------- K1: Use magic power removes a spent or empty wand ---------- */
{
  const wand = { n: 'Wand of Fire', k: 'wand', charges: 1, d: 'flame' };
  const who = { name: 'Macar', hero: 1, x: 0, y: 0, invisT: 0 };
  const foe = { name: 'Goblin', team: 'foe', x: 2, y: 0, hp: 80, dead: 0 };
  const applied = { n: 0 };
  const ctx = {
    G: {
      packFrom: 'play',
      scene: 'pack',
      packs: { macar: { magic: [wand] } },
      equipped: { wand: wand, necklace: null },
      ents: [foe]
    },
    ADD_SCALE: 4,
    EquipmentSlots: { isEquippable: function () { return true; } },
    NecklaceMissiles: NM,
    who: who,
    sel: wand,
    packSelItem: function () { return ctx.sel; },
    packUser: function () { return who; },
    player: function () { return who; },
    wornSlotOf: function () { return 'wand'; },
    say: function () {},
    nearestFoe: function () { return foe; },
    rollDice: function (n, s, b) { return n * s + (b || 0); },
    damage: function (t, n) { if (t) t.hp -= n || 0; },
    burst: function () {},
    applyEquipped: function () { applied.n++; },
    syncPackTotals: function () {}
  };
  vm.createContext(ctx);
  vm.runInContext(
    [
      'hasActivatedMagicPower', 'removeSpentMagic', 'activatePackMagicPower',
      'useWandByName', 'necklaceHost', 'useMagicItem', 'breakInvisibility'
    ].map(extractFn).join('\n'),
    ctx
  );
  assert(ctx.activatePackMagicPower() === true, 'K1 Use magic power runs');
  assert(wand.charges === 0, 'K1 last wand charge is spent');
  assert(ctx.G.packs.macar.magic.indexOf(wand) < 0, 'K1 empty wand leaves the pack');
  assert(ctx.G.equipped.wand == null, 'K1 empty wand leaves the wand slot');
  assert(applied.n === 1, 'K1 removal calls applyEquipped');

  const dead = { n: 'Wand of Lightning', k: 'wand', charges: 0, d: 'bolt' };
  ctx.G.packs.macar.magic = [dead];
  ctx.G.equipped.wand = dead;
  ctx.sel = dead;
  const said = [];
  ctx.say = function (t) { said.push(t); };
  const before = applied.n;
  ctx.useMagicItem(dead, who, true);
  assert(said.some(function (t) { return /dead wood/i.test(t); }), 'K1 a wand at 0 charges says dead wood');
  assert(ctx.G.packs.macar.magic.indexOf(dead) < 0, 'K1 dead wood leaves the pack');
  assert(ctx.G.equipped.wand == null, 'K1 dead wood clears the equipped wand');
  assert(applied.n > before, 'K1 dead wood calls applyEquipped');
  ctx.removeSpentMagic(dead);
  assert(applied.n > before, 'K1 a second removal is a no-op');
}

/* ---------- K2: necklace tap equips, then removal clears doll ---------- */
{
  const foe = { name: 'Orc', team: 'foe', x: 3, y: 0, hp: 90, dead: 0, r: 0.4 };
  const neck = { n: 'Necklace of Missiles', k: 'wand', charges: 2, d: 'beads' };
  const bag = { magic: [neck] };
  const who = { name: 'Macar', hero: 1, x: 0, y: 0, invisT: 12, invis: 12 };
  const ctx = {
    G: {
      packFrom: 'play',
      packWho: 'macar',
      faceOffer: 0,
      packs: { macar: bag },
      equipped: { necklace: null, wand: null },
      ents: [who, foe]
    },
    ADD_SCALE: 4,
    NecklaceMissiles: NM,
    donned: null,
    who: who,
    packUser: function () { return who; },
    player: function () { return who; },
    packOf: function () { return bag; },
    isPackEquipable: function () { return false; },
    isGhostPack: function () { return false; },
    wornSlotOf: function (it) {
      const eq = ctx.G.equipped || {};
      return eq.necklace === it ? 'necklace' : null;
    },
    equipPackItem: function (it) {
      ctx.donned = it;
      ctx.G.equipped.necklace = it;
      return 'necklace';
    },
    say: function () {},
    nearestFoe: function () { return foe; },
    dist: function (a, b) { return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0)); },
    rollDice: function (n, s, b) { return n * s + (b || 0); },
    savingThrow: function () { return false; },
    damage: function (t, n) { if (t) t.hp -= n || 0; },
    burst: function () {},
    applyEquipped: function () { ctx.applied = (ctx.applied || 0) + 1; },
    syncPackTotals: function () {}
  };
  vm.createContext(ctx);
  vm.runInContext(
    ['removeSpentMagic', 'breakInvisibility', 'necklaceHost', 'useWandByName', 'useMagicItem', 'usePackRow']
      .map(extractFn).join('\n'),
    ctx
  );
  ctx.usePackRow({ kind: 'magic', i: 0, it: neck });
  assert(ctx.donned === neck, 'K2 an unworn necklace goes through equipPackItem');
  assert(bag.magic[0] === neck && neck.charges === 1, 'K2 a remaining bead stays in the pack');
  assert(ctx.G.equipped.necklace === neck, 'K2 the doll keeps the necklace while beads remain');
  assert(who.invisT === 0, 'K6 a bead that lands breaks invisibility');

  who.invisT = 20; who.invis = 20;
  ctx.usePackRow({ kind: 'magic', i: 0, it: neck });
  assert(bag.magic.indexOf(neck) < 0, 'K2 the last bead leaves the pack');
  assert(ctx.G.equipped.necklace == null && ctx.G.equipped.wand == null, 'K2 the last bead clears necklace and wand slots');
  assert(who.invisT === 0, 'K6 the last bead breaks invisibility');

  const kept = { n: 'Necklace of Missiles', k: 'wand', charges: 1, d: 'beads' };
  bag.magic = [kept];
  ctx.G.equipped.necklace = null;
  ctx.G.equipped.wand = null;
  ctx.nearestFoe = function () { return null; };
  ctx.G.ents = [who];
  who.invisT = 15; who.invis = 15;
  const held = ctx.useMagicItem(kept, who, true);
  assert(held == null || held === 'keep', 'K2 no foe keeps the bead (got ' + held + ')');
  assert(kept.charges === 1, 'K2 no foe does not spend a bead');
  assert(who.invisT === 15, 'K6 a bead with no foe does not break invisibility');
}

/* ---------- K3: second oil is kept; phone can take weight ---------- */
{
  const who = { name: 'Macar', lvl: 3, etherealT: 0, etherealPending: 0, hover: 0 };
  const oil = { n: 'Oil of Etherealness', k: 'ethereal' };
  const bag = { potions: [Object.assign({}, oil), Object.assign({}, oil)] };
  const ctx = {
    ADD_SCALE: 4,
    who: who,
    player: function () { return who; },
    say: function () {},
    rollDice: function (n, s, b) { return n * s + (b || 0); },
    partyLevel: function () { return 3; }
  };
  vm.createContext(ctx);
  vm.runInContext(
    ['potionHay', 'endEthereal', 'applyDmgPotion', 'drinkPotion', 'drinkFromPack'].map(extractFn).join('\n'),
    ctx
  );
  const first = ctx.drinkFromPack(bag, 'potions', 0, who);
  assert(first !== 'keep' && bag.potions.length === 1, 'K3 the first oil is consumed');
  assert(who.etherealPending === 1 && who.etherealDelay === 3, 'K3 the first oil starts the delay');
  const second = ctx.drinkFromPack(bag, 'potions', 0, who);
  assert(second === 'keep' && bag.potions.length === 1, 'K3 a second oil ends the effect and is kept');
  assert(!who.etherealPending && !who.etherealT && !who.etherealDelay, 'K3 the second oil clears the ethereal state');

  const promptAt = html.indexOf("interact('Take weight'");
  const resetAt = html.lastIndexOf('PROMPT=null;', promptAt);
  const lootAt = html.indexOf('Loot ', promptAt);
  assert(promptAt > 0 && resetAt > 0 && promptAt > resetAt, 'K3 Take weight is set after the prompt reset');
  assert(lootAt > promptAt, 'K3 Take weight is offered before later prompts');
  assert(/endEthereal\(p\)/.test(html.slice(promptAt, promptAt + 240)), 'K3 Take weight ends ethereal');
}

/* ---------- K4 / K4b: camp spent rows leave; a kept vial returns ---------- */
{
  const who = { name: 'Macar', hero: 1, x: 0, y: 0, stun: 0 };
  const dust = { n: 'Dust of Disappearance', k: 'misc', d: 'vanish' };
  const appear = { n: 'Dust of Appearance', k: 'misc', d: 'show' };
  const feather = { n: 'Feather Token', k: 'misc', d: 'boat' };
  const flask = { n: 'Flask of Curses', k: 'cursed', cursed: 1, d: 'curse' };
  const sneeze = { n: 'Dust of Sneezing and Choking', k: 'cursed', cursed: 1, d: 'choke' };
  const bag = { magic: [dust, appear] };
  const ctx = {
    G: { packFrom: 'camp', packWho: 'macar', faceOffer: 0, ents: [who], equipped: {} },
    ADD_SCALE: 4,
    who: who,
    packUser: function () { return who; },
    player: function () { return who; },
    packOf: function () { return bag; },
    isPackEquipable: function () { return false; },
    isGhostPack: function () { return false; },
    isEquipWeapon: function () { return false; },
    isEquipArmor: function () { return false; },
    say: function () {},
    rollDice: function (n, s, b) { return n * s + (b || 0); },
    damage: function (t, n) { if (t && t.hp != null) t.hp -= n || 0; ctx.dmg = (ctx.dmg || 0) + (n || 0); },
    syncPackTotals: function () {}
  };
  vm.createContext(ctx);
  vm.runInContext(extractFn('useMagicItem') + '\n' + extractFn('usePackRow'), ctx);
  ctx.usePackRow({ kind: 'magic', i: 0, it: dust });
  assert(bag.magic.length === 1 && bag.magic[0] === appear, 'K4 Dust of Disappearance leaves the camp pack');
  ctx.usePackRow({ kind: 'magic', i: 0, it: appear });
  assert(bag.magic.length === 0, 'K4 Dust of Appearance leaves the camp pack');
  bag.magic = [feather, flask];
  ctx.usePackRow({ kind: 'magic', i: 0, it: feather });
  assert(bag.magic.length === 1 && bag.magic[0] === flask, 'K4 Feather Token leaves the camp pack');
  ctx.usePackRow({ kind: 'magic', i: 0, it: flask });
  assert(bag.magic.length === 0, 'K4 Flask of Curses leaves the camp pack');
  bag.magic = [sneeze];
  ctx.usePackRow({ kind: 'magic', i: 0, it: sneeze });
  assert(bag.magic.length === 0, 'K4 Dust of Sneezing leaves the camp pack');

  const carryAt = html.indexOf('(G.carryEffects||[]).forEach');
  const carryEnd = html.indexOf('G.carryEffects=[];', carryAt);
  const carry = html.slice(carryAt, carryEnd);
  const hero = { name: 'Macar', hero: 1 };
  const potion = { n: 'Potion of Giant Control', k: 'giant' };
  const back = { potions: [] };
  const desc = {
    G: { carryEffects: [{ t: 'potion', p: potion }], ents: [hero] },
    drinkPotion: function () { return 'keep'; },
    packOf: function () { return back; }
  };
  vm.createContext(desc);
  vm.runInContext(carry, desc);
  assert(back.potions.length === 1 && back.potions[0] === potion, 'K4b a keep at descent returns the vial to the pack');
}

/* ---------- K5: one-use list, piercing kept with no foe ---------- */
{
  const who = { name: 'Macar', hero: 1, x: 0, y: 0, invisT: 0 };
  const foe = { name: 'Goblin', team: 'foe', x: 2, y: 0, hp: 80 };
  const ctx = {
    G: { equipped: {}, ents: [foe] },
    ADD_SCALE: 4,
    foe: foe,
    dmg: 0,
    who: who,
    player: function () { return who; },
    say: function (t) { ctx.lastSay = t; },
    isEquipWeapon: function () { return false; },
    isEquipArmor: function () { return false; },
    nearestFoe: function () { return ctx.foe; },
    rollDice: function (n, s, b) { return n * s + (b || 0); },
    damage: function (t, n) { ctx.dmg += n || 0; if (t) t.hp -= n || 0; },
    burst: function () {},
    applyHeal: function () {},
    clearPoison: function () {},
    equipPackItem: function () {},
    applyEquipped: function () {},
    wieldWeapon: function () {}
  };
  vm.createContext(ctx);
  vm.runInContext(
    ['breakInvisibility', 'useWandByName', 'useScrollByName', 'necklaceHost', 'useMagicItem'].map(extractFn).join('\n'),
    ctx
  );
  ['Bag of Beans', 'Candle of Invocation', 'Efreeti Bottle', 'Incense of Meditation', "Nolzur's Marvelous Pigments"].forEach(function (n) {
    const ret = ctx.useMagicItem({ n: n, k: 'misc', d: 'once' }, who);
    assert(ret === 'spent', 'K5 ' + n + ' returns spent');
  });
  ['Book of Infinite Spells', 'Deck of Many Things', 'Scarab of Protection', 'Bag of Holding', 'Robe of Useful Items'].forEach(function (n) {
    const ret = ctx.useMagicItem({ n: n, k: 'misc', d: 'stays' }, who);
    assert(ret !== 'spent', 'K5 ' + n + ' is not on the one-use list');
  });
  const pierce = extractFn('useMagicItem').match(/javelin of piercing[\s\S]*?return 'spent';/);
  assert(pierce && /nearestFoe\(e,12\)/.test(pierce[0]), 'K5 Javelin of Piercing reaches 12 tiles');
  ctx.dmg = 0;
  ctx.foe = null;
  who.invisT = 9; who.invis = 9;
  const miss = ctx.useMagicItem({ n: 'Javelin of Piercing', k: 'ammo', d: '1d6+6' }, who);
  assert(miss !== 'spent', 'K5 Javelin of Piercing is kept when there is no foe');
  assert(ctx.dmg === 0 && who.invisT === 9, 'K5 a piercing throw with no foe does no damage and stays invisible');
  ctx.foe = foe;
  ctx.dmg = 0;
  const hit = ctx.useMagicItem({ n: 'Javelin of Piercing', k: 'ammo', d: '1d6+6' }, who);
  assert(hit === 'spent' && ctx.dmg === (6 + 6) * 4, 'K5 Javelin of Piercing is 1d6+6 × ADD_SCALE (got ' + ctx.dmg + ')');
  assert(who.invisT === 0, 'K6 Javelin of Piercing breaks invisibility when it hits');
}

/* ---------- K6: item attacks break invisibility only when they land ---------- */
{
  const who = { name: 'Macar', hero: 1, x: 0, y: 0 };
  const foe = { name: 'Goblin', team: 'foe', x: 2, y: 0, hp: 200, stun: 0 };
  const ctx = {
    G: { equipped: {}, ents: [who, foe] },
    ADD_SCALE: 4,
    foe: foe,
    who: who,
    player: function () { return who; },
    say: function () {},
    isEquipWeapon: function () { return false; },
    isEquipArmor: function () { return false; },
    nearestFoe: function () { return ctx.foe; },
    rollDice: function (n, s, b) { return n * s + (b || 0); },
    damage: function () {},
    burst: function () {},
    applyHeal: function () {},
    clearPoison: function () {},
    equipPackItem: function () {},
    applyEquipped: function () {},
    charmFoeKind: function () { foe.charmed = 1; return true; },
    dist: function (a, b) { return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0)); },
    savingThrow: function () { return false; },
    NecklaceMissiles: NM
  };
  function hide() { who.invisT = 20; who.invis = 20; who.invisRing = 0; }
  vm.createContext(ctx);
  vm.runInContext(
    ['breakInvisibility', 'cancelOneMagicItem', 'necklaceHost', 'useWandByName', 'useScrollByName', 'useMagicItem'].map(extractFn).join('\n'),
    ctx
  );
  hide();
  ctx.useMagicItem({ n: 'Javelin of Lightning', k: 'ammo' }, who);
  assert(who.invisT === 0, 'K6 Javelin of Lightning breaks invisibility');
  hide();
  ctx.foe = null;
  ctx.useMagicItem({ n: 'Javelin of Lightning', k: 'ammo' }, who);
  assert(who.invisT === 20, 'K6 Javelin of Lightning with no foe stays invisible');
  ctx.foe = foe;
  hide();
  ctx.useMagicItem({ n: 'Arrow of Slaying', k: 'ammo' }, who);
  assert(who.invisT === 0, 'K6 Arrow of Slaying breaks invisibility');
  hide();
  ctx.useMagicItem({ n: 'Scroll of Fireball', k: 'scroll', d: 'flame' }, who);
  assert(who.invisT === 0, 'K6 a spell scroll breaks invisibility when the flame hits');
  hide();
  ctx.foe = null;
  ctx.useMagicItem({ n: 'Scroll of Fireball', k: 'scroll', d: 'flame' }, who);
  assert(who.invisT === 20, 'K6 a spell scroll with no foe stays invisible');
  ctx.foe = foe;
  hide();
  ctx.useMagicItem({ n: 'Wand of Fire', k: 'wand', charges: 8, d: 'flame' }, who);
  assert(who.invisT === 0, 'K6 a wand zap breaks invisibility');
  hide();
  ctx.useMagicItem({ n: 'Wand of Paralyzation', k: 'wand', charges: 4, d: 'stun' }, who);
  assert(who.invisT === 0 && foe.stun > 0, 'K6 a wand hex breaks invisibility');
  hide();
  ctx.useMagicItem({ n: 'Rod of Beguiling', k: 'wand', charges: 4, d: 'charm' }, who);
  assert(who.invisT === 0, 'K6 a charm wand breaks invisibility');
  hide();
  ctx.foe = null;
  ctx.charmFoeKind = function () { return false; };
  ctx.useMagicItem({ n: 'Wand of Fire', k: 'wand', charges: 8, d: 'flame' }, who);
  assert(who.invisT === 20, 'K6 a wand with no foe stays invisible');
  ctx.foe = foe;
  hide();
  foe.gear = { magicAtk: 2, magicAc: 1 };
  ctx.useMagicItem({ n: 'Wand of Negation', k: 'wand', charges: 6, d: 'negate' }, who);
  assert(who.invisT === 0 && foe.gear.magicAtk === 0, 'K6 Wand of Negation breaks invisibility on a foe');
  hide();
  foe.gear = null;
  ctx.useMagicItem({ n: 'Wand of Negation', k: 'wand', charges: 6, d: 'negate' }, who);
  assert(who.invisT === 20, 'K6 Wand of Negation with no foe gear stays invisible');
  hide();
  foe.gear = { magicAtk: 3, magicAc: 1 };
  ctx.useMagicItem({ n: 'Rod of Cancellation', k: 'wand', charges: 4, d: 'cancel' }, who);
  assert(who.invisT === 0 && foe.gear.magicAtk === 0, 'K6 Rod of Cancellation breaks invisibility on a foe');
  hide();
  foe.gear = null;
  ctx.useMagicItem({ n: 'Rod of Cancellation', k: 'wand', charges: 4, d: 'cancel' }, who);
  assert(who.invisT === 20, 'K6 Rod of Cancellation with no enchanted foe stays invisible');
}

/* ---------- K7: unfed camp copy ---------- */
{
  assert(/Macar camps\. Already whole\./.test(html), 'K7 the already-whole line stays for a whole party');
  assert(/Macar camps\. Hit points restored\./.test(html), 'K7 the restored line stays');
  assert(/Macar camps\. No rations, no healing\./.test(html), 'K7 the unfed line is in the camp hint');
  assert(/Rations ran short;/.test(html), 'K7b the short-rations line is in the camp hint');

  function rest(ents, fed) {
    const p = ents[0];
    const ctx = {
      G: { sleepShow: null, fightOn: 0, day: 3, ents: ents },
      ADD_SCALE: 4,
      lines: [],
      lastHint: '',
      player: function () { return p; },
      nearestFoe: function () { return null; },
      openPassagesAt: function () { return false; },
      say: function (t) { ctx.lines.push(t); },
      hint: function (t) { ctx.lastHint = t; },
      takePartyRation: function () { return typeof fed === 'function' ? fed() : fed; },
      applyHeal: function (e) { e.hp = e.maxhp; return 1; },
      restoreBorrowedGear: function () { return 0; },
      tryPordoomGifts: function () {},
      writeGameSave: function () {}
    };
    vm.createContext(ctx);
    vm.runInContext(extractFn('campRest'), ctx);
    ctx.campRest();
    return ctx;
  }
  const hurt = rest([{ team: 'party', name: 'Macar', dead: 0, ghost: 0, hp: 4, maxhp: 20, x: 1, y: 1 }], 'no valid target');
  assert(hurt.lastHint === 'Macar camps. No rations, no healing. The book is marked.', 'K7 a hurt unfed party hears No rations, no healing');
  assert(hurt.G.ents[0].hp === 4, 'K7 an unfed member does not heal');
  const whole = rest([{ team: 'party', name: 'Macar', dead: 0, ghost: 0, hp: 20, maxhp: 20, x: 1, y: 1 }], 'fed');
  assert(/Already whole\./.test(whole.lastHint), 'K7 a fed whole party still hears Already whole');
  const healed = rest([{ team: 'party', name: 'Macar', dead: 0, ghost: 0, hp: 4, maxhp: 20, x: 1, y: 1 }], 'fed');
  assert(/Hit points restored\./.test(healed.lastHint) && healed.G.ents[0].hp === 20, 'K7 a fed hurt party still heals');
  let left = 2;
  const party = ['Macar', 'Borg', 'Tal', 'Dur'].map(function (name) {
    return { team: 'party', name: name, dead: 0, ghost: 0, hp: 4, maxhp: 20, x: 1, y: 1 };
  });
  const partial = rest(party, function () {
    if (left > 0) { left--; return 'fed'; }
    return 'no valid target';
  });
  assert(partial.lastHint === 'Macar camps. Rations ran short; 2 went unhealed. The book is marked.',
    'K7b a party of 4 with 2 rations says who went unhealed (got ' + partial.lastHint + ')');
  assert(party[0].hp === 20 && party[1].hp === 20, 'K7b the two who ate are healed');
  assert(party[2].hp === 4 && party[3].hp === 4, 'K7b the two without rations stay hurt');
}

/* ---------- K8: a controlled foe shoots as the party ---------- */
{
  const ctx = {
    G: { shots: [] },
    ang: function (x, y) { return Math.atan2(y, x); }
  };
  vm.createContext(ctx);
  vm.runInContext(extractFn('shoot'), ctx);
  const controlled = ctx.shoot({ x: 0, y: 0, team: 'foe', controlT: 4 }, 3, 0, 6, 'arrow', '#fff', 9);
  assert(controlled.team === 'party', 'K8 a controlled archer shoots as the party');
  const charmed = ctx.shoot({ x: 0, y: 0, team: 'foe', charmed: 1 }, 3, 0, 4, 'web', '#ccc', 8);
  assert(charmed.team === 'party', 'K8 a charmed web spider shoots as the party');
  const foe = ctx.shoot({ x: 0, y: 0, team: 'foe' }, 3, 0, 6, 'arrow', '#fff', 9);
  assert(foe.team === 'foe', 'K8 an uncontrolled foe still shoots as a foe');
  const party = ctx.shoot({ x: 0, y: 0, team: 'party' }, 3, 0, 6, 'arrow', '#fff', 9);
  assert(party.team === 'party', 'K8 a party shot stays on the party team');
}

if (failed) { console.error('\n' + failed + ' failed'); process.exit(1); }
console.log('\nconsumable kill checks passed');

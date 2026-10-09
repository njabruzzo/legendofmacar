'use strict';
/**
 * Every consumable key: use applies an effect, or says there is no valid
 * target and keeps the item, then the stack count drops by one.
 * Run: node src/combat/ConsumableUse.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
require('../loot/DmgPotions.js');
const DP = globalThis.DmgPotions;
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

const potStart = html.indexOf('const POTIONS=[');
const potEnd = html.indexOf('\n];', potStart);
const potBody = html.slice(potStart, potEnd);
const campaign = [];
potBody.split('\n').forEach(function (line) {
  const n = line.match(/n:'((?:\\'|[^'])*)'/);
  const k = line.match(/k:'([^']*)'/);
  if (!n || !k) return;
  campaign.push({ n: n[1].replace(/\\'/g, "'"), k: k[1] });
});
assert(campaign.length > 100, 'campaign potion table parsed (' + campaign.length + ')');

const herbsFn = html.match(/const HERBS=\[[\s\S]*?\n\];/)[0];
const herbs = [];
herbsFn.replace(/n:(?:'((?:\\'|[^'])*)'|"([^"]*)")/g, function (_, a, b) {
  herbs.push((a || b).replace(/\\'/g, "'"));
});
assert(herbs.length === 30, 'thirty herbs are consumable keys');

const rows = campaign.concat(DP.TABLE.map(function (r) { return { n: r.n, k: r.k }; }));

const ctx = {
  G: { ents: [], loot: [] },
  ADD_SCALE: 4,
  say: function () {},
  ftext: function () {},
  burst: function () {},
  hint: function () {},
  player: function () { return ctx.who; },
  partyLevel: function () { return 3; },
  nearestFoe: function () { return null; },
  rollDice: function (n, s, b) { return n * s + (b || 0); },
  rollDmgPotion: function () { return { n: 'Healing', k: 'heal' }; },
  savingThrow: function () { return false; },
  damage: function (t, n) { if (t && t.hp != null) t.hp -= (n || 0); },
  applyHeal: function (e, n) { if (e) e.hp = (e.hp || 0) + (n || 0); return n || 0; },
  clearPoison: function (e) { if (e) e.poisonT = 0; },
  ri: function () { return 1; },
  rollExpr: function () { return 1; },
  gain: function () {},
  packOwner: function () { return 'macar'; },
  packOf: function () { return ctx.bag; },
  syncPackTotals: function () {},
  DmgPotions: DP
};
vm.createContext(ctx);
vm.runInContext(
  extractFn('potionHay') +
  extractFn('charmFoeKind') +
  extractFn('applyDmgPotion') +
  extractFn('drinkPotion') +
  extractFn('drinkFromPack') +
  extractFn('useStackConsumable') +
  extractFn('feedOneRation') +
  extractFn('hasMind') +
  extractFn('surpriseBlockedByEsp') +
  extractFn('minimapShowsFoe') +
  extractFn('treasureMarksFor') +
  herbsFn + ';' +
  extractFn('useHerb'),
  ctx
);

function who() {
  return { name: 'Macar', hero: 1, hp: 40, maxhp: 80, sp: 4, cd: 1, x: 0, y: 0, lvl: 3, team: 'party' };
}

rows.forEach(function (row) {
  ctx.who = who();
  ctx.G.ents = [];
  ctx.bag = { potions: [{ n: row.n, k: row.k }, { n: row.n, k: row.k }] };
  let res;
  try { res = ctx.drinkFromPack(ctx.bag, 'potions', 0, ctx.who); }
  catch (err) { assert(false, row.n + ' drink threw ' + err.message); return; }
  if (res === 'keep' || res === 'no valid target') {
    assert(ctx.bag.potions.length === 2, row.n + ' with no valid target stays in the pack');
  } else {
    assert(ctx.bag.potions.length === 1, row.n + ' leaves the pack (left ' + ctx.bag.potions.length + ', ' + res + ')');
    assert(!!res && res !== 'missing', row.n + ' applies an effect');
  }
});

ctx.who = who();
const giant = { name: 'Hill Giant', kind: 'giant', team: 'foe', x: 4, y: 0, hp: 40, stun: 0 };
ctx.G.ents = [giant];
ctx.bag = { potions: [{ n: 'Giant Control', k: 'giantctrl' }, { n: 'Giant Control', k: 'giantctrl' }] };
let held = ctx.drinkFromPack(ctx.bag, 'potions', 0, ctx.who);
assert(held !== 'keep' && giant.controlT > 0 && ctx.bag.potions.length === 1, 'giant control spends on a giant');

ctx.who = who();
const ogre = { name: 'Ogre', kind: 'ogre', team: 'foe', x: 4, y: 0, hp: 40 };
ctx.G.ents = [ogre];
ctx.bag = { potions: [{ n: 'Giant Control', k: 'giantctrl' }, { n: 'Giant Control', k: 'giantctrl' }] };
held = ctx.drinkFromPack(ctx.bag, 'potions', 0, ctx.who);
assert(held === 'keep' && !ogre.charmed && ctx.bag.potions.length === 2, 'ogre control keeps the vial');

ctx.who = who();
ctx.G.ents = [];
ctx.bag = { potions: [{ n: 'Speed', k: 'haste' }, { n: 'Speed', k: 'haste' }] };
const sped = ctx.drinkFromPack(ctx.bag, 'potions', 0, ctx.who);
assert(sped !== 'keep' && ctx.who.ageYears === 51 && ctx.bag.potions.length === 1, 'speed ages and leaves the pack');

ctx.who = who();
ctx.bag = { potions: [{ n: 'ESP', k: 'esp' }] };
ctx.drinkFromPack(ctx.bag, 'potions', 0, ctx.who);
assert(ctx.who.espT > 0, 'ESP sets espT');

ctx.who = who();
ctx.bag = { potions: [{ n: 'Treasure Finding', k: 'treasure' }] };
ctx.drinkFromPack(ctx.bag, 'potions', 0, ctx.who);
assert(ctx.who.treasureT >= 50, 'treasure finding sets treasureT');

ctx.who = who();
ctx.bag = { potions: [{ n: 'Oil of Etherealness', k: 'ethereal' }] };
ctx.drinkFromPack(ctx.bag, 'potions', 0, ctx.who);
assert(ctx.who.etherealPending === 1 && ctx.who.etherealDelay === 3 && ctx.who.hover === 1, 'ethereal oil waits 3 rounds');

herbs.forEach(function (name) {
  ctx.who = who();
  ctx.bag = { herbs: {} };
  ctx.bag.herbs[name] = 2;
  let res;
  try { res = ctx.useHerb(name, ctx.who); }
  catch (err) { assert(false, name + ' threw ' + err.message); return; }
  const left = ctx.bag.herbs[name] || 0;
  assert(left === 1, name + ' decrements one (left ' + left + ')');
  assert(!!res && res !== 'missing', name + ' applies ' + res);
});

['bombs', 'burps', 'ales', 'ammo', 'torches'].forEach(function (field) {
  ctx.bag = {};
  ctx.bag[field] = 2;
  const res = ctx.useStackConsumable(ctx.bag, field);
  assert(res === field && ctx.bag[field] === 1, field + ' stack drops by one');
});
ctx.bag = { torches: 0 };
assert(ctx.useStackConsumable(ctx.bag, 'torches') === 'no valid target', 'an empty stack is not consumed');

ctx.bag = { rations: 2 };
assert(ctx.feedOneRation(ctx.bag) === 'fed' && ctx.bag.rations === 1, 'a camp ration is eaten');
ctx.bag = { rations: 0 };
assert(ctx.feedOneRation(ctx.bag) === 'no valid target' && ctx.bag.rations === 0, 'no ration is not invented');

assert(ctx.hasMind({ kind: 'goblin', name: 'Goblin' }) === true, 'a goblin has a mind');
assert(ctx.hasMind({ kind: 'skeleton', name: 'Skeleton' }) === false, 'a skeleton has no mind for ESP');
const hero = { x: 0, y: 0, espT: 20 };
assert(ctx.surpriseBlockedByEsp(hero, { kind: 'goblin', name: 'Goblin', x: 4, y: 0 }) === true, 'ESP blocks surprise');
assert(ctx.surpriseBlockedByEsp(hero, { kind: 'skeleton', name: 'Skeleton', x: 4, y: 0 }) === false, 'ESP does not read a skeleton');
assert(ctx.minimapShowsFoe(hero, { team: 'foe', kind: 'goblin', name: 'Goblin', x: 10, y: 0, dead: 0 }) === true,
  'ESP marks a minded foe through walls');
assert(ctx.minimapShowsFoe(hero, { team: 'foe', kind: 'skeleton', name: 'Skeleton', x: 4, y: 0, dead: 0 }) === false,
  'ESP does not mark a skeleton');
ctx.G.loot = [{ x: 10, y: 0, gone: 0 }, { x: 4, y: 0, gone: 0, opened: 1 }, { x: 90, y: 0, gone: 0 }];
const marks = ctx.treasureMarksFor({ x: 0, y: 0, treasureT: 60 });
assert(marks.length === 1 && marks[0].x === 10, 'treasure finding marks an unopened cache inside 48');

const speedFn = extractFn('applyDmgPotion');
assert(/moveMul:2\.0/.test(speedFn), 'speed source is moveMul 2.0');
assert(!/giant\|ogre/.test(speedFn), 'giant control source has no ogre');
assert(/espT/.test(speedFn) && /treasureT/.test(speedFn) && /etherealDelay/.test(speedFn),
  'ESP, treasure, and ethereal timers are written');
assert(/moveMul:2\.0/.test(extractFn('useHerb')), 'herb haste source is moveMul 2.0');
const packFn = extractFn('usePackRow');
assert(/Necklace of Missiles/.test(packFn) && /useMagicItem\(it, who, true\)/.test(packFn),
  'a necklace tap fires a bead');
assert(/G\.throwRow/.test(packFn) && /G\.throwRow/.test(extractFn('throwBomb')),
  'a tapped burp row is the throw');
assert(/Eaten at camp/.test(packFn), 'rations say they are eaten at camp');
assert(/The torch is spent/.test(packFn), 'a torch tap spends one torch');
assert(/ASSET_VER='130'/.test(html), 'ASSET_VER stays 130');

if (failed) { console.error('\n' + failed + ' failed'); process.exit(1); }
console.log('\nconsumable use checks passed');

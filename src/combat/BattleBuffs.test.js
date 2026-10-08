/**
 * One-battle buff queue. Not wired into play.
 * Run: node src/combat/BattleBuffs.test.js
 */
'use strict';
const B = require('./BattleBuffs');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

function dust() { return { id: 'pixie_dust', k: 'haste', n: 'Pixie Dust' }; }
function egg(n) { return { id: 'golden_egg_' + n, k: 'egg', n: 'Golden Egg' }; }
function anti() { return { id: 'antitoxin', k: 'antitoxin', n: 'Antitoxin' }; }

assert(B.wired === false && B.CAP === 300, 'module is unwired and the cap is 300 seconds');

const state = B.create(0);
const pack = [dust(), egg(1), egg(2)];
const used = B.use(state, pack, pack[0], 10);
assert(used.ok && used.buff.state === 'armed', 'dust used outside a fight is armed');
assert(pack.length === 2 && pack[0].k === 'egg', 'the dust left the pack');
assert(B.moveMul(state, 1) === 1, 'an armed haste does not change movement yet');

B.beginFight(state, { name: 'rat' });
assert(state.fightOn === 1 && state.battleBuffs[0].state === 'active', 'beginFight starts the armed buff');
assert(B.moveMul(state, 1) === 2 && B.cdMul(state, 1) === 0.5, 'active haste is moveMul 2 and cdMul 0.5');
assert(B.effects(state).ageing === 0, 'pixie dust does not age Macar');
assert(B.moveMul(state, 1.35) === 2, 'haste does not stack with a Speed potion; the higher moveMul wins');
assert(B.moveMul(state, 2) === 2, 'haste does not stack with Boots of Speed');
assert(B.cdMul(state, 0.5) === 0.5, 'haste does not multiply Speed attack cooldown');

B.endFightIfClear(state);
assert(state.fightOn === 0 && state.battleBuffs.length === 0, 'endFightIfClear removes the active buff');

const mid = B.create(0);
const pack2 = [dust()];
mid.fightOn = 1;
const inFight = B.use(mid, pack2, pack2[0], 3);
assert(inFight.buff.state === 'active' && pack2.length === 0, 'dust used in a fight starts active and leaves the pack');

const eggs = B.create(0);
const carton = [egg(1), egg(2)];
assert(B.use(eggs, carton, carton[0], 1).ok, 'first egg is accepted');
const blocked = B.use(eggs, carton, carton[0], 2);
assert(!blocked.ok && blocked.reason === 'egg-blocked', 'a second egg is blocked while one is queued');
assert(carton.length === 1 && carton[0].id === 'golden_egg_2', 'the blocked egg stays in the pack');
B.beginFight(eggs);
assert(B.acDelta(eggs) === -4, 'an active egg is AC -4');
assert(B.active(eggs, 'egg').length === 1, 'only one egg is active');
assert(B.use(eggs, carton, carton[0], 3).reason === 'egg-blocked', 'a second egg is blocked while one is active');
B.endFightIfClear(eggs);
assert(B.acDelta(eggs) === 0, 'the egg bonus ends with the fight');
assert(B.use(eggs, carton, carton[0], 4).ok, 'a later egg can be used after the first ends');

const dead = B.create(0);
const pocket = [dust()];
B.use(dead, pocket, pocket[0], 1);
B.onDeath(dead);
assert(dead.battleBuffs.length === 0 && dead.dead === 1, 'death clears armed and active buffs');

const floor = B.create(0);
const pocket2 = [dust()];
B.use(floor, pocket2, pocket2[0], 1);
B.beginFight(floor);
B.onFloorChange(floor, 2);
assert(floor.battleBuffs.length === 0 && floor.floor === 2 && floor.fightOn === 0, 'a floor change clears buffs');

const cap = B.create(0);
const pocket3 = [dust()];
B.use(cap, pocket3, pocket3[0], 0);
assert(cap.battleBuffs[0].state === 'armed' && cap.battleBuffs[0].t0 == null, 'an armed buff has no timer');
B.expire(cap, 10000);
assert(cap.battleBuffs.length === 1 && cap.battleBuffs[0].state === 'armed', 'an armed buff waits through a long stretch with no fight');
B.beginFight(cap, { name: 'rat' }, 10000);
assert(cap.battleBuffs[0].state === 'active' && cap.battleBuffs[0].t0 === 10000, 'the 300 second cap starts at beginFight');
B.expire(cap, 10300);
assert(cap.battleBuffs.length === 1, 'the cap still holds at exactly 300 seconds of fighting');
B.expire(cap, 10300.01);
assert(cap.battleBuffs.length === 0, 'the cap drops the buff after 300 seconds of fighting');

const antiState = B.create(0);
const vials = [anti()];
const drank = B.use(antiState, vials, vials[0], 5);
assert(drank.ok && drank.endsPoisonSlow && vials.length === 0, 'antitoxin leaves the pack and flags the poison slow');
B.beginFight(antiState);
assert(B.effects(antiState).poisonSavePlus === 4, 'antitoxin is +4 on poison saves while active');

const missing = B.use(B.create(0), [], dust(), 0);
assert(!missing.ok && missing.reason === 'missing', 'a missing item is not a use');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('battle buffs ok');

/**
 * Spider poison H1. Not wired into play.
 * Run: node src/combat/SpiderPoison.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const P = require('./SpiderPoison');
const B = require('./BattleBuffs');
const T = require('../campaign/CampaignTable');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

assert(P.wired === false && P.POISON_MODE === 'h1', 'poison mode is h1 and unwired');

const src = fs.readFileSync(path.join(__dirname, 'SpiderPoison.js'), 'utf8');
assert(src.indexOf('1d6') < 0 && src.indexOf('1d4') < 0, 'the module has no damage-over-time dice');
assert(!/mode\s*===\s*['"]raw['"]/.test(src) && !/mode\s*===\s*['"]h2['"]/.test(src), 'there is no raw or h2 branch');

let threw = 0;
try { P.resolve({ hp: 40 }, { mode: 'raw', spider: 'spider', level: 4, con: 16, roll: 1 }); }
catch (e) { threw++; }
try { P.resolve({ hp: 40 }, { mode: 'h2', spider: 'spider', level: 4, con: 16, roll: 1 }); }
catch (e) { threw++; }
assert(threw === 2, 'raw and h2 are rejected');

const big = P.failedSave(100);
assert(big.damage === 50 && big.hp === 50 && big.killed === false, '100 HP takes 50 and does not die');
assert(big.slow.moveMul === 0.5 && big.slow.seconds === 2, 'the slow is moveMul 0.5 for 2 seconds');

const odd = P.failedSave(7);
assert(odd.rolledDamage === 3 && odd.hp === 4, 'floor of half of 7 is 3');

const one = P.failedSave(1);
assert(one.hp === 1 && one.killed === false && one.damage === 0 && one.slow.seconds === 2, '1 HP stays at 1, still slowed, and does not die');

const two = P.failedSave(2);
assert(two.hp === 1 && two.damage === 1 && two.killed === false, '2 HP falls to 1');

const ghost = P.resolve({ hp: 20, ghost: true }, { spider: 'spiderQueen', level: 4, con: 16, roll: 1 });
assert(ghost.immune && ghost.hp === 20 && ghost.slow == null && ghost.damage === 0, 'a ghost is immune');

const kin = P.resolve({ hp: 40, kin: true }, { spider: 'spiderGiant', level: 4, con: 16, roll: 1 });
assert(!kin.saved && kin.hp === 20 && kin.slow.moveMul === 0.5, 'kin take the same failed-save result');

function target(level, spider) {
  return P.saveTarget({ level: level, con: 16, spider: spider });
}
assert(P.poisonSave === T.poisonSave, 'SpiderPoison uses CampaignTable.poisonSave');
assert(T.poisonSave.large === 2 && T.poisonSave.huge === 1 && T.poisonSave.giant === 0, 'size modifiers are large +2, huge +1, giant 0');
assert(T.poisonSave.phase === -2 && T.poisonSave.queen === -2, 'phase and the Queen are -2');
assert(P.fighterPoisonBase(9) === 8 && P.fighterPoisonBase(10) === 8, 'F9-F10 poison base is the PHB fighter 8');
assert(P.POISON_BASE[3].from === 9 && P.POISON_BASE[3].to === 10 && P.POISON_BASE[3].base === 8, 'the F9-F10 band is explicit in the grid');
assert([target(4, 'spider'), target(4, 'spiderHuge'), target(4, 'spiderGiant'), target(4, 'phasespider')].join() === '7,8,9,11', 'F4 row at CON 16');
assert(target(4, 'spiderQueen') === 11, 'F4 Queen matches the phase spider');
assert([target(5, 'spider'), target(5, 'spiderHuge'), target(5, 'spiderGiant'), target(5, 'phasespider')].join() === '5,6,7,9', 'F5 row at CON 16');
assert([target(6, 'spider'), target(6, 'spiderHuge'), target(6, 'spiderGiant'), target(6, 'phasespider')].join() === '5,6,7,9', 'F6 row at CON 16');
assert([target(7, 'spider'), target(7, 'spiderHuge'), target(7, 'spiderGiant'), target(7, 'phasespider')].join() === '4,5,6,8', 'F7 row at CON 16');
assert([target(8, 'spider'), target(8, 'spiderHuge'), target(8, 'spiderGiant'), target(8, 'phasespider')].join() === '4,5,6,8', 'F8 row at CON 16');
assert([target(9, 'spider'), target(9, 'spiderHuge'), target(9, 'spiderGiant'), target(9, 'phasespider')].join() === '2,3,4,6', 'F9 row at CON 16');
assert([target(10, 'spider'), target(10, 'spiderHuge'), target(10, 'spiderGiant'), target(10, 'phasespider')].join() === '2,3,4,6', 'F10 row at CON 16');
assert(P.saveTarget({ level: 4, con: 18, spider: 'spiderGiant' }) === 8, 'CON 18 vs a giant spider at F4 is 8');
assert(P.saveTarget({ level: 4, con: 16, spider: 'spiderGiant', antitoxin: true }) === 5, 'antitoxin vs a giant spider at F4 is 5');
assert(P.saveTarget({ level: 4, con: 16, spider: 'spiderGiant', periaptPlus: 1 }) === 8, 'a periapt bonus also lowers the target');

const sizes = [['spider', 'large'], ['spiderHuge', 'huge'], ['spiderGiant', 'giant'], ['phasespider', 'phase'], ['spiderQueen', 'queen']];
for (let level = 1; level <= 10; level++) {
  sizes.forEach(function (pair) {
    const mod = T.poisonSave[pair[1]];
    const got = P.saveTarget({ level: level, con: 16, spider: pair[0] });
    assert(got === P.fighterPoisonBase(level) - 4 - mod, 'F' + level + ' ' + pair[1] + ' agrees with CampaignTable.poisonSave');
  });
}

assert(/pending Sage ruling/.test(src), 'the save-target floor is marked pending Sage ruling');
assert(P.saveTarget({ level: 10, con: 18, spider: 'spider' }) === 2, 'F10 CON 18 vs a large spider floors at 2');
assert(P.saveTarget({ level: 10, con: 16, spider: 'spider', antitoxin: true, periaptPlus: 1 }) === 2, 'bonuses cannot push the target under 2');
assert(P.saveTarget({ level: 4, con: 16, spider: 'spider' }) === 7, 'a target already above 2 is unchanged');
const naturalOne = P.resolve({ hp: 40 }, { spider: 'spider', level: 10, con: 18, roll: 1 });
assert(!naturalOne.saved && naturalOne.target === 2 && naturalOne.hp === 20, 'a natural 1 fails the floored save');
const meetsFloor = P.resolve({ hp: 40 }, { spider: 'spider', level: 10, con: 18, roll: 2 });
assert(meetsFloor.saved && meetsFloor.hp === 40, 'a roll of 2 meets the floored target');

const saved = P.resolve({ hp: 40 }, { spider: 'spider', level: 4, con: 16, roll: 7 });
assert(saved.saved && saved.hp === 40 && saved.slow == null, 'a roll that meets the F4 large target of 7 saves');
const poisoned = P.resolve({ hp: 40 }, { spider: 'spider', level: 4, con: 16, roll: 6 });
assert(!poisoned.saved && poisoned.hp === 20, 'a roll under the target fails');

const cured = P.cure({ hp: poisoned.hp, slow: poisoned.slow });
assert(cured.slow == null && cured.moveMul === 1 && cured.hp === 20, 'antitoxin ends the slow and leaves the HP loss');

const queue = B.create(0);
const pack = [{ id: 'antitoxin', k: 'antitoxin', n: 'Antitoxin' }];
const drank = B.use(queue, pack, pack[0], 1);
const after = drank.endsPoisonSlow ? P.cure({ hp: 20, slow: { moveMul: 0.5, seconds: 2 } }) : null;
assert(after && after.slow == null, 'using the antitoxin buff ends an H1 slow');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('spider poison ok');

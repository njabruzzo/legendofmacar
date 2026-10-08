/**
 * Spider poison H1. Not wired into play.
 * Run: node src/combat/SpiderPoison.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const P = require('./SpiderPoison');
const B = require('./BattleBuffs');

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
assert(target(4, 'spider') === 7, 'F4 vs large spider needs 7');
assert(target(4, 'spiderHuge') === 8, 'F4 vs huge spider needs 8');
assert(target(4, 'spiderGiant') === 9, 'F4 vs giant spider needs 9');
assert(target(4, 'phasespider') === 11 && target(4, 'spiderQueen') === 11, 'F4 vs phase spider or the Queen needs 11');
assert([target(5, 'spider'), target(6, 'spiderHuge'), target(6, 'spiderGiant'), target(5, 'spiderQueen')].join() === '5,6,7,9', 'F5-F6 row');
assert([target(7, 'spider'), target(8, 'spiderHuge'), target(7, 'spiderGiant'), target(8, 'spiderQueen')].join() === '4,5,6,8', 'F7-F8 row');
assert(P.saveTarget({ level: 4, con: 18, spider: 'spiderGiant' }) === 8, 'CON 18 is a +5 bonus');
assert(P.saveTarget({ level: 4, con: 16, spider: 'spiderGiant', antitoxin: true }) === 5, 'antitoxin lowers the target by 4');
assert(P.saveTarget({ level: 9, con: 16, spider: 'spiderGiant' }) === 4, 'F9-F10 base 8 less the CON bonus is 4 vs a giant spider');

const saved = P.resolve({ hp: 40 }, { spider: 'spider', level: 4, con: 16, roll: 7 });
assert(saved.saved && saved.hp === 40 && saved.slow == null, 'a roll that meets the target saves');
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

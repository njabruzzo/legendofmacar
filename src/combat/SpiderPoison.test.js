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
assert(P.poisonSave === T.poisonSave, 'SpiderPoison still exposes the printed CampaignTable.poisonSave column');
assert(T.poisonSave.large === 2 && T.poisonSave.huge === 1 && T.poisonSave.giant === 0, 'the printed column stays large +2, huge +1, giant 0');
assert(T.poisonSave.phase === -2 && T.poisonSave.queen === -2, 'the printed phase and Queen column stays -2');
assert(P.SIZE_MOD.large === 2 && P.SIZE_MOD.huge === 3 && P.SIZE_MOD.giant === 4 && P.SIZE_MOD.phase === 6 && P.SIZE_MOD.queen === 6, 'the save adds large +2, huge +3, giant +4, phase +6, queen +6');
assert(P.fighterPoisonBase(1) === 14 && P.fighterPoisonBase(2) === 14, 'F1-F2 poison base is 14');
assert(P.fighterPoisonBase(3) === 13 && P.fighterPoisonBase(4) === 13, 'F3-F4 poison base is 13');
assert(P.fighterPoisonBase(5) === 11 && P.fighterPoisonBase(6) === 11, 'F5-F6 poison base is 11');
assert(P.fighterPoisonBase(7) === 10 && P.fighterPoisonBase(8) === 10, 'F7-F8 poison base is 10');
assert(P.fighterPoisonBase(9) === 8 && P.fighterPoisonBase(10) === 8, 'F9-F10 poison base is the PHB fighter 8');
assert(P.POISON_BASE[4].from === 9 && P.POISON_BASE[4].to === 10 && P.POISON_BASE[4].base === 8, 'the F9-F10 band is explicit in the grid');
assert([target(1, 'spider'), target(2, 'spider'), target(3, 'spider')].join() === '12,12,11', 'F1 and F2 use 14, and F3 uses 13');
assert([target(4, 'spider'), target(4, 'spiderHuge'), target(4, 'spiderGiant'), target(4, 'phasespider')].join() === '11,12,13,15', 'F4 row at CON 16');
assert(target(4, 'spiderQueen') === 15, 'F4 Queen matches the phase spider');
assert([target(5, 'spider'), target(5, 'spiderHuge'), target(5, 'spiderGiant'), target(5, 'phasespider')].join() === '9,10,11,13', 'F5 row at CON 16');
assert([target(6, 'spider'), target(6, 'spiderHuge'), target(6, 'spiderGiant'), target(6, 'phasespider')].join() === '9,10,11,13', 'F6 row at CON 16');
assert([target(7, 'spider'), target(7, 'spiderHuge'), target(7, 'spiderGiant'), target(7, 'phasespider')].join() === '8,9,10,12', 'F7 row at CON 16');
assert([target(8, 'spider'), target(8, 'spiderHuge'), target(8, 'spiderGiant'), target(8, 'phasespider')].join() === '8,9,10,12', 'F8 row at CON 16');
assert([target(9, 'spider'), target(9, 'spiderHuge'), target(9, 'spiderGiant'), target(9, 'phasespider')].join() === '6,7,8,10', 'F9 row at CON 16');
assert([target(10, 'spider'), target(10, 'spiderHuge'), target(10, 'spiderGiant'), target(10, 'phasespider')].join() === '6,7,8,10', 'F10 row at CON 16');
assert(P.conBonus(3) === 0 && P.conBonus(0) === 0, 'CON below 4 is +0');
assert(P.conBonus(4) === 1 && P.conBonus(6) === 1, 'CON 4-6 is +1');
assert(P.conBonus(7) === 2 && P.conBonus(10) === 2, 'CON 7-10 is +2');
assert(P.conBonus(11) === 3 && P.conBonus(13) === 3, 'CON 11-13 is +3');
assert(P.conBonus(14) === 4 && P.conBonus(17) === 4, 'CON 14-17 is +4');
assert(P.conBonus(18) === 5, 'CON 18 is +5');
const lowSave = P.resolve({ hp: 40 }, { spider: 'spider', level: 3, con: 10, roll: 1 });
assert(lowSave && lowSave.saved === false && lowSave.target === 13 && lowSave.immune === false, 'CON 10 still rolls the poison save');
const floorCon = P.resolve({ hp: 40 }, { spider: 'spider', level: 3, con: 3, roll: 20 });
assert(floorCon && floorCon.saved === true && floorCon.target === 15, 'CON below 4 is +0 and the save still happens');
assert(P.saveTarget({ level: 3, con: 18, spider: 'spider' }) === 10, 'F3 CON 18 versus large is 13 - 5 + 2');
assert(P.saveTarget({ level: 4, con: 18, spider: 'spiderGiant' }) === 12, 'CON 18 vs a giant spider at F4 is 12');
assert(P.saveTarget({ level: 4, con: 16, spider: 'spiderGiant', antitoxin: true }) === 9, 'antitoxin vs a giant spider at F4 is 9');
assert(P.saveTarget({ level: 4, con: 16, spider: 'spiderGiant', periaptPlus: 1 }) === 12, 'a periapt bonus also lowers the target');

const sizes = [['spider', 'large'], ['spiderHuge', 'huge'], ['spiderGiant', 'giant'], ['phasespider', 'phase'], ['spiderQueen', 'queen']];
for (let level = 1; level <= 10; level++) {
  sizes.forEach(function (pair) {
    const mod = P.SIZE_MOD[pair[1]];
    const got = P.saveTarget({ level: level, con: 16, spider: pair[0] });
    assert(got === P.fighterPoisonBase(level) - 4 + mod, 'F' + level + ' ' + pair[1] + ' adds the size modifier');
  });
}

assert(/6 #12/.test(src) && src.indexOf('pending Sage ruling') < 0, 'the save-target floor cites 6 #12');
assert(P.saveTarget({ level: 10, con: 18, spider: 'spider' }) === 5, 'F10 CON 18 vs a large spider is 5');
assert(P.saveTarget({ level: 10, con: 18, spider: 'spider', antitoxin: true, periaptPlus: 4 }) === 2, 'bonuses cannot push the target under 2');
assert(P.saveTarget({ level: 10, con: 16, spider: 'spider', antitoxin: true, periaptPlus: 1 }) === 2, 'a smaller bonus stack still floors at 2');
assert(P.saveTarget({ level: 4, con: 16, spider: 'spider' }) === 11, 'a target already above 2 is unchanged');
const naturalOne = P.resolve({ hp: 40 }, { spider: 'spider', level: 10, con: 18, antitoxin: true, periaptPlus: 4, roll: 1 });
assert(!naturalOne.saved && naturalOne.target === 2 && naturalOne.hp === 20, 'a natural 1 fails the floored save');
const meetsFloor = P.resolve({ hp: 40 }, { spider: 'spider', level: 10, con: 18, antitoxin: true, periaptPlus: 4, roll: 2 });
assert(meetsFloor.saved && meetsFloor.hp === 40, 'a roll of 2 meets the floored target');
const naturalAbove = P.resolve({ hp: 40 }, { spider: 'spider', level: 3, con: 18, roll: 1 });
assert(!naturalAbove.saved && naturalAbove.target === 10 && naturalAbove.hp === 20, 'a natural 1 fails when the target is above the floor');

const saved = P.resolve({ hp: 40 }, { spider: 'spider', level: 4, con: 16, roll: 11 });
assert(saved.saved && saved.hp === 40 && saved.slow == null, 'a roll that meets the F4 large target of 11 saves');
const poisoned = P.resolve({ hp: 40 }, { spider: 'spider', level: 4, con: 16, roll: 10 });
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

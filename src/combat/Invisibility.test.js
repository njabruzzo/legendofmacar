'use strict';
/**
 * G1 invisibility targeting, dust no-break, ethereal delay.
 * Run: node src/combat/Invisibility.test.js
 */
const Inv = require('./Invisibility.js');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

const mac = { name: 'Macar', team: 'party', x: 0, y: 0 };
Inv.grant(mac, 80);
assert(mac.invisT === 80 && mac.invis === 80 && mac.invisNoBreak === 0, 'potion grant sets invisT and invis');
assert(Inv.skipsTarget({ kind: 'goblin', name: 'Goblin' }, mac), 'a goblin does not target an invisible Macar');

const beholder = { kind: 'beholder', name: 'THE EYE' };
const king = { kind: 'king', name: 'THE UNDYING KING' };
const thin = { kind: 'statue', name: 'Thin One', rubyDrop: 1, sprite: 'thinone' };
assert(!Inv.skipsTarget(beholder, mac), 'a beholder sees invisible');
assert(!Inv.skipsTarget(king, mac), 'the Undying King sees invisible');
assert(!Inv.skipsTarget(thin, mac), 'a Ruby Guardian sees invisible');

const houndSee = { kind: 'hellhound', name: 'Hell Hound', _invisRoll: 0 };
const houndMiss = { kind: 'hellhound', name: 'Hell Hound', _invisRoll: 0.9 };
assert(!Inv.skipsTarget(houndSee, mac), 'hell hound roll under 0.5 sees invisible');
assert(Inv.skipsTarget(houndMiss, mac), 'hell hound roll 0.5 or more does not');

Inv.breakHostile(mac);
assert(mac.invis === 0 && mac.invisT === 0, 'a hostile act ends ordinary invisibility');

const dusted = { name: 'Macar', team: 'party' };
Inv.grant(dusted, 200, { noBreak: 1 });
assert(Inv.skipsTarget(beholder, dusted), 'dust of disappearance hides even from true seeing');
Inv.breakHostile(dusted);
assert(dusted.invisT === 200, 'attacking does not end dust invisibility');

const ring = { name: 'Macar' };
Inv.grant(ring, 1e9, { ring: 1 });
Inv.tick(ring, 5);
assert(ring.invis >= 1e8 && ring.invisRing === 1, 'the ring does not tick down');
Inv.breakHostile(ring);
assert(ring.invis === 0 && ring.invisRing === 0, 'attacking ends the ring');

const oil = { name: 'Macar', hover: 0 };
oil.etherealPending = 1;
oil.etherealDelay = 3;
oil.etherealHold = 50;
oil.hover = 1;
Inv.tick(oil, 3);
assert(oil.ethereal === 1 && oil.etherealT === 50 && oil.hover === 1, 'oil becomes ethereal after 3 seconds');
assert(Inv.skipsTarget(beholder, oil), 'ethereal is not a legal target');
Inv.tick(oil, 50);
assert(oil.etherealT === 0 && oil.ethereal === 0, 'ethereal ends when the timer does');

const held = { controlT: 8, charmed: 1, noBreathParty: 1, aggro: 0 };
Inv.tick(held, 8);
assert(held.controlT === 0 && held.charmed === 0, 'control ends and the foe is a foe again');

if (failed) { console.error('\n' + failed + ' failed'); process.exit(1); }
console.log('\ninvisibility checks passed');

'use strict';
/**
 * G19a Necklace of Missiles beads.
 * Run: node src/combat/NecklaceMissiles.test.js
 */
const fs = require('fs');
const path = require('path');
const NM = require('./NecklaceMissiles.js');
const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL  ' + msg); }
  else console.log('ok    ' + msg);
}

const gob = { name: 'Goblin', team: 'foe', x: 6, y: 0, hp: 40, dead: 0, r: 0.3 };
const kin = { name: 'Fendur', team: 'party', x: 6.5, y: 0.2, hp: 30, dead: 0, r: 0.3 };
const far = { name: 'Orc', team: 'foe', x: 40, y: 0, hp: 20, dead: 0 };
const mac = { name: 'Macar', team: 'party', x: 0, y: 0 };
const hits = [];
const saves = [];
const host = {
  ents: [mac, gob, kin, far],
  ADD_SCALE: 4,
  dist: (a, b) => Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0)),
  rollDice: (n, s) => n * s,
  savingThrow: (e, kind) => { saves.push(kind + ':' + e.name); return e.team === 'party'; },
  damage: (e, amt) => { hits.push({ name: e.name, amt: amt }); e.hp -= amt; }
};

const it = { n: 'Necklace of Missiles', k: 'wand', charges: 3, _beadSeed: 0 };
const empty = NM.fire({ n: 'Necklace of Missiles', charges: 0 }, mac, host);
assert(empty.reason === 'no valid target' || empty.effect === 'spent', 'an empty cord does not invent a bead');

const none = NM.fire(Object.assign({}, it, { beads: [9, 6, 3], charges: 3 }), mac, {
  ents: [mac],
  dist: host.dist,
  rollDice: host.rollDice,
  damage: host.damage,
  savingThrow: host.savingThrow,
  ADD_SCALE: 4
});
assert(none.reason === 'no valid target' && none.spent === false, 'no foe in 14 tiles keeps the bead');

hits.length = 0; saves.length = 0;
const neck = { n: 'Necklace of Missiles', k: 'wand', charges: 3, beads: [9, 6, 3] };
const res = NM.fire(neck, mac, host);
assert(res.effect === 'bead' && res.dice === 9 && res.spent === false, 'largest bead fires first');
assert(neck.charges === 2 && neck.beads.join() === '6,3', 'one bead leaves the cord');
assert(hits.some(h => h.name === 'Goblin' && h.amt === 9 * 6 * 4), 'foe takes Nd6 × ADD_SCALE');
assert(hits.some(h => h.name === 'Fendur' && h.amt === Math.floor(9 * 6 * 4 / 2)), 'kin in the radius save for half');
assert(!hits.some(h => h.name === 'Orc'), 'a foe outside the radius is not burned');
assert(saves.every(s => s.indexOf('spell:') === 0), 'the save is vs spell');

NM.fire(neck, mac, host);
NM.fire(neck, mac, host);
assert(neck.charges === 0 && neck.beads.length === 0, 'the last bead empties the necklace');

assert(/Necklace of Missiles/.test(html) && !/Wand of Fire\|Necklace of Missiles/.test(html),
  'the necklace is not the 6d6 wand-of-fire pipe');
assert(/src\/combat\/NecklaceMissiles\.js/.test(html), 'index.html loads NecklaceMissiles');
assert(/src\/combat\/Invisibility\.js/.test(html), 'index.html loads Invisibility');

if (failed) { console.error('\n' + failed + ' failed'); process.exit(1); }
console.log('\nnecklace missile checks passed');

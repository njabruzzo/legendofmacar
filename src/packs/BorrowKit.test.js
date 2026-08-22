/**
 * Node checks for kin-pack loans.
 * Run: node src/packs/BorrowKit.test.js
 */
'use strict';
require('./BorrowKit.js');
const Kit = globalThis.BorrowKit;

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error('FAIL  ' + msg);
  } else {
    console.log('ok    ' + msg);
  }
}

assert(Kit.isNpc('pordoom') && !Kit.isNpc('macar'), 'only non-Macar keys are NPC packs');

let loans = [];
loans = Kit.note(loans, 'macar', { field: 'bombs', n: 1 });
assert(loans.length === 0, 'Macar spending his own kit is not a loan');
loans = Kit.note(loans, 'pordoom', { field: 'bombs', n: 1, held: false });
loans = Kit.note(loans, 'fendur', { field: 'ammo', n: 3, held: true });
const pot = Kit.mark({ n: 'Cure Light Wounds', k: 'heal10' }, 'talpor');
loans = Kit.note(loans, 'talpor', { slot: 'healPots', item: pot, held: true });
assert(loans.length === 3, 'three NPC loans recorded');

const packs = {
  macar: { bombs: 2, ammo: 1, healPots: [pot], herbs: {}, potions: [], magic: [], gems: [] },
  pordoom: { bombs: 0, ammo: 0, healPots: [], herbs: {}, potions: [], magic: [], gems: [] },
  fendur: { bombs: 0, ammo: 17, healPots: [], herbs: {}, potions: [], magic: [], gems: [] },
  talpor: { bombs: 0, ammo: 0, healPots: [], herbs: {}, potions: [], magic: [], gems: [] }
};
const equipped = { weapon: null, armor: null, ring: null, wand: null };
const out = Kit.restore(loans, packs, equipped);

assert(out.returned === 3, 'all three loans return at camp');
assert(out.borrowed.length === 0, 'loan ledger clears after camp');
assert(packs.pordoom.bombs === 1, 'used Pordoom bomb returns after camp');
assert(packs.macar.bombs === 2, 'Macar\'s own bombs are not reclaimed for an unheld loan');
assert(packs.fendur.ammo === 20, 'shared bolts return to Fendur');
assert(packs.macar.ammo === 0, 'unused shared bolts leave Macar\'s pack');
assert(packs.talpor.healPots.length === 1 && packs.talpor.healPots[0].n === 'Cure Light Wounds', 'shared potion returns to Talpor');
assert(packs.macar.healPots.length === 0, 'borrowed potion is taken back from Macar');
assert(!packs.talpor.healPots[0]._borrowOwner, 'returned items are unmarked');

const spent = Kit.note([], 'orbo', { slot: 'potions', item: { n: 'Oil of Sharpness', k: 'gear' }, held: false });
const packs2 = {
  macar: { potions: [], healPots: [], magic: [], gems: [], herbs: {} },
  orbo: { potions: [], healPots: [], magic: [], gems: [], herbs: {} }
};
Kit.restore(spent, packs2, {});
assert(packs2.orbo.potions.length === 1 && packs2.orbo.potions[0].n === 'Oil of Sharpness', 'consumed NPC potion is recreated after camp');

if (failed) {
  console.error('\n' + failed + ' failed');
  process.exit(1);
}
console.log('\nall checks passed');

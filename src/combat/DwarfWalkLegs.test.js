'use strict';
const assert=require('assert'),legs=require('./DwarfWalkLegs');
for(const dir of ['s','se','e','ne','n']){
 const a=legs.offsets('walk0',dir,400),b=legs.offsets('walk1',dir,400);
 assert(a.left[0]>0&&a.right[0]<0,'opposite leg motion '+dir);
 assert.deepStrictEqual(a.left,b.right,'left/right swap on next half stride '+dir);
 assert.deepStrictEqual(a.right,b.left,'opposite boot swaps '+dir);
 assert(legs.offsets('walk2',dir,400).left[0]!==a.left[0],'transition pose '+dir);
}
assert.equal(legs.offsets('idle','e',400),null);
assert.equal(legs.offsets('attack','e',400),null);
console.log('Dwarf legs exchange forward/back offsets; idle and combat stay painted');

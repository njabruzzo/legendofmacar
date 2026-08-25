'use strict';
require('./GhostKit.js');
const K=globalThis.GhostKit;
let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL', msg); }
}

const macar={col:{key:'macar'}, hero:1, team:'party', dead:0};
const pordoom={col:{key:'pordoom'}, ghost:1, team:'party', dead:0, name:'PORDUM'};
assert(K.isGhostKin(pordoom), 'pordoom is a ghost kin');
assert(!K.isGhostKin(macar), 'macar is not a ghost');
assert(K.packUseTarget([macar,pordoom],'pordoom',macar)===macar, 'ghost pack uses Macar');
assert(K.packUseTarget([macar,pordoom],'macar',macar)===macar, 'macar pack uses Macar');

const from={bombs:4, ammo:12, ales:2, magic:[{n:'Axe'}], gems:[{n:'Ruby'}], herbs:{Moss:1}};
const to={bombs:1, ammo:0, ales:0, magic:[], gems:[], herbs:{}};
assert(K.moveStack(from,to,'bombs',2)===2 && from.bombs===2 && to.bombs===3, 'move two bombs');
const axe=from.magic[0];
assert(K.moveListItem(from.magic,to.magic,axe)===axe && to.magic[0].n==='Axe', 'move magic item');
const all=K.takeAllKit(from,to);
assert(from.ammo===0 && to.ammo===12, 'take remaining bolts');
assert(from.gems.length===0 && to.gems[0].n==='Ruby', 'take gem');
assert(from.herbs.Moss==null && to.herbs.Moss===1, 'take herb');
assert(all.stacks>0 && all.items>=1, 'takeAll counts');

if(failed){ console.error(failed+' failed'); process.exit(1); }
console.log('GhostKit tests passed');

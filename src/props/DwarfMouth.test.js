'use strict';
const path=require('path');
require('./DwarfMouth.js');
const M=globalThis.DwarfMouth;
let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL', msg); }
}

assert(M.isGuardianRuby({guardian:1}), 'tagged guardian ruby');
assert(M.isGuardianRuby({d:'A blood-red shard from a ruby guardian. Worth 400 gp.'}), 'text guardian ruby');
assert(!M.isGuardianRuby({n:'Ruby', d:'A pretty stone.'}), 'plain ruby is not guardian');

assert(M.isSpiderFoe({kind:'spider', name:'Spider Lord'}), 'spider lord');
assert(M.isSpiderFoe({kind:'spider', name:'Cave Spider'}), 'cave spider');
assert(M.isUndeadFoe({kind:'undead'}), 'undead kind');
assert(M.isUndeadFoe({kind:'wraith', name:'Mine Wraith'}), 'wraith');
assert(!M.isUndeadFoe({kind:'goblin'}), 'goblin is not undead');

const axe=M.shadowCleaverItem();
assert(axe.n==='Shadow Cleaver' && axe.plus===2 && axe.vsDouble===1, 'cleaver stats');
assert(M.weaponVsDouble(axe,{kind:'spider'}), 'double vs spider');
assert(M.weaponVsDouble(axe,{kind:'undead'}), 'double vs undead');
assert(!M.weaponVsDouble(axe,{kind:'goblin'}), 'no double vs goblin');

const ham=M.macarHammerItem();
assert(ham.id==='macar_hammer' && ham.dice==='1d8', 'hammer item');
assert(M.dwarfMouthKey().k==='key', 'mouth key');

const fs=require('fs');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
assert(/k:'dwarfface'/.test(html), 'chapter places dwarfface');
assert(/prop_dwarfface\.png/.test(html), 'face sprite registered');
assert(/loot_shadowcleaver\.png/.test(html), 'axe sprite registered');
assert(/loot_dwarfkey\.png/.test(html), 'key sprite registered');
assert(/This dwarf face is huge and carved of stone/.test(html), 'touch dialogue');
assert(/Put something in its mouth\?/.test(html), 'offer question');
assert(/Drop this in the Dwarf\\?'s mouth\?/.test(html), 'drop confirm');
assert(/YUM!/.test(html), 'yum line');

if(failed){ console.error(failed+' failed'); process.exit(1); }
console.log('DwarfMouth tests passed');

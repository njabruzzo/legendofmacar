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
assert(M.isShadowCleaver(axe), 'cleaver id matches');
assert(M.isShadowCleaver({n:'Shadow Cleaver'}), 'cleaver name matches');
assert(!M.isShadowCleaver(M.macarHammerItem()), 'hammer is not the cleaver');
assert(M.findShadowCleaver({macar:{magic:[axe]}}, {weapon:null})===axe, 'finds cleaver in pack');
assert(M.findShadowCleaver({macar:{magic:[]}}, {weapon:axe})===axe, 'finds equipped cleaver');
assert(!M.findShadowCleaver({macar:{magic:[]}}, {weapon:null}), 'missing cleaver is null');
assert(M.weaponVsDouble(axe,{kind:'spider'}), 'double vs spider');
assert(M.weaponVsDouble(axe,{kind:'undead'}), 'double vs undead');
assert(!M.weaponVsDouble(axe,{kind:'goblin'}), 'no double vs goblin');

const ham=M.macarHammerItem();
assert(ham.id==='macar_hammer' && ham.dice==='1d8' && ham.slot==='primary', 'hammer item is primary');
assert(M.dwarfMouthKey().k==='key', 'mouth key');

const ruby={n:'Ruby', guardian:1, d:'A blood-red shard from a ruby guardian.'};
const no={n:'Ruby', d:'A pretty stone.'};
const first=M.resolveMouthDrop(ruby, false);
assert(first.ok && first.yum && first.spit.length===2, 'first guardian ruby pays key and axe');
assert(first.spit[0].k==='key' && first.spit[1].n==='Shadow Cleaver', 'spit order key then cleaver');
const again=M.resolveMouthDrop(ruby, true);
assert(again.ok && again.yum && again.spit.length===0, 'later rubies yum but do not pay again');
assert(!M.resolveMouthDrop(no, false).ok, 'plain ruby rejected');
assert(!M.resolveMouthDrop(null, false).ok, 'empty drop rejected');

const gems=[ruby, {n:'other'}];
assert(M.takeGemByRef(gems, ruby)===ruby && gems.length===1 && gems[0].n==='other', 'remove ruby by reference');
assert(M.takeGemByRef(gems, ruby)===null, 'missing gem is a no-op');

const fs=require('fs');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
assert(/k:'dwarfface'/.test(html), 'chapter places dwarfface');
assert(/prop_dwarfface\.png/.test(html), 'face sprite registered');
assert(/loot_shadowcleaver\.png/.test(html), 'axe sprite registered');
assert(fs.existsSync(path.join(__dirname,'../../assets/creatures/dwarf_macar_axe.png')), 'idle axe PNG on disk');
assert(fs.existsSync(path.join(__dirname,'../../assets/creatures/dwarf_macar_axe_atk.png')), 'swing axe PNG on disk');
assert(/dwarf_macar_axe\.png/.test(html), 'Macar idle axe sprite registered');
assert(/dwarf_macar_axe_atk\.png/.test(html) || /macar_axe_atk/.test(html), 'Macar swing axe sprite registered');
assert(/wieldsShadowCleaver/.test(html), 'sprite key swaps when the cleaver is wielded');
assert(/ensureShadowCleaverWielded/.test(html), 'attack wields the cleaver if Macar has it');
assert(/loot_dwarfkey\.png/.test(html), 'key sprite registered');
assert(/This dwarf face is huge and carved of stone/.test(html), 'touch dialogue');
assert(/Put something in its mouth\?/.test(html), 'offer question');
assert(/Drop this in the Dwarf\\?'s mouth\?/.test(html), 'drop confirm');
assert(/YUM!/.test(html), 'yum line');

if(failed){ console.error(failed+' failed'); process.exit(1); }
console.log('DwarfMouth tests passed');

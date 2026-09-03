'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

function extract(name){
  const re=new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}');
  const m=html.match(re);
  if(!m) throw new Error('missing '+name+' in index.html');
  return m[0];
}

const sheets={};
const ctx={ entityAbil(e){ return (e&&e.abil)||(e&&e.col&&sheets[e.col.key])||null; } };
vm.createContext(ctx);
['isDwarf','dwarfConSaveAdj','dwarfSaveCon','dwarfSaveBonus'].forEach(n=>vm.runInContext(extract(n), ctx));
const {dwarfConSaveAdj,dwarfSaveBonus}=ctx;

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL', msg); }
}

const table=[[3,0],[4,1],[6,1],[7,2],[10,2],[11,3],[13,3],[14,4],[17,4],[18,5],[19,5]];
table.forEach(([con,want])=>{
  assert(dwarfConSaveAdj(con)===want, 'CON '+con+' => +'+want+' (got '+dwarfConSaveAdj(con)+')');
});

const macar={race:'dwarf', kind:'dwarf', abil:{con:18}};
assert(dwarfSaveBonus(macar,'poison')===5, 'Macar CON 18 poison +5');
assert(dwarfSaveBonus(macar,'rod')===5, 'Macar CON 18 rod +5');
assert(dwarfSaveBonus(macar,'spell')===5, 'Macar CON 18 spell +5');
assert(dwarfSaveBonus(macar,'breath')===0, 'no racial vs breath');
assert(dwarfSaveBonus(macar,'petrify')===0, 'no racial vs petrify');
assert(dwarfSaveBonus(macar,'death')===0, 'racial is vs poison, not death magic');
assert(dwarfSaveBonus({kind:'gnome',team:'party',abil:{con:16}},'poison')===0, 'gnomes are not dwarves');
assert(dwarfSaveBonus({race:'dwarf'},'poison')===3, 'dwarf min CON 12 => +3');

const lord=html.match(/spiderLord:\{[^}]+\}/);
assert(lord, 'spiderLord bestiary row');
assert(/hp:44/.test(lord[0]), 'level-one giant spider has double HP (44)');
assert(/killPoison:1/.test(lord[0]), 'spider lord poison is lethal');
assert(!/slowPoison/.test(lord[0]), 'spider lord no longer uses slow poison');
assert(/killPoison:b\.killPoison/.test(html), 'killPoison is copied onto spawned foes');

assert(/savingThrow\(mac,'spell'\)/.test(html) && /savingThrow\(tal,'spell'\)/.test(html),
  'Hold Person and Silence use save vs spell');
assert(/dwarfSaveBonus\(e, kind\)/.test(html.match(/function saveNeed[\s\S]*?\n\}/)[0]),
  'spell saves still subtract dwarfSaveBonus');
assert(/function wornProtectionPlus\(/.test(html), 'Protection save helper exists');
assert(/saveNeed\(e,kind\)-\(e\.juice\|\|0\)-wornProtectionPlus\(e\)-wornDisplacementPlus\(e\)/.test(html.match(/function savingThrow[\s\S]*?\n\}/)[0]),
  'savingThrow lowers the target by Protection plus and Displacement plus (same math as juice)');
assert(/if\(it\.dexPlus\) return 0/.test(extract('wornProtectionPlus')),
  'dexPlus never counts as a Protection save ward');
assert(/function wornDisplacementPlus\(/.test(html), 'Displacement save helper exists');
assert(/cloak of displacement/i.test(extract('wornDisplacementPlus')),
  'Displacement helper is name-gated, not a Protection ring');

const saveCtx={
  G:{equipped:{}},
  d20:()=>14,
  ftext:()=>{},
  saveNeed:()=>16
};
vm.createContext(saveCtx);
vm.runInContext(extract('wornProtectionPlus')+extract('wornDisplacementPlus')+extract('savingThrow'), saveCtx);

const mac={hero:1, team:'party', x:1, y:1, juice:0};
saveCtx.G.equipped={necklace:{n:'Ring of Protection +1', k:'ring', plus:1}};
assert(saveCtx.wornProtectionPlus(mac)===1, 'Ring of Protection +1 is +1 to saves');
assert(saveCtx.savingThrow(mac,'spell')===false, 'need 16-1=15; roll 14 still fails');
saveCtx.d20=()=>15;
assert(saveCtx.savingThrow(mac,'spell')===true, 'need 15; roll 15 saves (plus lowered the target)');

saveCtx.G.equipped={necklace:{n:'Cloak of Protection +2', k:'ring', plus:2}};
assert(saveCtx.wornProtectionPlus(mac)===2, 'Cloak of Protection plus feeds saves');

saveCtx.G.equipped={necklace:{n:'Ring of Dexterity +1', k:'dex', dexPlus:1}};
assert(saveCtx.wornProtectionPlus(mac)===0, 'Dexterity ring does not improve saves');

saveCtx.G.equipped={necklace:{n:'Ring of Dexterity +1', k:'dex', dexPlus:1, plus:1}};
assert(saveCtx.wornProtectionPlus(mac)===0, 'leftover plus on a dex ring is still not a ward');

saveCtx.G.equipped={necklace:{n:'Ring of Protection +4 on AC 5 or better', k:'ring', plus:4}};
assert(saveCtx.wornProtectionPlus(mac)===4, 'gated +4 ring still stores plus:4 for saves');

saveCtx.G.equipped={necklace:{n:'Cloak of Displacement', k:'misc', plus:2}};
assert(saveCtx.wornProtectionPlus(mac)===0, 'Displacement plus is not a Protection ward');
assert(saveCtx.wornDisplacementPlus(mac)===2, 'Cloak of Displacement plus feeds saves');
saveCtx.saveNeed=()=>16;
saveCtx.d20=()=>13;
assert(saveCtx.savingThrow(mac,'spell')===false, 'need 16-2=14; roll 13 still fails');
saveCtx.d20=()=>14;
assert(saveCtx.savingThrow(mac,'spell')===true, 'need 14; roll 14 saves (Displacement lowered the target)');

saveCtx.G.equipped={necklace:{n:'Ring of Dexterity +1', k:'dex', dexPlus:1, plus:1}};
assert(saveCtx.wornDisplacementPlus(mac)===0, 'Dexterity ring is not Displacement');
const sham=html.match(/goblinShaman:\{[^}]+\}/);
assert(sham && /cls:'c'/.test(sham[0]) && /wis:14/.test(sham[0]) && /lvl:7/.test(sham[0]),
  'shaman is a 7th-level evil cleric, WIS 14');
assert(/spellSlots=e\.spellSlots\|\|\{1:5,2:3,3:2,4:1\}/.test(html), 'slots 5/3/2/1');

if(failed){ console.error(failed+' failed'); process.exit(1); }
console.log('DwarfSaves + spider lord tests passed');

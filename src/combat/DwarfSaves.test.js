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

if(failed){ console.error(failed+' failed'); process.exit(1); }
console.log('DwarfSaves + spider lord tests passed');

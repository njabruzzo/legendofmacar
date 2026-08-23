'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

function extractFn(name){
  const re=new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}');
  const m=html.match(re);
  if(!m) throw new Error('missing '+name+' in index.html');
  return m[0];
}
function extractConst(name){
  const re=new RegExp('const '+name+'=\\[[\\s\\S]*?\\];');
  const m=html.match(re);
  if(!m) throw new Error('missing '+name+' in index.html');
  return m[0];
}

const ctx={
  clamp:(v,a,b)=>v<a?a:v>b?b:v,
  partyLevel:()=>3
};
vm.createContext(ctx);
['THAC_F','THAC_M','THAC_C','THAC_T'].forEach(n=>vm.runInContext(extractConst(n), ctx));
['monsterHD','acCol','attackClass','fighterMatrixRow','monsterMatrixRow','thacNeed','rosterCls','attackProgress','wantsMeleePose'].forEach(n=>vm.runInContext(extractFn(n), ctx));

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL', msg); }
  else console.log('ok   ', msg);
}

const {thacNeed, attackClass, rosterCls, fighterMatrixRow, monsterMatrixRow, wantsMeleePose, attackProgress}=ctx;

assert(rosterCls({role:'pick'})==='f', 'miner (pick) uses fighter class');
assert(rosterCls({role:'hero'})==='f', 'Macar uses fighter class');
assert(rosterCls({role:'shield'})==='f', 'shield kin uses fighter class');
assert(rosterCls({role:'faith'})==='c', 'cleric stays cleric');
assert(rosterCls({role:'bolt'})==='t', 'crossbow kin stays thief');

assert(attackClass({team:'party', role:'pick', cls:'f'})==='f', 'miner attackClass is fighter');
assert(attackClass({team:'party', role:'miner'})==='f', 'role miner is fighter');
assert(attackClass({hero:1, role:'hero', cls:'f', team:'party'})==='f', 'Macar attackClass is fighter');
assert(attackClass({team:'party', role:'faith', cls:'c'})==='c', 'cleric attackClass');
assert(attackClass({team:'foe', hd:1})==='m', 'monster attackClass');

assert(fighterMatrixRow(1)===0 && fighterMatrixRow(2)===0, 'fighter 1-2 share a DMG row');
assert(fighterMatrixRow(3)===1 && fighterMatrixRow(4)===1, 'fighter 3-4 share a DMG row');
assert(fighterMatrixRow(5)===2 && fighterMatrixRow(6)===2, 'fighter 5-6 share a DMG row');

assert(thacNeed({team:'party', cls:'f', lvl:1}, 10)===10, 'F1 vs AC 10 needs 10');
assert(thacNeed({team:'party', cls:'f', lvl:2}, 10)===10, 'F2 vs AC 10 still 10 (DMG band)');
assert(thacNeed({team:'party', cls:'f', lvl:3}, 10)===8, 'F3 vs AC 10 needs 8');
assert(thacNeed({team:'party', cls:'f', lvl:4}, 0)===18, 'F3-4 vs AC 0 needs 18');
assert(thacNeed({team:'party', role:'pick', cls:'f', lvl:3}, 10)===8, 'miner F3 vs AC 10 needs 8');
assert(thacNeed({team:'party', cls:'c', lvl:3}, 10)===10, 'C1-3 vs AC 10 needs 10');
assert(thacNeed({team:'party', cls:'c', lvl:4}, 10)===8, 'C4-6 vs AC 10 needs 8');
assert(thacNeed({team:'party', cls:'t', lvl:3}, 10)===11, 'T1-4 vs AC 10 needs 11');
assert(thacNeed({team:'party', cls:'t', lvl:5}, 10)===9, 'T5-8 vs AC 10 needs 9');

assert(monsterMatrixRow(0.5)===0, 'up to 1-1 HD');
assert(monsterMatrixRow(0.9)===1, '1-1 HD');
assert(monsterMatrixRow(1)===2, '1 HD');
assert(monsterMatrixRow(1.5)===3, '1+ HD');
assert(monsterMatrixRow(3)===4, '2-3+ HD');
assert(monsterMatrixRow(4)===5, '4-5+ HD');
assert(thacNeed({team:'foe', hd:1}, 10)===9, '1 HD monster vs AC 10 needs 9');
assert(thacNeed({team:'foe', hd:4}, 4)===11, '4 HD monster vs AC 4 needs 11');
assert(thacNeed({team:'foe', hd:0.5}, 10)===11, 'up to 1-1 vs AC 10 needs 11');

const macarAtk={hero:1, atk:0.5, atkMax:0.78, atkKind:'melee'};
assert(attackProgress(macarAtk)>0.2, 'attack progress advances while atk ticks down');
assert(wantsMeleePose(macarAtk)===true, 'mid-swing uses the melee pose');
assert(wantsMeleePose({hero:1, atk:0.02, atkMax:0.78, atkKind:'melee'})===false, 'recovery drops the melee pose');
assert(wantsMeleePose({hero:1, atk:0, atkMax:0.78})===false, 'no pose when not attacking');

const atkIdx=html.indexOf("if(wantsMeleePose(e) && SPR[k+'_atk'])");
const backIdx=html.indexOf("if(wantsBackView(e) && SPR[k+'_back'])");
assert(atkIdx>0 && backIdx>atkIdx, 'attack sprite is chosen before the back sprite');
assert(/p\.moving=0; p\.ix=0; p\.iy=0;/.test(html), 'Attack click stops walk so the swing can play');

if(failed){ console.error(failed+' failed'); process.exit(1); }
console.log('Attack matrix + swing pose tests passed');

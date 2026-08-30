'use strict';
/**
 * Spider Lord Type U pile + silk-bound web corpses.
 * Run: node src/loot/SpiderLair.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const src=fs.readFileSync(path.join(__dirname,'SpiderLair.js'),'utf8');
const vm=require('vm');
const ctx={};
ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext(src, ctx);
const SL=ctx.SpiderLair;

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(!!SL, 'SpiderLair module loads');
assert(/src\/loot\/SpiderLair\.js/.test(html), 'index.html loads SpiderLair');

const u=SL.rollTypeU({
  chanceOk:()=>false,
  rngAmt:(a,b)=>a
});
assert(u.coins.cp===10 && u.coins.sp===10 && u.coins.gp===5, 'Type U always pays cp/sp/gp');
assert(u.magN===0 && u.gems===0 && u.jew===0, 'Type U gems/jewelry/magic keep their book chances');

const forced=SL.forceLordHoard({coins:{}, gems:0, jew:0, magN:0});
assert(forced.coins.cp>=10 && forced.coins.sp>=10 && forced.coins.gp>=5, 'lord purse is never empty');
assert(forced.magN===0, 'lord magic stays Type U 55%, not a guaranteed item');

assert(SL.isSpiderLord({name:'Spider Lord'}) && SL.isSpiderLord({boss:1,kind:'spider'}),
  'lord matcher hits the named boss');
assert(!SL.isSpiderLord({name:'Cave Spider',kind:'spider'}) && !SL.isSpiderLord({name:'Giant Spider'}),
  'pack spiders are not the lord');

const stripped=SL.rollWebCorpse({chanceOk:()=>false, ri:()=>0, rollIndividual:()=>({coins:{cp:3}})});
assert(stripped.stripped && !stripped.hoard, 'half the web bodies are stripped bones');

let sRolls=0;
const potion=SL.rollWebCorpse({
  chanceOk:()=>{ sRolls++; return true; },
  ri:()=>0,
  rollIndividual:(L)=>{ return L==='S'?{magN:1,magKind:'potion'}:null; }
});
assert(potion.letter==='S' && potion.hoard.magKind==='potion', '10% of looted bodies roll S, not S+T');

const q=SL.rollWebCorpse({
  chanceOk:(pct)=>pct!==10,
  ri:(a,b)=>b===3?3:2,
  rollIndividual:()=>({coins:{}})
});
assert(q.letter==='Q' && q.hoard.gems>=1 && q.hoard.gems<=4, 'Q on a web body is 1–4 gems, no miss');

const spots=SL.pickSpots(5, ()=>0);
assert(spots.length===5 && spots.length>=4 && spots.length<=6, 'lair scatters 4–6 corpse spots');
assert(SL.pickSpots(4).every(p=>Math.hypot(p[0]-10.1,p[1]-31)<4), 'corpses sit in the west silk disk');

assert(/function placeSpiderWebCorpses\(/.test(html), 'web corpses are placed as lootable bodies');
assert(/function rollSpiderLordHoard\(/.test(html), 'lord death has its own Type U roll');
assert(/if\(isSpiderLord\(e\)\)\{/.test(html.match(/function foeDrop\([\s\S]*?\nfunction newGear/)[0]),
  'foeDrop does not use Type C chances on the lord');
assert(!/rollKillIndividual\(e\)/.test(html.match(/if\(isSpiderLord\(e\)\)\{[\s\S]*?return;\n  \}/)[0]),
  'lord pile is one Type U hoard, not the stacked kill pocket');
assert(/placeSpiderWebCorpses\(\)/.test(html) && /L\.flags\.spiderLoot=1/.test(html),
  'web corpses spawn when the lair is placed, not after the lord dies');
assert(/webCorpse:1/.test(html) && /Stripped bones/.test(html),
  'empty web bodies say stripped bones');
assert(/kind:'webCorpse'/.test(html) && /sprite:'bones'/.test(html),
  'web bodies are visible bones in silk, not a clean floor');
assert(/team:'prop'/.test(html.match(/function placeSpiderWebCorpses\([\s\S]*?\nfunction rollKillIndividual/)[0]),
  'web bodies are not living foes');
assert(/tt:'Nil'/.test(html.match(/spider:\{[^}]+\}/)[0]), 'pack cave spiders stay Nil');
assert(/tt:'C'/.test(html.match(/spiderLord:\{[^}]+\}/)[0]), 'MM still lists the lord as Type C');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nspider lair loot checks passed');

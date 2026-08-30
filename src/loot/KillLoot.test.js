'use strict';
/**
 * General-kill pocket: always coins (J), gems via Q, magic via S/T/any.
 * Type U pays DMG coins. Spider Lord house pile stays coins + 1 magic.
 * Run: node src/loot/KillLoot.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const lairSrc=fs.readFileSync(path.join(__dirname,'SpiderLair.js'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

function extractFn(name){
  const re=new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}');
  const m=html.match(re);
  if(!m) throw new Error('missing '+name);
  return m[0];
}
function extractThrough(name, until){
  const start=html.indexOf('function '+name+'(');
  if(start<0) throw new Error('missing '+name);
  const end=html.indexOf('\nfunction '+until+'(', start);
  if(end<0) throw new Error('missing end '+until);
  return html.slice(start, end);
}

assert(/if\(!\(u\.coins\.cp>0\)\) u\.coins\.cp=rngAmt\(10,80\)/.test(html),
  'Type U always fills 10–80 cp');
assert(/if\(!\(u\.coins\.sp>0\)\) u\.coins\.sp=rngAmt\(10,60\)/.test(html),
  'Type U always fills 10–60 sp');
assert(/if\(!\(u\.coins\.gp>0\)\) u\.coins\.gp=rngAmt\(5,30\)/.test(html),
  'Type U always fills 5–30 gp');
assert(/function ensureKillCoins\(/.test(html) && /return mergeHoards\(h, rollIndividual\('J'\)\)/.test(html),
  'empty purses get at least type J');
assert(/return ensureKillCoins\(hoard\)/.test(html.match(/function rollKillIndividual[\s\S]*?\nfunction foeDrop/)[0]),
  'every kill pocket is forced to carry coins');
assert(/hoard=ensureKillCoins\(mergeHoards\(hoard, rollKillIndividual\(e\)\)\)/.test(html),
  'foeDrop still merges the individual pocket and keeps coins');
assert(/rollIndividual\('Q'\)/.test(html.match(/function rollKillIndividual[\s\S]*?\nfunction foeDrop/)[0]),
  'gems still come from Type Q on a real chance');
assert(/rollIndividual\('S'\)/.test(html) && /rollIndividual\('T'\)/.test(html),
  'magic still comes from S/T plus the any-item chance');
assert(/forceLordHoard/.test(html) && /magN:Math\.max\(1/.test(html),
  'Spider Lord house rule still forces coins + 1 magic');

const ctx={};
ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext(lairSrc, ctx);

function ri(a,b){ return a+Math.floor(Math.random()*(b-a+1)); }
function d100(){ return 1+Math.floor(Math.random()*100); }
function chanceOk(pct){ return d100()<=pct; }
function rngAmt(a,b){ return a+ri(0, Math.max(0,b-a)); }
function rollDice(n,s,b){ let t=b||0; for(let i=0;i<n;i++) t+=ri(1,s); return t; }
Object.assign(ctx, { G:{lvl:{n:2}}, ri, d100, chanceOk, rngAmt, rollDice });
vm.runInContext(
  extractFn('hoardHasCoins')+extractFn('ensureKillCoins')+extractFn('mergeHoards')+
  extractFn('rollIndividual')+extractFn('rollKillIndividual'),
  ctx
);

const u=ctx.rollIndividual('U');
assert(u.coins.cp>=10 && u.coins.cp<=80, 'U cp is 10–80');
assert(u.coins.sp>=10 && u.coins.sp<=60, 'U sp is 10–60');
assert(u.coins.gp>=5 && u.coins.gp<=30, 'U gp is 5–30');

const emptyU=ctx.SpiderLair.rollTypeU({chanceOk:()=>false, rngAmt:()=>0});
assert(!(emptyU.coins.cp>0), 'helper can omit coins (the bug we fill)');
const filled=(()=>{
  const prev=ctx.SpiderLair.rollTypeU;
  ctx.SpiderLair.rollTypeU=()=>({coins:{}, gems:0, jew:0, magN:0, magKind:'any'});
  const got=ctx.rollIndividual('U');
  ctx.SpiderLair.rollTypeU=prev;
  return got;
})();
assert(filled.coins.cp>=10 && filled.coins.sp>=10 && filled.coins.gp>=5,
  'rollIndividual(U) pays house coins even if the helper returns coins:{}');

let trashCoins=0, trashGems=0, trashMagic=0;
for(let i=0;i<80;i++){
  const h=ctx.rollKillIndividual({boss:0, kind:'goblin', name:'Goblin'});
  if(ctx.hoardHasCoins(h)) trashCoins++;
  if((h.gems||0)>0) trashGems++;
  if((h.magN||0)>0) trashMagic++;
}
assert(trashCoins===80, '80 trash kills all have coins (at least J)');
assert(trashGems>0, 'trash pack sometimes has Type Q gems ('+trashGems+'/80)');
assert(trashMagic>0, 'trash pack sometimes has S/T/any magic ('+trashMagic+'/80)');

let bossCoins=0, bossMagic=0, bossGp=0;
for(let i=0;i<40;i++){
  const h=ctx.rollKillIndividual({boss:1, kind:'goblin', name:'Goblin Boss'});
  if(ctx.hoardHasCoins(h)) bossCoins++;
  if((h.magN||0)>0) bossMagic++;
  if(h.coins&&h.coins.gp>0) bossGp++;
}
assert(bossCoins===40, 'every boss kill has coins');
assert(bossGp===40, 'boss U purse always adds gp');
assert(bossMagic>=20, 'bosses roll magic more often than trash ('+bossMagic+'/40)');

const lord=ctx.SpiderLair.forceLordHoard(ctx.rollIndividual('U'));
assert(lord.coins.cp>=10 && lord.coins.sp>=10 && lord.coins.gp>=5 && lord.magN>=1,
  'Spider Lord house pile is still coins + 1 magic');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nkill loot checks passed');

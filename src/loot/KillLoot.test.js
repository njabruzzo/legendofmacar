'use strict';
/**
 * House kill pocket: coins always by HD band. Gems via Q at band %.
 * Magic only when S/T/U is on the monster, at book chances — never stacked
 * S+T on every corpse. Bosses roll U (coins always, magic 55%).
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

const killSrc=html.match(/function killLootBand[\s\S]*?\nfunction foeDrop/)[0];
const dropSrc=html.match(/function foeDrop\([\s\S]*?\nfunction newGear/)[0];

assert(/if\(!\(u\.coins\.cp>0\)\) u\.coins\.cp=rngAmt\(10,80\)/.test(html),
  'Type U always fills 10–80 cp');
assert(/if\(!\(u\.coins\.sp>0\)\) u\.coins\.sp=rngAmt\(10,60\)/.test(html),
  'Type U always fills 10–60 sp');
assert(/if\(!\(u\.coins\.gp>0\)\) u\.coins\.gp=rngAmt\(5,30\)/.test(html),
  'Type U always fills 5–30 gp');
assert(/letter==='O'\)\{ coins\.cp=rngAmt\(10,40\); coins\.sp=rngAmt\(10,30\); \}/.test(html),
  'Type O pays 10–40 cp and 10–30 sp, not gp');
assert(/function ensureKillCoins\(/.test(html) && /return mergeHoards\(h, rollIndividual\('J'\)\)/.test(html),
  'empty purses get at least type J');
assert(/return ensureKillCoins\(hoard\)/.test(killSrc) || /return ensureKillCoins\(rollIndividual\('U'\)\)/.test(killSrc),
  'every kill pocket is forced to carry coins');
assert(/rollKillIndividual\(e\)/.test(dropSrc) && !/rollTreasureSpec\(raw\)/.test(dropSrc),
  'foeDrop rolls the house individual pocket, not lair A–I');
assert(!/rollLair\('H'\)/.test(dropSrc) && !/rollLair\('C'\)/.test(dropSrc),
  'boss corpses do not fall back to lair H/C');
assert(!/rollIndividual\('S'\)/.test(killSrc) && !/rollIndividual\('T'\)/.test(killSrc),
  'house table does not stack S+T on every kill');
assert(/rollHouseQ\(\)/.test(killSrc) && !/rollIndividual\('Q'\)/.test(killSrc),
  'Q pays 1–4 gems when the band chance hits, no extra miss');
assert(/forceLordHoard/.test(html) && !/magN:Math\.max\(1/.test(html),
  'Spider Lord keeps U coins; magic stays the book 55%');

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
  extractFn('monsterHD')+extractFn('hoardHasCoins')+extractFn('ensureKillCoins')+
  extractFn('mergeHoards')+extractFn('treasureLetters')+extractFn('rollIndividual')+
  extractThrough('killLootBand', 'foeDrop'),
  ctx
);

assert(ctx.killLootBand({kind:'rat',hd:0.5})==='vermin', 'rats are vermin');
assert(ctx.killLootBand({kind:'beetle',hd:1.25})==='vermin', 'beetles stay vermin even if hp looks like HD 1');
assert(ctx.killLootBand({kind:'goblin',hd:0.875,treasure:'J'})==='mid', 'goblins are the HD 1–3 band');
assert(ctx.killLootBand({kind:'orc',hd:5,treasure:'Nil'})==='high', 'HD 4+ is the high band');
assert(ctx.killLootBand({boss:1,kind:'goblin'})==='boss', 'boss flag wins the band');

const o=ctx.rollIndividual('O');
assert(o.coins.cp>=10 && o.coins.cp<=40, 'O cp is 10–40');
assert(o.coins.sp>=10 && o.coins.sp<=30, 'O sp is 10–30');
assert(!(o.coins.gp>0), 'O does not pay gp');

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

let ratCoins=0, ratSp=0, ratGems=0, ratMagic=0;
for(let i=0;i<80;i++){
  const h=ctx.rollKillIndividual({boss:0, kind:'rat', name:'Cave Rat', hd:0.5, treasure:'Nil'});
  if(ctx.hoardHasCoins(h) && (h.coins.cp||0)>0) ratCoins++;
  if((h.coins.sp||0)>0) ratSp++;
  if((h.gems||0)>0) ratGems++;
  if((h.magN||0)>0) ratMagic++;
}
assert(ratCoins===80, '80 rat kills all have cp (type J)');
assert(ratSp>10 && ratSp<55, 'rats sometimes add K silver ('+ratSp+'/80, ~40%)');
assert(ratGems>=1 && ratGems<=25, 'a rat gem is uncommon ('+ratGems+'/80, ~10%)');
assert(ratMagic===0, 'Nil vermin never roll S/T/U ('+ratMagic+'/80)');

let gobCoins=0, gobSp=0, gobGp=0, gobGems=0, gobMagic=0;
for(let i=0;i<80;i++){
  const h=ctx.rollKillIndividual({boss:0, kind:'goblin', name:'Goblin', hd:1, treasure:'J'});
  if(ctx.hoardHasCoins(h) && (h.coins.cp||0)>0) gobCoins++;
  if((h.coins.sp||0)>0) gobSp++;
  if((h.coins.gp||0)>0) gobGp++;
  if((h.gems||0)>0) gobGems++;
  if((h.magN||0)>0) gobMagic++;
}
assert(gobCoins===80 && gobSp===80, 'every goblin has J+K (cp and sp)');
assert(gobGp>10 && gobGp<50, 'goblins sometimes add M gold ('+gobGp+'/80, ~35%)');
assert(gobGems>=4 && gobGems<=35, 'goblin gems sit on the 20% Q chance ('+gobGems+'/80)');
assert(gobMagic===0, 'goblin Type J does not invent potions ('+gobMagic+'/80)');

let highO=0, highM=0;
for(let i=0;i<40;i++){
  const h=ctx.rollKillIndividual({kind:'umberhulk', name:'Umber Hulk', hd:8, treasure:'Nil'});
  if((h.coins.cp||0)>=10 && (h.coins.sp||0)>=10) highO++;
  if((h.coins.gp||0)>=2) highM++;
}
assert(highO===40 && highM===40, 'HD 4+ Nil uses O coins and M gold');

let bossCoins=0, bossMagic=0, bossGp=0;
for(let i=0;i<80;i++){
  const h=ctx.rollKillIndividual({boss:1, kind:'goblin', name:'Goblin King'});
  if(ctx.hoardHasCoins(h)) bossCoins++;
  if((h.magN||0)>0) bossMagic++;
  if(h.coins&&h.coins.gp>0) bossGp++;
}
assert(bossCoins===80, 'every boss kill has coins');
assert(bossGp===80, 'boss U purse always adds gp');
assert(bossMagic>=25 && bossMagic<=65, 'boss U magic stays the book 55% ('+bossMagic+'/80)');

const lordEmpty=ctx.SpiderLair.forceLordHoard({coins:{}, gems:0, jew:0, magN:0});
assert(lordEmpty.coins.cp>=10 && lordEmpty.coins.sp>=10 && lordEmpty.coins.gp>=5,
  'Spider Lord house purse is never empty');
assert(lordEmpty.magN===0, 'forceLordHoard does not invent a guaranteed item');

const lord=ctx.SpiderLair.forceLordHoard(ctx.rollIndividual('U'));
assert(lord.coins.cp>=10 && lord.coins.sp>=10 && lord.coins.gp>=5,
  'Spider Lord Type U pile still has the house coin floor');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nkill loot checks passed');

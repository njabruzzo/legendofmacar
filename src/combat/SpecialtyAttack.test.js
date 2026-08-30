'use strict';
/**
 * Specialty Attack: both-conditions house rule.
 * Run: node src/combat/SpecialtyAttack.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const iconDir=path.join(__dirname,'../../assets/ui');

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
function extractConst(name){
  const re=new RegExp('const '+name+'=\{[\\s\\S]*?\\n\\};');
  const m=html.match(re);
  if(!m) throw new Error('missing '+name);
  return m[0];
}

assert(/const SPECIALTY=\{/.test(html), 'SPECIALTY bands exist');
assert(/function specialtyInBand\(/.test(html) && /function specialtyHitBonus\(/.test(html),
  'band and STR+magic tot helpers exist');
assert(/bandOk&&matrixHit/.test(html), 'success requires BOTH band and matrix');
assert(!/band REPLACES/.test(html) && !/replaces the AC/.test(html),
  'band does not replace the matrix');
assert(/if\(spec\) raw=Math\.round\(raw\*spec\.mult\)/.test(html),
  'multiplier is applied after str/weapon, before ADD_SCALE');
assert(/Specialty '\+spec\.n/.test(html) && /×'\+spec\.mult/.test(html),
  'combat log writes Specialty and the ×');
assert(/e\.ct=Math\.max\(e\.ct\|\|0, 1\.15\)/.test(html),
  'a specialty swing consumes a full attack round');
assert(/e\.team==='foe' && !e\.specialty && chanceOk\(18\)/.test(html),
  'monsters may declare I–IV with no extra HUD');
assert(/beginSpecialtySwing\(e\)/.test(html), 'armed pick is spent on the next swing');

['i','ii','iii','iv'].forEach(n=>{
  const p=path.join(iconDir,'icon_specialty_'+n+'.png');
  assert(fs.existsSync(p), 'Limner plate icon_specialty_'+n+'.png exists');
});

const {PNG}=(()=>{
  try { return {PNG: require('pngjs').PNG}; } catch(e){ return {PNG:null}; }
})();
if(PNG){
  ['i','ii','iii','iv'].forEach(n=>{
    const buf=fs.readFileSync(path.join(iconDir,'icon_specialty_'+n+'.png'));
    const img=PNG.sync.read(buf);
    assert(img.width===96 && img.height===144, 'icon_specialty_'+n+' is 96×144 (got '+img.width+'×'+img.height+')');
  });
} else {
  const {execSync}=require('child_process');
  ['i','ii','iii','iv'].forEach(n=>{
    const out=execSync('python3 -c "from PIL import Image; im=Image.open(\''+path.join(iconDir,'icon_specialty_'+n+'.png')+'\'); print(im.size[0], im.size[1])"', {encoding:'utf8'}).trim();
    assert(out==='96 144', 'icon_specialty_'+n+' is 96×144 (got '+out+')');
  });
}

const ctx={
  G:{fightOn:1, equipped:null, log:[]},
  ADD_SCALE:4,
  clamp:(v,a,b)=>v<a?a:v>b?b:v,
  ri:(a,b)=>a,
  d100:()=>50,
  d20:()=>10,
  beginFight:()=>{},
  isRearAttack:()=>false,
  effectiveAC:()=>10,
  thacNeed:()=>10,
  hitBonus:()=>5,
  hitChancePct:()=>50,
  lastLine:'',
  say:(line)=>{ ctx.lastLine=line; (ctx.G.log=ctx.G.log||[]).push(line); },
  ftext:()=>{},
  rollExpr:()=>4,
  entityAbil:(e)=>e.abil||{str:10},
  weaponVsDouble:()=>false,
  wepMult:()=>1,
  dist:()=>1,
  hint:()=>{},
  player:()=>ctx.hero,
  attackClass:(e)=>e.team==='foe'?'m':'f',
  strMods:(ab)=> {
    const s=(ab&&ab.str)|0;
    if(s>=17) return {hit:1,dmg:1};
    return {hit:0,dmg:0};
  }
};
ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext(extractConst('SPECIALTY'), ctx);
['specialtyBand','specialtyInBand','specialtyHitBonus','armSpecialty','beginSpecialtySwing','endSpecialtySwing','pickMonsterSpecialty','addAttack'].forEach(n=>{
  vm.runInContext(extractFn(n), ctx);
});

assert(ctx.specialtyInBand(1,15) && ctx.specialtyInBand(1,20) && !ctx.specialtyInBand(1,21) && !ctx.specialtyInBand(1,14),
  'I is 15–20 only (21+ is not I)');
assert(ctx.specialtyInBand(2,17) && ctx.specialtyInBand(2,20) && !ctx.specialtyInBand(2,16),
  'II is 17–20');
assert(ctx.specialtyInBand(3,19) && ctx.specialtyInBand(3,20) && !ctx.specialtyInBand(3,18),
  'III is 19–20');
assert(ctx.specialtyInBand(4,21) && ctx.specialtyInBand(4,25) && !ctx.specialtyInBand(4,20),
  'IV is 21+');

const hero={name:'Macar', team:'party', hero:1, cls:'f', abil:{str:10}, gear:{magicAtk:0}, dice:'1d8'};
assert(ctx.specialtyHitBonus(hero)===0, 'STR 10 + no magic weapon = +0 band bonus');
hero.abil={str:17}; hero.gear={magicAtk:1};
assert(ctx.specialtyHitBonus(hero)===2, 'STR 17 (+1) and +1 weapon = +2, no rear/dex/buff');
hero.buff=8; hero.gear.magicAtk=1;
assert(ctx.specialtyHitBonus(hero)===2, 'buff does not enter the specialty tot');

ctx.hero={specialty:0};
assert(ctx.armSpecialty(2)===2 && ctx.hero.specialty===2, 'tap II arms it');
assert(ctx.armSpecialty(2)===0 && ctx.hero.specialty===0, 'tap lit II again cancels');
ctx.armSpecialty(2);
const spent=ctx.beginSpecialtySwing(ctx.hero);
assert(spent===2 && ctx.hero.specialty===0 && ctx.hero._specialty===2 && ctx.hero.ct>=1.15,
  'next swing spends the pick and locks a full round');
ctx.endSpecialtySwing(ctx.hero);
assert(ctx.hero._specialty===0, 'swing clears the spent pick');

ctx.thacNeed=()=>10;
const atk={name:'Macar', team:'party', hero:1, cls:'f', abil:{str:10}, gear:{}, dice:'1d8'};
const def={team:'foe', ac:10, x:1, y:1, stun:0, prone:0};

const hit=ctx.addAttack(atk, def, {specialty:2, roll:18});
assert(hit>0, 'II tot 18 vs need 10 is a hit');
assert(/Specialty II/.test(ctx.lastLine) && /×3/.test(ctx.lastLine),
  'log says Specialty II ×3 ('+ctx.lastLine+')');
assert(hit>=4*3*4, '×3 is applied after weapon dice and before ADD_SCALE (got '+hit+')');

const missBand=ctx.addAttack(atk, def, {specialty:2, roll:16});
assert(missBand===0 && /miss/.test(ctx.lastLine),
  'tot 16 on II is a MISS even if it would hit AC ('+ctx.lastLine+')');

ctx.thacNeed=()=>20;
const missMat=ctx.addAttack(atk, def, {specialty:2, roll:18});
assert(missMat===0 && /miss/.test(ctx.lastLine),
  'tot 18 that misses the matrix is a MISS ('+ctx.lastLine+')');

ctx.thacNeed=()=>10;
const ivMiss=ctx.addAttack(atk, def, {specialty:4, roll:20});
assert(ivMiss===0, 'IV needs 21+; tot 20 is a miss');
const ivHit=ctx.addAttack(atk, def, {specialty:4, roll:21});
assert(ivHit>0 && /×5/.test(ctx.lastLine), 'IV tot 21 hits and logs ×5');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nspecialty attack checks passed');

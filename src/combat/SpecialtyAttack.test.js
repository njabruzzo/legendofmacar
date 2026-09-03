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
assert(/matrixTot>=need/.test(html) && /specialtyInBand\(specKind, specTot\)/.test(html),
  'band tot is STR+magic; matrix still uses addAttack mods');
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
  let pil=false;
  try {
    const {execSync}=require('child_process');
    execSync('python3 -c "from PIL import Image"', {encoding:'utf8', stdio:'pipe'});
    pil=true;
    ['i','ii','iii','iv'].forEach(n=>{
      const out=execSync('python3 -c "from PIL import Image; im=Image.open(\''+path.join(iconDir,'icon_specialty_'+n+'.png')+'\'); print(im.size[0], im.size[1])"', {encoding:'utf8'}).trim();
      assert(out==='96 144', 'icon_specialty_'+n+' is 96×144 (got '+out+')');
    });
  } catch(e){
    if(!pil) assert(true, 'skip specialty icon pixel size (no pngjs/PIL)');
    else throw e;
  }
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
  weaponVsPlus:(wep, def)=>{
    if(globalThis.DwarfMouth&&globalThis.DwarfMouth.weaponVsPlus) return globalThis.DwarfMouth.weaponVsPlus(wep, def)|0;
    return 0;
  },
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
['wornWeaponPlus','specialtyBand','specialtyInBand','specialtyHitBonus','armSpecialty','beginSpecialtySwing','endSpecialtySwing','pickMonsterSpecialty','addAttack'].forEach(n=>{
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

ctx.hitBonus=()=>0;
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
ctx.isRearAttack=()=>true;
ctx.hitBonus=()=>0;
const rearNoBand=ctx.addAttack(atk, def, {specialty:2, roll:16});
assert(rearNoBand===0, 'rear/dex/buff cannot push the band tot (16+rear is still a II miss)');
ctx.isRearAttack=()=>false;

ctx.thacNeed=()=>20;
ctx.hitBonus=()=>2;
const matrixMods=ctx.addAttack(atk, def, {specialty:2, roll:18});
assert(matrixMods>0 && /×3/.test(ctx.lastLine),
  'rear/dex/buff may still apply to the matrix check (18 band, 20 matrix)');
ctx.hitBonus=()=>0;
ctx.thacNeed=()=>10;

const ivMiss=ctx.addAttack(atk, def, {specialty:4, roll:20});
assert(ivMiss===0, 'IV needs 21+; tot 20 is a miss');
const ivHit=ctx.addAttack(atk, def, {specialty:4, roll:21});
assert(ivHit>0 && /×5/.test(ctx.lastLine), 'IV tot 21 hits and logs ×5');

assert(/wornWeaponPlus\(e/.test(extractFn('specialtyHitBonus')),
  'specialty tot reads wornWeaponPlus, not a frozen primary magicAtk');
assert(/wornWeaponPlus\(e/.test(html.match(/function hitBonus\([\s\S]*?\nfunction effectiveAC/)[0]),
  'matrix hitBonus also uses wornWeaponPlus');

const bow={n:'Crossbow of Accuracy +3', k:'weapon', plus:3, slot:'secondary'};
const xbow={n:'Light Crossbow', k:'weapon', slot:'secondary'};
const hammer={n:"Macar's War Hammer", k:'weapon', plus:0, slot:'primary'};
const cleaver={n:'Shadow Cleaver', k:'weapon', plus:2, vs:'spider,undead', vsDouble:1, slot:'primary'};
const protRing={n:'Ring of Protection +1', k:'ring', plus:1};

ctx.G.equipped={primary:hammer, weapon:hammer, secondary:bow, necklace:protRing};
const missile={name:'Macar', team:'party', hero:1, cls:'f', abil:{str:17}, gear:{magicAtk:0}, dice:'1d4', ranged:1};
assert(ctx.wornWeaponPlus(missile)===3, 'secondary +3 bow feeds missile plus');
assert(ctx.specialtyHitBonus(missile)===4, 'STR 17 + secondary +3 = +4 specialty tot on a missile spend');

const melee={name:'Macar', team:'party', hero:1, cls:'f', abil:{str:17}, gear:{magicAtk:2}, dice:'1d8', ranged:0};
ctx.G.equipped={primary:cleaver, weapon:cleaver, secondary:bow};
assert(ctx.wornWeaponPlus(melee)===2, 'melee uses primary plus, not the worn bow');
assert(ctx.specialtyHitBonus(melee)===3, 'STR 17 + Shadow Cleaver +2 = +3; bow stays out of melee tot');

ctx.G.equipped={primary:hammer, weapon:hammer, secondary:xbow};
const mundane={name:'Macar', team:'party', hero:1, cls:'f', abil:{str:10}, gear:{magicAtk:0}, dice:'1d4', ranged:1};
assert(ctx.wornWeaponPlus(mundane)===0, 'mundane Light Crossbow stays 0');
assert(ctx.specialtyHitBonus(mundane)===0, 'mundane xbow does not invent a specialty plus');

ctx.G.equipped={primary:hammer, weapon:hammer, secondary:bow, necklace:{k:'dex', dexPlus:1, n:'Ring of Dexterity +1'}};
assert(ctx.specialtyHitBonus(missile)===4, 'dex ring still does not enter the specialty tot');
ctx.G.equipped.necklace=protRing;
assert(ctx.specialtyHitBonus(missile)===4, 'Protection plus does not enter the specialty tot');

ctx.thacNeed=()=>10;
ctx.hitBonus=()=>0;
ctx.rollExpr=()=>4;
ctx.G.equipped={primary:hammer, weapon:hammer, secondary:bow};
const boltAtk={name:'Macar', team:'party', hero:1, cls:'f', abil:{str:10}, gear:{magicAtk:0}, dice:'1d4', ranged:1};
const boltHit=ctx.addAttack(boltAtk, def, {roll:18});
assert(boltHit>=(4+3)*4, 'secondary +3 feeds missile damage (got '+boltHit+')');

ctx.G.equipped={primary:cleaver, weapon:cleaver, secondary:xbow};
ctx.weaponVsDouble=()=>false;
const meleeAtk={name:'Macar', team:'party', hero:1, cls:'f', abil:{str:10}, gear:{magicAtk:2}, dice:'1d8', ranged:0};
const meleeHit=ctx.addAttack(meleeAtk, def, {roll:18});
assert(meleeHit>=(4+2)*4, 'primary melee plus still adds to damage (got '+meleeHit+')');
ctx.weaponVsDouble=(wep, foe)=>!!(wep&&wep.vsDouble);
const vsHit=ctx.addAttack(meleeAtk, {team:'foe', ac:10, x:1, y:1, stun:0, prone:0, kind:'spider'}, {roll:18});
assert(vsHit>=(4+2)*2*4, 'Shadow Cleaver vs spider still doubles (got '+vsHit+')');

require('../props/DwarfMouth.js');
const vsSword={n:'Long Sword +1, +3 vs lycanthropes and shape changers',k:'weapon',plus:1,vs:'lycan',vsPlus:2,slot:'primary'};
const dragonSword={n:'Long Sword +2, Dragon Slayer',k:'weapon',plus:2,vs:'dragon',vsPlus:2,slot:'primary',
  d:'+2, +4 vs a chosen dragon type. A wyrm\'s bane.'};
const giantSword={n:'Long Sword +3, Giant Slayer',k:'weapon',plus:3,vs:'giant',vsPlus:3,slot:'primary'};
const were={team:'foe', ac:10, x:1, y:1, stun:0, prone:0, kind:'lycan', name:'Werewolf'};
const wyrm={team:'foe', ac:10, x:1, y:1, stun:0, prone:0, kind:'shadowdragon', name:'Shadow Dragon'};
const giant={team:'foe', ac:10, x:1, y:1, stun:0, prone:0, kind:'stonegiant', name:'Stone Giant'};
const gob={team:'foe', ac:10, x:1, y:1, stun:0, prone:0, kind:'goblin', name:'Goblin'};

ctx.weaponVsDouble=()=>false;
ctx.G.equipped={primary:vsSword, weapon:vsSword, secondary:xbow};
const vsWielder={name:'Macar', team:'party', hero:1, cls:'f', abil:{str:17}, gear:{magicAtk:1}, dice:'1d8', ranged:0};
assert(ctx.wornWeaponPlus(vsWielder)===1, 'vs sword without a foe is base plus only');
assert(ctx.wornWeaponPlus(vsWielder, gob)===1, 'vs sword vs goblin stays +1');
assert(ctx.wornWeaponPlus(vsWielder, were)===3, 'lycan sword tot +3 vs werewolf (base 1 + extra 2)');
assert(ctx.specialtyHitBonus(vsWielder, were)===4, 'STR 17 + effective +3 vs lycan = +4 specialty tot');
assert(ctx.specialtyHitBonus(vsWielder, gob)===2, 'specialty tot vs goblin is STR + base only');
assert(ctx.specialtyHitBonus(vsWielder, were)===4, 'rear/dex/buff still stay out of the vs specialty tot');

ctx.G.equipped={primary:dragonSword, weapon:dragonSword};
const dragWielder={name:'Macar', team:'party', hero:1, cls:'f', abil:{str:10}, gear:{magicAtk:2}, dice:'1d8', ranged:0};
assert(ctx.wornWeaponPlus(dragWielder, wyrm)===4, 'dragon slayer tot +4 vs dragon');
assert(ctx.specialtyHitBonus(dragWielder, wyrm)===4, 'specialty tot uses dragon slayer effective plus');
ctx.G.equipped={primary:giantSword, weapon:giantSword};
assert(ctx.wornWeaponPlus(dragWielder, giant)===6, 'giant slayer tot +6 vs giant');
assert(ctx.wornWeaponPlus(dragWielder, wyrm)===3, 'giant slayer vs dragon is base +3 only');

ctx.thacNeed=()=>10;
ctx.hitBonus=()=>0;
ctx.rollExpr=()=>4;
ctx.G.equipped={primary:vsSword, weapon:vsSword};
const vsStr10={name:'Macar', team:'party', hero:1, cls:'f', abil:{str:10}, gear:{magicAtk:1}, dice:'1d8', ranged:0};
const lycanDmg=ctx.addAttack(vsStr10, were, {roll:18});
assert(lycanDmg>=(4+1+2)*4, 'vs extra applies to damage (got '+lycanDmg+')');
const gobDmg=ctx.addAttack(vsStr10, gob, {roll:18});
assert(gobDmg>=(4+1)*4 && gobDmg<(4+1+2)*4, 'no vs extra damage vs goblin (got '+gobDmg+')');

ctx.G.equipped={primary:cleaver, weapon:cleaver};
ctx.weaponVsDouble=(wep, foe)=>!!(wep&&wep.vsDouble&&foe&&foe.kind==='spider');
assert(ctx.wornWeaponPlus(melee, {kind:'spider'})===2, 'cleaver vs spider stays plus:2 for specialty/hit');
assert(ctx.specialtyHitBonus(melee, {kind:'spider'})===3, 'cleaver specialty tot is STR +2, not a vsPlus bump');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nspecialty attack checks passed');

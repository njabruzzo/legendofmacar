'use strict';
/**
 * Macar's PACK tab shows his sheet: XP toward next level, AC, THAC0,
 * melee / crossbow to-hit, damage, and a summary of his special abilities.
 * Numbers come from the same helpers the dice use.
 * Run: node src/ui/MacarSheet.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}
/* Brace-balanced: one-line helpers (clsName, xpTable…) end mid-line. */
function extractFn(name){
  const start=html.indexOf('\nfunction '+name+'(');
  if(start<0) throw new Error('missing '+name);
  const open=html.indexOf('{', html.indexOf(')', start));
  let depth=0;
  for(let i=open;i<html.length;i++){
    const c=html[i];
    if(c==='{') depth++;
    else if(c==='}'){ depth--; if(!depth) return html.slice(start, i+1); }
  }
  throw new Error('unbalanced '+name);
}
function extractConst(name, open, close){
  const m=html.match(new RegExp('const '+name+'=\\'+open+'[\\s\\S]*?\\n?\\'+close+';'));
  if(!m) throw new Error('missing '+name);
  return m[0];
}

const mac={hero:1, team:'party', race:'dwarf', cls:'f', role:'hero', lvl:3, hp:20, maxhp:30, gear:{}, col:{key:'macar', name:'MACAR'}, dice:'1d8'};
const G={charXp:{macar:5000}, equipped:{primary:{n:"Macar's War Hammer", plus:1, dice:'1d8'}, secondary:{n:'Heavy Crossbow', cat:'Weapon'}},
  abil:{macar:{str:18, exc:76, int:10, wis:12, dex:11, con:18, cha:10, cls:'f', lvl:3}}, xp:{weapon:28, mining:7},
  packs:{macar:{ammo:12}}};
const ctx={
  G, Math, Object,
  PARTY_LVL:3, ADD_SCALE:1, PORT:false,
  clamp:(v,a,b)=>v<a?a:v>b?b:v,
  player:()=>mac,
  packOf:(k)=>G.packs[k],
  entityAbil:(e)=>G.abil[e.col.key],
  ensureCharXp:()=>{},
  effectiveAC:()=>2,
  partyLevel:()=>3,
  wornWeaponPlus:(e)=>e.ranged?0:1,
  effectiveDex:(e)=>G.abil.macar.dex,
  meleeStrAbil:(e)=>G.abil.macar,
  inDarkZone:()=>false,
  monsterHD:()=>1,
  sheetHpNow:(e)=>e.hp, sheetHpMax:(e)=>e.maxhp,
  EquipmentSlots:{describeAC:()=>({note:''}), isShield:()=>false}
};
vm.createContext(ctx);
['THAC_F','THAC_M','THAC_C','THAC_T','XP_F','XP_C','XP_T','SKILLS'].forEach(n=>vm.runInContext(extractConst(n,'[',']'), ctx));
vm.runInContext(extractConst('SPECIALTY','{','}'), ctx);
['acCol','attackClass','fighterMatrixRow','monsterMatrixRow','thacNeed','strMods','dexAttackAdj','dexMissile','hitBonus',
 'isDwarf','dwarfConSaveAdj','dwarfSaveCon','dwarfSaveBonus','strLabel','clsName','xpTable','xpForNext','skillLvl',
 'fmtSigned','macarSheetSummary'].forEach(n=>vm.runInContext(extractFn(n), ctx));

const S=ctx.macarSheetSummary();
assert(!!S, 'macarSheetSummary returns a sheet');
const thac0=ctx.thacNeed(mac, 0);
assert(S.thac0===thac0 && thac0>=2 && thac0<=20, 'THAC0 is the dice-table value vs AC 0 ('+thac0+')');
assert(S.melee===ctx.hitBonus(Object.assign({}, mac, {ranged:0}), null), 'melee to-hit matches hitBonus');
assert(S.melee===3, 'melee to-hit is STR 18/76 (+2) plus the +1 hammer');
assert(S.bolt===0, 'crossbow to-hit uses DEX 11 (+0), not STR');
assert(!mac.ranged, 'reading the crossbow line leaves Macar in melee');
assert(S.combat.some(t=>/^THAC0 \d+$/.test(t)), 'combat row shows THAC0');
assert(S.combat.some(t=>/^Melee \+3 \(hits AC 0 on \d+\)$/.test(t)), 'combat row shows melee to-hit and the AC 0 target');
assert(S.combat.some(t=>/^Dmg 1d8\+5$/.test(t)), 'combat row shows damage (1d8 + STR 4 + hammer 1)');
assert(S.combat.some(t=>/^Crossbow \+0 · 1d4 · 12 bolts$/.test(t)), 'combat row shows the crossbow line with bolts');
assert(S.ac==='AC 2' && S.hp==='HP 20/30', 'AC and HP are on the sheet');
assert(S.xpText==='XP 5000 / 8001' && S.lvl===3, 'XP shows progress toward the next fighter level');
assert(S.xpFrac>0.24 && S.xpFrac<0.26, 'XP bar fills from this level to the next');
assert(S.specials.some(t=>/^Specialty strikes I–IV: ×2 on 15–20, ×3 on 17–20, ×4 on 19–20, ×5 on 21\+$/.test(t)),
  'specials list the Specialty I–IV bands');
assert(S.specials.some(t=>/^Dwarf: \+5 saves vs poison, rods & spells$/.test(t)), 'specials list the dwarf CON 18 save bonus');
assert(S.specials.some(t=>/Sees in the dark/.test(t)), 'specials note dwarf darkvision');
assert(S.specials.some(t=>/^STR 18\/76: \+2 hit, \+4 dmg$/.test(t)), 'specials list exceptional STR');
assert(S.specials.some(t=>/^Skills: Weapon Smithing \d+, Mining \d+$/.test(t)), 'specials list Macar\'s own skills');

const pack=html.match(/function drawPack\(g\)\{[\s\S]*?\nfunction wareCostGp/)[0];
assert(/drawMacarSheetPanel\(g, 10\*s, kitY, VW-20\*s, s, supply\)/.test(pack), 'PACK draws Macar\'s sheet panel on his tab');
assert(/G\.packWho==='macar'/.test(pack), 'the sheet is Macar\'s tab only; kin keep the kit strip');
const panel=extractFn('drawMacarSheetPanel');
assert(/S\.xpText/.test(panel) && /S\.xpFrac/.test(panel), 'panel paints XP text and the XP bar');
assert(/S\.combat/.test(panel) && /S\.specials/.test(panel) && /S\.ac/.test(panel), 'panel paints AC, to-hit and specials');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nMacar sheet checks passed');

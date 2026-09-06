'use strict';
/**
 * PACK Equip must keep a mouth-spit Shadow Cleaver on the All-tab list
 * (collectPackRows) so it can be re-equipped. QA #203 criterion 4.
 *
 * The live path is DwarfMouth spit → takeLoot → giveMagic (real ensurePacks,
 * not a hand-built starting kit), then PACK Equip on the war hammer.
 * Run: node src/packs/ShadowCleaverStow.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');

require('./EquipmentSlots.js');
require('../props/DwarfMouth.js');
const Eq=globalThis.EquipmentSlots;
const M=globalThis.DwarfMouth;
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

function extractFn(name){
  const start=html.indexOf('function '+name+'(');
  if(start<0) throw new Error('missing '+name);
  let i=html.indexOf('{', start);
  let depth=0;
  for(; i<html.length; i++){
    const ch=html[i];
    if(ch==='{') depth++;
    else if(ch==='}'){
      depth--;
      if(depth===0) return html.slice(start, i+1);
    }
  }
  throw new Error('unclosed '+name);
}

const packUi=html.match(/function drawPack\(g\)\{[\s\S]*?\nfunction wareCostGp/)[0];
assert(/confirmPackEquip\(\)/.test(packUi), 'PACK Equip button calls confirmPackEquip');
assert(!/if\(wornSlotOf\(G\.packSel\)\) unequipPackSlot\(wornSlotOf\(G\.packSel\)\)/.test(packUi),
  'Equip button no longer inlines a worn-only unequip that skips restow');
assert(/function confirmPackEquip\(/.test(html), 'confirmPackEquip is the UI entry point');
assert(/restowDisplacedKit\(before/.test(extractFn('ensureEquippedShape')),
  'doll ensureEquippedShape restows aliases ensureShape would drop');
assert(/ensureWornKitPacked\(\)/.test(extractFn('collectPackRows')),
  'All-tab collectPackRows packs worn kit that is missing from magic');
assert(/ensureShadowCleaverPacked\(\)/.test(extractFn('collectPackRows')),
  'All-tab collectPackRows also pins a remembered Shadow Cleaver');
assert(/rememberShadowCleaver\(axe\)/.test(extractFn('dropInDwarfMouth')),
  'mouth spit pins the live axe object after takeLoot');
assert(/stowPackItem\(axe/.test(extractFn('dropInDwarfMouth')),
  'mouth spit restows the spit axe even if takeLoot no-ops');
assert(/if\(isShadowCleaver\(it\)\) stowPackItem\(it/.test(extractFn('giveMagic')),
  'giveMagic restows the cleaver after maybeAutoEquip');
assert(/EquipmentSlots\.ALL_KEYS/.test(extractFn('ensureWornKitPacked')),
  'ensureWornKitPacked walks ALL_KEYS so a weapon-only cleaver is packed');
assert(/out\.orphan/.test(extractFn('equipPackItem')),
  'equipPackItem restows the orphan .weapon EquipmentSlots.equip would drop');

const LIVE_FNS=[
  'isShadowCleaver','findShadowCleaver','rememberShadowCleaver','knownShadowCleaver',
  'ensureShadowCleaverPacked','wieldsShadowCleaver','packHasItem',
  'stowPackItem','snapshotWornKit','restowDisplacedKit','ensureWornKitPacked',
  'packSelItem','confirmPackEquip','ensureShadowCleaverWielded','ensureEquippedShape',
  'mapPackItemToEquipment','wornSlotOf','equipPackItem','unequipPackSlot',
  'maybeAutoEquip','ensureMacarHammer','ensureMacarStartingGear','wieldWeapon',
  'giveMagic','takeLoot','newPack','ensurePacks','packOf','isHealPotion',
  'isEquipWeapon','isEquipArmor','isPackEquipable','livingMacarIdleKey','collectPackRows'
];

function baseStubs(ctx){
  ctx.says=[];
  ctx.lastSay='';
  ctx.say=function(line){ ctx.lastSay=line; ctx.says.push(line); };
  ctx.isGhostPack=function(){ return false; };
  ctx.player=function(){ return ctx.G.ents[0]; };
  ctx.syncPackTotals=function(){
    if(typeof ctx.ensurePacks==='function') ctx.ensurePacks();
    ctx.G.inv=ctx.G.packs&&ctx.G.packs.macar;
  };
  ctx.partyAC=function(){ return 7; };
  ctx.wornAttackCd=function(e){ return e&&e.cd; };
  ctx.applyHoverFlags=function(){};
  ctx.kinName=function(){ return 'MACAR'; };
  ctx.sprReady=function(k){ return k==='macar'||k==='macar_axe'; };
  ctx.convertHoard=function(){ return []; };
  ctx.givePotion=function(){ return ''; };
  ctx.giveClue=function(){ return ''; };
  ctx.giveGem=function(){ return ''; };
  ctx.addToPack=function(){};
  ctx.packGainNote=function(){};
  ctx.awardPartyXp=function(){};
  ctx.applyEquipped=function(){
    if(typeof ctx.ensureEquippedShape==='function') ctx.ensureEquippedShape();
    const eq=ctx.G.equipped||{};
    eq.weapon=eq.primary||eq.weapon;
    eq.armor=eq.chest||eq.armor;
  };
}

function bootLive(){
  const ctx={
    G:{
      packs:{},
      equipped:Eq.emptyEquipped(),
      packWho:'macar',
      packSel:null,
      packTab:'all',
      macarGearReady:0,
      shadowCleaver:null,
      loot:[],
      lvl:{flags:{}},
      ents:[{name:'Macar', hero:1, dice:'1d8', cd:1.05, baseCd:1.05, col:{key:'macar'}}],
      gear:{macar:{magicAtk:0, magicAc:0}}
    },
    ROSTER:[
      {key:'macar', name:'MACAR'},
      {key:'pordoom', name:'PORDUM'},
      {key:'fendur', name:'FENDUR'},
      {key:'orbo', name:'ORBO'},
      {key:'talpor', name:'TALPOR'}
    ],
    EquipmentSlots:Eq,
    DwarfMouth:M,
    HERBS:[]
  };
  baseStubs(ctx);
  vm.createContext(ctx);
  LIVE_FNS.forEach(n=>vm.runInContext(extractFn(n), ctx));
  ctx.ensurePacks();
  ctx.ham=(ctx.G.packs.macar.magic||[]).find(it=>it&&it.id==='macar_hammer')||M.macarHammerItem();
  return ctx;
}

function mouthObtain(ctx){
  const ruby={n:'Ruby', guardian:1, d:'A blood-red shard from a ruby guardian.', src:'guardian'};
  const verdict=M.resolveMouthDrop(ruby, !!ctx.G.lvl.flags.faceFed);
  assert(verdict.ok && verdict.spit && verdict.spit.length===2, 'mouth spit is key + Shadow Cleaver');
  const key=verdict.spit[0], axe=verdict.spit[1];
  ctx.G.lvl.flags.faceFed=1;
  /* Live dropInDwarfMouth: spitNearFace → takeLoot(pile, true) → giveMagic. */
  ctx.takeLoot({items:[key], coins:{}, potions:[], gone:0}, true);
  ctx.takeLoot({items:[axe], coins:{}, potions:[], gone:0}, true);
  if(typeof ctx.rememberShadowCleaver==='function') ctx.rememberShadowCleaver(axe);
  if(typeof ctx.stowPackItem==='function') ctx.stowPackItem(axe, {front:false});
  ctx.axe=axe;
  ctx.key=key;
  return {key, axe};
}

function packHasCleaver(ctx){
  return (ctx.G.packs.macar.magic||[]).some(it=>M.isShadowCleaver(it));
}
function rowsHaveCleaver(ctx){
  const rows=ctx.collectPackRows(ctx.G.packs.macar, 'macar');
  return rows.some(r=>r.it&&(M.isShadowCleaver(r.it)||r.it.id==='shadow_cleaver'));
}
function primaryName(ctx){
  const wep=ctx.G.equipped.primary||ctx.G.equipped.weapon;
  return wep&&wep.n;
}

/* Live mouth path: spit / takeLoot / giveMagic, then PACK Equip the hammer. */
{
  const ctx=bootLive();
  assert(primaryName(ctx)==="Macar's War Hammer", 'real ensurePacks starts with the war hammer');
  assert(!packHasCleaver(ctx), 'starting kit does not include the cleaver');
  mouthObtain(ctx);
  assert(ctx.wieldsShadowCleaver() || packHasCleaver(ctx),
    'mouth takeLoot/giveMagic leaves the cleaver wielded or packed');
  assert(packHasCleaver(ctx),
    'giveMagic + mouth stow keep shadow_cleaver in pack.magic (not weapon-only)');
  assert((ctx.G.packs.macar.magic||[]).some(it=>it&&it.id==='dwarf_mouth_key'),
    'mouth key is also in pack.magic');
  const hamAfterMouth=(ctx.G.packs.macar.magic||[]).find(it=>it&&it.id==='macar_hammer');
  assert(!!hamAfterMouth, 'auto-equip restows the hammer instead of leaving it nowhere');
  ctx.ham=hamAfterMouth;
  ctx.G.packSel=ctx.ham;
  ctx.G.packTab='all';
  ctx.ensureEquippedShape();
  ctx.confirmPackEquip();
  assert(primaryName(ctx)==="Macar's War Hammer", 'confirmPackEquip wields the selected hammer');
  assert(packHasCleaver(ctx), 'cleaver is in pack.magic after PACK Equip (mouth path)');
  assert(rowsHaveCleaver(ctx), 'All-tab collectPackRows still contains shadow_cleaver');
  const row=ctx.collectPackRows(ctx.G.packs.macar, 'macar').find(r=>r.it&&M.isShadowCleaver(r.it));
  assert(row && row.t==='Shadow Cleaver', 'All-tab row title is Shadow Cleaver');
  ctx.G.packSel=ctx.findShadowCleaver();
  ctx.confirmPackEquip();
  assert(ctx.wieldsShadowCleaver(), 're-Equip via confirmPackEquip succeeds');
  assert(ctx.livingMacarIdleKey()==='macar_axe', 're-Equip restores the axe blit key');
}

/* Live park the QA screenshot hits: mouth object exists, but only on
   G.equipped.weapon (blit OK) while primary is still the hammer and
   pack.magic has no cleaver. find used to look at primary||weapon. */
{
  const ctx=bootLive();
  const got=mouthObtain(ctx);
  ctx.G.packs.macar.magic=(ctx.G.packs.macar.magic||[]).filter(it=>!M.isShadowCleaver(it));
  ctx.G.equipped.primary=ctx.ham;
  ctx.G.equipped.weapon=got.axe;
  ctx.G.shadowCleaver=got.axe;
  assert(!packHasCleaver(ctx), 'fixture: cleaver stripped from pack.magic');
  assert(ctx.wieldsShadowCleaver(), 'fixture: blit still reads .weapon as the cleaver');
  assert(M.isShadowCleaver(ctx.findShadowCleaver()),
    'findShadowCleaver sees the weapon-only cleaver behind a hammer primary');
  ctx.G.packSel=ctx.ham;
  ctx.confirmPackEquip();
  assert(primaryName(ctx)==="Macar's War Hammer", 'Equip hammer from the weapon-only park');
  assert(rowsHaveCleaver(ctx), 'All-tab lists the restowed mouth-spit cleaver');
  ctx.G.packSel=ctx.findShadowCleaver();
  ctx.confirmPackEquip();
  assert(ctx.wieldsShadowCleaver() && ctx.livingMacarIdleKey()==='macar_axe',
    're-Equip after weapon-only restow restores axe blit');
}

/* Opening PACK / Equip used to run ensureShape and drop .weapon. */
{
  const ctx=bootLive();
  const got=mouthObtain(ctx);
  ctx.G.equipped.primary=ctx.ham;
  ctx.G.equipped.weapon=got.axe;
  ctx.ensureEquippedShape();
  assert(packHasCleaver(ctx), 'doll ensureEquippedShape restows the orphan .weapon cleaver');
  ctx.G.packSel=ctx.ham;
  ctx.confirmPackEquip();
  assert(rowsHaveCleaver(ctx), 'All-tab still lists the restowed cleaver after Equip');
}

/* Equip button on an already-worn hammer unequips/re-dons; cleaver must survive. */
{
  const ctx=bootLive();
  const got=mouthObtain(ctx);
  ctx.G.equipped.primary=ctx.ham;
  ctx.G.equipped.weapon=got.axe;
  ctx.G.packSel=ctx.ham;
  ctx.confirmPackEquip();
  assert(rowsHaveCleaver(ctx), 'Equip on worn hammer restows the .weapon cleaver into All-tab');
}

{
  const ctx=bootLive();
  mouthObtain(ctx);
  ctx.G.packSel=ctx.ham;
  ctx.confirmPackEquip();
  ctx.ensureShadowCleaverWielded();
  assert(primaryName(ctx)==="Macar's War Hammer",
    'attack helper does not steal the hand back from an explicit hammer');
}

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nShadow Cleaver stow/switch checks passed');

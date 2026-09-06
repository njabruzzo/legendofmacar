'use strict';
/**
 * PACK Equip button / doll primary must keep Shadow Cleaver on the All-tab
 * list (collectPackRows) so it can be re-equipped. QA #203 criterion 4.
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
  const re=new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}');
  const m=html.match(re);
  if(!m) throw new Error('missing '+name);
  return m[0];
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

function boot(opts){
  opts=opts||{};
  const ham=M.macarHammerItem();
  const axe=opts.axe||M.shadowCleaverItem();
  const magic=opts.magic!=null?opts.magic.slice():[ham];
  const eq=opts.eq||Eq.equip(Eq.emptyEquipped(), ham).equipped;
  const ctx={
    G:{
      packs:{macar:{magic:magic, potions:[], healPots:[], gems:[], herbs:{}, notes:[],
        ammo:13, rations:7, torches:8, bombs:0, ales:0, bombKit:0, burps:0}},
      equipped:eq,
      packWho:'macar',
      packSel:null,
      packTab:'all',
      macarGearReady:1,
      ents:[{name:'Macar', hero:1, dice:'1d8', cd:1.05, baseCd:1.05, col:{key:'macar'}}],
      gear:{macar:{magicAtk:0, magicAc:0}}
    },
    EquipmentSlots:Eq,
    DwarfMouth:M,
    HERBS:[],
    lastSay:'',
    says:[],
    ham, axe,
    say(line){ ctx.lastSay=line; ctx.says.push(line); },
    isGhostPack(){ return false; },
    ensurePacks(){},
    packOf(key){ return ctx.G.packs[key||'macar']; },
    player(){ return ctx.G.ents[0]; },
    syncPackTotals(){},
    partyAC(){ return 7; },
    wornAttackCd(e){ return e&&e.cd; },
    applyHoverFlags(){},
    isHealPotion(){ return false; },
    isEquipWeapon(it){ return !!(it&&(it.k==='weapon'||it.cat==='Weapon')); },
    isEquipArmor(){ return false; },
    isPackEquipable(r){
      const it=r&&r.it;
      if(!it||(r.kind!=='magic'&&r.kind!=='gear')) return false;
      return Eq.isEquippable(it);
    },
    kinName(){ return 'MACAR'; },
    sprReady(k){ return k==='macar'||k==='macar_axe'; }
  };
  vm.createContext(ctx);
  [
    'isShadowCleaver','findShadowCleaver','wieldsShadowCleaver','packHasItem',
    'stowPackItem','snapshotWornKit','restowDisplacedKit','ensureWornKitPacked',
    'packSelItem','confirmPackEquip','ensureShadowCleaverWielded','ensureEquippedShape',
    'mapPackItemToEquipment','wornSlotOf','equipPackItem','unequipPackSlot',
    'maybeAutoEquip','ensureMacarHammer','wieldWeapon','giveMagic','applyEquipped',
    'livingMacarIdleKey','collectPackRows'
  ].forEach(n=>vm.runInContext(extractFn(n), ctx));
  return ctx;
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

/* Live PACK path: EquipCompare selects, Equip button calls confirmPackEquip. */
{
  const ham=M.macarHammerItem();
  const start=Eq.startingItems(()=>ham);
  const magic=[];
  let eq=Eq.emptyEquipped();
  start.forEach(it=>{
    magic.push(it);
    if(Eq.START_WORN.indexOf(it.slot)>=0) eq=Eq.equip(eq, it).equipped;
  });
  const ctx=boot({magic, eq, axe:M.shadowCleaverItem()});
  ctx.ham=magic.find(it=>it.id==='macar_hammer');
  ctx.giveMagic(ctx.axe, true);
  assert(primaryName(ctx)==='Shadow Cleaver', 'giveMagic auto-wields the cleaver');
  ctx.G.packSel=ctx.ham;
  ctx.G.packTab='all';
  ctx.ensureEquippedShape();
  ctx.confirmPackEquip();
  assert(primaryName(ctx)==="Macar's War Hammer", 'confirmPackEquip wields the selected hammer');
  assert(packHasCleaver(ctx), 'cleaver is in pack.magic after PACK Equip');
  assert(rowsHaveCleaver(ctx), 'All-tab collectPackRows still contains shadow_cleaver');
  const row=ctx.collectPackRows(ctx.G.packs.macar, 'macar').find(r=>r.it&&M.isShadowCleaver(r.it));
  assert(row && row.t==='Shadow Cleaver', 'All-tab row title is Shadow Cleaver');
  ctx.G.packSel=ctx.findShadowCleaver();
  ctx.confirmPackEquip();
  assert(ctx.wieldsShadowCleaver(), 're-Equip via confirmPackEquip succeeds');
  assert(ctx.livingMacarIdleKey()==='macar_axe', 're-Equip restores the axe blit key');
}

/* Live desync: blit reads .weapon (cleaver) while primary is still the hammer.
   Opening PACK / Equip runs ensureEquippedShape which used to drop .weapon. */
{
  const ham=M.macarHammerItem();
  const axe=M.shadowCleaverItem();
  const ctx=boot({magic:[ham], axe});
  ctx.G.equipped.primary=ham;
  ctx.G.equipped.weapon=axe;
  assert(!packHasCleaver(ctx), 'desync fixture has no packed cleaver');
  ctx.ensureEquippedShape();
  assert(packHasCleaver(ctx), 'doll ensureEquippedShape restows the orphan .weapon cleaver');
  ctx.G.packSel=ham;
  ctx.confirmPackEquip();
  assert(primaryName(ctx)==="Macar's War Hammer", 'Equip hammer after desync still wields hammer');
  assert(rowsHaveCleaver(ctx), 'All-tab still lists the restowed cleaver after Equip');
  ctx.G.packSel=ctx.findShadowCleaver();
  ctx.confirmPackEquip();
  assert(ctx.wieldsShadowCleaver() && ctx.livingMacarIdleKey()==='macar_axe',
    're-Equip after desync restow restores axe blit');
}

/* Equip button on an already-worn hammer unequips/re-dons; cleaver must survive. */
{
  const ham=M.macarHammerItem();
  const axe=M.shadowCleaverItem();
  const ctx=boot({magic:[ham], axe});
  ctx.G.equipped.primary=ham;
  ctx.G.equipped.weapon=axe;
  ctx.G.packSel=ham;
  ctx.confirmPackEquip();
  assert(rowsHaveCleaver(ctx), 'Equip on worn hammer restows the .weapon cleaver into All-tab');
}

{
  const ctx=boot();
  ctx.giveMagic(ctx.axe, true);
  ctx.G.packSel=ctx.ham;
  ctx.confirmPackEquip();
  ctx.ensureShadowCleaverWielded();
  assert(primaryName(ctx)==="Macar's War Hammer",
    'attack helper does not steal the hand back from an explicit hammer');
}

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nShadow Cleaver stow/switch checks passed');

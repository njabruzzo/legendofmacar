'use strict';
/**
 * PACK Equip of another primary must keep Shadow Cleaver in pack.magic
 * so it can be re-equipped (QA #203 criterion 4).
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

assert(/function stowPackItem\(/.test(html), 'stow helper exists');
assert(/if\(out\.prev && out\.prev!==it\) stowPackItem\(out\.prev\)/.test(extractFn('equipPackItem')),
  'equipPackItem restows the displaced kit');
assert(/if\(out\.item\) stowPackItem\(out\.item\)/.test(extractFn('unequipPackSlot')),
  'unequipPackSlot restows the doffed kit');
assert(/if\(wep && wep!==axe\) return null;/.test(extractFn('ensureShadowCleaverWielded')),
  'ensureShadowCleaverWielded honors an explicit other weapon');

function boot(opts){
  opts=opts||{};
  const ham=M.macarHammerItem();
  const axe=opts.axe||M.shadowCleaverItem();
  const magic=opts.magic!=null?opts.magic.slice():[ham];
  const eq=Eq.equip(Eq.emptyEquipped(), ham).equipped;
  const ctx={
    G:{
      packs:{macar:{magic:magic, potions:[], healPots:[], gems:[], herbs:{}, notes:[]}},
      equipped:eq,
      packWho:'macar',
      macarGearReady:1,
      ents:[{name:'Macar', hero:1, dice:'1d8', cd:1.05, baseCd:1.05, col:{key:'macar'}}],
      gear:{macar:{magicAtk:0, magicAc:0}}
    },
    EquipmentSlots:Eq,
    DwarfMouth:M,
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
    'stowPackItem','ensureShadowCleaverWielded','ensureEquippedShape',
    'mapPackItemToEquipment','wornSlotOf','equipPackItem','unequipPackSlot',
    'maybeAutoEquip','ensureMacarHammer','wieldWeapon','giveMagic','applyEquipped',
    'livingMacarIdleKey','collectPackRows'
  ].forEach(n=>vm.runInContext(extractFn(n), ctx));
  return ctx;
}

function packNames(ctx){
  return (ctx.G.packs.macar.magic||[]).map(it=>it&&it.n);
}
function packHasCleaver(ctx){
  return (ctx.G.packs.macar.magic||[]).some(it=>M.isShadowCleaver(it));
}
function primaryName(ctx){
  const wep=ctx.G.equipped.primary||ctx.G.equipped.weapon;
  return wep&&wep.n;
}

{
  const ctx=boot();
  ctx.giveMagic(ctx.axe, true);
  assert(primaryName(ctx)==='Shadow Cleaver', 'giveMagic auto-wields the cleaver');
  assert(packHasCleaver(ctx), 'giveMagic keeps the cleaver in pack.magic');
  ctx.equipPackItem(ctx.ham);
  assert(primaryName(ctx)==="Macar's War Hammer", 'PACK Equip war hammer wields the hammer');
  assert(packHasCleaver(ctx), 'cleaver stays in pack.magic after hammer Equip');
  assert(packNames(ctx)[0]==='Shadow Cleaver', 'stowed cleaver floats to the front of the pack list');
  const rows=ctx.collectPackRows(ctx.G.packs.macar, 'macar');
  assert(rows.some(r=>r.it&&M.isShadowCleaver(r.it)), 'collectPackRows still lists Shadow Cleaver');
  assert(ctx.findShadowCleaver()===ctx.axe || M.isShadowCleaver(ctx.findShadowCleaver()),
    'findShadowCleaver still sees the stowed axe');
  ctx.equipPackItem(ctx.axe);
  assert(primaryName(ctx)==='Shadow Cleaver', 're-Equip Shadow Cleaver succeeds');
  assert(ctx.wieldsShadowCleaver(), 're-Equip sets wieldsShadowCleaver');
  assert(ctx.livingMacarIdleKey()==='macar_axe', 're-Equip restores the axe blit key');
}

{
  const axe=M.shadowCleaverItem();
  const ham=M.macarHammerItem();
  const ctx=boot({magic:[ham], axe});
  ctx.G.equipped=Eq.equip(ctx.G.equipped, axe).equipped;
  assert(!ctx.G.packs.macar.magic.some(it=>M.isShadowCleaver(it)),
    'equipped-only fixture has no packed cleaver yet');
  ctx.equipPackItem(ham);
  assert(packHasCleaver(ctx), 'equip hammer restows an equipped-only cleaver into pack.magic');
  assert(primaryName(ctx)==="Macar's War Hammer", 'hammer is wielded after restow');
  ctx.equipPackItem(ctx.findShadowCleaver());
  assert(ctx.wieldsShadowCleaver(), 'restowed cleaver can be re-equipped');
}

{
  const ctx=boot();
  ctx.giveMagic(ctx.axe, true);
  ctx.equipPackItem(ctx.ham);
  const before=ctx.G.packs.macar.magic.filter(it=>M.isShadowCleaver(it)).length;
  ctx.ensureShadowCleaverWielded();
  assert(primaryName(ctx)==="Macar's War Hammer",
    'attack helper does not steal the hand back from an explicit hammer');
  assert(ctx.G.packs.macar.magic.filter(it=>M.isShadowCleaver(it)).length===before,
    'attack helper does not duplicate the packed cleaver');
}

{
  const ctx=boot();
  ctx.giveMagic(ctx.axe, true);
  ctx.equipPackItem(ctx.ham);
  ctx.equipPackItem(ctx.axe);
  ctx.equipPackItem(ctx.ham);
  const n=ctx.G.packs.macar.magic.filter(it=>M.isShadowCleaver(it)).length;
  assert(n===1, 'switch loop does not clone extra Shadow Cleavers (got '+n+')');
}

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nShadow Cleaver stow/switch checks passed');

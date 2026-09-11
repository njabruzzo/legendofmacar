'use strict';
/**
 * Fresh New Game → Chapter I: cave-in behind, kin buried/rouseable as
 * ghosts, Macar wields the title-law maul (War Hammer item), not the
 * Cleaver, and does not auto-wear the Light Crossbow.
 * Run: node src/ui/Ch1StartLoadout.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.join(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

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

assert(/function startChapter\(n\)\{/.test(html), 'startChapter is the authored New Game entry');
assert(/function startBackWallRubble\(/.test(html) && /k:'cavein'/.test(html),
  'Chapter I still stamps the west cave-in');
assert(/const CRUSH_SPOTS=\{/.test(html)
  && /pordoom:\{x:19\.15/.test(html)
  && /orbo:\{x:19\.35/.test(html)
  && /talpor:\{x:17\.65/.test(html),
  'all four named kin still spawn under the burial');
assert(/if\(e\.crushed && e\.col && e\.team==='party'\)\{\s*makeGhostAlly\(e\)/.test(html),
  'walking up still Rouses crushed party kin as ghosts');
assert(/Rouse ':'Loot /.test(html), 'prompt is still Rouse for crushed party kin');
assert(/function ensureMacarStartingGear\(/.test(html)
  && /function ensureMacarHammer\(/.test(html),
  'New Game seeds Macar\'s starting weapon');
assert(/G\.macarGearReady=0/.test(html), 'New Game clears the starting-gear flag');
assert(/if\(r\.key==='macar'\) ensureMacarStartingGear\(pk\)/.test(html),
  'ensurePacks wears the starting kit on Macar');
assert(/livingMacarIdleKey/.test(html) && /wieldsShadowCleaver/.test(html),
  'maul idle is the default; Cleaver is an equip swap');
assert(/ASSET_VER='101'/.test(html),
  'ASSET_VER is 101 — Nick ChatGPT Macar maul lock + title splash');
assert(/Interaction\.installChapterI/.test(html)
  && /if \(L\.n === 1 && i < 14\) return true/.test(fs.readFileSync(path.join(root,'src/systems/Interaction.js'),'utf8')),
  'later room interactions protect the west cave-in lip');

require('../packs/EquipmentSlots.js');
const Eq=globalThis.EquipmentSlots;
const start=Eq.startingItems();
const hammer=start.find(it=>it.id==='macar_hammer');
const xbow=start.find(it=>it.id==='macar_crossbow');
assert(!!hammer && hammer.slot==='primary', 'starting item list includes the maul/hammer as primary');
assert(!!xbow && xbow.slot==='secondary' && xbow.n==='Light Crossbow',
  'Light Crossbow still exists in the starting pack list');
assert(!start.some(it=>/cleaver/i.test(it.n||'')||it.id==='shadow_cleaver'),
  'starting kit does not include the Shadow Cleaver');
assert(Eq.START_WORN.indexOf('secondary')<0,
  'START_WORN does not auto-wear secondary (Light Crossbow stays packed)');
assert(Eq.START_WORN.indexOf('quiver')>=0,
  'START_WORN still auto-wears the quiver so bolt ammo UX is unchanged');
assert(Eq.START_WORN.indexOf('primary')>=0, 'START_WORN still auto-wears the maul');
let eq=Eq.emptyEquipped();
start.forEach(it=>{
  if(Eq.START_WORN.indexOf(it.slot)>=0) eq=Eq.equip(eq, it).equipped;
});
assert(eq.primary && eq.primary.id==='macar_hammer', 'fresh wear is the starting maul');
assert(eq.weapon===eq.primary, 'legacy weapon alias is the maul');
assert(!eq.secondary, 'fresh wear leaves secondary empty');
assert(eq.quiver && eq.quiver.id==='macar_quiver', 'fresh wear still dons the quiver');

const ICON_SPR={
  sword:'icon_sword', attack:'icon_attack', hammer:'icon_attack',
  crossbow:'icon_crossbow'
};
const SPR={
  macar:{width:8}, macar_axe:{width:8}, macar_xbow:{width:8},
  icon_attack:{id:'maul'}, icon_crossbow:{id:'xbow'}, icon_sword:{id:'sword'}
};
const ctx={
  SPR,
  ICON_SPR,
  ABIL:[
    {key:'swing', ico:'hammer', cd:6},
    {key:'bow', ico:'crossbow', cd:1.4}
  ],
  sprReady(k){ return !!(k && SPR[k] && SPR[k].width); },
  _axe:false,
  _xbow:false,
  _player:null,
  player(){ return ctx._player; },
  livingMacarIdleKey(){ return ctx._idleLive?ctx._idleLive():'macar'; },
  wieldsShadowCleaver(){ return !!ctx._axe; },
  wieldsCrossbow(){ return !!ctx._xbow; }
};
vm.createContext(ctx);
vm.runInContext(extractFn('livingMacarIdleKey')+'\n'+extractFn('attackHudIco')+'\n'+extractFn('slotAnimImg'), ctx);
ctx._idleLive=ctx.livingMacarIdleKey;
assert(ctx.livingMacarIdleKey()==='macar', 'New Game idle key is the title-law maul');
assert(ctx.attackHudIco()==='attack' && ctx.slotAnimImg({key:'attack', ico:'attack'}).id==='maul',
  'fresh New Game Attack HUD is the maul plate');
ctx._axe=true;
assert(ctx.livingMacarIdleKey()==='macar_axe', 'Cleaver swap only after it is wielded');
ctx._axe=false;
ctx._xbow=true;
assert(ctx.livingMacarIdleKey()==='macar_xbow', 'crossbow swap when the shooting loadout is on');
assert(ctx.attackHudIco()==='crossbow' && ctx.slotAnimImg({key:'attack', ico:'attack'}).id==='xbow',
  'equipping Light Crossbow from PACK switches Attack HUD to xbow');
ctx._xbow=false;
ctx._player={atkKind:'bow'};
assert(ctx.livingMacarIdleKey()==='macar_xbow', 'Shoot pose selects macar_xbow even without a worn bow helper');
ctx._player=null;

/* Live ensurePacks / ensureMacarStartingGear — the New Game path. */
{
  const live={
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
    ROSTER:[{key:'macar', name:'MACAR'}],
    EquipmentSlots:Eq,
    DwarfMouth:undefined,
    HERBS:[],
    SPR,
    ICON_SPR,
    ABIL:ctx.ABIL,
    says:[],
    lastSay:'',
    say(line){ live.lastSay=line; live.says.push(line); },
    isGhostPack(){ return false; },
    player(){ return live.G.ents[0]; },
    syncPackTotals(){
      if(typeof live.ensurePacks==='function') live.ensurePacks();
      live.G.inv=live.G.packs&&live.G.packs.macar;
    },
    partyAC(){ return 7; },
    wornAttackCd(e){ return e&&e.cd; },
    applyHoverFlags(){},
    kinName(){ return 'MACAR'; },
    sprReady(k){ return !!(k && SPR[k] && SPR[k].width); },
    applyEquipped(){
      if(typeof live.ensureEquippedShape==='function') live.ensureEquippedShape();
      const worn=live.G.equipped||{};
      worn.weapon=worn.primary||worn.weapon;
      worn.armor=worn.chest||worn.armor;
    },
    isHealPotion(){ return false; },
    isEquipWeapon(it){ return !!(it&&it.k==='weapon'); },
    isEquipArmor(it){ return !!(it&&it.k==='armor'); },
    isPackEquipable(){ return true; },
    isShadowCleaver(){ return false; },
    claimItemToMacar(){},
    knownShadowCleaver(){ return null; },
    ensureShadowCleaverPacked(){},
    ensureMacarHammer(pk){
      pk=pk||(live.G.packs&&live.G.packs.macar);
      return (pk.magic||[]).find(it=>it&&it.id==='macar_hammer')||null;
    }
  };
  vm.createContext(live);
  [
    'wieldsCrossbow','isCrossbowItem','packHasItem','stowPackItem','snapshotWornKit',
    'restowDisplacedKit','ensureWornKitPacked','packSelItem','confirmPackEquip',
    'ensureEquippedShape','mapPackItemToEquipment','wornSlotOf','equipPackItem',
    'unequipPackSlot','maybeAutoEquip','ensureMacarStartingGear','newPack',
    'ensurePacks','packOf','livingMacarIdleKey','attackHudIco','slotAnimImg'
  ].forEach(n=>vm.runInContext(extractFn(n), live));
  live.ensurePacks();
  const worn=live.G.equipped||{};
  const mag=(live.G.packs.macar&&live.G.packs.macar.magic)||[];
  assert(worn.primary && worn.primary.id==='macar_hammer',
    'live New Game wears the starting maul on primary');
  assert(!worn.secondary,
    'live New Game does not auto-wear Light Crossbow on secondary');
  assert(worn.quiver && worn.quiver.id==='macar_quiver',
    'live New Game still dons the quiver');
  assert(mag.some(it=>it&&it.id==='macar_crossbow'),
    'live New Game still packs Light Crossbow for later wield');
  assert(live.wieldsCrossbow()===false, 'live New Game wieldsCrossbow is false');
  assert(live.livingMacarIdleKey()==='macar', 'live New Game living idle is maul (macar)');
  assert(live.attackHudIco()==='attack', 'live New Game Attack HUD is the maul plate');
  const packedXbow=mag.find(it=>it&&it.id==='macar_crossbow');
  live.G.packSel=packedXbow;
  live.confirmPackEquip();
  assert(live.G.equipped.secondary && live.G.equipped.secondary.id==='macar_crossbow',
    'PACK Equip on Light Crossbow wears secondary');
  assert(live.wieldsCrossbow()===true, 'PACK Equip Light Crossbow sets wieldsCrossbow');
  assert(live.livingMacarIdleKey()==='macar_xbow',
    'PACK Equip Light Crossbow switches living blit to macar_xbow');
  assert(live.attackHudIco()==='crossbow',
    'PACK Equip Light Crossbow switches Attack HUD to xbow');
}

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nChapter I start loadout checks passed');

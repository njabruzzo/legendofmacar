'use strict';
/**
 * Attack HUD plate follows living carry (idle key / wieldsCrossbow).
 * Soft OK is not enough: blit macar_xbow + Attack still on icon_attack fails.
 * Run: node src/ui/AttackHudIcon.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
require('../packs/EquipmentSlots.js');
const Eq=globalThis.EquipmentSlots;

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

assert(/function attackHudIco\(/.test(html), 'attackHudIco helper exists');
assert(/attackHudIco\(\)/.test(extractFn('slotAnimImg')),
  'slotAnimImg asks attackHudIco for the Attack plate');
assert(/attackHudIco\(\)/.test(html.match(/function drawSlot\(g,b,s\)\{[\s\S]*?\nfunction /)[0]),
  'drawSlot asks attackHudIco for the Attack plate');
assert(/\{key:'attack', ico:'attack', label:'Attack'\}/.test(html),
  'HUDSKILLS Attack default remains the maul plate key');
assert(/\{key:'bow', ico:'crossbow', label:'Shoot'\}/.test(html),
  'Shoot chip stays crossbow + its own ammo count');
assert(/crossbow:'icon_crossbow'/.test(html) && /attack:'icon_attack'/.test(html)
  && /hammer:'icon_attack'/.test(html),
  'ICON_SPR still maps attack/hammer → icon_attack and crossbow → icon_crossbow');
assert(!/bowPoseUntil/.test(extractFn('attackHudIco')) && !/ghost/.test(extractFn('attackHudIco')),
  'attackHudIco does not touch bowPoseUntil or spectral ghosts');
assert(Eq.START_WORN.indexOf('secondary')<0,
  'START_WORN excludes secondary so fresh New Game Attack HUD is not xbow');
assert(Eq.START_WORN.indexOf('quiver')>=0,
  'START_WORN still includes quiver (ammo UX)');

const ICON_SPR={
  sword:'icon_sword', attack:'icon_attack', hammer:'icon_attack',
  crossbow:'icon_crossbow', flask:'icon_flask'
};
const SPR={
  icon_sword:{id:'sword'},
  icon_attack:{id:'maul'},
  icon_crossbow:{id:'xbow'},
  icon_flask:{id:'flask'}
};
const ctx={
  ICON_SPR,
  SPR,
  ABIL:[
    {key:'swing', ico:'hammer', cd:6},
    {key:'bow', ico:'crossbow', cd:1.4}
  ],
  _idle:'macar',
  _xbow:false,
  _axe:false,
  livingMacarIdleKey(){ return ctx._idle; },
  wieldsCrossbow(){ return !!ctx._xbow; },
  wieldsShadowCleaver(){ return !!ctx._axe; }
};
vm.createContext(ctx);
vm.runInContext(extractFn('attackHudIco')+'\n'+extractFn('slotAnimImg'), ctx);

function plate(btn){
  const img=ctx.slotAnimImg(btn);
  return img&&img.id;
}

assert(ctx.attackHudIco()==='attack' && plate({key:'attack', ico:'attack'})==='maul',
  'maul-only Attack HUD stays icon_attack (hammer)');
assert(plate({key:'bow', ico:'crossbow'})==='xbow',
  'Shoot chip is icon_crossbow while Attack is still the maul');

ctx._xbow=true;
ctx._idle='macar_xbow';
assert(ctx.attackHudIco()==='crossbow' && plate({key:'attack', ico:'attack'})==='xbow',
  'Light Crossbow on / idle macar_xbow → Attack HUD is icon_crossbow, not the frozen maul ico');
assert(plate({key:'bow', ico:'crossbow'})==='xbow',
  'Shoot chip stays icon_crossbow while the shooting loadout is on');

ctx._xbow=false;
ctx._idle='macar';
assert(ctx.attackHudIco()==='attack' && plate({key:'attack', ico:'attack'})==='maul',
  'stowing secondary returns Attack HUD to the maul');

ctx._xbow=true;
ctx._idle='macar';
assert(ctx.attackHudIco()==='crossbow' && plate({key:'attack', ico:'attack'})==='xbow',
  'wieldsCrossbow still swaps Attack even if the xbow idle sheet is not ready');

ctx._xbow=false;
ctx._idle='macar_xbow';
assert(ctx.attackHudIco()==='crossbow' && plate({key:'attack', ico:'attack'})==='xbow',
  'living idle macar_xbow (Shoot pose) swaps Attack without a worn-bow helper');

ctx._idle='macar_axe';
ctx._axe=true;
assert(ctx.attackHudIco()==='attack' && plate({key:'attack', ico:'attack'})==='maul',
  'Shadow Cleaver carry keeps the current weapon plate when no axe/cleaver HUD icon exists');

ctx.ICON_SPR.axe='icon_sword';
assert(ctx.attackHudIco()==='axe' && plate({key:'attack', ico:'attack'})==='sword',
  'Shadow Cleaver uses the axe HUD icon when ICON_SPR.axe is wired');
delete ctx.ICON_SPR.axe;
ctx.ICON_SPR.cleaver='icon_sword';
assert(ctx.attackHudIco()==='cleaver' && plate({key:'attack', ico:'attack'})==='sword',
  'Shadow Cleaver uses the cleaver HUD icon when ICON_SPR.cleaver is wired');
delete ctx.ICON_SPR.cleaver;

ctx._axe=true;
ctx._xbow=true;
ctx._idle='macar_axe';
assert(ctx.attackHudIco()==='attack',
  'cleaver blit wins the Attack plate over secondary bow (matches living idle)');
ctx._idle='macar_xbow';
assert(ctx.attackHudIco()==='crossbow',
  'xbow idle (bow pose) still shows the crossbow on Attack');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nAttack HUD carry-icon checks passed');

'use strict';
/**
 * Dead HUD art stays unwired; icon plates do not fetch phantom clones.
 * Run: node src/ui/HudIconWiring.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
require('../packs/EquipmentSlots.js');
const Eq=globalThis.EquipmentSlots;
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const uiDir=path.join(__dirname,'../../assets/ui');

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

const dead=['icon_doll','icon_dwarf','skill_icons'];
dead.forEach(k=>{
  assert(!new RegExp("\\b"+k+"\\b").test(html), k+' is absent from index.html');
});
assert(!/ui_skill_icons/.test(html), 'ui_skill_icons path is not registered');

const first=html.match(/const first=\[[\s\S]*?\];/);
assert(!!first, 'first-wave load list exists');
dead.forEach(k=>{
  assert(!new RegExp("'"+k+"'").test(first[0]), k+' is not in the first-wave list');
});
assert(/'icon_helm'/.test(first[0]) && /'icon_quiver'/.test(first[0]) && /'icon_save'/.test(first[0]),
  'living slot plates and icon_save still preload');

const start=html.indexOf('const SPRITE_FILES={');
const end=html.indexOf('const ICON_SPR={');
assert(start>=0 && end>start, 'sprite registry block is extractable');
const registry=new Function(html.slice(start, end)+'\nreturn SPRITE_FILES;')();

dead.forEach(k=>{
  assert(!registry[k] && !registry[k+'_w1'] && !registry[k+'_w2'] && !registry[k+'_atk'],
    k+' is not in the derived sprite registry');
});
['icon_sword','icon_pack','icon_helm','icon_quiver','icon_craft','icon_cross','icon_save',
 'icon_specialty_i','icon_specialty_iv'].forEach(k=>{
  assert(registry[k] && /assets\/ui\//.test(registry[k]), k+' base plate is still registered');
  assert(!registry[k+'_w1'] && !registry[k+'_w2'] && !registry[k+'_atk'],
    k+' has no derived _w1/_w2/_atk fetch');
});
assert(registry.macar_w1 && /dwarf_macar_w1/.test(registry.macar_w1), 'Macar walk derivation is intact');
assert(registry.rat_w1 && /mon_rat_w1/.test(registry.rat_w1), 'monster walk derivation is intact');
assert(registry.lantern_atk && /prop_lantern_atk/.test(registry.lantern_atk) && !registry.lantern_w1,
  'prop sprung-frame derivation is intact (no walk cycle)');
assert(registry.floor_mine_w1 && /tile_floor_mine_w1/.test(registry.floor_mine_w1),
  'tile walk derivation is intact');

const slotFn=extractFn('slotAnimImg');
assert(!/_w1/.test(slotFn) && !/_w2/.test(slotFn) && !/_atk/.test(slotFn),
  'HUD slot draw does not swap to _w1/_w2/_atk images');
assert(/return SPR\[k\]\|\|null/.test(slotFn), 'HUD slot draw uses the base icon plate');

const drawSlot=html.match(/function drawSlot\(g,b,s\)\{[\s\S]*?\nfunction /)[0];
assert(/if\(b\.hold\)/.test(drawSlot) && /globalAlpha=\(ready&&atForge\)\?1:0\.42/.test(drawSlot),
  'hold stroke and not-ready dimming stay in drawSlot');
assert(/Math\.ceil\(cds\[ab\.key\]\)/.test(drawSlot), 'cooldown overlay stays in drawSlot');

const slotCtx={
  ICON_SPR:{sword:'icon_sword', flask:'icon_flask'},
  ABIL:[{key:'attack', ico:'sword', cd:1}],
  SPR:{
    icon_sword:{id:'base'},
    icon_sword_w1:{id:'w1'},
    icon_sword_w2:{id:'w2'},
    icon_sword_atk:{id:'atk'}
  },
  QUALITY:true,
  G:{elapsed:1.4, searching:1, digging:1, scene:'craft'},
  cds:{attack:0.9},
  player(){ return {defending:1}; }
};
vm.createContext(slotCtx);
vm.runInContext(slotFn, slotCtx);
const held=slotCtx.slotAnimImg({key:'attack', hold:true, ico:'sword'});
const idle=slotCtx.slotAnimImg({key:'attack', ico:'sword'});
assert(held && held.id==='base' && idle && idle.id==='base',
  'slotAnimImg returns the base plate even on hold / QUALITY / cooldown');

const doll=html.match(/function drawEquipDoll\(g, x, y, w, h\)\{[\s\S]*?\nfunction drawPack/);
assert(!!doll && /blitLivingMacar\(SPR\[livingMacarIdleKey\(\)\]\|\|SPR\.macar\)/.test(doll[0]),
  'pack doll still blits the living Macar idle');
const slotSpr=extractFn('slotSprite');
assert(/slotIcon|SLOT_ICON/.test(slotSpr) && /SPR\.icon_pack/.test(slotSpr),
  'empty slot plates still resolve through SLOT_ICON');
assert(Eq.SLOT_ICON.helmet==='icon_helm' && Eq.SLOT_ICON.quiver==='icon_quiver'
  && Eq.slotIcon('chest')==='icon_chest' && Eq.slotIcon('boots')==='icon_boots',
  'EquipmentSlots SLOT_ICON still names the living plates');

['icon_doll.png','icon_dwarf.png','ui_skill_icons.png'].forEach(f=>{
  assert(!fs.existsSync(path.join(uiDir,f)), f+' was removed from the repo');
});
['icon_save.png','icon_specialty_i.png','icon_specialty_iv.png',
 'icon_helm.png','icon_quiver.png','icon_sword.png','icon_pack.png'].forEach(f=>{
  assert(fs.existsSync(path.join(uiDir,f)), f+' base plate stays on disk');
});

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nHUD icon wiring checks passed');

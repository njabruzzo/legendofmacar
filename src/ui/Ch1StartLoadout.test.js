'use strict';
/**
 * Fresh New Game → Chapter I: cave-in behind, kin buried/rouseable as
 * ghosts, Macar wields the title-law maul (War Hammer item), not the Cleaver.
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
  const re=new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}');
  const m=html.match(re);
  if(!m) throw new Error('missing '+name);
  return m[0];
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
assert(/ASSET_VER='98'/.test(html),
  'ASSET_VER is 98 — signed Macar crossbow bind');
assert(/Interaction\.installChapterI/.test(html)
  && /if \(L\.n === 1 && i < 14\) return true/.test(fs.readFileSync(path.join(root,'src/systems/Interaction.js'),'utf8')),
  'later room interactions protect the west cave-in lip');

require('../packs/EquipmentSlots.js');
const Eq=globalThis.EquipmentSlots;
const start=Eq.startingItems();
const hammer=start.find(it=>it.id==='macar_hammer');
assert(!!hammer && hammer.slot==='primary', 'starting item list includes the maul/hammer as primary');
assert(!start.some(it=>/cleaver/i.test(it.n||'')||it.id==='shadow_cleaver'),
  'starting kit does not include the Shadow Cleaver');
let eq=Eq.emptyEquipped();
start.forEach(it=>{
  if(Eq.START_WORN.indexOf(it.slot)>=0) eq=Eq.equip(eq, it).equipped;
});
assert(eq.primary && eq.primary.id==='macar_hammer', 'fresh wear is the starting maul');
assert(eq.weapon===eq.primary, 'legacy weapon alias is the maul');

const SPR={macar:{width:8}, macar_axe:{width:8}, macar_xbow:{width:8}};
const ctx={
  SPR,
  sprReady(k){ return !!(k && SPR[k] && SPR[k].width); },
  _axe:false,
  _xbow:false,
  _player:null,
  player(){ return ctx._player; },
  wieldsShadowCleaver(){ return !!ctx._axe; },
  wieldsCrossbow(){ return !!ctx._xbow; }
};
vm.createContext(ctx);
vm.runInContext(extractFn('livingMacarIdleKey'), ctx);
assert(ctx.livingMacarIdleKey()==='macar', 'New Game idle key is the title-law maul');
ctx._axe=true;
assert(ctx.livingMacarIdleKey()==='macar_axe', 'Cleaver swap only after it is wielded');
ctx._axe=false;
ctx._xbow=true;
assert(ctx.livingMacarIdleKey()==='macar_xbow', 'crossbow swap when the shooting loadout is on');
ctx._xbow=false;
ctx._player={atkKind:'bow'};
assert(ctx.livingMacarIdleKey()==='macar_xbow', 'Shoot pose selects macar_xbow even without a worn bow helper');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nChapter I start loadout checks passed');

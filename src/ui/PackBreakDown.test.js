'use strict';
/**
 * Pack Break down turns mundane kit into G.res. Magic stays locked.
 * Run: node src/ui/PackBreakDown.test.js
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

function extractFn(name){
  const re=new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}');
  const m=html.match(re);
  if(!m) throw new Error('missing '+name);
  return m[0];
}

assert(/function breakDownPackRow\(/.test(html), 'breakDownPackRow exists');
assert(/function packBreakPlan\(/.test(html) && /function packBreakLock\(/.test(html),
  'break plan and magic lock exist');
assert(/drawChip\(g,brkX,brkY,brkW,dropH,'Break'/.test(html),
  'each pack row has a Break chip next to Drop');
assert(/drawChip\(g,dropX,dropY,dropW,dropH,'Drop'/.test(html),
  'Drop stays on the row');
assert(/breakDownPackRow\(r\)/.test(html), 'Break calls breakDownPackRow');
assert(/That is magical\./.test(html), 'locked magic speaks the house line');
assert(/scavengeCraft\(/.test(html) && /function scavengeCraft\(/.test(html),
  'world dress scavengeCraft is unchanged');
assert(!/function scavengeCraft[\s\S]*breakDownPackRow/.test(html.match(/function scavengeCraft\(pr\)\{[\s\S]*?\n\}/)[0]),
  'scavengeCraft body was not rewritten');

const pack=html.match(/function drawPack\(g\)\{[\s\S]*?\nfunction wareCostGp/)[0];
assert(/brkW/.test(pack) && /dropW/.test(pack), 'Break and Drop share the action column');
assert(/Math\.min\(70\*s, w\*0\.16\)/.test(pack), 'action chips stay compact so titles do not overflow');
assert(/sel\?packBreakHint\(r\)/.test(pack), 'selected row spells what you get');
assert(/if\(!locked\) menuHits\.push\(\{x:brkX/.test(pack),
  'Break hit is omitted when the row is locked or worn');
assert(/Take it off first\./.test(html), 'worn kit is locked until unequipped');

assert(/isNamedMagicItem\(/.test(html) && /shadow\\s\*cleaver/.test(html),
  'Shadow Cleaver is named magic');
assert(/\(it\.plus\|\|0\)>0/.test(extractFn('isPackMagicItem')), '+1 and better are magical');
assert(/it\.cursed/.test(extractFn('isPackMagicItem')), 'cursed kit is magical');
assert(/isHealPotion/.test(extractFn('isPackMagicItem')), 'Cure-* draughts are magical');
assert(/r\.kind==='gem'/.test(extractFn('packBreakLock')), 'gems stay treasure');

const ctx={
  G:{packWho:'macar', packs:{macar:{ales:2,healPots:[],magic:[],gems:[],herbs:{}}}, equipped:{}, xp:{}, res:{}},
  RESMETA:{
    ironstone:{n:'Ironstone',c:'#c2ad91'},
    hide:{n:'Hide Scrap',c:'#a67a52'},
    powder:{n:'Blackpowder',c:'#9aa0b2'},
    barley:{n:'Cave Barley',c:'#d2bd63'},
    timber:{n:'Timber',c:'#b8895a'},
    silk:{n:'Spider Silk',c:'#e0d2ff'},
    bone:{n:'Bone Shard',c:'#e8dfc8'}
  },
  clamp:(v,a,b)=>v<a?a:v>b?b:v,
  Math,
  packOf(){ return ctx.G.packs.macar; },
  packRowItem(r){ return r?(r.it||r.p||r.gm||null):null; },
  isHealPotion(p){
    if(!p) return false;
    return /^(Cure |Heal )/.test(p.n||'') || p.k==='heal';
  },
  isShadowCleaver(it){ return !!(it&&(/shadow\s*cleaver/i.test(it.n||'')||it.id==='shadow_cleaver')); },
  isNamedMagicItem(it){
    if(!it) return false;
    if(ctx.isShadowCleaver(it)) return true;
    return /dwarfmouth|dwarven mouth-key|mouth-key/i.test(it.n||'');
  },
  isEquipWeapon(it){ return !!(it&&(it.k==='weapon'||it.cat==='Weapon'||it.cat==='Sword')); },
  isEquipArmor(it){ return !!(it&&(it.k==='armor'||it.cat==='Armor/Shield'||/armor|cloak|helm/i.test(it.n||''))); },
  wornSlotOf(it){ return it && it._worn ? it._worn : null; },
  skillLvl(){ return 1; }
};
vm.createContext(ctx);
vm.runInContext(
  extractFn('isPackMagicItem')+extractFn('packBreakLock')+extractFn('packBreakPlan'),
  ctx
);

function plan(r){ return ctx.packBreakPlan(r); }
const sword=plan({kind:'magic', it:{n:'Long Sword',k:'weapon',cat:'Weapon',plus:0}, t:'Long Sword'});
assert(sword.res==='ironstone' && sword.n>=1 && sword.n<=3 && !sword.lock,
  'mundane sword yields Ironstone');
const cloak=plan({kind:'magic', it:{n:'Hide Cloak',k:'armor',cat:'Armor/Shield',plus:0}, t:'Hide Cloak'});
assert(cloak.res==='hide' && cloak.n>=1 && !cloak.lock, 'hide cloak yields Hide Scrap');
const plus=plan({kind:'magic', it:{n:'Long Sword +1',k:'weapon',cat:'Sword',plus:1}, t:'Long Sword +1'});
assert(plus.lock==='That is magical.', '+1 sword is locked');
const cleaver=plan({kind:'magic', it:{id:'shadow_cleaver',n:'Shadow Cleaver',plus:2,k:'weapon'}, t:'Shadow Cleaver'});
assert(cleaver.lock==='That is magical.', 'Shadow Cleaver is locked');
const pot=plan({kind:'potion', p:{n:'Potion of Invisibility',k:'potion',cat:'Potion'}, t:'Potion of Invisibility'});
assert(pot.lock==='That is magical.', 'a potion is locked');
const cure=plan({kind:'ale', t:'Draughts'});
ctx.G.packs.macar.ales=0;
ctx.G.packs.macar.healPots=[{n:'Cure Light Wounds',k:'heal'}];
assert(plan({kind:'ale', t:'Draughts'}).lock==='That is magical.', 'Cure-* draught is locked');
ctx.G.packs.macar.ales=2;
ctx.G.packs.macar.healPots=[];
const beer=plan({kind:'ale', t:'Draughts of beer'});
assert(beer.res==='barley' && !beer.lock, 'mundane ale yields Cave Barley');
const gem=plan({kind:'gem', gm:{n:'Ruby'}, t:'Ruby'});
assert(gem.lock && /treasure/.test(gem.lock), 'gems stay treasure');
const bomb=plan({kind:'supply', field:'bombs', t:'Bombs'});
assert(bomb.res==='powder' && !bomb.lock, 'bombs yield Blackpowder');
assert(plan({kind:'magic', it:{n:'Bone Charm',plus:0}, t:'Bone Charm'}).res==='bone',
  'bone junk yields Bone Shard');
const wornHelm=plan({kind:'magic', it:{n:'Iron Helm',k:'armor',plus:0,_worn:'helmet'}, t:'Iron Helm'});
assert(wornHelm.lock==='Take it off first.', 'worn mundane helm cannot break');
const wornPlus=plan({kind:'magic', it:{n:'Iron Helm +1',k:'armor',plus:1,_worn:'helmet'}, t:'Iron Helm +1'});
assert(wornPlus.lock==='Take it off first.', 'worn magic is locked as worn, not scavenged');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\npack break-down checks passed');

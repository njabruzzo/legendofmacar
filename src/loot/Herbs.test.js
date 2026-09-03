'use strict';
/**
 * Forage / SEARCH / useHerb — plants are not potions; glowcap is gill-glow only.
 * Run: node src/loot/Herbs.test.js
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
function extractConst(name){
  const start=html.indexOf('const '+name+'=');
  if(start<0) throw new Error('missing '+name);
  const end=html.indexOf('\n];', start);
  return html.slice(start, end+3);
}

assert(/function forageHerbs\(/.test(html) && /function useHerb\(/.test(html),
  'forageHerbs and useHerb exist');
assert(/function forageChance\(\)\{ return 40\+\(skillLvl\('forage'\)-1\)\*8; \}/.test(html),
  'Herb Lore notice is 40% + 8%/level');
assert(/key==='search'/.test(html) && /forageHerbs\(patch\|\|p\)/.test(html),
  'SEARCH (F / plant icon) rolls forageHerbs');
assert(/G\.searching && \(p\.searchCd\|\|0\)<=0/.test(html) && /forageHerbs\(nearestShroom/.test(html),
  'held SEARCH keeps foraging on the cooldown');
assert(/interact\('Search for herbs'/.test(html), 'plant clusters offer Search for herbs');
assert(/placePlantClusters\(/.test(html) && /plant:1/.test(html),
  'chapters still plant forageable clusters');
assert(/isPlantKind\(k\)\{/.test(html) && /glowcap/.test(extractFn('isPlantKind')),
  'glowcap is a plant, not an herb species');

const herbsFn=html.match(/const HERBS=\[[\s\S]*?\n\];/)[0];
assert(!/Glowcap/.test(herbsFn), 'no invented Glowcap herb row');
assert(/n:'Bearded Fang'/.test(herbsFn) && /n:'Zur'/.test(herbsFn),
  'existing herb table ends stay');

const gather=html.match(/function gatherLights\(L\)\{[\s\S]*?\nfunction gatherLightsCapped/);
assert(gather && !/pr\.k==='glowcap'/.test(gather[0]),
  'glowcap is gill-glow only — not a floor globe');
assert(!/emit\(s\.x,s\.y-28\*z, \(k==='lichen'\?18:36\)\*z\*b/.test(html),
  'plant sprites do not emit floating spore orbs');

const herbKinds=['food','laugh','weary','regen','hide','light','orc','wood',
  'heal40','heal20','tickheal','healall','heal4','heal10','see','antidote','heal2','haste','sense'];
const useFn=extractFn('useHerb');
herbKinds.forEach(k=>{
  assert(new RegExp("k==='"+k+"'").test(useFn), 'useHerb handles k:'+k);
});
assert(/k==='tickheal'/.test(useFn) && /potionRegen=5/.test(useFn),
  'Luminous Vrak is 5 rounds of tick-heal, not a potion draught');
assert(!/drinkPotion/.test(useFn), 'herbs are not drunk as potions');

const ctx={
  G:{packs:{macar:{herbs:{}}}, ents:[], xp:{forage:0}},
  ADD_SCALE:4,
  lastSay:'',
  healed:0,
  healN:0,
  gained:'',
  rolls:[],
  say(line){ ctx.lastSay=line; },
  hint(){},
  ftext(){},
  burst(){},
  player(){ return ctx.who; },
  packOf(){ return ctx.G.packs.macar; },
  packOwner(){ return 'macar'; },
  ensurePacks(){},
  syncPackTotals(){},
  skillLvl(){ return 1; },
  learn(){},
  isPlantKind(k){ return k==='glowcap'||k==='shroom'||k==='lichen'; },
  d100(){ return ctx.rolls.shift()||1; },
  d30(){ return ctx.tbl||1; },
  applyHeal(e, n){
    ctx.healN+=(n||0);
    const amt=Math.round((n||0)*ctx.ADD_SCALE);
    ctx.healed+=amt;
    if(e) e.hp=Math.min(e.maxhp||999, (e.hp||0)+amt);
    return amt;
  },
  clearPoison(e){ if(e) e.poisonT=0; ctx.cleared=1; },
  gain(r){ ctx.gained=r; },
  HERBS:null
};
vm.createContext(ctx);
vm.runInContext(extractConst('HERBS')+'; this.HERBS=HERBS;', ctx);
vm.runInContext(extractFn('forageChance')+extractFn('forageHerbs')+extractFn('useHerb'), ctx);

assert(ctx.HERBS.length===30, 'herb table is 30 named plants');

ctx.who={name:'Macar', hero:1, hp:10, maxhp:80, x:2, y:2};
ctx.rolls=[10, 1];
ctx.tbl=1;
const patch={k:'glowcap', x:2, y:2, picked:0};
const found=ctx.forageHerbs(patch);
assert(found===true, 'SEARCH on a plant cluster can recover a listed herb');
assert(ctx.G.packs.macar.herbs['Bearded Fang']===1, 'recovered herb goes into the pack');
assert(patch.picked===1, 'the plant is marked picked');

ctx.rolls=[99];
ctx.G.packs.macar.herbs={};
assert(ctx.forageHerbs(patch)===false, 'failed notice finds nothing');

ctx.who.hp=10; ctx.healN=0; ctx.cleared=0;
ctx.G.packs.macar.herbs={'Gulperwash':1,'Shadowvine':1,'Zulsendra':1,'Luminous Vrak':1};
const gulper=ctx.HERBS.find(h=>h.n==='Gulperwash');
assert(gulper.k==='heal20', 'Gulperwash stays heal-20');
ctx.useHerb('Gulperwash', ctx.who);
assert(ctx.healN===20, 'Gulperwash heals 20');

ctx.useHerb('Shadowvine', ctx.who);
assert(ctx.cleared===1, 'Shadowvine is an antidote');

ctx.who.buff=0; ctx.who.cd=1; ctx.who.sp=3;
ctx.useHerb('Zulsendra', ctx.who);
assert(ctx.who.buff===3 && ctx.who.afterHaste===5, 'Zulsendra haste 3 then rest 5');

ctx.who.potionRegen=0;
ctx.useHerb('Luminous Vrak', ctx.who);
assert(ctx.who.potionRegen===5, 'Vrak ticks 5 rounds');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nherb checks passed');

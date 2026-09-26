'use strict';
/**
 * Each pickup path records the take, lists it in the pack, and saves it.
 * Run: node src/packs/PickupPaths.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const saveSrc=fs.readFileSync(path.join(__dirname,'../saves/GameSave.js'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}
function extractFn(name){
  const start=html.indexOf('function '+name+'(');
  if(start<0) throw new Error('missing '+name);
  let i=html.indexOf('{', start), depth=0;
  for(;i<html.length;i++){
    if(html[i]==='{') depth++;
    else if(html[i]==='}'){ depth--; if(depth===0) return html.slice(start, i+1); }
  }
  throw new Error('unclosed '+name);
}

assert(/gain\(r,n\)/.test(extractFn('oreDrop')), 'dig finds call gain');
assert(/convertHoard\(/.test(extractFn('takeLoot')), 'walk-over loot runs convertHoard');
assert(/giveMagic\(it,1\)/.test(extractFn('takeLoot')), 'walk-over items call giveMagic');
assert(/addToPack\('macar'/.test(extractFn('lootCorpse')) && /addCoin\('gp'/.test(extractFn('lootCorpse')),
  'corpse loot stows kit and coins');
assert(/pk\.herbs\[herb\.n\]/.test(extractFn('forageHerbs')), 'herb search writes the pack');
assert(/stowPackItem\(it\)/.test(extractFn('pryGrondTooth')), 'the electrum tooth is stowed');
assert(/stowPackItem\(it\)/.test(extractFn('takeBoneCrown')), 'the bone crown is stowed');
assert(/c\.ep=ep/.test(extractFn('convertCoinsToElectrum')), 'electrum conversion rewrites the purse');
assert(/kind:'res'/.test(extractFn('collectPackRows')), 'dig stock is a pack row');

const ctx={
  G:{
    packs:null, coin:{cp:0,sp:0,ep:0,gp:0,pp:0}, res:{}, equipped:{},
    props:[], ents:[], loot:[], lvl:{n:1, flags:{}}, packWho:'macar', dungeonTurns:1.5
  },
  lines:[],
  rolls:[10, 1],
  RES:['ironstone','deepsilver','starmetal','powder','bone','timber','resin','barley','silk'],
  RESMETA:{
    ironstone:{n:'Ironstone',c:'#888'}, deepsilver:{n:'Deepsilver',c:'#ccc'},
    starmetal:{n:'Starmetal',c:'#fff'}, powder:{n:'Powder',c:'#aaa'},
    bone:{n:'Bone',c:'#ddd'}, timber:{n:'Timber',c:'#863'},
    resin:{n:'Resin',c:'#a84'}, barley:{n:'Barley',c:'#da4'}, silk:{n:'Silk',c:'#eee'}
  },
  HERBS:[{n:'Bearded Fang', diff:100, k:'food', d:'A test herb.'}],
  ROSTER:[{key:'macar', name:'MACAR'}],
  TAU:Math.PI*2,
  ENCOUNTER_RULES:{searchTurns:1},
  say(t){ ctx.lines.push(t); },
  hint(){}, ftext(){}, burst(){}, shake(){}, learn(){},
  skillLvl(){ return 1; },
  d100(){ return ctx.rolls.shift()||1; },
  d30(){ return 1; },
  ri(){ return 0; },
  player(){ return ctx.G.ents[0]||{x:1,y:1,hero:1}; },
  isPlantKind(k){ return k==='glowcap'; },
  isLootableBody(){ return true; },
  isHealPotion(){ return false; },
  isShadowCleaver(){ return false; },
  isGhostPack(){ return false; },
  maybeAutoEquip(){ return null; },
  rememberShadowCleaver(it){ return it; },
  mapPackItemToEquipment(it){ return it; },
  wornSlotOf(){ return null; },
  isPackEquipable(){ return false; },
  kinName(k){ return k||'MACAR'; },
  awardPartyXp(){},
  treasureGp(){ return 0; },
  extraMagicForKind(){ return []; },
  ensureWornKitPacked(){},
  ensureShadowCleaverPacked(){},
  markChapterGhosts(){},
  riseTeethHorde(){},
  equipPackItem(it){ ctx.G.equipped.helmet=it; return 'helmet'; },
  advanceDungeonTurns(){ return []; },
  dist(a,b){ return Math.hypot((a.x||0)-(b.x||0),(a.y||0)-(b.y||0)); }
};
vm.createContext(ctx);
const saveCtx={globalThis:{}};
saveCtx.globalThis=saveCtx;
vm.createContext(saveCtx);
vm.runInContext(saveSrc, saveCtx);
ctx.GameSave=saveCtx.GameSave;

vm.runInContext([
  'function ensurePacks(){ if(!G.packs) G.packs={}; if(!G.packs.macar) G.packs.macar={potions:[],healPots:[],herbs:{},magic:[],gems:[],notes:[],bombs:0,ales:0,rations:0,torches:0,ammo:0,bombKit:0,burps:0}; }',
  'function packOf(){ ensurePacks(); return G.packs.macar; }',
  'function syncPackTotals(){ if(typeof convertCoinsToElectrum==="function") convertCoinsToElectrum(); }',
  extractFn('gain'),
  extractFn('addToPack'),
  extractFn('addCoin'),
  extractFn('hasElectrumToothInPack'),
  extractFn('convertCoinsToElectrum'),
  extractFn('giveGem'),
  extractFn('givePotion'),
  extractFn('giveMagic'),
  extractFn('giveClue'),
  extractFn('stowPackItem'),
  extractFn('packHasItem'),
  extractFn('makeBoneCrownItem'),
  extractFn('makeGrondTooth'),
  extractFn('packGainNote'),
  extractFn('convertHoard'),
  extractFn('takeLoot'),
  extractFn('lootCorpse'),
  extractFn('oreDrop'),
  extractFn('forageChance'),
  extractFn('forageHerbs'),
  extractFn('pryGrondTooth'),
  extractFn('takeBoneCrown'),
  extractFn('collectPackRows'),
  'this.takeLoot=takeLoot; this.lootCorpse=lootCorpse; this.oreDrop=oreDrop;',
  'this.forageHerbs=forageHerbs; this.pryGrondTooth=pryGrondTooth; this.takeBoneCrown=takeBoneCrown;',
  'this.collectPackRows=collectPackRows; this.addCoin=addCoin; this.convertCoinsToElectrum=convertCoinsToElectrum;',
  'this.packOf=packOf;'
].join('\n'), ctx);

function names(){
  return ctx.collectPackRows(ctx.packOf(), 'macar').map(r=>r.t);
}
function shown(needle){
  return names().some(t=>String(t).indexOf(needle)>=0);
}

ctx.takeLoot({gone:0, coins:{gp:12}, gems:0, items:[], potions:[], x:1, y:1});
assert(ctx.G.coin.gp===12, 'walk-over coins land in the purse');

ctx.takeLoot({gone:0, coins:{}, gems:0, potions:[], items:[{k:'gem', n:'Ruby', gp:40}], x:2, y:1});
assert(ctx.packOf().gems.some(g=>g.n==='Ruby'), 'walk-over gems land in the pack');
assert(shown('Ruby'), 'the gem is on the inventory list');

ctx.takeLoot({gone:0, coins:{}, gems:0, potions:[], items:[{n:'Ring of Warmth', k:'ring', noAuto:1, d:'Warm.'}], x:3, y:1});
assert(ctx.packOf().magic.some(it=>it.n==='Ring of Warmth'), 'DMG magic is packed');
assert(shown('Ring of Warmth'), 'the magic item is on the inventory list');

const corpse={id:9, name:'Goblin', x:4, y:1, looted:0, kit:{gp:5, rations:2},
  drop:{coins:{sp:3}, gems:0, items:[{n:'Old Key', k:'misc', noAuto:1, d:'A key.'}], potions:[]}};
ctx.G.ents=[corpse];
ctx.lootCorpse(corpse);
assert(corpse.looted===1 && ctx.G.coin.gp===17 && ctx.G.coin.sp===3, 'corpse coins join the purse');
assert(ctx.packOf().rations===2, 'corpse rations join the pack');
assert(ctx.packOf().magic.some(it=>it.n==='Old Key'), 'corpse gear joins the pack');
assert(shown('Old Key'), 'corpse gear is on the inventory list');

ctx.oreDrop(8, 8, false);
assert((ctx.G.res.ironstone||0)>=1, 'dig ore is recorded');
assert(shown('Ironstone'), 'dig ore shows in the inventory');

const herb=ctx.forageHerbs({k:'glowcap', x:5, y:5, picked:0});
assert(herb===true && ctx.packOf().herbs['Bearded Fang']===1, 'search stores the herb');
assert(shown('Bearded Fang'), 'the herb shows in the inventory');

const face={x:6, y:2, k:'demonface', toothKind:'electrum', emptySocket:0, gone:0};
ctx.G.props.push(face);
ctx.G.ents[0]={x:6, y:3, hero:1};
assert(ctx.pryGrondTooth(face, 'electrum').ok===1, 'the electrum tooth can be taken');
assert(ctx.packOf().magic.some(it=>it.id==='grond_tooth_electrum'), 'the tooth is in the pack');
assert(shown('Electrum Tooth'), 'the tooth shows in the inventory');

ctx.G.coin={cp:50, sp:0, ep:0, gp:1, pp:0};
ctx.convertCoinsToElectrum();
assert(ctx.G.coin.ep===3 && ctx.G.coin.gp===0 && ctx.G.coin.cp===0,
  'carried coins convert to electrum and stay in the purse');

const crown={x:10, y:10, k:'bonecrown', gone:0, taken:0};
assert(ctx.takeBoneCrown(crown).ok===1, 'the crown can be taken');
assert(ctx.packOf().magic.some(it=>it.id==='bone_crown') && ctx.G.equipped.helmet && ctx.G.equipped.helmet.boneCrown,
  'the crown is packed and worn');
assert(shown('Bone Crown'), 'the crown shows in the inventory');

const snap=ctx.GameSave.snapshot(ctx.G, {scene:'play'});
assert(snap.packs.macar.magic.some(it=>it.id==='grond_tooth_electrum'), 'save keeps the tooth');
assert(snap.packs.macar.magic.some(it=>it.id==='bone_crown'), 'save keeps the crown');
assert(snap.packs.macar.herbs['Bearded Fang']===1, 'save keeps the herb');
assert(snap.packs.macar.gems.some(g=>g.n==='Ruby'), 'save keeps the gem');
assert(snap.coin.ep===3 && snap.res.ironstone>=1, 'save keeps electrum and dig stock');
assert(snap.dungeonTurns===1.5, 'save keeps the wandering-turn bank');
const restored={};
ctx.GameSave.applyCampaign(restored, snap);
assert(restored.coin.ep===3 && restored.res.ironstone>=1
  && restored.packs.macar.herbs['Bearded Fang']===1
  && restored.dungeonTurns===1.5,
  'a loaded save restores the takes and the turn bank');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\npickup paths passed');

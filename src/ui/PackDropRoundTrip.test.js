'use strict';
/**
 * Every pack row Macar can Drop comes back as the same item when he picks
 * it up: no duplicate gem, no treasure XP twice, no lost herb, no second
 * hammer. A fresh drop is not snatched back by walk-over autoloot.
 * Runs the real index.html functions in a sandbox.
 * Run: node src/ui/PackDropRoundTrip.test.js
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
  const re=new RegExp('\\nfunction '+name+'\\([\\s\\S]*?\\n\\}');
  const m=html.match(re);
  if(!m) throw new Error('missing '+name+' in index.html');
  return m[0];
}

const logs=[];
const calls={convertHoard:0, awardPartyXp:0, giveMagic:0, givePotion:0, giveGem:0};
const G={};
const ctx={
  G, logs, calls, console, JSON, Math, Object,
  EID:100,
  RESMETA:{ironstone:{n:'Ironstone'}, silk:{n:'Spider silk'}},
  say:(t)=>logs.push(t),
  burst:()=>{},
  dist:(a,b)=>Math.hypot(a.x-b.x, a.y-b.y),
  player:()=>G._p,
  packOf:(k)=>G.packs[k],
  ensurePacks:()=>{},
  syncPackTotals:()=>{},
  isGhostPack:()=>false,
  wearingBoneCrown:()=>false,
  dropBoneCrown:()=>{},
  askDropElectrum:()=>{},
  mapPackItemToEquipment:()=>{},
  rememberShadowCleaver:()=>{},
  applyEquipped:()=>{},
  EquipmentSlots:{clearItem:(eq,it)=>{ Object.keys(eq).forEach(k=>{ if(eq[k]===it) eq[k]=null; }); }},
  ensureMacarHammer:(pk)=>{
    let ham=pk.magic.find(it=>it&&it.id==='macar_hammer');
    if(!ham){ ham={id:'macar_hammer', n:"Macar's War Hammer", k:'weapon', plus:0, dice:'1d8'}; pk.magic.unshift(ham); }
    if(!G.equipped.primary){ G.equipped.primary=ham; G.equipped.weapon=ham; }
    return ham;
  },
  convertHoard:()=>{ calls.convertHoard++; },
  awardPartyXp:()=>{ calls.awardPartyXp++; },
  givePotion:()=>{ calls.givePotion++; return 'p'; },
  giveGem:()=>{ calls.giveGem++; },
  giveMagic:()=>{ calls.giveMagic++; return 'm'; },
  giveClue:()=>'c',
  addToPack:()=>{},
  gain:()=>{},
  packGainNote:()=>{}
};
vm.createContext(ctx);
const holdDecl=html.match(/const PACK_DROP_HOLD_R=[\d.]+;/);
assert(!!holdDecl, 'drop hold radius is a named constant');
vm.runInContext(holdDecl?holdDecl[0]:'const PACK_DROP_HOLD_R=1.6;', ctx);
vm.runInContext('var PACK_DROP_HOLD_R_OUT=PACK_DROP_HOLD_R;', ctx);
['floorItemSpot','ensureLoot','lootLabel','spawnLoot','nearestLoot','takeLoot','packRowToPile','dropPackRow','removePackRow',
 'packDropClone','packDropTitle','packDropRecord','packDropName','restorePackDrop','nearestHeldDrop','dropElectrum']
  .forEach(n=>vm.runInContext(extractFn(n), ctx));

function reset(){
  G._p={x:10, y:10};
  G.loot=[];
  G.res={ironstone:3};
  G.coin={cp:0,sp:0,ep:25,gp:0,pp:0};
  G.equipped={primary:null, weapon:null};
  G.packWho='macar';
  const ham={id:'macar_hammer', n:"Macar's War Hammer", k:'weapon', plus:1, dice:'1d8', improved:1};
  G.equipped.primary=ham; G.equipped.weapon=ham;
  G.packs={macar:{
    magic:[ham, {n:'Ring of Warmth', k:'ring', cat:'Ring', gp:1000, xp:1000}],
    potions:[{n:'Potion of Heroism', k:'hero', gp:500, extra:'keep-me'}],
    gems:[{n:'Guardian Ruby', gp:500, k:'gem', guardian:true, src:'door'}],
    notes:[{n:'Scrap of vellum', d:'A map.', k:'clue', clueKey:'map1'}],
    herbs:{Blackroot:2},
    ales:2, healPots:[], bombs:1, burps:1, ammo:10, rations:3, torches:2, bombKit:1
  }};
  logs.length=0;
  Object.keys(calls).forEach(k=>calls[k]=0);
}
const bag=()=>G.packs.macar;
function dropAndTake(row){
  ctx.dropPackRow(row);
  const pile=G.loot[G.loot.length-1];
  if(!pile) return null;
  ctx.takeLoot(pile, true);
  return pile;
}

/* Walk-over hold */
reset();
ctx.dropPackRow({kind:'supply', field:'rations', tag:'Food', t:'Rations  \u00d73'});
let pile=G.loot[0];
assert(pile.label==='Rations' && logs.includes('MACAR drops Rations.'), 'the pile and log name the item, not its category tag');
assert(!!pile && pile.dropHold===1 && !!pile.packDrop, 'a drop is a held floor pile that remembers what it was');
assert(ctx.dist(G._p, pile)<1.12, 'the pile lands inside the old stand-still autoloot reach');
assert(ctx.nearestLoot(G._p, 1.12)===null, 'stand-still autoloot does not take the fresh drop back');
assert(ctx.nearestLoot(G._p, 0.7)===null, 'walk-over autoloot does not take the fresh drop back');
assert(ctx.nearestHeldDrop(G._p, 1.3)===pile, 'the held drop offers a Pick up prompt');
G._p={x:13, y:10};
ctx.nearestLoot(G._p, 1.12);
assert(pile.dropHold===0, 'stepping away releases the hold');
G._p={x:10.5, y:10.3};
assert(ctx.nearestLoot(G._p, 1.12)===pile, 'walking back over the pile picks it up');
ctx.takeLoot(pile, true);
assert(bag().rations===3, 'rations come back');

/* Each row kind round-trips */
reset();
dropAndTake({kind:'supply', field:'bombs', tag:'Bomb'});
dropAndTake({kind:'burp', tag:'Bomb'});
dropAndTake({kind:'supply', field:'ammo', tag:'Ammo'});
dropAndTake({kind:'supply', field:'torches', tag:'Light'});
dropAndTake({kind:'kit', t:'Bomb-making kit'});
dropAndTake({kind:'ale', t:'Draughts of beer'});
assert(bag().bombs===1 && bag().burps===1 && bag().ammo===10 && bag().torches===2 && bag().bombKit===1,
  'bombs, burps, bolts, torches and the bomb kit round-trip');
assert(bag().ales===2 && bag().potions.length===1, 'a beer draught returns to the flask, not as a stray potion');

reset();
const potion=bag().potions[0];
dropAndTake({kind:'potion', p:potion, i:0, t:potion.n});
assert(bag().potions.length===1 && bag().potions[0].n==='Potion of Heroism' && bag().potions[0].extra==='keep-me',
  'a potion comes back with all its fields');

reset();
const gem=bag().gems[0];
dropAndTake({kind:'gem', gm:gem, i:0, t:gem.n});
assert(bag().gems.length===1, 'a dropped gem comes back once — no extra rolled Gemstone');
assert(bag().gems[0].guardian===true && bag().gems[0].src==='door', 'the guardian ruby keeps its identity');
assert(calls.convertHoard===0 && calls.awardPartyXp===0 && calls.giveGem===0,
  'pickup of a drop skips hoard conversion and treasure XP');

reset();
const ring=bag().magic[1];
dropAndTake({kind:'magic', it:ring, i:1, t:ring.n});
assert(bag().magic.length===2 && bag().magic.some(it=>it.n==='Ring of Warmth'), 'a magic item round-trips');
assert(calls.awardPartyXp===0, 'picking a ring back up does not pay its XP again');

reset();
const ham=bag().magic[0];
ctx.dropPackRow({kind:'magic', it:ham, i:0, t:ham.n});
assert(bag().magic.filter(it=>it.id==='macar_hammer').length===1, 'dropping the hammer leaves the stand-in hammer');
ctx.takeLoot(G.loot[0], true);
const hams=bag().magic.filter(it=>it.id==='macar_hammer');
assert(hams.length===1, 'picking the hammer back up does not make two hammers');
assert(hams[0].improved===1 && hams[0].plus===1, 'the original (improved) hammer is the one kept');
assert(G.equipped.primary===hams[0], 'the kept hammer is the one in hand');

reset();
dropAndTake({kind:'herb', n:'Blackroot', t:'Blackroot x2'});
assert(bag().herbs.Blackroot===2, 'a dropped herb is not lost on pickup');

reset();
const note=bag().notes[0];
ctx.dropPackRow({kind:'note', nt:note, i:0, t:note.n});
assert(bag().notes.length===0 && G.loot.length===1, 'a note can be dropped');
ctx.takeLoot(G.loot[0], true);
assert(bag().notes.length===1 && bag().notes[0].clueKey==='map1', 'a note comes back with its clue key');

reset();
ctx.dropPackRow({kind:'res', field:'ironstone', t:'Ironstone x3'});
assert(G.res.ironstone===2 && G.loot.length===1, 'dig stock can be dropped one at a time');
ctx.takeLoot(G.loot[0], true);
assert(G.res.ironstone===3, 'dig stock comes back');

reset();
ctx.dropElectrum(10);
assert(G.coin.ep===15 && G.loot[0].dropHold===1, 'dropped electrum is a held pile');
ctx.takeLoot(G.loot[0], true);
assert(G.coin.ep===25 && calls.convertHoard===0 && calls.awardPartyXp===0,
  'electrum comes back as the same coin, with no deepsilver or XP');

reset();
dropAndTake({kind:'supply', field:'rations', tag:'Food'});
assert(logs.some(l=>/MACAR drops/.test(l)) && logs.some(l=>/MACAR picks up/.test(l)), 'drop and pickup both speak a log line');

/* Save file carries the drop record */
const save=fs.readFileSync(path.join(root,'src/saves/GameSave.js'),'utf8');
assert((save.match(/packDrop:/g)||[]).length>=3, 'GameSave captures and restores packDrop');
assert((save.match(/dropHold:/g)||[]).length>=3, 'GameSave captures and restores dropHold');
assert(/packDrop:z\.packDrop\|\|null/.test(html), 'the world-stripped load path passes packDrop through spawnLoot');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\npack drop round-trip checks passed');

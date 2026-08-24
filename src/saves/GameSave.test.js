'use strict';
/**
 * Campaign save snapshot, localStorage slot, and UI hooks.
 * Run: node src/saves/GameSave.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const src=fs.readFileSync(path.join(__dirname,'GameSave.js'),'utf8');
const ctx={ globalThis:{} };
ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext(src, ctx);
const GS=ctx.GameSave;

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

const G={
  scene:'play', ch:2, unlocked:3, cleared:{1:1},
  coin:{cp:10,sp:0,ep:0,gp:40,pp:0},
  res:{ironstone:2}, packs:{macar:{ammo:8,ales:1,herbs:{}}},
  equipped:{primary:{n:'War Hammer'}}, charXp:{macar:4001},
  abil:{macar:{str:18,con:18}}, ghostAllies:{pordoom:1},
  borrowed:[], taught:{}, day:4, dayClock:12, pordoomGiftDay:1,
  macarGearReady:1, gnomeGift:true, bombs:2, ales:1,
  xp:{mine:3}, skillSnap:{mine:1}, gear:{macar:{wt:1}}
};
const snap=GS.snapshot(G, {scene:'play', play:{x:40.2,y:32.1,flags:{placed:1}}});
assert(snap.v===1 && snap.ch===2 && snap.unlocked===3, 'snapshot keeps chapter progress');
assert(snap.packs.macar.ammo===8 && snap.coin.gp===40, 'snapshot keeps pack and coin');
assert(snap.ghostAllies.pordoom===1 && snap.play.x===40.2, 'snapshot keeps ghosts and play extras');
assert(snap.packs.macar!==G.packs.macar, 'snapshot clones nested objects');

const store={};
store.setItem=function(k,v){ this[k]=v; };
store.getItem=function(k){ return this[k]||null; };
store.removeItem=function(k){ delete this[k]; };
assert(GS.write(store, snap)===true, 'write stores JSON');
const got=GS.read(store);
assert(got && got.ch===2 && got.play.y===32.1, 'read returns the same slot');
assert(GS.has(store)===true, 'has is true after write');
assert(/First Floor/.test(GS.label(got)), 'label names the chapter');

const G2={};
GS.applyCampaign(G2, got);
assert(G2.unlocked===3 && G2.coin.gp===40 && G2.ghostAllies.pordoom===1, 'applyCampaign restores campaign fields');
assert(G2.day===4 && G2.macarGearReady===1, 'applyCampaign restores day and kit flags');

GS.clear(store);
assert(GS.has(store)===false && GS.read(store)===null, 'clear empties the slot');
assert(GS.label(null)==='No save', 'empty label');

assert(/src\/saves\/GameSave\.js/.test(html), 'index.html loads GameSave');
assert(/Save game/.test(html) && /function writeGameSave\(/.test(html), 'pause can write a save');
assert(/Continue/.test(html) && /function loadSavedGame\(/.test(html), 'title can continue a save');
assert(/G\._keepProgress/.test(html) && /G\._forceSeeds/.test(html), 'load keeps campaign and dungeon seeds');
assert(/icon_save/.test(html) && /ruin_house/.test(html) && /secret_door/.test(html), 'save and ruin art are registered');
assert(/SPR\.icon_save/.test(html), 'save book is drawn on Save and Continue');
assert(fs.existsSync(path.join(__dirname,'../../assets/ui/icon_save.png')), 'save icon on disk');
assert(fs.existsSync(path.join(__dirname,'../../assets/props/prop_ruin_house.png')), 'ruin house on disk');
assert(fs.existsSync(path.join(__dirname,'../../assets/props/prop_secret_door.png')), 'secret door on disk');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nGameSave checks passed');

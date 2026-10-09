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
assert(snap.v===2 && snap.schemaVersion===2 && snap.ch===2 && snap.unlocked===3, 'snapshot keeps chapter progress');
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

const crown={id:'bone_crown', n:'Bone Crown', boneCrown:1, slot:'helmet'};
const leather={id:'macar_leather', n:'Leather Armor', slot:'chest', cat:'Armor/Shield'};
const sharedSnap=GS.snapshot({
  scene:'play', ch:1, macarGearReady:1,
  packs:{macar:{magic:[crown, leather]}},
  equipped:{helmet:crown, chest:leather, armor:leather}
});
const G3={};
GS.applyCampaign(G3, sharedSnap);
assert(G3.equipped.helmet===G3.packs.macar.magic[0],
  'reload relinks worn crown to the pack row instead of making a second object');
assert(G3.equipped.chest===G3.packs.macar.magic[1] && G3.equipped.armor===G3.equipped.chest,
  'reload relinks worn armor and its legacy alias to one pack object');

GS.clear(store);
assert(GS.has(store)===false && GS.read(store)===null, 'clear empties the slot');
assert(GS.label(null)==='No save', 'empty label');

assert(/src\/saves\/GameSave\.js/.test(html), 'index.html loads GameSave');
assert(/Save game/.test(html) && /function writeGameSave\(/.test(html), 'pause can write a save');
{
  const write=(html.match(/function writeGameSave\([\s\S]*?\nfunction applyPlaySave/)||[])[0]||'';
  assert(/if\(G\.lvl\) extra\.play=capturePlaySave/.test(write), 'camp save snapshots play when a level is in memory');
  assert(!/G\.scene==='play'\|\|G\.scene==='intro'\|\|G\.paused/.test(write), 'camp is not excluded from the play snapshot');
  assert(/The book is marked/.test(write) && /Saved\. /.test(write), 'manual save keeps the old confirmation');
  assert(/campSaveFlash/.test(write), 'manual save lights the camp Save plate');
  assert(/GameSave\.write\(localStorage/.test(write), 'camp Save writes the Continue localStorage slot');
  assert(/ok=!!GameSave\.write/.test(write) || /GameSave\.write\(localStorage/.test(write), 'write result is checked before confirming');
}
assert(/GameSave\.captureWorld/.test(html) && /GameSave\.applyWorld/.test(html), 'play save uses the versioned world schema');
assert(/remakeSavedEnt/.test(html) && /restoreSavedEid/.test(html), 'load remakes ents and restores numeric EIDs');
assert(!/ASSET_VER='100'/.test(html) && !/ASSET_VER='101'/.test(html) && !/ASSET_VER='102'/.test(html) && /ASSET_VER='131'/.test(html), 'ASSET_VER is 117');
assert(/G\.scene==='camp'/.test(html) && /drawHint\(g,UIS\)/.test(html), 'camp draws the Saved toast');
assert(/Continue/.test(html) && /function loadSavedGame\(/.test(html), 'title can continue a save');
assert(/G\._keepProgress/.test(html) && /G\._forceSeeds/.test(html), 'load keeps campaign and dungeon seeds');
assert(/icon_save/.test(html) && /ruin_house/.test(html) && /secret_door/.test(html), 'save and ruin art are registered');
assert(/SPR\.icon_save/.test(html), 'save book is drawn on Save and Continue');
{
  const camp=(html.match(/function campRest\([\s\S]*?\n\}/)||[])[0]||'';
  assert(/writeGameSave\(true\)/.test(camp), 'camp rest writes a quiet save');
}
assert(/G\.wipeAsk/.test(html) && /Burn it/.test(html) && /Keep the mark/.test(html), 'New descent confirms before burning the book');
assert(/function beginFreshDescent\(/.test(html) && !/GameSave\.clear\(localStorage\)/.test(html), 'Burn it writes the new run instead of erasing the slot');
assert(/function drawDead\(/.test(html) && /The book still holds your last mark/.test(html), 'death offers Continue when a mark exists');
assert(fs.existsSync(path.join(__dirname,'../../assets/ui/icon_save.png')), 'save icon on disk');
assert(fs.existsSync(path.join(__dirname,'../../assets/props/prop_ruin_house.png')), 'ruin house on disk');
assert(fs.existsSync(path.join(__dirname,'../../assets/props/prop_secret_door.png')), 'secret door on disk');

assert(GS.snapshot({}).bombs===0 && GS.snapshot({}).ales===0, 'a missing bomb count still snapshots as 0');

function deepEqual(a, b){
  if(a===b) return true;
  if(a==null || b==null || typeof a!=='object' || typeof b!=='object') return false;
  if(Array.isArray(a)!==Array.isArray(b)) return false;
  const ak=Object.keys(a), bk=Object.keys(b);
  if(ak.length!==bk.length) return false;
  for(const k of ak){
    if(!Object.prototype.hasOwnProperty.call(b, k) || !deepEqual(a[k], b[k])) return false;
  }
  return true;
}
const playMark={x:20.5, y:22, hp:48, maxhp:48, flags:{}};
const dirty={
  scene:'play', ch:4, unlocked:4, cleared:{1:1,2:1,3:1},
  floorWorlds:{4:{x:9}},
  coin:{cp:1,sp:2,ep:3,gp:18,pp:4},
  res:{ironstone:9},
  packs:{macar:{gems:[{n:'Ruby'}], magic:[{n:'Bone Crown', boneCrown:1}], bombs:3}},
  equipped:{helmet:{n:'Bone Crown', boneCrown:1, slot:'helmet'}},
  charXp:{macar:400}, abil:{macar:{str:18}},
  ghostAllies:{pordoom:1}, borrowed:[{n:'hammer'}], taught:{swing:1},
  day:9, dayClock:40, dungeonTurns:12, noisyTurns:3, restTurns:2, pordoomGiftDay:4,
  macarGearReady:1, gnomeGift:true, xp:{mine:8}, skillSnap:{mine:2}, gear:{macar:{wt:3}},
  bombs:3, ales:5, curseStrain:2, animateDeadSpent:1, thrallId:28,
  curseGrowT:7, curseDecayT:4, hourglassT:10
};
const clean={
  scene:'title', ch:0, unlocked:1, cleared:{},
  coin:{cp:0,sp:0,ep:0,gp:0,pp:0},
  res:{}, xp:{}, skillSnap:{}, gear:{}, bombs:2, ales:2, taught:{},
  equipped:null, macarGearReady:0, abil:null, packs:null, charXp:null,
  day:1, ghostAllies:{}, borrowed:[], pordoomGiftDay:0, animateDeadSpent:0
};
GS.applyBlankCampaign(dirty);
const burned=GS.snapshot(dirty, {scene:'play', play:playMark});
const fresh=GS.snapshot(clean, {scene:'play', play:playMark});
delete burned.at; delete fresh.at;
assert(deepEqual(burned, fresh), 'Burn after Continue snapshots the same book as a clean new game, apart from the timestamp');
assert(burned.unlocked===1 && !burned.cleared[1] && burned.coin.gp===0, 'the blank book is chapter I with an empty purse');
assert(burned.bombs===2 && burned.ales===2 && burned.hourglassT===0, 'bombs, ales, and the hourglass return to a new game');
assert(burned.thrallId==null && burned.animateDeadSpent===0 && burned.gnomeGift===false, 'the crown thrall and the gnome gift do not carry over');
assert(!burned.equipped.helmet && !burned.charXp.macar && !Object.keys(burned.floorWorlds).length, 'worn crown, char xp, and floor worlds are gone');
{
  const blankAt=(html.match(/function beginFreshDescent\(\)\{[\s\S]*?\n\}/)||[])[0]||'';
  const blank=blankAt.indexOf('applyBlankCampaign');
  const start=blankAt.indexOf('startChapter(1)');
  assert(blank>=0 && start>blank, 'beginFreshDescent blanks the campaign before Chapter I');
  assert(/G\.kills=0/.test(blankAt), 'Burn after Continue clears the in-memory kill counter');
}

const vault={
  v:2, ch:2, unlocked:2, scene:'play',
  play:{
    hp:0, maxhp:40,
    party:[
      {key:'macar', hp:0, dead:1, crushed:0},
      {key:'pordoom', hp:0, dead:1, crushed:1},
      {key:'fendur', hp:0, dead:1, crushed:0},
      {key:'orbo', hp:0, dead:0, crushed:0}
    ],
    ents:[{hp:0, dead:1, kind:'foe'}]
  }
};
const vaultStore={};
vaultStore.setItem=function(k,v){ this[k]=v; };
vaultStore.getItem=function(k){ return this[k]||null; };
vaultStore.removeItem=function(k){ delete this[k]; };
vaultStore.setItem(GS.KEY, JSON.stringify(vault));
const raised=GS.read(vaultStore);
assert(raised && raised.play.hp===1, 'a 0 HP hero mark loads with at least 1 HP');
assert(raised.play.party[0].hp===1 && raised.play.party[0].dead===false, 'Macar at 0 HP loads alive');
assert(raised.play.party[1].hp===0 && raised.play.party[1].crushed, 'a crushed companion stays down');
assert(raised.play.party[2].hp===0 && !!raised.play.party[2].dead, 'a fallen companion is not raised');
assert(raised.play.party[3].hp===1, 'a living companion at 0 HP is clamped to 1');
assert(raised.play.ents[0].hp===0, 'a fallen foe is not raised');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nGameSave checks passed');

'use strict';
/**
 * Later-slice stubs: wind-up toy, goblin mercy, web-skeleton rock.
 * Talk keys are wired; Quill prose is filled in a follow-up.
 * Run: node src/ui/NpcThreeBeats.test.js
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

assert(/const CH_INTRO=\{/.test(html), 'CH_INTRO plates stay');
assert(/function blitLivingMacar\(img\)\{/.test(html), 'blitLivingMacar stays');
assert(/function startTalk\(key\)\{/.test(html) && /function pickTalk\(i\)\{/.test(html),
  'talk engine is not rewritten');

const talk=html.match(/const NPC_TALK=\{[\s\S]*?\n\};/)[0];
['toy_find','toy_wind','goblin_mercy','web_skeleton','web_skeleton_more'].forEach(k=>{
  assert(new RegExp(k+':\\{').test(talk), k+' is in NPC_TALK');
});
assert(/who:'A TOY'/.test(talk) && /t:'Wind it\.'/.test(talk), 'toy_find Wind choice');
assert(/then:\(\)=>\{ if\(G\.lvl\) G\.lvl\.flags\.toyWound=1; startTalk\('toy_wind'\)/.test(talk),
  'Wind it opens toy_wind and marks wound');
assert(/who:'GOBLIN'/.test(talk) && /goblinBetrayalSwing\(\)/.test(talk),
  'mercy choice then() is a surprise swing');
assert(/t:'No\.'/.test(talk) && /endGoblinMercy\(false\)/.test(talk),
  'No. stays in a normal fight');
assert(/who:'THE BONES'/.test(talk) && /startTalk\('web_skeleton_more'\)/.test(talk),
  'Go on continues to web_skeleton_more');
assert(/revealWebSkeletonRock\(\)/.test(talk), 'finish choices reveal the corner rock');

assert(/const WINDUP_TOY=\{x:28\.85,y:26\.55\}/.test(html), 'toy sits in the start hall');
assert(/k:'winduptoy'/.test(html), 'tiny brass walker prop is spawned');
assert(/interact\(L\.flags\.toyWound\?'Talk to the brass walker':'Wind the brass walker'/.test(html),
  'Ch I interact is Wind / Talk');
assert(!/giveMagic\(/.test(html.match(/toy_find:\{[\s\S]*?toy_wind:\{[\s\S]*?\n  \},/)[0]),
  'toy talk does not giveMagic');
assert(/startCaveInBlocks/.test(html) && /x<15\.12/.test(html), 'cave-in lip is still x<15.12');

const toyX=28.85, toyY=26.55;
assert(toyX>15.12 && toyY>=16 && toyY<=30, 'toy is not in the cave-in block');
assert(Math.hypot(toyX-20.5, toyY-22.0)>2.4, 'toy is not on spawn');
[[19.15,20.35],[17.55,21.20],[19.35,23.45],[17.65,23.90]].forEach(([x,y])=>{
  assert(Math.hypot(toyX-x, toyY-y)>1.25, 'toy is not on crush '+x+','+y);
});
assert(!(toyX===20.5 && toyY===22.0), 'toy is not the spawn tile');

assert(/function maybeGoblinMercy\(/.test(html), 'morale hook exists');
assert(/pack\.length!==1/.test(html) && /g\.hp>\(g\.maxhp\|\|1\)\*0\.5/.test(html),
  'begs when last standing and at most half hp');
assert(/e\.name!=='Goblin'/.test(html) && /e\.boss/.test(html),
  'boss / named leaders are not pack beggars');
assert(/function goblinBetrayalSwing\(/.test(html) && /isRearAttack|mac\.fdx=dx\/m/.test(html),
  'betrayal faces Macar away for a rear swing');
assert(/dexAttackAdj\(effectiveDex\(mac\)\)/.test(html),
  'betrayal stun uses beginFight DEX trim');
assert(/meleeSwing\(g,/.test(html) && !/thief/.test(extractFn('goblinBetrayalSwing')),
  'betrayal is a melee swing, not thief ×');
assert(/tryStrikeMercyGoblin/.test(html) && /G\.mercyTalk && \(key==='attack'/.test(html),
  'killing mid-beg is allowed');
assert(/talkWalkOffKey/.test(html) && /dismissTalkWalkOff/.test(html),
  'walk-off / Escape while begging still betrays');

assert(/function markWebTalkSkeleton\(/.test(html) && /markWebTalkSkeleton\(\)/.test(html),
  'one web corpse is marked talkable');
assert(/lootBlocked/.test(html) && /if\(o\.lootBlocked\) return false/.test(html),
  'talk skeleton is not lootable until the story finishes');
assert(/k:'boulder'[\s\S]*webRock:1/.test(html) && /WEB_CORNER_ROCK/.test(html),
  'finish reveals a corner rock');
assert(/function takeWebSkeletonRing\(/.test(html) && /makeDexRing\(\)/.test(html),
  'moving the rock grants the dex ring');
assert(/if\(key==='web_skeleton_more'\) revealWebSkeletonRock\(\)/.test(html),
  'any close on web_skeleton_more finishes');
assert(!/revealWebSkeletonRock\(\)/.test(talk.match(/web_skeleton:\{[\s\S]*?\n  \},/)[0]),
  'cut-off on web_skeleton does not reveal the rock');

assert(/function wornDexPlus\(/.test(html) && /function effectiveDex\(/.test(html),
  'worn dex helper exists');
assert(/dexDefAdj\(effectiveDex\(e\)\)/.test(html), 'partyAC uses worn dex');
assert(/dexMissile\(effectiveDex\(e\)\)/.test(html), 'missile to-hit uses worn dex');
assert(/dexAttackAdj\(effectiveDex\(e\)\)/.test(html), 'surprise trim uses worn dex');
assert(!/effectiveDex/.test(extractFn('specialtyHitBonus')),
  'Specialty tot does not read the dex ring');
assert(/k:'dex', dexPlus:1/.test(html) && /n:'Ring of Dexterity \+1'/.test(html),
  'ring shape is dex / dexPlus, named Ring of Dexterity +1');
assert(/if\(o\.dexPlus\) raw\.dexPlus=o\.dexPlus/.test(html),
  'magItem keeps dexPlus and skips plus on that path');

const slots=fs.readFileSync(path.join(__dirname,'../../src/packs/EquipmentSlots.js'),'utf8');
assert(/it\.k === 'dex'/.test(slots), 'EquipmentSlots slots a dex ring as necklace');

const ctx={
  G:{equipped:{necklace:{k:'dex', dexPlus:1, n:'Ring of Dexterity +1'}}, ents:[], talk:null, fightOn:1, fightMercy:0, mercyTalk:0, mercyGoblinId:null, lvl:{n:2, flags:{}}, props:[], loot:[]},
  entityAbil:(e)=>e&&e.abil||{dex:11,str:18,exc:76},
  player:()=>({x:10,y:10,hero:1,abil:{dex:11}, range:1.4, dead:0}),
  dist:(a,b)=>Math.hypot((a.x||0)-(b.x||0),(a.y||0)-(b.y||0)),
  ri:(a)=>a,
  say:()=>{},
  hint:()=>{},
  giveMagic:()=>{},
  magItem:(o)=>o,
  mapPackItemToEquipment:(it)=>it,
  meleeSwing:()=>{},
  faceToward:()=>{},
  startTalk:()=>{},
  closeTalk:()=>{},
  ent:(o)=>Object.assign({id:1},o),
  WEB_TALK_SPOT:{x:11.5,y:29.7},
  WEB_CORNER_ROCK:{x:8.15,y:28.55},
  dexAttackAdj:(d)=>d>=16?1:0
};
vm.createContext(ctx);
vm.runInContext(extractFn('wornDexPlus')+extractFn('effectiveDex'), ctx);
assert(ctx.effectiveDex({hero:1,abil:{dex:11}})==12, 'worn dexPlus adds +1 to sheet DEX');
assert(ctx.effectiveDex({hero:0,col:{key:'orbo'},abil:{dex:14}})==14, 'companions do not wear Macar\'s ring');

ctx.G.equipped={necklace:{k:'ring', plus:1, n:'Ring of Protection +1'}};
assert(ctx.wornDexPlus({hero:1})===0, 'protection plus is not dexPlus');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nNPC three-beats checks passed');

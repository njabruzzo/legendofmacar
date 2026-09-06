'use strict';
/**
 * MAC-05/06 tap consume-once: UI overlays do not fall through to dest.
 * Run: node src/ui/TapGate.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.join(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

require('../systems/SystemsReady.js');
require('./TapGate.js');
const TG=globalThis.TapGate;
const SR=globalThis.SystemsReady;

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

assert(!!TG && typeof TG.resolvePlayTap==='function', 'TapGate exports resolvePlayTap');
assert(TG.FLAG===true, 'FLAG default is ON (rollback: FLAG=false or ?tapGate=0)');
assert(TG.use()===true, 'use() is true when FLAG is on');
assert(SR.has('TapGate') && SR.get('TapGate')===TG, 'TapGate declares on SystemsReady');

/* ---- consume once: overlay wins, no world dest ---- */
{
  let fired=0;
  const hits=[{x:10,y:20,w:80,h:40,fn(){ fired++; }}];
  const tap={x:40, y:30, pointerType:'touch'};
  const r=TG.resolvePlayTap(hits, tap);
  assert(r.consumed===true && r.world===false, 'overlay hit is consumed, not world');
  assert(fired===1 && tap.dispatches===1, 'overlay handler runs once');
  assert(tap.consumed===true && tap.world===false, 'tap record marks consumed / not world');
}

{
  let fired=0;
  const hits=[{x:10,y:20,w:80,h:40,fn(){ fired++; }}];
  const tap={x:400, y:300, pointerType:'mouse'};
  const r=TG.resolvePlayTap(hits, tap);
  assert(r.consumed===false && r.world===true, 'overlay miss may dispatch world');
  assert(fired===0, 'miss does not fire the overlay');
  assert(tap.world===true && tap.consumed===false, 'miss tap is marked world');
}

{
  let a=0, b=0;
  const hits=[
    {x:0,y:0,w:50,h:50,fn(){ a++; }},
    {x:0,y:0,w:50,h:50,fn(){ b++; }}
  ];
  TG.resolvePlayTap(hits, {x:10,y:10});
  assert(a===1 && b===0, 'first overlapping overlay wins; second does not fire');
}

{
  const hits=[{x:0,y:0,w:20,h:20,fn(){}}];
  const tap={x:5,y:5};
  const r1=TG.resolvePlayTap(hits, tap);
  const r2=TG.resolvePlayTap([], tap);
  assert(r1.consumed===true && r2.world===true,
    'a later empty-hit resolve is a new call; callers must drop a consumed tap');
  assert(tap.dispatches===2, 'each resolvePlayTap is one dispatch (host shifts IN.taps once)');
}

/* mouse and touch share the same consume path */
['touch','mouse'].forEach(kind=>{
  let fired=0, dest=null;
  const hits=[{x:100,y:100,w:40,h:40,fn(){ fired++; }}];
  const tap={x:110,y:110, pointerType:kind};
  const r=TG.resolvePlayTap(hits, tap);
  if(r.world) dest={x:tap.x,y:tap.y};
  assert(fired===1 && dest===null, kind+' overlay tap does not set dest');
});

/* flag off refuses consume (legacy fall-through) */
TG.FLAG=false;
assert(TG.use()===false, 'FLAG=false disables the gate');
TG.FLAG=true;

/* ---- host wiring: resolveTaps consults the gate before dest ---- */
const taps=extractFn('resolveTaps');
assert(/consumePlayUiTap/.test(taps), 'resolveTaps calls consumePlayUiTap');
assert(taps.indexOf('consumePlayUiTap') < taps.indexOf('nearestWalk'),
  'UI consume runs before nearestWalk dest');
assert(taps.indexOf('consumePlayUiTap') < taps.indexOf("p.dest={x:dst.x,y:dst.y}"),
  'UI consume runs before walk dest assignment');
assert(taps.indexOf('consumePlayUiTap') < taps.indexOf('p.dest={x:foe.x'),
  'UI consume runs before foe dest assignment');

const consume=extractFn('consumePlayUiTap');
assert(/TapGate\.use\(\)/.test(consume), 'host consume respects the flag');
assert(/UI\.overlayHits/.test(consume) && /UI\.portraitHits/.test(consume),
  'play overlays include portraitHits and overlayHits');
assert(/G\.talk/.test(consume) && /pickTalk/.test(consume),
  'talk overlay swallows the tap (no walk-through)');
assert(/promptBtn/.test(consume), 'prompt plate still consumes before dest');

const onDown=html.match(/function onDown\([\s\S]*?\nfunction onMove/)[0];
assert(/TapGate/.test(onDown) && /overlayHits/.test(onDown),
  'onDown checks overlayHits before stick / IN.taps');
assert(onDown.indexOf('overlayHits') < onDown.lastIndexOf('IN.taps.push'),
  'pointerdown overlay consume happens before the play-mode tap is queued for movement');
assert(/pointerdown/.test(html) && /pointerup/.test(html) && /e\.pointerType/.test(html),
  'touch and mouse still share the pointer listeners');

/* simulate resolveTaps play branch: overlay vs dest */
{
  const ctx={
    G:{scene:'play', paused:false, sleepShow:null, talk:null, aim:null, ents:[], loot:[]},
    IN:{taps:[]},
    UI:{overlayHits:[], portraitHits:[], talkHits:[]},
    promptBtn:null, throwBtn:null,
    TapGate:TG,
    dest:null,
    fired:0,
    p:{x:8,y:8, dest:null, stuck:0},
    player(){ return ctx.p; },
    s2w(x,y){ return {x:x/10, y:y/10}; },
    dist(a,b){ const dx=a.x-b.x, dy=a.y-b.y; return Math.sqrt(dx*dx+dy*dy); },
    fire(){},
    refuseAttack(){ return false; },
    throwBomb(){},
    takeLoot(){},
    lootNearbyCorpses(){},
    isLootableBody(){ return false; },
    nearestWalk(x,y){ return {x:x,y:y}; },
    ZOOM:1,
    consumePlayUiTap:null
  };
  vm.createContext(ctx);
  vm.runInContext(extractFn('consumePlayUiTap')+extractFn('resolveTaps'), ctx);

  const p=ctx.player();
  ctx.UI.overlayHits=[{x:10,y:10,w:40,h:40,fn(){ ctx.fired++; }}];
  ctx.IN.taps.push({x:20,y:20, pointerType:'touch'});
  ctx.resolveTaps();
  assert(ctx.fired===1 && !p.dest, 'resolveTaps overlay tap does not set dest');
  assert(ctx.IN.taps.length===0, 'consumed overlay tap is shifted once');

  ctx.fired=0;
  ctx.UI.overlayHits=[{x:10,y:10,w:40,h:40,fn(){ ctx.fired++; }}];
  ctx.IN.taps.push({x:200,y:200, pointerType:'mouse'});
  ctx.resolveTaps();
  assert(ctx.fired===0 && p.dest && p.dest.x!=null && p.dest.y!=null,
    'resolveTaps miss still walks (mouse)');
}

/* portrait-style harness: inspect key consumes, no dest */
{
  const ctx={
    G:{scene:'play', paused:false, sleepShow:null, talk:null, aim:null, ents:[], loot:[], inspect:null},
    IN:{taps:[]},
    UI:{
      overlayHits:[],
      portraitHits:[{x:8,y:8,w:80,h:36,key:'orbo'}],
      talkHits:[]
    },
    promptBtn:null, throwBtn:null,
    TapGate:TG,
    player(){ return ctx.p; },
    p:{x:4,y:4, dest:null, stuck:0},
    s2w(x,y){ return {x,y}; },
    dist(){ return 99; },
    fire(){},
    refuseAttack(){ return false; },
    throwBomb(){},
    takeLoot(){},
    lootNearbyCorpses(){},
    isLootableBody(){ return false; },
    nearestWalk(x,y){ return {x,y}; },
    ZOOM:1
  };
  vm.createContext(ctx);
  vm.runInContext(extractFn('applyPortraitTap')+extractFn('consumePlayUiTap')+extractFn('resolveTaps'), ctx);
  ctx.IN.taps.push({x:20,y:20});
  ctx.resolveTaps();
  assert(ctx.G.inspect==='orbo' && !ctx.p.dest,
    'portrait hit inspects kin and does not walk');
}

/* talk overlay swallows a miss (no dest) */
{
  const ctx={
    G:{scene:'play', paused:false, sleepShow:null, talk:{key:'noz'}, aim:null, ents:[], loot:[]},
    IN:{taps:[]},
    UI:{overlayHits:[], portraitHits:[], talkHits:[]},
    promptBtn:null, throwBtn:null,
    TapGate:TG,
    picked:null,
    player(){ return ctx.p; },
    p:{x:4,y:4, dest:null},
    s2w(x,y){ return {x,y}; },
    dist(){ return 99; },
    fire(){},
    refuseAttack(){ return false; },
    throwBomb(){},
    takeLoot(){},
    lootNearbyCorpses(){},
    isLootableBody(){ return false; },
    nearestWalk(x,y){ return {x,y}; },
    pickTalk(i){ ctx.picked=i; },
    ZOOM:1
  };
  vm.createContext(ctx);
  vm.runInContext(extractFn('consumePlayUiTap')+extractFn('resolveTaps'), ctx);
  ctx.IN.taps.push({x:300,y:300});
  ctx.resolveTaps();
  assert(ctx.picked==null && !ctx.p.dest, 'talk miss is swallowed; no world dest');
}

/* flag-off host leaves dest to the legacy play branch */
{
  TG.FLAG=false;
  const ctx={
    G:{scene:'play', paused:false, sleepShow:null, talk:null, aim:null, ents:[], loot:[]},
    IN:{taps:[]},
    UI:{overlayHits:[{x:0,y:0,w:400,h:400,fn(){ ctx.fired++; }}], portraitHits:[], talkHits:[]},
    promptBtn:null, throwBtn:null,
    TapGate:TG,
    fired:0,
    player(){ return ctx.p; },
    p:{x:4,y:4, dest:null, stuck:0},
    s2w(x,y){ return {x,y}; },
    dist(){ return 99; },
    fire(){},
    refuseAttack(){ return false; },
    throwBomb(){},
    takeLoot(){},
    lootNearbyCorpses(){},
    isLootableBody(){ return false; },
    nearestWalk(x,y){ return {x,y}; },
    ZOOM:1
  };
  vm.createContext(ctx);
  vm.runInContext(extractFn('consumePlayUiTap')+extractFn('resolveTaps'), ctx);
  ctx.IN.taps.push({x:10,y:10});
  ctx.resolveTaps();
  assert(ctx.fired===0 && ctx.p.dest, 'flag-off falls through to movement (rollback)');
  TG.FLAG=true;
}

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\ntap-gate checks passed');

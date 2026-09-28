'use strict';
/**
 * After Macar stops, all four ghosts reach idle and stop advancing
 * walk frames. The wide column push must not keep them walking.
 * Run: node src/combat/GhostSettleIdle.test.js
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
  const start=html.indexOf('function '+name+'(');
  if(start<0) throw new Error('missing '+name);
  const brace=html.indexOf('{', start);
  let depth=0;
  for(let i=brace;i<html.length;i++){
    const c=html[i];
    if(c==='{') depth++;
    else if(c==='}'){
      depth--;
      if(depth===0) return html.slice(start, i+1);
    }
  }
  throw new Error('unclosed '+name);
}

const stepSrc=extractFn('stepPartyFollower');
assert(/if\(p && !p\.moving\)/.test(stepSrc) && /e\.moving=0/.test(stepSrc),
  'a stopped leader holds followers idle before any steer');
assert(/partyFollowSeparate\(1, !!\(p&&p\.moving\)\)/.test(stepSrc),
  'column push is on only while the leader is walking');
assert(/p\.moving && typeof Navigation/.test(html),
  'the pilot does not path once Macar has stopped');
assert(/if\(e\.moving && !e\.defending\)/.test(extractFn('ghostAnimKey')),
  'walk sheets still require the moving flag');
assert(/ASSET_VER='126'/.test(html), 'ASSET_VER stays 126');

const ctx={
  G:{trail:[], ents:[]},
  TAU:Math.PI*2,
  canBe(){ return true; },
  walk(){ return true; },
  dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); },
  move(e,dx,dy,dt){ e.x+=dx*dt; e.y+=dy*dt; return 1; },
  sprReady(){ return true; }
};
vm.createContext(ctx);
vm.runInContext(
  'const PARTY_SEP_LEAD=2.15, PARTY_SEP_KIN=2.05;'
  +extractFn('gaitAdvance')
  +extractFn('turnToward')
  +extractFn('bestSlide')
  +extractFn('steerWalk')
  +extractFn('partyForm')
  +extractFn('partyFollowSeparate')
  +extractFn('stepPartyFollower')
  +extractFn('nudgeParty')
  +extractFn('separateParty')
  +extractFn('walkCycleKey'),
  ctx
);

assert(ctx.partyFollowSeparate(1, true)===true, 'a walking leader still keeps the column apart');
assert(ctx.partyFollowSeparate(1, false)===false, 'a stopped leader drops the wide push');

const DT=1/60;
const N=45;
const mac={
  hero:1, team:'party', dead:0, x:20, y:20, fdx:1, fdy:0,
  r:0.36, moving:0, sp:4.3, gait:0, aim:null, atk:0
};
const names=['pordoom','fendur','orbo','talpor'];
function ghostAt(name, i){
  const slot=ctx.partyForm(i+1, mac);
  const dx=slot.x-mac.x, dy=slot.y-mac.y;
  const m=Math.hypot(dx,dy)||1;
  return {
    team:'party', hero:0, dead:0, ghost:1, name, r:0.36, sp:4,
    gait:0.2+i*0.15, moving:1, ix:1, iy:0.2, fdx:0.2, fdy:0.9,
    slowT:0, webbed:0, defending:0, atk:0, aim:null,
    x:slot.x+(dx/m)*1.12, y:slot.y+(dy/m)*1.12
  };
}
const ghosts=names.map((name,i)=>ghostAt(name, i));
ctx.G.ents=[mac].concat(ghosts);
const gaitAtStop=ghosts.map(e=>e.gait);
const frameAtStop=ghosts.map(e=>ctx.walkCycleKey(e, e.name+'_ghost'));

function tick(){
  for(let i=0;i<ghosts.length;i++){
    const tgt=ctx.partyForm(i+1, mac);
    ctx.stepPartyFollower(ghosts[i], tgt, 0.38, mac, DT);
  }
  ctx.separateParty(mac);
}

let settledAt=-1;
for(let t=1;t<=N;t++){
  tick();
  if(ghosts.every(e=>e.moving===0)){ settledAt=t; break; }
}
assert(settledAt>0 && settledAt<=N,
  'all 4 ghosts idle within '+N+' ticks (settled at '+settledAt+')');
ghosts.forEach((e,i)=>{
  assert(e.moving===0, e.name+' moving is idle');
  assert(e.gait===gaitAtStop[i], e.name+' did not advance gait after the stop');
  assert(ctx.walkCycleKey(e, e.name+'_ghost')===frameAtStop[i], e.name+' walk frame held');
  assert(e.fdx===mac.fdx && e.fdy===mac.fdy, e.name+' faces with Macar');
});

const pos=ghosts.map(e=>({x:e.x,y:e.y}));
for(let t=0;t<60;t++) tick();
ghosts.forEach((e,i)=>{
  assert(e.moving===0, e.name+' stays idle');
  assert(e.gait===gaitAtStop[i], e.name+' gait stays frozen');
  assert(ctx.walkCycleKey(e, e.name+'_ghost')===frameAtStop[i], e.name+' walk frame stays held');
  const drift=Math.hypot(e.x-pos[i].x, e.y-pos[i].y);
  assert(drift<0.01, e.name+' does not orbit (drift '+drift.toFixed(4)+')');
});

/* Follow still walks while Macar is moving. */
mac.moving=1;
const walker=ghostAt('pordoom', 0);
const gait0=walker.gait;
ctx.G.ents=[mac, walker];
ctx.stepPartyFollower(walker, ctx.partyForm(1, mac), 0.38, mac, DT);
assert(walker.moving===1 && walker.gait>gait0, 'a walking leader still advances the follow gait');

if(failed){ console.error(failed+' failed'); process.exit(1); }
console.log('ghost settle idle ok');

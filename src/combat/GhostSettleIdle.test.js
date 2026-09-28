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
function check(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
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

/* Resume must not let separateParty launch a follower faster than Macar. */
function unit(dx, dy){
  const m=Math.hypot(dx, dy)||1;
  return {x:dx/m, y:dy/m};
}
function makeGhost(name, x, y, face){
  return {
    team:'party', hero:0, dead:0, ghost:1, name, r:0.36, sp:4,
    gait:0.3, moving:0, ix:0, iy:0, fdx:face.x, fdy:face.y,
    slowT:0, webbed:0, defending:0, atk:0, aim:null, x, y, _steerStep:0
  };
}
function resumeCase(label, parkFace, frames){
  const origin={x:30, y:18};
  mac.x=origin.x; mac.y=origin.y; mac.moving=0; mac.fdx=parkFace.x; mac.fdy=parkFace.y;
  mac._frameStep=0; mac.sp=4.3; mac.r=0.36; mac.name='MACAR';
  const side={x:-parkFace.y, y:parkFace.x};
  const crew=[
    makeGhost('pordoom', origin.x+parkFace.x*2.15, origin.y+parkFace.y*2.15, parkFace),
    makeGhost('fendur', origin.x+side.x*2.4, origin.y+side.y*2.4, parkFace),
    makeGhost('orbo', origin.x-parkFace.x*2.6+side.x*1.2, origin.y-parkFace.y*2.6+side.y*1.2, parkFace),
    makeGhost('talpor', origin.x-side.x*2.4, origin.y-side.y*2.4, parkFace)
  ];
  ctx.G.ents=[mac].concat(crew);
  for(let t=0;t<8;t++){
    crew.forEach((e,i)=>{
      e._steerStep=0;
      ctx.stepPartyFollower(e, ctx.partyForm(i+1, mac), 0.38, mac, DT);
    });
    ctx.separateParty(mac, DT);
  }
  crew.forEach(e=>{
    check(e.moving===0, label+' '+e.name+' settled before resume');
  });
  let minGap=99, worst=0, worstName='';
  for(let f=0; f<frames.length; f++){
    const h=frames[f];
    const mx=mac.x, my=mac.y;
    mac.moving=1; mac.fdx=h.x; mac.fdy=h.y;
    mac.x+=h.x*mac.sp*DT; mac.y+=h.y*mac.sp*DT;
    mac._frameStep=Math.hypot(mac.x-mx, mac.y-my);
    const before=crew.map(e=>({x:e.x, y:e.y}));
    crew.forEach((e,i)=>{
      e._ox=e.x; e._oy=e.y;
      const tgt=ctx.partyForm(i+1, mac);
      ctx.stepPartyFollower(e, tgt, 0.38, mac, DT);
      e._steerStep=Math.hypot(e.x-e._ox, e.y-e._oy);
    });
    ctx.separateParty(mac, DT);
    crew.forEach((e,i)=>{
      const step=Math.hypot(e.x-before[i].x, e.y-before[i].y);
      const cap=Math.max(mac._frameStep*1.05, e.sp*DT);
      if(step>worst){ worst=step; worstName=e.name; }
      check(step<=cap+1e-4, label+' f'+(f+1)+' '+e.name+' step '+step.toFixed(4)+' cap '+cap.toFixed(4));
    });
    const bodies=[mac].concat(crew);
    for(let a=0;a<bodies.length;a++) for(let b=a+1;b<bodies.length;b++){
      const gap=Math.hypot(bodies[a].x-bodies[b].x, bodies[a].y-bodies[b].y);
      const need=(bodies[a].r||0.36)+(bodies[b].r||0.36);
      if(gap<minGap) minGap=gap;
      check(gap+1e-6>=need, label+' f'+(f+1)+' overlap '+(bodies[a].name||'?')+'/'+(bodies[b].name||'?')+' gap '+gap.toFixed(3));
    }
  }
  const ratio=worst/(mac.sp*DT);
  console.log('resume '+label+' max '+worstName+' '+worst.toFixed(4)+' ratio '+ratio.toFixed(3)+' minGap '+minGap.toFixed(3));
  assert(ratio<=1.05+1e-3, label+' max follower/leader step '+ratio.toFixed(3));
}
const down=unit(1,1), diag=unit(1,-1), east=unit(1,0);
const framesOf=(h,n)=>Array.from({length:n},()=>h);
resumeCase('straight-east', east, framesOf(east, 30));
resumeCase('straight-down', down, framesOf(down, 30));
resumeCase('diagonal', diag, framesOf(diag, 30));
resumeCase('down-then-diagonal', down, framesOf(down, 8).concat(framesOf(diag, 22)));

if(failed){ console.error(failed+' failed'); process.exit(1); }
console.log('ghost settle idle ok');

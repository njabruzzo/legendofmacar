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

/* A follower already inside the lead ring, ahead of Macar, used to walk
   into him: the steer spent the cap and the push had nothing left. */
function aheadCase(){
  const face=east;
  mac.x=30; mac.y=18; mac.moving=1; mac.fdx=face.x; mac.fdy=face.y;
  mac._frameStep=0; mac.sp=4.3; mac.r=0.36; mac.name='MACAR';
  const crew=[
    makeGhost('pordoom', mac.x+face.x*1.2, mac.y+face.y*1.2, face),
    makeGhost('fendur', mac.x-face.x*2.6, mac.y-face.y*2.6, face),
    makeGhost('orbo', mac.x-face.y*2.4, mac.y+face.x*2.4, face),
    makeGhost('talpor', mac.x+face.y*2.4, mac.y-face.x*2.4, face)
  ];
  ctx.G.ents=[mac].concat(crew);
  let minGap=99, worst=0, worstName='';
  for(let f=0; f<30; f++){
    const mx=mac.x, my=mac.y;
    mac.moving=1; mac.fdx=face.x; mac.fdy=face.y;
    mac.x+=face.x*mac.sp*DT; mac.y+=face.y*mac.sp*DT;
    mac._frameStep=Math.hypot(mac.x-mx, mac.y-my);
    const before=crew.map(e=>({x:e.x, y:e.y}));
    crew.forEach((e,i)=>{
      e._ox=e.x; e._oy=e.y;
      ctx.stepPartyFollower(e, ctx.partyForm(i+1, mac), 0.38, mac, DT);
      e._steerStep=Math.hypot(e.x-e._ox, e.y-e._oy);
    });
    ctx.separateParty(mac, DT);
    crew.forEach((e,i)=>{
      const step=Math.hypot(e.x-before[i].x, e.y-before[i].y);
      const cap=Math.max(mac._frameStep*1.05, e.sp*DT);
      const opened=Math.hypot(e.x-mac.x, e.y-mac.y);
      /* Under 2.0 the away push may exceed the cap to restore the gap. */
      if(Math.hypot(before[i].x-mac.x, before[i].y-mac.y)>=2){
        if(step>worst){ worst=step; worstName=e.name; }
        check(step<=cap+1e-4, 'ahead f'+(f+1)+' '+e.name+' step '+step.toFixed(4)+' cap '+cap.toFixed(4));
      }
      check(opened+1e-4>=2, 'ahead f'+(f+1)+' '+e.name+' gap '+opened.toFixed(3));
    });
    const bodies=[mac].concat(crew);
    for(let a=0;a<bodies.length;a++) for(let b=a+1;b<bodies.length;b++){
      const gap=Math.hypot(bodies[a].x-bodies[b].x, bodies[a].y-bodies[b].y);
      const need=(bodies[a].r||0.36)+(bodies[b].r||0.36);
      if(gap<minGap) minGap=gap;
      check(gap+1e-6>=need, 'ahead f'+(f+1)+' overlap '+(bodies[a].name||'?')+'/'+(bodies[b].name||'?')+' gap '+gap.toFixed(3));
    }
  }
  const ratio=worst/(mac.sp*DT);
  console.log('resume ahead max '+worstName+' '+worst.toFixed(4)+' ratio '+ratio.toFixed(3)+' minGap '+minGap.toFixed(3));
  assert(ratio<=1.05+1e-3, 'ahead max follower/leader step '+ratio.toFixed(3));
  assert(minGap+1e-6>=0.72, 'ahead bodies stay apart (minGap '+minGap.toFixed(3)+')');
}
aheadCase();

/* Screen pixels at the play tile (TW 84, TH 42, zoom 1). */
function pxOf(dx, dy){
  return Math.hypot((dx-dy)*42, (dx+dy)*21);
}
function slideMove(e, ix, iy, dt){
  const nx=e.x+ix*dt, ny=e.y+iy*dt;
  if(ctx.canBe(nx, ny, e.r, e)){ e.x=nx; e.y=ny; return 1; }
  if(ctx.canBe(nx, e.y, e.r, e)){ e.x=nx; return 1; }
  if(ctx.canBe(e.x, ny, e.r, e)){ e.y=ny; return 1; }
  return 0;
}
function settleDrift(crew){
  mac.moving=0; mac._frameStep=0;
  let worst=0;
  const prev=crew.map(e=>({x:e.x, y:e.y}));
  for(let t=0;t<10;t++){
    crew.forEach((e,i)=>{
      e._ox=e.x; e._oy=e.y;
      ctx.stepPartyFollower(e, ctx.partyForm(1, mac), 0.38, mac, DT);
    });
    mac._sepDt=DT;
    ctx.separateParty(mac);
    crew.forEach((e,i)=>{
      const px=pxOf(e.x-prev[i].x, e.y-prev[i].y);
      if(px>worst) worst=px;
      prev[i].x=e.x; prev[i].y=e.y;
    });
  }
  return worst;
}
function pinCase(label, face, macPos, ghostPos, blocked){
  const prevCan=ctx.canBe, prevMove=ctx.move;
  ctx.canBe=function(x,y,r){ return !blocked(x, y, r||0); };
  ctx.move=slideMove;
  mac.x=macPos.x; mac.y=macPos.y; mac.fdx=face.x; mac.fdy=face.y;
  mac.moving=1; mac.sp=4.3; mac.r=0.36; mac.name='MACAR'; mac._sepDt=0;
  const ghost=makeGhost('fendur', ghostPos.x, ghostPos.y, face);
  ctx.G.ents=[mac, ghost];
  let minGap=99;
  for(let f=0; f<40; f++){
    const ox=mac.x, oy=mac.y;
    mac.moving=1; mac.fdx=face.x; mac.fdy=face.y;
    slideMove(mac, face.x*mac.sp, face.y*mac.sp, DT);
    mac._frameStep=Math.hypot(mac.x-ox, mac.y-oy);
    ghost._ox=ghost.x; ghost._oy=ghost.y;
    ctx.stepPartyFollower(ghost, ctx.partyForm(1, mac), 0.38, mac, DT);
    ghost._steerStep=Math.hypot(ghost.x-ghost._ox, ghost.y-ghost._oy);
    mac._sepDt=DT;
    ctx.separateParty(mac);
    const gap=Math.hypot(ghost.x-mac.x, ghost.y-mac.y);
    if(gap<minGap) minGap=gap;
    check(gap+1e-4>=2, label+' f'+(f+1)+' spacing '+gap.toFixed(3));
  }
  const drift=settleDrift([ghost]);
  ctx.canBe=prevCan; ctx.move=prevMove;
  console.log(label+' minGap '+minGap.toFixed(3)+' drift '+drift.toFixed(4)+' px/frame');
  assert(minGap+1e-4>=2, label+' min spacing '+minGap.toFixed(3));
  assert(drift<0.06, label+' settle drift '+drift.toFixed(4)+' px/frame');
}
pinCase('wall', {x:0, y:1}, {x:30, y:16.8}, {x:30, y:19.62}, function(x,y,r){
  return y+r>=20;
});
pinCase('corner', unit(1,1), {x:36.6, y:36.6}, {x:39.62, y:39.62}, function(x,y,r){
  return x+r>=40 || y+r>=40;
});

function insideRingSettle(){
  mac.x=10; mac.y=10; mac.fdx=1; mac.fdy=0; mac.moving=0; mac.r=0.36; mac.sp=4.3;
  const ghost=makeGhost('orbo', 11.961, 10, {x:1, y:0});
  ctx.G.ents=[mac, ghost];
  const drift=settleDrift([ghost]);
  console.log('inside-ring drift '+drift.toFixed(4)+' px/frame at '+Math.hypot(ghost.x-mac.x, ghost.y-mac.y).toFixed(3));
  assert(drift<0.06, 'follower left inside the ring does not creep ('+drift.toFixed(4)+' px/frame)');
}
insideRingSettle();

function dt0Unstack(){
  mac.x=10; mac.y=10; mac.fdx=1; mac.fdy=0; mac.moving=1; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=mac.sp*DT; mac._sepDt=DT;
  const kin=[
    makeGhost('pordoom', 10.05, 10.02, {x:1, y:0}),
    makeGhost('talpor', 10.08, 10.04, {x:1, y:0})
  ];
  ctx.G.ents=[mac].concat(kin);
  ctx.separateParty(mac);
  kin[0].x=10.05; kin[0].y=10.02; kin[1].x=10.08; kin[1].y=10.04;
  mac._sepDt=DT;
  ctx.separateParty(mac, 0);
  const dLead=kin.map(e=>Math.hypot(e.x-mac.x, e.y-mac.y));
  const dKin=Math.hypot(kin[0].x-kin[1].x, kin[0].y-kin[1].y);
  console.log('dt=0 unstack lead '+dLead.map(n=>n.toFixed(2)).join(',')+' kin '+dKin.toFixed(2));
  assert(dLead[0]>=2.1 && dLead[1]>=2.1, 'dt=0 call fully unstacks off Macar (got '+dLead.map(n=>n.toFixed(2)).join(', ')+')');
  assert(dKin>=2.0, 'dt=0 call fully unstacks kin (got '+dKin.toFixed(2)+')');
  assert(!(mac._sepDt>0), 'separateParty clears _sepDt');
}
dt0Unstack();

if(failed){ console.error(failed+' failed'); process.exit(1); }
console.log('ghost settle idle ok');

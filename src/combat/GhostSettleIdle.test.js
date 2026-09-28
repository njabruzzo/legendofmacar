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

let failed=0, asserts=0, cases=0;
function assert(cond, msg){
  asserts++;
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}
function check(cond, msg){
  asserts++;
  if(!cond){ failed++; console.error('FAIL  '+msg); }
}
function mark(){ cases++; }
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

mark();
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
  mark();
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

/* Screen pixels at the unscaled tile (TW 80, TH 40), matching separateParty
   when the play resize has not set TW/TH. */
function screenOf(dx, dy){
  return Math.hypot((dx-dy)*40, (dx+dy)*20);
}
/* Cap plus a few pixels, and never past ~8px when the cap itself is smaller. */
function moveLimit(dx, dy, cap, under){
  if(!under) return cap;
  const step=Math.hypot(dx, dy);
  const ux=step>1e-8?dx/step:1, uy=step>1e-8?dy/step:0;
  const per=screenOf(ux, uy)||1;
  const capPx=screenOf(ux*cap, uy*cap);
  const slack=capPx<8 ? Math.min(3, 8-capPx) : 3;
  return cap+slack/per;
}
/* A follower already inside the lead ring, ahead of Macar, used to walk
   into him: the steer spent the cap and the push had nothing left. */
function aheadCase(){
  mark();
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
      const started=Math.hypot(before[i].x-mac.x, before[i].y-mac.y);
      /* A gap that is already clear stays inside 1.05×. Under 2.0 the
         follower eases out inside the cap plus a few pixels. */
      if(started>=2){
        if(step>worst){ worst=step; worstName=e.name; }
        check(step<=cap+1e-4, 'ahead f'+(f+1)+' '+e.name+' step '+step.toFixed(4)+' cap '+cap.toFixed(4));
      } else {
        check(step<=moveLimit(e.x-before[i].x, e.y-before[i].y, cap, true)+1e-3,
          'ahead f'+(f+1)+' '+e.name+' ease '+step.toFixed(4));
      }
      if(started>=2) check(opened+1e-4>=2, 'ahead f'+(f+1)+' '+e.name+' gap '+opened.toFixed(3));
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
  const lead=Math.hypot(crew[0].x-mac.x, crew[0].y-mac.y);
  console.log('resume ahead max '+worstName+' '+worst.toFixed(4)+' ratio '+ratio.toFixed(3)+' minGap '+minGap.toFixed(3)+' lead '+lead.toFixed(3));
  assert(ratio<=1.05+1e-3, 'ahead max follower/leader step '+ratio.toFixed(3));
  assert(minGap+1e-6>=0.72, 'ahead bodies stay apart (minGap '+minGap.toFixed(3)+')');
  assert(lead+1e-4>=2, 'ahead follower eases out to 2.0 (got '+lead.toFixed(3)+')');
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
  mark();
  const prevCan=ctx.canBe, prevMove=ctx.move;
  ctx.canBe=function(x,y,r){ return !blocked(x, y, r||0); };
  ctx.move=slideMove;
  mac.x=macPos.x; mac.y=macPos.y; mac.fdx=face.x; mac.fdy=face.y;
  mac.moving=1; mac.sp=4.3; mac.r=0.36; mac.name='MACAR'; mac._sepDt=0;
  const ghost=makeGhost('fendur', ghostPos.x, ghostPos.y, face);
  ctx.G.ents=[mac, ghost];
  let minGap=99, maxPx=0, far=0;
  for(let f=0; f<40; f++){
    const ox=mac.x, oy=mac.y;
    mac.moving=1; mac.fdx=face.x; mac.fdy=face.y;
    slideMove(mac, face.x*mac.sp, face.y*mac.sp, DT);
    mac._frameStep=Math.hypot(mac.x-ox, mac.y-oy);
    const gx=ghost.x, gy=ghost.y;
    const sideX=gx-mac.x, sideY=gy-mac.y;
    const started=Math.hypot(sideX, sideY);
    ghost._ox=ghost.x; ghost._oy=ghost.y;
    ctx.stepPartyFollower(ghost, ctx.partyForm(1, mac), 0.38, mac, DT);
    ghost._steerStep=Math.hypot(ghost.x-ghost._ox, ghost.y-ghost._oy);
    mac._sepDt=DT;
    ctx.separateParty(mac);
    const stepX=ghost.x-gx, stepY=ghost.y-gy;
    const step=Math.hypot(stepX, stepY);
    const cap=Math.max(mac._frameStep*1.05, ghost.sp*DT);
    const lim=moveLimit(stepX, stepY, cap, started<2);
    const gap=Math.hypot(ghost.x-mac.x, ghost.y-mac.y);
    const px=screenOf(stepX, stepY);
    if(gap<minGap) minGap=gap;
    if(px>maxPx) maxPx=px;
    check(step<=lim+1e-3, label+' f'+(f+1)+' step '+step.toFixed(4)+' lim '+lim.toFixed(4));
    check(px<=8.05, label+' f'+(f+1)+' screen '+px.toFixed(2)+'px');
    if(started>0.2){
      const dot=sideX*(ghost.x-mac.x)+sideY*(ghost.y-mac.y);
      if(dot<=0) far++;
    }
    check(gap+1e-6>=0.72, label+' f'+(f+1)+' overlap '+gap.toFixed(3));
  }
  const endGap=Math.hypot(ghost.x-mac.x, ghost.y-mac.y);
  const drift=settleDrift([ghost]);
  ctx.canBe=prevCan; ctx.move=prevMove;
  console.log(label+' minGap '+minGap.toFixed(3)+' end '+endGap.toFixed(3)+' maxPx '+maxPx.toFixed(2)+' drift '+drift.toFixed(4));
  assert(far===0, label+' never crosses to Macar\'s far side');
  assert(maxPx<=8.05, label+' max screen step '+maxPx.toFixed(2)+'px');
  assert(drift<0.06, label+' settle drift '+drift.toFixed(4)+' px/frame');
  if(label==='wall') assert(endGap+1e-4>=2, label+' eases clear of the wall (end '+endGap.toFixed(3)+')');
}
pinCase('wall', {x:0, y:1}, {x:30, y:16.8}, {x:30, y:19.62}, function(x,y,r){
  return y+r>=20;
});
/* Bisector into two walls. Every free step loses distance, and the
   same-half segment never gets farther than the corner. Not asserted
   to 2.0: that needs Macar himself to stop on the follower. */
pinCase('corner', unit(1,1), {x:36.6, y:36.6}, {x:39.62, y:39.62}, function(x,y,r){
  return x+r>=40 || y+r>=40;
});

function insideRingSettle(){
  mark();
  mac.x=10; mac.y=10; mac.fdx=1; mac.fdy=0; mac.moving=0; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=0;
  const ghost=makeGhost('orbo', 11.961, 10, {x:1, y:0});
  ctx.G.ents=[mac, ghost];
  let frames=0;
  for(; frames<90; frames++){
    ghost._ox=ghost.x; ghost._oy=ghost.y; ghost._steerStep=0;
    mac.moving=0; mac._frameStep=0; mac._sepDt=DT;
    ctx.separateParty(mac);
    if(Math.hypot(ghost.x-mac.x, ghost.y-mac.y)>=2) break;
  }
  const gap=Math.hypot(ghost.x-mac.x, ghost.y-mac.y);
  const drift=settleDrift([ghost]);
  console.log('inside-ring eased in '+frames+' frames to '+gap.toFixed(3)+' drift '+drift.toFixed(4));
  assert(gap+1e-4>=2, 'idle follower under 2.0 eases out (got '+gap.toFixed(3)+')');
  assert(drift<0.06, 'once clear of 2.0 an idle follower does not drift ('+drift.toFixed(4)+' px/frame)');
}
insideRingSettle();

function dt0Unstack(){
  mark();
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

/* Two followers stacked on each other, and one sitting inside Macar's ring,
   still separate while he is idle. After they clear 2.0 they stop. */
function idleStacked(){
  mark();
  mac.x=12; mac.y=12; mac.fdx=1; mac.fdy=0; mac.moving=0; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=0; mac._sepDt=0;
  const kin=[
    makeGhost('pordoom', 12.01, 12.00, {x:1, y:0}),
    makeGhost('talpor', 12.02, 12.01, {x:1, y:0}),
    makeGhost('orbo', 12.99, 12, {x:1, y:0})
  ];
  ctx.G.ents=[mac].concat(kin);
  let maxStep=0;
  for(let f=0; f<120; f++){
    const before=kin.map(e=>({x:e.x, y:e.y}));
    kin.forEach(e=>{ e._ox=e.x; e._oy=e.y; e._steerStep=0; });
    mac.moving=0; mac._frameStep=0; mac._sepDt=DT;
    ctx.separateParty(mac);
    kin.forEach((e,i)=>{
      const step=Math.hypot(e.x-before[i].x, e.y-before[i].y);
      const cap=e.sp*DT;
      const lim=moveLimit(e.x-before[i].x, e.y-before[i].y, cap, true);
      if(step>maxStep) maxStep=step;
      check(step<=lim+1e-3, 'idle stack f'+(f+1)+' '+e.name+' step '+step.toFixed(4));
    });
  }
  const pair=Math.hypot(kin[0].x-kin[1].x, kin[0].y-kin[1].y);
  const leads=kin.map(e=>Math.hypot(e.x-mac.x, e.y-mac.y));
  const drift=settleDrift(kin);
  console.log('idle stack pair '+pair.toFixed(3)+' leads '+leads.map(n=>n.toFixed(3)).join(',')+' drift '+drift.toFixed(4)+' maxStep '+maxStep.toFixed(4));
  assert(pair+1e-4>=2, 'stacked followers separate while Macar is idle (got '+pair.toFixed(3)+')');
  assert(leads.every(n=>n+1e-4>=2), 'idle follower under 2.0 leaves Macar (got '+leads.map(n=>n.toFixed(3)).join(', ')+')');
  assert(drift<0.06, 'idle separation stops once every pair is clear ('+drift.toFixed(4)+' px/frame)');
}
idleStacked();

/* North wall, the frame that used to throw PORDUM past Macar. */
function pinnedNorth(dt, label){
  mark();
  const prevCan=ctx.canBe, prevMove=ctx.move;
  ctx.canBe=function(x,y,r){ return (y-(r||0))>=8; };
  ctx.move=slideMove;
  const face={x:0, y:-1};
  mac.x=20; mac.y=11.2; mac.fdx=face.x; mac.fdy=face.y;
  mac.moving=1; mac.sp=4.3; mac.r=0.36; mac.name='MACAR'; mac._sepDt=0;
  const ghost=makeGhost('pordoom', 20.15, 8.7, face);
  ctx.G.ents=[mac, ghost];
  let far=0, maxStep=0, maxPx=0, minGap=99;
  const frames=dt>0.03?12:40;
  for(let f=0; f<frames; f++){
    const ox=mac.x, oy=mac.y;
    mac.moving=1;
    slideMove(mac, face.x*mac.sp, face.y*mac.sp, dt);
    mac._frameStep=Math.hypot(mac.x-ox, mac.y-oy);
    const gx=ghost.x, gy=ghost.y;
    const sideX=gx-mac.x, sideY=gy-mac.y;
    const started=Math.hypot(sideX, sideY);
    ghost._ox=gx; ghost._oy=gy;
    ctx.stepPartyFollower(ghost, ctx.partyForm(1, mac), 0.38, mac, dt);
    ghost._steerStep=Math.hypot(ghost.x-gx, ghost.y-gy);
    mac._sepDt=dt;
    ctx.separateParty(mac);
    const stepX=ghost.x-gx, stepY=ghost.y-gy, step=Math.hypot(stepX, stepY);
    const cap=Math.max(mac._frameStep*1.05, ghost.sp*dt);
    const lim=moveLimit(stepX, stepY, cap, started<2);
    const px=screenOf(stepX, stepY);
    if(step>maxStep) maxStep=step;
    if(px>maxPx) maxPx=px;
    const gap=Math.hypot(ghost.x-mac.x, ghost.y-mac.y);
    if(gap<minGap) minGap=gap;
    check(step<=lim+1e-3, label+' f'+(f+1)+' step '+step.toFixed(4)+' lim '+lim.toFixed(4));
    if(started>0.2){
      const dot=sideX*(ghost.x-mac.x)+sideY*(ghost.y-mac.y);
      if(dot<=0) far++;
    }
    if(dt<=1/60+1e-6) check(px<=8.05, label+' f'+(f+1)+' screen '+px.toFixed(2)+'px');
  }
  ctx.canBe=prevCan; ctx.move=prevMove;
  console.log(label+' maxStep '+maxStep.toFixed(4)+' maxPx '+maxPx.toFixed(2)+' minGap '+minGap.toFixed(3)+' far '+far);
  assert(far===0, label+' never hops to Macar\'s far side');
  assert(maxStep<0.5, label+' no single-frame teleport (step '+maxStep.toFixed(3)+')');
}
pinnedNorth(DT, 'pin-north-60');
pinnedNorth(0.05, 'pin-north-dt05');

/* Four followers walking into a north wall stay a body apart, including
   follower pairs, and a frame that starts clear of 2.0 stays inside 1.05×. */
function gridNorthPairs(){
  mark();
  const prevCan=ctx.canBe, prevMove=ctx.move;
  ctx.canBe=function(x,y,r){ return (y-(r||0))>=8; };
  ctx.move=slideMove;
  const face={x:0, y:-1};
  mac.x=24; mac.y=12.5; mac.fdx=face.x; mac.fdy=face.y;
  mac.moving=1; mac.sp=4.3; mac.r=0.36; mac.name='MACAR';
  const crew=['pordoom','fendur','orbo','talpor'].map((name,i)=>{
    const slot=ctx.partyForm(i+1, mac);
    return makeGhost(name, slot.x, slot.y, face);
  });
  ctx.G.ents=[mac].concat(crew);
  let minClear=99, maxRatio=0, maxPx=0, sawClear=0;
  for(let f=0; f<50; f++){
    const ox=mac.x, oy=mac.y;
    mac.moving=1; mac.fdx=face.x; mac.fdy=face.y;
    slideMove(mac, face.x*mac.sp, face.y*mac.sp, DT);
    mac._frameStep=Math.hypot(mac.x-ox, mac.y-oy);
    const before=crew.map(e=>({x:e.x, y:e.y}));
    crew.forEach((e,i)=>{
      e._ox=e.x; e._oy=e.y;
      ctx.stepPartyFollower(e, ctx.partyForm(i+1, mac), 0.38, mac, DT);
      e._steerStep=Math.hypot(e.x-e._ox, e.y-e._oy);
    });
    const startBodies=[mac].concat(before);
    let startMin=99;
    for(let a=0;a<startBodies.length;a++) for(let b=a+1;b<startBodies.length;b++){
      const gap=Math.hypot(startBodies[a].x-startBodies[b].x, startBodies[a].y-startBodies[b].y);
      if(gap<startMin) startMin=gap;
    }
    mac._sepDt=DT;
    ctx.separateParty(mac);
    const bodies=[mac].concat(crew);
    let frameMin=99;
    for(let a=0;a<bodies.length;a++) for(let b=a+1;b<bodies.length;b++){
      const gap=Math.hypot(bodies[a].x-bodies[b].x, bodies[a].y-bodies[b].y);
      if(gap<frameMin) frameMin=gap;
    }
    /* Formation slots begin under 2.0 and ease out. Once every pair has
       cleared 2.0, later frames stay there. */
    if(startMin>=2){
      sawClear=1;
      if(frameMin<minClear) minClear=frameMin;
      check(frameMin+1e-4>=2, 'gridN f'+(f+1)+' pair '+frameMin.toFixed(3));
    }
    crew.forEach((e,i)=>{
      const stepX=e.x-before[i].x, stepY=e.y-before[i].y, step=Math.hypot(stepX, stepY);
      const started=Math.hypot(before[i].x-mac.x, before[i].y-mac.y);
      let kinUnder=false;
      for(let k=0;k<crew.length;k++) if(k!==i){
        if(Math.hypot(before[i].x-before[k].x, before[i].y-before[k].y)<2) kinUnder=true;
      }
      const cap=Math.max(mac._frameStep*1.05, e.sp*DT);
      const px=screenOf(stepX, stepY);
      if(px>maxPx) maxPx=px;
      if(started>=2 && !kinUnder){
        const ratio=step/(mac.sp*DT);
        if(ratio>maxRatio) maxRatio=ratio;
        check(step<=cap+1e-3, 'gridN f'+(f+1)+' '+e.name+' step '+step.toFixed(4)+' cap '+cap.toFixed(4));
      } else {
        check(step<=moveLimit(stepX, stepY, cap, true)+1e-3, 'gridN f'+(f+1)+' ease '+e.name+' '+step.toFixed(4));
      }
      check(px<=8.05, 'gridN f'+(f+1)+' '+e.name+' '+px.toFixed(2)+'px');
    });
  }
  ctx.canBe=prevCan; ctx.move=prevMove;
  console.log('gridN clearMin '+minClear.toFixed(3)+' maxRatio '+maxRatio.toFixed(3)+' maxPx '+maxPx.toFixed(2));
  assert(sawClear===1 && minClear+1e-4>=2, 'gridN pairs stay at least 2.0 once clear (min '+minClear.toFixed(3)+')');
  assert(maxRatio<=1.05+1e-3, 'gridN frames that start clear stay within 1.05× ('+maxRatio.toFixed(3)+')');
  assert(maxPx<=8.05, 'gridN screen step '+maxPx.toFixed(2)+'px');
}
gridNorthPairs();

/* A follower inside 0.2 of an idle Macar used to have every chord rejected. */
function nearMacarEscape(){
  mark();
  mac.x=10; mac.y=10; mac.fdx=1; mac.fdy=0; mac.moving=0; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=0; mac._sepDt=0;
  const kin=[
    makeGhost('pordoom', 10.1, 10, {x:1, y:0}),
    makeGhost('fendur', 10, 10.028, {x:1, y:0})
  ];
  ctx.G.ents=[mac].concat(kin);
  const prevTW=ctx.TW, prevTH=ctx.TH;
  ctx.TW=116; ctx.TH=58;
  let far=0, maxPx=0;
  for(let f=0; f<80; f++){
    const before=kin.map(e=>({x:e.x, y:e.y, sx:e.x-mac.x, sy:e.y-mac.y, d:Math.hypot(e.x-mac.x, e.y-mac.y)}));
    kin.forEach(e=>{ e._ox=e.x; e._oy=e.y; e._steerStep=0; });
    mac.moving=0; mac._frameStep=0; mac._sepDt=DT;
    ctx.separateParty(mac);
    kin.forEach((e,i)=>{
      const stepX=e.x-before[i].x, stepY=e.y-before[i].y;
      const px=Math.hypot((stepX-stepY)*58, (stepX+stepY)*29);
      if(px>maxPx) maxPx=px;
      if(before[i].d>0.2){
        const dot=before[i].sx*(e.x-mac.x)+before[i].sy*(e.y-mac.y);
        if(dot<=0) far++;
      }
      check(px<=8, 'near escape f'+(f+1)+' '+e.name+' '+px.toFixed(2)+'px');
    });
  }
  ctx.TW=prevTW; ctx.TH=prevTH;
  const gaps=kin.map(e=>Math.hypot(e.x-mac.x, e.y-mac.y));
  const pair=Math.hypot(kin[0].x-kin[1].x, kin[0].y-kin[1].y);
  console.log('near escape gaps '+gaps.map(n=>n.toFixed(3)).join(',')+' pair '+pair.toFixed(3)+' maxPx '+maxPx.toFixed(2)+' far '+far);
  assert(gaps.every(n=>n+1e-4>=2), 'a follower within 0.2 of Macar escapes (got '+gaps.map(n=>n.toFixed(3)).join(', ')+')');
  assert(pair+1e-4>=2, 'near followers stay apart (pair '+pair.toFixed(3)+')');
  assert(far===0, 'near escape does not cross to Macar\'s far side');
  assert(maxPx<=8, 'near escape screen step '+maxPx.toFixed(2)+'px');
}
nearMacarEscape();

/* One wall, Macar due north. The along-wall step gains a few thousandths,
   under the old +0.01 accept, so a restored threshold leaves him pinned. */
function tangentWallSlide(){
  mark();
  const prevCan=ctx.canBe, prevMove=ctx.move;
  ctx.canBe=function(x,y,r){ return (y+(r||0))<20; };
  ctx.move=slideMove;
  mac.x=30; mac.y=17.739; mac.fdx=1; mac.fdy=0; mac.moving=0; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=0; mac.name='MACAR';
  const ghost=makeGhost('orbo', 30, 19.639, {x:1, y:0});
  ctx.G.ents=[mac, ghost];
  const start=Math.hypot(ghost.x-mac.x, ghost.y-mac.y);
  let firstGain=null, far=0;
  for(let f=0; f<80; f++){
    const gx=ghost.x, gy=ghost.y;
    const sideX=gx-mac.x, sideY=gy-mac.y;
    const started=Math.hypot(sideX, sideY);
    ghost._ox=gx; ghost._oy=gy; ghost._steerStep=0;
    mac.moving=0; mac._frameStep=0; mac._sepDt=DT;
    ctx.separateParty(mac);
    const opened=Math.hypot(ghost.x-mac.x, ghost.y-mac.y);
    if(firstGain==null) firstGain=opened-started;
    if(started>0.2){
      const dot=sideX*(ghost.x-mac.x)+sideY*(ghost.y-mac.y);
      if(dot<=0) far++;
    }
  }
  const end=Math.hypot(ghost.x-mac.x, ghost.y-mac.y);
  ctx.canBe=prevCan; ctx.move=prevMove;
  console.log('tangent wall start '+start.toFixed(3)+' firstGain '+firstGain.toFixed(4)+' end '+end.toFixed(3)+' far '+far);
  assert(firstGain>0 && firstGain<0.01, 'the wall slide gains under 0.01 (got '+firstGain.toFixed(4)+')');
  assert(end+1e-4>=2, 'a corner-pinned follower reaches 2.0 (got '+end.toFixed(3)+')');
  assert(far===0, 'tangent slide stays on Macar\'s near side');
}
tangentWallSlide();

/* Pair push at dt 0.05. Without the far-side guard the nearer follower
   steps through Macar (dot goes negative). */
function pairFarSide(){
  mark();
  mac.x=10; mac.y=10; mac.fdx=1; mac.fdy=0; mac.moving=0; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=0;
  const a=makeGhost('pordoom', 10.05, 10, {x:1, y:0});
  const b=makeGhost('fendur', 10.85, 10, {x:1, y:0});
  ctx.G.ents=[mac, a, b];
  const sx=a.x-mac.x, sy=a.y-mac.y;
  a._ox=a.x; a._oy=a.y; b._ox=b.x; b._oy=b.y; a._steerStep=0; b._steerStep=0;
  mac._sepDt=0.05;
  ctx.separateParty(mac);
  const dot=sx*(a.x-mac.x)+sy*(a.y-mac.y);
  console.log('pair far-side A '+a.x.toFixed(3)+','+a.y.toFixed(3)+' dot '+dot.toFixed(4));
  assert(dot>1e-4, 'a pair push does not cross to Macar\'s far side (dot '+dot.toFixed(4)+')');
}
pairFarSide();

/* The walk cap is already spent. Only the under-2.0 slack opens the pair. */
function pairUnderSlack(){
  mark();
  mac.x=10; mac.y=24; mac.fdx=1; mac.fdy=0; mac.moving=0; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=0;
  const cap=4*DT;
  const a=makeGhost('pordoom', 10, 10, {x:1, y:0});
  const b=makeGhost('talpor', 11.97, 10, {x:1, y:0});
  a._ox=a.x+cap; a._oy=a.y; b._ox=b.x-cap; b._oy=b.y;
  a._steerStep=cap; b._steerStep=cap;
  ctx.G.ents=[mac, a, b];
  mac._sepDt=DT;
  ctx.separateParty(mac);
  const pair=Math.hypot(a.x-b.x, a.y-b.y);
  console.log('pair slack '+pair.toFixed(3));
  assert(pair+1e-4>=2, 'a follower pair under 2.0 opens on the slack (got '+pair.toFixed(3)+')');
}
pairUnderSlack();

/* Macar's stride is shorter than a ghost's walk. A clear follower matches him. */
function shortLeaderRatio(){
  mark();
  const face=east;
  mac.x=30; mac.y=18; mac.fdx=face.x; mac.fdy=face.y; mac.moving=1; mac.r=0.36; mac.sp=4.3;
  mac.name='MACAR';
  const crew=[
    makeGhost('pordoom', 30+2.4, 18, face),
    makeGhost('fendur', 30-2.4, 18, face),
    makeGhost('orbo', 30, 18+2.5, face),
    makeGhost('talpor', 30, 18-2.5, face)
  ];
  ctx.G.ents=[mac].concat(crew);
  let worst=0;
  const leadStep=0.03;
  for(let f=0; f<8; f++){
    mac.moving=1; mac._frameStep=leadStep;
    mac.x+=face.x*leadStep; mac.y+=face.y*leadStep;
    const before=crew.map(e=>({x:e.x, y:e.y}));
    crew.forEach((e,i)=>{
      e._ox=e.x; e._oy=e.y;
      ctx.stepPartyFollower(e, ctx.partyForm(i+1, mac), 0.38, mac, DT);
      e._steerStep=Math.hypot(e.x-e._ox, e.y-e._oy);
    });
    mac._sepDt=DT;
    ctx.separateParty(mac);
    crew.forEach((e,i)=>{
      const step=Math.hypot(e.x-before[i].x, e.y-before[i].y);
      const beforeMac=Math.hypot(before[i].x-(mac.x-face.x*leadStep), before[i].y-(mac.y-face.y*leadStep));
      const afterMac=Math.hypot(before[i].x-mac.x, before[i].y-mac.y);
      let kinClear=true;
      for(let k=0;k<crew.length;k++) if(k!==i){
        if(Math.hypot(before[i].x-before[k].x, before[i].y-before[k].y)<2) kinClear=false;
      }
      if(beforeMac>=2 && afterMac>=2 && kinClear){
        const ratio=step/leadStep;
        if(ratio>worst) worst=ratio;
        check(step<=leadStep*1.05+1e-4, 'short lead f'+(f+1)+' '+e.name+' ratio '+ratio.toFixed(3));
      }
    });
  }
  console.log('short lead ratio '+worst.toFixed(3));
  assert(worst>0, 'short-lead ratio was measured');
  assert(worst<=1.05+1e-3, 'a clear follower stays within 1.05× a short stride ('+worst.toFixed(3)+')');
}
shortLeaderRatio();

/* Laptop tile. Three stacked ghosts, Macar idle. No frame over 8px. */
function idleTriplePx(){
  mark();
  const prevTW=ctx.TW, prevTH=ctx.TH;
  ctx.TW=116; ctx.TH=58;
  mac.x=12; mac.y=12; mac.fdx=1; mac.fdy=0; mac.moving=0; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=0;
  const kin=[
    makeGhost('pordoom', 12.02, 12.01, {x:1, y:0}),
    makeGhost('fendur', 12.04, 11.99, {x:1, y:0}),
    makeGhost('orbo', 12.01, 12.03, {x:1, y:0})
  ];
  ctx.G.ents=[mac].concat(kin);
  let maxPx=0;
  for(let f=0; f<40; f++){
    const before=kin.map(e=>({x:e.x, y:e.y}));
    kin.forEach(e=>{ e._ox=e.x; e._oy=e.y; e._steerStep=0; });
    mac.moving=0; mac._frameStep=0; mac._sepDt=DT;
    ctx.separateParty(mac);
    kin.forEach((e,i)=>{
      const dx=e.x-before[i].x, dy=e.y-before[i].y;
      const px=Math.hypot((dx-dy)*58, (dx+dy)*29);
      if(px>maxPx) maxPx=px;
      check(px<=8, 'idle triple f'+(f+1)+' '+e.name+' '+px.toFixed(2)+'px');
    });
  }
  ctx.TW=prevTW; ctx.TH=prevTH;
  const gaps=kin.map(e=>Math.hypot(e.x-mac.x, e.y-mac.y));
  console.log('idle triple maxPx '+maxPx.toFixed(3)+' leads '+gaps.map(n=>n.toFixed(3)).join(','));
  assert(maxPx<=8, 'idle triple screen step '+maxPx.toFixed(2)+'px at 16.7ms');
  assert(gaps.every(n=>n+1e-4>=2), 'idle triple separates (got '+gaps.map(n=>n.toFixed(3)).join(', ')+')');
}
idleTriplePx();

/* dt 0.05, follower inside 0.2, diagonal into two walls. He still leaves. */
function doubleBlockedDiagonal(){
  mark();
  const prevCan=ctx.canBe, prevMove=ctx.move;
  ctx.canBe=function(x,y,r){ return (x+(r||0))<40 && (y+(r||0))<40; };
  ctx.move=slideMove;
  mac.x=39.0; mac.y=39.0; mac.fdx=1; mac.fdy=1; mac.moving=0; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=0; mac.name='MACAR';
  const ghost=makeGhost('pordoom', 39.07, 39.04, {x:1, y:1});
  ctx.G.ents=[mac, ghost];
  const start=Math.hypot(ghost.x-mac.x, ghost.y-mac.y);
  let far=0, stuck=0;
  for(let f=0; f<40; f++){
    const gx=ghost.x, gy=ghost.y;
    const sideX=gx-mac.x, sideY=gy-mac.y;
    const started=Math.hypot(sideX, sideY);
    ghost._ox=gx; ghost._oy=gy; ghost._steerStep=0;
    mac.moving=0; mac._frameStep=0; mac._sepDt=0.05;
    ctx.separateParty(mac);
    const step=Math.hypot(ghost.x-gx, ghost.y-gy);
    if(step<1e-4 && started<2) stuck++;
    if(started>0.2){
      const dot=sideX*(ghost.x-mac.x)+sideY*(ghost.y-mac.y);
      if(dot<=0) far++;
    }
  }
  const end=Math.hypot(ghost.x-mac.x, ghost.y-mac.y);
  ctx.canBe=prevCan; ctx.move=prevMove;
  console.log('double-blocked start '+start.toFixed(3)+' end '+end.toFixed(3)+' stuck '+stuck+' far '+far);
  assert(start<0.2, 'double-blocked starts inside 0.2 (got '+start.toFixed(3)+')');
  assert(end>0.5, 'double-blocked diagonal leaves the 0.2 bubble (got '+end.toFixed(3)+')');
  assert(far===0, 'double-blocked diagonal stays on Macar\'s near side');
}
doubleBlockedDiagonal();

if(failed){
  console.log('COUNTS cases='+cases+' asserts='+asserts);
  console.error(failed+' failed');
  process.exit(1);
}
console.log('ghost settle idle ok');
console.log('COUNTS cases='+cases+' asserts='+asserts);

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
    if(label!=='corner' && started>0.2){
      const dot=sideX*(ghost.x-mac.x)+sideY*(ghost.y-mac.y);
      if(dot<=0) far++;
    }
    /* A corner slide has to pass his shoulder. Overlap while he is still
       walking into the pin is allowed; crossing back through him is not. */
    if(label==='corner'){
      if(started>0.25) check(gap>0.2, label+' f'+(f+1)+' re-entered Macar '+gap.toFixed(3));
    } else check(gap+1e-6>=0.72, label+' f'+(f+1)+' overlap '+gap.toFixed(3));
  }
  mac.moving=0; mac._frameStep=0;
  let poseBad=0, easeFrames=0;
  for(; easeFrames<90; easeFrames++){
    const gapNow=Math.hypot(ghost.x-mac.x, ghost.y-mac.y);
    if(gapNow>=2) break;
    const gx=ghost.x, gy=ghost.y, g0=ghost.gait;
    ghost._ox=gx; ghost._oy=gy; ghost._steerStep=0;
    ctx.stepPartyFollower(ghost, ctx.partyForm(1, mac), 0.38, mac, DT);
    mac._sepDt=DT;
    ctx.separateParty(mac);
    const px=screenOf(ghost.x-gx, ghost.y-gy);
    if(px>maxPx) maxPx=px;
    check(px<=8.05, label+' ease screen '+px.toFixed(2)+'px');
    if(px>0.5 && (ghost.moving!==1 || !(ghost.gait>g0))) poseBad++;
    const gap=Math.hypot(ghost.x-mac.x, ghost.y-mac.y);
    if(gapNow>0.25) check(gap>0.2, label+' ease re-entered Macar '+gap.toFixed(3));
  }
  const endGap=Math.hypot(ghost.x-mac.x, ghost.y-mac.y);
  const drift=settleDrift([ghost]);
  ctx.canBe=prevCan; ctx.move=prevMove;
  console.log(label+' minGap '+minGap.toFixed(3)+' end '+endGap.toFixed(3)+' ease '+easeFrames+' maxPx '+maxPx.toFixed(2)+' drift '+drift.toFixed(4)+' pose '+poseBad);
  if(label!=='corner') assert(far===0, label+' never crosses to Macar\'s far side');
  assert(maxPx<=8.05, label+' max screen step '+maxPx.toFixed(2)+'px');
  assert(endGap+1e-4>=2, label+' slides clear along the wall (end '+endGap.toFixed(3)+')');
  assert(poseBad===0, label+' slide plays the walk pose');
  assert(drift<0.06, label+' settle drift '+drift.toFixed(4)+' px/frame');
}
pinCase('wall', {x:0, y:1}, {x:30, y:16.8}, {x:30, y:19.62}, function(x,y,r){
  return y+r>=20;
});
/* Bisector into two walls. The free axes lose distance, so the ghost
   commits to a slide along the wall and keeps that heading until 2.0. */
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
    const before=kin.map(e=>({x:e.x, y:e.y, g:e.gait}));
    kin.forEach(e=>{ e._ox=e.x; e._oy=e.y; e._steerStep=0; });
    mac.moving=0; mac._frameStep=0; mac._sepDt=DT;
    ctx.separateParty(mac);
    kin.forEach((e,i)=>{
      const dx=e.x-before[i].x, dy=e.y-before[i].y;
      const px=Math.hypot((dx-dy)*58, (dx+dy)*29);
      if(px>maxPx) maxPx=px;
      check(px<=8, 'idle triple f'+(f+1)+' '+e.name+' '+px.toFixed(2)+'px');
      if(px>0.5) check(e.moving===1 && e.gait>before[i].g, 'idle triple f'+(f+1)+' '+e.name+' walk pose');
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
  let stuck=0, reenter=0, poseBad=0;
  for(let f=0; f<40; f++){
    const gx=ghost.x, gy=ghost.y, g0=ghost.gait;
    const started=Math.hypot(gx-mac.x, gy-mac.y);
    if(started>=2) break;
    ghost._ox=gx; ghost._oy=gy; ghost._steerStep=0;
    mac.moving=0; mac._frameStep=0; mac._sepDt=0.05;
    ctx.separateParty(mac);
    const step=Math.hypot(ghost.x-gx, ghost.y-gy);
    const gap=Math.hypot(ghost.x-mac.x, ghost.y-mac.y);
    if(step<1e-4 && started<2) stuck++;
    if(started>0.25 && gap<=0.2) reenter++;
    const px=screenOf(ghost.x-gx, ghost.y-gy);
    if(px>0.5 && (ghost.moving!==1 || !(ghost.gait>g0))) poseBad++;
  }
  const end=Math.hypot(ghost.x-mac.x, ghost.y-mac.y);
  ctx.canBe=prevCan; ctx.move=prevMove;
  console.log('double-blocked start '+start.toFixed(3)+' end '+end.toFixed(3)+' stuck '+stuck+' reenter '+reenter+' pose '+poseBad);
  assert(start<0.2, 'double-blocked starts inside 0.2 (got '+start.toFixed(3)+')');
  assert(end+1e-4>=2, 'double-blocked diagonal slides out to 2.0 (got '+end.toFixed(3)+')');
  assert(reenter===0, 'double-blocked slide does not pass through Macar');
  assert(poseBad===0, 'double-blocked slide plays the walk pose');
  assert(stuck<5, 'double-blocked diagonal does not freeze (stuck '+stuck+')');
}
doubleBlockedDiagonal();

/* QA rest: a ghost already inside Macar, pinned on a wall, has to slide
   to a free spot after he stops. 0.033 / 0.055 are the walk-throughs;
   0.931 and 1.085 are the rests that used to stay there. */
function pinnedRest(label, blocked, macPos, ghostPos){
  mark();
  const prevCan=ctx.canBe, prevMove=ctx.move, prevTW=ctx.TW, prevTH=ctx.TH;
  ctx.canBe=function(x,y,r){ return !blocked(x, y, r||0); };
  ctx.move=slideMove;
  ctx.TW=116; ctx.TH=58;
  mac.x=macPos.x; mac.y=macPos.y; mac.fdx=-1; mac.fdy=0;
  mac.moving=0; mac.sp=4.3; mac.r=0.36; mac.name='MACAR'; mac._frameStep=0; mac._sepDt=0;
  const ghost=makeGhost('fendur', ghostPos.x, ghostPos.y, {x:-1, y:0});
  ctx.G.ents=[mac, ghost];
  const start=Math.hypot(ghost.x-mac.x, ghost.y-mac.y);
  let poseBad=0, maxPx=0, reenter=0, frames=0;
  for(; frames<90; frames++){
    const gapNow=Math.hypot(ghost.x-mac.x, ghost.y-mac.y);
    if(gapNow>=2) break;
    const gx=ghost.x, gy=ghost.y, g0=ghost.gait;
    ghost._ox=gx; ghost._oy=gy; ghost._steerStep=0;
    ctx.stepPartyFollower(ghost, ctx.partyForm(1, mac), 0.38, mac, DT);
    mac._sepDt=DT;
    ctx.separateParty(mac);
    const gap=Math.hypot(ghost.x-mac.x, ghost.y-mac.y);
    const px=Math.hypot((ghost.x-gx-(ghost.y-gy))*58, (ghost.x-gx+(ghost.y-gy))*29);
    if(px>maxPx) maxPx=px;
    check(px<=8.05, label+' f'+(frames+1)+' screen '+px.toFixed(2)+'px');
    if(px>0.5 && (ghost.moving!==1 || !(ghost.gait>g0))) poseBad++;
    if(gapNow>0.25 && gap<=0.2) reenter++;
  }
  const end=Math.hypot(ghost.x-mac.x, ghost.y-mac.y);
  const drift=settleDrift([ghost]);
  const still=ghost.moving;
  ctx.canBe=prevCan; ctx.move=prevMove; ctx.TW=prevTW; ctx.TH=prevTH;
  console.log(label+' start '+start.toFixed(3)+' frames '+frames+' end '+end.toFixed(3)+' maxPx '+maxPx.toFixed(2)+' drift '+drift.toFixed(4)+' pose '+poseBad);
  assert(end+1e-4>=2, label+' reaches 2.0 after the stop (got '+end.toFixed(3)+')');
  assert(poseBad===0, label+' motion over 0.5px uses the walk pose');
  assert(reenter===0, label+' slide does not pass through Macar');
  assert(maxPx<=8.05, label+' screen step '+maxPx.toFixed(2)+'px');
  assert(drift<0.06, label+' holds still once clear ('+drift.toFixed(4)+' px/frame)');
  assert(still===0, label+' idle pose once the slide is done');
}
pinnedRest('west pin 0.033', function(x,y,r){ return x-r<10; }, {x:10.393, y:20}, {x:10.36, y:20});
pinnedRest('west rest 0.931', function(x,y,r){ return x-r<10; }, {x:11.291, y:20}, {x:10.36, y:20});
pinnedRest('west rest 1.085', function(x,y,r){ return x-r<10; }, {x:11.445, y:20}, {x:10.36, y:20});
pinnedRest('corner pin 0.055', function(x,y,r){ return x+r>=40 || y+r>=40; }, {x:39.591, y:39.591}, {x:39.63, y:39.63});

/* Reverse, then stop, with the restore still unfinished. Any frame that
   moves the follower more than about half a pixel has to be the walk pose. */
function reverseTurnPose(){
  mark();
  const prevCan=ctx.canBe, prevMove=ctx.move, prevTW=ctx.TW, prevTH=ctx.TH;
  ctx.canBe=function(){ return true; };
  ctx.move=function(e,dx,dy,dt){ e.x+=dx*dt; e.y+=dy*dt; return 1; };
  ctx.TW=116; ctx.TH=58;
  const eastF={x:1, y:0}, westF={x:-1, y:0};
  mac.x=30; mac.y=18; mac.fdx=1; mac.fdy=0; mac.moving=1; mac.sp=4.3; mac.r=0.36; mac.name='MACAR';
  const names=['pordoom','fendur','orbo','talpor'];
  const crew=names.map((name,i)=>{
    const slot=ctx.partyForm(i+1, mac);
    return makeGhost(name, slot.x, slot.y, eastF);
  });
  ctx.G.ents=[mac].concat(crew);
  function step(face){
    const ox=mac.x, oy=mac.y;
    mac.moving=1; mac.fdx=face.x; mac.fdy=face.y;
    mac.x+=face.x*mac.sp*DT; mac.y+=face.y*mac.sp*DT;
    mac._frameStep=Math.hypot(mac.x-ox, mac.y-oy);
    crew.forEach((e,i)=>{
      e._ox=e.x; e._oy=e.y;
      ctx.stepPartyFollower(e, ctx.partyForm(i+1, mac), 0.38, mac, DT);
      e._steerStep=Math.hypot(e.x-e._ox, e.y-e._oy);
    });
    mac._sepDt=DT;
    ctx.separateParty(mac);
  }
  for(let i=0;i<24;i++) step(eastF);
  for(let i=0;i<6;i++) step(westF);
  mac.moving=0; mac._frameStep=0;
  const fendur=crew[1];
  /* Open ground is already clear. The glide QA measured is the restore
     that is still running when he stops, so she is put back inside 2.0. */
  fendur.x=mac.x-1.15; fendur.y=mac.y;
  fendur._slideUx=0; fendur._slideUy=0;
  let poseBad=0, glide=0, frames=0;
  for(; frames<40; frames++){
    const gapNow=Math.hypot(fendur.x-mac.x, fendur.y-mac.y);
    if(gapNow>=2) break;
    const before=crew.map(e=>({x:e.x, y:e.y, g:e.gait}));
    crew.forEach(e=>{ e._ox=e.x; e._oy=e.y; e._steerStep=0; });
    crew.forEach((e,i)=>ctx.stepPartyFollower(e, ctx.partyForm(i+1, mac), 0.38, mac, DT));
    mac._sepDt=DT;
    ctx.separateParty(mac);
    crew.forEach((e,i)=>{
      const dx=e.x-before[i].x, dy=e.y-before[i].y;
      const px=Math.hypot((dx-dy)*58, (dx+dy)*29);
      const tiles=Math.hypot(dx, dy);
      if(e===fendur) glide+=tiles;
      if(px>0.5 && (e.moving!==1 || !(e.gait>before[i].g))) poseBad++;
      if(e.moving===0) check(px<=0.5, 'reverse stop '+e.name+' idle pose moved '+px.toFixed(2)+'px');
    });
  }
  const end=Math.hypot(fendur.x-mac.x, fendur.y-mac.y);
  const drift=settleDrift(crew);
  ctx.canBe=prevCan; ctx.move=prevMove; ctx.TW=prevTW; ctx.TH=prevTH;
  console.log('reverse-turn glide '+glide.toFixed(3)+' tiles in '+frames+' frames end '+end.toFixed(3)+' pose '+poseBad+' drift '+drift.toFixed(4));
  assert(glide>0.4, 'reverse-turn stop still has FENDUR easing ('+glide.toFixed(3)+' tiles)');
  assert(poseBad===0, 'a step over 0.5px after the stop is the walk pose');
  assert(end+1e-4>=2, 'reverse-turn restore reaches 2.0 (got '+end.toFixed(3)+')');
  assert(drift<0.06, 'reverse-turn restore stops once clear ('+drift.toFixed(4)+' px/frame)');
  assert(crew.every(e=>e.moving===0), 'followers are idle once the restore is done');
}
reverseTurnPose();

/* While Macar is walking, a follower's gait steps once per frame, at his
   3.35/s, not twice. */
function followGaitRate(){
  mark();
  const face=east;
  mac.x=30; mac.y=18; mac.fdx=face.x; mac.fdy=face.y; mac.moving=1;
  mac.sp=4.3; mac.r=0.36; mac.name='MACAR';
  const ghost=makeGhost('pordoom', 24, 16, face);
  ghost.gait=0.1;
  ctx.G.ents=[mac, ghost];
  const frames=90;
  const g0=ghost.gait;
  const m0=mac.gait||0;
  for(let f=0; f<frames; f++){
    const ox=mac.x, oy=mac.y;
    mac.moving=1; mac.fdx=face.x; mac.fdy=face.y;
    mac.x+=face.x*mac.sp*DT; mac.y+=face.y*mac.sp*DT;
    mac._frameStep=Math.hypot(mac.x-ox, mac.y-oy);
    ctx.gaitAdvance(mac, DT);
    ghost._ox=ghost.x; ghost._oy=ghost.y; ghost._steerStep=0;
    ctx.stepPartyFollower(ghost, ctx.partyForm(1, mac), 0.38, mac, DT);
    ghost._steerStep=Math.hypot(ghost.x-ghost._ox, ghost.y-ghost._oy);
    mac._sepDt=DT;
    ctx.separateParty(mac);
  }
  const rate=(ghost.gait-g0)/(frames*DT);
  const macRate=((mac.gait||0)-m0)/(frames*DT);
  console.log('follow gait '+rate.toFixed(3)+'/s macar '+macRate.toFixed(3)+'/s');
  assert(Math.abs(macRate-3.35)<0.02, 'Macar walks at 3.35/s (got '+macRate.toFixed(3)+')');
  assert(Math.abs(rate-3.35)<0.05, 'a following ghost walks at 3.35/s (got '+rate.toFixed(3)+')');
  assert(rate<5, 'a following ghost does not double-step the gait ('+rate.toFixed(3)+'/s)');
}
followGaitRate();

/* Macar held into a wall: moving stays set, the frame step is ~0.
   The follower must not jitter or flip sheets. */
function wallHoldSheet(){
  mark();
  const prevCan=ctx.canBe, prevMove=ctx.move, prevTW=ctx.TW, prevTH=ctx.TH;
  ctx.canBe=function(x,y,r){ return (y-(r||0))>=8; };
  ctx.move=slideMove;
  ctx.TW=116; ctx.TH=58;
  const face={x:0, y:-1};
  mac.x=20; mac.y=8.4; mac.fdx=face.x; mac.fdy=face.y;
  mac.moving=1; mac.sp=4.3; mac.r=0.36; mac.name='MACAR'; mac._frameStep=0;
  const slot=ctx.partyForm(1, mac);
  const ghost=makeGhost('fendur', slot.x, slot.y, face);
  ctx.G.ents=[mac, ghost];
  function sheet(e){
    const sx=(e.fdx||0)-(e.fdy||0), sy=(e.fdx||0)+(e.fdy||0);
    let oct='s';
    if(sx||sy){
      const deg=((Math.atan2(sy, sx)*180/Math.PI)+360)%360;
      oct=['e','se','s','sw','w','nw','n','ne'][Math.round(deg/45)%8];
    }
    return (oct==='n'?'back':'front')+':'+(e.moving?'walk':'idle');
  }
  const first=sheet(ghost);
  let flips=0, maxPx=0;
  for(let f=0; f<120; f++){
    const gx=ghost.x, gy=ghost.y;
    ghost._ox=gx; ghost._oy=gy; ghost._steerStep=0;
    mac.moving=1; mac._frameStep=0; mac.fdx=face.x; mac.fdy=face.y;
    ctx.stepPartyFollower(ghost, ctx.partyForm(1, mac), 0.38, mac, DT);
    mac._sepDt=DT;
    ctx.separateParty(mac);
    const dx=ghost.x-gx, dy=ghost.y-gy;
    const px=Math.hypot((dx-dy)*58, (dx+dy)*29);
    if(px>maxPx) maxPx=px;
    const now=sheet(ghost);
    if(now!==first) flips++;
  }
  ctx.canBe=prevCan; ctx.move=prevMove; ctx.TW=prevTW; ctx.TH=prevTH;
  console.log('wall hold flips '+flips+' maxPx '+maxPx.toFixed(4)+' sheet '+first+' -> '+sheet(ghost));
  assert(flips===0, 'wall hold does not flip sheets ('+flips+' in 120)');
  assert(maxPx<0.06, 'wall hold stays under 0.06px/frame (got '+maxPx.toFixed(4)+')');
}
wallHoldSheet();

/* Seeded pair pushes at dt 0.05. None may cross to Macar's far side or
   through the 0.2 bubble once they started outside it. */
function pairRandomFarSide(){
  mark();
  let s=0xC0FFEE;
  function rnd(){
    s=(s+0x6D2B79F5)|0;
    let t=Math.imul(s^s>>>15, 1|s);
    t=t+Math.imul(t^t>>>7, 61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  }
  mac.fdx=1; mac.fdy=0; mac.moving=0; mac.r=0.36; mac.sp=4.3; mac.name='MACAR';
  let crosses=0;
  const trials=400;
  for(let n=0; n<trials; n++){
    mac.x=20; mac.y=20; mac._frameStep=0; mac.moving=0;
    const a=makeGhost('pordoom', mac.x+(rnd()*6-3), mac.y+(rnd()*6-3), {x:1, y:0});
    const b=makeGhost('fendur', mac.x+(rnd()*6-3), mac.y+(rnd()*6-3), {x:1, y:0});
    if(Math.hypot(a.x-mac.x, a.y-mac.y)<0.05) a.x+=0.2;
    if(Math.hypot(b.x-mac.x, b.y-mac.y)<0.05) b.x+=0.2;
    ctx.G.ents=[mac, a, b];
    const start=[a, b].map(e=>({x:e.x, y:e.y, d:Math.hypot(e.x-mac.x, e.y-mac.y)}));
    a._ox=a.x; a._oy=a.y; b._ox=b.x; b._oy=b.y; a._steerStep=0; b._steerStep=0;
    mac._sepDt=0.05;
    ctx.separateParty(mac);
    [a, b].forEach((e,i)=>{
      const rx=start[i].x-mac.x, ry=start[i].y-mac.y;
      const dot=rx*(e.x-mac.x)+ry*(e.y-mac.y);
      if(start[i].d>0.2 && dot<=0) crosses++;
      else if(start[i].d>0.2){
        const vx=e.x-start[i].x, vy=e.y-start[i].y, L=vx*vx+vy*vy;
        if(L>1e-8){
          let t=((mac.x-start[i].x)*vx+(mac.y-start[i].y)*vy)/L;
          if(t<0) t=0; else if(t>1) t=1;
          if(Math.hypot(start[i].x+vx*t-mac.x, start[i].y+vy*t-mac.y)<=0.2) crosses++;
        }
      } else if(start[i].d>1e-3 && dot<=0) crosses++;
    });
  }
  console.log('pair random crosses '+crosses+' / '+trials);
  assert(crosses===0, 'random 50ms pair pushes do not cross Macar ('+crosses+'/'+trials+')');
}
pairRandomFarSide();

/* Four followers, one inside 0.2. A per-pass half-plane rotates that one
   onto Macar's far side at dt 0.05. The frame-start plane does not. */
function pairMultiPassCross(){
  mark();
  mac.x=0; mac.y=0; mac.fdx=1; mac.fdy=0; mac.moving=1; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=4.3*0.05; mac.name='MACAR';
  const pts=[
    [-0.02597072347998619, 0.025771367363631725],
    [-1.97046715952456, 1.095564273186028],
    [-0.9339031353592873, -0.1721120262518525],
    [0.17377502657473087, 1.8203811952844262]
  ];
  const crew=pts.map((p,i)=>makeGhost('g'+i, p[0], p[1], {x:1, y:0}));
  crew.forEach(e=>{ e._ox=e.x; e._oy=e.y; });
  ctx.G.ents=[mac].concat(crew);
  const sx=crew[0].x, sy=crew[0].y;
  mac._sepDt=0.05;
  ctx.separateParty(mac);
  const dot=sx*(crew[0].x)+sy*(crew[0].y);
  console.log('multi-pass g0 '+crew[0].x.toFixed(3)+','+crew[0].y.toFixed(3)+' dot '+dot.toFixed(4));
  assert(dot>0, 'a multi-pass pair push keeps the inside follower on the near side (dot '+dot.toFixed(4)+')');
}
pairMultiPassCross();

/* Steer already overshot. The closing clamp is what pulls a spaced
   follower back inside 1.05× his step. */
function spacedClampPulls(){
  mark();
  mac.x=10; mac.y=10; mac.fdx=1; mac.fdy=0; mac.moving=1; mac.r=0.36; mac.sp=4.3;
  mac.name='MACAR'; mac._frameStep=0.03;
  const ghost=makeGhost('pordoom', 13.2, 10, {x:1, y:0});
  ghost._ox=13; ghost._oy=10; ghost._steerStep=0.2;
  ctx.G.ents=[mac, ghost];
  mac._sepDt=DT;
  ctx.separateParty(mac);
  const step=Math.hypot(ghost.x-ghost._ox, ghost.y-ghost._oy);
  console.log('spaced clamp step '+step.toFixed(4));
  assert(step<=mac._frameStep*1.05+1e-4, 'a spaced follower is clamped to 1.05× (step '+step.toFixed(4)+')');
}
spacedClampPulls();

/* sameHalf/misses forced true lets the only open step pass through Macar. */
function sameHalfBlocksCross(){
  mark();
  const prev=ctx.canBe;
  ctx.canBe=function(x,y){
    if(Math.hypot(x-10.12, y-10)<1e-3) return true;
    return x<10.05;
  };
  mac.x=10; mac.y=10; mac.fdx=1; mac.fdy=0; mac.moving=0; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=0; mac.name='MACAR';
  const ghost=makeGhost('pordoom', 10.12, 10, {x:1, y:0});
  ghost._ox=ghost.x; ghost._oy=ghost.y;
  ctx.G.ents=[mac, ghost];
  mac._sepDt=0.05;
  ctx.separateParty(mac);
  ctx.canBe=prev;
  const dot=(0.12)*(ghost.x-mac.x);
  console.log('sameHalf block x '+ghost.x.toFixed(3)+' dot '+dot.toFixed(4));
  assert(ghost.x>10.05, 'a blocked near side does not step through Macar (x '+ghost.x.toFixed(3)+')');
  assert(dot>0, 'sameHalf keeps the follower on the near side (dot '+dot.toFixed(4)+')');
}
sameHalfBlocksCross();

/* Uncapped axis search picks a cardinal and leaves the away diagonal. */
function axisSlideStaysCapped(){
  mark();
  const prev=ctx.canBe, prevTW=ctx.TW, prevTH=ctx.TH;
  ctx.canBe=function(){ return true; };
  ctx.TW=116; ctx.TH=58;
  mac.x=10; mac.y=10; mac.fdx=1; mac.fdy=0; mac.moving=0; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=0; mac.name='MACAR';
  const ghost=makeGhost('fendur', 9.85, 9.85, {x:1, y:0});
  ghost._ox=ghost.x; ghost._oy=ghost.y;
  ctx.G.ents=[mac, ghost];
  mac._sepDt=0.05;
  ctx.separateParty(mac);
  ctx.canBe=prev; ctx.TW=prevTW; ctx.TH=prevTH;
  const dx=ghost.x-9.85, dy=ghost.y-9.85;
  console.log('axis diagonal dx '+dx.toFixed(4)+' dy '+dy.toFixed(4));
  assert(Math.abs(dx-dy)<0.02, 'a diagonal shove does not become an uncapped cardinal (dx '+dx.toFixed(3)+' dy '+dy.toFixed(3)+')');
  assert(Math.hypot(dx,dy)<0.3, 'diagonal shove stays inside the frame cap');
}
axisSlideStaysCapped();

/* clampGoal off walks the long goal and finishes on the other side of the wall slide. */
function clampGoalShortens(){
  mark();
  const prev=ctx.canBe;
  ctx.canBe=function(x,y,r){ return (x-(r||0))>=10; };
  mac.x=10; mac.y=10; mac.fdx=1; mac.fdy=0; mac.moving=0; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=0; mac.name='MACAR';
  const ghost=makeGhost('orbo', 10.25, 10.5, {x:1, y:0});
  ghost._ox=ghost.x; ghost._oy=ghost.y;
  ctx.G.ents=[mac, ghost];
  mac._sepDt=0.05;
  ctx.separateParty(mac);
  ctx.canBe=prev;
  console.log('clampGoal end '+ghost.x.toFixed(3)+','+ghost.y.toFixed(3));
  assert(ghost.y<10.45, 'the shove goal is the capped point (y '+ghost.y.toFixed(3)+')');
}
clampGoalShortens();

/* Acceptance of +0.01 rejects the short tangent and the wall-escape then jumps to 2.0. */
function acceptTinyGain(){
  mark();
  const prev=ctx.canBe, prevTW=ctx.TW, prevTH=ctx.TH;
  ctx.TW=116; ctx.TH=58;
  ctx.canBe=function(x,y,r){ return (x-(r||0))>=10; };
  mac.x=10; mac.y=10; mac.fdx=1; mac.fdy=0; mac.moving=0; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=0; mac.name='MACAR';
  const ghost=makeGhost('talpor', 10.25, 8.25, {x:1, y:0});
  ghost._ox=ghost.x; ghost._oy=ghost.y; ghost._slideUx=0; ghost._slideUy=0;
  ctx.G.ents=[mac, ghost];
  mac._sepDt=0.05;
  ctx.separateParty(mac);
  const gap=Math.hypot(ghost.x-mac.x, ghost.y-mac.y);
  ctx.canBe=prev; ctx.TW=prevTW; ctx.TH=prevTH;
  console.log('tiny accept gap '+gap.toFixed(3)+' y '+ghost.y.toFixed(3)+' slide '+(ghost._slideUx||0));
  assert(gap<1.95, 'a sub-0.01 tangent gain is kept (gap '+gap.toFixed(3)+')');
  assert(Math.abs(ghost.y-8.25)<0.02, 'the short tangent does not hand off to the far slide');
}
acceptTinyGain();

/* Open pair. The axis accept keeps a gain under 0.01. Restoring +0.01
   walks the follower farther along that axis. */
function acceptUnderHundredth(){
  mark();
  mac.x=0; mac.y=0; mac.fdx=1; mac.fdy=0; mac.moving=0; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=0; mac.name='MACAR';
  const a=makeGhost('pordoom', -1, -1, {x:1, y:0});
  const b=makeGhost('fendur', 1, -1, {x:1, y:0});
  a._ox=0.5; a._oy=-0.6; b._ox=1; b._oy=-1;
  ctx.G.ents=[mac, a, b];
  mac._sepDt=0.05;
  ctx.separateParty(mac);
  console.log('under hundredth x '+a.x.toFixed(3));
  assert(a.x<0.58, 'a sub-0.01 axis gain is not replaced by the +0.01 step (x '+a.x.toFixed(3)+')');
}
acceptUnderHundredth();

/* The compass fallback is the only legal step out of this pocket. */
function bubbleStepOpens(){
  mark();
  const prev=ctx.canBe, prevTW=ctx.TW, prevTH=ctx.TH;
  ctx.TW=116; ctx.TH=58;
  ctx.canBe=function(x,y){
    const dx=x-10.05, dy=y-10;
    if(dx*dx+dy*dy<1e-10) return true;
    if(dy<=0.015 || dx<=0.015) return false;
    return Math.abs(dx-dy)<0.06;
  };
  mac.x=10; mac.y=10; mac.fdx=1; mac.fdy=0; mac.moving=0; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=0; mac.name='MACAR';
  const ghost=makeGhost('pordoom', 10.05, 10, {x:1, y:0});
  ghost._ox=ghost.x; ghost._oy=ghost.y;
  ctx.G.ents=[mac, ghost];
  mac._sepDt=DT;
  ctx.separateParty(mac);
  const step=Math.hypot(ghost.x-10.05, ghost.y-10);
  ctx.canBe=prev; ctx.TW=prevTW; ctx.TH=prevTH;
  console.log('bubble step '+step.toFixed(4)+' pos '+ghost.x.toFixed(3)+','+ghost.y.toFixed(3));
  assert(step>0.04, 'the inside-0.2 compass step still moves the follower (step '+step.toFixed(4)+')');
}
bubbleStepOpens();

/* Phone 50ms, small tiles: the slot is through Macar and one steer
   would land inside his body. The clamp keeps the old distance. */
function steerDoesNotEnterBody(){
  mark();
  const prev=ctx.canBe, prevTW=ctx.TW, prevTH=ctx.TH;
  ctx.TW=66; ctx.TH=34;
  ctx.canBe=function(x,y,r){ return (x-(r||0))>=10; };
  mac.x=12.2; mac.y=10; mac.fdx=-1; mac.fdy=0; mac.moving=1; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=4.3*0.05; mac.name='MACAR';
  const ghost=makeGhost('pordoom', 10.5, 10.4, {x:-1, y:0});
  ghost._ox=ghost.x; ghost._oy=ghost.y;
  const d0=Math.hypot(ghost.x-mac.x, ghost.y-mac.y);
  ctx.G.ents=[mac, ghost];
  ctx.stepPartyFollower(ghost, ctx.partyForm(1, mac), 0.38, mac, 0.05);
  const d1=Math.hypot(ghost.x-mac.x, ghost.y-mac.y);
  ctx.canBe=prev; ctx.TW=prevTW; ctx.TH=prevTH;
  console.log('steer floor d0 '+d0.toFixed(3)+' d1 '+d1.toFixed(3));
  assert(d1+1e-6>=Math.min(d0, 2), 'steer does not close inside the body (d0 '+d0.toFixed(3)+' d1 '+d1.toFixed(3)+')');
}
steerDoesNotEnterBody();

/* Macar idle on a west wall. ORBO stands due south, outside the body.
   A north slide used to walk through him (gaps down to 0.028). The slide
   stops at the body or takes the other tangent. */
function westWallSlideMissesBody(){
  mark();
  const prev=ctx.canBe, prevTW=ctx.TW, prevTH=ctx.TH;
  ctx.TW=116; ctx.TH=58;
  ctx.canBe=function(x,y,r){ return (x-(r||0))>=10; };
  mac.x=10.72; mac.y=20; mac.fdx=-1; mac.fdy=0; mac.moving=0; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=0; mac.name='MACAR';
  const orbo=makeGhost('orbo', 10.72, 19.46, {x:0, y:1});
  ctx.G.ents=[mac, orbo];
  let minGap=99, through=0;
  const gaps=[];
  for(let f=0; f<20; f++){
    const sx=orbo.x, sy=orbo.y;
    const sd=Math.hypot(sx-mac.x, sy-mac.y);
    orbo._ox=sx; orbo._oy=sy; orbo._steerStep=0;
    mac.moving=0; mac._frameStep=0; mac._sepDt=0.05;
    ctx.separateParty(mac);
    const ed=Math.hypot(orbo.x-mac.x, orbo.y-mac.y);
    if(ed<minGap) minGap=ed;
    gaps.push(+ed.toFixed(3));
    if(sd>0.36){
      const vx=orbo.x-sx, vy=orbo.y-sy, L=vx*vx+vy*vy;
      if(L>1e-8){
        let t=((mac.x-sx)*vx+(mac.y-sy)*vy)/L;
        if(t<0) t=0; else if(t>1) t=1;
        if(Math.hypot(sx+vx*t-mac.x, sy+vy*t-mac.y)<=0.36) through++;
      }
    }
  }
  ctx.canBe=prev; ctx.TW=prevTW; ctx.TH=prevTH;
  console.log('west-wall slide min '+minGap.toFixed(3)+' through '+through+' gaps '+gaps.slice(0,6).join(','));
  assert(through===0, 'a west-wall slide does not enter Macar (through '+through+')');
  assert(minGap>0.3, 'a west-wall slide does not reach the center (min '+minGap.toFixed(3)+')');
}
westWallSlideMissesBody();

/* Two followers in a corner. FENDUR's slide must not pass through PORDUM. */
function slideRespectsOtherFollower(){
  mark();
  const prev=ctx.canBe;
  ctx.canBe=function(x,y,r){ return (x+(r||0))<40 && (y+(r||0))<40; };
  mac.x=38.2; mac.y=38.2; mac.fdx=1; mac.fdy=1; mac.moving=0; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=0; mac.name='MACAR';
  const pord=makeGhost('pordoom', 39.15, 38.35, {x:1, y:0});
  const fend=makeGhost('fendur', 38.35, 39.15, {x:0, y:1});
  ctx.G.ents=[mac, pord, fend];
  let minPair=99, through=0;
  for(let f=0; f<24; f++){
    const bodies=[pord, fend].map(e=>({e:e, x:e.x, y:e.y}));
    pord._ox=pord.x; pord._oy=pord.y; fend._ox=fend.x; fend._oy=fend.y;
    mac.moving=0; mac._frameStep=0; mac._sepDt=0.05;
    ctx.separateParty(mac);
    const pair=Math.hypot(pord.x-fend.x, pord.y-fend.y);
    if(pair<minPair) minPair=pair;
    bodies.forEach(b=>{
      const o=b.e===pord?fend:pord;
      const sd=Math.hypot(b.x-o.x, b.y-o.y);
      if(sd<=0.36) return;
      const vx=b.e.x-b.x, vy=b.e.y-b.y, L=vx*vx+vy*vy;
      if(L<1e-8) return;
      let t=((o.x-b.x)*vx+(o.y-b.y)*vy)/L;
      if(t<0) t=0; else if(t>1) t=1;
      if(Math.hypot(b.x+vx*t-o.x, b.y+vy*t-o.y)<=0.36) through++;
    });
  }
  ctx.canBe=prev;
  console.log('kin slide minPair '+minPair.toFixed(3)+' through '+through);
  assert(through===0, 'a follower slide does not pass through another follower ('+through+')');
  assert(minPair>0.3, 'a follower pair does not collapse through a body (min '+minPair.toFixed(3)+')');
}
slideRespectsOtherFollower();

/* Held into a wall with moving still set. Only the wall-held return
   keeps a follower who is already under 2.0 from steering. */
function wallHeldReturnFreezes(){
  mark();
  mac.x=20; mac.y=10; mac.fdx=1; mac.fdy=0; mac.moving=1; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=0; mac.name='MACAR';
  const ghost=makeGhost('fendur', 21.2, 10.4, {x:0, y:1});
  ghost.gait=1.25;
  ctx.G.ents=[mac, ghost];
  const g0=ghost.gait, x0=ghost.x, y0=ghost.y;
  ctx.stepPartyFollower(ghost, {x:24, y:14}, 0.38, mac, DT);
  console.log('wall-held stay '+(ghost.x-x0).toFixed(3)+','+(ghost.y-y0).toFixed(3)+' gait '+(ghost.gait-g0).toFixed(3)+' moving '+ghost.moving);
  assert(Math.hypot(ghost.x-x0, ghost.y-y0)<1e-4, 'a wall-held follower does not steer');
  assert(ghost.gait===g0, 'a wall-held follower does not advance gait');
  assert(ghost.moving===0, 'a wall-held follower is idle');
}
wallHeldReturnFreezes();

/* Idle snap is what clears the moving flag on a follower who already
   stands clear, when separateParty is the only call. */
function idleHoldStillClearsMoving(){
  mark();
  mac.x=10; mac.y=10; mac.fdx=1; mac.fdy=0; mac.moving=0; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=0; mac.name='MACAR';
  const ghost=makeGhost('orbo', 14, 10, {x:0, y:1});
  ghost.moving=1; ghost._ox=ghost.x; ghost._oy=ghost.y;
  ctx.G.ents=[mac, ghost];
  mac._sepDt=DT;
  ctx.separateParty(mac);
  console.log('idle snap moving '+ghost.moving+' at '+ghost.x.toFixed(3)+','+ghost.y.toFixed(3));
  assert(ghost.moving===0, 'an idle clear follower is snapped to idle');
  assert(Math.hypot(ghost.x-14, ghost.y-10)<1e-4, 'an idle clear follower stays on the start spot');
}
idleHoldStillClearsMoving();

/* Pinned on the wall, Macar still walking. The far-side return skips
   steer, so the facing and the gait stay put. */
function pinnedFarSideSkipsSteer(){
  mark();
  const prev=ctx.canBe;
  ctx.canBe=function(x,y,r){ return (x-(r||0))>=10; };
  mac.x=11.1; mac.y=20; mac.fdx=-1; mac.fdy=0; mac.moving=1; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=0.07; mac.name='MACAR';
  const ghost=makeGhost('pordoom', 10.36, 20.15, {x:0, y:1});
  ghost.gait=0.4; ghost.fdx=0; ghost.fdy=1;
  ctx.G.ents=[mac, ghost];
  const g0=ghost.gait;
  ctx.stepPartyFollower(ghost, ctx.partyForm(1, mac), 0.38, mac, DT);
  ctx.canBe=prev;
  console.log('pinned steer gait '+(ghost.gait-g0).toFixed(3)+' face '+ghost.fdx.toFixed(2)+','+ghost.fdy.toFixed(2)+' moving '+ghost.moving);
  assert(ghost.gait===g0, 'a pinned far-side follower does not steer the gait');
  assert(Math.abs(ghost.fdy-1)<1e-6 && Math.abs(ghost.fdx)<1e-6, 'a pinned far-side follower keeps its facing');
}
pinnedFarSideSkipsSteer();

/* The current-position chord, not only the frame-start chord. */
function secondChordBlocks(){
  mark();
  mac.x=0; mac.y=0; mac.fdx=1; mac.fdy=0; mac.moving=0; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=0; mac.name='MACAR';
  const a=makeGhost('pordoom', 0.25, 0.55, {x:1, y:0});
  const b=makeGhost('fendur', 0.25, -1.6, {x:1, y:0});
  a._ox=2.2; a._oy=1.4; b._ox=2.2; b._oy=-1.6;
  ctx.G.ents=[mac, a, b];
  mac._sepDt=0.05;
  ctx.separateParty(mac);
  const vx=a.x-0.25, vy=a.y-0.55, L=vx*vx+vy*vy;
  let md=Math.hypot(0.25, 0.55);
  if(L>1e-8){
    let t=((0-0.25)*vx+(0-0.55)*vy)/L;
    if(t<0) t=0; else if(t>1) t=1;
    md=Math.hypot(0.25+vx*t, 0.55+vy*t);
  }
  console.log('second chord end '+a.x.toFixed(3)+','+a.y.toFixed(3)+' md '+md.toFixed(3));
  assert(md>0.2, 'the current chord does not cut Macar (md '+md.toFixed(3)+')');
}
secondChordBlocks();

/* Inside 0.2, sideOk must still allow a step that moves away. */
function insideBubbleMayLeave(){
  mark();
  mac.x=0; mac.y=0; mac.fdx=1; mac.fdy=0; mac.moving=0; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=0; mac.name='MACAR';
  const a=makeGhost('pordoom', -0.2, 0, {x:1, y:0});
  const b=makeGhost('fendur', -0.3, -0.3, {x:1, y:0});
  a._ox=a.x; a._oy=a.y; b._ox=b.x; b._oy=b.y;
  ctx.G.ents=[mac, a, b];
  mac._sepDt=0.05;
  ctx.separateParty(mac);
  console.log('inside leave '+a.x.toFixed(3)+','+a.y.toFixed(3));
  assert(a.y>0.05, 'the inside-0.2 check still steps off the chord (y '+a.y.toFixed(3)+')');
}
insideBubbleMayLeave();

/* nudge's axis fallback can land on the far side after a legal aim.
   The post-move check puts the follower back. */
function postMoveCheckReverts(){
  mark();
  const prev=ctx.canBe;
  ctx.canBe=function(x,y){
    if(Math.hypot(x-0.4, y-0.5)<0.02) return true;
    if(y>0.15) return false;
    return x>0;
  };
  mac.x=0; mac.y=0; mac.fdx=1; mac.fdy=0; mac.moving=0; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=0; mac.name='MACAR';
  const a=makeGhost('pordoom', 0.4, 0.5, {x:1, y:0});
  const b=makeGhost('fendur', 0.4, 1.8, {x:1, y:0});
  a._ox=a.x; a._oy=a.y; b._ox=b.x; b._oy=b.y;
  ctx.G.ents=[mac, a, b];
  mac._sepDt=0.05;
  ctx.separateParty(mac);
  const dot=0.4*(a.x)+0.5*(a.y);
  ctx.canBe=prev;
  console.log('post-move '+a.x.toFixed(3)+','+a.y.toFixed(3)+' dot '+dot.toFixed(3));
  assert(dot>0, 'a nudged axis slide is reverted when it crosses (dot '+dot.toFixed(3)+')');
}
postMoveCheckReverts();

/* sameHalf holds, misses is what rejects a chord through the bubble. */
function missesAloneBlocksChord(){
  mark();
  mac.x=0; mac.y=0; mac.fdx=1; mac.fdy=0; mac.moving=0; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=0; mac.name='MACAR';
  const ghost=makeGhost('orbo', 0.5, 0.15, {x:0, y:1});
  ghost._ox=2.4; ghost._oy=0.2;
  const b=makeGhost('fendur', 0.5, 1.7, {x:0, y:1});
  b._ox=2.4; b._oy=1.7;
  ctx.G.ents=[mac, ghost, b];
  mac._sepDt=0.05;
  ctx.separateParty(mac);
  const vx=ghost.x-0.5, vy=ghost.y-0.15, L=vx*vx+vy*vy;
  let md=Math.hypot(0.5, 0.15);
  if(L>1e-8){
    let t=((0-0.5)*vx+(0-0.15)*vy)/L;
    if(t<0) t=0; else if(t>1) t=1;
    md=Math.hypot(0.5+vx*t, 0.15+vy*t);
  }
  console.log('misses chord end '+ghost.x.toFixed(3)+','+ghost.y.toFixed(3)+' md '+md.toFixed(3));
  assert(md>0.2, 'misses keeps the chord out of the 0.2 bubble (md '+md.toFixed(3)+')');
}
missesAloneBlocksChord();

/* Start inside 0.2, and the only opening is the away goal, not a compass
   ray. misses() has to exempt that start or the step never leaves. */
function bubbleExemptionLeaves(){
  mark();
  const prev=ctx.canBe, prevTW=ctx.TW, prevTH=ctx.TH;
  ctx.TW=116; ctx.TH=58;
  ctx.canBe=function(x,y){
    const dx=x-10.05, dy=y-10;
    if(dx*dx+dy*dy<1e-8) return true;
    const ang=Math.atan2(dy, dx);
    return Math.abs(ang-0.4)<0.08 && Math.hypot(dx, dy)<3;
  };
  mac.x=10; mac.y=10; mac.fdx=Math.cos(0.4); mac.fdy=Math.sin(0.4); mac.moving=0; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=0; mac.name='MACAR';
  const ghost=makeGhost('pordoom', 10.05+Math.cos(0.4)*0.12, 10+Math.sin(0.4)*0.12, {x:1, y:0});
  ghost._ox=ghost.x; ghost._oy=ghost.y;
  ctx.G.ents=[mac, ghost];
  const d0=Math.hypot(ghost.x-mac.x, ghost.y-mac.y);
  mac._sepDt=0.05;
  ctx.separateParty(mac);
  const d1=Math.hypot(ghost.x-mac.x, ghost.y-mac.y);
  ctx.canBe=prev; ctx.TW=prevTW; ctx.TH=prevTH;
  console.log('bubble exempt d0 '+d0.toFixed(3)+' d1 '+d1.toFixed(3));
  assert(d0<0.2 && d1>d0+0.02, 'the inside-0.2 goal exemption still steps out (d1 '+d1.toFixed(3)+')');
}
bubbleExemptionLeaves();

/* A spaced follower's steer speed is the leader step, not a full walk. */
function steerSpacedCapHolds(){
  mark();
  mac.x=10; mac.y=10; mac.fdx=1; mac.fdy=0; mac.moving=1; mac.r=0.36; mac.sp=4.3;
  mac._frameStep=0.02; mac.name='MACAR';
  const ghost=makeGhost('fendur', 14, 10.2, {x:1, y:0});
  ghost._ox=ghost.x; ghost._oy=ghost.y;
  ctx.G.ents=[mac, ghost];
  ctx.stepPartyFollower(ghost, {x:18, y:10.2}, 0.38, mac, 0.05);
  const step=Math.hypot(ghost.x-14, ghost.y-10.2);
  console.log('steer spaced step '+step.toFixed(4));
  assert(step<=mac._frameStep*1.05+1e-3, 'a spaced steer stays within 1.05× (step '+step.toFixed(4)+')');
}
steerSpacedCapHolds();

/* Steady walk along a wall. Facing holds across small step jitter. */
function facingHoldsOnSteadyWalk(){
  mark();
  const prev=ctx.canBe, prevMove=ctx.move, prevTW=ctx.TW, prevTH=ctx.TH;
  ctx.canBe=function(x,y,r){ return (y-(r||0))>=8; };
  ctx.move=function(e,dx,dy,dt){
    let nx=e.x+dx*dt, ny=e.y+dy*dt;
    if(!ctx.canBe(nx, ny, e.r)){
      if(ctx.canBe(nx, e.y, e.r)) ny=e.y;
      else if(ctx.canBe(e.x, ny, e.r)) nx=e.x;
      else return 0;
    }
    e.x=nx; e.y=ny; return 1;
  };
  ctx.TW=116; ctx.TH=58;
  const face={x:1, y:0};
  mac.x=20; mac.y=8.5; mac.fdx=face.x; mac.fdy=face.y; mac.moving=1; mac.sp=4.3; mac.r=0.36; mac.name='MACAR';
  const ghost=makeGhost('fendur', 18.2, 8.55, face);
  ctx.G.ents=[mac, ghost];
  function oct(e){
    const sx=(e.fdx||0)-(e.fdy||0), sy=(e.fdx||0)+(e.fdy||0);
    if(!(sx||sy)) return 's';
    const deg=((Math.atan2(sy, sx)*180/Math.PI)+360)%360;
    return ['e','se','s','sw','w','nw','n','ne'][Math.round(deg/45)%8];
  }
  let flips=0, prevOct=oct(ghost);
  const frames=120;
  for(let f=0; f<frames; f++){
    mac.x+=mac.sp*DT; mac.moving=1; mac._frameStep=mac.sp*DT; mac.fdx=1; mac.fdy=0;
    ghost._ox=ghost.x; ghost._oy=ghost.y;
    ctx.stepPartyFollower(ghost, ctx.partyForm(1, mac), 0.38, mac, DT);
    ghost._steerStep=Math.hypot(ghost.x-ghost._ox, ghost.y-ghost._oy);
    mac._sepDt=DT;
    ctx.separateParty(mac);
    const now=oct(ghost);
    if(now!==prevOct){ flips++; prevOct=now; }
  }
  ctx.canBe=prev; ctx.move=prevMove; ctx.TW=prevTW; ctx.TH=prevTH;
  const per=flips/(frames*DT);
  console.log('steady facing flips '+flips+' /s '+per.toFixed(2));
  assert(per<=2, 'steady walking flips at most 2/s (got '+per.toFixed(2)+')');
}
facingHoldsOnSteadyWalk();

/* Seed 0xC0FFEE, 400 trials, dt 0.05, west wall, four followers, 20 frames.
   Trial 179 is the one that used to slide ORBO north through an idle Macar. */
function seededBodyFuzz(){
  mark();
  const prev=ctx.canBe, prevTW=ctx.TW, prevTH=ctx.TH;
  ctx.TW=66; ctx.TH=34;
  ctx.canBe=function(x,y,r){ return (x-(r||0))>=10; };
  let s=0xC0FFEE;
  function rnd(){
    s=(s+0x6D2B79F5)|0;
    let t=Math.imul(s^s>>>15, 1|s);
    t=t+Math.imul(t^t>>>7, 61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  }
  const names=['pordoom','fendur','orbo','talpor'];
  let crosses=0, through=0, trial179=null, sample=null;
  for(let n=0; n<400; n++){
    mac.x=10.4+rnd()*1.2; mac.y=16+rnd()*8;
    mac.fdx=-1; mac.fdy=0; mac.moving=0; mac.r=0.36; mac.sp=4.3; mac._frameStep=0; mac.name='MACAR';
    const crew=names.map(name=>{
      const g=makeGhost(name, mac.x+(rnd()*3.2-1.2), mac.y+(rnd()*4-2), {x:-1, y:0});
      if(g.x<10.36) g.x=10.36;
      return g;
    });
    ctx.G.ents=[mac].concat(crew);
    const log=[];
    for(let f=0; f<20; f++){
      const start=crew.map(e=>({x:e.x, y:e.y}));
      crew.forEach(e=>{ e._ox=e.x; e._oy=e.y; e._steerStep=0; e._slideUx=0; e._slideUy=0; });
      mac.moving=0; mac._frameStep=0; mac._sepDt=0.05;
      ctx.separateParty(mac);
      crew.forEach((e,i)=>{
        const sx=start[i].x, sy=start[i].y;
        const sd=Math.hypot(sx-mac.x, sy-mac.y);
        const dot=(sx-mac.x)*(e.x-mac.x)+(sy-mac.y)*(e.y-mac.y);
        if(sd>0.2 && dot<=0) crosses++;
        const bodies=[{x:mac.x,y:mac.y,r:0.36,sx:mac.x,sy:mac.y}];
        for(let j=0;j<crew.length;j++){
          if(j===i) continue;
          bodies.push({x:crew[j].x,y:crew[j].y,r:0.36,sx:start[j].x,sy:start[j].y});
        }
        bodies.forEach(b=>{
          const d0=Math.hypot(sx-b.sx, sy-b.sy);
          if(d0<=(b.r||0.36)) return;
          function hit(px, py){
            const vx=e.x-sx, vy=e.y-sy, L=vx*vx+vy*vy;
            if(L<1e-8) return Math.hypot(sx-px, sy-py)<=(b.r||0.36)-0.02;
            let t=((px-sx)*vx+(py-sy)*vy)/L;
            if(t<0) t=0; else if(t>1) t=1;
            return Math.hypot(sx+vx*t-px, sy+vy*t-py)<=(b.r||0.36)-0.02;
          }
          if(hit(b.sx, b.sy) && hit(b.x, b.y)){
            through++;
            if(!sample) sample={n:n, f:f, name:e.name, from:[sx,sy], to:[e.x,e.y], body0:[b.sx,b.sy], body1:[b.x,b.y], mac:[mac.x,mac.y], crew:start.map(p=>[p.x,p.y])};
          }
        });
        if(n===179 && e.name==='orbo' && f>=16 && f<=19) log.push(+Math.hypot(e.x-mac.x, e.y-mac.y).toFixed(3));
      });
    }
    if(n===179) trial179=log;
  }
  ctx.canBe=prev; ctx.TW=prevTW; ctx.TH=prevTH;
  console.log('fuzz crosses '+crosses+' through '+through+' trial179 '+JSON.stringify(trial179)+' sample '+JSON.stringify(sample));
  assert(crosses===0, 'seeded 50ms fuzz has no centre crossing ('+crosses+')');
  assert(through===0, 'seeded 50ms fuzz has no body pass-through ('+through+')');
}
seededBodyFuzz();

/* Real-input cases QA replays. Spawn, keys, frame counts, dt, and tile size. */
const PARTY_PROOF_CASES=[
  {name:'straight', dt:1/60, tw:116, th:58, go:[[24,22,500]], hold:[['s','d',200]], rest:50},
  {name:'d-then-diagonal', dt:1/60, tw:116, th:58, go:[[26,20,500]], hold:[['d',30],['s','d',140]], rest:40},
  {name:'s-then-d', dt:1/60, tw:116, th:58, go:[[24,18,500]], hold:[['s',70],['d',110]], rest:40},
  {name:'d-then-wd', dt:1/60, tw:116, th:58, go:[[32,20,700]], hold:[['d',36],['w','d',220]], rest:30},
  {name:'s-then-sd', dt:1/60, tw:116, th:58, go:[[26,22,500]], hold:[['s',60],['s','d',140]], rest:30},
  {name:'wall-s-corner', dt:1/60, tw:116, th:58, go:[[34,28,800],[20,28,800],[18.6,27.2,400]], hold:[['s','a',220]], rest:40},
  {name:'gridW', dt:1/60, tw:116, th:58, go:[[22,20,700],[25.2,14.5,600],[26.2,11,500]], hold:[['w','a',260]], rest:30},
  {name:'gridN', dt:1/60, tw:116, th:58, go:[[29.6,11.2,700]], hold:[['w','d',120],['s','a',60],['w','d',180]], rest:30},
  {name:'idle-stacked', dt:1/60, tw:116, th:58, go:[[25,14.8,700],[20,22,600],[18.6,26.2,500]], hold:[['s','a',200]], rest:80},
  {name:'idleTriple', dt:1/60, tw:116, th:58, go:[[22.5,24,500]], hold:[['s','d',30]], rest:80},
  {name:'double-blocked', dt:1/60, tw:116, th:58, go:[[16.2,26.5,600],[15.5,28.2,400]], hold:[['s','a',140],['a',80]], rest:40},
  {name:'west-pin', dt:1/60, tw:116, th:58, go:[[22,18,700],[25.6,13.2,600],[26.4,10.8,400]], hold:[['w','a',240]], rest:0},
  {name:'west-walk', dt:1/60, tw:116, th:58, go:[], hold:[['w','a',90]], rest:0},
  {name:'west-rest', dt:1/60, tw:116, th:58, go:[], hold:[], rest:90},
  {name:'se-corner', dt:1/60, tw:116, th:58, go:[[40,11.2,900],[42,30,900],[50.2,33.2,700]], hold:[['s',120]], rest:40},
  {name:'reverse-turn', dt:1/60, tw:116, th:58, go:[[42,22,800]], hold:[['s','d',50],['w','a',36]], rest:70},
  {name:'wall-hold', dt:1/60, tw:116, th:58, go:[[36,12,800],[32,9.4,500]], hold:[['w','d',90],['w','d',140]], rest:20}
];
function proofCatalog(){
  mark();
  const names=PARTY_PROOF_CASES.map(c=>c.name);
  const need=['straight','d-then-diagonal','s-then-d','d-then-wd','s-then-sd','wall-s-corner','gridW','gridN','idle-stacked','idleTriple','double-blocked','west-pin','west-walk','west-rest','se-corner','reverse-turn','wall-hold'];
  need.forEach(n=>assert(names.indexOf(n)>=0, 'proof catalog has '+n));
  PARTY_PROOF_CASES.forEach(c=>{
    assert(c.dt>0 && c.tw>0 && c.th>0, c.name+' names dt and tile size');
    assert(Array.isArray(c.hold) && Array.isArray(c.go), c.name+' names the key sequence');
  });
  assert(PARTY_PROOF_CASES.length===17, 'proof catalog covers the reported cases');
}
proofCatalog();

if(failed){
  console.log('COUNTS cases='+cases+' asserts='+asserts);
  console.error(failed+' failed');
  process.exit(1);
}
console.log('ghost settle idle ok');
console.log('COUNTS cases='+cases+' asserts='+asserts);

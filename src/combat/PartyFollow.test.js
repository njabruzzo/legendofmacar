'use strict';
const assert=require('assert'), fs=require('fs'), vm=require('vm');
const Follow=require('./PartyFollow');
const html=fs.readFileSync(require('path').join(__dirname,'../../index.html'),'utf8');
const fn=name=>html.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}'))[0];
const length=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function entity(x,y,hero=false){return {x,y,hero,team:'party',r:.36,sp:4.3,fdx:1,fdy:0,gait:0,moving:0};}
let assertions=0, cases=0;
function check(value,message){assertions++;assert(value,message);}
// Sweep enters a disk and exits on its far side: endpoints alone are safe.
{
 cases++; const p=entity(0,0,true), e=entity(-3,0);
 const hit=Follow.limit(e,e,{x:3,y:0},[p,e]);
 check(hit.x<-2.149999,'sweep cannot pass through the leader');
 const overlap=entity(-1,0);
 check(Follow.limit(overlap,overlap,{x:-.5,y:0},[p]).x===-1,'existing overlap cannot deepen');
 check(Follow.limit(overlap,overlap,{x:-1.1,y:0},[p]).x===-1.1,'existing overlap may escape');
}
for(const dt of [1/60,.05,.1]) for(const wall of ['open','north','west','corner']){
 cases++;
 const valid=(x,y,r)=> (wall!=='north'&&wall!=='corner'||y-r>=0) && (wall!=='west'&&wall!=='corner'||x-r>=0);
 const p=entity(4,4,true), kin=[entity(6.2,4),entity(4,6.2),entity(7,7),entity(1,7)];
 const bodies=[p,...kin];
 let moved=0, blocked=0;
 for(let frame=0;frame<800;frame++){
  const before=bodies.map(e=>({x:e.x,y:e.y}));
  const phase=Math.floor(frame/100)%8, a=phase*Math.PI/4;
  p.moving=frame<650?1:0; p.fdx=Math.cos(a);p.fdy=Math.sin(a);
  const target={x:p.x+p.fdx*p.sp*dt*p.moving,y:p.y+p.fdy*p.sp*dt*p.moving};
  const allowed=valid(target.x,target.y,p.r)?Follow.limit(p,p,target,bodies):{x:p.x,y:p.y};
  p._partyBlocked=length(allowed,target)>.0001 && valid(target.x,target.y,p.r);
  if(p._partyBlocked)blocked++;
  p.x=allowed.x;p.y=allowed.y;
  for(let i=0;i<kin.length;i++){
   const e=kin[i];e._followX=before[i+1].x;e._followY=before[i+1].y;
   const d=length(e,p), stride=Math.min(e.sp*dt,Math.max(0,d-(2.5+i*.3)))*p.moving;
   const goal={x:e.x+(p.x-e.x)/d*stride,y:e.y+(p.y-e.y)/d*stride};
   const step=Follow.limit(e,e,goal,bodies);
   if(valid(step.x,step.y,e.r)){e.x=step.x;e.y=step.y;}
  }
  Follow.separate(p,bodies,dt,valid);
  for(let i=0;i<bodies.length;i++){
   check(valid(bodies[i].x,bodies[i].y,bodies[i].r),wall+' stays off rock');
   for(let j=i+1;j<bodies.length;j++) check(length(bodies[i],bodies[j])>=Follow[i===0?'LEAD':'KIN']-1e-6,wall+' dt '+dt+' frame '+frame+' maintains pair spacing');
   if(i>0){
    check(length(bodies[i],before[i])<=bodies[i].sp*dt+1e-6,'steer plus separate stays in one stride');
    const d=length(bodies[i],before[i]);if(d>.002)moved++;
   }
  }
  if(frame>650)for(let i=1;i<bodies.length;i++)check(length(bodies[i],before[i])<1e-8,'clear followers settle without drift');
 }
 check(moved>0,'followers follow through turns');
 console.log(wall+' dt='+dt+' bounded movement='+moved+' blocked leader frames='+blocked);
}
// Exactly pinned on a wall, with Macar trying to enter it: preserve the gap
// immediately, then gain tangent clearance. This is the 50ms PR failure.
for(const axis of ['x','y'])for(const dt of [1/60,.05]){
 cases++; const p=entity(axis==='x'?2.51:8,axis==='y'?2.51:8,true);
 const e=entity(axis==='x'?.36:8,axis==='y'?.36:8);
 const bodies=[p,e], valid=(x,y,r)=>(axis==='x'?x:y)-r>=-1e-8;
 let tangent=0;
 for(let f=0;f<80;f++){
  const start={x:e.x,y:e.y};e._followX=e.x;e._followY=e.y;
  p.moving=1;const target={x:p.x-(axis==='x'?p.sp*dt:0),y:p.y-(axis==='y'?p.sp*dt:0)};
  const step=Follow.limit(p,p,target,bodies);p._partyBlocked=length(step,target)>.0001;p.x=step.x;p.y=step.y;
  Follow.separate(p,bodies,dt,valid);
  check(length(e,p)>=Follow.LEAD-1e-6,'pinned '+axis+' follower never compresses at '+dt);
  check(valid(e.x,e.y,e.r),'pinned follower stays off wall');
  tangent+=Math.abs(axis==='x'?e.y-start.y:e.x-start.x);
 }
 check(tangent>.1,'pinned '+axis+' follower escapes along wall');
}
// Party spacing cannot lock the controlled leader behind a follower.
{
 cases++;const p=entity(0,0,true),e=entity(2.15,0),ctx={PartyFollow:Follow,G:{ents:[p,e]},foeInTheFight:()=>false,Math};
 vm.createContext(ctx);vm.runInContext(fn('constrainPartyStep'),ctx);
 p.x=.1;ctx.constrainPartyStep(p,0,0);
 check(p.x===.1&&!p._partyBlocked,'controlled leader retains its terrain-valid stride');
 ctx.constrainPartyStep(p,0,0);
 check(p.x===.1&&!p._partyBlocked,'arrival guard does not reintroduce follower blocking');
}
// Recover pre-existing stacks without deepening any pair or swapping sides.
for(const dt of [1/60,.05]){
 cases++;const p=entity(10,10,true),a=entity(10.05,10.02),b=entity(10.08,10.04);
 const bodies=[p,a,b];
 for(let f=0;f<180;f++){
  const before=bodies.map(e=>({x:e.x,y:e.y}));
  const gaps=[[0,1],[0,2],[1,2]].map(([i,j])=>length(bodies[i],bodies[j]));
  for(const e of [a,b]){e._followX=e.x;e._followY=e.y;}
  Follow.separate(p,bodies,dt,()=>true);
  [[0,1],[0,2],[1,2]].forEach(([i,j],k)=>check(length(bodies[i],bodies[j])+1e-7>=Math.min(gaps[k],Follow[i===0?'LEAD':'KIN']),'stack pair never deepens'));
  for(let i=1;i<bodies.length;i++){
   const e=bodies[i],s=before[i];
   if(length(s,p)>.2)check((s.x-p.x)*(e.x-p.x)+(s.y-p.y)*(e.y-p.y)>0,'stack correction preserves side');
  }
 }
 check(length(a,p)>2.14&&length(b,p)>2.14&&length(a,b)>2.04,'stack recovers full spacing');
}
{
 cases++;const p=entity(0,0,true),e=entity(1,0);e.webbed=1;
 Follow.separate(p,[p,e],.05,()=>true);
 check(e.x===1&&e.y===0,'webbed follower does not acquire separation locomotion');
}
// Production integration: stillness clears held walk, gait advances once,
// and leader/follower movement both traverse the swept guard.
{
 cases++;const p=entity(10,10,true),e=entity(13,10);const ctx={WALK_CYCLES_PER_SECOND:1.675,PartyFollow:Follow,G:{ents:[p,e]},canBe:()=>true,holdFollowWalk:()=>{},Math};
 vm.createContext(ctx);vm.runInContext(fn('separateParty'),ctx);
 p._followDt=.05;p._frameStep=0;e._followX=e.x;e._followY=e.y;e._followGait=2;e.gait=3;e.moving=1;e._followWalkHold=99;
 ctx.separateParty(p);
 check(e.moving===0 && e._followWalkHold===0 && e.gait===2,'wall/idle settles sheet and gait immediately');
 p._followDt=.05;p._frameStep=.1;p.moving=1;e._followX=e.x-.1;e._followY=e.y;e._followGait=2;
 ctx.separateParty(p);check(Math.abs(e.gait-(2+.05*1.675))<1e-9,'gait advances once per moved frame');
 check(fn('steerWalk').includes('constrainPartyStep(e, ox, oy)'), 'plain/nav/rejoin steering calls swept guard');
 check(html.includes('constrainPartyStep(p, leadX, leadY)'), 'arrival snap also calls leader guard');
}
console.log('COUNTS cases='+cases+' asserts='+assertions);

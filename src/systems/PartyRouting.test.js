'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const Follow=require('../combat/PartyFollow');
require('../vendor/rotjs/rot-path');require('./Navigation');
const Nav=globalThis.Navigation;
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const fn=n=>html.match(new RegExp('function '+n+'\\([\\s\\S]*?\\n\\}'))[0];
let checks=0;
const check=(v,m)=>{checks++;assert(v,m);};
function setup(){
 const grid=Array.from({length:24},(_,y)=>Array.from({length:30},(_,x)=>x===0||y===0||x===29||y===23?1:0));
 const p={hero:1,team:'party',kind:'dwarf',col:{key:'macar'},x:6,y:6,r:.36,sp:4.3,fdx:1,fdy:0,gait:0};
 const ctx={Math,PartyFollow:Follow,G:{lvl:{grid,w:30,h:24},ents:[p]},WALL_FACE_CLEAR:.72,TAU:Math.PI*2,
  startCaveInBlocks:()=>false,foeInTheFight:()=>false,player:()=>p,wornMoveMul:()=>1};
 vm.createContext(ctx);
 vm.runInContext(['walk','needsWallFaceClear','wallFaceClear','canBe','moveStep','move','bestSlide','turnToward','gaitAdvance','constrainPartyStep','steerWalk','routeSteerWalk'].map(fn).join('\n'),ctx);
 Nav.invalidate();return {ctx,p,grid};
}
for(const dt of [1/60,.05])for(const mul of [1,2]){
 const {ctx,p,grid}=setup();ctx.wornMoveMul=()=>mul;
 for(let y=3;y<13;y++)grid[y][12]=1;
 const goal={x:17,y:6},host={canBe:ctx.canBe,steerWalk:ctx.routeSteerWalk,arriveRadius:.26,levelId:'corner'};
 for(let f=0;f<Math.ceil(12/dt)&&Math.hypot(p.x-goal.x,p.y-goal.y)>.26;f++){
  const before={x:p.x,y:p.y};Nav.tickRoute(p,goal,dt,host);
  check(ctx.canBe(p.x,p.y,p.r,p),'route remains on standable terrain');
  check(Math.hypot(p.x-before.x,p.y-before.y)<=p.sp*mul*dt+1e-7,'speed boots and long frames never overshoot a route stride');
 }
 check(Math.hypot(p.x-goal.x,p.y-goal.y)<.27,'route goes around barrier at dt='+dt+' multiplier='+mul);
 const waypoint={x:p.x+.02,y:p.y};ctx.routeSteerWalk(p,.02,0,p.sp,dt);
 check(Math.abs(p.x-waypoint.x)<1e-8,'last short waypoint is reached exactly');
}
for(const axis of ['x','y']){
 const {ctx,p,grid}=setup();
 for(let y=1;y<23;y++)for(let x=1;x<29;x++)grid[y][x]=(axis==='x'?y===8:x===8)?0:1;
 p.x=axis==='x'?6:8.5;p.y=axis==='y'?6:8.5;
 check(ctx.canBe(p.x,p.y,p.r,p),'one-cell '+axis+' passage retains a walkable center');
 const ghost={hero:0,ghost:1,team:'party',x:p.x+(axis==='x'?2.2:0),y:p.y+(axis==='y'?2.2:0),r:.36};ctx.G.ents.push(ghost);
 const goal={x:p.x+(axis==='x'?6:0),y:p.y+(axis==='y'?6:0)};
 for(let f=0;f<80&&Math.hypot(p.x-goal.x,p.y-goal.y)>.26;f++)Nav.tickRoute(p,goal,.05,{canBe:ctx.canBe,steerWalk:ctx.routeSteerWalk,arriveRadius:.26});
 check(Math.hypot(p.x-goal.x,p.y-goal.y)<.27,'parked ghost cannot lock Macar in a one-cell '+axis+' passage');
}
{
 const {ctx,p,grid}=setup();for(let y=0;y<24;y++)grid[y][12]=1;
 const host={canBe:ctx.canBe,steerWalk:()=>{throw new Error('unreachable route must wait');},levelId:'sealed',maxExpand:500};
 const first=Nav.tickRoute(p,{x:17,y:6},.01,host);
 check(first.waiting,'sealed goal waits without moving');
 const retry=Nav.tickRoute(p,{x:17,y:6},.01,host);
 check(retry.reason==='retry-wait','failed routes back off instead of searching every frame');
}
// A connected one-tile elbow must stay traversable in every orientation.
for(const dt of [1/60,.05])for(const sx of [-1,1])for(const sy of [-1,1]){
 const {ctx,p,grid}=setup();for(const row of grid)row.fill(1);
 const bend={x:14,y:12};
 for(let i=0;i<=6;i++){grid[bend.y][bend.x-sx*i]=0;grid[bend.y+sy*i][bend.x]=0;}
 p.x=bend.x-sx*5+.5;p.y=bend.y+.5;
 const goal={x:bend.x+.5,y:bend.y+sy*5+.5};
 for(let i=0;i<Math.ceil(8/dt)&&Math.hypot(p.x-goal.x,p.y-goal.y)>.26;i++)Nav.tickRoute(p,goal,dt,{canBe:ctx.canBe,steerWalk:ctx.routeSteerWalk,arriveRadius:.26});
 check(Math.hypot(p.x-goal.x,p.y-goal.y)<.27,'connected elbow traversable sx='+sx+' sy='+sy+' dt='+dt);
}
for(const axis of ['x','y'])for(const offset of [.40,.60])for(const sign of [-1,1])for(const dt of [1/60,.05]){
 const {ctx,p,grid}=setup();for(let y=1;y<23;y++)for(let x=1;x<29;x++)grid[y][x]=(axis==='x'?y===8:x===8)?0:1;
 p.x=axis==='x'?14:8+offset;p.y=axis==='y'?12:8+offset;
 const old={x:p.x,y:p.y};ctx.steerWalk(p,axis==='x'?sign:0,axis==='y'?sign:0,p.sp,dt);
 check(Math.hypot(p.x-old.x,p.y-old.y)>.01,'off-center manual stride '+axis+' offset='+offset+' sign='+sign+' dt='+dt);
 check(ctx.canBe(p.x,p.y,p.r,p),'off-center stride respects collision');
}
console.log('Party route regressions passed: '+checks+' checks');

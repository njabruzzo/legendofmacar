'use strict';
const assert=require('assert'),Rig=require('./IdleWalkRig');
for(const view of ['front','rear','diagonal']){
 let previous=null;
 for(let i=0;i<=600;i++){
  const time=i/600,pose=Rig.pose(view,time);
  for(let leg=0;leg<2;leg++){
   const source=Rig.configs[view].legs[leg],live=pose.legs[leg];
   assert(Math.abs(Rig.length(live.hip,live.knee)-Rig.length(source.hip,source.knee))<1e-8,'constant thigh length');
   assert(Math.abs(Rig.length(live.knee,live.ankle)-Rig.length(source.knee,source.ankle))<1e-8,'constant calf length');
   if(previous)assert(Rig.length(previous.legs[leg].ankle,live.ankle)<1,'continuous foot trajectory');
  }
  previous=pose;
 }
 // Opposite half cycles exchange which foot is ahead relative to its idle seat.
 const a=Rig.pose(view,0),b=Rig.pose(view,1/3),cfg=Rig.configs[view];
 assert(a.legs[0].ankle[0]-cfg.legs[0].ankle[0]>0&&b.legs[0].ankle[0]-cfg.legs[0].ankle[0]<0);
 assert(a.legs[1].ankle[0]-cfg.legs[1].ankle[0]<0&&b.legs[1].ankle[0]-cfg.legs[1].ankle[0]>0);
 const scales=[],draws=[];const ctx={save(){},restore(){},translate(){},rotate(){},scale(...v){scales.push(v)},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){},drawImage(...v){draws.push(v)}};
 Rig.draw(ctx,{},view,false,.25);
 assert.deepEqual(scales,[[.6,.6]],'only one shared display scale, never stretch a limb or boot');
 assert(draws.every(v=>v.length===3),'source art is rendered at original proportions');
}
console.log('Fixed thigh/calf lengths, opposite steps, continuous trajectories and rigid boot rendering passed');

for(const t of [0,.1,.2,.3])assert.equal(Rig.step(t).lift,0,'stance keeps foot on ground');
assert(Rig.step(.52).lift>6,'swing lifts returning foot');
assert.deepEqual(Rig.step(0),Rig.step(2/3),'cycle closes without a jump');

// Check a whole cycle at both normal and long frame intervals.
for(const dt of [1/60,.05]){
 let last=Rig.pose('front',0);
 for(let t=dt;t<2;t+=dt){
  const current=Rig.pose('front',t);
  for(let i=0;i<2;i++)assert(Rig.length(last.legs[i].ankle,current.legs[i].ankle)<420*dt,'foot displacement stays within continuous stride speed bound');
  last=current;
 }
}
for(let i=0;i<2;i++){
 const cfg=Rig.configs.front.legs[i];
 const a=Rig.pose('front',0).legs[i].ankle[0]-cfg.ankle[0];
 const b=Rig.pose('front',1/3).legs[i].ankle[0]-cfg.ankle[0];
 assert(a*b<0,'each foot changes leading/trailing position');
}

// Toe-off and contact meet with zero velocity, avoiding an abrupt leg jerk.
for(const boundary of [0,.4,2/3]){
 const epsilon=1e-5;
 const before=Rig.step(boundary-epsilon),at=Rig.step(boundary),after=Rig.step(boundary+epsilon);
 assert(Math.abs((at.travel-before.travel)/epsilon-(after.travel-at.travel)/epsilon)<.2,'smooth contact velocity');
 assert(Math.abs((at.lift-before.lift)/epsilon-(after.lift-at.lift)/epsilon)<.2,'smooth lift velocity');
}

'use strict';
const assert=require('assert'),Rig=require('./IdleWalkRig');
for(const view of ['front','rear']){
 let previous=null;
 for(let i=0;i<=600;i++){
  const time=i/600,pose=Rig.pose(view,time);
  for(let leg=0;leg<2;leg++){
   const source=Rig.configs[view].legs[leg],live=pose.legs[leg];
   assert(Math.abs(Rig.length(live.hip,live.knee)-Rig.length(source.hip,source.knee))<1e-8,'constant thigh length');
   assert(Math.abs(Rig.length(live.knee,live.ankle)-Rig.length(source.knee,source.ankle))<1e-8,'constant calf length');
   if(previous)assert(Rig.length(previous.legs[leg].ankle,live.ankle)<.5,'continuous foot trajectory');
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

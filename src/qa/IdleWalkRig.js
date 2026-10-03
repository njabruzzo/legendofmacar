(function(root){
 // All parts retain the idle pixels and one shared display scale. Joint
 // transforms rotate/translate parts; no phase can stretch a leg or boot.
 const configs={
  front:{center:239,ground:500,legs:[
   {hip:[195,350],knee:[195,380],ankle:[195,454],thigh:[[157,343],[245,343],[245,385],[155,385]],calf:[[156,375],[245,375],[245,450],[155,450]],boot:[[150,445],[250,445],[250,505],[148,505]]},
   {hip:[329,350],knee:[329,380],ankle:[329,454],thigh:[[273,343],[371,343],[371,385],[272,385]],calf:[[273,375],[374,375],[374,450],[272,450]],boot:[[267,445],[386,445],[386,505],[266,505]]}
  ],body:[[0,0],[512,0],[512,350],[372,350],[372,372],[273,372],[273,353],[245,353],[245,372],[147,372],[147,390],[0,390]]},
  rear:{center:288,ground:500,legs:[
   {hip:[208,350],knee:[208,380],ankle:[208,456],thigh:[[161,340],[254,340],[254,385],[160,385]],calf:[[160,375],[254,375],[254,450],[159,450]],boot:[[151,445],[264,445],[264,507],[150,507]]},
   {hip:[315,350],knee:[315,380],ankle:[315,456],thigh:[[268,340],[371,340],[371,385],[267,385]],calf:[[267,375],[372,375],[372,450],[266,450]],boot:[[263,445],[387,445],[387,507],[262,507]]}
  ],body:[[0,0],[512,0],[512,352],[379,352],[379,366],[340,366],[315,393],[280,408],[240,398],[198,368],[151,368],[151,376],[0,376]]}
 };
 const length=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
 function solve(hip,foot,l1,l2){
  let dx=foot[0]-hip[0],dy=foot[1]-hip[1],d=Math.hypot(dx,dy);const limited=Math.min(l1+l2-.1,Math.max(Math.abs(l1-l2)+.1,d));
  dx*=limited/d;dy*=limited/d;d=limited;
  const a=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-a*a));
  return{hip,knee:[hip[0]+dx/d*a+dy/d*h,hip[1]+dy/d*a-dx/d*h],ankle:[hip[0]+dx,hip[1]+dy]};
 }
 // Reference: AUTeddy Walking_8dir_merged.gif. Stance carries the planted
 // foot backwards; swing bends the knee and returns it forwards.
 function step(time){
  const cycle=((time*1.5)%1+1)%1;
  if(cycle<.6)return{travel:24-48*cycle/.6,lift:0,roll:0};
  const swing=(cycle-.6)/.4,smooth=swing*swing*(3-2*swing);
  return{travel:-24+48*smooth,lift:12*Math.sin(Math.PI*swing)**2,roll:-.09*Math.sin(Math.PI*swing)**2};
 }
 function pose(view,time){
  const cfg=configs[view],phase=time*Math.PI*3,bob=1.5*Math.cos(2*phase),shift=1.2*Math.cos(phase);
  return{body:[shift,bob+13],lean:0,legs:cfg.legs.map((leg,i)=>{
   const motion=step(time+i/3),travel=motion.travel,lift=motion.lift;
   const hip=[leg.hip[0]+shift,leg.hip[1]+13+bob];
   const foot=[leg.ankle[0]+travel,leg.ankle[1]+travel*(view==='front'?.5:-.5)-lift];
   return{...solve(hip,foot,length(leg.hip,leg.knee),length(leg.knee,leg.ankle)),bootAngle:motion.roll};
  })};
 }
 function part(g,image,poly,pivot,target,angle){
  g.save();g.translate(target[0],target[1]);g.rotate(angle);g.translate(-pivot[0],-pivot[1]);
  g.beginPath();poly.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.clip();g.drawImage(image,0,0);g.restore();
 }
 function angle(a,b){return Math.atan2(b[1]-a[1],b[0]-a[0]);}
 function draw(g,image,view,flip,time,scale=.6){
  const cfg=configs[view],p=pose(view,time);g.save();g.translate(180,306);g.scale(flip?-scale:scale,scale);g.translate(-cfg.center,-cfg.ground);
  cfg.legs.forEach((leg,i)=>{const live=p.legs[i];
   part(g,image,leg.thigh,leg.hip,live.hip,angle(live.hip,live.knee)-angle(leg.hip,leg.knee));
   part(g,image,leg.calf,leg.knee,live.knee,angle(live.knee,live.ankle)-angle(leg.knee,leg.ankle));
   part(g,image,leg.boot,leg.ankle,live.ankle,live.bootAngle);
  });
  part(g,image,cfg.body,[260,350],[260+p.body[0],350+p.body[1]],p.lean);g.restore();
 }
 const api={configs,step,pose,draw,length};root.IdleWalkRig=api;if(typeof module==='object')module.exports=api;
})(globalThis);

(function(root){
 'use strict';
 /* Generic 8-direction monster sheets. Later critters and humanoids reuse
    the same plan: five painted facings, mirror w/sw/nw, per-facing walk
    length, a declared foot x and baseline, frame-locked bob, and a
    per-sprite painted-left flag. A bound plan never reads e.kind.
    Thin One PAINT v4f (Nick: Good). Canvas 512×416, lowest opaque row 399,
    planted foot / body centre at x = 256. Scale 2.065 is
    STRUCTURE_PASS_L1_L2.md line 40: "Bind e.scale = 2.065 (from 1.45) at base 70."
    Walk timing base is the LPC universal cycle: 4 frames × 149 ms.
    DwarfWalkLegs is not applied. These keys are painted; legShift stays off. */
 const FRAME_MS=149;
 const BASE_HZ=1.675;
 const SLIDE_LIMIT=0.25;
 const CONTACT_T=0.45;
 const RECOVER_T=0.72;
 const WALK4=['w1','pass_a','w2','pass_b'];
 const WALK2=['w1','w2'];
 const ATTACK3=['atk','atk_contact','atk_recover'];
 const VIEW={e:'e',se:'se',s:'s',ne:'ne',n:'back',w:'e',sw:'se',nw:'ne'};
 /* East body cell of macar-body-v1.png (row of the side view, idle column):
    foot-centre spread about 57 px inside the 229 px cell. Prereq 6 scales
    Macar's gait with the same 25% plant rule as a bound monster. */
 const MACAR={strideSrc:57,canvasH:229,spriteH:78};
 const plans={
  thinone:{
   sprite:'thinone',
   filePrefix:'mon_thinone',
   facings:['s','se','e','ne','back'],
   walkFrames:{s:4,se:4,e:4,ne:4,back:4},
   attack:3,
   paintedLeft:false,
   legShift:false,
   magentaCleanup:false,
   footX:256,
   canvasW:512,
   canvasH:416,
   baselineRow:399,
   scale:2.065,
   /* Minimum profile foot-centre spread on the v4f stride frames (se_w1). */
   strideSrc:45
  }
 };
 function plan(sprite){return plans[sprite]||null;}
 function bound(sprite){return !!plans[sprite];}
 function planFor(e){
  if(!e||!e.sprite)return null;
  return plans[e.sprite]||null;
 }
 function paintedView(oct){return VIEW[oct]||'s';}
 function flips(oct){return oct==='w'||oct==='sw'||oct==='nw';}
 function paintedLeft(sprite){
  const p=plans[sprite];
  return !!(p&&p.paintedLeft);
 }
 function walkCount(p,oct){
  if(!p)return 4;
  const view=paintedView(oct);
  const n=p.walkFrames&&p.walkFrames[view];
  return n||4;
 }
 function walkPoses(count){
  if((count||0)>=4)return WALK4;
  if(count===2)return WALK2;
  return ['w1'];
 }
 function frameIndex(gait,count){
  const n=count||4;
  const phase=((((gait||0)%1)+1)%1);
  return Math.floor(phase*n)%n;
 }
 function frameHoldMs(mul){
  const m=(mul>0)?mul:1;
  return FRAME_MS/m;
 }
 function attackPose(t){
  if(t<CONTACT_T)return 'atk';
  if(t<RECOVER_T)return 'atk_contact';
  return 'atk_recover';
 }
 function select(stem,e,oct){
  const p=plans[stem];
  if(!p||!e)return null;
  if(e.dead||e.crushed)return stem+'_dead';
  const view=paintedView(oct||'s');
  if(e.atk>0&&e.atkKind!=='bow'){
   const t=1-e.atk/Math.max(0.01,e.atkMax||0.42);
   return stem+'_'+view+'_'+attackPose(t);
  }
  if(e.defending||!e.moving)return stem+'_'+view+'_idle';
  const n=walkCount(p,oct);
  const pose=walkPoses(n)[frameIndex(e.gait,n)];
  return stem+'_'+view+'_'+pose;
 }
 function anchor(p){
  if(!p)return null;
  const footX=(p.footX!=null?p.footX:(p.canvasW/2))/p.canvasW;
  const baselineFrac=(p.baselineRow+1)/p.canvasH;
  return {footX:footX,baselineFrac:baselineFrac,baselineRow:p.baselineRow,canvasH:p.canvasH,canvasW:p.canvasW};
 }
 /* Screen y of the declared baseline's bottom edge. drawH is the on-screen
    canvas height. Every key that shares baselineRow lands on this same y. */
 function baselineScreenY(drawH,p){
  const a=anchor(p);
  if(!a)return 0;
  const dy=-drawH*a.baselineFrac;
  return dy+drawH*a.baselineFrac;
 }
 function bob(gait,count,z){
  const n=count||4;
  const i=frameIndex(gait,n);
  const pass=n>=4&&(i%2===1);
  return pass?1.6*(z||0):0;
 }
 function screenEastPxPerSec(sp,tw){
  return (sp||0)*(tw||0)/Math.SQRT2;
 }
 function cadenceMul(opts){
  opts=opts||{};
  const canvasH=opts.canvasH||1;
  const stride=(opts.strideSrc||0)*((opts.drawH||0)/canvasH);
  if(!(stride>0))return 1;
  const travel=screenEastPxPerSec(opts.sp,opts.tw)*((opts.frameMs||FRAME_MS)/1000);
  const limit=stride*SLIDE_LIMIT;
  if(!(limit>0)||travel<=limit)return 1;
  return travel/limit;
 }
 function plantedSlideFrac(opts,mul){
  opts=opts||{};
  const canvasH=opts.canvasH||1;
  const stride=(opts.strideSrc||0)*((opts.drawH||0)/canvasH);
  if(!(stride>0))return 0;
  const m=(mul>0)?mul:1;
  const travel=screenEastPxPerSec(opts.sp,opts.tw)*((opts.frameMs||FRAME_MS)/1000)/m;
  return travel/stride;
 }
 function keys(stem){
  const p=plans[stem];
  if(!p)return [];
  const out=[stem+'_dead'];
  p.facings.forEach(function(view){
   out.push(stem+'_'+view+'_idle');
   walkPoses(p.walkFrames[view]||4).forEach(function(pose){out.push(stem+'_'+view+'_'+pose);});
   const atk=p.attack>=3?ATTACK3:['atk','atk_contact'];
   atk.forEach(function(pose){out.push(stem+'_'+view+'_'+pose);});
  });
  return out;
 }
 function register(files){
  if(!files)return files;
  Object.keys(plans).forEach(function(stem){
   const p=plans[stem];
   const prefix='assets/creatures/'+p.filePrefix;
   keys(stem).forEach(function(key){
    const tail=key.slice(stem.length);
    files[key]=prefix+tail+'.png';
   });
  });
  return files;
 }
 const api={
  FRAME_MS:FRAME_MS,BASE_HZ:BASE_HZ,SLIDE_LIMIT:SLIDE_LIMIT,
  CONTACT_T:CONTACT_T,RECOVER_T:RECOVER_T,MACAR:MACAR,plans:plans,
  plan:plan,bound:bound,planFor:planFor,paintedView:paintedView,flips:flips,
  paintedLeft:paintedLeft,walkCount:walkCount,walkPoses:walkPoses,
  frameIndex:frameIndex,frameHoldMs:frameHoldMs,attackPose:attackPose,
  select:select,anchor:anchor,baselineScreenY:baselineScreenY,bob:bob,
  screenEastPxPerSec:screenEastPxPerSec,cadenceMul:cadenceMul,
  plantedSlideFrac:plantedSlideFrac,keys:keys,register:register
 };
 root.Monster8Dir=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);

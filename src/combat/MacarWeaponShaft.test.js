'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const Shaft=require('./MacarWeaponShaft'),Idle=require('./MacarIdleAtlas'),Motion=require('./MacarMotionAtlas'),{readRgba}=require('../qa/pngRgba');
const root=path.join(__dirname,'../..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const bindings=vm.runInNewContext('('+html.match(/const MACAR_ONMODEL=(\{[\s\S]*?\n\});/)[1]+')');
Idle.register(bindings);Motion.register(bindings);Shaft.register(bindings);
let poses=0,samples=0;const pngs=new Map();
for(const [key,file] of Object.entries(bindings)){
 const p=Shaft.pose(key);if(key.startsWith('macar_xbow')){assert.equal(p,null);continue;}
 assert(p,key+' has calibrated geometry; a future weapon pose cannot silently bypass the lock');poses++;
 const png=pngs.get(file)||readRgba(path.join(root,file));pngs.set(file,png);
 let w=png.w,h=png.h,sourcePoint=a=>[a[0]*w,a[1]*h];
 if(Motion.pose(key)){
  const calls=[],canvas={getContext:()=>({drawImage:(...args)=>calls.push(args)})};
  Motion.slice({width:png.w,height:png.h},key,{createElement:()=>canvas});w=h=512;
  const [,sx,sy,sw,sh,dx,dy,dw,dh]=calls[0];sourcePoint=a=>[sx+(a[0]*512-dx)*sw/dw,sy+(a[1]*512-dy)*sh/dh];
 }else if(Idle.pose(key)&&!Shaft.standalone(key)){
  const cell=Idle.pose(key).cell,standalone=Idle.standalone[key];w=h=512;
  sourcePoint=standalone?a=>[a[0]*png.w,a[1]*png.h]:a=>[(cell[0]+a[0])*png.w/3,(cell[1]+a[1])*png.h/2];
 }
 for(const [i,a] of p.shaft.entries()){
  const [x,y]=sourcePoint(a);let painted=0;
  for(let yy=Math.round(y)-5;yy<=Math.round(y)+5;yy++)for(let xx=Math.round(x)-5;xx<=Math.round(x)+5;xx++)
   if(xx>=0&&yy>=0&&xx<png.w&&yy<png.h&&png.data[(yy*png.w+xx)*4+3]>40)painted++;
  assert(painted>10,key+' shaft endpoint '+i+' samples actual shipped paint');samples++;
 }
 const image={width:w,height:h};Shaft.prepare(image,key);
 assert(image.__macarIdleSeat&&image._stature>.45,key+' calibrated crown and stature');
 for(const entityH of [54.6,78,187.2])for(const flip of [false,true]){
  const H=entityH*Shaft.fit(key,image),W=H*w/h,dx=-W*(flip?1-p.foot[0]:p.foot[0]),dy=-H*p.foot[1];
  const points=p.shaft.map(a=>[dx+W*(flip?1-a[0]:a[0]),dy+H*a[1]]);
  const distance=Math.hypot(points[1][0]-points[0][0],points[1][1]-points[0][1]);
  assert(Math.abs(distance-entityH*Shaft.target[p.weapon])<1e-8,key+' mirrored/render-scale shaft lock');
  assert(Math.abs((dy+H*p.foot[1]))<1e-8,'boot seat remains on world floor');
 }
}
assert(poses>=39,'all runtime maul and axe keys are covered');
assert.equal(Shaft.pose('macar_xbow_atk'),null,'other weapons retain their established renderer');
assert(Motion.pose('macar_axe_w1')&&Motion.pose('macar_axe_w2'),'cold axe pairs decode complete axe cells, not old overlay images');
assert(bindings.macar_atk.endsWith('/maul_attack_e.png')&&bindings.macar_atk_contact===bindings.macar_atk,'windup/contact share their calibrated source');
assert(Shaft.standalone('macar_idle_n')&&Shaft.standalone('macar_axe_idle_n'),'north stands decode the whole single-pose source');
const fn=n=>html.match(new RegExp('function '+n+'\\([\\s\\S]*?\\n\\}'))[0];
assert(fn('livingMacarPlantFit').includes('MacarWeaponShaft.fit(key,img)'),'live hero scale uses shaft geometry before stature normalization');
assert(fn('drawLivingMacar').includes('const widen=shaft?1:MACAR_FOOT_WIDEN'),'world draw cannot lengthen horizontal/diagonal shafts');
assert(fn('drawLivingMacar').includes('shaft?-H*shaft.foot[1]'),'calibrated raw/atlas feet use the same floor anchor');
assert(html.includes('MacarWeaponShaft.prepare(SPR[k],k)'),'loader applies measured crown/stature metadata');
console.log(poses+' complete weapon poses, '+samples+' painted shaft endpoints, mirroring, viewport scales and floor anchors passed');

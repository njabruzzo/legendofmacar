'use strict';
const assert=require('assert');
const fs=require('fs'), path=require('path');
const {readRgba}=require('../qa/pngRgba');
const Crown=require('./MacarCrown');
const root=path.join(__dirname,'../..');
for(const [file,seat] of Object.entries(Crown.seats)){
  const {w,h,data}=readRgba(path.join(root,'assets/creatures',file));
  const i=(Math.round(seat[1])*w+Math.round(seat[0]))*4;
  assert(data[i+3]>30, file+' brow seat is on painted head');
  const rect={x:-70,y:-100,w:w*.2,h:h*.2};
  const normal=Crown.layout(file,{width:w,height:h},rect,false);
  const mirror=Crown.layout(file,{width:w,height:h},rect,true);
  assert(Math.abs(normal.x+mirror.x-(2*rect.x+rect.w))<1e-9,file+' mirrors around the sprite');
  assert(normal.y===mirror.y && normal.w===mirror.w && normal.angle===-mirror.angle);
  assert(normal.w>15 && normal.w<18,file+' crown matches head width regardless of weapon canvas');
  const crop={x:20,y:100,w:w-40,h:h-120};
  const cropped=Crown.layout(file,{width:w,height:h},
    {x:rect.x+crop.x*.2,y:rect.y+crop.y*.2,w:crop.w*.2,h:crop.h*.2},false,crop);
  assert(Math.abs(cropped.x-normal.x)<1e-9 && Math.abs(cropped.y-normal.y)<1e-9);
  assert(Math.abs(cropped.w-normal.w)<1e-9,file+' pack crop matches full world coordinates');
}
const prop=readRgba(path.join(root,'assets/props/prop_bone_crown.png'));
const worn=new Uint8ClampedArray(prop.data);
const removed=Crown.punchOpening(worn,prop.w,prop.h);
const at=(x,y)=>(y*prop.w+x)*4;
assert(removed>20000,'opaque interior matte is opened');
assert(worn[at(341,220)+3]===0 && worn[at(200,250)+3]===0,'Macar can show through the centre and side of the ring');
for(const x of [.17,.35,.5,.65,.83]) assert(worn[at(Math.round(prop.w*x),Math.round(prop.h*.6))+3]===0,'all openings between front fangs are transparent');
assert(worn[at(341,350)+3]===prop.data[at(341,350)+3] && worn[at(341,350)+3]>0,'front bone rim stays painted');
assert(worn[at(354,80)+3]===prop.data[at(354,80)+3],'crown tips stay painted');
for(let i=0;i<worn.length;i+=4){
  assert(worn[i]===prop.data[i]&&worn[i+1]===prop.data[i+1]&&worn[i+2]===prop.data[i+2],'RGB artwork is unchanged');
}
assert(prop.data[at(341,220)+3]===255,'original prop remains opaque and unmodified');
assert(Crown.seats['dwarf_macar.png'][1]===285,'idle crown seats above the eyes while retaining scalp in the opening');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(html.includes('flip, z, blitKey||key)'), 'world uses actual blit pose, including alias fallback');
assert(html.includes('{x:sx,y:sy,w:sw,h:sh}'), 'pack passes source crop');
console.log('20 painted brow seats; mirroring, crop, scale and world/pack integration passed');

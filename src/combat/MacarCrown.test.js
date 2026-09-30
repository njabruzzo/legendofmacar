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
  assert(normal.w>=13 && normal.w<18,file+' crown matches head width regardless of weapon canvas');
  const crop={x:20,y:100,w:w-40,h:h-120};
  const cropped=Crown.layout(file,{width:w,height:h},
    {x:rect.x+crop.x*.2,y:rect.y+crop.y*.2,w:crop.w*.2,h:crop.h*.2},false,crop);
  assert(Math.abs(cropped.x-normal.x)<1e-9 && Math.abs(cropped.y-normal.y)<1e-9);
  assert(Math.abs(cropped.w-normal.w)<1e-9,file+' pack crop matches full world coordinates');
}
// Keep the raised front walk and unaffected strike placements stable.
for(const [file,seat] of Object.entries({
  'dwarf_macar_w1.png':[242,282,86,0],
  'dwarf_macar_w2.png':[249,286,86,0],
  'dwarf_macar_atk_contact.png':[400,422,85,.12],
  'dwarf_macar_atk_n.png':[231,413,83,0],
  'dwarf_macar_atk_ne.png':[308,384,81,-.08]
})) assert.deepStrictEqual(Crown.seats[file],seat,file+' accepted pose stays unchanged');
// Both profile steps fit the same narrower ring above the painted eye line.
for(const [file,eyeY] of [['dwarf_macar_e_w1.png',378],['dwarf_macar_e_w2.png',369]]){
  const [x,y,w]=Crown.seats[file];
  assert(x>=245&&x<=255&&w===68&&y+6<eyeY,file+' profile ring seats on scalp above eyes');
}
for(const file of ['dwarf_macar_back_w1.png','dwarf_macar_back_w2.png'])
  assert(Crown.seats[file][2]===72&&Crown.seats[file][1]<=270,file+' rear ring fits hair cap');
assert(Crown.seats['dwarf_macar_atk_se.png'][1]+8<406,'down diagonals clear the former brow overlap');
assert(Crown.seats['dwarf_macar_atk_s.png'][0]===124 && Crown.seats['dwarf_macar_atk_s.png'][1]===357,'down strike centres the opening on the scalp behind the shaft');
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
assert(Crown.seats['dwarf_macar.png'][1]===279,'idle crown seats above the eyes while retaining scalp in the opening');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(html.includes('flip, z, blitKey||key)'), 'world uses actual blit pose, including alias fallback');
assert(html.includes('{x:sx,y:sy,w:sw,h:sh}'), 'pack passes source crop');
console.log('20 painted brow seats; mirroring, crop, scale and world/pack integration passed');

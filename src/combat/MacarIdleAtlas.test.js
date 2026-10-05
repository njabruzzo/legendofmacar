'use strict';
const assert=require('assert'),path=require('path'),fs=require('fs');
const Atlas=require('./MacarIdleAtlas'),Crown=require('./MacarCrown'),{readRgba}=require('../qa/pngRgba');
const bindings={};Atlas.register(bindings);assert.equal(Object.keys(bindings).length,16);
assert.equal(bindings.macar_axe,bindings.macar_axe_idle_s,'world fallback and inventory use the corrected axe idle');
for(const [weapon,file] of Object.entries(Atlas.files)){
 const {w,h,data}=readRgba(path.join(__dirname,'../..',file));
 assert.equal(w,1536);assert.equal(h,1024);
 const stem=weapon==='maul'?'macar':'macar_'+weapon;
 for(const key of Atlas.keys(stem)){
  const pose=Atlas.pose(key),cell=pose.cell;
  const source=Atlas.standalone[key],png=source?readRgba(path.join(__dirname,'../..',bindings[key])):{w,h,data};
  const region=source?[0,0,png.w,png.h]:[cell[0]*512,cell[1]*512,512,512];
  let visible=0,clear=0;
  for(let y=region[1];y<region[1]+region[3];y++)for(let x=region[0];x<region[0]+region[2];x++){
   const alpha=png.data[(y*png.w+x)*4+3];if(alpha>40)visible++;if(alpha===0)clear++;
  }
  const area=region[2]*region[3];
  assert(visible/area>.23&&visible/area<.69,key+' has a complete isolated figure');
  assert(clear/area>.23,key+' retains transparent surroundings');
  const calls=[],doc={createElement:()=>({getContext:()=>({drawImage:(...args)=>calls.push(args)})})};
  const canvas=Atlas.slice({width:png.w,height:png.h},key,doc);
  assert.equal(canvas.width,512);assert.equal(canvas.height,512);
  assert.deepEqual(calls[0].slice(1),[...region,0,0,512,512]);
  assert(canvas.__macarDirectionalIdle,'direct alpha-preserving render');
  const rect={x:10,y:20,w:256,h:256};
  const normal=Crown.layout(file,canvas,rect,false),mirrored=Crown.layout(file,canvas,rect,true);
  assert(normal&&normal.w>20&&normal.w<40,key+' calibrated crown seat');
  assert.equal(normal.x+mirrored.x,2*rect.x+rect.w);assert.equal(mirrored.angle,-normal.angle);
 }
}
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
assert(html.includes("WORLD_ART_KEYS[n].push(...MacarIdleAtlas.keys('macar'))"),'all five standing sources ready before play');
assert(html.includes('if(img.__macarDirectionalIdle) return img;'),'generated alpha bypasses old cutout repair');
console.log('15 standing sources, atlas isolation, transparency and mirrored crown seats passed');

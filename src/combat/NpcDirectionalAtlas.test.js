'use strict';
const assert=require('assert'),path=require('path'),crypto=require('crypto');
const atlas=require('./NpcDirectionalAtlas'),{readRgba}=require('../qa/pngRgba');
const bindings={};atlas.register(bindings);
for(const actor of atlas.actors){
 const png=readRgba(path.join(__dirname,'../../assets/creatures/directional/'+actor+'-v1.png'));
 const parsed=atlas.components(png.data,png.w,png.h);
 for(const row of parsed.rows){
  const hashes=[];
  for(const part of row){
   assert(part.x0>0&&part.y0>0&&part.x1<png.w-1&&part.y1<png.h-1,actor+' complete equipment must be inside source image');
   assert(part.pixels.length>10000,actor+' complete body');
   const h=crypto.createHash('sha256');for(const at of part.pixels)h.update(png.data.subarray(at*4,at*4+4));hashes.push(h.digest('hex'));
  }
  assert.equal(new Set(hashes).size,6,actor+' requires six distinct painted poses');
 }
 for(const ghost of actor.startsWith('gnome_')?[false]:[false,true])for(const dir of ['s','se','e','ne','n','nw','w','sw']){
  const stem=actor+(ghost?'_ghost':'');
  for(const [state,props] of Object.entries({idle:{},walk0:{moving:1,gait:.25},walk1:{moving:1,gait:.75},windup:{atk:.9,atkMax:1},attack:{atk:.4,atkMax:1},recover:{atk:.1,atkMax:1}})){
   const key=atlas.select(stem,props,dir),pose=atlas.pose(key);
   assert.equal(pose.stage,state);assert.equal(pose.view,({sw:'se',w:'e',nw:'ne'}[dir]||dir));assert.equal(pose.ghost,ghost);assert(bindings[key]);
  }
  for(const flag of ['dead','crushed','sleeping','tied'])assert.equal(atlas.select(stem,{[flag]:1},dir),null,'retain special '+flag+' artwork');
 }
}
assert.equal(atlas.select('goblin',{},'s'),null,'uncovered actors retain existing art');
(async()=>{
 const previous=global.Image,requests=[];
 global.Image=class{set src(url){requests.push(url);queueMicrotask(()=>requests.length===1?this.onerror():this.onload());}};
 try{
  const first=atlas.loadImage('retry-test','atlas.png?v=2');
  assert.strictEqual(first,atlas.loadImage('retry-test','atlas.png?v=2'),'concurrent pose requests share one source decode');
  await first;
  assert.deepEqual(requests,['atlas.png?v=2','atlas.png?v=2&retry=1'],'a transient source failure retries before blocking world loading');
 }finally{global.Image=previous;}
 console.log('NPC directional sources, full equipment bounds, distinct poses, eight facings, mirrored views, ghost variants, special-state guards and shared loading retry passed');
})().catch(e=>{console.error(e);process.exitCode=1;});

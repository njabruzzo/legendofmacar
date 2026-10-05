'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),{readRgba}=require('./pngRgba'),Walk=require('./PostureWalk');
for(const view of ['front','rear']){
 const file=path.resolve(__dirname,Walk.files[view]),png=readRgba(file),cfg=Walk.calibration[view];
 assert(png.w>1000&&png.h>1000);let visible=0,clear=0;
 for(let i=3;i<png.data.length;i+=4){if(png.data[i]===0)clear++;if(png.data[i]>40)visible++;}
 assert(clear/(png.w*png.h)>.3&&visible/(png.w*png.h)>.2,'isolated alpha sprite art');
 for(let phase=0;phase<4;phase++){
  const calls=[],doc={createElement:()=>({getContext:()=>({drawImage:(...a)=>calls.push(a)})})},pose=Walk.slice({width:png.w,height:png.h},view,phase,doc);
  const [,sx,sy,sw,sh]=calls[0];assert(sx>=0&&sy>=0&&sx+sw<=png.w&&sy+sh<=png.h);
  assert.equal(pose.scale,cfg.scale,'constant scale across cycle prevents changing body proportions');
  assert.equal(pose.bottom,cfg.feet[phase]);
 }
}
const game=fs.readFileSync(path.join(__dirname,'../../src/combat/MacarMotionAtlas.js'),'utf8');
assert(!game.includes('posture-front-v7')&&!game.includes('posture-rear-v7'),'candidate remains preview-only');
console.log('Eight posture preview cells, alpha, fixed scale and gameplay isolation passed');

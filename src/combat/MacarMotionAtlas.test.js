'use strict';
const assert=require('assert'),path=require('path');
const Atlas=require('./MacarMotionAtlas'),Crown=require('./MacarCrown'),{readRgba}=require('../qa/pngRgba');
const bindings={};Atlas.register(bindings);assert.equal(Object.keys(bindings).length,18);
for(const weapon of ['axe','xbow'])for(const oct of ['e','se','s','sw','w','nw','n','ne']){
 const view=['nw','n','ne'].includes(oct)?'rear':'front';
 const seen=new Set();
 for(let phase=0;phase<4;phase++){
  const key=Atlas.select(weapon,{gait:phase/4+.125},oct,true);seen.add(key);
  assert.equal(key,weapon==='axe'&&oct!=='n'&&oct!=='s'?'macar_axe_idle_'+({w:'e',sw:'se',nw:'ne'}[oct]||oct):`macar_${weapon}_cycle_${view}_${phase}`);
 }
 assert.equal(seen.size,weapon==='axe'&&oct!=='n'&&oct!=='s'?1:4,'only signed direction-matching cycles are used');
 assert.equal(Atlas.select(weapon,{gait:.99},oct,false),weapon==='xbow'?`macar_xbow_side_${view}`:null);
 for(const dt of [1/60,.05]){
  const phases=new Set();for(let t=0;t<1;t+=dt){const p=Atlas.pose(Atlas.select(weapon,{gait:t*2},oct,true));phases.add(p?p.phase:'compass');}
  assert.equal(phases.size,weapon==='axe'&&oct!=='n'&&oct!=='s'?1:4,'normal and long frames keep the correct heading');
 }
}
for(const [key,file] of Object.entries(bindings)){
 const p=Atlas.pose(key),png=readRgba(path.join(__dirname,'../..',file));
 const calls=[],canvas={getContext:()=>({drawImage:(...args)=>calls.push(args)})};
 Atlas.slice({width:png.w,height:png.h},key,{createElement:()=>canvas});
 const [image,sx,sy,sw,sh,dx,dy,dw,dh]=calls[0];
 assert(sx>=0&&sy>=0&&sx+sw<=png.w&&sy+sh<=png.h,'source cell fits');
 let visible=0,clear=0,clipped=0;
 for(let y=sy;y<sy+sh;y++)for(let x=Math.ceil(sx);x<sx+sw;x++){
  const a=png.data[(y*png.w+x)*4+3];if(a>40){visible++;const tx=dx+(x-sx)*dw/sw,ty=dy+(y-sy)*dh/sh;if(tx<0||ty<0||tx>=512||ty>=512)clipped++;}else if(a===0)clear++;
 }
 assert(visible>10000&&clear>10000,key+' isolated complete art');
 assert(clipped/visible<.015,key+' no meaningful figure clipping '+clipped/visible);
 assert(canvas.__macarIntegratedMotion&&canvas.__macarDirectionalIdle);
 const rect={x:10,y:20,w:256,h:256},normal=Crown.layout(file,canvas,rect,false),mirror=Crown.layout(file,canvas,rect,true);
 assert(normal&&normal.w>20&&normal.w<40);assert.equal(normal.x+mirror.x,2*rect.x+rect.w);
}
assert.equal(Atlas.pose('macar_atk'),null,'existing hammer and melee art retained');
console.log('Four phases at normal/50ms frames, 18 transparent source cells, clipping and crown seats passed');

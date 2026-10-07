(function(root){
 'use strict';
 const actors=['pordoom','fendur','orbo','talpor','gnome_good','gnome_tinker'];
 const dwarfActors=actors.slice(0,4);
 const files=Object.fromEntries(actors.map(actor=>[actor,'assets/creatures/directional/'+actor+'-v'+(dwarfActors.includes(actor)?2:1)+'.png']));
 const views=['s','se','e','ne','n'],stages=['idle','walk0','walk1','windup','attack','recover','walk2','walk3'];
 const sourceColumns={idle:0,walk0:1,walk1:2,windup:3,attack:4,recover:5,walk2:0,walk3:0};
 const mirror={sw:'se',w:'e',nw:'ne'};
 const cache=new Map(),images=new Map();
 function loadImage(actor,url){
  if(!images.has(actor))images.set(actor,new Promise((resolve,reject)=>{const image=new root.Image();image.onload=()=>resolve(image);image.onerror=()=>{if(!image.__retried){image.__retried=1;image.src=url+(url.includes('?')?'&':'?')+'retry=1';return;}images.delete(actor);reject(new Error("NPC directional atlas failed: "+actor));};image.src=url;}));
  return images.get(actor);
 }
 function components(data,w,h){
  const labels=new Uint16Array(w*h),parts=[];let id=0;
  for(let at=0;at<labels.length;at++){
   if(labels[at]||data[at*4+3]<=40)continue;
   const part={id:++id,pixels:[at],x0:w,y0:h,x1:0,y1:0,cx:0,cy:0};labels[at]=id;
   for(let i=0;i<part.pixels.length;i++){
    const a=part.pixels[i],x=a%w,y=Math.floor(a/w);
    part.x0=Math.min(part.x0,x);part.x1=Math.max(part.x1,x);part.y0=Math.min(part.y0,y);part.y1=Math.max(part.y1,y);part.cx+=x;part.cy+=y;
    for(const n of [x?a-1:-1,x+1<w?a+1:-1,y?a-w:-1,y+1<h?a+w:-1])if(n>=0&&!labels[n]&&data[n*4+3]>40){labels[n]=id;part.pixels.push(n);}
   }
   part.cx/=part.pixels.length;part.cy/=part.pixels.length;parts.push(part);
  }
  const frames=parts.filter(p=>p.pixels.length>500).sort((a,b)=>a.cy-b.cy);
  if(frames.length!==30)throw new Error('NPC atlas must contain 30 separate full poses; found '+frames.length);
  const rows=[];for(let r=0;r<5;r++)rows.push(frames.slice(r*6,r*6+6).sort((a,b)=>a.cx-b.cx));
  return{rows,labels,parts};
 }
 function pose(key){
  const m=/^(pordoom|fendur|orbo|talpor|gnome_good|gnome_tinker)(_ghost)?_direction_(s|se|e|ne|n)_(idle|walk[0-3]|windup|attack|recover)$/.exec(key||'');
  return m?{actor:m[1],ghost:!!m[2],view:m[3],stage:m[4],row:views.indexOf(m[3]),col:sourceColumns[m[4]]}:null;
 }
 function anatomy(part,w){
  const footPixels=part.pixels.filter(at=>Math.floor(at/w)>part.y1-(part.y1-part.y0)*.08);
  const footX=footPixels.length?footPixels.reduce((sum,at)=>sum+at%w,0)/footPixels.length:(part.x0+part.x1)/2;
  // A staff ornament above the head must not make its dwarf shorter.
  // Measure the idle body in the central column above the planted boots.
  const radius=Math.max(3,(part.x1-part.x0)*.10);
  const central=part.pixels.filter(at=>Math.abs(at%w-footX)<radius);
  const bodyTop=central.length?Math.min(...central.map(at=>Math.floor(at/w))):part.y0;
  return {footX,bodyTop,height:part.y1-bodyTop};
 }
 function keys(actor,ghost=false){return views.flatMap(v=>stages.map(s=>actor+(ghost?'_ghost':'')+'_direction_'+v+'_'+s));}
 function register(bindings){for(const actor of actors)for(const ghost of actor.startsWith('gnome_')?[false]:[false,true])for(const key of keys(actor,ghost))bindings[key]=files[actor];}
 function select(stem,e,oct){
  const ghost=stem.endsWith('_ghost'),actor=ghost?stem.slice(0,-6):stem;
  if(!actors.includes(actor)||e.dead||e.crushed||e.sleeping||e.tied)return null;
  const t=e.atk>0?1-e.atk/Math.max(.01,e.atkMax):0;
  // Step, plant, opposite step, plant: retain the approved painted poses.
  const phase=Math.floor((((e.gait||0)%1+1)%1)*4);
  const stage=e.atk>0?(t<.45?'windup':t<.72?'attack':'recover'):e.moving&&!e.defending?'walk'+[0,2,1,3][phase]:'idle';
  return actor+(ghost?'_ghost':'')+'_direction_'+(mirror[oct]||oct||'s')+'_'+stage;
 }
 function slice(image,key,doc){
  const p=pose(key);if(!p)return image;
  if(!cache.has(p.actor)){
   const source=doc.createElement('canvas');source.width=image.width;source.height=image.height;
   const g=source.getContext('2d');g.drawImage(image,0,0);const rgba=g.getImageData(0,0,image.width,image.height),parsed=components(rgba.data,image.width,image.height);
   const scales=parsed.rows.map(row=>256/(dwarfActors.includes(p.actor)?anatomy(row[0],image.width).height:row[0].y1-row[0].y0));
   const frames=parsed.rows.map((row,r)=>row.map((part,col)=>{
    const w=part.x1-part.x0+5,h=part.y1-part.y0+5,tile=doc.createElement('canvas');tile.width=w;tile.height=h;
    const tg=tile.getContext('2d'),out=tg.createImageData(w,h);let footSum=0,footN=0;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
     const sx=part.x0-2+x,sy=part.y0-2+y;if(sx<0||sy<0||sx>=image.width||sy>=image.height)continue;
     const at=sy*image.width+sx,label=parsed.labels[at];
     if(label&&label!==part.id&&parsed.parts[label-1].pixels.length>100)continue;
     for(let k=0;k<4;k++)out.data[(y*w+x)*4+k]=rgba.data[at*4+k];
     if(label===part.id&&sy>part.y1-(part.y1-part.y0)*.08){footSum+=x;footN++;}
    }
    tg.putImageData(out,0,0);const scale=scales[r],c=doc.createElement('canvas');c.width=c.height=512;
    c.getContext('2d').drawImage(tile,256-(footN?footSum/footN:w/2)*scale,440-(h-3)*scale,w*scale,h*scale);
    c.__npcDirectional=true;c.__npcPose={actor:p.actor,view:views[r],stage:stages[col]};c.__npcFoot=[.5,440/512];c.__npcFit=2;
    return c;
   }));cache.set(p.actor,frames);
  }
  const c=cache.get(p.actor)[p.row][p.col];
  return c;
 }
 const api={actors,dwarfActors,files,views,stages,loadImage,components,anatomy,pose,keys,register,select,slice};root.NpcDirectionalAtlas=api;if(typeof module==='object')module.exports=api;
})(globalThis);

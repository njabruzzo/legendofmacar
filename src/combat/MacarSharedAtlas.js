(function(root){
 'use strict';
 const bodyFile='assets/creatures/shared/macar-body-v1.png',weaponFile='assets/creatures/shared/macar-weapons-v1.png';
 const directions=['s','se','e','ne','n'],stages=['idle','walk0','walk1','walk2','walk3','attack'];
 const targets={maul:.53,axe:.65},bodyHeight=400,size=768,feet=590;
 const cache=new Map(),geometryCache=new Map();let equipment=null,equipmentPromise=null;
 function keys(){const out=[];for(const weapon of ['maul','axe'])for(const dir of directions)for(const stage of stages)out.push((weapon==='axe'?'macar_axe':'macar')+'_shared_'+dir+'_'+stage);return out;}
 function pose(key){
  const m=/^macar(?:_(axe))?_shared_(s|se|e|ne|n)_(idle|walk[0-3]|attack)$/.exec(key||'');
  if(m)return{weapon:m[1]||'maul',dir:m[2],stage:m[3],row:directions.indexOf(m[2]),col:stages.indexOf(m[3])};
  // Legacy and late-decode fallback keys use exactly the same body source.
  if(!/^macar(?:_|$)/.test(key||'')||/xbow|crowned/.test(key))return null;
  const weapon=key.includes('_axe')?'axe':'maul';
  let dir=(key.match(/(?:idle_|atk_)(s|se|e|ne|n)$/)||[])[1]||(/back/.test(key)?'n':/(?:_e_|_se_|_ne_)/.test(key)?key.split('_')[1]:'s');
  const cycle=/cycle_(front|rear)_([0-3])$/.exec(key);
  if(cycle)dir=cycle[1]==='rear'?'n':'s';
  const stage=/atk/.test(key)?'attack':cycle?'walk'+cycle[2]:/_w[12]$/.test(key)?'walk'+(key.endsWith('w1')?0:2):'idle';
  return{weapon,dir,stage,row:directions.indexOf(dir),col:stages.indexOf(stage)};
 }
 function register(bindings){for(const key of Object.keys(bindings))if(pose(key))bindings[key]=bodyFile;for(const key of keys())bindings[key]=bodyFile;}
 function select(weapon,e,oct,stage){const dir={w:'e',sw:'se',nw:'ne'}[oct]||oct||'s';const phase=Math.min(3,Math.floor((((e.gait||0)%1)+1)%1*4));return(weapon==='axe'?'macar_axe':'macar')+'_shared_'+dir+'_'+(stage==='walk'?'walk'+phase:stage);}
 function loadEquipment(){if(equipment)return Promise.resolve(equipment);if(!equipmentPromise)equipmentPromise=new Promise((resolve,reject)=>{const img=new root.Image();img.onload=()=>{equipment=img;resolve(img);};img.onerror=()=>{equipmentPromise=null;reject(new Error('Macar equipment atlas failed to load'));};img.src=(typeof root.assetUrl==='function'?root.assetUrl(weaponFile):weaponFile);});return equipmentPromise;}
 function cellBounds(image,row,col,doc){
  const w=image.width/6,h=image.height/5,c=doc.createElement('canvas');c.width=w;c.height=h;
  const g=c.getContext('2d');g.drawImage(image,col*w,row*h,w,h,0,0,w,h);
  const pixels=g.getImageData(0,0,w,h),d=pixels.data,visited=new Uint8Array(w*h),components=[];
  // Isolated atlas-edge flecks are not limbs. Keep every painted body component.
  for(let n=0;n<w*h;n++){
   if(visited[n]||d[n*4+3]<=40)continue;
   const component=[n];visited[n]=1;
   for(let q=0;q<component.length;q++){
    const at=component[q],x=at%w,y=Math.floor(at/w);
    for(const next of [x>0?at-1:-1,x+1<w?at+1:-1,y>0?at-w:-1,y+1<h?at+w:-1])
     if(next>=0&&!visited[next]&&d[next*4+3]>40){visited[next]=1;component.push(next);}
   }
   components.push(component);
  }
  const largest=Math.max(...components.map(c=>c.length)),minimum=Math.max(100,largest*.025);
  for(const component of components)if(component.length<minimum)for(const at of component)d[at*4+3]=0;
  g.putImageData(pixels,0,0);
  let top=h,bot=0,left=w,right=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>80){top=Math.min(top,y);bot=Math.max(bot,y);left=Math.min(left,x);right=Math.max(right,x);}
  return{w,h,c,top,bot,left,right};
 }

 function layout(p){
  const carry=[[88,58],[91,62],[119,62],[165,63],[177,64]][p.row],hit=[[102,162],[148,128],[178,143],[189,127],[174,116]][p.row];
  const grip=p.stage==='attack'?hit:carry;
  const angle=p.stage==='attack'?[.45,.3,.2,-.6,-1.3][p.row]:p.row>=3?Math.PI+.32:-.32;
  return{grip,angle};
 }
 async function slice(image,key,doc){
  const p=pose(key);if(!p)return image;const weapons=await loadEquipment();
  const bodyKey=p.dir+':'+p.stage;
  let body=cache.get(bodyKey);
  if(!body){
   const bounds=cellBounds(image,p.row,p.col,doc),idle=cellBounds(image,p.row,0,doc),sc=bodyHeight/(idle.bot-idle.top);
   const x=size/2-(idle.left+idle.right)/2*sc,y=feet-bounds.bot*sc;
   const c=doc.createElement('canvas');c.width=c.height=size;c.getContext('2d').drawImage(bounds.c,x,y,bounds.w*sc,bounds.h*sc);
   body={canvas:c,bounds,sc,x,y,top:y+bounds.top*sc};cache.set(bodyKey,body);
  }
  const c=doc.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d'),l=layout(p),grip=[body.x+l.grip[0]*body.sc,body.y+l.grip[1]*body.sc];
  const length=bodyHeight*targets[p.weapon],ux=Math.cos(l.angle),uy=Math.sin(l.angle),a=[grip[0]-length*.16*ux,grip[1]-length*.16*uy],b=[a[0]+length*ux,a[1]+length*uy];
  // Artwork pommel/socket landmarks in the 1254px equipment sheet.
  const endpoints=p.weapon==='axe'?[80,1050,914]:[80,941,348],scale=length/(endpoints[1]-endpoints[0]);
  const drawWeapon=()=>{g.save();g.translate(a[0],a[1]);g.rotate(l.angle);const sy=p.weapon==='axe'?627:0;g.drawImage(weapons,0,sy,1254,627,-endpoints[0]*scale,-(endpoints[2]-sy)*scale,1254*scale,627*scale);g.restore();};
  drawWeapon();g.drawImage(body.canvas,0,0);
  if(p.stage==='attack'){drawWeapon();g.save();g.beginPath();g.rect(grip[0]-20,grip[1]-22,40,44);g.clip();g.drawImage(body.canvas,0,0);g.restore();}
  const browX=body.x+([132,143,156,151,123][p.row])*body.sc,browY=body.top+27*body.sc;
  const geom={weapon:p.weapon,size:[size,size],shaft:[a.map(v=>v/size),b.map(v=>v/size)],foot:[.5,feet/size],body:[body.top/size,feet/size],brow:[browX/size,browY/size,52*body.sc/size,0]};
  geometryCache.set(key,geom);c.__macarSharedBody=bodyKey;c.__macarBodyCanvas=body.canvas;c.__macarDirectionalIdle=1;c.__macarIntegratedMotion=1;c.__macarIdleSeat=[browX,browY,52*body.sc,0];c._stature=(feet-body.top)/size;c.__macarSharedGeometry=geom;return c;
 }
 function geometry(key){return geometryCache.get(key)||null;}
 const api={bodyFile,weaponFile,directions,stages,targets,keys,pose,register,select,slice,geometry};root.MacarSharedAtlas=api;if(typeof module==='object')module.exports=api;
})(globalThis);

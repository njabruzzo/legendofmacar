(function(root){
 'use strict';
 const combatFile='assets/creatures/shared/macar-combat-v2.png',crossbowFile='assets/creatures/shared/macar-crossbow-v1.png';
 const bodyFile='assets/creatures/shared/macar-body-v1.png',weaponFile='assets/creatures/shared/macar-weapons-v1.png';
 const directions=['s','se','e','ne','n'],stages=['idle','walk0','walk1','walk2','walk3','windup','attack','recover','ranged'];
 const targets={maul:.53,axe:.65,xbow:.70},bodyHeight=400,size=896,feet=650;
 const cache=new Map(),geometryCache=new Map();let equipment=null,equipmentPromise=null,crossbow=null,crossbowPromise=null;
 function keys(){const out=[];for(const weapon of ['maul','axe','xbow'])for(const dir of directions)for(const stage of stages)out.push((weapon==='maul'?'macar':'macar_'+weapon)+'_shared_'+dir+'_'+stage);return out;}
 function pose(key){
  const m=/^macar(?:_(axe|xbow))?_shared_(s|se|e|ne|n)_(idle|walk[0-3]|windup|attack|recover|ranged)$/.exec(key||'');
  if(m)return{weapon:m[1]||'maul',dir:m[2],stage:m[3],row:directions.indexOf(m[2]),col:stages.indexOf(m[3])};
  // Legacy and late-decode fallback keys use exactly the same body source.
  if(!/^macar(?:_|$)/.test(key||'')||/crowned/.test(key))return null;
  const weapon=key.includes('_axe')?'axe':key.includes('_xbow')?'xbow':'maul';
  let dir=(key.match(/(?:idle_|atk_)(s|se|e|ne|n)$/)||[])[1]||(/back/.test(key)?'n':/(?:_e_|_se_|_ne_)/.test(key)?key.split('_')[1]:'s');
  const cycle=/cycle_(front|rear)_([0-3])$/.exec(key);
  if(cycle)dir=cycle[1]==='rear'?'n':'s';
  if(weapon==='xbow'&&/side_rear/.test(key))dir='n';
  const stage=/atk_recover/.test(key)?'recover':/atk/.test(key)?(weapon==='xbow'?'ranged':'attack'):cycle?'walk'+cycle[2]:/_w[12]$/.test(key)?'walk'+(key.endsWith('w1')?0:2):'idle';
  return{weapon,dir,stage,row:directions.indexOf(dir),col:stages.indexOf(stage)};
 }
 function source(p){return ['windup','attack','recover','ranged'].includes(p.stage)?combatFile:bodyFile;}
 function register(bindings){for(const key of Object.keys(bindings))if(pose(key))bindings[key]=source(pose(key));for(const key of keys())bindings[key]=source(pose(key));}
 function select(weapon,e,oct,stage){const dir={w:'e',sw:'se',nw:'ne'}[oct]||oct||'s';const phase=Math.min(3,Math.floor((((e.gait||0)%1)+1)%1*4));return(weapon==='maul'?'macar':'macar_'+weapon)+'_shared_'+dir+'_'+(stage==='walk'?'walk'+phase:stage);}
 function loadEquipment(){if(equipment)return Promise.resolve(equipment);if(!equipmentPromise)equipmentPromise=new Promise((resolve,reject)=>{const img=new root.Image();img.onload=()=>{equipment=img;resolve(img);};img.onerror=()=>{equipmentPromise=null;reject(new Error('Macar equipment atlas failed to load'));};img.src=(typeof root.assetUrl==='function'?root.assetUrl(weaponFile):weaponFile);});return equipmentPromise;}
 function cellBounds(image,row,col,doc,cols=6){
  const sw=image.width/cols,sh=image.height/5,w=Math.ceil(sw),h=Math.ceil(sh),c=doc.createElement('canvas');c.width=w;c.height=h;
  const g=c.getContext('2d');g.drawImage(image,col*sw,row*sh,sw,sh,0,0,w,h);
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

 function attackStage(progress){return progress<.45?'windup':progress<.84?'attack':'recover';}
 function loadCrossbow(){if(crossbow)return Promise.resolve(crossbow);if(!crossbowPromise)crossbowPromise=new Promise((resolve,reject)=>{const img=new root.Image();img.onload=()=>{crossbow=img;resolve(img);};img.onerror=()=>{crossbowPromise=null;reject(new Error('Crossbow equipment failed to load'));};img.src=typeof root.assetUrl==='function'?root.assetUrl(crossbowFile):crossbowFile;});return crossbowPromise;}
 function layout(p){
  const carries=[
   [[88,58],[91,57],[92,60],[89,59],[90,60]],
   [[97,50],[96,46],[104,49],[98,53],[90,52]],
   [[132,44],[123,43],[138,44],[127,43],[119,44]],
   [[165,63],[169,65],[170,63],[167,62],[169,62]],
   [[177,64],[179,64],[177,65],[176,63],[180,65]]
  ];
  const carry=carries[p.row][p.stage.startsWith('walk')?1+Number(p.stage.slice(4)):0],hit=[[102,162],[148,128],[178,143],[189,127],[174,116]][p.row];
  const grip=p.stage==='attack'?hit:carry;
  const angle=p.stage==='attack'?[.45,.3,.2,-.6,-1.3][p.row]:[-.28,-1.20,Math.PI+.55,Math.PI+.4,Math.PI+.32][p.row];
  if(p.stage==='windup')return{grip:[[132,46],[145,47],[172,45],[157,47],[147,40]][p.row],angle:[-1.05,-1.0,-.95,-2.0,-2.1][p.row]};
  if(p.stage==='attack')return{grip:[[166,252],[236,254],[271,258],[288,224],[246,204]][p.row],angle:[.45,.3,.2,-.6,-1.3][p.row]};
  if(p.stage==='recover'||p.stage==='ranged')return{grip:[[181,182],[230,177],[230,164],[267,165],[227,158]][p.row],angle:p.weapon==='xbow'?[.45,.3,.1,-.55,-1.3][p.row]:[.15,.1,0,-.25,-.5][p.row]};
  return{grip,angle};
 }
 async function slice(image,key,doc){
  const p=pose(key);if(!p)return image;const weapons=p.weapon==='xbow'?await loadCrossbow():await loadEquipment();
  const bodyKey=p.dir+':'+p.stage;
  let body=cache.get(bodyKey);
  if(!body){
   const combat=['windup','attack','recover','ranged'].includes(p.stage),col=combat?({windup:0,attack:1,recover:2,ranged:2}[p.stage]):p.col,cols=combat?3:6;
   const bounds=cellBounds(image,p.row,col,doc,cols),idle=cellBounds(image,p.row,0,doc,cols),sc=bodyHeight/(idle.bot-idle.top);
   const x=size/2-(idle.left+idle.right)/2*sc,y=feet-bounds.bot*sc;
   const c=doc.createElement('canvas');c.width=c.height=size;c.getContext('2d').drawImage(bounds.c,x,y,bounds.w*sc,bounds.h*sc);
   const legStage=p.stage.startsWith('walk')?['walk0','walk2','walk1','walk3'][Number(p.stage.slice(4))]:p.stage;
   if(root.DwarfWalkLegs)root.DwarfWalkLegs.apply(c,legStage,p.dir,feet-bodyHeight*.25,feet,bodyHeight);
   body={canvas:c,bounds,sc,x,y,top:y+bounds.top*sc};cache.set(bodyKey,body);
  }
  const c=doc.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d'),l=layout(p),grip=[body.x+l.grip[0]*body.sc,body.y+l.grip[1]*body.sc];
  const length=bodyHeight*targets[p.weapon],ux=Math.cos(l.angle),uy=Math.sin(l.angle),a=[grip[0]-length*.16*ux,grip[1]-length*.16*uy],b=[a[0]+length*ux,a[1]+length*uy];
  // Artwork pommel/socket landmarks in the 1254px equipment sheet.
  const endpoints=p.weapon==='axe'?[80,1050,914]:[80,941,348],scale=length/(endpoints[1]-endpoints[0]);
  const drawWeapon=()=>{g.save();if(p.weapon==='xbow'){g.translate(grip[0],grip[1]);g.rotate(l.angle);const sc=length/1100;g.drawImage(weapons,-540*sc,-650*sc,weapons.width*sc,weapons.height*sc);g.restore();return;}g.translate(a[0],a[1]);g.rotate(l.angle);const sy=p.weapon==='axe'?627:0;g.drawImage(weapons,0,sy,1254,627,-endpoints[0]*scale,-(endpoints[2]-sy)*scale,1254*scale,627*scale);g.restore();};
  drawWeapon();g.drawImage(body.canvas,0,0);
  if(p.weapon!=='xbow'&&!['windup','attack','recover','ranged'].includes(p.stage)){
   // The carried head stays behind the body; the continuous shaft crosses
   // the palm in front of the shoulder, with painted fingers restored on top.
   const nx=-uy*10*body.sc,ny=ux*10*body.sc,front=[grip[0]+length*.12*ux,grip[1]+length*.12*uy];
   g.save();g.beginPath();g.moveTo(a[0]+nx,a[1]+ny);g.lineTo(front[0]+nx,front[1]+ny);g.lineTo(front[0]-nx,front[1]-ny);g.lineTo(a[0]-nx,a[1]-ny);g.closePath();g.clip();drawWeapon();g.restore();
   // Keep the painted fist visible around the shaft, but do not repaint the
   // whole hand over it: that made the weapon appear to stop at the shoulder.
   // The narrow front pass above is the shaft crossing the palm; the original
   // body canvas remains underneath so the fingers and sleeve stay painted.
  }
  if(['windup','attack','recover','ranged'].includes(p.stage)){drawWeapon();g.save();g.beginPath();g.rect(grip[0]-20,grip[1]-22,40,44);g.clip();g.drawImage(body.canvas,0,0);g.restore();}
  // Brow/hair-cap seats calibrated to the current v2 combat cells, not v1.
  const brows={windup:[[188,54],[224,53],[233,42],[228,44],[197,33]],attack:[[180,112],[232,104],[264,103],[257,100],[188,84]],recover:[[161,54],[190,49],[223,40],[217,39],[165,25]],ranged:[[161,54],[190,49],[223,40],[217,39],[165,25]]};
  const brow=brows[p.stage];const browX=brow?body.x+brow[p.row][0]*body.sc:body.x+(p.dir==='e'&&p.stage==='walk3'?142:p.dir==='e'&&p.stage==='walk2'?145:p.dir==='se'&&p.stage==='walk3'?130:[132,143,156,151,123][p.row])*body.sc,browY=brow?body.y+brow[p.row][1]*body.sc:body.top+17*body.sc;
  const crownWidth=([42,40,36,38,42][p.row])*body.sc;
  const geom={weapon:p.weapon,size:[size,size],grip:grip.map(v=>v/size),shaft:[a.map(v=>v/size),b.map(v=>v/size)],foot:[.5,feet/size],body:[body.top/size,feet/size],brow:[browX/size,browY/size,crownWidth/size,0]};
  geometryCache.set(key,geom);c.__macarSharedBody=bodyKey;c.__macarBodyCanvas=body.canvas;c.__macarDirectionalIdle=1;c.__macarIntegratedMotion=1;c.__macarIdleSeat=[browX,browY,crownWidth,0];c._stature=(feet-body.top)/size;c.__macarSharedGeometry=geom;return c;
 }
 function geometry(key){return geometryCache.get(key)||null;}
 const api={bodyFile,weaponFile,combatFile,crossbowFile,attackStage,source,directions,stages,targets,keys,pose,register,select,slice,geometry};root.MacarSharedAtlas=api;if(typeof module==='object')module.exports=api;
})(globalThis);

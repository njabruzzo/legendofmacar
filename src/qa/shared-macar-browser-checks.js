(async function(){
 const result={suite:'Shared Macar movement',checks:0,failures:[],states:[]},check=(v,m)=>{result.checks++;if(!v)result.failures.push(m);};
 const report=document.createElement('pre');document.body.append(report);report.textContent='Loading shared Macar walking…';document.getElementById('c').style.display='none';document.body.style='overflow:auto;background:#222;color:white;height:auto';
 try{
 await Promise.all([...MacarSharedAtlas.keys(),'macar','macar_axe','bone_crown'].map(k=>new Promise(resolve=>loadSpriteKeyNow(k,ok=>{check(ok,'decode '+k);resolve();}))));
 const hero=ent({hero:1,team:'party',kind:'dwarf',name:'MACAR',x:0,y:0,sp:4.3});G.ents=[hero];TW=116;TH=58;ZOOM=1.5;CAMSX=0;CAMSY=0;
 const gallery=document.createElement('canvas');gallery.width=1600;gallery.height=1500;const gg=gallery.getContext('2d');gg.fillStyle='#343434';gg.fillRect(0,0,gallery.width,gallery.height);
 const hash=(canvas,y=0)=>{const d=canvas.getContext('2d').getImageData(0,y,canvas.width,canvas.height-y).data;let h=2166136261;for(const v of d)h=Math.imul(h^v,16777619);return h>>>0;};
 for(const [r,dir] of MacarSharedAtlas.directions.entries()){
  const legHashes=[];
  for(const [i,stage] of MacarSharedAtlas.stages.entries()){
   const a=SPR['macar_shared_'+dir+'_'+stage],b=SPR['macar_axe_shared_'+dir+'_'+stage];
   check(a.__macarBodyCanvas===b.__macarBodyCanvas,'exact shared body '+dir+' '+stage);
   check(a.__macarSharedBody===b.__macarSharedBody,'same pose identity '+dir+' '+stage);
   if(stage.startsWith('walk'))legHashes.push(hash(a.__macarBodyCanvas,450));
   for(const [j,weapon] of ['maul','axe'].entries()){
    const key=(weapon==='axe'?'macar_axe':'macar')+'_shared_'+dir+'_'+stage,img=SPR[key],p=MacarWeaponShaft.pose(key);
    G.equipped={primary:{n:weapon==='axe'?'Iron Axe':'War Hammer',k:'weapon',macarHeld:1},helmet:{id:'bone_crown',boneCrown:1}};
    const H=entSpriteH(hero,ZOOM)*livingMacarPlantFit(hero,key,img),W=H,dx=r*320+80+j*160-W*.5,dy=i*250+211-H*p.foot[1];
    blitFacing(gg,img,dx,dy,W,H,false,true);drawWornBoneCrown(gg,W,H,dx,dy,false,ZOOM,key);
    const edge=img.getContext('2d').getImageData(0,0,img.width,img.height).data;let border=0;for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++)if((x<2||x>img.width-3||y<2||y>img.height-3)&&edge[(y*img.width+x)*4+3]>80)border++;check(border===0,'no clipped weapon/body edges '+key);
    check(Math.abs(H*Math.hypot(p.shaft[1][0]-p.shaft[0][0],p.shaft[1][1]-p.shaft[0][1])-entSpriteH(hero,ZOOM)*MacarWeaponShaft.target[weapon])<.01,'shaft consistency '+key);
   }
  }
  check(new Set(legHashes).size===4,'four distinct alternating leg frames '+dir);
 }
 gg.font='14px sans-serif';gg.fillStyle='white';MacarSharedAtlas.directions.forEach((d,i)=>gg.fillText(d.toUpperCase()+' · maul / axe',i*320+15,18));
 result.sharedGallery=gallery.toDataURL('image/png');
 const demo=document.createElement('canvas');demo.width=640;demo.height=280;demo.style='position:static;width:640px;height:280px';document.body.append(demo);
 const heading=document.createElement('select');for(const d of ['s','se','e','ne','n','nw','w','sw']){const option=document.createElement('option');option.value=d;option.textContent=d.toUpperCase();heading.append(option);}document.body.append(heading);
 const animate=t=>{const dir=heading.value,flip=['nw','w','sw'].includes(dir),g=demo.getContext('2d');g.fillStyle='#343434';g.fillRect(0,0,640,280);
  for(const [i,weapon] of ['maul','axe'].entries()){const key=MacarSharedAtlas.select(weapon,{gait:t/1000*3.35},dir,'walk'),img=SPR[key],p=MacarWeaponShaft.pose(key),H=entSpriteH(hero,ZOOM)*MacarWeaponShaft.fit(key,img);blitFacing(g,img,160+i*320-H*.5,235-H*p.foot[1],H,H,flip,true);g.fillStyle='white';g.font='16px sans-serif';g.fillText(weapon==='axe'?'Battle axe':'Maul',115+i*320,265);}requestAnimationFrame(animate);};requestAnimationFrame(animate);document.body.append(gallery);
 const dirs=['e','se','s','sw','w','nw','n','ne'];
 for(const weapon of ['maul','axe'])for(let i=0;i<8;i++)for(const stage of ['idle','walk0','walk1','walk2','walk3','attack']){
  const angle=i*Math.PI/4,sx=Math.cos(angle)/(TW/2),sy=Math.sin(angle)/(TH/2),m=Math.hypot(sx+sy,sy-sx),dx=(sx+sy)/m,dy=(sy-sx)/m;
  G.equipped={primary:{n:weapon==='axe'?'Iron Axe':'War Hammer',k:'weapon',macarHeld:1}};
  Object.assign(hero,{ix:dx,iy:dy,fdx:dx,fdy:dy,moving:stage.startsWith('walk')?1:0,gait:stage.startsWith('walk')?(+stage.slice(4))*.25+.125:0,atk:stage==='attack'?.4:0,atkMax:1,atkKind:'melee',bowPoseT:0,bowPoseUntil:0,macarWindupUntil:0,aim:null,_attack:null});
  const key=livingMacarAnimKey(hero),p=MacarSharedAtlas.pose(key),wanted=MacarSharedAtlas.select(weapon,hero,dirs[i],stage.startsWith('walk')?'walk':stage);
  check(key===wanted,'actual selected '+weapon+' '+dirs[i]+' '+stage);
  check(p.weapon===weapon,'equipped family '+key);check(wantsSpriteFlip(hero)===(i>=3&&i<=5),'mirror '+key);
  const cv=document.createElement('canvas');cv.width=cv.height=300;drawLivingMacar(cv.getContext('2d'),hero);check(MacarStrikeQA.blitKey===key,'actual rendered pose '+key);
  check(Math.abs(MacarStrikeQA.shaftLength-entSpriteH(hero,ZOOM)*MacarWeaponShaft.target[weapon])<.01,'actual rendered shaft '+key);
  result.states.push({weapon,dir:dirs[i],stage,key});
 }
 // Exercise the movement function, including an immovable wall.
 startChapter(1);G.scene='play';const p=player();p.x=36.5;p.y=22.5;const oldGait=p.gait||0;check(steerWalk(p,1,0,4.3,1/60)>0,'movement advances on open floor');check(p.moving&&(p.gait||0)>oldGait,'movement advances gait');
 const oldCanBe=canBe;canBe=()=>false;const gait=p.gait;steerWalk(p,1,0,4.3,.05);check(!p.moving&&p.gait===gait,'blocked movement plants idle without advancing gait');canBe=oldCanBe;
 }catch(e){result.failures.push(e.stack);}
 report.textContent=JSON.stringify({suite:result.suite,checks:result.checks,failures:result.failures,states:result.states.length},null,2);await fetch('/qa-result',{method:'POST',body:JSON.stringify(result)});
})();

(async function(){
 const result={suite:'Shared Macar movement',checks:0,failures:[],states:[]},check=(v,m)=>{result.checks++;if(!v)result.failures.push(m);};
 const report=document.createElement('pre');document.body.append(report);report.textContent='Loading shared Macar walking…';document.getElementById('c').style.display='none';document.body.style='overflow:auto;background:#222;color:white;height:auto';
 try{
 await Promise.all([...MacarSharedAtlas.keys(),'macar','macar_axe','bone_crown'].map(k=>new Promise(resolve=>loadSpriteKeyNow(k,ok=>{check(ok,'decode '+k);resolve();}))));
 const hero=ent({hero:1,team:'party',kind:'dwarf',name:'MACAR',x:0,y:0,sp:4.3});G.ents=[hero];TW=116;TH=58;ZOOM=1.5;CAMSX=0;CAMSY=0;
 const gallery=document.createElement('canvas');gallery.width=2400;gallery.height=2250;gallery.style='position:static;width:1200px;height:1125px';const gg=gallery.getContext('2d');gg.fillStyle='#343434';gg.fillRect(0,0,gallery.width,gallery.height);
 const hash=(canvas,y=0)=>{const d=canvas.getContext('2d').getImageData(0,y,canvas.width,canvas.height-y).data;let h=2166136261;for(const v of d)h=Math.imul(h^v,16777619);return h>>>0;};
 for(const [r,dir] of MacarSharedAtlas.directions.entries()){
  const legHashes=[];
  for(const [i,stage] of MacarSharedAtlas.stages.entries()){
   const a=SPR['macar_shared_'+dir+'_'+stage],b=SPR['macar_axe_shared_'+dir+'_'+stage],bow=SPR['macar_xbow_shared_'+dir+'_'+stage];
   check(a.__macarBodyCanvas===bow.__macarBodyCanvas,'exact crossbow body '+dir+' '+stage);
   check(a.__macarBodyCanvas===b.__macarBodyCanvas,'exact shared body '+dir+' '+stage);
   check(a.__macarSharedBody===b.__macarSharedBody,'same pose identity '+dir+' '+stage);
   if(stage.startsWith('walk')){
    legHashes.push(hash(a.__macarBodyCanvas,450));
    const legs=a.__macarBodyCanvas.__walkLegOffsets;
    check(!!legs&&legs.left[0]*legs.right[0]<0,'left and right legs move oppositely '+dir+' '+stage);
   }
   for(const [j,weapon] of ['maul','axe','xbow'].entries()){
    const key=(weapon==='maul'?'macar':'macar_'+weapon)+'_shared_'+dir+'_'+stage,img=SPR[key],p=MacarWeaponShaft.pose(key);
    G.equipped={primary:{n:weapon==='axe'?'Iron Axe':weapon==='xbow'?'Crossbow':'War Hammer',k:'weapon',macarHeld:1},helmet:{id:'bone_crown',boneCrown:1}};
    const H=entSpriteH(hero,ZOOM)*livingMacarPlantFit(hero,key,img),W=H,dx=r*480+80+j*160-W*.5,dy=i*250+211-H*p.foot[1];
    blitFacing(gg,img,dx,dy,W,H,false,true);drawWornBoneCrown(gg,W,H,dx,dy,false,ZOOM,key);
    const crownSeat=MacarCrown.layout(SPRITE_FILES[key],img,{x:0,y:0,w:img.width,h:img.height},false);
    const mirroredSeat=MacarCrown.layout(SPRITE_FILES[key],img,{x:0,y:0,w:img.width,h:img.height},true);
    const bodyPixels=img.__macarBodyCanvas.getContext('2d').getImageData(0,0,img.width,img.height).data;
    const seatAt=(Math.round(crownSeat.y)*img.width+Math.round(crownSeat.x))*4;
    check(bodyPixels[seatAt+3]>80,'crown seat on painted head '+key);
    check(Math.abs(crownSeat.x+mirroredSeat.x-img.width)<.01&&crownSeat.y===mirroredSeat.y,'crown mirrors with head '+key);
    const edge=img.getContext('2d').getImageData(0,0,img.width,img.height).data;let border=0;for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++)if((x<2||x>img.width-3||y<2||y>img.height-3)&&edge[(y*img.width+x)*4+3]>80)border++;check(border===0,'no clipped weapon/body edges '+key);
    check(Math.abs(H*Math.hypot(p.shaft[1][0]-p.shaft[0][0],p.shaft[1][1]-p.shaft[0][1])-entSpriteH(hero,ZOOM)*MacarWeaponShaft.target[weapon])<.01,'shaft consistency '+key);
    const grip=MacarSharedAtlas.geometry(key).grip, gx=Math.round(grip[0]*img.width),gy=Math.round(grip[1]*img.height);
    const hands=img.__macarBodyCanvas.getContext('2d').getImageData(gx-16,gy-16,33,33).data;let handPixels=0;for(let n=3;n<hands.length;n+=4)if(hands[n]>80)handPixels++;check(handPixels>100,'weapon grip overlaps painted hand/arm '+key);
    if(weapon!=='xbow'&&['e','se'].includes(dir)&&(stage==='idle'||stage.startsWith('walk'))){
      const palm=img.__macarBodyCanvas.getContext('2d').getImageData(gx-5,gy-5,11,11).data;
      let skin=0;for(let k=0;k<palm.length;k+=4)if(palm[k+3]>80&&palm[k]>120&&palm[k]>palm[k+1]*1.2&&palm[k+1]>palm[k+2]*1.15)skin++;
      check(skin>30,'shaft grip centered on exposed hand skin, not sleeve '+key);
    }
    if(weapon!=='xbow'&&dir==='s'&&(stage==='idle'||stage.startsWith('walk'))){
      const shaft=MacarSharedAtlas.geometry(key).shaft,dx=shaft[1][0]-shaft[0][0],dy=shaft[1][1]-shaft[0][1];
      check(dx>0&&dy<0&&Math.abs(dy/dx)<.4,'downward carry leans behind head across shoulder '+key);
    }
    if(weapon!=='xbow'&&!['windup','attack','recover','ranged'].includes(stage)){
      const shaft=p.shaft,tail=[(shaft[0][0]*.94+shaft[1][0]*.06)*img.width,(shaft[0][1]*.94+shaft[1][1]*.06)*img.height];
      const tx=Math.round(tail[0]),ty=Math.round(tail[1]),painted=img.getContext('2d').getImageData(tx-4,ty-4,9,9).data,under=img.__macarBodyCanvas.getContext('2d').getImageData(tx-4,ty-4,9,9).data;
      let shaftPixels=0;for(let k=0;k<painted.length;k+=4)if(painted[k+3]>80&&(painted[k]!==under[k]||painted[k+1]!==under[k+1]||painted[k+2]!==under[k+2]))shaftPixels++;
      check(shaftPixels>3,'visible shaft continues through hand to pommel '+key);
    }

    if(dir==='e'&&['maul','axe'].includes(weapon)&&(stage==='idle'||stage.startsWith('walk'))){
     const geometry=MacarSharedAtlas.geometry(key),socket=geometry.shaft[1];
     const composed=img.getContext('2d').getImageData(gx-8,gy-8,17,17).data;
     const bodyOnly=img.__macarBodyCanvas.getContext('2d').getImageData(gx-8,gy-8,17,17).data;
     let shaftOverPalm=0;for(let n=0;n<composed.length;n+=4)if(composed[n+3]>80&&(composed[n]!==bodyOnly[n]||composed[n+1]!==bodyOnly[n+1]||composed[n+2]!==bodyOnly[n+2]))shaftOverPalm++;
     check(shaftOverPalm>3,'shaft visibly crosses painted palm '+key);
     for(const flip of [false,true]){const project=x=>flip?1-x:x,behind=flip?project(socket[0])>project(geometry.grip[0]):project(socket[0])<project(geometry.grip[0]);
      check(behind,'side carry head stays behind gripping shoulder '+key+(flip?' west':' east'));
      check(socket[1]<geometry.grip[1],'side carry head rests above shoulder '+key);
     }
    }
   }
  }
  check(new Set(legHashes).size===4,'four distinct alternating leg frames '+dir);
 }
 gg.font='14px sans-serif';gg.fillStyle='white';MacarSharedAtlas.directions.forEach((d,i)=>gg.fillText(d.toUpperCase()+' · maul / axe / crossbow',i*480+15,18));
 result.sharedGallery=gallery.toDataURL('image/png');
 const demo=document.createElement('canvas');demo.width=960;demo.height=280;demo.style='position:static;width:960px;height:280px';document.body.append(demo);
 const heading=document.createElement('select');for(const d of ['s','se','e','ne','n','nw','w','sw']){const option=document.createElement('option');option.value=d;option.textContent=d.toUpperCase();heading.append(option);}document.body.append(heading);
 const animate=t=>{const dir=heading.value,flip=['nw','w','sw'].includes(dir),g=demo.getContext('2d');g.fillStyle='#343434';g.fillRect(0,0,960,280);
  for(const [i,weapon] of ['maul','axe','xbow'].entries()){const key=MacarSharedAtlas.select(weapon,{gait:t/1000*WALK_CYCLES_PER_SECOND},dir,'walk'),img=SPR[key],p=MacarWeaponShaft.pose(key),H=entSpriteH(hero,ZOOM)*MacarWeaponShaft.fit(key,img);blitFacing(g,img,160+i*320-H*.5,235-H*p.foot[1],H,H,flip,true);g.fillStyle='white';g.font='16px sans-serif';g.fillText(weapon==='axe'?'Battle axe':weapon==='xbow'?'Crossbow':'Maul',115+i*320,265);}requestAnimationFrame(animate);};requestAnimationFrame(animate);document.body.append(gallery);
 const dirs=['e','se','s','sw','w','nw','n','ne'];
 for(const weapon of ['maul','axe','xbow'])for(let i=0;i<8;i++)for(const stage of ['idle','walk0','walk1','walk2','walk3','windup','attack','recover','ranged']){
  const angle=i*Math.PI/4,sx=Math.cos(angle)/(TW/2),sy=Math.sin(angle)/(TH/2),m=Math.hypot(sx+sy,sy-sx),dx=(sx+sy)/m,dy=(sy-sx)/m;
  G.equipped={primary:{n:weapon==='axe'?'Iron Axe':weapon==='xbow'?'Crossbow':'War Hammer',k:'weapon',macarHeld:1}};
  Object.assign(hero,{ix:dx,iy:dy,fdx:dx,fdy:dy,moving:stage.startsWith('walk')?1:0,gait:stage.startsWith('walk')?(+stage.slice(4))*.25+.125:0,atk:stage==='windup'?.82:stage==='attack'?.4:stage==='recover'?.1:0,atkMax:1,atkKind:stage==='ranged'?'bow':'melee',bowPoseT:0,bowPoseUntil:stage==='ranged'?nowMs()+1000:0,macarWindupUntil:0,aim:null,_attack:null});
  const key=livingMacarAnimKey(hero),p=MacarSharedAtlas.pose(key),wanted=MacarSharedAtlas.select(stage==='ranged'?'xbow':weapon,hero,dirs[i],stage.startsWith('walk')?'walk':stage);
  check(key===wanted,'actual selected '+weapon+' '+dirs[i]+' '+stage);
  check(p.weapon===(stage==='ranged'?'xbow':weapon),'equipped family '+key);check(wantsSpriteFlip(hero)===(i>=3&&i<=5),'mirror '+key);
  const cv=document.createElement('canvas');cv.width=cv.height=300;drawLivingMacar(cv.getContext('2d'),hero);check(MacarStrikeQA.blitKey===key,'actual rendered pose '+key);
  check(Math.abs(MacarStrikeQA.shaftLength-entSpriteH(hero,ZOOM)*MacarWeaponShaft.target[stage==='ranged'?'xbow':weapon])<.01,'actual rendered shaft '+key);
  result.states.push({weapon,dir:dirs[i],stage,key});
 }
 // Real movement can retain a selected foe behind Macar. Check that case
 // through the renderer, for both carried melee weapons and every heading.
 for(const weapon of ['maul','axe'])for(let i=0;i<8;i++){
  const angle=i*Math.PI/4,sx=Math.cos(angle)/(TW/2),sy=Math.sin(angle)/(TH/2),m=Math.hypot(sx+sy,sy-sx),dx=(sx+sy)/m,dy=(sy-sx)/m;
  G.equipped={primary:{n:weapon==='axe'?'Iron Axe':'War Hammer',k:'weapon',macarHeld:1}};
  Object.assign(hero,{ix:dx,iy:dy,fdx:dx,fdy:dy,moving:1,gait:.375,atk:0,atkKind:'melee',bowPoseUntil:0,_attack:null,aim:{x:hero.x-dx*10,y:hero.y-dy*10,team:'foe',dead:0}});
  const wanted=MacarSharedAtlas.select(weapon,hero,dirs[i],'walk');
  check(livingMacarAnimKey(hero)===wanted,'selected-foe walking direction '+weapon+' '+dirs[i]);
  const cv=document.createElement('canvas');cv.width=cv.height=300;drawLivingMacar(cv.getContext('2d'),hero);
  check(MacarStrikeQA.blitKey===wanted,'selected-foe rendered walk '+weapon+' '+dirs[i]);
  check(wantsSpriteFlip(hero)===(i>=3&&i<=5),'selected-foe mirrored walk '+weapon+' '+dirs[i]);
 }
 // Exercise the movement function, including an immovable wall.
 startChapter(1);G.scene='play';const p=player();p.x=36.5;p.y=22.5;const oldGait=p.gait||0;check(steerWalk(p,1,0,4.3,1/60)>0,'movement advances on open floor');check(p.moving&&(p.gait||0)>oldGait,'movement advances gait');
 const oldCanBe=canBe;canBe=()=>false;const gait=p.gait;steerWalk(p,1,0,4.3,.05);check(!p.moving&&p.gait===gait,'blocked movement plants idle without advancing gait');canBe=oldCanBe;
 const stride={gait:0},macarPhases=new Set(),npcPhases=new Set();
 for(let frame=0;frame<40;frame++){
  gaitAdvance(stride,1/60);
  macarPhases.add(MacarSharedAtlas.pose(MacarSharedAtlas.select('maul',stride,'e','walk')).stage);
  npcPhases.add(NpcDirectionalAtlas.pose(NpcDirectionalAtlas.select('pordoom',{moving:1,gait:stride.gait},'e')).stage);
 }
 check(macarPhases.size===4&&npcPhases.size===4,'game gait advances all four Macar and dwarf walking phases');
 check(Math.abs(stride.gait-40/60*WALK_CYCLES_PER_SECOND)<.001,'consistent full stride pace');
 }catch(e){result.failures.push(e.stack);}
 report.textContent=JSON.stringify({suite:result.suite,checks:result.checks,failures:result.failures,states:result.states.length},null,2);await fetch('/qa-result',{method:'POST',body:JSON.stringify(result)});
})();

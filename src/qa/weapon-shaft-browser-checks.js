(async function(){
 const result={suite:'Weapon shaft consistency',checks:0,failures:[],poses:[],states:[]};
 const check=(v,m)=>{result.checks++;if(!v)result.failures.push(m);};
 const report=document.createElement('pre');report.id='qa-results';report.textContent='Loading measured maul and battle-axe poses…';document.body.append(report);
 document.getElementById('c').style.display='none';document.body.style='overflow:auto;background:#171717;color:white;height:auto;';
 try{
 const keys=Object.keys(SPRITE_FILES).filter(k=>!!MacarWeaponShaft.pose(k));
 await Promise.all([...keys,'bone_crown'].map(k=>new Promise(resolve=>loadSpriteKeyNow(k,ok=>{check(ok,'decode '+k);resolve();}))));
 const hero=ent({hero:1,team:'party',kind:'dwarf',name:'MACAR',x:0,y:0,sp:4.3});G.ents=[hero];
 TW=116;TH=58;ZOOM=1.5;CAMSX=0;CAMSY=0;
 const tiles=[];const grid=document.createElement('div');grid.style='display:grid;grid-template-columns:repeat(6,220px);gap:6px';document.body.append(grid);
 const canvasFor=(key,flip)=>{
  const cv=document.createElement('canvas');cv.width=220;cv.height=300;cv.style='position:static;width:220px;height:300px;';const g=cv.getContext('2d');
  g.fillStyle='#343434';g.fillRect(0,0,220,300);
  const p=MacarWeaponShaft.pose(key),img=livingMacarImg(key),fit=livingMacarPlantFit(hero,key,img),h=entSpriteH(hero,ZOOM)*fit,w=img.width*h/img.height;
  const dx=110-w*(flip?1-p.foot[0]:p.foot[0]),dy=258-h*p.foot[1];
  blitFacing(g,img,dx,dy,w,h,flip,true);drawWornBoneCrown(g,w,h,dx,dy,flip,ZOOM,key);
  const points=p.shaft.map(a=>[dx+w*(flip?1-a[0]:a[0]),dy+h*a[1]]);
  const measured=Math.hypot(points[1][0]-points[0][0],points[1][1]-points[0][1]),expected=entSpriteH(hero,ZOOM)*MacarWeaponShaft.target[p.weapon];
  check(Math.abs(measured-expected)<.01,key+' rendered shaft length');
  check(Math.abs(w/img.width-h/img.height)<1e-9,key+' uniform image scale');
  // Independent pixel evidence at both endpoint landmarks on the decoded
  // art, allowing a small radius for antialiasing and the metal socket rim.
  const source=document.createElement('canvas');source.width=SPR[key].width;source.height=SPR[key].height;const sg=source.getContext('2d');sg.drawImage(SPR[key],0,0);
  for(const [i,a] of p.shaft.entries()){
   let visible=0;const x=Math.round(a[0]*source.width),y=Math.round(a[1]*source.height);
   const x0=Math.max(0,x-5),y0=Math.max(0,y-5),rw=Math.min(11,source.width-x0),rh=Math.min(11,source.height-y0);
   if(rw>0&&rh>0){const rgba=sg.getImageData(x0,y0,rw,rh).data;for(let j=3;j<rgba.length;j+=4)if(rgba[j]>40)visible++;}
   check(visible>10,key+' endpoint '+i+' lands on painted weapon');
  }
  g.strokeStyle='#70e7cd';g.lineWidth=1;g.beginPath();g.moveTo(...points[0]);g.lineTo(...points[1]);g.stroke();
  for(const a of points){g.fillStyle='#70e7cd';g.beginPath();g.arc(...a,2.5,0,TAU);g.fill();}
  g.fillStyle='white';g.font='11px sans-serif';g.fillText(key+(flip?' mirrored':''),7,278);g.fillText(measured.toFixed(2)+'px shaft',7,293);
  const body=MacarWeaponShaft.metrics(key,SPR[key]).body*h/SPR[key].height;
  check(body>entSpriteH(hero,ZOOM)*.60&&body<entSpriteH(hero,ZOOM)*1.28,key+' plausible crouched/standing stature '+body);
  result.poses.push({key,flip,shaftPx:measured,bodyPx:body});grid.append(cv);tiles.push(cv);
 };
 for(const key of keys){const p=MacarWeaponShaft.pose(key);G.equipped={primary:{n:p.weapon==='axe'?'Iron Axe':'War Hammer',k:'weapon',macarHeld:1},helmet:{id:'bone_crown',boneCrown:1}};canvasFor(key,false);canvasFor(key,true);}
 const directions=['e','se','s','sw','w','nw','n','ne'];
 for(const weapon of ['maul','axe'])for(const dt of [1/60,.05])for(let i=0;i<8;i++)for(const stage of ['idle','walk1','walk2','walk3','walk4','windup','hit','recover']){
  const a=i*Math.PI/4,sx=Math.cos(a)/(TW/2),sy=Math.sin(a)/(TH/2),m=Math.hypot(sx+sy,sy-sx),dx=(sx+sy)/m,dy=(sy-sx)/m;
  G.equipped={primary:{n:weapon==='axe'?'Iron Axe':'War Hammer',k:'weapon',macarHeld:1}};
  Object.assign(hero,{ix:dx,iy:dy,fdx:dx,fdy:dy,moving:stage.startsWith('walk')?1:0,gait:stage.startsWith('walk')?(+stage.slice(4)-1)/4+.125:.25,atk:0,atkMax:1,atkKind:'melee',bowPoseT:0,bowPoseUntil:0,macarWindupUntil:0,aim:null,_attack:null});
  if(stage==='windup'||stage==='hit'||stage==='recover')hero.atk=stage==='windup'?.82:stage==='hit'?.4:.1;
  const key=livingMacarAnimKey(hero),blit=livingMacarBlitKey(key),p=MacarWeaponShaft.pose(blit);
  check(p&&p.weapon===weapon,weapon+' '+stage+' '+directions[i]+' decoded family');
  const cg=document.createElement('canvas').getContext('2d');drawLivingMacar(cg,hero);
  check(Math.abs(MacarStrikeQA.shaftLength-entSpriteH(hero,ZOOM)*MacarWeaponShaft.target[weapon])<.01,'actual drawLivingMacar '+weapon+' '+stage+' '+directions[i]+' '+dt);
  check(wantsSpriteFlip(hero)===(i>=3&&i<=5),'mirroring '+weapon+' '+stage+' '+directions[i]);
  result.states.push({weapon,stage,direction:directions[i],dt,key:blit,shaftPx:MacarStrikeQA.shaftLength});
 }
 // A late attack decode must use the actual ready carry calibration.
 for(const weapon of ['maul','axe']){
  const missing=weapon==='maul'?['macar_atk','macar_atk_contact']:['macar_axe_atk'];
  const saved=Object.fromEntries(missing.map(k=>[k,SPR[k]]));missing.forEach(k=>delete SPR[k]);
  try{
   G.equipped={primary:{n:weapon==='axe'?'Iron Axe':'War Hammer',k:'weapon',macarHeld:1}};
   Object.assign(hero,{fdx:1,fdy:-1,ix:0,iy:0,moving:0,atk:.4,atkMax:1,atkKind:'melee',bowPoseT:0,bowPoseUntil:0});
   const cg=document.createElement('canvas').getContext('2d');drawLivingMacar(cg,hero);
   check(MacarWeaponShaft.pose(MacarStrikeQA.blitKey).weapon===weapon,'late attack stays in '+weapon+' family');
   check(Math.abs(MacarStrikeQA.shaftLength-entSpriteH(hero,ZOOM)*MacarWeaponShaft.target[weapon])<.01,'late '+weapon+' decode retains carry shaft length');
  }finally {Object.assign(SPR,saved);}
 }
 const sheet=document.createElement('canvas');sheet.width=1320;sheet.height=Math.ceil(tiles.length/6)*300;const g=sheet.getContext('2d');g.fillStyle='#343434';g.fillRect(0,0,sheet.width,sheet.height);tiles.forEach((cv,i)=>g.drawImage(cv,(i%6)*220,Math.floor(i/6)*300));result.shaftGallery=sheet.toDataURL('image/png');
 const preview=document.createElement('canvas');preview.width=660;preview.height=600;const pg=preview.getContext('2d');
 ['macar_idle_s','macar_w1','macar_atk_s','macar_axe_idle_s','macar_axe_cycle_front_0','macar_axe_atk'].forEach((key,i)=>{
  const n=result.poses.findIndex(p=>p.key===key&&!p.flip);pg.drawImage(tiles[n],i%3*220,Math.floor(i/3)*300);
  pg.fillStyle='#343434';pg.fillRect(i%3*220,Math.floor(i/3)*300+265,220,20);pg.fillStyle='white';pg.font='13px sans-serif';pg.fillText((i<3?'Maul':'Battle axe')+' · '+['idle','walking','combat'][i%3],i%3*220+7,Math.floor(i/3)*300+278);
 });result.shaftPreview=preview.toDataURL('image/png');
 }catch(e){result.failures.push(e.stack);}
 report.textContent=JSON.stringify({suite:result.suite,checks:result.checks,failures:result.failures,sourcePoses:result.poses.length,gameStates:result.states.length},null,2);
 await fetch('/qa-result',{method:'POST',body:JSON.stringify(result)});
})();

(async function(){
 const result={checks:0,failures:[],weapons:[],followers:[]};
 const check=(v,m)=>{result.checks++;if(!v)result.failures.push(m);};
 const report=document.createElement('pre');report.id='qa-results';report.style='position:relative;background:#111;color:white;white-space:pre-wrap;padding:20px;z-index:9999';document.body.append(report);
 document.getElementById('c').style.display='none';document.body.style='overflow:auto;background:#171717;color:white;height:auto;';
 report.textContent='Loading shipped art for animation and follower verification…';
 try{
 const keys=Object.keys(SPRITE_FILES).filter(k=>/^macar(_|$)/.test(k)).concat(['bone_crown']);
 await Promise.all(keys.map(k=>new Promise(resolve=>loadSpriteKeyNow(k,ok=>{check(ok,'load '+k);resolve();}))));
 const gallery=document.createElement('div');gallery.id='pose-gallery';gallery.style='display:grid;grid-template-columns:repeat(8,180px);gap:5px';document.body.append(gallery);
 const hero=ent({hero:1,team:'party',kind:'dwarf',name:'MACAR',x:0,y:0,sp:4.3});G.ents=[hero];
 CAMSX=0;CAMSY=0;ZOOM=2; TW=116;TH=58;
 const dirs=['e','se','s','sw','w','nw','n','ne'];
 const stages=['idle','walk1','walk2','windup','hit','recover','ranged'];
 for(const weapon of ['maul','axe','crossbow'])for(const stage of stages)for(let i=0;i<8;i++){
  const a=i*Math.PI/4;const sx=Math.cos(a)/(TW/2),sy=Math.sin(a)/(TH/2);const m=Math.hypot(sx+sy,sy-sx);
  const dx=(sx+sy)/m,dy=(sy-sx)/m;
  G.equipped={helmet:{id:'bone_crown',boneCrown:1},primary:weapon==='axe'?{id:'shadow_cleaver',n:'Shadow Cleaver'}:{id:'macar_hammer',n:"Macar's War Hammer"},secondary:weapon==='crossbow'?{n:'Crossbow'}:null};
  Object.assign(hero,{moving:stage.startsWith('walk')?1:0,ix:dx,iy:dy,fdx:dx,fdy:dy,gait:stage==='walk2'?.75:.25,atk:0,atkKind:'melee',bowPoseT:0,bowPoseUntil:0,macarWindupUntil:0,aim:null,_attack:null});
  if(stage==='windup'||stage==='hit'||stage==='recover'){hero.atkMax=1;hero.atk=stage==='windup'?.82:stage==='hit'?.4:.1;}
  if(stage==='ranged'){hero.atkKind='bow';armBowPose(hero);}
  check(screenOctant(hero)===dirs[i],weapon+' '+stage+' octant '+dirs[i]);
  const key=livingMacarAnimKey(hero),blit=livingMacarBlitKey(key);
  const stem=stage==='ranged'?'macar_xbow':weapon==='axe'?'macar_axe':weapon==='crossbow'?'macar_xbow':'macar';
  let expected=stem;
  if(stage==='ranged')expected='macar_xbow_atk';
  else if(stage==='windup'||stage==='hit')expected=stem==='macar'?(i===6?'macar_atk_n':i===2?'macar_atk_s':i===5||i===7?'macar_atk_ne':i===1||i===3?'macar_atk_se':stage==='hit'?'macar_atk_contact':'macar_atk'):stem+'_atk';
  else if(stage.startsWith('walk')){
   const suffix=stage==='walk2'?'_w2':'_w1';expected=stem==='macar'?(i===6?'macar_back':i===0||i===4?'macar_e':i===1||i===3?'macar_se':i===5||i===7?'macar_ne':stem)+suffix:stem+suffix;
  }
  check(key===expected,weapon+' '+stage+' '+dirs[i]+' expected '+expected+' got '+key);
  check(blit===key,weapon+' '+stage+' '+dirs[i]+' blit does not revert pose');
  check(!!MacarCrown.layout(SPRITE_FILES[blit],SPR[blit],{x:0,y:0,w:100,h:100},wantsSpriteFlip(hero)),'crown seat '+blit);
  const cv=document.createElement('canvas');cv.width=180;cv.height=240;cv.style='position:static;width:180px;height:240px;background:#424242';const cg=cv.getContext('2d');cg.translate(90,190);drawLivingMacar(cg,hero);cg.setTransform(1,0,0,1,0,0);cg.fillStyle='white';cg.font='10px sans-serif';cg.fillText(weapon+' '+stage+' '+dirs[i],5,220);cg.fillText(blit,5,233);gallery.append(cv);
  result.weapons.push({weapon,stage,direction:dirs[i],key,blit,flip:wantsSpriteFlip(hero)});
 }
 // Switching during/after bow pose must return to the current equipment.
 for(const weapon of ['axe','crossbow','maul','axe','maul']){
  G.equipped.primary=weapon==='axe'?{id:'shadow_cleaver',n:'Shadow Cleaver'}:{n:'War Hammer'};G.equipped.secondary=weapon==='crossbow'?{n:'Crossbow'}:null;
  Object.assign(hero,{moving:0,atkKind:'bow',bowPoseUntil:nowMs()-1,bowPoseT:.2});
  check(livingMacarAnimKey(hero)===(weapon==='axe'?'macar_axe':weapon==='crossbow'?'macar_xbow':'macar'),'expired Shoot equipment switch '+weapon);
 }
 for(const weapon of ['axe','crossbow','maul','axe','maul'])for(const state of ['idle','walk','strike','bow']){
  G.equipped.primary=weapon==='axe'?{id:'shadow_cleaver',n:'Shadow Cleaver'}:{n:'War Hammer'};G.equipped.secondary=weapon==='crossbow'?{n:'Crossbow'}:null;
  Object.assign(hero,{moving:state==='walk'?1:0,atk:state==='strike'?.4:0,atkMax:1,atkKind:state==='bow'?'bow':'melee',bowPoseUntil:state==='bow'?nowMs()+1000:0,bowPoseT:0,macarWindupUntil:0});
  const stem=weapon==='axe'?'macar_axe':weapon==='crossbow'?'macar_xbow':'macar';
  const key=livingMacarAnimKey(hero);
  check(state==='bow'?key==='macar_xbow_atk':state==='strike'?key.startsWith(stem+'_atk'):state==='walk'?key.startsWith(stem)&&/_w[12]$/.test(key):key===stem,'equipment switch '+weapon+' '+state+' got '+key);
  check(livingMacarBlitKey(key)===key,'switch survives blit '+weapon+' '+state);
 }
 const originalCanBe=canBe,originalWalk=walk;
 for(const dt of [1/60,.05])for(const geometry of ['open','north','west','corner'])for(const size of ['laptop','phone']){
  TW=size==='phone'?66:116;TH=size==='phone'?34:58;
  canBe=(x,y,r)=>(geometry!=='north'&&geometry!=='corner'||y-r>=0)&&(geometry!=='west'&&geometry!=='corner'||x-r>=0);walk=(x,y,e)=>canBe(x,y,e?e.r:0);
  Object.assign(hero,{x:4,y:4,moving:1,atk:0,atkKind:'melee',aim:null,sp:4.3,defending:0});
  G.equipped={};G.trail=[];
  const crew=[[6.2,4],[4,6.2],[7,7],[1,7]].map((xy,i)=>ent({x:xy[0],y:xy[1],team:'party',ghost:1,sp:4.3,name:['PORDUM','FENDUR','ORBO','TALPOR'][i]}));G.ents=[hero,...crew];
  let minLead=99,minKin=99,maxRatio=0,restMoves=0,sheetFlips=0;
  const lastSheets=new Map();
  for(let f=0;f<720;f++){
   for(const e of G.ents){e._followX=e.x;e._followY=e.y;e._followGait=e.gait||0;}
   hero._followDt=dt;hero._partyBlocked=false;
   const a=Math.floor(f/80)%8*Math.PI/4;
   steerWalk(hero,f<640?Math.cos(a):0,f<640?Math.sin(a):0,hero.sp,dt);
   hero._frameStep=Math.hypot(hero.x-hero._followX,hero.y-hero._followY);
   for(let i=0;i<crew.length;i++){
    const e=crew[i];if(hero.moving){const slot=followBearingSlot(e,hero,i);if(dist(e,slot)>.38)steerWalk(e,slot.x-e.x,slot.y-e.y,e.sp,dt);else holdFollowWalk(e,hero);}
   }
   separateParty(hero);
   for(let i=0;i<crew.length;i++){
    const e=crew[i];minLead=Math.min(minLead,dist(hero,e));
    for(let j=i+1;j<crew.length;j++)minKin=Math.min(minKin,dist(e,crew[j]));
    const travel=Math.hypot(e.x-e._followX,e.y-e._followY);maxRatio=Math.max(maxRatio,travel/(e.sp*dt));
    if(f>650&&travel>1e-8)restMoves++;
    const sheet=entAnimKey(e);if(f>650&&lastSheets.has(e)&&lastSheets.get(e)!==sheet)sheetFlips++;lastSheets.set(e,sheet);
   }
  }
  check(minLead>=2.15-1e-6,geometry+' '+size+' '+dt+' leader gap '+minLead);
  check(minKin>=2.05-1e-6,geometry+' '+size+' '+dt+' kin gap '+minKin);
  check(maxRatio<=1.00001,'whole production stride '+maxRatio);
  check(restMoves===0&&sheetFlips===0,'rest drift/flips '+restMoves+'/'+sheetFlips);
  result.followers.push({geometry,size,dt,minLead,minKin,maxRatio,restMoves,sheetFlips});
 }
 canBe=originalCanBe;walk=originalWalk;
 // Exercise the complete update in the Chapter I map with roused kin.
 result.dungeon=[];
 for(const dt of [1/60,.05]){
  startChapter(1);G.scene='play';G.paused=false;G.talk=null;G.hitstop=0;
  G.ents=G.ents.filter(e=>e.team==='party');
  const lead=player();
  for(const e of G.ents){if(!e.hero){makeGhostAlly(e);G.talk=null;}}
  IN.keys={};for(let f=0;f<180;f++){G.t+=dt;update(dt);G.talk=null;}
  const initial=G.ents.map(e=>({name:e.name,x:e.x,y:e.y,sp:e.sp,dead:e.dead,stun:e.stun,rejoin:e._rejoin}));let violations=0,travel=0,minLead=99,minKin=99;
  for(let f=0;f<640;f++){
   const crew=G.ents.filter(e=>PartyFollow.eligible(e));
   const before=crew.map(e=>({x:e.x,y:e.y}));
   IN.keys=f<560?{[['d','s','a','w','d','w','a'][Math.floor(f/80)]]:true}:{};
   G.t+=dt;update(dt);G.talk=null;
   travel+=Math.hypot(lead.x-before[0].x,lead.y-before[0].y);
   for(let i=0;i<crew.length;i++)for(let j=i+1;j<crew.length;j++){
    const gap=i===0?2.15:2.05,old=Math.hypot(before[i].x-before[j].x,before[i].y-before[j].y),now=dist(crew[i],crew[j]);
    if(now<Math.min(old,gap)-1e-5)violations++;
    if(i===0)minLead=Math.min(minLead,now);else minKin=Math.min(minKin,now);
   }
  }
  check(violations===0,'Chapter I full update '+dt+' spacing violations '+violations);
  check(travel>2,'Chapter I input causes travel '+travel);
  result.dungeon.push({dt,violations,travel,minLead,minKin,initial,final:G.ents.map(e=>({name:e.name,x:e.x,y:e.y,moving:e.moving,blocked:e._partyBlocked,stun:e.stun})),state:{scene:G.scene,paused:G.paused,sleepShow:G.sleepShow}});
 }
 IN.keys={};
 }catch(e){result.failures.push(e.stack);}
 report.textContent=JSON.stringify({checks:result.checks,failures:result.failures,weapons:result.weapons.length,followerScenarios:result.followers.length},null,2);
 const sheet=document.createElement('canvas');sheet.width=1440;sheet.height=Math.ceil(document.querySelectorAll('#pose-gallery canvas').length/8)*240;const sg=sheet.getContext('2d');sg.fillStyle='#424242';sg.fillRect(0,0,sheet.width,sheet.height);document.querySelectorAll('#pose-gallery canvas').forEach((cv,i)=>sg.drawImage(cv,i%8*180,Math.floor(i/8)*240));result.gallery=sheet.toDataURL('image/png');
 await fetch('/qa-result',{method:'POST',body:JSON.stringify(result,null,2)});
})();

(async function(){
 const result={suite:'Chapter I progression',checks:0,failures:[],observations:[]};
 const check=(v,m)=>{result.checks++;if(!v)result.failures.push(m);};
 const report=document.createElement('pre');report.id='qa-results';document.body.append(report);
 document.getElementById('c').style.display='none';document.body.style='overflow:auto';
 const tap=(x,y)=>{IN.taps.push({x,y});resolveTaps();};
 const fresh=()=>{startChapter(1);G.scene='play';G.paused=false;G.talk=null;G.sleepShow=false;PROMPT=null;promptBtn=null;throwBtn=null;UI.overlayHits=[];UI.portraitHits=[];UI.talkHits=[];IN.keys={};IN.taps=[];TW=116;TH=58;ZOOM=1;CAMSX=0;CAMSY=0;G.ents=G.ents.filter(e=>e.hero);};
 const scene=(x,y)=>{
  const old={w:VW,h:VH};VW=900;VH=650;TW=116;TH=58;ZOOM=1.5;G.cam={x,y};syncCamProj();
  for(const row of G.lvl.seen)row.fill(1);
  const cv=document.createElement('canvas');cv.width=VW;cv.height=VH;const cg=cv.getContext('2d');cg.fillStyle='#171411';cg.fillRect(0,0,VW,VH);
  drawWorld(cg,G.lvl);drawLivingMacar(cg,player());VW=old.w;VH=old.h;return cv;
 };
 try{
 await Promise.all([...new Set([...WORLD_ART_KEYS[1],'ch1_pillar_ruby','ch1_lift_lever','ch1_lift_lever_thrown','rubydoor','pillar'])].map(k=>new Promise(resolve=>loadSpriteKeyNow(k,ok=>{check(ok,'load '+k);resolve();}))));
 fresh();let p=player();p.x=37.15;p.y=22.05;G.lvl.flags.touched=1;G.lvl.flags.cleared=1;
 let s=w2s(36.5,21.5),img=ch1LiftLeverSheet(false),h=86*ZOOM,w=h*img.width/img.height;
 tap(s.x+26*ZOOM+(0.5-0.47)*w,s.y+10*ZOOM-h*.5);
 result.observations.push({leverClick:G.talk&&G.talk.key,destination:p.dest});
 check(G.talk&&G.talk.key==='ch1_lift_pull','click visible lever offers Throw it');
 // A ground click also must offer the actual interaction, not a read-only look.
 G.talk=null;p.dest=null;s=w2s(37.15,22.05);tap(s.x,s.y-22*ZOOM);
 result.observations.push({leverFloorClick:G.talk&&G.talk.key});
 check(G.talk&&G.talk.key==='ch1_lift_pull','click lever foot offers Throw it');
 fresh();p=player();p.x=36.5;p.y=22.25;G.lvl.flags.touched=1;G.lvl.flags.cleared=1;G.lvl.flags.leverThrown=1;
 const pillar=G.props.find(ch1CenterPillar);s=w2s(pillar.x,pillar.y);
 tap(s.x,s.y+pillarRubyLocalY(ZOOM,pillar)-42*ZOOM*.28);
 result.observations.push({rubyClick:G.talk&&G.talk.key,destination:p.dest});
 check(G.talk&&G.talk.key==='rubypillar_touch','click visible pillar ruby offers Touch it');
 fresh();const book=GameSave.captureWorld(G);const sec=G.lvl.secrets.find(s=>s.kind==='teeth');
 const row=Array.from(book.grid[sec.j]);for(let x=sec.i;x<sec.i+sec.w;x++)row[x]=String.fromCharCode(48);book.grid[sec.j]=row.join('');
 applyPlaySave(book);
 check(!sec.open&&G.lvl.grid[sec.j].slice(sec.i,sec.i+sec.w).every(v=>v===1),'restore closed crown-room entrance even when older grid omits its wall');
 const reload=()=>{
  const saved=GameSave.captureWorld(G),geometry={tw:TW,th:TH,zoom:ZOOM};
  fresh();TW=geometry.tw;TH=geometry.th;ZOOM=geometry.zoom;
  applyPlaySave(saved);G.talk=null;PROMPT=null;return player();
 };
 const clickChoice=()=>{
  check(!!G.talk,'choice has a dialogue');if(!G.talk)return;
  drawTalk(ctx);const h=UI.talkHits[0];
  // A stale nearby prompt must not swallow the dialogue choice.
  promptBtn={...h};PROMPT={label:'stale prompt',fn:()=>{check(false,'stale prompt stole dialogue click');}};
  tap(h.x+h.w/2,h.y+h.h/2);promptBtn=null;PROMPT=null;
 };
 const visibleTap=(kind,ptr)=>{
  const s=w2s(36.5,21.5);let x=s.x,y=s.y;
  if(kind==='lever'){x+=26*ZOOM;y-=33*ZOOM;}
  else if(kind==='ruby'){const pr=G.props.find(ch1CenterPillar);y+=pillarRubyLocalY(ZOOM,pr)-42*ZOOM*.28;}
  else {const door=G.lvl.rubyDoor,yp=rubyDoorPlaneY(door),ss=w2s(door.x,yp);x=ss.x;y=ss.y-rubyDoorH()*.5;}
  onDown('qa-ch1',x,y,ptr);onUp('qa-ch1',x,y);resolveTaps();
 };
 for(const dt of [1/60,.05])for(const ptr of ['mouse','touch'])for(const small of [false,true]){
  const tag=ptr+' '+(small?'phone':'laptop')+' dt='+dt;fresh();
  TW=small?66:116;TH=small?34:58;ZOOM=small?.75:1.25;
  // Place the drawn props within the viewport, away from the action buttons.
  UI.buttons=[];G.hudMore=0;G.inspect=null;G.showObjs=0;G.showLog=0;UI.logHit=null;UI.objHit=null;UI.stickHome={x:0,y:0,r:0};
  let lead=player();lead.x=36.5;lead.y=8.43;
  let cs=w2s(36.5,7.28);CAMSX+=VW*.65-cs.x;CAMSY+=VH*.6-cs.y;
  visibleTap('door',ptr);check(G.talk&&G.talk.key==='ruby_door',tag+' visible door activation');clickChoice();
  check(G.lvl.flags.touched===1&&G.ents.filter(e=>e.rubyDrop&&!e.dead).length===6,tag+' door wakes exactly six guardians');
  lead=reload();check(G.lvl.flags.touched===1&&rubyGuardiansLeft(),tag+' reload keeps living guardians');
  lead.x=37.15;lead.y=22.05;cs=w2s(36.5,21.5);CAMSX+=VW*.65-cs.x;CAMSY+=VH*.7-cs.y;
  visibleTap('lever',ptr);check(G.talk&&G.talk.key==='ch1_lift_lever_look',tag+' lever is locked during guardian fight');G.talk=null;
  check(!throwCh1LiftLever()&&!touchCh1RubyPillar()&&!G.lvl.flags.elevReady,tag+' locked helper gates');
  for(const e of G.ents)if(e.rubyDrop)e.dead=1;
  G.ents.push(FOE.rat());G.ents[G.ents.length-1].x=80;G.ents[G.ents.length-1].y=21;
  PROMPT=null;G.lvl.tick();check(G.lvl.flags.cleared===1,tag+' final guardian clears despite optional rat');
  lead=reload();lead.x=37.15;lead.y=22.05;cs=w2s(36.5,21.5);CAMSX+=VW*.65-cs.x;CAMSY+=VH*.7-cs.y;
  visibleTap('ruby',ptr);check(G.talk&&G.talk.key==='rubypillar_touch_locked',tag+' pillar first stays locked');G.talk=null;
  visibleTap('lever',ptr);check(G.talk&&G.talk.key==='ch1_lift_pull',tag+' visible lever offers throw');clickChoice();
  check(G.lvl.flags.leverThrown===1&&G.lvl.flags.elevReady===1&&G.lvl.flags.elevatorGone===1,tag+' lever activates elevator without a ruby touch');
  check(ch1LiftLeverSheet(false)===ch1LiftLeverSheet(true),tag+' lever keeps its detailed art after activation');
  check(GameSave.read(localStorage).play.flags.elevReady===1,tag+' lever activation autosaves');
  lead=reload();lead.x=36.5;lead.y=22.25;cs=w2s(36.5,21.5);CAMSX+=VW*.65-cs.x;CAMSY+=VH*.7-cs.y;
  visibleTap('ruby',ptr);check(G.talk&&G.talk.key==='ch1_lift_ride',tag+' ready lift survives reload');clickChoice();
  check(G.scene==='camp'&&G.cleared[1]&&G.unlocked>=2,tag+' ride completes Chapter I');
  drawCamp(ctx);const deeper=menuHits[1];
  check(!!deeper,tag+' camp offers Go deeper');
  if(deeper){tap(deeper.x+deeper.w/2,deeper.y+deeper.h/2);}
  check(G.ch===2&&G.lvl.n===2&&G.scene==='play'&&!!player(),tag+' Go deeper enters playable second level');
 }
 // Description prompts and a final kill before the next world tick must be actionable.
 fresh();G.lvl.flags.touched=1;G.lvl.flags.cleared=0;
 startTalk('ch1_lift_lever_look');
 check(G.talk&&G.talk.key==='ch1_lift_pull','lever description upgrades after last guardian without another tick');
 clickChoice();
 check(G.lvl.flags.elevReady===1&&G.lvl.flags.cleared===1,'dialogue throw records encounter clear and activates lift');
 startTalk('ch1_lift_lever_thrown_look');
 check(G.talk&&G.talk.key==='ch1_lift_ride','activated lever dialogue offers descent');
 clickChoice();check(G.scene==='camp'&&G.unlocked>=2,'lever dialogue descent unlocks second chapter');
 check(WORLD_ART_KEYS[1].includes('ch1_pillar_ruby'),'detailed pillar ruby is a required Chapter I preload');
 // A tap made out of reach walks to the lever and evaluates its current state on arrival.
 for(const dt of [1/60,.05]){
  fresh();let lead=player();lead.x=39.5;lead.y=24.5;G.lvl.flags.touched=1;G.lvl.flags.cleared=1;
  const s=w2s(36.5,21.5);tap(s.x+26*ZOOM,s.y-33*ZOOM);
  check(lead.dest&&lead.dest.ch1&&lead.dest.look==='ch1_lift_lever_look','out-of-reach tap queues lever interaction '+dt);
  G.hitstop=0;IN.keys={};for(let i=0;i<300&&!G.talk;i++){G.t+=dt;update(dt);}
  check(G.talk&&G.talk.key==='ch1_lift_pull','walking arrival opens actionable lever '+dt);
 }
 // Exercise the actual shovel timer, with passive discovery already tried.
 for(const dt of [1/60,.05])for(const column of [105,106,107]){
  fresh();let lead=player();const wall=G.lvl.secrets.find(s=>s.kind==='teeth');wall.passTried=1;
  G.lvl.flags.farEast=1;G.secretSearch=0;G.searching=0;G.hitstop=0;G.digBoost=0;
  lead.x=column+.5;lead.y=16.55;lead.fdx=0;lead.fdy=-1;lead.dest=null;
  const tag='crown wall column '+column+' dt='+dt;
  check(!diggable(G.lvl,column,15)&&diggable(G.lvl,column,15,true),tag+' shovel allowed while generic terrain damage stays blocked');
  fire('shovel');check(G.digging&&G.dig&&G.dig.i===column&&G.dig.j===15,tag+' shovel starts on wall');
  const need=digNeedMinutes(),steps=Math.ceil((need-.2)/dt);
  for(let i=0;i<steps;i++){G.t+=dt;update(dt);}
  check(!wall.open&&G.lvl.grid[15][column]===1,tag+' wall stays sealed until dig finishes');
  for(let i=0;i<30&&!wall.open;i++){G.t+=dt;update(dt);}
  check(wall.open&&G.lvl.flags.teethRoom&&G.lvl.grid[15].slice(105,108).every(v=>v===0),tag+' timed dig opens whole passage and builds chamber');
  check(!G.digging&&!G.dig&&G.props.filter(pr=>pr.k==='bonecrown'&&!pr.taken).length===1,tag+' dig stops and crown exists once');
  lead=reload();check(G.lvl.secrets.find(s=>s.kind==='teeth').open&&G.lvl.grid[15].slice(105,108).every(v=>v===0),tag+' dug opening survives reload');
  lead.x=106.5;lead.y=16.55;lead.dest={x:107.5,y:10.5};G.hitstop=0;
  for(let i=0;i<500&&lead.y>13.5;i++){G.t+=dt;update(dt);if(G.talk&&G.talk.key==='teeth_chapel_enter')G.talk=null;}
  result.observations.push({tag,x:lead.x,y:lead.y,talk:G.talk&&G.talk.key});
  check(lead.y<13.5,tag+' Macar walks through dug wall into chamber');
 }
 fresh();openSecret(G.lvl.secrets.find(s=>s.kind==='teeth'));const opened=GameSave.captureWorld(G);
 check(G.lvl.grid[15].slice(102,105).every(v=>v===1)&&G.lvl.grid[15].slice(108,112).every(v=>v===1),'opening the crown room preserves both bone-masonry jambs');
 const crown=opened.props.find(pr=>pr.k==='bonecrown');if(crown)crown.taken=1;
 opened.grid[25]=opened.grid[25].slice(0,110)+'4'+opened.grid[25].slice(111);
 fresh();applyPlaySave(opened);const restored=G.lvl.secrets.find(s=>s.kind==='teeth');
 check(restored.open&&G.lvl.grid[15].slice(105,108).every(v=>v===0),'opened entrance stays open after reload');
 check(G.lvl.grid[25][110]===4,'restore preserves unrelated excavated terrain');
 check(G.props.filter(pr=>pr.k==='bonecrown').length===1&&G.props.find(pr=>pr.k==='bonecrown').taken,'restore does not duplicate or respawn taken crown');
 const older=GameSave.captureWorld(G);older.props=older.props.filter(pr=>pr.k!=='lift'&&!ch1CenterPillar(pr));
 older.secrets.find(s=>s.kind==='teeth').i=111;
 fresh();applyPlaySave(older);
 check(G.lvl.secrets.find(s=>s.kind==='teeth').open,'legacy entrance position retains discovered room');
 check(G.props.filter(ch1CenterPillar).length===1&&G.props.filter(pr=>pr.k==='lift'&&pr.x===36.5).length===1,'older save restores missing elevator and pillar once');
 applyPlaySave(older);check(G.props.filter(ch1CenterPillar).length===1,'repeated reload does not stack pillars');
 // Actual Chapter I room geometry: retreat from physically valid points
 // already inside the decorative margin, as may occur in older saves.
 fresh();G.talk=null;const leader=player();G.ents=G.ents.filter(e=>e.hero);
 for(const region of [{name:'ruby approach',x0:33,x1:40,y0:8,y1:16},{name:'bone room',x0:105,x1:113,y0:8,y1:14}]){
  let cases=0;
  for(let y=region.y0;y<=region.y1;y++)for(let x=region.x0;x<=region.x1;x++)for(const [ox,oy] of [[.5,.55],[.5,.6],[.55,.5],[.6,.5],[.4,.5],[.5,.4]]){
   leader.x=x+ox;leader.y=y+oy;
   const physical=walk(leader.x,leader.y,leader)&&walk(leader.x+leader.r,leader.y,leader)&&walk(leader.x-leader.r,leader.y,leader)&&walk(leader.x,leader.y+leader.r,leader)&&walk(leader.x,leader.y-leader.r,leader);
   if(!physical||wallFaceClearAt(leader.x,leader.y,leader))continue;
   for(const dt of [1/60,.05]){
    leader.x=x+ox;leader.y=y+oy;const old={x:leader.x,y:leader.y};
    move(leader,(x+.5-leader.x)*4,(y+.5-leader.y)*4,dt);
    check(dist(old,leader)>0,region.name+' exits wall margin at '+x+','+y+' dt='+dt);cases++;
   }
  }
  result.observations.push({tag:region.name+' margin escape',cases});
 }
 // Toy combat salvage and persistent floor travel.
 fresh();let toy=windupToyProp(),lead=player();lead.x=toy.x-.5;lead.y=toy.y;lead.fdx=1;lead.fdy=0;
 const beforeLoot=G.loot.length;meleeSwing(lead,2.5,1.4,20,'#fff');
 check(toy.gone&&G.loot.length===beforeLoot+3,'melee hit explodes toy into three floor drops');
 const boomCount=sfx.plays.filter(k=>k==='explosion').length;
 check(boomCount>0,'toy destruction starts the boom');
 meleeSwing(lead,2.5,1.4,20,'#fff');check(G.loot.length===beforeLoot+3&&sfx.plays.filter(k=>k==='explosion').length===boomCount,'toy cannot duplicate salvage or boom');
 const salvage=G.loot.slice(-3);check(['spring','gear','emerald'].every(k=>salvage.some(q=>q.kind===k&&q.res[k]===1&&sprReady('loot_'+k))),'all three crafting components have distinct loaded floor art');
 check(salvage.every(q=>q.dropHold),'fresh salvage remains visible before pickup');
 result.toyGallery=scene(toy.x,toy.y).toDataURL('image/png');
 const toySave=GameSave.snapshot(G);GameSave.applyCampaign(G,toySave);applyPlaySave(toySave.play);
 check(!windupToyProp()&&G.loot.some(q=>q.res&&q.res.emerald===1),'destroyed toy and salvage survive reload');
 const recovered=G.loot.filter(q=>['gear','spring','emerald'].includes(q.kind));
 check(recovered.length===3&&recovered.every(q=>q.dropHold),'three visible salvage drops and pickup hold survive reload');
 recovered.forEach(q=>takeLoot(q,true));
 check(G.res.spring>=1&&G.res.gear>=1&&G.res.emerald>=1,'salvage can be collected for crafting');
 const ammoBefore=packOf('macar').ammo||0;
 const crafted=CraftingEngine.craftItem('emerald_clockwork_bolts',makeCraftingBridge());
 check(crafted.ok&&(packOf('macar').ammo||0)===ammoBefore+12,'spring gear emerald craft twelve bolts');
 fresh();toy=windupToyProp();lead=player();lead.x=toy.x-.2;lead.y=toy.y;
 const bolt=shoot(lead,toy.x,toy.y,12,'bolt','#fff',9);stepShot(bolt,1/60);
 check(toy.gone&&bolt.life===0,'hero crossbow bolt explodes toy and stops');
 for(const dt of [1/60,.05]){
  fresh();toy=windupToyProp();lead=player();lead.x=toy.x-.6;lead.y=toy.y;lead.atk=0;lead.ct=0;lead.atkMax=1;G.hitstop=0;
  const axe={n:'Iron Axe',k:'weapon',macarHeld:1};G.equipped={primary:axe,weapon:axe};
  await Promise.all(['macar_axe','macar_axe_atk',...MacarIdleAtlas.keys('macar_axe')].map(k=>new Promise(resolve=>loadSpriteKeyNow(k,()=>resolve()))));
  const booms=sfx.plays.filter(k=>k==='explosion').length;fire('attack');
  const attackPose=MacarSharedAtlas.pose(livingMacarBlitKey(livingMacarAnimKey(lead)));
  check(attackPose&&attackPose.weapon==='axe'&&attackPose.stage==='attack','Attack button renders axe swing '+dt);
  for(let i=0;i<120&&!toy.gone;i++){G.t+=dt;update(dt);if(G.talk)G.talk=null;}
  result.observations.push({tag:'axe toy attack',dt,gone:toy.gone,loot:G.loot.map(q=>({kind:q.kind,gone:q.gone,hold:q.dropHold})),booms:sfx.plays.filter(k=>k==='explosion').length-booms,atk:lead.atk,swung:lead.swung,ranged:lead.ranged,defending:lead.defending,distance:dist(lead,toy),attack:lead._attack});
  check(toy.gone&&G.loot.filter(q=>['gear','spring','emerald'].includes(q.kind)).length===3&&sfx.plays.filter(k=>k==='explosion').length===booms+1,'actual axe Attack/update path destroys toy once '+dt);
 }
 fresh();lead=player();lead.x=106.5;lead.y=17;lead.fdx=0;lead.fdy=-1;
 const closed=scene(106.5,16.5);openSecret(G.lvl.secrets.find(s=>s.kind==='teeth'));const open=scene(106.5,16.5);
 const entrance=document.createElement('canvas');entrance.width=1800;entrance.height=650;entrance.getContext('2d').drawImage(closed,0,0);entrance.getContext('2d').drawImage(open,900,0);result.entranceGallery=entrance.toDataURL('image/png');
 // Restore the fresh toy-destruction world for the floor round trip below.
 fresh();toy=windupToyProp();explodeWindupToy(toy);
 check(!travelFloor(2)&&G.ch===1,'floor one down stays locked until ruby encounter complete');
 G.lvl.flags.elevReady=1;G.lvl.flags.travelMarker='preserved';
 check(travelFloor(2)&&G.ch===2,'floor one lever descends after activation');
 check(G.props.some(q=>q.k==='floorRubyDoor')&&G.props.some(q=>q.k==='floorlever'),'floor two has ruby door and lever');
 check(!travelFloor(3),'later floor down is ruby locked');
 openFloorRuby();pickTalk(0);check(G.lvl.flags.floorRubyActivated===1,'ruby dialogue unlocks descent');
 const rememberedFoe=G.ents.find(e=>e.team==='foe'&&!e.dead);if(rememberedFoe){rememberedFoe.hp=3;rememberedFoe.x+=.1;}
 const foeId=rememberedFoe&&rememberedFoe.id;
 G.lvl.flags.floorRubyActivated=1;G.lvl.flags.travelMarker='floor two';
 check(travelFloor(1)&&G.lvl.flags.travelMarker==='preserved','upstairs restores first floor state');
 check(travelFloor(2)&&G.lvl.flags.travelMarker==='floor two'&&floorTravelReady(),'return restores second floor ruby activation');
 if(foeId)check(G.ents.some(e=>e.id===foeId&&e.hp===3),'enemy damage persists across up/down travel');
 const floorLever=G.props.find(q=>q.k==='floorlever');lead=player();lead.x=floorLever.x;lead.y=floorLever.y;G.talk=null;PROMPT=null;promptBtn=null;
 const ls=w2s(floorLever.x,floorLever.y);tap(ls.x,ls.y-35*ZOOM);
 check(G.talk&&G.talk.key==='floor_travel'&&G.talk.choices.some(q=>q.t.includes('Go up'))&&G.talk.choices.some(q=>q.t.includes('Go down')),'painted lever click opens both available travel choices');G.talk=null;
 const floorSave=GameSave.snapshot(G),campaign={};GameSave.write(localStorage,floorSave);GameSave.applyCampaign(campaign,GameSave.read(localStorage));
 check(campaign.floorWorlds[1].flags.travelMarker==='preserved'&&campaign.floorWorlds[1].props.length>0,'visited floor geometry and props survive saved campaign');
 for(let n=3;n<=5;n++){G.lvl.flags.floorRubyActivated=1;check(travelFloor(n)&&G.ch===n,'travel down to floor '+n);check(G.props.some(q=>q.k==='floorRubyDoor')&&G.props.some(q=>q.k==='floorlever'),'travel props floor '+n);check(G.props.filter(q=>['floorRubyDoor','floorlever'].includes(q.k)).every(q=>canBe(q.x,q.y,player().r||.36,player())),'travel controls on reachable floor tiles '+n);}
 const rubyWalls=document.createElement('canvas');rubyWalls.width=1800;rubyWalls.height=1300;
  for(let n=2;n<=5;n++){
   startChapter(n);G.scene='play';const door=G.props.find(p=>p.k==='floorRubyDoor');
   check(!!door&&Number.isFinite(door.wallY),'wall-anchored ruby door floor '+n);
   if(!door)continue;
   const x=Math.floor(door.x),y=Math.round(door.wallY+.42);
   check([-1,0,1].every(dx=>G.lvl.grid[y-1][x+dx]===1),'three-cell stone backing floor '+n);
   check([-1,0,1].every(dx=>[0,1,2].every(dy=>isWalkTile(G.lvl.grid[y+dy][x+dx]))),'clear ruby approach floor '+n);
   check(canBe(door.x,door.y,player().r||.36,player()),'ruby interaction point accessible floor '+n);
   await Promise.all(WORLD_ART_KEYS[n].map(k=>new Promise(resolve=>loadSpriteKeyNow(k,()=>resolve()))));
   const tile=scene(door.x,door.y);rubyWalls.getContext('2d').drawImage(tile,((n-2)%2)*900,Math.floor((n-2)/2)*650);
   const point=w2s(door.x,floorRubyPlaneY(door));check(floorTravelScreenHit({x:point.x,y:point.y-75*ZOOM})===door,'wall art click target floor '+n);
   G.lvl.flags.floorRubyActivated=1;door.x=G.lvl.spawn.x;door.y=G.lvl.spawn.y;delete door.wallY;ensureFloorTravelProps();
   check(Number.isFinite(door.wallY)&&floorTravelReady(),'old floating door migrates without relocking floor '+n);
  }
  result.rubyWallGallery=rubyWalls.toDataURL('image/png');
  check(!travelFloor(6),'no nonexistent sixth floor');
 check(GameSave.read(localStorage).ch===5&&!!GameSave.read(localStorage).floorWorlds[4],'all visited floors save through floor five');
 fresh();G.lvl.flags.elevReady=1;G.lvl.flags.campMarker='kept';endChapter();startChapter(2);
 check(travelFloor(1)&&G.lvl.flags.campMarker==='kept','original camp Go deeper route also preserves the previous floor');
 }catch(e){result.failures.push(e.stack);}
 // Render the later-floor controls for visual review after all state checks.
 await Promise.all(WORLD_ART_KEYS[2].map(k=>new Promise(resolve=>loadSpriteKeyNow(k,()=>resolve()))));
 startChapter(2);G.scene='play';G.lvl.flags.floorRubyActivated=0;G.equipped={primary:{n:"Macar's War Hammer",k:'weapon'}};
 const visual=document.createElement('canvas');visual.width=900;visual.height=700;
 const oldW=VW,oldH=VH;VW=900;VH=700;TW=116;TH=58;ZOOM=1;
 CAMSX=0;CAMSY=0;const center=w2s(player().x,player().y);CAMSX=450-center.x;CAMSY=350-center.y;
 result.observations.push({tag:'floor controls',spawn:G.lvl.spawn,props:G.props.filter(p=>['floorlever','floorRubyDoor'].includes(p.k)).map(p=>({k:p.k,x:p.x,y:p.y,ready:sprReady(propSpriteKey(p))}))});
 drawWorld(visual.getContext('2d'),G.lvl);VW=oldW;VH=oldH;
 document.body.insertBefore(visual,report);
 report.textContent=JSON.stringify(result,null,2);
 await fetch('/qa-result',{method:'POST',body:JSON.stringify(result,null,2)});
})();

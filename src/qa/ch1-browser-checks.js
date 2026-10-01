(async function(){
 const result={suite:'Chapter I progression',checks:0,failures:[],observations:[]};
 const check=(v,m)=>{result.checks++;if(!v)result.failures.push(m);};
 const report=document.createElement('pre');report.id='qa-results';document.body.append(report);
 document.getElementById('c').style.display='none';document.body.style='overflow:auto';
 const tap=(x,y)=>{IN.taps.push({x,y});resolveTaps();};
 const fresh=()=>{startChapter(1);G.scene='play';G.paused=false;G.talk=null;G.sleepShow=false;PROMPT=null;promptBtn=null;throwBtn=null;UI.overlayHits=[];UI.portraitHits=[];UI.talkHits=[];IN.keys={};IN.taps=[];TW=116;TH=58;ZOOM=1;CAMSX=0;CAMSY=0;G.ents=G.ents.filter(e=>e.hero);};
 try{
 await Promise.all(['ch1_pillar_ruby','ch1_lift_lever','ch1_lift_lever_thrown','rubydoor','pillar'].map(k=>new Promise(resolve=>loadSpriteKeyNow(k,ok=>{check(ok,'load '+k);resolve();}))));
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
  check(G.lvl.flags.leverThrown===1&&!G.lvl.flags.elevReady,tag+' lever alone does not descend');
  lead=reload();lead.x=36.5;lead.y=22.25;cs=w2s(36.5,21.5);CAMSX+=VW*.65-cs.x;CAMSY+=VH*.7-cs.y;
  visibleTap('ruby',ptr);check(G.talk&&G.talk.key==='rubypillar_touch',tag+' restored lever arms visible ruby');clickChoice();
  check(G.lvl.flags.elevReady===1&&G.lvl.flags.elevatorGone===1,tag+' ruby starts descent');
  lead=reload();lead.x=36.5;lead.y=22.25;cs=w2s(36.5,21.5);CAMSX+=VW*.65-cs.x;CAMSY+=VH*.7-cs.y;
  visibleTap('ruby',ptr);check(G.talk&&G.talk.key==='ch1_lift_ride',tag+' ready lift survives reload');clickChoice();
  check(G.scene==='camp'&&G.cleared[1]&&G.unlocked>=2,tag+' ride completes Chapter I');
 }
 // A tap made out of reach walks to the lever and evaluates its current state on arrival.
 for(const dt of [1/60,.05]){
  fresh();let lead=player();lead.x=39.5;lead.y=24.5;G.lvl.flags.touched=1;G.lvl.flags.cleared=1;
  const s=w2s(36.5,21.5);tap(s.x+26*ZOOM,s.y-33*ZOOM);
  check(lead.dest&&lead.dest.ch1&&lead.dest.look==='ch1_lift_lever_look','out-of-reach tap queues lever interaction '+dt);
  G.hitstop=0;IN.keys={};for(let i=0;i<300&&!G.talk;i++){G.t+=dt;update(dt);}
  check(G.talk&&G.talk.key==='ch1_lift_pull','walking arrival opens actionable lever '+dt);
 }
 fresh();openSecret(G.lvl.secrets.find(s=>s.kind==='teeth'));const opened=GameSave.captureWorld(G);
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
 }catch(e){result.failures.push(e.stack);}
 report.textContent=JSON.stringify(result,null,2);
 await fetch('/qa-result',{method:'POST',body:JSON.stringify(result,null,2)});
})();

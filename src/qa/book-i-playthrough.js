(async function(){
 const result={suite:'Book I completion path',checks:0,failures:[],floors:[],method:'Controlled story-path regression: encounters resolved through damage(), not a difficulty/balance playtest. Interactive review uses the resulting test saves.'};
 const check=(v,m)=>{result.checks++;if(!v)result.failures.push(m);};const report=document.createElement('pre');document.body.append(report);document.getElementById('c').style.display='none';document.body.style='overflow:auto;background:#181411;color:white;height:auto';
 const savedFloors={};
 const visit=(x,y)=>{const p=player();p.x=x;p.y=y;p.dest=null;p.moving=0;G.talk=null;PROMPT=null;G.lvl.tick(.05);};
 const clearEncounter=(except=null)=>{const p=player();for(const e of [...G.ents])if(e!==except&&e.team==='foe'&&!e.dead){for(let i=0;i<12&&!e.dead;i++)damage(e,1000000,'#fff',{hero:1,magic:1,team:'party'});}G.talk=null;G.lvl.tick(.05);};
 const activate=()=>{openFloorRuby();const q=G.talk&&G.talk.choices.find(q=>/Activate/.test(q.t));if(q&&q.then)q.then();closeTalk();};
 const connected=(from,to)=>{const L=G.lvl,q=[[Math.floor(from.x),Math.floor(from.y)]],seen=new Set();for(let i=0;i<q.length;i++){const [x,y]=q[i],k=x+','+y;if(seen.has(k)||!L.grid[y]||!isWalkTile(L.grid[y][x]))continue;seen.add(k);if(x===Math.floor(to.x)&&y===Math.floor(to.y))return true;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(!seen.has((x+dx)+','+(y+dy)))q.push([x+dx,y+dy]);}return false;};
 const scene=(x,y)=>{VW=900;VH=600;TW=116;TH=58;ZOOM=1.35;G.cam={x,y};syncCamProj();for(const row of G.lvl.seen)row.fill(1);const cv=document.createElement('canvas');cv.width=900;cv.height=600;cv.style='position:static;width:900px;height:600px';const g=cv.getContext('2d');g.fillStyle='#171411';g.fillRect(0,0,900,600);drawWorld(g,G.lvl);drawLivingMacar(g,player());return cv;};
 try{
 const keys=[...new Set([2,3,4,5].flatMap(n=>WORLD_ART_KEYS[n]).concat(['stairs','lift','bronzedoor','rubydoor','bone_crown']))].filter(k=>!/_w3$/.test(k));
 await Promise.all(keys.map(k=>new Promise(resolve=>loadSpriteKeyNow(k,ok=>{check(ok,'load '+k);resolve();}))));
 const gallery=document.createElement('canvas');gallery.width=1800;gallery.height=1200;const gg=gallery.getContext('2d');
 for(let n=2;n<=5;n++){
  startChapter(n);G.scene='play';G.paused=false;G.talk=null;player().hp=player().maxhp=1000000;
  const L=G.lvl,door=G.props.find(p=>p.k==='floorRubyDoor'),lever=G.props.find(p=>p.k==='floorlever');
  check(door&&lever,'ruby and lever floor '+n);check(connected(L.spawn,door),'connected ruby approach floor '+n);check(connected(L.spawn,lever),'connected lever floor '+n);
  if(n<5){check(!!L.stair,'authored descent floor '+n);check(connected(L.spawn,L.stair),'connected natural stair floor '+n);check(!useChapterDescent(),'sealed natural exit floor '+n);}
  activate();check(floorTravelReady(),'ruby dialogue activation floor '+n);
  if(n===2){
   visit(40,16);check(L.objs[0].d,'scout four-way objective');visit(40,32);clearEncounter();check(L.flags.fought&&L.objs[1].d,'goblin camp objective');
   const noz=G.ents.find(e=>e.name==='Noz'&&!e.dead);if(noz){visit(noz.x+.7,noz.y);if(PROMPT&&/Untie/.test(PROMPT.label))PROMPT.fn();check(L.flags.freed&&L.objs[2].d,'Noz rescue interaction');closeTalk();}
   visit(L.bell.x,L.bell.y);if(PROMPT&&/Noz/.test(PROMPT.label))PROMPT.fn();check(L.flags.traded&&L.objs[3].d,'bronze-door Noz interaction');const wares=G.talk&&G.talk.choices.find(q=>/wares|Trade/.test(q.t));if(wares&&wares.then)wares.then();check(G.scene==='trade','Noz trade opens');G.scene='play';G.talk=null;
   const secret=L.secrets.find(s=>s.kind==='warrens');openSecret(secret);check(!!L.warrenStair&&connected(L.spawn,L.warrenStair),'warren staircase connected');clearEncounter();const climb=L.climbs.find(c=>Math.hypot(c.x-L.warrenStair.x,c.y-L.warrenStair.y)<.1);climb.fn();check(L.flags.kingLevel&&L.objs[5].d,'Goblin King descent interaction');check(G.ents.some(e=>!e.dead&&e.name==='Goblin King'),'Goblin King spawns');clearEncounter();check(!G.ents.some(e=>!e.dead&&e.name==='Goblin King'),'Goblin King defeated through damage handler');
  }else if(n===3||n===4){
   check(!useChapterDescent(),'guardian prevents premature exit floor '+n);
   visit(n===3?26:28,28);clearEncounter();visit(n===3?46:50,n===3?20:16);clearEncounter();visit(n===3?48:52,40);
   check(L.flags.boss,'story guardian spawns floor '+n);check(G.ents.some(e=>!e.dead&&(n===3?e.kind==='construct':e.kind==='elderbrain')),'correct guardian floor '+n);clearEncounter();
   check(L.flags.done&&L.objs.every(o=>o.d),'story objectives complete floor '+n);check(G.scene==='play','guardian victory waits for stair floor '+n);
   const side=n===3?[[90,14],[96,34],[88,58],[30,76],[50,80],[12,74],[106,48],[128,48],[50,104],[126,10],[120,80],[12,102],[88,102]]:[[90,14],[50,74],[10,56],[98,48],[28,62],[122,48],[50,96],[122,14],[10,84],[28,92],[80,72]];for(const [x,y] of side){visit(x,y);clearEncounter();check(!G.ents.some(e=>e.team==='foe'&&!e.dead),'side encounter resolved floor '+n+' '+x+','+y);}
  }else{
   visit(29,20);const king=G.ents.find(e=>e.kind==='king'&&!e.dead);check(!!king,'Mordain spawns');damage(king,Math.ceil(king.maxhp*.4),'#fff',{magic:1});L.tick(.05);check(L.flags.p2,'Mordain gold reinforcement phase');clearEncounter(king);damage(king,Math.ceil(king.maxhp*.3),'#fff',{magic:1});L.tick(.05);check(L.flags.p3,'Mordain platinum reinforcement phase');clearEncounter(king);for(const [x,y] of [[72,22],[29,62],[96,22],[29,86],[10,88],[84,10],[64,42],[8,74]]){visit(x,y);clearEncounter(king);}clearEncounter();check(L.flags.done&&L.objs.every(o=>o.d),'temple objectives complete');
  }
  const view=n<5?L.stair:{x:29,y:20};visit(view.x,view.y+2);clearEncounter();const picture=scene(view.x,view.y);gg.drawImage(picture,(n-2)%2*900,Math.floor((n-2)/2)*600);
  const marker='verified floor '+n;L.flags.playthroughMarker=marker;const loot=G.loot.length;const foe=G.ents.find(e=>e.team==='foe');const foeId=foe&&foe.id;
  if(n<5){player().x=L.stair.x;player().y=L.stair.y+1;check(canBe(player().x,player().y,player().r,player()),'clear stair interaction floor '+n);check(useChapterDescent()&&G.scene==='camp','natural descent enters camp floor '+n);}
  savedFloors[n]=capturePlaySave();G._keepProgress=1;G._loadSnap={play:savedFloors[n],scene:'play'};startChapter(n);
  if(n===5)check(G.scene==='win'&&G.cleared[5],'saved completed Book I resumes victory');
  check(G.lvl.flags.playthroughMarker===marker&&floorTravelReady(),'reload preserves progression floor '+n);check(G.loot.length===loot,'reload preserves loot floor '+n);if(foeId)check(G.ents.some(e=>e.id===foeId&&e.dead),'reload preserves defeated foes floor '+n);
  result.floors.push({n,objectives:G.lvl.objs.map(o=>({text:o.t,done:o.d})),loot,stair:G.lvl.stair,ruby:{x:door.x,y:door.y,wallY:door.wallY}});
 }
 result.bookIGallery=gallery.toDataURL('image/png');
 }catch(e){result.failures.push(e.stack);}
 report.textContent=JSON.stringify({suite:result.suite,checks:result.checks,failures:result.failures,floors:result.floors},null,2);await fetch('/qa-result',{method:'POST',body:JSON.stringify(result)});
 // Review the verified saves interactively without touching a production save.
 const controls=document.createElement('div');controls.style='position:relative;padding:12px';const select=document.createElement('select');for(let n=2;n<=5;n++){const o=document.createElement('option');o.value=n;o.textContent='Floor '+n;select.append(o);}controls.append(select);const status=document.createElement('p');controls.append(status);const host=document.createElement('div');document.body.prepend(host);document.body.prepend(controls);
 const paint=()=>{host.replaceChildren(scene(player().x,player().y));status.textContent='Floor '+G.ch+' · '+G.scene+' · '+(floorTravelReady()?'ruby active':'ruby sealed');};
 const button=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>{fn();paint();};controls.append(b);};
 const load=()=>{const n=+select.value;G._keepProgress=1;G._loadSnap={play:savedFloors[n],scene:'play'};startChapter(n);G.talk=null;G.scene='play';};
 button('Review floor',load);button('View ruby door',()=>{const d=G.props.find(p=>p.k==='floorRubyDoor');player().x=d.x;player().y=d.y+.8;});button('View stair',()=>{if(G.lvl.stair){player().x=G.lvl.stair.x;player().y=G.lvl.stair.y+1.2;}});button('Use natural descent',useChapterDescent);button('Walk right',()=>{for(let i=0;i<40;i++)steerWalk(player(),1,-1,player().sp,1/60);});load();paint();
})();

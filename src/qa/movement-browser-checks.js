(async function(){
 const result={suite:'Party movement regression',checks:0,failures:[],observations:[]};
 const check=(v,m)=>{result.checks++;if(!v&&result.failures.length<30)result.failures.push(m);};
 const report=document.createElement('pre');document.body.append(report);
 document.getElementById('c').style.display='none';document.body.style='overflow:auto';
 const fresh=()=>{
  startChapter(1);G.scene='play';G.paused=false;G.talk=null;G.sleepShow=null;G.hitstop=0;
  G.ents=G.ents.filter(e=>e.hero);G.props=[];G.loot=[];G.shots=[];G.thrown=[];G.parts=[];
  G.lvl.tick=()=>{};G.lvl.secrets=[];G.lvl.flags={};G.lvl.w=42;G.lvl.h=36;
  G.lvl.grid=Array.from({length:36},(_,y)=>Array.from({length:42},(_,x)=>x===0||y===0||x===41||y===35?1:0));
  G.trail=[];G.searching=0;G.secretSearch=0;G.digging=0;G.dig=null;IN.keys={};IN.stick=null;
  Navigation.invalidate();const p=player();p.x=8;p.y=8;p.sp=p.baseSp=4.3;p.dest=null;p.atk=0;p.aim=null;
  return p;
 };
 const timings=[];
 const tick=dt=>{G.t+=dt;const t=performance.now();update(dt);timings.push(performance.now()-t);if(G.talk)G.talk=null;};
 try{
 await Promise.all(['macar_axe','macar_axe_idle_s','macar_axe_atk','macar_xbow'].map(k=>new Promise(resolve=>loadSpriteKeyNow(k,ok=>{check(ok,'load '+k);resolve();}))));
 let p=fresh();G.equipped={};
 equipPackItem({n:'Crossbow',k:'weapon'},{silent:true});equipPackItem({id:'iron_axe',n:'Iron Axe',k:'weapon'},{silent:true});
 armBowPose(p);equipPackItem(G.equipped.primary,{silent:true});p.fdx=p.fdy=Math.SQRT1_2;
 check(livingMacarIdleKey()==='macar_axe'&&livingMacarAnimKey(p)==='macar_axe_idle_s','equipping axe after bow uses down-facing axe sprite');
 check(SPRITE_FILES.macar_axe_idle_s.endsWith('dwarf_macar_idle_axe_s_v3.png'),'corrected down-facing axe artwork is used');
 check(SPRITE_FILES.macar_axe===SPRITE_FILES.macar_axe_idle_s&&SPR.macar_axe.__macarDirectionalIdle,'inventory and cold-heading fallback use the same corrected axe');
 const saved=GameSave.snapshot(G),restored={};GameSave.applyCampaign(restored,saved);
 check(MacarEquipment.heldKind(restored.equipped)==='axe','axe stays selected after save reload');
 for(const dt of [1/60,.05])for(const boots of [false,true]){
  p=fresh();G.equipped={boots:boots?{n:'Boots of Speed'}:null};
  const start={x:p.x,y:p.y};p.dest={x:12,y:8};
  for(let i=0;i<Math.ceil(3/dt)&&p.dest;i++)tick(dt);
  check(!p.dest&&Math.hypot(p.x-12,p.y-8)<.3,'short routed destination reaches exact point '+dt+' boots='+boots);
  // Click navigation must go around a barrier even while distance to the
  // destination initially increases. No keyboard input or teleport assists it.
  p=fresh();G.equipped={boots:boots?{n:'Boots of Speed'}:null};
  for(let y=4;y<15;y++)G.lvl.grid[y][14]=1;
  p.x=11;p.y=8;p.dest={x:18,y:8};let distance=0;
  for(let i=0;i<Math.ceil(12/dt)&&p.dest;i++){
   const prev={x:p.x,y:p.y};tick(dt);distance+=Math.hypot(p.x-prev.x,p.y-prev.y);
   check(canBe(p.x,p.y,p.r,p),'routed Macar stays off barrier '+dt);
   check(Math.hypot(p.x-prev.x,p.y-prev.y)<=p.sp*wornMoveMul(p)*dt+1e-5,'Macar route stays within stride '+dt);
  }
  result.observations.push({case:'Macar barrier',dt,boots,x:p.x,y:p.y,destination:p.dest,distance});
  check(!p.dest&&Math.hypot(p.x-18,p.y-8)<.3,'Macar routes around obstacle '+dt+' boots='+boots);
  // Four ghosts must independently negotiate the same corner and retain
  // their rank gaps. Starting the leader in front isolates follower routing.
  p=fresh();G.equipped={boots:boots?{n:'Boots of Speed'}:null};p.x=21;p.y=17;p.fdx=1;p.fdy=0;
  for(let y=2;y<14;y++)G.lvl.grid[y][15]=1;
  const kin=['pordoom','fendur','orbo','talpor'].map((key,i)=>{
   const e=ent({team:'party',kind:'dwarf',ghost:1,col:{key},sp:4.3,x:10,y:6+i*2.6});G.ents.push(e);return e;
  });
  p.dest={x:30,y:17};
  for(let i=0;i<Math.ceil(18/dt);i++){
   const before=kin.map(e=>({x:e.x,y:e.y}));tick(dt);
   kin.forEach((e,j)=>{
    check(canBe(e.x,e.y,e.r,e),'ghost '+j+' stays off barrier '+dt);
    check(Math.hypot(e.x-before[j].x,e.y-before[j].y)<=e.sp*1.15*dt+1e-5,'ghost '+j+' stays within stride '+dt);
   });
  }
  result.observations.push({case:'four ghosts',dt,boots,leader:{x:p.x,y:p.y},kin:kin.map(e=>({key:e.col.key,x:e.x,y:e.y,d:dist(e,p),rejoin:!!e._rejoin}))});
  kin.forEach((e,i)=>check(e.x>16&&dist(e,p)<Math.max(6,2.6*(i+1)+2),'every ghost rejoins through obstacle '+i+' '+dt));
  // A party member parked directly in a narrow doorway cannot pin Macar.
  p=fresh();G.equipped={};
  for(let y=1;y<35;y++)for(let x=1;x<41;x++)G.lvl.grid[y][x]=y===8?0:1;
  p.x=8;p.y=8.5;const ghost=ent({team:'party',kind:'dwarf',ghost:1,col:{key:'pordoom'},x:10.2,y:8.5,sp:4.3});G.ents.push(ghost);
  check(canBe(p.x,p.y,p.r,p),'one-cell corridor remains traversable '+dt);
  p.dest={x:16,y:8.5};for(let i=0;i<Math.ceil(5/dt)&&p.dest;i++)tick(dt);
  check(!p.dest&&p.x>15.7,'ghost does not pin Macar in doorway '+dt);
  // Taking either quest item ends field work without adding a speed penalty.
  for(const item of ['crown','electrum','bronze']){
   p=fresh();G.equipped={};G.packs.macar.magic=[];G.coin={ep:5000,gp:0,sp:0,cp:0,pp:0};G.curseStrain=100;
   const base=wornMoveMul(p);G.searching=G.secretSearch=G.digging=1;G.dig={i:7,j:7,t:1};
   const got=item==='crown'?takeBoneCrown({x:p.x,y:p.y,k:'bonecrown'}):pryGrondTooth({x:p.x,y:p.y,k:'demonface',toothKind:item},item);
   // Crown combat spawns are excluded from this controlled movement test.
   G.ents=G.ents.filter(e=>e.hero);G.talk=null;p.aim=null;
   check(got.ok&&!G.searching&&!G.secretSearch&&!G.digging&&!G.dig,'pickup resumes ordinary travel '+item);
   check(wornMoveMul(p)===base,'quest item leaves move multiplier unchanged '+item);
   p.dest={x:p.x+2,y:p.y};const x=p.x;tick(dt);
   check(Math.abs(p.x-x-p.sp*base*dt)<1e-5,'full stride after quest pickup '+item+' '+dt);
  }
 }
 }catch(e){result.failures.push(e.stack);}
 timings.sort((a,b)=>a-b);result.frameTimingMs={max:timings[timings.length-1],p95:timings[Math.floor(timings.length*.95)]};
 report.textContent=JSON.stringify(result,null,2);
 await fetch('/qa-result',{method:'POST',body:JSON.stringify(result,null,2)});
})();

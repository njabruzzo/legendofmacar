(async function(){
 const result={suite:'Dwarf design consistency',checks:0,failures:[]},check=(v,m)=>{result.checks++;if(!v)result.failures.push(m);};
 const report=document.createElement('pre');report.id='qa-results';report.textContent='Loading dwarf design comparison…';document.body.append(report);document.getElementById('c').style.display='none';document.body.style='overflow:auto;background:#222;color:white;height:auto';
 try{
  const actors=['macar',...NpcDirectionalAtlas.dwarfActors];
  await Promise.all([...MacarSharedAtlas.keys(),...NpcDirectionalAtlas.dwarfActors.flatMap(a=>NpcDirectionalAtlas.keys(a))].map(k=>new Promise(resolve=>loadSpriteKeyNow(k,ok=>{check(ok,'decode '+k);resolve();}))));
  TW=116;TH=58;ZOOM=1;CAMSX=CAMSY=0;G.elapsed=0;G.equipped={primary:{n:'War Hammer',k:'weapon',macarHeld:1}};
  const direction=document.createElement('select');direction.setAttribute('aria-label','Direction');for(const d of ['s','se','e','ne','n','nw','w','sw']){const o=document.createElement('option');o.value=d;o.textContent=d.toUpperCase();direction.append(o);}document.body.append(direction);
  const action=document.createElement('select');action.setAttribute('aria-label','Pose');for(const a of ['idle','walk','windup','strike','recover']){const o=document.createElement('option');o.value=a;o.textContent=a;action.append(o);}document.body.append(action);
  const demo=document.createElement('canvas');demo.width=1200;demo.height=320;demo.style='position:static;width:1200px;height:320px';document.body.append(demo);
  function actorFor(actor,dir,stage,gait){
   const angle=['e','se','s','sw','w','nw','n','ne'].indexOf(dir)*Math.PI/4,sx=Math.cos(angle)/(TW/2),sy=Math.sin(angle)/(TH/2);
   const e=ent({hero:actor==='macar'?1:0,kind:'dwarf',col:{key:actor},name:actor.toUpperCase(),team:'party',x:0,y:0,fdx:sx+sy,fdy:sy-sx,ix:sx+sy,iy:sy-sx,moving:stage==='walk'?1:0,gait,atk:({windup:.9,strike:.4,recover:.1}[stage]||0),atkMax:1,atkKind:'melee'});G.ents=[e];return e;
  }
  function paint(g,e,x,y,z){
   const key=entAnimKey(e),img=e.hero?livingMacarImg(key):solidDwarfSprite(e,entAnimImg(e));g.save();g.translate(x,y);drawEntBillboard(g,e,img,z,wantsSpriteFlip(e));g.restore();return key;
  }
  const animate=t=>{const g=demo.getContext('2d');g.fillStyle='#343434';g.fillRect(0,0,1200,320);g.strokeStyle='#686868';g.beginPath();g.moveTo(0,275);g.lineTo(1200,275);g.stroke();
   actors.forEach((a,i)=>{paint(g,actorFor(a,direction.value,action.value,t/1000*3.3),100+i*215,275,2.2);g.fillStyle='white';g.font='16px sans-serif';g.fillText(a.toUpperCase(),65+i*215,305);});requestAnimationFrame(animate);
  };requestAnimationFrame(animate);
  const gallery=document.createElement('canvas');gallery.width=1200;gallery.height=5*6*190;gallery.style='position:static;width:1200px;height:'+gallery.height+'px';const g=gallery.getContext('2d');g.fillStyle='#343434';g.fillRect(0,0,gallery.width,gallery.height);
  const stages=['idle','walk0','walk1','windup','strike','recover'];
  NpcDirectionalAtlas.views.forEach((dir,r)=>stages.forEach((stage,j)=>{
   const y=(r*6+j)*190+170;g.fillStyle='white';g.font='12px sans-serif';g.fillText(dir.toUpperCase()+' · '+stage,10,y-148);
   actors.forEach((a,i)=>{const walk=stage.startsWith('walk'),e=actorFor(a,dir,walk?'walk':stage,stage==='walk0'?.125:.625),key=paint(g,e,120+i*240,y,1.4);
    const p=a==='macar'?MacarSharedAtlas.pose(key):NpcDirectionalAtlas.pose(key);check(p&&(p.dir||p.view)===dir,'comparison uses matching facing '+a+' '+dir+' '+stage);
    if(a!=='macar')check(SPR[key].__npcPose.actor===a,'comparison retains NPC identity '+key);
   });
  }));
  document.body.append(gallery);result.dwarfStyleGallery=gallery.toDataURL('image/png');
 }catch(e){result.failures.push(e.stack);}
 report.textContent=JSON.stringify({suite:result.suite,checks:result.checks,failures:result.failures},null,2);await fetch('/qa-result',{method:'POST',body:JSON.stringify(result)});
})();

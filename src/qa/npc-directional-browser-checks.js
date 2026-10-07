(async function(){
 const result={suite:'NPC directional movement',checks:0,failures:[],states:[]},check=(v,m)=>{result.checks++;if(!v)result.failures.push(m);};
 const report=document.createElement('pre');report.id='qa-results';report.textContent='Loading companion directional poses…';document.body.append(report);document.getElementById('c').style.display='none';document.body.style='overflow:auto;background:#222;color:white;height:auto';
 try{
  await Promise.all(NpcDirectionalAtlas.actors.flatMap(a=>[...NpcDirectionalAtlas.keys(a),...(a.startsWith('gnome_')?[]:NpcDirectionalAtlas.keys(a,true))]).map(k=>new Promise(resolve=>loadSpriteKeyNow(k,ok=>{check(ok,'decode '+k);resolve();}))));
  TW=116;TH=58;ZOOM=1.5;CAMSX=CAMSY=0;G.elapsed=0;
  const gallery=document.createElement('canvas');gallery.width=1500;gallery.height=NpcDirectionalAtlas.actors.length*930;gallery.style='position:static;width:1000px;height:3720px';const gg=gallery.getContext('2d');gg.fillStyle='#343434';gg.fillRect(0,0,gallery.width,gallery.height);
  const hash=c=>{let h=2166136261;for(const n of c.getContext('2d').getImageData(0,0,c.width,c.height).data)h=Math.imul(h^n,16777619);return h>>>0;};
  for(const [r,actor] of NpcDirectionalAtlas.actors.entries())for(const [col,view] of NpcDirectionalAtlas.views.entries()){
   for(const [stage,props] of Object.entries({idle:{},walk0:{moving:1,gait:.25},walk1:{moving:1,gait:.75},windup:{atk:.9,atkMax:1},attack:{atk:.4,atkMax:1},recover:{atk:.1,atkMax:1}})){
    const key=NpcDirectionalAtlas.select(actor,props,view),img=SPR[key];if(!img)continue;
    const rgba=img.getContext('2d').getImageData(0,0,512,512).data;let border=0;for(let y=0;y<512;y++)for(let x=0;x<512;x++)if((x<2||x>509||y<2||y>509)&&rgba[(y*512+x)*4+3]>80)border++;check(border===0,'unclipped pose '+key);
    const row=NpcDirectionalAtlas.stages.indexOf(stage),H=180;
    blitFacing(gg,img,col*300+50,r*930+row*150+145-H*440/512,H,H,false,true);
   }
   check(hash(SPR[actor+'_direction_'+view+'_walk0'])!==hash(SPR[actor+'_direction_'+view+'_walk1']),'painted alternating walk '+actor+' '+view);
  }
  for(const actor of NpcDirectionalAtlas.actors)for(const ghost of actor.startsWith('gnome_')?[false]:[false,true])for(const [i,dir] of ['e','se','s','sw','w','nw','n','ne'].entries())for(const [stage,props] of Object.entries({idle:{},walk0:{moving:1,gait:.25},walk1:{moving:1,gait:.75},windup:{atk:.9,atkMax:1},attack:{atk:.4,atkMax:1},recover:{atk:.1,atkMax:1}})){
   const angle=i*Math.PI/4,sx=Math.cos(angle)/(TW/2),sy=Math.sin(angle)/(TH/2),m=Math.hypot(sx+sy,sy-sx),dx=(sx+sy)/m,dy=(sy-sx)/m;
   const e=ent({kind:actor.startsWith('gnome_')?'gnome':'dwarf',col:{key:actor},sprite:actor,team:'party',x:0,y:0,ghost:ghost?1:0,scale:1,fdx:dx,fdy:dy,ix:dx,iy:dy,atkKind:(actor==='fendur'||actor==='gnome_tinker')?'bow':'melee',...props});G.ents=[e];
   if(stage.startsWith('walk'))e.aim={team:'foe',x:-dx*10,y:-dy*10,dead:0};
   const stem=actor+(ghost?'_ghost':''),wanted=NpcDirectionalAtlas.select(stem,e,dir),key=entAnimKey(e);
   check(key===wanted,'game selected '+stem+' '+dir+' '+stage);check(wantsSpriteFlip(e)===(i>=3&&i<=5),'game mirror '+key);
   const cv=document.createElement('canvas');cv.width=cv.height=512;const cg=cv.getContext('2d');cg.translate(256,400);
   const raw=entAnimImg(e),img=solidDwarfSprite(e,raw);check(drawEntBillboard(cg,e,img,ZOOM,wantsSpriteFlip(e)),'game billboard '+key);
   const pixels=cg.getImageData(0,0,512,512).data;check(pixels.some((v,j)=>j%4===3&&v>40),'visible rendered '+key);
   if(ghost){let blue=0,painted=0;for(let j=0;j<pixels.length;j+=4)if(pixels[j+3]>80){painted++;if(pixels[j+2]>pixels[j])blue++;}check(blue/painted>.8,'stable cyan ghost '+key);}
   result.states.push({actor,ghost,dir,stage,key});
  }
  const bramble=ALLY.gnomeTinker();Object.assign(bramble,{x:0,y:0,fdx:1,fdy:0,atk:.4,atkMax:1});G.ents=[bramble];
  check(bramble.ranged===1&&shotStyle(bramble)[0]==='bolt','actual Bramble retains ranged bolt behavior');
  check(entAnimKey(bramble)==='gnome_tinker_direction_se_attack','actual Bramble constructor selects directional firing art');
  const noz=ALLY.noz();G.ents=[noz];check(entAnimKey(noz)==='gnome_good','Noz retains sleeping/tied art');
  Object.assign(noz,{sleeping:0,tied:0,fdx:1,fdy:0});check(entAnimKey(noz)==='gnome_good_direction_se_idle','freed Noz enters directional idle');
  const direction=document.createElement('select');direction.setAttribute('aria-label','Direction');for(const d of ['s','se','e','ne','n','nw','w','sw']){const o=document.createElement('option');o.value=d;o.textContent=d.toUpperCase();direction.append(o);}document.body.append(direction);
  const action=document.createElement('select');action.setAttribute('aria-label','Animation');for(const a of ['walk','attack','windup','strike','recovery','idle']){const o=document.createElement('option');o.value=a;o.textContent=a;action.append(o);}document.body.append(action);
  const demo=document.createElement('canvas');demo.width=1200;demo.height=300;demo.style='position:static;width:1200px;height:300px';document.body.append(demo);
  const animate=t=>{const g=demo.getContext('2d');g.fillStyle='#343434';g.fillRect(0,0,1200,300);for(const [i,actor] of NpcDirectionalAtlas.actors.entries()){
   const dir=direction.value,index=['e','se','s','sw','w','nw','n','ne'].indexOf(dir),angle=index*Math.PI/4,sx=Math.cos(angle)/(TW/2),sy=Math.sin(angle)/(TH/2);
   const e=ent({kind:actor.startsWith('gnome_')?'gnome':'dwarf',col:{key:actor},sprite:actor,team:'party',x:0,y:0,scale:1,ix:sx+sy,iy:sy-sx,fdx:sx+sy,fdy:sy-sx,moving:action.value==='walk'?1:0,gait:t/1000*3.3,atk:action.value==='attack'?1-((t/1200)%1):({windup:.9,strike:.4,recovery:.1}[action.value]||0),atkMax:1,atkKind:(actor==='fendur'||actor==='gnome_tinker')?'bow':'melee'});G.ents=[e];g.save();g.translate(90+i*200,260);drawEntBillboard(g,e,solidDwarfSprite(e,entAnimImg(e)),1.8,wantsSpriteFlip(e));g.restore();g.fillStyle='white';g.font='14px sans-serif';g.fillText(actor==='gnome_good'?'Noz / Pip':actor==='gnome_tinker'?'Bramble':actor,60+i*200,287);
  }requestAnimationFrame(animate);};requestAnimationFrame(animate);
  gg.fillStyle='white';gg.font='16px sans-serif';NpcDirectionalAtlas.actors.forEach((a,i)=>gg.fillText(a+' · idle / walk-left / walk-right / windup / hit / recover',12,i*930+18));document.body.append(gallery);result.npcGallery=gallery.toDataURL('image/png');
 }catch(e){result.failures.push(e.stack);}
 report.textContent=JSON.stringify({suite:result.suite,checks:result.checks,failures:result.failures,states:result.states.length},null,2);await fetch('/qa-result',{method:'POST',body:JSON.stringify(result)});
})();

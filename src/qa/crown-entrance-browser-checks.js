(async function(){
 const r={suite:'Crown entrance artwork',checks:0,failures:[]};
 const check=(v,m)=>{r.checks++;if(!v)r.failures.push(m);};
 const pre=document.createElement('pre');document.body.append(pre);document.getElementById('c').style.display='none';document.body.style='overflow:auto;background:#171411;color:white';
 try{
 await Promise.all(WORLD_ART_KEYS[1].map(k=>new Promise(resolve=>loadSpriteKeyNow(k,ok=>{check(ok,'load '+k);resolve();}))));
 startChapter(1);G.scene='play';G.talk=null;G.ents=G.ents.filter(e=>e.hero);
 VW=1100;VH=700;TW=116;TH=58;ZOOM=1.5;G.cam={x:106.5,y:15.5};syncCamProj();
 const p=player();p.x=106.5;p.y=18;p.dir='N';
 check(!G.props.some(p=>p.k==='floorlever'),'no duplicate lever at Chapter I entrance');
 const gallery=document.createElement('canvas');gallery.width=2200;gallery.height=700;const out=gallery.getContext('2d');
 for(const [i,open] of [0,1].entries()){
 G.lvl.secrets.find(s=>s.kind==='teeth').open=open;applyCrownEntranceFrame(G.lvl);for(const row of G.lvl.seen)row.fill(1);
 let bones=0,rubble=0;const original=drawCrownEntranceCell;
 drawCrownEntranceCell=function(g,L,x,y,...args){const k=crownEntranceKind(L,x,y);if(k==='bones')bones++;if(k==='rubble')rubble++;return original(g,L,x,y,...args);};
 const cv=document.createElement('canvas');cv.width=VW;cv.height=VH;const g=cv.getContext('2d');g.fillStyle='#171411';g.fillRect(0,0,VW,VH);drawWorld(g,G.lvl);drawLivingMacar(g,p);drawCrownEntranceCell=original;
 check(bones===(open?0:3),'central bone-wall cells '+open);check(rubble===7,'seven rubble cells remain '+open);
 check(G.lvl.grid[15].slice(105,108).every(t=>t===(open?0:1)),'opening geometry '+open);
 const save=GameSave.captureWorld(G);applyPlaySave(save);check(G.lvl.secrets.find(s=>s.kind==='teeth').open===open,'reload state '+open);
 out.drawImage(cv,i*1100,0);document.body.append(cv);
 }
 r.entranceGallery=gallery.toDataURL('image/png');
 }catch(e){r.failures.push(e.stack||String(e));}
 pre.textContent=JSON.stringify({...r,entranceGallery:undefined},null,2);await fetch('/qa-result',{method:'POST',body:JSON.stringify(r)});
})();

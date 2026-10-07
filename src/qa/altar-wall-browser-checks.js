(async function(){
 const result={suite:'Altar left wall',checks:0,failures:[]},check=(v,m)=>{result.checks++;if(!v)result.failures.push(m);};const report=document.createElement('pre');document.body.append(report);document.getElementById('c').style.display='none';document.body.style='overflow:auto;background:#181411;color:white;height:auto';
 try{
 await Promise.all([...WORLD_ART_KEYS[1],'altar_teeth','demon_dwarfface','bone_crown',...Object.keys(SPRITE_FILES).filter(k=>/^(tile_|wall_|floor_)/.test(k)&&!/_w3$/.test(k))].map(k=>new Promise(resolve=>loadSpriteKeyNow(k,ok=>{check(ok,'load '+k);resolve();}))));
 startChapter(1);G.scene='play';G.paused=false;G.talk=null;openSecret(G.lvl.secrets.find(s=>s.kind==='teeth'));G.talk=null;
 const altar=G.props.find(p=>p.teethAltar);check(!!altar,'altar remains in chapel');const crown=G.props.find(p=>p.k==='bonecrown'&&!p.gone);check(!!crown,'crown remains on altar');
 for(let y=2;y<14;y++)check(cellWallH(G.lvl,100,y)===cellWallH(G.lvl,107,1),'west/demon wall height '+y);
 for(const row of G.lvl.seen)row.fill(1);G.ents=G.ents.filter(e=>e.team==='party');const hero=player();hero.x=103.5;hero.y=7;hero.fdx=-1;hero.fdy=-1;
 const render=()=>{VW=1000;VH=800;TW=116;TH=58;ZOOM=1.65;G.cam={x:103.7,y:4.6};syncCamProj();const cv=document.createElement('canvas');cv.width=VW;cv.height=VH;const cg=cv.getContext('2d');cg.fillStyle='#171411';cg.fillRect(0,0,VW,VH);drawWorld(cg,G.lvl);drawLivingMacar(cg,hero);return cv;};
 const before=new Image();await new Promise((resolve,reject)=>{before.onload=resolve;before.onerror=reject;before.src=assetUrl('assets/props/prop_altar_teeth.png');});
 const edited=SPR.altar_teeth,west=isTeethAltarWestWall;SPR.altar_teeth=before;TEETH_ALTAR_SOLID=null;isTeethAltarWestWall=()=>false;for(let y=2;y<14;y++)delete G.lvl.wallH['100,'+y];const old=render();
 isTeethAltarWestWall=west;applyTeethFaceWallHeight(G.lvl);SPR.altar_teeth=edited;TEETH_ALTAR_SOLID=null;const current=render();
 const sheet=document.createElement('canvas');sheet.width=2000;sheet.height=800;sheet.getContext('2d').drawImage(old,0,0);sheet.getContext('2d').drawImage(current,1000,0);result.altarWallGallery=sheet.toDataURL('image/png');result.altarWallPreview=current.toDataURL('image/png');document.body.append(current);
 check(isTeethAltarWestWall(G.lvl,100,4),'native left wall selected');check(SPRITE_FILES.altar_teeth.endsWith('no_walls_v13.png'),'altar has no baked walls');check(G.lvl.grid[4][100]===1,'wall collision preserved');check(isWalkTile(G.lvl.grid[7][104]),'altar approach floor remains clear');
 const saved=capturePlaySave();G._loadSnap={play:saved,scene:'play'};G._keepProgress=1;startChapter(1);check(cellWallH(G.lvl,100,4)===cellWallH(G.lvl,107,1),'saved chapel retains matching wall height');
 }catch(e){result.failures.push(e.stack);}
 report.textContent=JSON.stringify({suite:result.suite,checks:result.checks,failures:result.failures},null,2);await fetch('/qa-result',{method:'POST',body:JSON.stringify(result)});
})();

(async function(){
const r={suite:'Noz north door',checks:0,failures:[]};const check=(v,m)=>{r.checks++;if(!v)r.failures.push(m);};const pre=document.createElement('pre');document.body.append(pre);document.getElementById('c').style.display='none';document.body.style='overflow:auto;background:#171411;color:white';
try{
await Promise.all([...WORLD_ART_KEYS[2],'bronzedoor','bell'].map(k=>new Promise(resolve=>loadSpriteKeyNow(k,ok=>{check(ok,'load '+k);resolve();}))));startChapter(2);G.scene='play';G.talk=null;G.ents=G.ents.filter(e=>e.hero);for(const row of G.lvl.seen)row.fill(1);
const L=G.lvl;for(let x=61;x<=64;x++){check(L.grid[10][x]===1,'north backing '+x);check(isWalkTile(L.grid[11][x]),'south approach '+x);}
VW=1000;VH=700;TW=116;TH=58;ZOOM=1.5;G.cam={x:62.5,y:12.2};syncCamProj();const p=player();p.x=62.5;p.y=13;const cv=document.createElement('canvas');cv.width=VW;cv.height=VH;const g=cv.getContext('2d');g.fillStyle='#171411';g.fillRect(0,0,VW,VH);drawWorld(g,L);drawLivingMacar(g,p);document.body.append(cv);r.entranceGallery=cv.toDataURL();
const save=capturePlaySave();applyPlaySave(save);check(G.props.find(p=>p.k==='bronzedoor').y===11,'reload door north wall');
}catch(e){r.failures.push(e.stack);}pre.textContent=JSON.stringify({...r,entranceGallery:undefined},null,2);await fetch('/qa-result',{method:'POST',body:JSON.stringify(r)});
})();
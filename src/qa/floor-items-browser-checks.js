(async function(){
 const r={suite:'Floor items clear of walls',checks:0,failures:[]};
 const check=(v,m)=>{r.checks++;if(!v)r.failures.push(m);};
 const pre=document.createElement('pre');document.body.append(pre);document.getElementById('c').style.display='none';document.body.style='overflow:auto;background:#171411;color:white';
 try{
 for(let n=1;n<=5;n++){
  startChapter(n);G.scene='play';G.talk=null;
  for(const pr of G.props){
   if(pr.gone||pr.wall||pr.backwall||pr.pin||pr.cover)continue;
   if(isPlantKind(pr.k)||['crate','barrel','urn','bones','web','roots','timber','crystal','slime','hidepile'].includes(pr.k))
    check(FloorItemPlacement.clear(G.lvl,pr.x,pr.y,.9,(i,j)=>isNozDoorVoid(G.lvl,i,j)),n+' '+pr.k+' clear of masonry');
  }
  const L=G.lvl;let wall=null;
  for(let y=1;y<L.h-1&&!wall;y++)for(let x=1;x<L.w-1;x++)if(L.grid[y][x]===1&&isWalkTile(L.grid[y+1][x])){wall={x:x+.5,y:y+.5};break;}
  check(!!wall,'test wall '+n);if(!wall)continue;
  const loot=spawnLoot(wall.x,wall.y,{res:{gear:1},label:'Placement regression'});
  check(FloorItemPlacement.clear(L,loot.x,loot.y,.38),'loot outside wall '+n);
  check(loot.res.gear===1,'relocated loot contents '+n);
  G.props.push({...wall,k:'glowcap',plant:1,placementRegression:1});
  const save=GameSave.captureWorld(G);applyPlaySave(save);
  const plant=G.props.find(p=>p.placementRegression);
  check(!plant||FloorItemPlacement.clear(G.lvl,plant.x,plant.y,.9),'old-save plant repaired '+n);
  check(G.loot.every(p=>p.gone||FloorItemPlacement.clear(G.lvl,p.x,p.y,.38)),'restored loot clear '+n);
 }
 }catch(e){r.failures.push(e.stack||String(e));}
 pre.textContent=JSON.stringify(r,null,2);await fetch('/qa-result',{method:'POST',body:JSON.stringify(r)});
})();

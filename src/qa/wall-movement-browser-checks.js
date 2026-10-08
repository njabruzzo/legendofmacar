(async function(){
 const r={suite:'Visible floor movement',checks:0,failures:[],floors:[]};
 const check=(v,m)=>{r.checks++;if(!v&&r.failures.length<30)r.failures.push(m);};
 const pre=document.createElement('pre');document.body.append(pre);document.getElementById('c').style.display='none';document.body.style='overflow:auto;background:#171411;color:white';
 try{
 for(let n=1;n<=5;n++){
  startChapter(n);G.scene='play';G.talk=null;G.ents=G.ents.filter(e=>e.hero);const p=player(),L=G.lvl;
  let floors=0,approaches=0;
  for(let y=1;y<L.h-1;y++)for(let x=1;x<L.w-1;x++){
   if(!walk(x+.5,y+.5,p))continue;
   p.x=x+.5;p.y=y+.5;
   if(![[-1,0],[1,0],[0,-1],[0,1],[-.7,-.7],[.7,.7],[-.7,.7],[.7,-.7]].every(([dx,dy])=>walk(p.x+dx*p.r,p.y+dy*p.r,p)))continue;
   check(canBe(p.x,p.y,p.r,p),'floor center '+n+' '+x+','+y);floors++;
   // Approach south/east masonry through the former oversized .72 inset.
   for(const [dx,dy] of [[1,0],[0,1]]){
    if(L.grid[y+dy][x+dx]!==1)continue;
    const to={x:p.x+dx*.1,y:p.y+dy*.1};
    if(![[-1,0],[1,0],[0,-1],[0,1],[-.7,-.7],[.7,.7],[-.7,.7],[.7,-.7]].every(([sx,sy])=>walk(to.x+sx*p.r,to.y+sy*p.r,p)))continue;
    check(canBe(to.x,to.y,p.r,p),'clear wall approach '+n+' '+x+','+y);
    if(approaches<25){
     const plan=Navigation.planRoute({x:p.x,y:p.y},to,p,{canBe:partyRouteCanBe,maxExpand:4000});
     check(plan.ok,'click route to visible floor '+n+' '+x+','+y);
    }
    const ox=p.x,oy=p.y;steerWalk(p,dx,dy,1,.1);
    check(Math.hypot(p.x-ox,p.y-oy)>.05,'actual keyboard step '+n+' '+x+','+y);p.x=ox;p.y=oy;approaches++;
   }
  }
  check(floors>50&&approaches>10,'meaningful floor coverage '+n);r.floors.push({n,floors,approaches});
 }
 }catch(e){r.failures.push(e.stack||String(e));}
 pre.textContent=JSON.stringify(r,null,2);await fetch('/qa-result',{method:'POST',body:JSON.stringify(r)});
})();

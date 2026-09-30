(function(root){
  'use strict';
  const LEAD=2.15, KIN=2.05, EPS=1e-7;
  function eligible(e){return e && e.team==='party' && !e.dead && !e.crushed && !e.sleeping && !e.tied && !e.hidden;}
  function gap(a,b){return a.hero||b.hero?LEAD:KIN;}
  function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
  /* Swept disks: an endpoint check alone lets a long frame cut through a
     neighbour. Existing overlaps may move out, but never closer in. */
  function limit(e, from, to, bodies){
    const vx=to.x-from.x, vy=to.y-from.y, A=vx*vx+vy*vy;
    let fraction=1;
    if(A<EPS*EPS) return {x:from.x,y:from.y};
    for(const b of bodies){
      if(b===e || !eligible(b)) continue;
      const rx=from.x-b.x, ry=from.y-b.y;
      const floor=Math.min(gap(e,b),Math.hypot(rx,ry));
      const B=rx*vx+ry*vy;
      if(B>=0) continue;
      const C=rx*rx+ry*ry-floor*floor;
      const discriminant=B*B-A*C;
      if(discriminant<=0) continue;
      const t=(-B-Math.sqrt(discriminant))/A;
      if(t>=-EPS && t<fraction) fraction=Math.max(0,t-EPS);
    }
    return {x:from.x+vx*fraction,y:from.y+vy*fraction};
  }
  function crowded(e,bodies){return bodies.some(b=>b!==e && eligible(b) && distance(e,b)<gap(e,b)-1e-5);}
  /* Try radial escape first; when rock blocks it, choose a tangent on the
     same side. Persist the tangent sign, so nearly equal scores cannot
     alternate north/south each frame. Every candidate stays in one stride. */
  function separate(p,bodies,dt,canBe){
    const kin=bodies.filter(e=>eligible(e)&&!e.hero);
    const starts=new Map(kin.map(e=>[e,{x:dt>0&&e._followX!=null?e._followX:e.x,y:dt>0&&e._followY!=null?e._followY:e.y}]));
    for(let pass=0;pass<12;pass++){
      let changed=false;
      for(let index=0;index<kin.length;index++){
        const e=kin[index];
        if(e.aim && !e.aim.dead && e.aim.team==='foe' && distance(e,e.aim)<=(e.range||1)+.55) continue;
        const start=starts.get(e);
        const cap=dt>0?Math.max(0,e.sp||4.3)*((e.slowT||0)>0?.4:1)*((e.webbed||0)>0?0:1)*dt:Infinity;
        let nearest=null, deficit=0;
        for(const b of bodies){
          if(b===e || !eligible(b)) continue;
          const need=gap(e,b)-distance(e,b);
          if(need>deficit+1e-5){deficit=need;nearest=b;}
        }
        /* A leader stopped by this body needs clearance before its next
           stride, even though the body is exactly on the separation rim. */
        if(!nearest && p._partyBlocked && p.moving && distance(e,p)<LEAD+.3){nearest=p;deficit=.15;}
        if(!nearest) continue;
        let rx=e.x-nearest.x, ry=e.y-nearest.y;
        const rd=Math.hypot(rx,ry);
        if(rd<.001){rx=index%2?-1:1;ry=0;}else{rx/=rd;ry/=rd;}
        if(!e._followSlideSign) e._followSlideSign=index%2?-1:1;
        const stride=Math.min(deficit,dt>0?cap:Math.max(LEAD,KIN));
        let best=null, score=0;
        for(let k=0;k<64;k++){
          /* alternating angles, always favour the stored tangent */
          const j=k===0?0:(k%2?1:-1)*Math.ceil(k/2)*e._followSlideSign;
          const angle=Math.atan2(ry,rx)+j*Math.PI/32;
          let candidate={x:e.x+Math.cos(angle)*stride,y:e.y+Math.sin(angle)*stride};
          const travel=distance(start,candidate);
          if(travel>cap){const s=cap/travel;candidate={x:start.x+(candidate.x-start.x)*s,y:start.y+(candidate.y-start.y)*s};}
          candidate=limit(e,e,candidate,bodies);
          if(!canBe(candidate.x,candidate.y,e.r,e)) continue;
          const sx=start.x-p.x, sy=start.y-p.y;
          if(Math.hypot(sx,sy)>.2 && sx*(candidate.x-p.x)+sy*(candidate.y-p.y)<=0) continue;
          const gain=distance(candidate,nearest)-distance(e,nearest);
          if(gain<=1e-8) continue;
          const value=gain- Math.abs(j)*1e-8;
          if(value>score){score=value;best=candidate;}
        }
        if(best){e.x=best.x;e.y=best.y;changed=true;}
      }
      if(!changed) break;
    }
    return starts;
  }
  const api={LEAD,KIN,eligible,limit,separate,crowded};
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.PartyFollow=api;
})(typeof globalThis!=='undefined'?globalThis:this);

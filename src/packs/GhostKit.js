(function (global) {
  'use strict';

  const STACKS=['bombs','ales','rations','torches','ammo','bombKit','burps'];

  function isGhostKin(e){
    return !!(e && e.ghost && e.col && e.col.key);
  }
  function packUseTarget(ents, packWho, player){
    const list=ents||[];
    const e=list.find(z=>z&&z.col&&z.col.key===packWho);
    if(e && e.ghost) return player||e;
    if(e && e.team==='party' && !e.dead) return e;
    return player||e||null;
  }
  function moveStack(from, to, field, n){
    if(!from||!to||!field) return 0;
    const have=from[field]|0;
    const take=n==null?have:Math.min(have, n|0);
    if(take<=0) return 0;
    from[field]=have-take;
    to[field]=(to[field]|0)+take;
    return take;
  }
  function moveListItem(fromArr, toArr, item){
    if(!fromArr||!toArr||!item) return null;
    const i=fromArr.indexOf(item);
    if(i<0) return null;
    fromArr.splice(i,1);
    toArr.push(item);
    return item;
  }
  function takeAllKit(from, to){
    if(!from||!to||from===to) return {stacks:0, items:0};
    let stacks=0, items=0;
    STACKS.forEach(k=>{ stacks+=moveStack(from,to,k); });
    ['magic','potions','healPots','gems'].forEach(k=>{
      const src=from[k]||[];
      const dst=to[k]||(to[k]=[]);
      while(src.length){
        dst.push(src.shift());
        items++;
      }
    });
    const herbs=from.herbs||{};
    to.herbs=to.herbs||{};
    Object.keys(herbs).forEach(n=>{
      const c=herbs[n]|0;
      if(c>0){ to.herbs[n]=(to.herbs[n]|0)+c; items+=c; }
      delete herbs[n];
    });
    return {stacks, items};
  }

  global.GhostKit={
    STACKS, isGhostKin, packUseTarget, moveStack, moveListItem, takeAllKit
  };
})(typeof globalThis!=='undefined'?globalThis:this);

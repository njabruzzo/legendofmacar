(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.MacarEquipment=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function kind(item){
    if(!item || item.k==='ammo') return null;
    const name=((item.n||'')+' '+(item.id||'')).replace(/[_-]/g,' ');
    if(/shield|buckler|pickaxe|pick_axe/i.test(name)) return null;
    if(/crossbow|long\s*bow|short\s*bow|\bbow\b/i.test(name)) return 'xbow';
    if(/shadow[_ ]cleaver|\bcleaver\b|\baxe\b|(?:battle|hand|war|great)\s*axe/i.test(name)) return 'axe';
    if(item.k==='weapon'||/hammer|maul/i.test(name)) return 'maul';
    return null;
  }
  function items(eq){return Array.from(new Set([eq.primary,eq.weapon,eq.secondary].filter(Boolean)));}
  function heldKind(eq){
    eq=eq||{};
    const kit=items(eq),selected=kit.find(it=>it.macarHeld&&kind(it));
    if(selected) return kind(selected);
    // Old saves have no selection marker; preserve their equipped bow display.
    if(kit.some(it=>kind(it)==='xbow')) return 'xbow';
    return kind(eq.primary||eq.weapon)||'maul';
  }
  function select(eq,item){
    if(!kind(item)) return;
    items(eq||{}).forEach(it=>{delete it.macarHeld;});
    item.macarHeld=1;
  }
  function hasAxe(eq){return items(eq||{}).some(it=>kind(it)==='axe');}
  return {kind,heldKind,select,hasAxe};
});

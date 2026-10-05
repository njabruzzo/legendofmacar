(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.MacarEquipment=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function kind(item){
    if(!item || item.k==='ammo') return null;
    const name=((item.n||'')+' '+(item.id||'')).replace(/[_-]+/g,' ');
    if(/shield|buckler|pick\s*axe/i.test(name)) return null;
    if(/crossbow|long\s*bow|short\s*bow|\bbow\b/i.test(name)) return 'xbow';
    if(/shadow[_ ]cleaver|\bcleaver\b|\baxe\b|battle[_ ]?axe|hand[_ ]?axe/i.test(name)) return 'axe';
    if(item.k==='weapon'||/hammer|maul/i.test(name)) return 'maul';
    return null;
  }
  function items(eq){return Array.from(new Set([eq.primary,eq.weapon,eq.secondary].filter(Boolean)));}
  function heldKind(eq){
    eq=eq||{};
    const kit=items(eq),selected=kit.find(it=>it.macarHeld&&kind(it));
    if(selected) return kind(selected);
    // Legacy saves have no held marker. The primary weapon is in hand;
    // a retained secondary bow is available for Shoot, not the carry pose.
    return kind(eq.primary)||kind(eq.weapon)||kind(eq.secondary)||'maul';
  }
  function select(eq,item){
    if(!kind(item)) return;
    items(eq||{}).forEach(it=>{delete it.macarHeld;});
    item.macarHeld=1;
  }
  function hasAxe(eq){return items(eq||{}).some(it=>kind(it)==='axe');}
  return {kind,heldKind,select,hasAxe};
});

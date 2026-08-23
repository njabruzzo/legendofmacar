(function (global) {
  'use strict';

  function macarHammerItem(){
    return {
      id:'macar_hammer', n:"Macar's War Hammer", k:'weapon', cat:'Weapon',
      plus:0, dice:'1d8', defaultWep:1, spr:'icon_attack',
      d:'Your war hammer. Honest steel from the seam.'
    };
  }
  function shadowCleaverItem(){
    return {
      id:'shadow_cleaver', n:'Shadow Cleaver', k:'weapon', cat:'Weapon',
      plus:2, dice:'1d8', vs:'spider,undead', vsDouble:1, noAuto:1, spr:'shadowcleaver',
      d:'Silver dwarven battle axe +2/+2. Double damage versus spiders and the undead.'
    };
  }
  function isShadowCleaver(it){
    if(!it) return false;
    if(it.id==='shadow_cleaver') return true;
    return /shadow\s*cleaver/i.test(it.n||'');
  }
  function findShadowCleaver(packs, equipped){
    const wep=equipped&&equipped.weapon;
    if(isShadowCleaver(wep)) return wep;
    const magic=(packs&&packs.macar&&packs.macar.magic)||[];
    for(let i=0;i<magic.length;i++){
      if(isShadowCleaver(magic[i])) return magic[i];
    }
    return null;
  }
  function dwarfMouthKey(){
    return {
      id:'dwarf_mouth_key', n:'Dwarven Mouth-Key', k:'key', cat:'Key',
      noAuto:1, spr:'dwarfkey',
      d:'A heavy silver key spat from the stone mouth. Cold as the deep seam.'
    };
  }
  function isGuardianRuby(gm){
    if(!gm) return false;
    if(gm.guardian || gm.src==='guardian') return true;
    return /from a ruby guardian/i.test(gm.d||'');
  }
  function isSpiderFoe(e){
    if(!e) return false;
    return /spider|drider/i.test((e.kind||'')+' '+(e.name||'')+' '+(e.sprite||''));
  }
  function isUndeadFoe(e){
    if(!e) return false;
    if(e.kind==='undead'||e.kind==='undeadX') return true;
    return /undead|wraith|vampire|ghoul|lich|skeleton|zombie|barrow|ghost/i.test((e.kind||'')+' '+(e.name||''));
  }
  function weaponVsDouble(wep, def){
    if(!wep||!def||!(wep.vsDouble||wep.vs)) return false;
    const vs=String(wep.vs||'').toLowerCase();
    if(vs.indexOf('spider')>=0 && isSpiderFoe(def)) return true;
    if(vs.indexOf('undead')>=0 && isUndeadFoe(def)) return true;
    return false;
  }
  function resolveMouthDrop(item, alreadyFed){
    if(!isGuardianRuby(item)) return {ok:false, yum:false, spit:[]};
    return {ok:true, yum:true, spit: alreadyFed ? [] : [dwarfMouthKey(), shadowCleaverItem()]};
  }
  function takeGemByRef(gems, gem){
    if(!gems||!gem) return null;
    const i=gems.indexOf(gem);
    if(i<0) return null;
    return gems.splice(i,1)[0];
  }

  global.DwarfMouth={
    macarHammerItem, shadowCleaverItem, dwarfMouthKey, isShadowCleaver, findShadowCleaver,
    isGuardianRuby, isSpiderFoe, isUndeadFoe, weaponVsDouble,
    resolveMouthDrop, takeGemByRef
  };
})(typeof globalThis!=='undefined'?globalThis:this);

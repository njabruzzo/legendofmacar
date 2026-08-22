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

  global.DwarfMouth={
    macarHammerItem, shadowCleaverItem, dwarfMouthKey,
    isGuardianRuby, isSpiderFoe, isUndeadFoe, weaponVsDouble
  };
})(typeof globalThis!=='undefined'?globalThis:this);

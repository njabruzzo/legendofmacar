(function (global) {
  'use strict';

  function macarHammerItem(){
    return {
      id:'macar_hammer', n:"Macar's War Hammer", k:'weapon', cat:'Weapon',
      plus:0, dice:'1d8', defaultWep:1, slot:'primary', spr:'icon_attack',
      d:'Your war hammer. Honest steel from the seam.'
    };
  }
  function shadowCleaverItem(){
    return {
      id:'shadow_cleaver', n:'Shadow Cleaver', k:'weapon', cat:'Weapon',
      plus:2, dice:'1d8', vs:'spider,undead', vsDouble:1, noAuto:1, slot:'primary', spr:'shadowcleaver',
      d:'Silver dwarven battle axe +2/+2. Double damage versus spiders and the undead.'
    };
  }
  function isShadowCleaver(it){
    if(!it) return false;
    if(it.id==='shadow_cleaver') return true;
    return /shadow\s*cleaver/i.test(it.n||'');
  }
  function findShadowCleaver(packs, equipped){
    const wep=(equipped&&(equipped.primary||equipped.weapon));
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
  function foeHay(e){
    if(!e) return '';
    const flags=e.flags;
    let flagStr='';
    if(typeof flags==='string') flagStr=flags;
    else if(flags && typeof flags==='object'){
      flagStr=Object.keys(flags).filter(function(k){ return flags[k]; }).join(' ');
    }
    return [
      e.kind, e.name, e.sprite, e.spr, e.k,
      e.regen?'regen':'', e.shaman?'shaman':'', e.mage?'mage':'',
      e.lycan?'lycan':'', e.were?'were':'', flagStr
    ].join(' ').toLowerCase();
  }
  function isMagicFoe(e){
    if(!e) return false;
    const hay=foeHay(e);
    if(/mage|caster|drow|shaman|priest/.test(e.kind||'')) return true;
    return /mage|wizard|cleric|shaman|enchant/.test(hay);
  }
  function isLycanFoe(e){
    if(!e) return false;
    return /were|lycan|shape/.test(foeHay(e));
  }
  function isRegenFoe(e){
    if(!e) return false;
    if(e.regen) return true;
    return /troll|regen/.test(foeHay(e));
  }
  function isDragonFoe(e){
    if(!e) return false;
    const hay=foeHay(e);
    if(/dragon-?kin/.test(hay)) return false;
    return /dragon|wyrm|wyvern/.test(hay);
  }
  function isReptileFoe(e){
    if(!e) return false;
    if(isDragonFoe(e)) return false;
    const hay=foeHay(e);
    if(/dragon-?kin/.test(hay)) return true;
    return /lizard|reptile|naga|croc|snake|kobold/.test(hay);
  }
  function isGiantFoe(e){
    if(!e) return false;
    const hay=foeHay(e);
    if(/giant\s*slug|giantslug/.test(hay)) return false;
    return /giant|ogre|titan|ettin/.test(hay);
  }
  function vsTokens(wep){
    return String(wep&&wep.vs||'').toLowerCase().split(/[,\s]+/).filter(Boolean);
  }
  function weaponMatchesVs(wep, def){
    if(!wep||!def) return false;
    const toks=vsTokens(wep);
    for(let i=0;i<toks.length;i++){
      const t=toks[i];
      if(t==='magic' && isMagicFoe(def)) return true;
      if((t==='lycan'||t==='lycanthrope') && isLycanFoe(def)) return true;
      if(t==='regen' && isRegenFoe(def)) return true;
      if(t==='reptile' && isReptileFoe(def)) return true;
      if(t==='dragon' && isDragonFoe(def)) return true;
      if(t==='giant' && isGiantFoe(def)) return true;
    }
    return false;
  }
  function parseWeaponVsPlus(wep){
    if(!wep||wep.vsDouble) return 0;
    if(wep.vsPlus!=null && wep.vsPlus!=='') return wep.vsPlus|0;
    const text=String(wep.n||'')+' '+String(wep.d||'');
    const m=text.match(/\+(\d+)\s*,\s*\+(\d+)\s*vs/i);
    if(!m) return 0;
    return Math.max(0, (+m[2])-(wep.plus||0));
  }
  function weaponVsPlus(wep, def){
    if(!wep||!def||wep.vsDouble) return 0;
    if(!weaponMatchesVs(wep, def)) return 0;
    return parseWeaponVsPlus(wep);
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
  function shouldWieldMouthAxe(axe, equipped){
    if(!isShadowCleaver(axe)) return false;
    const wep=equipped&&(equipped.primary||equipped.weapon);
    if(!wep) return true;
    if(isShadowCleaver(wep)) return false;
    return (axe.plus||0) >= (wep.plus||0);
  }
  function takeGemByRef(gems, gem){
    if(!gems||!gem) return null;
    const i=gems.indexOf(gem);
    if(i<0) return null;
    return gems.splice(i,1)[0];
  }

  global.DwarfMouth={
    macarHammerItem, shadowCleaverItem, dwarfMouthKey, isShadowCleaver, findShadowCleaver,
    isGuardianRuby, isSpiderFoe, isUndeadFoe, isMagicFoe, isLycanFoe, isRegenFoe,
    isReptileFoe, isDragonFoe, isGiantFoe, weaponVsPlus, weaponVsDouble,
    resolveMouthDrop, takeGemByRef, shouldWieldMouthAxe
  };
})(typeof globalThis!=='undefined'?globalThis:this);

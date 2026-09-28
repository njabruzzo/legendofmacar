'use strict';
/**
 * Bone-crown Animate button: action bar, spent flag, save.
 * Run: node src/ui/AnimateButton.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
require('../saves/GameSave.js');
const GS=global.GameSave;

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}
function extractFn(name){
  const start=html.indexOf('function '+name+'(');
  if(start<0) throw new Error('missing '+name);
  let i=html.indexOf('{', start), depth=0;
  for(;i<html.length;i++){
    if(html[i]==='{') depth++;
    else if(html[i]==='}'){ depth--; if(depth===0) return html.slice(start, i+1); }
  }
  throw new Error('unclosed '+name);
}

assert(/\{key:'animate', ico:'cross', label:'Animate'\}/.test(html), 'Animate is an action-bar skill');
assert(/HUD_DESK_GROUPS=\[\['pack'\],\['wall','attack','bow','bomb','ale','animate'\]/.test(html),
  'desktop bar includes Animate with the combat group');
assert(/k==='animate' && !\(typeof wearingBoneCrown/.test(html),
  'Animate is hidden unless the bone crown is worn');
assert(/const TAP=HUD_TAP/.test(html) && /HUD_TAP=44/.test(html)
  && /r:TAP\/2/.test(html),
  'phone combat buttons, including Animate, are a 44px tap');
assert(/disabled:b\.key==='animate'&&!!G\.animateDeadSpent/.test(html),
  'a spent Animate button is marked disabled');
assert(/if\(animateSpent\)/.test(extractFn('drawSlot')),
  'a spent Animate button is painted grey');
assert(/if\(key==='animate'\)/.test(extractFn('fire'))
  && /if\(G\.animateDeadSpent\) return/.test(extractFn('fire'))
  && /tryAnimateDead\(p, body\)/.test(extractFn('fire')),
  'Animate reuses tryAnimateDead and ignores a spent press');
assert(/G\.animateDeadSpent=1/.test(extractFn('tryAnimateDead')),
  'a successful raise sets the spent flag');

const ctx={
  G:{equipped:{helmet:{boneCrown:1}}, thrallId:null, animateDeadSpent:0, ents:[]},
  wearingBoneCrown(){ return true; },
  livingThrall(){ return null; },
  isAnimateDeadEligible(){ return true; },
  corpseIsBones(){ return true; },
  say(){}, hint(){}, burst(){}
};
vm.createContext(ctx);
vm.runInContext(extractFn('tryAnimateDead')+';', ctx);
const body={id:9, dead:1, corpse:1, hp:0, maxhp:12, name:'Goblin', kind:'goblin'};
const raised=ctx.tryAnimateDead({hero:1}, body);
assert(raised.ok===1 && ctx.G.animateDeadSpent===1 && body.thrall===1,
  'raising a corpse spends the power and uses the existing thrall');
ctx.G.animateDeadSpent=0;
body.animatedOnce=1;
const again=ctx.tryAnimateDead({hero:1}, body);
assert(again.ok===0 && ctx.G.animateDeadSpent===0,
  'a failed raise does not spend the power');

const snap=GS.snapshot({animateDeadSpent:1, scene:'play', ch:1});
assert(snap.animateDeadSpent===1, 'save keeps the spent flag');
const loaded={};
GS.applyCampaign(loaded, snap);
assert(loaded.animateDeadSpent===1, 'reload restores the spent flag');
const fresh=GS.snapshot({scene:'play', ch:1});
assert(fresh.animateDeadSpent===0, 'a new game saves the power unused');
const loadedFresh={animateDeadSpent:1};
GS.applyCampaign(loadedFresh, fresh);
assert(loadedFresh.animateDeadSpent===0, 'reload of an unused power clears a stale flag');

const thrallSnap=GS.snapshot({animateDeadSpent:1, thrallId:9, scene:'play', ch:1});
assert(thrallSnap.thrallId===9, 'save keeps the thrall id');
const thrallLoaded={thrallId:null};
GS.applyCampaign(thrallLoaded, thrallSnap);
assert(thrallLoaded.thrallId===9 && thrallLoaded.animateDeadSpent===1,
  'reload restores the thrall id with the spent flag');
const blank=GS.snapshot({scene:'play', ch:1});
const stale={thrallId:9, animateDeadSpent:1};
GS.applyCampaign(stale, blank);
assert(stale.thrallId==null && stale.animateDeadSpent===0,
  'a save with no thrall clears a stale id');

function numGrid(w,h,v){
  return Array.from({length:h},()=>Array.from({length:w},()=>v));
}
const world={
  ents:[
    {id:1, hero:1, team:'party', col:{key:'macar'}, name:'MACAR', x:2, y:2, hp:40, maxhp:40, dead:0},
    {id:9, kind:'undead', sprite:'undead', name:'Skeleton', team:'party', ally:1, thrall:1,
      dead:0, hp:11, maxhp:16, x:3, y:2}
  ],
  props:[], loot:[], kills:0,
  lvl:{n:1, w:4, h:4, grid:numGrid(4,4,0), seen:numGrid(4,4,1), flags:{}, secrets:[], wallHP:{}, objs:[],
    warrenSeed:1, dressSeed:1}
};
const play=GS.captureWorld(world, {nextEid:10});
const savedThrall=play.ents.find(e=>e.id===9);
assert(savedThrall && savedThrall.thrall && savedThrall.hp===11 && savedThrall.team==='party',
  'the thrall body is in the world save');
const reloaded={
  ents:[{id:1, hero:1, team:'party', col:{key:'macar'}, x:0, y:0, hp:1, maxhp:40}],
  props:[], loot:[],
  lvl:world.lvl
};
GS.applyWorld(reloaded, play);
const back=reloaded.ents.find(e=>e.id===9);
assert(back && back.thrall && !back.dead && back.hp===11,
  'continue puts the living thrall back in the ent list');
assert(/function rebindSavedThrall\(/.test(html) && /rebindSavedThrall\(\)/.test(extractFn('applyPlaySave')),
  'continue rebinds G.thrallId when the body returns without an id');

const H=require('./HudHarness');
H.ctx.wearingBoneCrown=function(){ return true; };
function rectGap(a, b){
  const dx=Math.max(b.x-(a.x+a.w), a.x-(b.x+b.w), 0);
  const dy=Math.max(b.y-(a.y+a.h), a.y-(b.y+b.h), 0);
  if(dx===0 && dy===0) return -Math.min(a.x+a.w-b.x, b.x+b.w-a.x, a.y+a.h-b.y, b.y+b.h-a.y);
  return Math.hypot(dx, dy);
}
function labelInk(b, vw, vh){
  if(!b || b.nolabel) return null;
  const port=vh>vw;
  const s=Math.max(0.66, Math.min(1.30, Math.min(vw,vh)/(port?430:700)));
  const labelPx=Math.max(10, (port?9.5:8.5)*s);
  const ty=b.y-(b.r*2)/2-7*s;
  const w='ANIMATE'.length*labelPx*0.72+8;
  return {x:b.x-w/2, y:ty-labelPx-2, w:w, h:labelPx+6};
}
[
  ['phone 390×844', 390, 844, {t:47,r:0,b:34,l:0}],
  ['phone 375×667', 375, 667, {t:20,r:0,b:0,l:0}],
  ['phone 320×568', 320, 568, {t:20,r:0,b:0,l:0}],
  ['phone L 844×390', 844, 390, {t:0,r:0,b:0,l:0}],
  ['phone L notch', 844, 390, {t:0,r:47,b:21,l:47}]
].forEach(([name, vw, vh, inset])=>{
  const L=H.layout({vw:vw, vh:vh, inset:inset, touch:true, cards:6});
  const act=L.btns.filter(b=>b.key!=='pause');
  const anim=L.find('animate');
  assert(!!anim && anim.r*2>=44-0.01 && anim.nolabel===1,
    name+' shows a 44px icon Animate button while the crown is worn');
  let worst=Infinity, pair='';
  for(let i=0;i<act.length;i++) for(let j=i+1;j<act.length;j++){
    const g=H.gap(act[i], act[j]);
    if(g<worst){ worst=g; pair=act[i].key+'/'+act[j].key; }
  }
  assert(worst>=2.9, name+' Animate does not overlap other bottom-bar buttons ('+pair+' '+worst.toFixed(1)+'px)');
  const ink=labelInk(anim, vw, vh);
  if(ink){
    let lg=Infinity, lp='';
    act.forEach(b=>{
      if(b===anim) return;
      const g=rectGap(ink, H.box(b));
      if(g<lg){ lg=g; lp=b.key; }
    });
    assert(lg>=4, name+' Animate title clears '+lp+' ('+lg.toFixed(1)+'px)');
  }
});

assert(/refreshAnimateButton\(\)/.test(extractFn('takeBoneCrown'))
  && /refreshAnimateButton\(\)/.test(extractFn('dropBoneCrown'))
  && /refreshAnimateButton\(\)/.test(extractFn('tryAnimateDead')),
  'take, an inventory drop, and a spent charge refresh Animate');
assert(/Animate is ready: the cross button\. One thrall\./.test(extractFn('takeBoneCrown')),
  'the take hint names the cross button and one thrall');
assert(/The slot frees when it falls or is turned\./.test(extractFn('tryAnimateDead'))
  && !/crown leaves/.test(extractFn('tryAnimateDead')),
  'the post-animate hint frees the slot when the thrall falls or is turned');

/* No second layoutUI from the test. The take and the drop must refresh. */
H.ctx.G.equipped={};
H.ctx.G.packs={macar:{magic:[]}};
H.ctx.G.props=[];
H.ctx.G.lvl={flags:{}};
H.ctx.G.animateDeadSpent=0;
H.ctx.say=function(){};
H.ctx.hint=function(){};
H.ctx.burst=function(){};
H.ctx.stowPackItem=function(it){ H.ctx.G.packs.macar.magic.push(it); return it; };
H.ctx.equipPackItem=function(it){ H.ctx.G.equipped.helmet=it; return 'helmet'; };
H.ctx.player=function(){ return {x:20, y:20, hero:1}; };
H.ctx.crownDropAtAltar=function(){ return false; };
['refreshAnimateButton','makeBoneCrownItem','wearingBoneCrown','takeBoneCrown','dropBoneCrown','dropPackRow']
  .forEach(n=>vm.runInContext(extractFn(n)+';', H.ctx));
const before=H.layout({vw:1280, vh:800, touch:false, cards:5});
assert(!before.find('animate'), 'Animate is absent before the crown is taken');
const loose={x:20, y:20, k:'bonecrown', gone:0};
H.ctx.G.props=[loose];
const took=H.ctx.takeBoneCrown(loose);
const shown=H.ctx.UIBTN.find(b=>b.key==='animate');
assert(took.ok===1 && !!shown && !shown.disabled,
  'Animate is on the bar right after a take, with no resize');
H.ctx.dropPackRow({kind:'magic', it:H.ctx.G.equipped.helmet, t:'Bone Crown'});
assert(!H.ctx.UIBTN.find(b=>b.key==='animate') && !H.ctx.wearingBoneCrown(),
  'Animate is gone right after an inventory drop, with no resize');

assert(/refreshAnimateButton\(\)/.test(extractFn('unequipPackSlot'))
  && /refreshAnimateButton\(\)/.test(extractFn('destroyBoneCrown'))
  && /refreshAnimateButton\(\)/.test(extractFn('doffBoneCrownAtCamp')),
  'unequip, destroy, and camp removal refresh Animate');
require('../packs/EquipmentSlots.js');
H.ctx.EquipmentSlots=global.EquipmentSlots;
H.ctx.BONE_CROWN_DESTROY_XP=5000;
H.ctx.shake=function(){};
H.ctx.ftext=function(){};
H.ctx.awardPartyXp=function(){ return 0; };
H.ctx.riseSkeletalDwarves=function(){};
H.ctx.ensureEquippedShape=function(){ H.ctx.G.equipped=H.ctx.G.equipped||{}; return H.ctx.G.equipped; };
H.ctx.ensureMacarHammer=function(){};
H.ctx.applyEquipped=function(){};
H.ctx.convertCoinsToElectrum=function(){};
['unequipPackSlot','destroyBoneCrown','doffBoneCrownAtCamp','awardCrownDestroyXp']
  .forEach(n=>vm.runInContext(extractFn(n)+';', H.ctx));
/* The test lays the bar out once while the crown is worn. It does not
   call layoutUI again. Each exit has to refresh the bar itself. */
function armGreyAnimate(){
  const crown=H.ctx.makeBoneCrownItem();
  H.ctx.G.equipped={helmet:crown};
  H.ctx.G.packs={macar:{magic:[]}};
  H.ctx.G.lvl={flags:{}};
  H.ctx.G.animateDeadSpent=1;
  H.ctx.G.campDoff=1;
  const laid=H.layout({vw:1280, vh:800, touch:false, cards:5});
  const anim=laid.find('animate');
  assert(!!anim && anim.disabled && H.ctx.wearingBoneCrown(),
    'a grey Animate button is on the bar while the crown is worn');
  return anim;
}
function animateGone(label, anim){
  const hit=H.ctx.btnAt(anim.x, anim.y);
  assert(!H.ctx.wearingBoneCrown(), label+' leaves the crown unworn');
  assert(!H.ctx.UIBTN.find(b=>b.key==='animate'), label+' does not draw Animate');
  assert(!hit || hit.key!=='animate', label+' removes the Animate hit');
}
let grey=armGreyAnimate();
assert(!!H.ctx.unequipPackSlot('helmet', {camp:1}), 'unequip stows the crown');
animateGone('unequip', grey);
grey=armGreyAnimate();
assert(H.ctx.destroyBoneCrown({worn:1, x:10, y:10}).ok===1, 'destroy shatters the crown');
animateGone('destroy', grey);
grey=armGreyAnimate();
assert(H.ctx.doffBoneCrownAtCamp().ok===1, 'camp removal sets the crown aside');
animateGone('camp removal', grey);

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nAnimate button checks passed');

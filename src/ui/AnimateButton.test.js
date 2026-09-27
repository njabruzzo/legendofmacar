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

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nAnimate button checks passed');

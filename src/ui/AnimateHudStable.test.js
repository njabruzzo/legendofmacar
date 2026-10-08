'use strict';
/**
 * Wearing the bone crown adds Animate in a home of its own.
 * Every other HUD button keeps the rect it had with the crown off.
 * Run: node src/ui/AnimateHudStable.test.js
 */
const H=require('./HudHarness');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(/function placeAnimateButton\(/.test(H.html), 'Animate has a home outside the measured bar');
assert(!/combatRow\.push\(animSkill\)/.test(H.html), 'Animate is not pushed onto the touch combat row');
const deskGroups=H.html.match(/const HUD_DESK_GROUPS=\[[^\n]+/)[0];
assert(!/'animate'/.test(deskGroups), 'Animate is not a desktop group member');
assert(/ico:'bones'/.test(H.html) && /bones:'bones'/.test(H.html),
  'Animate icon is the existing bones pile');

function boxOf(b){
  const B=H.box(b);
  return {x:B.x, y:B.y, w:B.w, h:B.h};
}
function near(a, b){
  return Math.abs(a-b)<0.01;
}
function sameBox(a, b){
  return near(a.x,b.x) && near(a.y,b.y) && near(a.w,b.w) && near(a.h,b.h);
}
function layout(spec, crown){
  H.ctx.wearingBoneCrown=function(){ return !!crown; };
  H.ctx.G.animateDeadSpent=0;
  H.ctx.G.equipped=crown?{helmet:{n:'Bone Crown', boneCrown:1}}:{};
  return H.layout(spec);
}
/* A tap inside the plate, not only the center. Circles use 70% of the
   radius so the forgiveness ring of a neighbour cannot steal it. Rects
   use a 4px inset from each edge. */
function interiorPoints(b){
  const B=boxOf(b);
  const pts=[[b.x, b.y]];
  if(b.w){
    const m=4;
    pts.push([B.x+m, B.y+m], [B.x+B.w-m, B.y+m], [B.x+m, B.y+B.h-m], [B.x+B.w-m, B.y+B.h-m]);
  } else {
    const d=b.r*0.7;
    pts.push([b.x-d, b.y], [b.x+d, b.y], [b.x, b.y-d], [b.x, b.y+d]);
  }
  return pts;
}

const CASES=[
  ['phone portrait 390×844', {vw:390, vh:844, touch:true, cards:5}],
  ['phone landscape 844×390', {vw:844, vh:390, touch:true, cards:5}],
  ['laptop 1280×800', {vw:1280, vh:800, touch:false, cards:5}],
  ['phone portrait inset', {vw:390, vh:844, inset:{t:47,r:0,b:34,l:0}, touch:true, cards:5}],
  ['phone landscape notch', {vw:844, vh:390, inset:{t:0,r:47,b:21,l:47}, touch:true, cards:5}],
  ['phone 320×568', {vw:320, vh:568, inset:{t:20,r:0,b:0,l:0}, touch:true, cards:5}],
  ['phone 375×667', {vw:375, vh:667, inset:{t:20,r:0,b:0,l:0}, touch:true, cards:5}],
  ['laptop 1366×768', {vw:1366, vh:768, touch:false, cards:5}],
  ['short 1288×449', {vw:1288, vh:449, touch:false, cards:5}],
  ['mouse 844×390', {vw:844, vh:390, touch:false, cards:5}]
];

const SHOW={
  'phone portrait 390×844':1,
  'phone landscape 844×390':1,
  'laptop 1280×800':1
};

CASES.forEach(([name, spec])=>{
  const before=layout(spec, false);
  const after=layout(spec, true);
  assert(!before.find('animate'), name+' has no Animate button before the crown');
  const anim=after.find('animate');
  assert(!!anim, name+' shows Animate after the crown');
  if(spec.touch) assert(anim && anim.r*2>=44-0.01 && anim.nolabel===1, name+' Animate is a 44px icon');
  const keys=before.btns.map(b=>b.key);
  keys.forEach(k=>{
    const a=before.find(k), b=after.btns.filter(x=>x.key===k);
    assert(b.length===1, name+' still has one '+k+' after the crown');
    if(b.length===1){
      const A=boxOf(a), B=boxOf(b[0]);
      assert(sameBox(A, B), name+' '+k+' stays '+A.x.toFixed(1)+','+A.y.toFixed(1)+' '+A.w.toFixed(1)+'×'+A.h.toFixed(1)
        +(sameBox(A,B)?'':' → '+B.x.toFixed(1)+','+B.y.toFixed(1)+' '+B.w.toFixed(1)+'×'+B.h.toFixed(1)));
    }
  });
  assert(near(before.UI.hudTop, after.UI.hudTop), name+' hud band does not jump');
  assert(near(before.UI.stickHome.x, after.UI.stickHome.x) && near(before.UI.stickHome.y, after.UI.stickHome.y)
    && near(before.UI.stickHome.r, after.UI.stickHome.r), name+' stick home stays put');
  const act=after.btns.filter(b=>b.key!=='pause');
  let worst=Infinity, pair='';
  for(let i=0;i<act.length;i++) for(let j=i+1;j<act.length;j++){
    const g=H.gap(act[i], act[j]);
    if(g<worst){ worst=g; pair=act[i].key+'/'+act[j].key; }
  }
  assert(worst>=2.9, name+' no overlaps after the crown ('+pair+' '+worst.toFixed(1)+'px)');
  if(spec.touch && anim){
    /* Mirrors drawPromptBtn: the Look / Take plate is not a UIBTN. */
    const s=Math.max(0.66, Math.min(1.30, Math.min(spec.vw, spec.vh)/(spec.vh>spec.vw?430:700)));
    const port=spec.vh>spec.vw;
    const promptH=Math.max(port?44:40, (port?48:44)*s);
    const lift=port?Math.max(56,56*s):Math.max(16,16*s);
    const clusterTop=after.UI.cluster.top;
    const promptY=Math.max(72*s, clusterTop-promptH-lift);
    const prompt={x:0, y:promptY, w:spec.vw, h:promptH};
    const B=H.box(anim);
    const dx=Math.max(prompt.x-(B.x+B.w), B.x-(prompt.x+prompt.w), 0);
    const dy=Math.max(prompt.y-(B.y+B.h), B.y-(prompt.y+prompt.h), 0);
    const pg=(dx===0&&dy===0)?-1:Math.hypot(dx,dy);
    assert(pg>=8, name+' Animate clears the Look/Take plate ('+pg.toFixed(1)+'px)');
  }
  const missed=[];
  after.btns.forEach(b=>{
    interiorPoints(b).forEach(p=>{
      const hit=after.btnAt(p[0], p[1]);
      if(hit!==b) missed.push(b.key+'@'+p[0].toFixed(0)+','+p[1].toFixed(0)+'→'+(hit&&hit.key));
    });
    /* The spot where this button sat before the crown still hits it. */
    const prev=before.find(b.key);
    if(prev){
      const hit=after.btnAt(prev.x, prev.y);
      if(hit!==b) missed.push('old '+b.key+'→'+(hit&&hit.key));
    }
  });
  assert(!missed.length, name+' taps hit the same plates after the crown'+(missed.length?' ('+missed.slice(0,4).join('; ')+')':''));

  if(SHOW[name]){
    console.log('\n'+name);
    console.log('key        before x,y,w,h                  after x,y,w,h');
    const order=before.btns.map(b=>b.key).concat(anim?'animate':[]);
    order.forEach(k=>{
      const a=before.find(k), b=after.find(k);
      const fmt=b=>b?(boxOf(b).x.toFixed(1)+','+boxOf(b).y.toFixed(1)+' '+boxOf(b).w.toFixed(1)+'×'+boxOf(b).h.toFixed(1)):'—';
      console.log(k.padEnd(10), fmt(a).padEnd(32), fmt(b));
    });
  }
});

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nAnimate HUD stays put when the crown is worn');

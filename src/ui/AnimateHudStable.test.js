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
  H.ctx.G.showLog=0;
  H.ctx.G.showObjs=0;
  H.ctx.G.miniBig=0;
  return H.layout(spec);
}
function onScreen(b, spec){
  const B=boxOf(b);
  const i=spec.inset||{t:0,r:0,b:0,l:0};
  return B.x>=(i.l||0)-0.5 && B.y>=(i.t||0)-0.5
    && B.x+B.w<=spec.vw-(i.r||0)+0.5
    && B.y+B.h<=spec.vh-(i.b||0)+0.5;
}
function rectsOverlap(B, r){
  return B.x<r.x+r.w && r.x<B.x+B.w && B.y<r.y+r.h && r.y<B.y+B.h;
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
  ['mouse 844×390', {vw:844, vh:390, touch:false, cards:5}],
  ['desktop 616×385', {vw:616, vh:385, touch:false, cards:5}],
  ['desktop 640×480', {vw:640, vh:480, touch:false, cards:5}],
  ['desktop 600×375', {vw:600, vh:375, touch:false, cards:5}]
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

/* Desktop widths that used to drop Animate entirely, then every width
   from 320 to 1920. The plate must exist, sit inside the window, and
   stay clear of the other buttons. */
[616, 640, 600].forEach(w=>{
  const spec={vw:w, vh:w===640?480:(w===616?385:375), touch:false, cards:5};
  const L=layout(spec, true);
  const anim=L.find('animate');
  assert(!!anim && onScreen(anim, spec), 'desktop '+spec.vw+'×'+spec.vh+' places Animate on screen');
});

const sweepMiss=[];
for(let w=320; w<=1920; w++){
  [375, 415, 480, 500].forEach(h=>{
    const spec={vw:w, vh:h, touch:false, cards:5};
    const L=layout(spec, true);
    const anim=L.find('animate');
    if(!anim){ sweepMiss.push(w+'×'+h+' missing'); return; }
    if(!onScreen(anim, spec)) sweepMiss.push(w+'×'+h+' offscreen');
    const others=L.btns.filter(b=>b.key!=='animate' && b.key!=='pause');
    for(let i=0;i<others.length;i++){
      if(H.gap(anim, others[i])<0){
        sweepMiss.push(w+'×'+h+' overlaps '+others[i].key);
        break;
      }
    }
  });
}
assert(!sweepMiss.length, 'Animate is placed, on screen, and clear from 320 to 1920 wide'
  +(sweepMiss.length?' ('+sweepMiss.slice(0,6).join('; ')+')':''));

/* An open LOG or QUEST covers Animate at these sizes. Hide the plate
   and ignore its hit; the other buttons keep the rects they just got. */
function panelCases(){
  return [
    ['667×375', {vw:667, vh:375, touch:true, cards:5}, 160],
    ['844×390 notch', {vw:844, vh:390, inset:{t:0,r:47,b:21,l:47}, touch:true, cards:5}, 160],
    ['375×667', {vw:375, vh:667, inset:{t:20,r:0,b:0,l:0}, touch:true, cards:5}, 240],
    ['320×568', {vw:320, vh:568, inset:{t:20,r:0,b:0,l:0}, touch:true, cards:5}, 150]
  ];
}
panelCases().forEach(([name, spec, listH])=>{
  const L=layout(spec, true);
  const anim=L.find('animate');
  const P=L.panel(listH);
  assert(!!anim && rectsOverlap(boxOf(anim), P), name+' open panel covers Animate');
  const before=L.btns.map(b=>({key:b.key, box:boxOf(b)}));
  ['showLog','showObjs'].forEach(flag=>{
    H.ctx.G.showLog=0; H.ctx.G.showObjs=0; H.ctx.G.miniBig=0;
    H.ctx.G[flag]=1;
    const hit=L.btnAt(anim.x, anim.y);
    assert(!hit || hit.key!=='animate', name+' '+flag+' ignores the Animate tap');
    const attack=L.btns.find(b=>b.key==='attack');
    assert(L.btnAt(attack.x, attack.y)===attack, name+' '+flag+' still hits Attack');
  });
  H.ctx.G.showLog=0; H.ctx.G.showObjs=0;
  assert(L.btnAt(anim.x, anim.y)===anim, name+' Animate hit returns when the panel closes');
  const moved=before.filter(b=>{
    const now=L.btns.find(x=>x.key===b.key);
    return !now || !sameBox(b.box, boxOf(now));
  });
  assert(!moved.length, name+' panel open does not move HUD plates');
});

/* The large map covers Animate's portrait home. Skip the hit while it is open. */
[['phone map 390×844', {vw:390, vh:844, touch:true, cards:5}],
 ['phone map 375×667', {vw:375, vh:667, inset:{t:20,r:0,b:0,l:0}, touch:true, cards:5}]
].forEach(([name, spec])=>{
  const L=layout(spec, true);
  const anim=L.find('animate');
  const map=L.bigMap;
  assert(!!anim && rectsOverlap(boxOf(anim), {x:map.x, y:map.y, w:map.sz, h:map.sz}),
    name+' big map covers Animate');
  H.ctx.G.miniBig=1;
  const hit=L.btnAt(anim.x, anim.y);
  assert(!hit || hit.key!=='animate', name+' big map ignores the Animate tap');
  const attack=L.btns.find(b=>b.key==='attack');
  assert(L.btnAt(attack.x, attack.y)===attack, name+' big map still hits Attack');
  H.ctx.G.miniBig=0;
  assert(L.btnAt(anim.x, anim.y)===anim, name+' Animate hit returns when the map closes');
});

const skipN=(H.html.match(/b\.key==='animate' && animateSuppressed\(\)/g)||[]).length;
assert(/function animateSuppressed\(/.test(H.html) && skipN>=2,
  'draw and hit both skip Animate while a panel or the big map is open');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nAnimate HUD stays put when the crown is worn');

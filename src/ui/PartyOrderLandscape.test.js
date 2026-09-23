'use strict';
/**
 * Phone landscape: Hold / Regroup / Focus clear the stick, Attack,
 * Defend, the specialty cluster, and the portrait cards.
 * Portrait placement stays on the pre-landscape path.
 * Run: node src/ui/PartyOrderLandscape.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

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

assert(/function placePartyOrderRow\(/.test(html), 'orders are seated by placePartyOrderRow');
assert(/layoutPartyOrders\(\)\{[\s\S]*placePartyOrderRow\(/.test(html),
  'layoutUI → layoutPartyOrders → placePartyOrderRow');
assert(/if\(!PORT\)\{[\s\S]*landscapePartyOrderSeat\(/.test(extractFn('placePartyOrderRow')),
  'every landscape uses the landscape seat; portrait keeps the ceiling clamp');
assert(!/label:'Rally'/.test(html) && !/key:'rally'/.test(extractFn('layoutPartyOrders')),
  'no Rally plate on the order row');
assert(/ASSET_VER='114'/.test(html), 'ASSET_VER stays 114');

const ctx={
  UIBTN:[], UI:{},
  HUD_TAP:44, HUD_OVERFLOW:{},
  HUD_MOBILE_ORDER:['pack','ale','search','secret','shovel','camp','craft','bow','bomb'],
  HUD_DESK_WIDE:1280, HUD_DESK_SLOT_MIN:60, HUD_DESK_SLOT_MAX:80,
  HUDSKILLS:['pack','wall','attack','bow','bomb','ale','search','secret','shovel','camp','craft'].map(k=>({key:k})),
  IS_TOUCH:true, PORT:false, VW:0, VH:0, UIS:1,
  G:{ents:[], hudMore:0}, Math
};
ctx.clamp=(v,a,b)=>v<a?a:v>b?b:v;
ctx.safeInsets=()=>ctx._inset;
ctx.partyPortraitList=()=>Array.from({length:ctx._n},(_,i)=>({
  team:'party', col:{key:'k'+i}, hero:i===0
}));
vm.createContext(ctx);
['partyPortraitFrame','partyOrderAnchor','layoutSpecialtyCluster','layoutPartyOrders','layoutUI',
 'circleRectGap','rectsMeet','landscapePartyOrderSeat','placePartyOrderRow']
  .forEach(n=>vm.runInContext(extractFn(n)+';', ctx));

function gapCircleRect(c, rect){
  const cx=Math.max(rect.x, Math.min(c.x, rect.x+rect.w));
  const cy=Math.max(rect.y, Math.min(c.y, rect.y+rect.h));
  return Math.hypot(c.x-cx, c.y-cy)-c.r;
}
function gapCircles(a,b){ return Math.hypot(a.x-b.x, a.y-b.y)-a.r-b.r; }

function measure(vw, vh, inset, n, touch){
  ctx.UIBTN.length=0;
  ctx.UI={};
  ctx.VW=vw; ctx.VH=vh;
  ctx.IS_TOUCH=touch!==false;
  ctx.PORT=vh>vw;
  ctx.UIS=ctx.clamp(Math.min(vw,vh)/(ctx.PORT?430:700), 0.66, 1.30);
  ctx._inset=inset;
  ctx._n=n;
  ctx.layoutUI();
  const orders=ctx.UIBTN.filter(b=>b.order);
  const frame=ctx.partyPortraitFrame();
  const stick=Object.assign({key:'stick'}, ctx.UI.stickHome);
  const attack=ctx.UIBTN.find(b=>b.key==='attack');
  const defend=ctx.UIBTN.find(b=>b.key==='wall');
  const specs=ctx.UIBTN.filter(b=>b.spec);
  function minGap(list, fn){
    let m=Infinity;
    for(const o of orders) for(const t of list){
      const g=fn(o,t);
      if(g<m) m=g;
    }
    return m;
  }
  const cardBottom=frame.cards.reduce((m,c)=>Math.max(m, c.y+c.h), 0);
  const cardRight=frame.x+frame.w;
  const fullyUnder=orders.every(o=>o.y-o.r>=cardBottom-0.05);
  const fullyRight=orders.every(o=>o.x-o.r>=cardRight-0.05);
  return {
    orders, frame, slot:orders[0].r*2,
    y:orders[0].y,
    left:Math.min.apply(null, orders.map(o=>o.x-o.r)),
    right:Math.max.apply(null, orders.map(o=>o.x+o.r)),
    port:minGap(frame.cards, gapCircleRect),
    stick:minGap([stick], gapCircles),
    atk:minGap([attack], gapCircles),
    def:minGap([defend], gapCircles),
    spec:minGap(specs, gapCircles),
    fullyUnder, fullyRight, cardBottom, cardRight
  };
}

function expectClear(name, vw, vh, inset, n, touch){
  const m=measure(vw, vh, inset, n, touch);
  const bits=[
    ['slot', m.slot, 44],
    ['portraits', m.port, 6],
    ['stick', m.stick, 6],
    ['Attack', m.atk, 6],
    ['Defend', m.def, 6],
    ['specialty', m.spec, 6]
  ];
  bits.forEach(b=>{
    assert(b[1]>=b[2]-0.05, name+' '+b[0]+' clearance '+b[1].toFixed(1)+'px (need ≥'+b[2]+')');
  });
  assert(m.left>=(inset.l||0)-0.05, name+' row clears the left safe area ('+m.left.toFixed(1)+' vs inset '+(inset.l||0)+')');
  assert(m.right<=vw-(inset.r||0)+0.05, name+' row clears the right safe area');
  assert(m.y+m.orders[0].r<=vh-(inset.b||0)+0.05, name+' row clears the bottom safe area');
  assert(m.fullyUnder||m.fullyRight, name+' row is fully under the cards or fully to their right'
    +' (under='+m.fullyUnder+' right='+m.fullyRight+' y='+m.y.toFixed(1)+' left='+m.left.toFixed(1)+' cardRight='+m.cardRight.toFixed(1)+')');
  console.log('table '+name.padEnd(22)
    +' port '+m.port.toFixed(1).padStart(6)
    +' stick '+m.stick.toFixed(1).padStart(6)
    +' atk '+m.atk.toFixed(1).padStart(7)
    +' def '+m.def.toFixed(1).padStart(7)
    +' spec '+m.spec.toFixed(1).padStart(7)
    +'  y='+m.y.toFixed(1));
  return m;
}

const none={t:0,r:0,b:0,l:0};
const notch={t:0,r:47,b:21,l:47};
const island={t:0,r:59,b:21,l:59};

expectClear('844×390', 844, 390, none, 5);
expectClear('844×390 notch', 844, 390, notch, 5);
expectClear('667×375', 667, 375, none, 5);
expectClear('932×430', 932, 430, none, 5);
expectClear('932×430 island', 932, 430, island, 5);
expectClear('812×375 notch', 812, 375, notch, 5);
expectClear('852×393 island', 852, 393, island, 5);
expectClear('736×414', 736, 414, none, 5);
expectClear('896×414 notch', 896, 414, notch, 5);
expectClear('844×390 six cards', 844, 390, none, 6);
expectClear('667×375 notch six', 667, 375, notch, 6);

/* DevTools device landscape can keep a mouse pointer (maxTouchPoints 0,
   desktop UA). That path used the hudTop clamp and planted the circles
   on the portrait stack. Same fail sizes, both pointer kinds. */
expectClear('mouse 844×390', 844, 390, none, 5, false);
expectClear('mouse 844×390 notch', 844, 390, notch, 5, false);
expectClear('mouse 667×375', 667, 375, none, 5, false);
expectClear('mouse 812×375 notch', 812, 375, notch, 5, false);
expectClear('mouse 932×430', 932, 430, none, 5, false);
expectClear('mouse 844×390 six', 844, 390, none, 6, false);
expectClear('mouse 667×375 six', 667, 375, notch, 6, false);

/* Portrait audit sizes stay on the old seat (ceiling clamp, not the landscape row). */
const p390=measure(390, 844, {t:47,r:0,b:34,l:0}, 5);
assert(Math.abs(p390.y-322.8)<0.2 && p390.port>20, '390×844 portrait order row stays under the cards (y='+p390.y.toFixed(1)+')');
const p375=measure(375, 667, {t:20,r:0,b:0,l:0}, 5);
assert(Math.abs(p375.y-286.3)<0.2 && p375.port>20, '375×667 portrait order row stays under the cards (y='+p375.y.toFixed(1)+')');
const p430=measure(430, 932, {t:59,r:0,b:34,l:0}, 5);
assert(Math.abs(p430.y-360.0)<0.2 && p430.port>20, '430×932 portrait order row stays under the cards (y='+p430.y.toFixed(1)+')');
const p320=measure(320, 568, {t:20,r:0,b:0,l:0}, 5);
assert(Math.abs(p320.y-248.0)<0.2 && p320.port>6, '320×568 portrait order row keeps its ceiling seat (y='+p320.y.toFixed(1)+')');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nlandscape party-order checks passed');

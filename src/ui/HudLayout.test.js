'use strict';
/**
 * Whole-HUD geometry across phones, tablets and desktops, using the real
 * layoutUI (see HudHarness). Nothing overlaps, nothing leaves the safe area,
 * every button is hit by a tap on its own center.
 * Run: node src/ui/HudLayout.test.js
 */
const H=require('./HudHarness');
const html=H.html;

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(/HUD_TOUCH_COMBAT=\['ale','bomb','bow','wall'\]/.test(html), 'touch combat row is Heal / Throw / Shoot / Defend');
assert(/HUD_DESK_GROUPS=/.test(html), 'desktop bar is grouped (PACK ‖ combat ‖ field)');
assert(/HUD_KEYS=\{/.test(html) && /b\.kc && !IS_TOUCH/.test(html), 'keycaps draw on mouse/keyboard only');
assert(/b\.label && R>=18 && !b\.nolabel/.test(html), 'touch action buttons skip text labels');

const none={t:0,r:0,b:0,l:0};
const CASES=[
  ['iPhone 390×844', 390, 844, {t:47,r:0,b:34,l:0}, true],
  ['iPhone SE 375×667', 375, 667, {t:20,r:0,b:0,l:0}, true],
  ['small 320×568', 320, 568, {t:20,r:0,b:0,l:0}, true],
  ['Pro Max 430×932', 430, 932, {t:59,r:0,b:34,l:0}, true],
  ['iPhone L 844×390', 844, 390, none, true],
  ['iPhone L notch', 844, 390, {t:0,r:47,b:21,l:47}, true],
  ['SE L 667×375', 667, 375, none, true],
  ['Pro Max L island', 932, 430, {t:0,r:59,b:21,l:59}, true],
  ['iPad 820×1180', 820, 1180, none, true],
  ['iPad L 1180×820', 1180, 820, none, true],
  ['laptop 1366×768', 1366, 768, none, false],
  ['desktop 1920×1080', 1920, 1080, none, false],
  ['short 1288×449', 1288, 449, none, false],
  ['mouse 844×390', 844, 390, none, false],
  ['1440×900', 1440, 900, none, false],
];

CASES.forEach(([name, vw, vh, inset, touch])=>{
  const L=H.layout({vw, vh, inset, touch, cards:5});
  const act=L.btns.filter(b=>b.key!=='pause');
  /* No two buttons overlap (orders and actions included). */
  let worst=Infinity, pair='';
  for(let i=0;i<act.length;i++) for(let j=i+1;j<act.length;j++){
    const g=H.gap(act[i], act[j]);
    if(g<worst){ worst=g; pair=act[i].key+'/'+act[j].key; }
  }
  assert(worst>=2.9, name+' no overlaps (tightest '+pair+' '+worst.toFixed(1)+'px)');
  /* Inside the safe area. */
  const out=act.filter(b=>{ const B=H.box(b);
    return B.x<(inset.l||0)-0.5 || B.y<(inset.t||0)-0.5 || B.x+B.w>vw-(inset.r||0)+0.5 || B.y+B.h>vh-(inset.b||0)+0.5; });
  assert(!out.length, name+' every button inside the safe area'+(out.length?' ('+out.map(b=>b.key).join(',')+')':''));
  /* Each center hits itself. */
  const miss=act.filter(b=>L.btnAt(b.x,b.y)!==b);
  assert(!miss.length, name+' every button center hits itself'+(miss.length?' ('+miss.map(b=>b.key).join(',')+')':''));
  /* Stick clear of all buttons. */
  const st=L.UI.stickHome;
  const stickGap=Math.min.apply(null, act.map(b=>H.gap(b, {x:st.x,y:st.y,r:st.r})));
  assert(stickGap>=6, name+' stick is clear of every button ('+stickGap.toFixed(1)+'px)');
  /* Every verb present. */
  const keys=['pack','wall','attack','bow','bomb','ale','search','secret','shovel','camp','craft'];
  const missing=keys.filter(k=>!L.find(k));
  assert(!missing.length, name+' all eleven verbs are on screen, none in a tray'+(missing.length?' (missing '+missing+')':''));
  /* Buttons stay clear of the portrait cards. */
  let cardGap=Infinity;
  act.filter(b=>!b.order).forEach(b=>L.frame.cards.forEach(c=>{
    const B=H.box(b);
    const dx=Math.max(c.x-(B.x+B.w), B.x-(c.x+c.w), 0), dy=Math.max(c.y-(B.y+B.h), B.y-(c.y+c.h), 0);
    cardGap=Math.min(cardGap, Math.hypot(dx,dy));
  }));
  assert(cardGap>=8, name+' action buttons clear the portrait cards ('+cardGap.toFixed(1)+'px)');

  if(touch){
    const small=act.filter(b=>!b.chip && !b.w && b.r*2<44-0.01);
    assert(!small.length, name+' round touch targets are ≥44px');
    /* Right-thumb cluster: Attack, Defend, chips all in the right third. */
    const atk=L.find('attack'), def=L.find('wall');
    assert(atk.x>vw*0.55 && def.x>vw*0.55, name+' Attack and Defend live under the right thumb');
    assert(def.y<atk.y, name+' Defend sits above Attack');
    /* Less intrusive: the action HUD takes a modest slice of the screen. */
    const area=act.reduce((a,b)=>{ const B=H.box(b); return a+B.w*B.h; }, 0)/(vw*vh);
    /* 17 thumb-sized targets have a fixed cost, so small phones get more room. */
    const short=Math.min(vw,vh);
    const cap=short>=390?0.13:short>=375?0.17:0.23;
    assert(area<=cap, name+' action plates cover '+(area*100).toFixed(1)+'% of the screen (≤'+Math.round(cap*100)+'%)');
    if(L.port){
      const hudH=vh-L.UI.hudTop, bandCap=vw>=375?0.30:0.42;
      assert(hudH<=bandCap*vh, name+' portrait thumb band is '+Math.round(hudH/vh*100)+'% of height (≤'+Math.round(bandCap*100)+'%)');
    }
  } else {
    const atk=L.find('attack');
    const row=act.filter(b=>!b.order && !b.chip);
    const ys=row.map(b=>b.y);
    assert(Math.max.apply(null,ys)-Math.min.apply(null,ys)<0.01, name+' desktop verbs share one row');
    const l=Math.min.apply(null,row.map(b=>H.box(b).x)), r=Math.max.apply(null,row.map(b=>H.box(b).x+H.box(b).w));
    assert(Math.abs((l+r)/2-vw/2)<vw*0.12 || l>L.frame.x+L.frame.w, name+' desktop bar is centered (or pushed past the portraits)');
    assert(L.UI.barDividers.length===2, name+' desktop bar has two group dividers');
    assert(atk.w>atk.h, name+' Attack is the wide slab');
  }
});

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nHUD layout checks passed');

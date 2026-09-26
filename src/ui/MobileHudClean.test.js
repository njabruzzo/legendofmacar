'use strict';
/**
 * Mobile HUD declutter (2026-09-26):
 *   - Hold / Regroup / Focus plates are gone on every layout.
 *   - Touch party strip is slim cards (face, name, rank, one bar).
 *   - Pause sits beside the minimap, not on Macar's card.
 *   - Minimap is smaller on touch and taps open a large map that never
 *     sits under a thumb button.
 *   - Combat log / objectives are two small tabs under the minimap.
 *   - The context prompt rides over the right-thumb cluster.
 * Geometry comes from the real layoutUI (see HudHarness).
 * Run: node src/ui/MobileHudClean.test.js
 */
const H=require('./HudHarness');
const html=H.html;

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}
function rectGap(a, b){
  const dx=Math.max(b.x-(a.x+a.w), a.x-(b.x+b.w), 0);
  const dy=Math.max(b.y-(a.y+a.h), a.y-(b.y+b.h), 0);
  if(dx===0 && dy===0) return -1;
  return Math.hypot(dx, dy);
}

/* Source-level wiring. */
assert(!/key:'hold'|key:'regroup'|key:'focus'/.test(html), 'no party-order plates in the HUD source');
assert(/PartyOrders\.FLAG=false/.test(html), 'party orders are switched off in play');
assert(/if\(frame\.compact\) return drawPortraitStackTouch\(/.test(html), 'touch draws the slim party cards');
assert(/if\(hudMobile\(\)\)\{\s*if\(G\.miniBig\) return;\s*return drawLogTouch\(g\);/.test(html),
  'touch log is a tab under the minimap, hidden while the large map is open');
assert(/hitRect\(UI\.miniHit,x,y\)\)\{ G\.miniBig=1/.test(html), 'tapping the minimap opens the large map');
assert(/if\(G\.miniBig\)\{ G\.miniBig=0; return; \}/.test(html), 'a non-button tap closes the large map');
assert(/G\.showLog=!G\.showLog; if\(G\.showLog && hudMobile\(\)\) G\.showObjs=0/.test(html),
  'LOG and QUEST open one at a time on touch');
const prompt=html.match(/function drawPromptBtn\([\s\S]*?\n\}/)[0];
assert(/hudMobile\(\) && UI\.cluster/.test(prompt) && /cl\.r-pw/.test(prompt) && /cl\.top-h-lift/.test(prompt),
  'touch prompt sits right-aligned over the thumb cluster, same lift');

const CASES=[
  ['iPhone 390×844', 390, 844, {t:47,r:0,b:34,l:0}],
  ['Android 412×915', 412, 915, {t:24,r:0,b:0,l:0}],
  ['iPhone SE 375×667', 375, 667, {t:20,r:0,b:0,l:0}],
  ['small 320×568', 320, 568, {t:20,r:0,b:0,l:0}],
  ['Pro Max 430×932', 430, 932, {t:59,r:0,b:34,l:0}],
  ['iPhone L 844×390', 844, 390, {t:0,r:0,b:0,l:0}],
  ['iPhone L notch', 844, 390, {t:0,r:47,b:21,l:47}],
  ['Android L 915×412', 915, 412, {t:0,r:0,b:0,l:0}],
  ['SE L 667×375', 667, 375, {t:0,r:0,b:0,l:0}],
];

CASES.forEach(([name, vw, vh, inset])=>{
  const L=H.layout({vw, vh, inset, touch:true, cards:5});
  const port=vh>vw;
  const act=L.btns.filter(b=>b.key!=='pause');
  const pause=L.find('pause');

  assert(L.orders.length===0 && !L.find('hold') && !L.find('regroup') && !L.find('focus'),
    name+' has no Hold / Regroup / Focus plates');

  /* Slim party strip. */
  const f=L.frame;
  assert(f.compact && f.h<=30 && f.w<=124, name+' party cards are slim ('+f.w+'×'+f.h+')');
  const stackH=f.stackBottom-f.y;
  assert(stackH<=5*34+0.5, name+' five cards stack in '+Math.round(stackH)+'px');
  let cardGap=Infinity;
  L.btns.forEach(b=>f.cards.forEach(c=>{ cardGap=Math.min(cardGap, rectGap(H.box(b), c)); }));
  assert(cardGap>=8, name+' every button (pause included) clears the cards ('+cardGap.toFixed(1)+'px)');

  /* Pause beside the minimap. */
  const P=H.box(pause), M={x:L.mini.x, y:L.mini.y, w:L.mini.sz, h:L.mini.sz};
  assert(pause.r*2>=44-0.01, name+' pause is a 44px target');
  assert(rectGap(P, M)>=4, name+' pause clears the minimap');
  assert(P.y>=(inset.t||0)-0.5 && P.x+P.w<=vw-(inset.r||0)+0.5, name+' pause is inside the safe area');
  assert(act.every(b=>H.gap(b, pause)>=3), name+' pause clears every action button');
  assert(L.btnAt(pause.x, pause.y)===pause, name+' pause center hits pause');

  /* Minimap + tabs. */
  assert(L.mini.sz<=76 && L.mini.sz>=64, name+' touch minimap is '+L.mini.sz+'px');
  assert(M.x+M.w<=vw-(inset.r||0)+0.5 && M.y>=(inset.t||0)-0.5, name+' minimap is inside the safe area');
  const T=L.tabs;
  assert(T.log.y>=M.y+M.h && T.obj.x>T.log.x && Math.abs(T.obj.x+T.obj.w-(M.x+M.w))<0.5,
    name+' LOG and QUEST tabs sit in one row under the minimap');
  assert(T.h+12>=42, name+' tab hit area is at least 42px tall with slop');
  const tabsBox={x:T.log.x, y:T.y, w:T.obj.x+T.obj.w-T.log.x, h:T.h};
  assert(L.btns.every(b=>rectGap(H.box(b), tabsBox)>=4), name+' tabs clear every button');
  assert(f.cards.every(c=>rectGap(c, tabsBox)>=4) && f.cards.every(c=>rectGap(c, M)>=4),
    name+' cards clear the minimap and tabs');

  /* Large map. */
  const B=L.bigMap, BB={x:B.x, y:B.y, w:B.sz, h:B.sz};
  assert(B.sz>=Math.min(220, Math.min(vw,vh)*0.55), name+' large map is '+Math.round(B.sz)+'px');
  assert(BB.x>=0 && BB.y>=0 && BB.x+BB.w<=vw && BB.y+BB.h<=vh, name+' large map is on screen');
  const under=L.btns.filter(b=>rectGap(H.box(b), BB)<0);
  assert(!under.length, name+' no thumb button sits under the large map'+(under.length?' ('+under.map(b=>b.key)+')':''));
  const st=L.UI.stickHome;
  assert(H.gap({x:st.x,y:st.y,r:st.r}, {x:BB.x+BB.w/2, y:BB.y+BB.h/2, w:BB.w, h:BB.h})>=0,
    name+' large map clears the stick');
  if(port) assert(BB.y>=tabsBox.y+tabsBox.h, name+' portrait large map opens below the corner');
  else assert(BB.x>=f.x+f.w, name+' landscape large map opens right of the party strip');

  /* An open LOG / QUEST list (7 log lines ≈ 122px) clears every button. */
  const PL=L.panel(122);
  const hitBtn=L.btns.filter(b=>rectGap(H.box(b), PL)<2);
  assert(!hitBtn.length && PL.x>=0 && PL.y+PL.h<=vh, name+' open log / quest list clears every button'+(hitBtn.length?' ('+hitBtn.map(b=>b.key)+')':''));
  assert(f.cards.every(c=>rectGap(c, PL)>=4), name+' open list clears the party cards');

  /* Thumb cluster record used by the prompt. */
  assert(L.UI.cluster && L.UI.cluster.r<=vw && L.UI.cluster.top<vh, name+' thumb cluster is recorded for the prompt');
});

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nMobile HUD declutter checks passed');

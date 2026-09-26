'use strict';
/**
 * Mobile HUD: drop the diagnostic flag, overflow Rally, 44px taps, safe-area.
 * Run: node src/ui/MobileHud.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(!/#dgBtn\{position:fixed;left:8px;bottom:8px/.test(html), 'diagnostic ⚑ is not a bottom-left DOM overlay on the stick');
assert(!/btn\.id='dgBtn'/.test(html) && !/btn\.textContent='\\u2691'/.test(html), 'dgBtn flag control is not created');
assert(/toggleDiagPanel/.test(html) && /Render passes/.test(html), 'render diagnostic is reachable from pause, not the play stick');
assert(/safe-area-inset-bottom/.test(html) && /--sab:env\(safe-area-inset-bottom/.test(html), 'safe-area CSS variables exist');
assert(/function safeInsets\(/.test(html), 'safeInsets() reads notch / home-indicator padding');

assert(/HUD_TAP=44/.test(html), 'HUD_TAP is 44');
assert(/HUD_OVERFLOW=\{\}/.test(html), 'Rally is not in HUD_OVERFLOW');
assert(/HUD_MOBILE_ORDER=\['pack','ale','search','secret','shovel','camp','craft','bow','bomb'\]/.test(html),
  'Ch1 verbs (pack/heal/search/search/dig/camp/craft) sit before shoot/throw on mobile');
assert((html.match(/label:'SEARCH'/g)||[]).length>=2, 'both search verbs read SEARCH');
assert(!/label:'Herbs'/.test(html) && !/label:'Seams'/.test(html) && !/label:'Rally'/.test(html),
  'Herbs, Seams, and Rally labels are gone');
assert(!/fillText\('ANVIL'/.test(html) && /b\.key==='craft' && !atForge/.test(html),
  'Craft dims away from the station without writing ANVIL on the icon');
assert(/G\.craftGuide/.test(html), 'Craft still points a guide arrow at the anvil');
assert(/e\.buff=8; e\.hp=Math\.min\(e\.maxhp,e\.hp\+30\)/.test(html), 'Rally mechanic is kept: heal 30 + 8s buff');
assert(/bo=e\.buff>0\?1\.5:1/.test(html) && /if\(e\.buff>0\) b\+=2/.test(html),
  'Rally buff is +2 to hit and 1.5× damage, not a party-gather');
assert(!/e\.x=p\.x/.test(html.match(/if\(key==='rally'\)\{[\s\S]*?\}/)[0]), 'Rally does not teleport / gather kin');
assert(!/Rally: war-horn/.test(html) && !/Rally \(5 \/ More\)/.test(html),
  'More tray and pause no longer advertise Rally');

/* Real mobile layout (HudHarness runs layoutUI from index.html). */
const HH=require('./HudHarness');
function sim(vw, vh, s, inset){
  const L=HH.layout({vw, vh, inset, touch:true, cards:5});
  const stick=Object.assign({}, L.UI.stickHome);
  return {L, btns:L.btns.filter(b=>b.key!=='pause' && !b.order), stick};
}
const phone=sim(390, 844, 390/430, {t:47, r:0, b:34, l:0});
const round=phone.btns.filter(b=>!b.w);
assert(round.every(b=>b.r*2>=44-0.01), '390×844 round skill targets are at least 44px');
const atk=phone.L.find('attack');
assert(atk.h>=44 && atk.w>=44, '390×844 Attack slab is at least 44px tall');
assert(phone.stick.r*2>=44, '390×844 stick diameter is at least 44px');
['pack','search','secret','shovel','camp','craft','bow','bomb','ale','wall'].forEach(k=>{
  assert(!!phone.L.find(k), '390×844 '+k+' is on screen (no More tray)');
});
assert(!phone.L.find('rally'), '390×844 Rally icon is not on the bar');
assert(phone.btns.every(b=>HH.gap(b, phone.stick)>=2), '390×844 skill plates do not overlap the stick');
const pack=phone.L.find('pack');
assert(HH.gap(pack, phone.stick)>=8, 'PACK is clear of the stick');
assert(HH.gap(atk, phone.stick)>=8, 'Attack does not overlap the movement stick');
assert(phone.stick.x-phone.stick.r > 4, 'stick sits off the left edge');
assert(phone.stick.y+phone.stick.r < 844-30, 'stick sits above the home-indicator inset');

const slim=sim(320, 568, 320/430, {t:20, r:0, b:0, l:0});
assert(slim.btns.filter(b=>!b.w).every(b=>b.r*2>=44-0.01), '320×568 still lays out 44px slots');
assert(!slim.L.find('rally'), 'narrow phones have no Rally icon');
assert(slim.btns.every(b=>HH.gap(b, slim.stick)>=1), '320×568 no stick overlap');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nMobile HUD checks passed');

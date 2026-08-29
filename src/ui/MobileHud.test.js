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

/* Simulate the mobile layout math for a 390×844 phone (Ch1 thumb zone). */
function sim(vw, vh, s, inset){
  const TAP=44, gap=5, rowGap=16, PORT=vh>vw;
  const padL=Math.max(inset.l||0, 8);
  const padR=Math.max(inset.r||0, 8);
  const padB=Math.max(inset.b||0, PORT?10:8);
  const combatKeys={attack:1, wall:1};
  const overflowAlways={};
  const order=['pack','ale','search','secret','shovel','camp','craft','bow','bomb'];
  const rest=order.filter(k=>!combatKeys[k] && !overflowAlways[k]);
  const cSlot=Math.max(TAP, Math.min(PORT?64:56, Math.min(vw,vh)*0.125));
  const cx=vw - padR - 8 - cSlot/2;
  const attackY=vh - padB - 8 - cSlot/2;
  const defendY=attackY - (cSlot + rowGap);
  const stickR=Math.max(TAP/2, PORT?26*s:28*s);
  const stickX=padL + 6 + stickR;
  const stickReserve=stickX + stickR + 16;
  const rightReserve=(vw-cx) + cSlot/2 + 8;
  const availW=Math.max(TAP, vw - stickReserve - rightReserve);
  const fit=Math.floor((availW+gap)/(TAP+gap));
  const perRow=Math.max(1, Math.min(5, fit||1));
  const raw=(availW-(perRow-1)*gap)/perRow;
  const slot=Math.min(Math.max(TAP, Math.min(PORT?52:48, raw)), raw);
  const maxPrimary=perRow*2;
  const needMore=rest.length>maxPrimary;
  const primaryCap=needMore?Math.max(1, maxPrimary-1):maxPrimary;
  const primary=rest.slice(0, primaryCap);
  const extra=rest.slice(primaryCap);
  const overflow=extra.slice();
  const keys=overflow.length?primary.concat(['more']):primary;
  const nRows=Math.ceil(keys.length/perRow);
  const by=vh - padB - 8 - slot/2;
  const topY=by - (nRows-1)*(slot+rowGap);
  const left=stickReserve;
  const btns=[];
  keys.forEach((key,i)=>{
    const ri=(i/perRow)|0, ci=i%perRow;
    btns.push({key, x:left+ci*(slot+gap)+slot/2, y:topY+ri*(slot+rowGap), r:slot/2});
  });
  btns.push({key:'attack', x:cx, y:attackY, r:cSlot/2});
  btns.push({key:'wall', x:cx, y:defendY, r:cSlot/2});
  const stick={x:stickX, y:by, r:stickR};
  return {slot, cSlot, perRow, primary, overflow, btns, stick, nRows, availW};
}

function circlesOverlap(a,b,pad){
  return Math.hypot(a.x-b.x, a.y-b.y) < a.r+b.r-(pad||0);
}

const phone=sim(390, 844, 390/430, {t:47, r:0, b:34, l:0});
assert(phone.slot>=44-0.01, '390×844 skill slots are at least 44px (got '+phone.slot.toFixed(1)+')');
assert(phone.cSlot>=44, '390×844 Attack/Defend are at least 44px');
assert(phone.stick.r*2>=44, '390×844 stick diameter is at least 44px');
assert(phone.primary.includes('pack') && phone.primary.includes('search') && phone.primary.includes('camp'),
  '390×844 keeps PACK, Herbs, Camp on the thumb row');
assert(!phone.primary.includes('rally') && !phone.overflow.includes('rally'),
  '390×844 Rally icon is not on the bar or in More');
assert(phone.btns.every(b=>!circlesOverlap(b, phone.stick, 2)), '390×844 skill circles do not overlap the stick');
const camp=phone.btns.find(b=>b.key==='camp');
assert(!camp || !circlesOverlap(camp, phone.stick, 8), 'Camp does not sit on the movement stick');
const pack=phone.btns.find(b=>b.key==='pack');
assert(pack && pack.x-pack.r > phone.stick.x+phone.stick.r+4, 'PACK is to the right of the stick, not on it');
const attack=phone.btns.find(b=>b.key==='attack');
assert(attack && !circlesOverlap(attack, phone.stick, 8), 'Attack does not overlap the movement stick');
assert(phone.stick.x-phone.stick.r > 4, 'stick sits off the left edge');
assert(phone.stick.y+phone.stick.r < 844-30, 'stick sits above the home-indicator inset');

const slim=sim(320, 568, 320/430, {t:20, r:0, b:0, l:0});
assert(slim.slot>=40, '320×568 still lays out real slots (got '+slim.slot.toFixed(1)+')');
assert(!slim.primary.includes('rally') && !slim.overflow.includes('rally'),
  'narrow phones have no Rally icon');
assert(slim.btns.every(b=>!circlesOverlap(b, slim.stick, 1)), '320×568 no stick overlap');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nMobile HUD checks passed');

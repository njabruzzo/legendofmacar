'use strict';
/**
 * Specialty lives in the combat cluster, not HUDSKILLS.
 * Run: node src/ui/SpecialtyHud.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

const hud=html.match(/const HUDSKILLS=\[[\s\S]*?\];/)[0];
assert(!/spec1/.test(hud) && !/specialty/.test(hud),
  'I–IV are not added to HUDSKILLS');
assert(/HUD_MOBILE_ORDER=\['pack','ale','search','secret','shovel','camp','craft','bow','bomb'\]/.test(html),
  'Craft / SEARCH / Dig / Camp stay on the utility row');
assert(/function layoutSpecialtyCluster\(/.test(html),
  '2×2 combat-cluster helper exists');
assert(/fillText\('Specialty'/.test(html), 'HUD title is Specialty above the set, not on the art');
assert(/if\(e\.key==='6'\) fire\('spec1'\)/.test(html) && /if\(e\.key==='9'\) fire\('spec4'\)/.test(html),
  'keys 6–9 arm I–IV');
assert(/if\(k==='v'\) fire\('wall'\)/.test(html) && /if\(e\.key==='1'\) fire\('attack'\)/.test(html),
  'V Defend and 1 Attack are not stolen');
assert(/if\(k==='f'\) fire\('search'\)/.test(html) && /if\(k==='t'\) fire\('secret'\)/.test(html)
  && /if\(k==='k'\) fire\('craft'\)/.test(html),
  'F / T / K stay SEARCH and Craft');
assert(!/key:'rally'/.test(hud), 'no Rally icon');
assert(/icon_specialty_i/.test(html) && /icon_specialty_iv/.test(html),
  'Limner plates are wired');

function circlesOverlap(a,b,pad){
  return Math.hypot(a.x-b.x, a.y-b.y) < a.r+b.r-(pad||0);
}
function specCluster(ax, belowY, belowR, specSlot, specGap){
  const slot=Math.max(specSlot||44, 44);
  const gap=Math.max(specGap||8, 8);
  const bottomY=belowY - belowR - gap - slot/2;
  const topY=bottomY - slot - gap;
  const leftX=ax - (slot+gap)/2;
  const rightX=ax + (slot+gap)/2;
  return {
    slot, gap,
    titleY: topY - slot/2 - 11,
    plates:[
      {key:'spec1', x:leftX, y:topY, r:slot/2},
      {key:'spec2', x:rightX, y:topY, r:slot/2},
      {key:'spec3', x:leftX, y:bottomY, r:slot/2},
      {key:'spec4', x:rightX, y:bottomY, r:slot/2}
    ]
  };
}

/* Phone 390×844 — same utility math as MobileHud.test.js, plus the 2×2. */
function phoneSim(){
  const vw=390, vh=844, s=390/430, TAP=44, gap=5, rowGap=16, PORT=1;
  const padL=8, padR=8, padB=10;
  const insetB=34;
  const padB2=Math.max(insetB, PORT?10:8);
  const cSlot=Math.max(TAP, Math.min(PORT?64:56, Math.min(vw,vh)*0.125));
  const cx=vw - padR - 8 - cSlot/2;
  const attackY=vh - padB2 - 8 - cSlot/2;
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
  const order=['pack','ale','search','secret','shovel','camp','craft','bow','bomb'];
  const maxPrimary=perRow*2;
  const needMore=order.length>maxPrimary;
  const primaryCap=needMore?Math.max(1, maxPrimary-1):maxPrimary;
  const primary=order.slice(0, primaryCap);
  const nRows=Math.ceil((primary.length+(needMore?1:0))/perRow);
  const by=vh - padB2 - 8 - slot/2;
  const topY=by - (nRows-1)*(slot+rowGap);
  const left=stickReserve;
  const btns=[];
  const keys=needMore?primary.concat(['more']):primary;
  keys.forEach((key,i)=>{
    const ri=(i/perRow)|0, ci=i%perRow;
    btns.push({key, x:left+ci*(slot+gap)+slot/2, y:topY+ri*(slot+rowGap), r:slot/2});
  });
  btns.push({key:'attack', x:cx, y:attackY, r:cSlot/2});
  btns.push({key:'wall', x:cx, y:defendY, r:cSlot/2});
  const spec=specCluster(cx, defendY, cSlot/2, Math.max(44, Math.min(cSlot, 52)), 8);
  spec.plates.forEach(p=>btns.push(p));
  return {btns, spec, attack:btns.find(b=>b.key==='attack'), primary};
}

const phone=phoneSim();
assert(phone.spec.slot>=44 && phone.spec.gap>=8, 'phone plates are ≥44px with gap ≥8');
assert(phone.spec.plates[0].y < phone.spec.plates[2].y, 'I II sit above III IV');
assert(phone.spec.plates[0].x < phone.spec.plates[1].x, 'I is left of II');
assert(phone.attack.y > phone.spec.plates[2].y, 'Attack stays the big bottom button');
assert(phone.primary.includes('search') && phone.primary.includes('secret') && phone.primary.includes('craft'),
  'phone does not dump SEARCH or Craft into More');
const search=phone.btns.find(b=>b.key==='search');
const secret=phone.btns.find(b=>b.key==='secret');
const craft=phone.btns.find(b=>b.key==='craft');
phone.spec.plates.forEach(p=>{
  assert(!circlesOverlap(p, search, 2), 'phone '+p.key+' does not cover SEARCH');
  assert(!circlesOverlap(p, secret, 2), 'phone '+p.key+' does not cover the other SEARCH');
  if(craft) assert(!circlesOverlap(p, craft, 2), 'phone '+p.key+' does not cover Craft');
  assert(!circlesOverlap(p, phone.attack, 2), 'phone '+p.key+' does not cover Attack');
});

/* Laptop: 2×2 immediately above the Attack slot. */
const deskAttack={x:640, y:700, r:30};
const desk=specCluster(deskAttack.x, deskAttack.y, deskAttack.r, 48, 8);
assert(desk.slot>=48 && desk.gap>=8, 'laptop plates are ≥48px with gap ≥8');
assert(desk.plates[3].y + desk.plates[3].r + 8 <= deskAttack.y - deskAttack.r + 0.01,
  'laptop 2×2 sits immediately above Attack');
assert(desk.titleY < desk.plates[0].y - desk.plates[0].r,
  'Specialty title sits above the plates, not on the art');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nspecialty HUD checks passed');

'use strict';
/**
 * Specialty I–IV are four small numbered chips in one row directly under the
 * Attack slab (same width as the slab). Not in HUDSKILLS; no big 2×2 plates.
 * Run: node src/ui/SpecialtyHud.test.js
 */
const H=require('./HudHarness');
const html=H.html;

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

const hud=html.match(/const HUDSKILLS=\[[\s\S]*?\];/)[0];
assert(!/spec1/.test(hud) && !/specialty/.test(hud), 'I–IV are not added to HUDSKILLS');
assert(/function layoutSpecialtyCluster\(/.test(html), 'chip-row helper exists');
assert(/function drawSpecChip\(/.test(html), 'chips have their own compact draw');
assert(!/fillText\('Specialty'/.test(html), 'no floating Specialty title over the playfield');
assert(/String\(b\.spec\)/.test(H.extractFn('drawSpecChip')), 'chips are labelled with numbers 1–4');
assert(/if\(e\.key==='6'\) fire\('spec1'\)/.test(html) && /if\(e\.key==='9'\) fire\('spec4'\)/.test(html),
  'keys 6–9 still arm I–IV');
assert(/if\(k==='v'\) fire\('wall'\)/.test(html) && /if\(e\.key==='1'\) fire\('attack'\)/.test(html),
  'V Defend and 1 Attack are not stolen');
assert(/icon_specialty_i/.test(html) && /icon_specialty_iv/.test(html), 'Limner plate assets stay registered');

function checkChips(name, L){
  const atk=L.find('attack');
  const chips=L.chips;
  assert(chips.length===4, name+' has four chips');
  assert(atk && atk.w>atk.h, name+' Attack is a wide slab ('+(atk&&atk.w.toFixed(0))+'×'+(atk&&atk.h.toFixed(0))+')');
  const A=H.box(atk);
  const left=Math.min.apply(null, chips.map(c=>c.x-c.w/2));
  const right=Math.max.apply(null, chips.map(c=>c.x+c.w/2));
  assert(Math.abs(left-A.x)<0.5 && Math.abs(right-(A.x+A.w))<0.5, name+' chip row spans exactly the slab width');
  const top=Math.min.apply(null, chips.map(c=>c.y-c.h/2));
  assert(top>=A.y+A.h-0.01 && top-(A.y+A.h)<=8, name+' chips sit directly under Attack ('+(top-(A.y+A.h)).toFixed(1)+'px)');
  assert(chips.every((c,i)=>i===0 || c.x>chips[i-1].x), name+' chips run 1→4 left to right');
  assert(chips.every(c=>c.h<atk.h && c.w<atk.w/3), name+' chips are smaller than the slab');
  chips.forEach(c=>{
    assert(L.btnAt(c.x, c.y)===c, name+' tapping chip '+c.spec+' hits chip '+c.spec);
  });
  if(L.touch){
    assert(chips.every(c=>c.w>=40), name+' touch chips are ≥40px wide');
    const c=chips[0];
    const hitH=[c.y-c.h/2-6, c.y+c.h/2+6];
    const lo=L.btnAt(c.x, hitH[1]-0.5), hi=L.btnAt(c.x, hitH[0]+0.5);
    assert(lo===c && (hi===c || hi===atk), name+' chip tap band is ≥44px tall ('+(c.h+12)+')');
  }
  const bottom=Math.max.apply(null, chips.map(c=>c.y+c.h/2));
  assert(bottom<=L.vh-(L.inset.b||0)+0.01, name+' chips clear the bottom safe area');
}

checkChips('phone 390×844', H.layout({vw:390, vh:844, inset:{t:47,r:0,b:34,l:0}}));
checkChips('phone 844×390', H.layout({vw:844, vh:390}));
checkChips('phone 932×430 island', H.layout({vw:932, vh:430, inset:{t:0,r:59,b:21,l:59}}));
checkChips('laptop 1366×768', H.layout({vw:1366, vh:768, touch:false}));
checkChips('desktop 1920×1080', H.layout({vw:1920, vh:1080, touch:false}));
checkChips('short 1288×449', H.layout({vw:1288, vh:449, touch:false}));

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nspecialty HUD checks passed');

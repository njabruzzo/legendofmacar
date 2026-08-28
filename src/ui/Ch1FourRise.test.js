'use strict';
/**
 * Chapter I opening: raise all four fallen kin as ghosts.
 * Run: node src/ui/Ch1FourRise.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(!/const CH1_RISE=/.test(html), 'two-rise CH1_RISE table is gone');
assert(!/function canRiseKin\(/.test(html), 'canRiseKin gate is gone');
assert(!/Raise only Pordum and Fendur/.test(html), 'copy no longer says raise only two');
assert(!/The other two stay fallen/.test(html), 'copy no longer leaves Orbo and Talpor down');

assert(/e\.crushed && e\.col && e\.team==='party'/.test(html),
  'lootCorpse raises crushed party kin');
assert(/makeGhostAlly\(e\)/.test(html), 'ghost rise path is used');
assert(/restoreGhostKit\(e\)/.test(html), 'kit rides with the ghost after they rise');

assert(/Rouse ':'Loot /.test(html), 'prompt is Rouse for crushed party kin');
assert(/canRiseKin\(more\)\?'Rouse '/.test(html)===false,
  'Rouse prompt is not limited to a two-kin list');
assert(/e\.hero \|\| e\.ghost \|\| e\.crushed/.test(html),
  'HUD portraits are Macar plus all four fallen kin');

assert(/Wake the fallen under the boulders/.test(html), 'Ch1 objective wakes the fallen');
assert(!/Wake Pordum and Fendur under the boulders/.test(html),
  'Ch1 objective is not limited to two names');
assert(/e\.crushed&&e\.corpse&&!e\.ghost/.test(html),
  'guide arrow points at fallen kin who still need to rise');
assert(/z\.crushed&&z\.corpse&&!z\.ghost/.test(html),
  'east chamber opens after all four rise');

assert(/Walk to each of them and Rouse them/.test(html), 'intro ask tells Macar to rouse each kin');
assert(/Pordum, Fendur, Orbo and Talpor lie dead under the boulders\. Raise all four/.test(html),
  'descend log names all four to raise');
assert(/Pordum, Fendur, Orbo and Talpor lie west\. Walk to each and Rouse them/.test(html),
  'after Descend, the hint names all four');

assert(/orbo:\{x:19\.35/.test(html) && /talpor:\{x:17\.65/.test(html),
  'Orbo and Talpor still spawn as named corpses with kits');
assert(/kit:\{gp:18/.test(html) && /kit:\{torches:3/.test(html),
  'Orbo and Talpor still carry kits that become ghost kit on rise');
assert(/pordoom:'PORDUM:/.test(html) && /fendur:'FENDUR:/.test(html)
  && /orbo:'ORBO:/.test(html) && /talpor:'TALPOR:/.test(html),
  'all four have ghost rise lines');

assert(/if\(!hero && n!==1 && !raised\) return;/.test(html),
  'later chapters still only join kin already in ghostAllies');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nChapter I four-rise checks passed');

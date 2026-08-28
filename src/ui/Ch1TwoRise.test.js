'use strict';
/**
 * Chapter I opening: raise only Pordum and Fendur. Orbo and Talpor stay corpses/loot.
 * Run: node src/ui/Ch1TwoRise.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

const rise=html.match(/const CH1_RISE=\{[^}]+\}/);
assert(!!rise, 'CH1_RISE table exists');
assert(/pordoom:1/.test(rise&&rise[0]) && /fendur:1/.test(rise&&rise[0]), 'Chapter I rise keys are Pordum and Fendur');
assert(!/orbo:1/.test(rise&&rise[0]) && !/talpor:1/.test(rise&&rise[0]), 'Orbo and Talpor are not Chapter I rise keys');
assert((html.match(/CH1_RISE\[/g)||[]).length>=1, 'CH1_RISE is consulted');

assert(/function canRiseKin\(e\)\{/.test(html), 'canRiseKin helper exists');
assert(/e\.crushed && e\.col && e\.team==='party' && canRiseKin\(e\)/.test(html),
  'lootCorpse only raises kin who are on the Chapter I rise list');
assert(/makeGhostAlly\(e\)/.test(html), 'ghost rise path is still used for the two');

assert(/Rouse ':'Loot /.test(html) && /canRiseKin\(more\)\?'Rouse '/.test(html),
  'prompt is Rouse for the two, Loot for the corpses who stay down');
assert(/e\.hero \|\| e\.ghost \|\| \(e\.crushed && canRiseKin\(e\)\)/.test(html),
  'HUD portraits are Macar plus the two raisable kin only');

assert(/Wake Pordum and Fendur under the boulders/.test(html), 'Ch1 objective names the two who rise');
assert(!/Wake the fallen under the boulders/.test(html), 'Ch1 objective no longer wakes all four');
assert(/e\.crushed&&e\.corpse&&!e\.ghost&&canRiseKin\(e\)/.test(html),
  'guide arrow points at the two who still need to rise, not loot corpses');
assert(/z\.crushed&&z\.corpse&&!z\.ghost&&canRiseKin\(z\)/.test(html),
  'east chamber opens after the two rise, even if Orbo and Talpor still lie there');

assert(/Raise only Pordum and Fendur/.test(html), 'intro ask says raise only two');
assert(/Four kin lie dead\. Raise Pordum and Fendur\. The other two stay fallen/.test(html),
  'descend log matches the two-rise opening');
assert(/Pordum and Fendur lie west\. Walk to them to raise them/.test(html),
  'after Descend, the hint names the two who rise');
assert(!/Walk over them to take their kit/.test(html),
  'post-descend hint no longer treats all four as a loot walk');
assert(/r\.key!=='macar' && !CH1_RISE\[r\.key\]/.test(html),
  'opening sheet dump is Macar plus the two, not all four fallen');

assert(/if\(!hero && n!==1 && !raised\) return;/.test(html),
  'later chapters still only join kin already in ghostAllies');
assert(/function joinAllies\(list\)\{/.test(html), 'joinAllies helper remains');
assert(!(/joinAllies\(/.test(html.replace(/function joinAllies\(list\)\{/, ''))),
  'no later-chapter join beat calls joinAllies; extra two stay dead in Ch1');

assert(/kit:\{gp:18/.test(html) && /talpor:\{x:17\.65/.test(html),
  'Orbo and Talpor still spawn as named corpses with kits');
assert(/restoreGhostKit\(e\)/.test(html) && /packGainNote\(bits, e\.name\)/.test(html),
  'kit still moves on rise (ghost pack) and on loot (Macar pack)');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nChapter I two-rise checks passed');

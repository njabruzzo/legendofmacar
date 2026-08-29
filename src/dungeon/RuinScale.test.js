'use strict';
/**
 * Chapter III ruins are a larger field of destroyed buildings.
 * Run: node src/dungeon/RuinScale.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

const start=html.indexOf('if(n===3){');
const next=html.indexOf('if(n===4){', start+1);
const ch3=html.slice(start, next);
assert(ch3.length>80, 'chapter III block found');
assert(/L\.w=118; L\.h=96/.test(ch3), 'ruin map is a larger field of streets');
assert(/rect\(g,82,8,20,14,0\)/.test(ch3) && /rect\(g,40,72,26,16,0\)/.test(ch3),
  'chapter III adds east manors and far-south courts');
assert(/dressRuinBuildings\(L\)/.test(ch3), 'destroyed buildings are dressed onto the ruin');
assert(/function dressRuinBuildings\(/.test(html), 'ruin-building helper exists');
assert(/fallen house/.test(ch3) && /east manor/.test(ch3) && /south street/.test(ch3),
  'side ruins have their own monster nests');
assert(/L\.n===3\?22/.test(html), 'ruin dressing scatters more rubble than other halls');
assert(/footprints=\[/.test(html) && /\[6,8,12,10\]/.test(html) && /\[20,54,24,12\]/.test(html)
  && /\[84,8,16,12\]/.test(html) && /\[100,40,14,16\]/.test(html),
  'ancient building footprints cover north, south, and new east streets');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nruin scale checks passed');

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

const ch1=html.slice(html.indexOf('if(n===1){'), html.indexOf('if(n===2){'));
assert(/L\.w=96; L\.h=76/.test(ch1), 'chapter I mine is a larger hall field');
assert(/rect\(g,14,14,18,16,0\)/.test(ch1) && /rect\(g,24,7,28,28,0\)/.test(ch1),
  'chapter I start rooms stay on the old tiles');
assert(/L\.rubyDoor=\{x:36\.5,y:7\.28\}/.test(ch1) && /k:'lift'/.test(ch1),
  'ruby door and lift stay findable');
assert(/rect\(g,22,52,18,14,0\)/.test(ch1) && /rect\(g,72,16,16,12,0\)/.test(ch1),
  'chapter I adds a south store and east shop');

const ch4=html.slice(html.indexOf('if(n===4){'), html.indexOf('if(n===5){'));
assert(/L\.w=110; L\.h=88/.test(ch4), 'chapter IV drowned city is a larger street field');
assert(/rect\(g,42,8,18,16,0\)/.test(ch4) && /rect\(g,38,34,24,16,0\)/.test(ch4),
  'illithid outpost and brain chamber stay on the old tiles');
assert(/rect\(g,82,8,20,14,0\)/.test(ch4) && /rect\(g,38,68,24,14,0\)/.test(ch4),
  'chapter IV adds an east quay and south cistern');

const ch5=html.slice(html.indexOf('if(n===5){'), html.indexOf('sealOuter(L.grid);'));
assert(/L\.w=88; L\.h=80/.test(ch5), 'chapter V temple is a larger hall');
assert(/k:'altar'/.test(ch5) && /k:'throne'/.test(ch5), 'altar and throne stay findable');
assert(/rect\(g,64,14,18,16,0\)/.test(ch5) && /rect\(g,18,56,22,14,0\)/.test(ch5),
  'chapter V adds an east chapel and south court');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nruin scale checks passed');

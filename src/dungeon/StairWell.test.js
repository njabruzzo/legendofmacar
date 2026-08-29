'use strict';
/**
 * Stairway-down must read immediately: no arch-metric squash, painted height,
 * bronze lip / hole / rail / well torch. Independent of draft #81 landings.
 * Run: node src/dungeon/StairWell.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(/function drawStairWell\(g,z,p\)\{/.test(html), 'drawStairWell paints the descent well');
assert(/if\(p\.k==='stairs'\) drawStairWell/.test(html), 'stair props draw the well under the billboard');
assert(/case 'stairs':\s*drawStairWell/.test(html), 'stairs still read if the PNG is missing');

const metric=html.match(/function tilesetPropMetric\(k, L\)\{[\s\S]*?\n\}/)[0];
assert(/k==='gate'\|\|k==='bronzedoor'\|\|k==='altar'\|\|k==='throne'/.test(metric),
  'arch metric still covers gate / bronze door / altar / throne');
assert(!/k==='stairs'/.test(metric), 'stairs are not squashed to the short arch metric');

assert(/if\(k==='stairs'\) return 124\*z\*\(p\.s\|\|1\)/.test(html),
  'stair billboard is taller than the old 96*z arch-height');

assert(/function drawStairWell\(g,z,p\)\{/.test(html) && /const H=propSpriteH\(p,z\)/.test(html) && /rw=H\*0\.50/.test(html),
  'well lip is sized to the stair billboard, not a tiny arch');
assert(/rgba\(0,0,0,0\.92\)/.test(html), 'the hole is a dark well, not floor-gray');
assert(/fillRect\(-rw\*0\.72-post/.test(html) && /fillRect\(rw\*0\.82-post/.test(html),
  'short rails stand on the lip');
assert(/g\.fillStyle='#ff9a44'/.test(html.match(/function drawStairWell[\s\S]*?g\.restore\(\);\n\}/)[0]),
  'a torch burns in the well');

assert(/emit\(s\.x,s\.y-8\*z,52\*z,'#1a0c08'/.test(html), 'well mouth emits a dark core');
assert(/emit\(s\.x\+8\*z,s\.y\+6\*z,18\*z,'#ff9a44'/.test(html), 'well torch glow is on the floor opening');

assert(/L\.stair=\{x:40\.1,y:54\.15\}/.test(html), 'chapter II stair stay put — no #81 landing rewrite');
assert(!/16×16 hall/.test(html) && !/13×16 pad/.test(html), 'this change does not take #81 pad text');

assert(fs.existsSync(path.join(__dirname,'../../assets/props/prop_stairs.png')),
  'painted stair prop remains in-repo');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nstair well checks passed');

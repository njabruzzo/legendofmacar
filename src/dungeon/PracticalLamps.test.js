'use strict';
/**
 * Dungeon light is lamps and torches, not floating globes.
 * Run: node src/dungeon/PracticalLamps.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

const gather=html.match(/function gatherLights\(L\)\{[\s\S]*?\nfunction gatherLightsCapped/);
assert(!!gather, 'gatherLights exists');
const g=gather?gather[0]:'';
assert(/pr\.k==='lantern'/.test(g), 'lanterns add a warm floor punch');
assert(/pr\.k==='brazier'/.test(g), 'braziers still light the hall');
assert(!/pr\.k==='shroom'/.test(g) && !/pr\.k==='glowcap'/.test(g),
  'mushrooms and glowcaps are not floor globes');
assert(!/pr\.k==='nightbloom'/.test(g) && !/pr\.k==='lichen'/.test(g),
  'herb glow is not a floating orb');
assert(!/pr\.k==='crystal'/.test(g) && !/pr\.k==='slime'/.test(g) && !/pr\.k==='moss'/.test(g),
  'dress props do not paint magic floor patches');
assert(!/pr\.k==='gate'/.test(g), 'gates do not throw a cyan globe');

const lightsBlock=html.match(/L\.lights=\[\{[\s\S]*?\];/g)||[];
const joined=lightsBlock.join('\n');
assert(!/#a06cff|#6fd0ff|#c07bff|#7ad0ff|#8aa0b8|#a35bff|#ff7ad9|#7dff9a|#4ce0ff/.test(joined),
  'chapter light tables are lamp amber, not magic globes');
assert(!/L\.lights\.push\(\{x:40\.0,y:41\.2,c:'#8aa0b8'/.test(html),
  'Chapter II no longer plants a spare blue globe by the camp lantern');

assert(/\{x:10\.4,y:30\.2,k:'lantern'\}/.test(html) && /\{x:18\.2,y:63\.4,k:'lantern'\}/.test(html),
  'Chapter II hangs lamps where the old purple globes sat');
assert(/k:'lantern'/.test(html.match(/if\(n===4\)\{[\s\S]*?if\(n===5\)\{/)[0]),
  'Chapter IV still places lanterns');

assert(!/emit\(s\.x,s\.y-22\*z,86\*z,'#7dff9a'/.test(html),
  'stairs do not bloom a green globe');
assert(!/ray\(s\.x,s\.y-16\*z,64\*z,'#c8ffd8'/.test(html),
  'stairs do not throw a mint god-ray');
assert(/emit\(s\.x-10\*z,s\.y-36\*z,28\*z,'#ffb45c'/.test(html),
  'stair wells keep practical torch bloom');
assert(!/if\(QUALITY && h2\(x\*3,y\*7\)>0\.86\) emit\(/.test(html),
  'masonry no longer blooms QUALITY wall globes');
assert(!/emit\(sx\.x,sx\.y-H\*0\.38,16\*z,'#c9b895'/.test(html),
  'dwarf-face carving is not a beige orb');
assert(!/emit\(s\.x,s\.y-28\*z, \(k==='lichen'\?18:36\)\*z\*b/.test(html),
  'plant sprites no longer emit floating orbs');
assert(!/emit\(s\.x,s\.y-34\*z\*sz,42\*z\*b\*sz,'#b57cff'/.test(html),
  'painted shrooms do not throw purple globes');
assert(!/emit\(s\.x,s\.y-54\*z,80\*z,'#6fd0ff'/.test(html),
  'gate fallback does not bloom cyan');

assert(/c:'#7dff9a'/.test(html)===false || /burst\(dest\.x, dest\.y, '#ffc061'/.test(html),
  'king-stair burst is lamp gold, not a green globe');
assert(/L\.lights\.push\(\{x:mouth\.x,y:mouth\.y,c:'#ffb45c'/.test(html),
  'warren mouth is a torch, not a green orb');
assert(/L\.lights\.push\(\{x:L\.kingEntry\.x,y:L\.kingEntry\.y,c:'#ffb45c'/.test(html),
  'king entry is a torch');

assert(/L\.stair=\{x:40\.1,y:54\.15\}/.test(html),
  'Chapter II stair stay put — no #81 landing rewrite');
assert(/function applyLighting\(g,L\)\{/.test(html) && /createRadialGradient/.test(html),
  'lightmap engine is unchanged — only the sources');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\npractical lamp checks passed');

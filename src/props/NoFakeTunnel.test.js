'use strict';
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL', msg); }
  else console.log('ok   ', msg);
}

assert(!/k:'tunnel'/.test(html), 'no placed tunnel props');
assert(!/arches:\['gate','tunnel'\]/.test(html), 'cave tileset no longer stamps the mine door');
assert(!/arches:\['rubydoor_face','bronzedoor','gate','tunnel'\]/.test(html), 'dungeon tileset no longer stamps the mine door');
assert(!/p\.k==='tunnel'/.test(html), 'passages no longer treat a fake door as an exit');

assert(/k:'timber'/.test(html) && /k:'orepile'/.test(html) && /k:'pickpile'/.test(html),
  'chapter I mouth keeps miner gear on the walls');
assert(/k:'banner'/.test(html) && /k:'urn'/.test(html),
  'later halls use ruin/temple dressing instead of a mine door');

const ch1=html.match(/if\(n===1\)\{[\s\S]*?if\(n===2\)\{/);
assert(ch1 && !/k:'tunnel'/.test(ch1[0]), 'chapter I has no mine entrance');
assert(ch1 && /24\.15,y:15\.25,k:'timber'/.test(ch1[0]), 'chapter I timber sits on the north lip');
assert(ch1 && /24\.35,y:28\.85,k:'timber'/.test(ch1[0]), 'chapter I timber sits on the south lip');
assert(ch1 && !/24\.4,y:21\.5/.test(ch1[0]), 'chapter I walkway is clear of the old door');

if(failed){ console.error(failed+' failed'); process.exit(1); }
console.log('No-fake-tunnel tests passed');

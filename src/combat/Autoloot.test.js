'use strict';
/**
 * Macar loots by walking over a corpse. Tap is only a fallback.
 * Run: node src/combat/Autoloot.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(/function corpseWalkReach\(/.test(html), 'walk-over reach helper exists');
assert(/if\(body && body\.crushed && body\.team==='party'\) return 1\.55/.test(html),
  'fallen-kin walk-over is wide enough to step onto the body');
assert(/return 1\.88/.test(html.match(/function corpseWalkReach[\s\S]*?\n\}/)[0]),
  'dead foes loot when Macar walks onto the corpse');
assert(/const body=nearestCorpse\(p,corpseWalkReach\(null\)\)/.test(html),
  'each walk step looks for a corpse underfoot');
assert(/if\(dist\(p,body\)<reach\) lootNearbyCorpses\(p,reach\)/.test(html),
  'walk-over calls lootNearbyCorpses without a tap');
assert(/interact\(\(more\.crushed&&more\.team==='party'\?'Rouse ':'Loot '/.test(html),
  'tap loot / rouse remains as a fallback only');
assert(!/\?0\.98:1\.72/.test(html), 'old tight 0.98 fallen-kin walk radius is gone');
assert(/function lootCorpse\(/.test(html) && /makeGhostAlly\(e\)/.test(html),
  'walking a crushed kin still raises the ghost and takes kit');
assert(/spawnLoot\(e\.x\+ox, e\.y\+oy, pile\)/.test(html) && /floor\._corpse=e\.id/.test(html),
  'a kill pile sits on the corpse and walk-over takes it once');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nautoloot checks passed');

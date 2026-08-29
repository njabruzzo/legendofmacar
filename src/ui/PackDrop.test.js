'use strict';
/**
 * Pack titles are large; Macar can Drop an item onto the floor.
 * Run: node src/ui/PackDrop.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

const pack=html.match(/function drawPack\(g\)\{[\s\S]*?\nfunction wareCostGp/);
assert(!!pack, 'drawPack exists');
const block=pack?pack[0]:'';
assert(/PORT\?17\*s:22\*s/.test(block), 'item titles are large (17/22), not the old 12/13');
assert(!/700 '\+\(PORT\?12\*s:13\*s\)/.test(block), 'old tiny pack titles are gone');
assert(/PORT\?20\*s:26\*s/.test(block), 'BACKPACK header is large');
assert(/rowH=Math\.min\(PORT\?76\*s:82\*s/.test(block), 'rows are tall enough for the big titles');
assert(/drawChip\(g,dropX,dropY,dropW,dropH,'Drop'/.test(block), 'each pack row has a Drop action');
assert(/dropPackRow\(r\)/.test(block), 'Drop calls dropPackRow');

assert(/function dropPackRow\(/.test(html), 'dropPackRow exists');
assert(/function packRowToPile\(/.test(html), 'dropped kit becomes a floor pile');
assert(/spawnLoot\(x, y, packRowToPile\(r, taken\)\)/.test(html), 'drop puts the pile at Macar\'s feet');
assert(/removePackRow\(r\)/.test(html.match(/function dropPackRow[\s\S]*?\nfunction removePackRow/)[0]),
  'drop removes the item from the pack');
assert(/MACAR drops /.test(html), 'drop speaks a log line');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\npack drop and title checks passed');

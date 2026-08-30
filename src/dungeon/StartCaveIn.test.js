'use strict';
/**
 * Chapter I west entry: stacked cave-in on the x=13 face, not a rubble hedge.
 * Run: node src/dungeon/StartCaveIn.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(/START_CAVEIN_SCALE=1\.45/.test(html), 'stack is 1.45× hall wall height');
assert(/function startCaveInH\(L\)\{ return hallWallH\(L\)\*START_CAVEIN_SCALE; \}/.test(html),
  'cave-in height is hallWallH × 1.45, not ruby-north or #81');
assert(/function drawStartCaveInCell\(/.test(html), 'west face draws a stacked collapse');
assert(/function startCaveInBlocks\(/.test(html) && /x<15\.12 && y>=16 && y<=30/.test(html),
  'the collapse lip is not walkable');
assert(/if\(startCaveInBlocks\(x,y\)\) return false;/.test(html),
  'walk() refuses the west cave-in');

assert(/if\(isStartBackWall\(L,x,y\)\)\{ drawStartCaveInCell\(g,L,x,y\); return; \}/.test(html),
  'wall pass paints the cave-in instead of skipping to black');
assert(/const tall=startCaveInH\(L\);/.test(html)
  && /s\.y-tall\*0\.48/.test(html),
  'fog punch matches the tall stack, not a floor ellipse');

const rubble=html.match(/function startBackWallRubble\(\)\{[\s\S]*?\n\}/)[0];
assert(!/k:'cavein',s:0\.7/.test(rubble) && !/i<22/.test(rubble) && !/i<16/.test(rubble),
  'back-wall helper is no longer 22+16 waist-high chips plus short cavein');
assert(!/k:'timber',fallen:1/.test(rubble),
  'broken beams are on the wall stack, not extra floor hedges');
assert(/k:'dust'/.test(rubble), 'foot of the pile still has dust');
assert(!/k:'lantern'/.test(rubble), 'no T-post on the cave-in stack');

assert(/WALL_RUBY_NORTH_SCALE=1\.58/.test(html) && /function isRubyNorthWall/.test(html),
  'did not take #81 / #44 or rewrite the ruby north wall');
assert(/y===6 && x>=24 && x<=51/.test(html), 'ruby raise is still the north chamber face');
assert(/spawn=\{x:20\.5,y:22\.0\}/.test(html), 'spawn stays in front of the collapse');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nwest start cave-in checks passed');

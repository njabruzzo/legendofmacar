'use strict';
/**
 * Chapter I ruby-chamber north wall: door + dwarf face sit inside the wall mass.
 * Run: node src/dungeon/RubyNorthWall.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(/WALL_HALL_SCALE=0\.70/.test(html), 'hall faces stay 0.70 — do not hide south/east loot');
assert(/return wallFaceH\(L\)\*1\.28/.test(html), 'rubyDoorH stays *1.28 (do not take #81 door scale)');
assert(/WALL_RUBY_NORTH_SCALE=1\.58/.test(html), 'north wall scale clears the 1.28 door arch');
const north=Number((html.match(/WALL_RUBY_NORTH_SCALE=([0-9.]+)/)||[])[1]);
assert(north>1.28, 'ruby north wall is taller than the ruby door');
assert(/function isRubyNorthWall\(L,x,y\)/.test(html)
  && /y===6 && x>=24 && x<=51/.test(html),
  'ruby raise is the y=6 chamber face, not the west entry skip wall');
assert(/function isStartBackWall\(L,x,y\)\{\s*return !!\(L && L\.n===1 && x===13/.test(html),
  'west cave-in wall helper is still the x=13 skip, not a raised north face');
assert(/if\(isStartBackWall\(L,x,y\)\) return;/.test(html),
  'west start-back-wall skip stays — do not take #81 visible-descent wall draw');
assert(/isRubyNorthWall\(L,x,y\)\?rubyNorthWallH\(L\):\(useWallFaces\(L\)\?wallFaceH\(L\):TH\)/.test(html),
  'fog punch only grows for the raised ruby north face');
assert(/k:'dwarfface'/.test(html) && /dwarfFaceH\(L\)/.test(html),
  'dwarf-face prop still hangs on the north wall plane');
assert(fs.existsSync(path.join(__dirname,'../../assets/props/prop_dwarfface.png')),
  'bas-relief dwarf face sheet is in-repo');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nruby north wall checks passed');

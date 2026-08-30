'use strict';
/**
 * Hall visibility: wall-face scale + draw-order, not 1-tile Ch1 maps.
 * Run: node src/dungeon/HallVisibility.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(/WALL_HALL_SCALE=0\.70/.test(html), 'masonry wall faces are scaled down so near-wall floor shows');
assert(/function hallWallH\(L\)/.test(html), 'hallWallH exists');
assert(/function actorDrawDepth\(o\)/.test(html), 'actorDrawDepth exists');
assert(/function wallHidesFloor\(L,x,y\)/.test(html), 'south/east/SE/SW walls are the occluders');
assert(/ix\+1\]===1/.test(html) && /ix-1\]===1/.test(html),
  'wallHidesFloor includes the SE and SW neighbor tiles');
assert(/const H=hallWallH\(L\)/.test(html), 'drawWallCell uses the shorter hall face height');
assert(/function rubyDoorH\(L\)\{/.test(html) && /return wallFaceH\(L\)\*1\.28/.test(html),
  'ruby doors still use full wallFaceH (do not fight descent visibility)');
assert(/function isRubyNorthWall\(L,x,y\)/.test(html) && /L\.n===1 && y===6 && x>=24 && x<=51/.test(html),
  'only the Chapter I ruby-chamber north face is raised');
assert(/WALL_RUBY_NORTH_SCALE=1\.58/.test(html) && /function rubyNorthWallH\(L\)/.test(html),
  'ruby north wall is taller than the door arch, halls stay 0.70');
assert(/const faceH=isRubyNorthWall\(L,x,y\)\?rubyNorthWallH\(L\):H/.test(html),
  'drawWallCell keeps hallWallH and only swaps the ruby north face');

assert(/push\(actorDrawDepth\(d\)/.test(html), 'decals sort past south/east walls');
assert(/push\(actorDrawDepth\(p\)/.test(html), 'props sort past south/east walls');
assert(/push\(actorDrawDepth\(q\)/.test(html), 'loot sorts past south/east walls');
assert(/push\(actorDrawDepth\(e\)/.test(html), 'ents/corpses/rats sort past south/east walls');

assert(/ZOOM = clamp\(Math\.min\(VW,VH\*1\.5\)\/780, 0\.78, 1\.38\)/.test(html),
  'camera zoom cap is pulled back so Macar does not fill the path');

assert(/wd=wd\|\|5/.test(html), 'corridor default width is 5 tiles, not 3');
const ch3=html.slice(html.indexOf('if(n===3){'), html.indexOf('if(n===4){'));
assert(/corridor\(g,12,28,24,28,6,0\)/.test(ch3), 'chapter III halls are 6 tiles wide');
const ch4=html.slice(html.indexOf('if(n===4){'), html.indexOf('if(n===5){'));
assert(/corridor\(g,14,28,26,28,6,0\)/.test(ch4), 'chapter IV halls are 6 tiles wide');
assert(/corridor\(g,16,44,28,44,6,0\)/.test(html), 'chapter V halls are 6 tiles wide');

assert(/rect\(g,14,14,18,16,0\)/.test(html) && /rect\(g,24,7,28,28,0\)/.test(html),
  'chapter I start rooms stay isometric chambers (grid was never a 1-tile tunnel)');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nhall visibility checks passed');

'use strict';
/**
 * Ruby-door dwarf face: open mouth stays usable. No T-post on the carving,
 * no leftover globe on the face or hall.
 * Run: node src/dungeon/FaceMouthClear.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(/function timberOnDwarfMouthLane\(/.test(html), 'mouth-lane helper exists');
assert(/function billboardCoversDwarfMouth\(/.test(html), 'billboard AABB skips the mouth');
assert(/function dwarfMouthWorld\(/.test(html) && /y:f\.y\+1\.15/.test(html),
  'mouth point is face.y+1.15');
assert(/Math\.abs\(p\.x-f\.x\)<2\.2 && p\.y>=7 && p\.y<=16/.test(html),
  'T-post lane is |x-face|<2.2 and y 7..16');
assert(/timberOnDwarfMouthLane\(p\) \|\| billboardCoversDwarfMouth\(p\)/.test(html),
  'drawProp skips timber that covers the mouth');
assert(/timberOnDwarfMouthLane\(p, \{x:43\.2,y:7\.28\}\)/.test(html),
  'chapter I strips leftover T-posts on the face lane');

assert(!/\{x:43,y:14,k:'lantern'\}/.test(html), 'lantern T-post is off the face X');
assert(!/\{x:44\.5,y:12\.5,k:'pillar'\}/.test(html), 'pillar is off the face lane');
assert(/\{x:39\.6,y:17\.2,k:'lantern'\}/.test(html), 'T-post stays in the hall, south of the mouth');
assert(/\{x:47\.2,y:17\.4,k:'pillar'\}/.test(html), 'pillar stays in the hall, off the mouth');
assert(/\{x:43\.2,y:7\.28,k:'dwarfface'\}/.test(html), 'face still hangs on the north wall');
assert(/drawIsoPlaneImg\(g, img, p\.x-half, yPlane, p\.x\+half, yPlane, H\)/.test(html),
  'face stays a wall-plane bas-relief');

assert(!/emit\(sx\.x,sx\.y-H\*0\.38,16\*z,'#c9b895'/.test(html),
  'dwarf face does not bloom a globe on the carving');
assert(!/\{x:43\.2,y:7\.6,c:'#c9b895'/.test(html),
  'no beige light planted on the mouth');
assert(!/\{x:42,y:13,c:'#ffb45c'/.test(html) && !/\{x:27,y:12,c:'#ffb45c'/.test(html),
  'unattached hall globes next to the face are gone');
assert(!/\{x:19\.0,y:21\.5,c:'#c9a070'/.test(html),
  'spawn beige orb is gone');
assert(!/if\(QUALITY && h2\(x\*3,y\*7\)>0\.86\) emit\(/.test(html),
  'QUALITY no longer stamps random wall globes');
assert(!/emit\(s\.x,s\.y-36\*z,22\*z,'#c9a070',0\.28\)/.test(html),
  'secret-door prop does not throw a wall orb');

const ch1=html.match(/if\(n===1\)\{[\s\S]*?if\(n===2\)\{/)[0];
assert(/k:'dwarfface'/.test(ch1) && /k:'rubydoor'/.test(ch1), 'ch1 still has door + face');
assert(!/#c9b895|#6fd0ff|#8aa0b8|#c084ff|#7ad8ff|#c07bff/.test(ch1.match(/L\.lights=\[\{[\s\S]*?\];/)[0]),
  'ch1 light table is lamp amber and ruby, not magic globes');
assert(/WALL_RUBY_NORTH_SCALE=1\.58/.test(html) && /function isRubyNorthWall/.test(html),
  'did not take #81 / #44 wall rewrite');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nface mouth / orb checks passed');

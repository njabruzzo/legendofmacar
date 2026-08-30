'use strict';
/**
 * South / SE / SW walls: living party stay on the floor, in front of the face.
 * Run: node src/dungeon/SouthWallClip.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

function extractFn(name){
  const re=new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}');
  const m=html.match(re);
  if(!m) throw new Error('missing '+name);
  return m[0];
}

assert(/WALL_FACE_CLEAR=0\.55/.test(html), 'living party keep a south/SE/SW face margin');
assert(/function wallFaceClear\(/.test(html) && /function needsWallFaceClear\(/.test(html),
  'wall-face clearance is a named gate on canBe');
assert(/if\(!walk\(x,y,e\)\) return false;/.test(extractFn('canBe')),
  'canBe now refuses a center that sits on a wall tile');
assert(/wallFaceClear\(x,y,e\)/.test(extractFn('canBe')),
  'canBe applies face clearance after the ±r samples');
assert(/e\.hero \|\| e\.team==='party'/.test(extractFn('needsWallFaceClear')),
  'clearance is Macar and living party only');
assert(/!e\.dead && !e\.crushed/.test(extractFn('needsWallFaceClear')),
  'dead / crushed party do not take the living clearance');

assert(/const se=g\[iy\+1\]&&g\[iy\+1\]\[ix\+1\]===1/.test(extractFn('wallHidesFloor')),
  'wallHidesFloor sees the SE wall tile');
assert(/const sw=g\[iy\+1\]&&g\[iy\+1\]\[ix-1\]===1/.test(extractFn('wallHidesFloor')),
  'wallHidesFloor sees the SW wall tile');
assert(/o\.kind==='dwarf'&&!o\.dead&&!o\.crushed\) return \(d\+2\)\|0/.test(extractFn('actorDrawDepth')),
  'living dwarves sort past the SE wall tile (+2)');
assert(/return \(d\+1\)\|0/.test(extractFn('actorDrawDepth')),
  'dead / crushed / rats keep the +1 south/east bump');

assert(/WALL_HALL_SCALE=0\.70/.test(html), 'halls are not narrowed');
assert(/WALL_RUBY_NORTH_SCALE=1\.58/.test(html), 'ruby north wall scale is unchanged');
assert(/wd=wd\|\|5/.test(html), 'corridor default width is unchanged');

const grid=[];
for(let j=0;j<8;j++){
  grid[j]=[];
  for(let i=0;i<8;i++) grid[j][i]=0;
}
for(let i=0;i<8;i++) grid[5][i]=1;
for(let j=0;j<8;j++) grid[j][6]=1;
grid[5][2]=1;
grid[5][4]=1;

const ctx={
  G:{lvl:{w:8,h:8,grid}},
  startCaveInBlocks(){ return false; }
};
function extractThrough(name, until){
  const start=html.indexOf('function '+name+'(');
  if(start<0) throw new Error('missing '+name);
  const end=html.indexOf('\nfunction '+until+'(', start);
  if(end<0) throw new Error('missing end '+until);
  return html.slice(start, end);
}
vm.createContext(ctx);
vm.runInContext(
  extractThrough('walk','move')
  +extractFn('wallHidesFloor')+extractFn('actorDrawDepth'),
  ctx);

const mac={hero:1, team:'party', kind:'dwarf', dead:0, crushed:0, hidden:0, r:0.38};
const kin={hero:0, team:'party', kind:'dwarf', dead:0, crushed:0, hidden:0, ghost:1, r:0.38};
const foe={hero:0, team:'foe', kind:'goblin', dead:0, crushed:0, r:0.38};
const rat={hero:0, team:'foe', kind:'rat', dead:0, crushed:0, r:0.28};
const corpse={hero:0, team:'party', kind:'dwarf', dead:1, crushed:0, r:0.38};

assert(ctx.walk(3.5, 4.5, mac)===true, 'walk still allows the floor tile center');
assert(ctx.walk(3.5, 5.2, mac)===false, 'walk still refuses a south wall tile');
assert(ctx.canBe(3.5, 4.20, 0.38, mac)===true, 'Macar can stand mid-tile north of a south wall');
assert(ctx.canBe(3.5, 4.52, 0.38, mac)===false, 'Macar cannot put boots on the south face / coping');
assert(ctx.canBe(3.5, 4.52, 0.38, kin)===false, 'living kin cannot slide into that south face');
assert(ctx.canBe(3.5, 4.52, 0.38, foe)===true, 'foes keep the old ±r tile test (no party margin)');
assert(ctx.canBe(5.52, 3.4, 0.38, mac)===false, 'Macar cannot occupy an east face (SE travel)');
assert(ctx.canBe(5.20, 3.4, 0.38, mac)===true, 'east clearance leaves the rest of the tile walkable');
assert(ctx.canBe(3.5, 4.52, 0.38, mac)===false, 'SW/south face still blocked for the party');
assert(ctx.wallFaceClear(2.20, 4.52, mac)===false,
  'SW corner keeps party off the west+south mass');
assert(ctx.canBe(3.5, 4.20, 0.38, kin)===true, 'kin still form on open floor');
assert(ctx.needsWallFaceClear(corpse)===false, 'a fallen kin is not held off the ledge');

assert(ctx.wallHidesFloor(ctx.G.lvl, 3.4, 4.2)===true, 'south neighbor hides the floor');
assert(ctx.wallHidesFloor(ctx.G.lvl, 5.2, 3.2)===true, 'east neighbor hides the floor');
assert(ctx.wallHidesFloor(ctx.G.lvl, 5.2, 4.2)===true, 'SE wall tile hides the floor');
assert(ctx.wallHidesFloor(ctx.G.lvl, 1.2, 1.2)===false, 'open floor is not hidden');

const southWallDepth=3+5;
const seWallDepth=6+5;
const dwarfSouth=ctx.actorDrawDepth({x:3.4,y:4.2,kind:'dwarf',dead:0,crushed:0});
const dwarfSE=ctx.actorDrawDepth({x:5.2,y:4.2,kind:'dwarf',dead:0,crushed:0});
const ratSE=ctx.actorDrawDepth({x:5.2,y:4.2,kind:'rat',dead:0,crushed:0});
const deadSE=ctx.actorDrawDepth({x:5.2,y:4.2,kind:'dwarf',dead:1,crushed:0});
assert(dwarfSouth>=southWallDepth, 'living dwarf depth is at least the south wall tile');
assert(dwarfSE>=seWallDepth, 'living dwarf depth reaches the SE wall tile (not behind it)');
assert(ratSE===((5.2+4.2+1)|0) && ratSE<seWallDepth, 'rats keep +1 and may stay behind SE masonry');
assert(deadSE===((5.2+4.2+1)|0), 'dead dwarves keep the old +1 sort');
assert(ctx.actorDrawDepth({x:1.2,y:1.2,kind:'dwarf',dead:0,crushed:0})===((1.2+1.2)|0),
  'open-floor dwarves are not depth-bumped');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nsouth / SE / SW wall clip checks passed');

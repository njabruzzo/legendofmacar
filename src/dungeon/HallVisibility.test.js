'use strict';
/**
 * Hall visibility: wall-face scale + draw-order, not 1-tile Ch1 maps.
 * Run: node src/dungeon/HallVisibility.test.js
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
assert(/const faceH=cellWallH\(L,x,y\)/.test(html)
  && /function cellWallH\(L,x,y\)/.test(html)
  && /function wallHeightOverride\(/.test(html)
  && /if\(isRubyNorthWall\(L,x,y\)\) return rubyNorthWallH\(L\)/.test(html)
  && /if\(isTeethNorthWall\(L,x,y\)\) return teethNorthWallH\(L\)/.test(html)
  && /if\(isTeethFaceWall\(L,x,y\)\) return teethFaceWallH\(L\)/.test(html),
  'drawWallCell asks cellWallH so ruby, teeth, and a per-tile override can raise one face');

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

const shade=html.slice(html.indexOf('function drawMemoryShade'), html.indexOf('function drawBeyondMask'));
const chapelSkip=shade.indexOf('if(nearTeethChapel(L,x,y)) continue;');
const wallDisc=shade.indexOf('} else if(t===1||t===2){');
assert(chapelSkip>=0 && wallDisc>chapelSkip, 'chapel skip runs before the wall disc');
assert(/else if\(t===1\|\|t===2\)\{\s*const H=useWallFaces\(L\)\?wallFaceH\(L\):TH;\s*g\.beginPath\(\);\s*g\.ellipse\(s\.x, s\.y-H\*0\.38, TW\*0\.62, TH\*0\.9\+H\*0\.28, 0, 0, TAU\);\s*g\.fill\(\);/.test(shade),
  'remembered hall walls still take the main wall disc');
function extractFn(name){
  const start=html.indexOf('function '+name+'(');
  if(start<0) throw new Error('missing '+name);
  let i=html.indexOf('{', start), depth=0;
  for(;i<html.length;i++){
    if(html[i]==='{') depth++;
    else if(html[i]==='}'){ depth--; if(depth===0) return html.slice(start, i+1); }
  }
  throw new Error('unclosed '+name);
}
const room=/const x0=(\d+), y0=(\d+), rw=(\d+), rh=(\d+)/.exec(html);
assert(!!room, 'teeth chapel room origin is the bound used by the skip');
const x0=+room[1], y0=+room[2], rw=+room[3], rh=+room[4];
const discs=[];
let cell=null;
const box={
  VW:200, VH:200, TW:84, TH:42, TAU:Math.PI*2, G:{},
  s2w(){ return {x:70, y:0}; },
  w2s(x,y){ cell={x,y}; return {x:0,y:0}; },
  useWallFaces(){ return true; },
  wallFaceH(){ return 40; }
};
/* Four frustum corners must cover the hall sample and the chapel wall. */
let corner=0;
const corners=[{x:70,y:0},{x:120,y:0},{x:70,y:20},{x:120,y:20}];
box.s2w=function(){ return corners[corner++%4]; };
vm.createContext(box);
vm.runInContext(
  [extractFn('isWalkTile'), extractFn('teethBounds'), extractFn('nearTeethChapel'), extractFn('drawMemoryShade')].join('\n'),
  box);
const W=130, H=24;
const grid=[], seen=[], vis=[];
for(let y=0;y<H;y++){
  grid[y]=[]; seen[y]=[]; vis[y]=[];
  for(let x=0;x<W;x++){
    grid[y][x]=1; seen[y][x]=1; vis[y][x]=0;
  }
}
const L={
  w:W, h:H, grid, seen, vis,
  teethBounds:{x0, y0, x1:x0+rw, y1:y0+rh}
};
const g={
  save(){}, restore(){}, beginPath(){}, moveTo(){}, lineTo(){}, closePath(){},
  fill(){},
  ellipse(){ discs.push(cell.x+','+cell.y); }
};
box.drawMemoryShade(g, L);
assert(box.nearTeethChapel(L,102,1) && discs.indexOf('102,1')<0,
  'discs are skipped near the teeth chapel');
assert(discs.indexOf('86,15')>=0, 'a disc is still drawn on remembered hall wall (86,15)');
assert(discs.indexOf('101,15')>=0, 'a disc is still drawn on remembered hall wall (101,15)');
assert(/isWalkTile\(t\)/.test(shade), 'out-of-sight floor still shades as the tile diamond');
assert(/function drawBeyondMask/.test(html) && /fillStyle=rock/.test(html),
  'unexplored rock stays a solid mask, not a disc');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nhall visibility checks passed');

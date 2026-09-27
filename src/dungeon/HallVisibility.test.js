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

const shade=html.slice(html.indexOf('function shadeRectOverlap'), html.indexOf('function drawBeyondMask'));
const chapelSkip=shade.indexOf('if(nearTeethChapel(L,x,y)) continue;');
const wallDisc=shade.indexOf('} else if(t===1||t===2){');
assert(chapelSkip>=0 && wallDisc>chapelSkip, 'chapel skip runs before the wall disc');
assert(/g\.ellipse\(s\.x, s\.y-H\*0\.38, TW\*0\.62, TH\*0\.9\+H\*0\.28, 0, 0, TAU\);/.test(shade),
  'remembered hall walls still take the main wall disc');
assert(/shadeRectOverlap\(memoryShadeDiscRect\(s,H\), chapelGuard\)/.test(shade),
  'a wall disc is skipped only when its screen rectangle meets the chapel');
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
const drawn=[];
let cell=null;
const box={
  VW:1024, VH:576, TW:100, TH:50, TAU:Math.PI*2, ZOOM:100/84,
  G:{props:[], lvl:null},
  Math, clamp:(v,a,b)=>v<a?a:v>b?b:v,
  s2w(){ return {x:70, y:0}; },
  w2s(x,y){ cell={x,y}; return {x:(x-y)*(box.TW/2), y:(x+y)*(box.TH/2)}; },
  useWallFaces(){ return true; },
  wallFaceH(){ return 287*(box.TH/96); }
};
/* Four frustum corners must cover the hall sample and the chapel wall. */
let corner=0;
const corners=[{x:60,y:-2},{x:140,y:-2},{x:60,y:30},{x:140,y:30}];
box.s2w=function(){ return corners[corner++%4]; };
vm.createContext(box);
vm.runInContext(
  ['const DEMON_FACE_PLATE={w:298,h:392,pad:16};',
   'const DEMON_FACE_CONTENT_SCALE=2.40;',
   'const WALL_HALL_SCALE=0.70;',
   'const WALL_TEETH_NORTH_SCALE=2.25;',
   'const WALL_TEETH_FACE_SCALE=3.15;',
   extractFn('isWalkTile'), extractFn('teethBounds'), extractFn('nearTeethChapel'),
   extractFn('isTeethNorthWall'), extractFn('isTeethFaceWall'),
   extractFn('hallWallH'), extractFn('teethNorthWallH'), extractFn('teethFaceWallH'),
   extractFn('teethAltarSheetH'),
   extractFn('shadeRectOverlap'), extractFn('memoryShadeDiscRect'), extractFn('chapelShadeGuardRect'),
   extractFn('drawMemoryShade')].join('\n'),
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
  n:1, w:W, h:H, grid, seen, vis,
  teethBounds:{x0, y0, x1:x0+rw, y1:y0+rh}
};
box.G.lvl=L;
const g={
  save(){}, restore(){}, beginPath(){}, moveTo(){}, lineTo(){}, closePath(){},
  fill(){},
  ellipse(cx,cy,rx,ry){
    discs.push(cell.x+','+cell.y);
    drawn.push({x:cell.x, y:cell.y, rect:{x0:cx-rx, y0:cy-ry, x1:cx+rx, y1:cy+ry}});
  }
};
box.drawMemoryShade(g, L);
const guard=box.chapelShadeGuardRect(L);
assert(!!guard, 'chapel shade guard is the face, north and east walls, and altar');
assert(box.nearTeethChapel(L,102,1) && discs.indexOf('102,1')<0,
  'discs are skipped near the teeth chapel');
assert(discs.indexOf('86,15')>=0, 'a disc is still drawn on remembered hall wall (86,15)');
assert(discs.indexOf('101,15')>=0, 'a disc is still drawn on remembered hall wall (101,15)');
assert(discs.indexOf('107,0')<0 && discs.indexOf('114,8')<0 && discs.indexOf('116,6')<0,
  'buried rock north and east of the chapel does not draw a disc on it');
const overlap=drawn.filter(d=>box.shadeRectOverlap(d.rect, guard));
assert(overlap.length===0, 'no drawn disc rectangle meets the chapel guard ('+overlap.map(d=>d.x+','+d.y).slice(0,8).join(' ')+')');

/* Scripted walk: real hasLOS / rebuildVision, not a forced full reveal.
   After the walk, no drawn disc meets the chapel rectangle. */
{
  const hashes='function h2(x,y){ let n=(x|0)*374761393+(y|0)*668265263; n=(n^(n>>13))*1274126177; return ((n^(n>>16))>>>0)/4294967295; }\n'
    +'function h3(x,y,s){ let n=(x|0)*374761393+(y|0)*668265263+(s|0)*1442695041; n=(n^(n>>13))*1274126177; return ((n^(n>>16))>>>0)/4294967295; }\n';
  function sliceBetween(a,b){
    const start=html.indexOf(a);
    const end=html.indexOf(b, start+a.length);
    if(start<0||end<0) throw new Error('slice fail '+a);
    return html.slice(start, end);
  }
  box.say=function(){};
  box.hint=function(){};
  vm.runInContext(hashes
    +sliceBetween('function newGrid(w,h,f){','function paintSeenWalls(L){')
    +sliceBetween('function corridor(g,x1,y1,x2,y2,wd,t){','/* ==========================================================================')
    +'const SIGHT_R=12;\n'
    +['paintSeenWalls','tileBlocksSight','hasLOS','rebuildVision','player',
      'secretFaceOk','normalizeSecretFace','sealSecretCells','addSecretDoor',
      'applyTeethFaceWallHeight','buildTeethCrownRoom'].map(extractFn).join('\n'),
    box);
  vm.runInContext(`
    var Lv={n:1,w:132,h:90,flags:{},secrets:[],lights:[],grid:newGrid(132,90,1),wallHP:{}};
    corridor(Lv.grid,88,21,106,21,5,0);
    rect(Lv.grid,102,15,10,14,0);
    addSecretDoor(Lv,{x:106.5,y:15.05,i:105,j:15,w:3,h:1,kind:'teeth',face:'n', hint:''});
    rect(Lv.grid,105,15,3,1,0); rect(Lv.grid,105,16,3,1,0);
    G.lvl=Lv; G.props=[];
    buildTeethCrownRoom(Lv, Lv.secrets[0]);
    Lv.seen=[]; Lv.vis=[];
    for(let y=0;y<Lv.h;y++){ Lv.seen[y]=new Uint8Array(Lv.w); Lv.vis[y]=new Uint8Array(Lv.w); }
    G.ents=[{hero:1,dead:0,x:106.5,y:18}];
    const path=[];
    for(let y=18;y>=3;y-=0.4) path.push([106.5,y]);
    for(let x=101.5;x<=112.2;x+=0.4) path.push([x,3.2]);
    for(let y=3.2;y<=13;y+=0.4) path.push([111.5,y]);
    for(let x=112;x>=101.5;x-=0.4) path.push([x,8]);
    for(let y=8;y<=16;y+=0.4) path.push([106.5,y]);
    path.push([107.1,6.2]);
    for(let i=0;i<path.length;i++){
      G.ents[0].x=path[i][0]; G.ents[0].y=path[i][1];
      rebuildVision();
    }
  `, box);
  const walked=box.G.lvl;
  const outside=[];
  for(let y=0;y<walked.h;y++) for(let x=0;x<walked.w;x++){
    if(!walked.seen[y]||!walked.seen[y][x]) continue;
    if(walked.vis[y]&&walked.vis[y][x]) continue;
    if(walked.grid[y][x]!==1&&walked.grid[y][x]!==2) continue;
    if(box.nearTeethChapel(walked,x,y)) continue;
    outside.push(x+','+y);
  }
  discs.length=0; drawn.length=0;
  box.drawMemoryShade(g, walked);
  const walkedGuard=box.chapelShadeGuardRect(walked);
  const walkedOverlap=drawn.filter(d=>box.shadeRectOverlap(d.rect, walkedGuard));
  assert(outside.indexOf('112,15')>=0, 'the walk remembers hall rock just outside the chapel box');
  assert(walkedOverlap.length===0,
    'after the walk, no drawn disc meets the face or chapel-wall rectangle ('
    +walkedOverlap.map(d=>d.x+','+d.y).slice(0,8).join(' ')+')');
  assert(discs.indexOf('112,15')<0, 'the remembered disc at (112,15) is the one that used to cover the chapel');
}
assert(/isWalkTile\(t\)/.test(shade), 'out-of-sight floor still shades as the tile diamond');
assert(/function drawBeyondMask/.test(html) && /fillStyle=rock/.test(html),
  'unexplored rock stays a solid mask, not a disc');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nhall visibility checks passed');

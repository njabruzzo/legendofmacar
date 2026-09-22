'use strict';
/**
 * Chapter I ruby-chamber north wall: door + dwarf face sit inside the wall mass.
 * Run: node src/dungeon/RubyNorthWall.test.js
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

assert(/WALL_HALL_SCALE=0\.70/.test(html), 'hall faces stay 0.70 — do not hide south/east loot');
assert(/return wallFaceH\(L\)\*1\.28/.test(html), 'rubyDoorH stays *1.28 (do not take #81 door scale)');
assert(/WALL_RUBY_NORTH_SCALE=1\.58/.test(html), 'north wall scale clears the 1.28 door arch');
const north=Number((html.match(/WALL_RUBY_NORTH_SCALE=([0-9.]+)/)||[])[1]);
assert(north>1.28, 'ruby north wall is taller than the ruby door');
assert(/function isRubyNorthWall\(L,x,y\)/.test(html)
  && /y===6 && x>=24 && x<=51/.test(html),
  'ruby raise is the y=6 chamber face, not the west entry skip wall');
assert(/function isStartBackWall\(L,x,y\)\{\s*return !!\(L && L\.n===1 && x===13/.test(html),
  'west cave-in wall helper is still the x=13 face, not a raised north face');
assert(/if\(isStartBackWall\(L,x,y\)\)\{ drawStartCaveInCell\(g,L,x,y\); return; \}/.test(html),
  'west start wall paints a stacked cave-in, not hall masonry or a black skip');
assert(!/if\(isStartBackWall\(L,x,y\)\) return;/.test(html),
  'west face is no longer an empty skip under a black void');
assert(/isRubyNorthWall\(L,x,y\)\?rubyNorthWallH\(L\):\(useWallFaces\(L\)\?wallFaceH\(L\):TH\)/.test(html),
  'fog punch only grows for the raised ruby north face');
assert(/k:'dwarfface'/.test(html) && /dwarfFaceH\(L\)/.test(html),
  'dwarf-face prop still hangs on the north wall plane');
assert(fs.existsSync(path.join(__dirname,'../../assets/props/prop_dwarfface.png')),
  'bas-relief dwarf face sheet is in-repo');

assert(/if\(o\.k==='rubydoor'\) return rubyDoorDrawDepth\(o\)/.test(html),
  'ruby door sorts on the east wall cell, not its own x+y');
assert(/function rubyDoorDrawDepth\(p\)/.test(html),
  'rubyDoorDrawDepth names the east-face depth key');
const liveDoor=html.match(/if\(p\.k==='rubydoor'\)\{[\s\S]*?return;\s*\}/)[0];
assert(/solidRubyDoorSheet\(\)/.test(liveDoor) && /p\.x-half, yPlane, p\.x\+half/.test(liveDoor),
  'live door still blits the full matted sheet across both pillars');
assert(/emit\(sx\.x,sx\.y-H\*0\.46,14\*z,'#ff2a3c',0\.38\)/.test(liveDoor),
  'ruby glow stays the small emit');

function extractFn(name){
  const re=new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}');
  const m=html.match(re);
  if(!m) throw new Error('missing '+name);
  return m[0];
}
function carve(grid,x,y,w,h,t){
  for(let j=y;j<y+h;j++) for(let i=x;i<x+w;i++) if(grid[j]) grid[j][i]=t;
}
function blankGrid(w,h){
  const grid=[];
  for(let j=0;j<h;j++){
    grid[j]=[];
    for(let i=0;i<w;i++) grid[j][i]=1;
  }
  return grid;
}
const ch1Grid=blankGrid(80,50);
carve(ch1Grid,24,7,28,28,0);
const ch3Grid=blankGrid(140,114);
carve(ch3Grid,36,34,24,16,0);
const ctx={
  TW:80, TH:40,
  SPR:{rubydoor:{width:642,height:679}},
  clamp:(v,a,b)=>v<a?a:v>b?b:v,
  wallFaceH:()=>287*(40/96),
  isWalkTile:(t)=>t===0||t===3||t===4,
  G:{lvl:{n:1,grid:ch1Grid}}
};
vm.createContext(ctx);
vm.runInContext(
  extractFn('wallHidesFloor')
  +extractFn('rubyDoorH')
  +extractFn('rubyDoorImg')
  +extractFn('rubyDoorHalf')
  +extractFn('rubyDoorPlaneY')
  +extractFn('rubyDoorDrawDepth')
  +extractFn('actorDrawDepth'),
  ctx);

function screenX(x,y){ return (x-y)*(ctx.TW/2); }
function rightArchCut(door){
  const half=ctx.rubyDoorHalf();
  const yPlane=ctx.rubyDoorPlaneY(door);
  const wallY=Math.floor(yPlane);
  const faceY=wallY+1;
  const xRight=door.x+half;
  const wx=Math.floor(xRight-yPlane+faceY-1e-4);
  return {half,yPlane,wallY,faceY,xRight,wx,naive:(door.x+door.y)|0};
}

const ch1={x:36.5,y:7.28,k:'rubydoor'};
const c1=rightArchCut(ch1);
assert(c1.half>1.08 && c1.half<=1.75, 'signed sheet half stays between the pinch cap and the face cap');
assert(screenX(c1.wx, c1.faceY)<screenX(c1.xRight, c1.yPlane),
  'east south-face left edge crosses the door sheet on screen');
assert(c1.naive<c1.wx+c1.wallY, 'door x+y is before the east wall diagonal');
assert(ctx.actorDrawDepth(ch1)>=c1.wx+c1.wallY,
  'Ch1 door depth reaches the east cell that cuts the right arch');
assert(ctx.actorDrawDepth(ch1)===(c1.wx+c1.wallY),
  'Ch1 door shares that wall bucket so it paints after the face');

ctx.G.lvl.grid=ch3Grid;
const ch3={x:48,y:34.28,k:'rubydoor'};
const c3=rightArchCut(ch3);
assert(c3.naive<c3.wx+c3.wallY, 'Ch3 door x+y also loses to the shifted east face');
assert(ctx.actorDrawDepth(ch3)===(c3.wx+c3.wallY),
  'Ch3 door sorts with the east face, not one cell short');

ctx.G.lvl.grid=ch1Grid;
assert(ctx.actorDrawDepth({x:30.2,y:20.2,kind:'dwarf',dead:0,crushed:0})===((30.2+20.2)|0),
  'open-floor actors keep their own diagonal');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nruby north wall checks passed');

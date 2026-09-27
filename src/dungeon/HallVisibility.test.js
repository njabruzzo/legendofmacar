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
assert((shade.match(/g\.ellipse\(s\.x, s\.y-H\*0\.38, TW\*0\.62, TH\*0\.9\+H\*0\.28, 0, 0, TAU\);/g)||[]).length===1,
  'remembered hall walls still take the one main wall disc');
assert(/chapelShadeGuardHit\(memoryShadeDiscRect\(s,H\), chapelGuard\)/.test(shade),
  'a wall disc is skipped when its screen rectangle meets the chapel');
assert(/g\.clip\('evenodd'\)/.test(extractFn('chapelShadeClipOut')),
  'a keep disc is clipped to the canvas minus every chapel guard rect');
assert(!/carveShadeKeep/.test(shade) && !/function carveShadeKeep/.test(html),
  'the chapel guard is not carved around a keep disc');
assert(/demonFaceDrawH\(img, face\)/.test(extractFn('chapelShadeFeatureRects'))
  && /demonFaceHalf\(face\)/.test(extractFn('chapelShadeFeatureRects')),
  'the chapel guard sizes the face with demonFaceDrawH and demonFaceHalf');
assert(!/DEMON_FACE_CONTENT_SCALE\/\(360/.test(extractFn('chapelShadeFeatureRects')),
  'the guard does not copy the face height formula');
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
  VW:1024, VH:768, TW:110, TH:56, TAU:Math.PI*2, ZOOM:1.31,
  CAMSX:0, CAMSY:0,
  G:{props:[], lvl:null},
  Math, clamp:(v,a,b)=>v<a?a:v>b?b:v,
  s2w(){ return {x:70, y:0}; },
  w2s(x,y){ cell={x,y}; return {x:(x-y)*(box.TW/2)+box.CAMSX, y:(x+y)*(box.TH/2)+box.CAMSY}; },
  useWallFaces(){ return true; },
  wallFaceH(){ return 287*(box.TH/96); },
  SPR:{}
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
   extractFn('dwarfFaceH'), extractFn('vaultDemonFace'), extractFn('chapelFaceContentFrac'),
   extractFn('demonFaceShowsEmpty'), extractFn('demonFaceImg'),
   extractFn('demonFaceDrawH'), extractFn('demonFaceHalf'),
   extractFn('rubyDoorPlaneY'), extractFn('demonFacePlaneY'),
   extractFn('shadeRectOverlap'), extractFn('memoryShadeDiscRect'),
   extractFn('chapelShadeFeatureRects'), extractFn('chapelShadeClipDisc'),
   extractFn('chapelShadeSubtract'), extractFn('chapelShadeDisjoint'),
   extractFn('chapelShadeClipOut'), extractFn('chapelShadeGuardRects'), extractFn('chapelShadeGuardHit'),
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
let clipPath=[], clip=null;
const clipStack=[];
const g={
  save(){ clipStack.push(clip); },
  restore(){ clip=clipStack.pop(); },
  beginPath(){ clipPath=[]; },
  rect(x,y,w,h){ clipPath.push({x0:x, y0:y, x1:x+w, y1:y+h}); },
  clip(rule){ clip={rule, outer:clipPath[0], holes:clipPath.slice(1)}; },
  moveTo(){}, lineTo(){}, closePath(){},
  fill(){},
  ellipse(cx,cy,rx,ry){
    discs.push(cell.x+','+cell.y);
    drawn.push({
      x:cell.x, y:cell.y, cx, cy, rx, ry,
      clip:clip?{rule:clip.rule, outer:clip.outer, holes:clip.holes}:null,
      rect:{x0:cx-rx, y0:cy-ry, x1:cx+rx, y1:cy+ry}
    });
  }
};
function layout(vw, vh){
  box.VW=vw; box.VH=vh;
  const z=Math.min(vw, vh*1.5)/780;
  box.ZOOM=z<0.78?0.78:z>1.38?1.38:z;
  box.TW=Math.round(84*box.ZOOM); if(box.TW&1) box.TW++;
  box.TH=Math.round(42*box.ZOOM); if(box.TH&1) box.TH++;
}
function frame(wx, wy){
  box.CAMSX=Math.round(box.VW/2 - (wx-wy)*(box.TW/2));
  box.CAMSY=Math.round(box.VH*0.52 - (wx+wy)*(box.TH/2));
}
function pointInRect(px, py, r){
  return !!(r && px>=r.x0 && px<r.x1 && py>=r.y0 && py<r.y1);
}
function inEllipse(px, py, d){
  const dx=(px-d.cx)/d.rx, dy=(py-d.cy)/d.ry;
  return dx*dx+dy*dy<=1;
}
function paints(px, py, d){
  if(!inEllipse(px, py, d)) return false;
  if(!d.clip) return true;
  if(d.clip.outer && !pointInRect(px, py, d.clip.outer)) return false;
  /* Canvas evenodd: two overlapping holes put the pixel back inside. */
  let holes=0;
  const list=d.clip.holes||[];
  for(let i=0;i<list.length;i++) if(pointInRect(px, py, list[i])) holes++;
  return (holes%2)===0;
}
function aabbHit(a, b){
  return a.x0<b.x1 && b.x0<a.x1 && a.y0<b.y1 && b.y0<a.y1;
}
function chapelPaintedCount(list, feats){
  const seen=new Set();
  for(let i=0;i<list.length;i++){
    const d=list[i];
    for(let k=0;k<feats.length;k++){
      const r=feats[k];
      if(!aabbHit(d.rect, r)) continue;
      const x0=Math.max(Math.floor(d.rect.x0), Math.floor(r.x0));
      const y0=Math.max(Math.floor(d.rect.y0), Math.floor(r.y0));
      const x1=Math.min(Math.ceil(d.rect.x1), Math.ceil(r.x1));
      const y1=Math.min(Math.ceil(d.rect.y1), Math.ceil(r.y1));
      for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++){
        const px=x+0.5, py=y+0.5;
        if(!pointInRect(px, py, r) || !paints(px, py, d)) continue;
        seen.add(x+','+y);
      }
    }
  }
  return seen.size;
}
function rawChapelCount(d, feats){
  const bare={cx:d.cx, cy:d.cy, rx:d.rx, ry:d.ry, clip:null, rect:d.rect};
  return chapelPaintedCount([bare], feats);
}
function canvasChapelCount(d, feats){
  const canvas={
    cx:d.cx, cy:d.cy, rx:d.rx, ry:d.ry, rect:d.rect,
    clip:{rule:'evenodd', outer:{x0:0, y0:0, x1:box.VW, y1:box.VH}, holes:[]}
  };
  return chapelPaintedCount([canvas], feats);
}
function hallPainted(d, feats){
  if(!d) return 0;
  let n=0;
  const x0=Math.floor(d.cx-d.rx), y0=Math.floor(d.cy-d.ry);
  const x1=Math.ceil(d.cx+d.rx), y1=Math.ceil(d.cy+d.ry);
  for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++){
    const px=x+0.5, py=y+0.5;
    if(!paints(px, py, d)) continue;
    let hole=false;
    for(let i=0;i<feats.length;i++) if(pointInRect(px, py, feats[i])){ hole=true; break; }
    if(!hole) n++;
  }
  return n;
}
const VIEWPORTS=[[844,390],[1024,768],[1440,900]];
function paintAt(level){
  const rows=[];
  VIEWPORTS.forEach(([vw, vh])=>{
    layout(vw, vh);
    frame(103, 14);
    discs.length=0; drawn.length=0;
    box.drawMemoryShade(g, level);
    const feats=box.chapelShadeFeatureRects(level)||[];
    const keep=drawn.find(d=>d.x===101&&d.y===15);
    const far=drawn.find(d=>d.x===86&&d.y===15);
    rows.push({
      vw, vh, discs:discs.slice(),
      chapel:chapelPaintedCount(drawn, feats),
      raw101:keep?rawChapelCount(keep, feats):0,
      onScreen101:keep?canvasChapelCount(keep, feats):0,
      hall101:hallPainted(keep, feats),
      keep:!!keep, far:!!far,
      clip101:!!(keep&&keep.clip&&keep.clip.rule==='evenodd'),
      clip86:!!(far&&far.clip&&far.clip.rule==='evenodd')
    });
  });
  layout(1024, 768);
  frame(86, 15);
  discs.length=0; drawn.length=0;
  box.drawMemoryShade(g, level);
  const feats=box.chapelShadeFeatureRects(level)||[];
  const far=drawn.find(d=>d.x===86&&d.y===15);
  rows.hall86=hallPainted(far, feats);
  rows.chapel86=chapelPaintedCount(drawn, feats);
  return rows;
}
const painted=paintAt(L);
const guard=box.chapelShadeGuardRects(L);
assert(guard&&guard.length>8, 'chapel shade guard is the walls, the floor, the face, and the altar');
assert(box.nearTeethChapel(L,102,1) && painted[0].discs.indexOf('102,1')<0,
  'discs are skipped near the teeth chapel');
painted.forEach(row=>{
  assert(row.keep && row.far, 'at '+row.vw+' (86,15) and (101,15) are still drawn');
  assert(row.clip101 && row.clip86, 'at '+row.vw+' those discs use the evenodd chapel clip');
  assert(row.raw101>0 && row.onScreen101>0,
    'at '+row.vw+' the (101,15) ellipse covers the chapel on screen ('+row.onScreen101+' of '+row.raw101+' px) before the holes');
  assert(row.chapel===0, 'at '+row.vw+' painted chapel pixels are 0 (got '+row.chapel+')');
  assert(row.hall101>0, 'at '+row.vw+' the hall side of (101,15) still paints ('+row.hall101+' px)');
  assert(row.discs.indexOf('107,0')<0 && row.discs.indexOf('114,8')<0 && row.discs.indexOf('116,6')<0,
    'at '+row.vw+' buried rock north and east of the chapel does not draw a disc on it');
});
assert(painted.hall86>0 && painted.chapel86===0,
  '(86,15) paints on the hall side ('+painted.hall86+' px) and not on the chapel');

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
  const walkedPaint=paintAt(walked);
  assert(outside.indexOf('112,15')>=0, 'the walk remembers hall rock just outside the chapel box');
  walkedPaint.forEach(row=>{
    assert(row.chapel===0,
      'after the walk at '+row.vw+', painted chapel pixels are 0 (got '+row.chapel+')');
    assert(row.discs.indexOf('112,15')<0, 'at '+row.vw+' the remembered disc at (112,15) is not drawn');
  });
}

/* Real Chapter I map from the chapel-door save, not a stand-in corridor.
   (a) a scripted walk with rebuildVision. (b) that save's seen state. */
{
  const fix=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/teeth-chapel-door-seen.json'),'utf8'));
  function rows(packed){
    return packed.map(s=>{
      const row=new Array(s.length);
      for(let i=0;i<s.length;i++) row[i]=(s.charCodeAt(i)-48)|0;
      return row;
    });
  }
  function rememberHall(level){
    level.seen[15][86]=1; level.vis[15][86]=0;
    level.seen[15][101]=1; level.vis[15][101]=0;
  }
  const grid=rows(fix.grid);
  const seen=rows(fix.seen);
  const vis=[];
  for(let y=0;y<fix.h;y++) vis[y]=new Uint8Array(fix.w);
  const walked={
    n:1, w:fix.w, h:fix.h, grid, seen, vis,
    teethBounds:fix.teethBounds,
    flags:{teethBounds:fix.teethBounds, teethRoom:1, teethChapelEnter:1}
  };
  box.G.lvl=walked;
  box.G.props=fix.props.map(p=>Object.assign({},p));
  box.G.ents=[{hero:1, dead:0, x:106.5, y:18}];
  const trail=[];
  for(let y=18;y>=3;y-=0.4) trail.push([106.5, y]);
  for(let x=101.5;x<=112.2;x+=0.4) trail.push([x, 4.2]);
  for(let y=4;y<=13;y+=0.4) trail.push([111.2, y]);
  for(let x=112;x>=101.5;x-=0.4) trail.push([x, 8]);
  trail.push([107, 6]);
  for(let i=0;i<trail.length;i++){
    box.G.ents[0].x=trail[i][0];
    box.G.ents[0].y=trail[i][1];
    box.rebuildVision();
  }
  rememberHall(walked);
  const walkPaint=paintAt(walked);
  const walkFeats=box.chapelShadeFeatureRects(walked);
  walkPaint.forEach(row=>{
    assert(row.chapel===0 && row.onScreen101>0 && row.hall101>0,
      'after the real-map walk at '+row.vw+', chapel paint is 0 and (101,15) still covers '
      +row.onScreen101+' on-screen px / '+row.hall101+' hall-side');
    assert(row.discs.indexOf('86,15')>=0 && row.discs.indexOf('101,15')>=0,
      'after the real-map walk at '+row.vw+', (86,15) and (101,15) still shade');
    assert(row.discs.indexOf('98,8')<0 && row.discs.indexOf('99,12')<0 && row.discs.indexOf('99,13')<0,
      'at '+row.vw+' the walk does not draw the west-rock discs that land on the chapel');
  });
  assert(walkPaint.hall86>0 && walkPaint.chapel86===0,
    'after the real-map walk, (86,15) paints on the hall and not on the chapel');
  const westDisc=box.memoryShadeDiscRect(box.w2s(99,13), box.wallFaceH());
  assert(walkFeats.some(r=>box.shadeRectOverlap(westDisc, r)) && walkPaint[0].discs.indexOf('99,13')<0,
    'the disc at (99,13) meets the chapel and is not drawn');

  const seenBits=rows(fix.seen);
  const visBits=[];
  for(let y=0;y<fix.h;y++) visBits[y]=new Uint8Array(fix.w);
  const remembered={
    n:1, w:fix.w, h:fix.h, grid, seen:seenBits, vis:visBits,
    teethBounds:fix.teethBounds,
    flags:{teethBounds:fix.teethBounds, teethRoom:1}
  };
  remembered.seen[15][86]=1;
  box.G.lvl=remembered;
  box.G.props=fix.props.map(p=>Object.assign({},p));
  const seenPaint=paintAt(remembered);
  const seenFeats=box.chapelShadeFeatureRects(remembered);
  seenPaint.forEach(row=>{
    assert(row.chapel===0 && row.onScreen101>0 && row.hall101>0,
      'chapel-door seen state at '+row.vw+': chapel paint is 0, (101,15) covers '
      +row.onScreen101+' on-screen px / '+row.hall101+' hall-side');
    assert(row.discs.indexOf('86,15')>=0 && row.discs.indexOf('101,15')>=0,
      'chapel-door seen state at '+row.vw+': (86,15) and (101,15) still shade');
    assert(row.discs.indexOf('98,8')<0 && row.discs.indexOf('99,12')<0 && row.discs.indexOf('99,13')<0,
      'at '+row.vw+' remembered rock at x=98-99 does not draw a disc on the chapel');
    assert(row.discs.indexOf('96,8')>=0,
      'at '+row.vw+' rock further west that misses the chapel still shades');
  });
  const doorDisc=box.memoryShadeDiscRect(box.w2s(98,12), box.wallFaceH());
  assert(seenFeats.some(r=>box.shadeRectOverlap(doorDisc, r)) && seenPaint[0].discs.indexOf('98,12')<0,
    'the disc at (98,12) meets the chapel door and is not drawn');
}
assert(/isWalkTile\(t\)/.test(shade), 'out-of-sight floor still shades as the tile diamond');
assert(/function drawBeyondMask/.test(html) && /fillStyle=rock/.test(html),
  'unexplored rock stays a solid mask, not a disc');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nhall visibility checks passed');

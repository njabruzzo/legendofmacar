'use strict';
/**
 * MAC-07 Batch D: quarter-cell A* + one-follower Follow pilot.
 * Run: node src/systems/Navigation.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.join(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const navSrc=fs.readFileSync(path.join(__dirname,'Navigation.js'),'utf8');
const rotSrc=fs.readFileSync(path.join(root,'src/vendor/rotjs/rot-path.js'),'utf8');
const license=fs.readFileSync(path.join(root,'src/vendor/rotjs/LICENSE'),'utf8');
const notice=fs.readFileSync(path.join(root,'src/vendor/rotjs/NOTICE'),'utf8');
const astarOrig=fs.readFileSync(path.join(root,'src/vendor/rotjs/lib/path/astar.js'),'utf8');
const pathOrig=fs.readFileSync(path.join(root,'src/vendor/rotjs/lib/path/path.js'),'utf8');
const constOrig=fs.readFileSync(path.join(root,'src/vendor/rotjs/lib/constants.js'),'utf8');

require('../systems/SystemsReady.js');
require('../vendor/rotjs/rot-path.js');
require('./Navigation.js');
const Nav=globalThis.Navigation;
const SR=globalThis.SystemsReady;
const ROT=globalThis.ROT;

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
function extractThrough(name, until){
  const start=html.indexOf('function '+name+'(');
  if(start<0) throw new Error('missing '+name);
  const end=html.indexOf('\nfunction '+until+'(', start);
  if(end<0) throw new Error('missing end '+until);
  return html.slice(start, end);
}

/* ---- module / license / flag ---- */
assert(!!Nav && typeof Nav.planRoute==='function' && typeof Nav.tickFollower==='function',
  'Navigation exports planRoute / tickFollower');
assert(!!ROT && typeof ROT.Path.AStar==='function', 'rot-path exposes ROT.Path.AStar');
assert(Nav.FLAG===true, 'FLAG default is ON (rollback: FLAG=false or ?nav=0)');
assert(Nav.use()===true, 'use() is true when FLAG is on');
assert(Nav.ROSTER_KEY==='pordoom' && Nav.DISPLAY_NAME==='PORDUM',
  'internal roster key is pordoom (display PORDUM)');
assert(Nav.STEP===0.25 && Nav.TOPOLOGY===4, 'quarter-cell lattice, topology 4');
assert(SR.has('Navigation') && SR.get('Navigation')===Nav,
  'Navigation declares on SystemsReady');

assert(/Copyright \(c\) 2012-now\(\), Ondrej Zara/.test(license),
  'LICENSE retains Ondrej Zara copyright');
assert(/Redistributions of source code must retain/.test(license) &&
  /THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE/.test(license),
  'LICENSE is BSD-3-Clause');
assert(/46782e248c2db9d379a5e4f13bb8323f18dff04b/.test(notice) &&
  /46782e248c2db9d379a5e4f13bb8323f18dff04b/.test(rotSrc),
  'NOTICE and rot-path pin rot.js commit 46782e2');
assert(/export default class AStar/.test(astarOrig) && /_getNeighbors/.test(pathOrig) &&
  /export const DIRS/.test(constOrig),
  'vendored lib/path/astar.js, path.js, constants.js from rot.js');
assert(!/flare|shattered pixel|brogue/i.test(navSrc) && !/flare|shattered pixel|brogue/i.test(rotSrc),
  'no Flare / SPD / Brogue path code');
assert(!/\be\.(x|y)\s*=/.test(navSrc) && !/\bactor\.(x|y)\s*=/.test(navSrc),
  'Navigation does not assign actor world x/y');
assert(!/wornMoveMul\s*\(/.test(navSrc), 'Navigation does not call wornMoveMul (boots stay in move)');
assert(!/type\s*=\s*["']module["']/.test(html), 'index.html still has no type=module');

const head=html.slice(0, html.indexOf('<script>\n"use strict";'));
assert(/src="src\/vendor\/rotjs\/rot-path\.js"/.test(head), 'rot-path is a classic sync tag');
assert(/src="src\/systems\/Navigation\.js"/.test(head), 'Navigation is a classic sync tag');
const tapI=head.indexOf('src="src/ui/TapGate.js"');
const rotI=head.indexOf('src="src/vendor/rotjs/rot-path.js"');
const navI=head.indexOf('src="src/systems/Navigation.js"');
const inlineI=html.indexOf('<script>\n"use strict";');
assert(tapI>=0 && tapI<rotI && rotI<navI && navI<inlineI,
  'load order: TapGate → rot-path → Navigation → inline play loop');
assert(!/src="src\/systems\/PartyOrders\.js"/.test(html),
  'PartyOrders / full order menu is not shipped');
assert(/One-follower Follow default/.test(html) && /ghostSapperBomb\(e, dt\)/.test(html),
  'host wires the pordoom pilot and still runs ghostSapperBomb');
assert(/function bumpTopology\(/.test(html) && /function navLevelId\(/.test(html),
  'host exposes topologyRev helpers independent of seenRev');
assert(/bumpTopology\('openSecret/.test(html) && /bumpTopology\('breakRock'\)/.test(html),
  'openSecret and breakRock invalidate nav topology');
assert(/G\.topologyRev=0/.test(html) && /G\.seenRev=\(G\.seenRev\|\|0\)\+1/.test(html),
  'chapter reset clears topologyRev; breakRock still bumps seenRev separately');
assert(/ASSET_VER='96'/.test(html), 'ASSET_VER is unchanged');

/* ---- real Macar canBe / walk / wallFaceClear ---- */
function makeGrid(w, h, fill){
  const g=[];
  for(let j=0;j<h;j++){
    g[j]=[];
    for(let i=0;i<w;i++) g[j][i]=fill==null?0:fill;
  }
  return g;
}
function collisionCtx(grid, extras){
  const ctx=Object.assign({
    G:{lvl:{w:grid[0].length, h:grid.length, grid}, ch:1, topologyRev:0},
    startCaveInBlocks(){ return false; }
  }, extras||{});
  vm.createContext(ctx);
  vm.runInContext(extractThrough('walk','move'), ctx);
  return ctx;
}

const dwarf={hero:0, team:'party', kind:'dwarf', dead:0, crushed:0, hidden:0,
  r:0.38, col:{key:'pordoom'}, name:'PORDUM', sp:4, fdx:1, fdy:0};
const gnome={hero:0, team:'party', kind:'gnome', dead:0, crushed:0, hidden:0,
  r:0.28, name:'PIP', sp:3.4};
const mac={hero:1, team:'party', kind:'dwarf', dead:0, crushed:0, hidden:0,
  r:0.38, col:{key:'macar'}, name:'MACAR', x:10, y:6, fdx:1, fdy:0, moving:1};

/* tile-center vs quarter-cell: south wall rejects 4.50, allows 4.25 */
{
  const grid=makeGrid(10, 8, 0);
  for(let i=0;i<10;i++) grid[5][i]=1;
  const ctx=collisionCtx(grid);
  assert(ctx.canBe(3.5, 4.50, 0.38, dwarf)===false,
    'WALL_FACE_CLEAR rejects the tile center north of a south wall');
  assert(ctx.canBe(3.5, 4.25, 0.38, dwarf)===true,
    'quarter-cell 4.25 is standable on that same tile');
  const plan=Nav.planRoute({x:1.25,y:4.25},{x:7.25,y:4.25}, dwarf, {canBe:ctx.canBe});
  assert(plan.ok===true && plan.path.length>1, 'route along the south-wall tile uses lattice, not centers');
  assert(plan.path.every(p=>ctx.canBe(p.x,p.y,dwarf.r,dwarf)),
    'every path cell canStand via canBe');
  assert(plan.path.every(p=>Math.abs(p.x/Nav.STEP-Math.round(p.x/Nav.STEP))<1e-9),
    'path cells sit on the 0.25 lattice');
  assert(!plan.path.some(p=>p.y===4.5 && (p.x|0)===3),
    'south-wall tile center is not a waypoint');
}

/* topology 4: consecutive cells are 4-adjacent */
function assertFourTopology(plan, msg){
  let ok=true;
  for(let i=1;i<plan.path.length;i++){
    const a=plan.path[i-1], b=plan.path[i];
    const man=Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
    if(Math.abs(man-Nav.STEP)>1e-9){ ok=false; break; }
  }
  assert(ok, msg);
}

/* U-obstacle: pocket to the east of a U. Straight line hits the wall. */
{
  const grid=makeGrid(16, 12, 0);
  for(let j=4;j<=8;j++){ grid[j][4]=1; grid[j][8]=1; }
  for(let i=4;i<=8;i++) grid[8][i]=1;
  const ctx=collisionCtx(grid);
  const start={x:6.25,y:6.25}, goal={x:11.25,y:6.25};
  assert(ctx.canBe(start.x,start.y,dwarf.r,dwarf), 'U interior is standable');
  assert(ctx.canBe(goal.x,goal.y,dwarf.r,dwarf), 'U exterior is standable');
  assert(ctx.canBe(8.25,6.25,dwarf.r,dwarf)===false, 'U east wall blocks the straight line');
  const plan=Nav.planRoute(start, goal, dwarf, {canBe:ctx.canBe});
  assert(plan.ok===true && plan.path.length>4, 'U-obstacle: planRoute goes around, not through');
  assert(plan.path.every(p=>ctx.canBe(p.x,p.y,dwarf.r,dwarf)), 'U path cells are standable');
  assert(!plan.path.some(p=>(p.x|0)===8 && p.y>=4 && p.y<=8),
    'U path does not occupy the east wall column');
  assertFourTopology(plan, 'U path is topology-4 (no diagonal corner cut)');
  const minY=Math.min.apply(null, plan.path.map(p=>p.y));
  assert(minY<=3.25+1e-9, 'U path exits through the north opening');
}

/* gnome-only (tile 4): dwarf goes around; gnome may cross. Chapter I uses type 4. */
{
  const grid=makeGrid(16, 10, 0);
  for(let j=1;j<9;j++) grid[j][7]=4;
  const ctx=collisionCtx(grid);
  const start={x:3.25,y:5.25}, goal={x:11.25,y:5.25};
  assert(ctx.walk(7.5,5.5,dwarf)===false, 'dwarf cannot walk gnome-only tiles');
  assert(ctx.walk(7.5,5.5,gnome)===true, 'gnome can walk type-4 tiles');
  const dPlan=Nav.planRoute(start, goal, dwarf, {canBe:ctx.canBe});
  const gPlan=Nav.planRoute(start, goal, gnome, {canBe:ctx.canBe});
  assert(dPlan.ok===true, 'dwarf routes around gnome-only stone');
  assert(!dPlan.path.some(p=>{
    const i=p.x|0, j=p.y|0;
    return !!(grid[j] && grid[j][i]===4);
  }), 'dwarf path never stands on type-4 tiles');
  assert(gPlan.ok===true, 'gnome can plan across type 4');
  assert(gPlan.path.some(p=>(p.x|0)===7) || gPlan.path.length<dPlan.path.length,
    'gnome plan may use the type-4 shortcut');
}

/* collapse / breakRock: wall between, fail, then open, succeed */
{
  const grid=makeGrid(12, 8, 0);
  for(let j=0;j<8;j++) grid[j][6]=1;
  const ctx=collisionCtx(grid);
  const start={x:2.25,y:3.25}, goal={x:9.25,y:3.25};
  const blocked=Nav.planRoute(start, goal, dwarf, {canBe:ctx.canBe, maxExpand:800});
  assert(blocked.ok===false, 'collapse wall: no path (fail closed)');
  for(let j=0;j<8;j++) grid[j][6]=0;
  const open=Nav.planRoute(start, goal, dwarf, {canBe:ctx.canBe});
  assert(open.ok===true && open.path.length>1, 'after collapse dig, route opens');
}

/* blocked endpoint */
{
  const grid=makeGrid(8, 8, 0);
  for(let j=0;j<8;j++) for(let i=5;i<8;i++) grid[j][i]=1;
  const ctx=collisionCtx(grid);
  const plan=Nav.planRoute({x:2.25,y:2.25},{x:6.5,y:2.5}, dwarf, {canBe:ctx.canBe});
  assert(plan.ok===false && plan.reason==='blocked-end',
    'blocked endpoint is rejected (no snap into rock)');
}

/* expansion cap is a node bound, not a timer; fail closed */
{
  const grid=makeGrid(40, 8, 0);
  for(let j=0;j<8;j++) grid[j][20]=1;
  const ctx=collisionCtx(grid);
  const plan=Nav.planRoute({x:2.25,y:3.25},{x:30.25,y:3.25}, dwarf, {
    canBe:ctx.canBe, maxExpand:12
  });
  assert(plan.ok===false && plan.reason==='expand-limit',
    'expansion limit fails closed (no path returned)');
  assert(plan.expansions>=12, 'expansions are counted');
  assert(plan.path.length===0, 'failed plan has an empty path (no clip)');
}

/* topology invalidation drops cached path */
{
  Nav.invalidate({reason:'test-reset'});
  const grid=makeGrid(14, 8, 0);
  for(let j=0;j<8;j++) grid[j][7]=1;
  const ctx=collisionCtx(grid);
  const e=Object.assign({}, dwarf, {x:2.25,y:3.25, ix:0, iy:0, moving:0});
  const leader=Object.assign({}, mac, {x:10.25,y:3.25});
  const steers=[];
  const host={
    canBe:ctx.canBe,
    steerWalk(actor,dx,dy){ steers.push(1); actor.fdx=dx; actor.fdy=dy; actor.moving=1; return 0.05; },
    partyForm(){ return {x:leader.x,y:leader.y}; },
    levelId:'1:1:0',
    topologyRev:0,
    maxExpand:2000
  };
  const a=Nav.tickFollower(e, leader, 0.05, host);
  assert(a.handled===true && (a.reason==='steer' || a.waiting),
    'first tick plans or waits');
  host.topologyRev=1;
  const before=e.x;
  const b=Nav.tickFollower(e, leader, 0.05, host);
  assert(b.handled===true, 'topologyRev change still handled (repath)');
  assert(e.x===before, 'repath / wait never teleports the follower');
}

/* path failure → wait, coordinates unchanged */
{
  Nav.invalidate({reason:'fail-wait'});
  const grid=makeGrid(10, 8, 0);
  for(let j=0;j<8;j++) grid[j][5]=1;
  const ctx=collisionCtx(grid);
  const e=Object.assign({}, dwarf, {x:2.25,y:3.25, ix:1, iy:1, moving:1});
  const ox=e.x, oy=e.y;
  const r=Nav.tickFollower(e, {x:8.25,y:3.25,fdx:1,fdy:0}, 0.16, {
    canBe:ctx.canBe,
    steerWalk(){ throw new Error('should not steer on fail'); },
    partyForm(){ return {x:8.25,y:3.25}; },
    levelId:'1:1:0',
    topologyRev:0,
    maxExpand:400
  });
  assert(r.handled===true && r.waiting===true, 'unreachable goal: wait');
  assert(e.x===ox && e.y===oy, 'path failure does not assign coordinates');
  assert(e.moving===0 && e.ix===0 && e.iy===0, 'wait clears movement intents');
}

/* Chapter I west cave-in lip is not walkable — route must not clip it */
{
  const grid=makeGrid(24, 32, 0);
  const ctx=collisionCtx(grid, {
    startCaveInBlocks(x,y){ return x<15.12 && y>=16 && y<=30; }
  });
  assert(ctx.walk(14.5, 22, dwarf)===false, 'Chapter I cave-in lip refuses walk');
  assert(ctx.canBe(14.25, 22.25, 0.38, dwarf)===false, 'cannot stand inside the cave-in');
  assert(ctx.canBe(20.5, 22.0, 0.38, dwarf)===true, 'Chapter I spawn tile is standable');
  const deep=Nav.planRoute({x:20.25,y:22.25},{x:10.25,y:22.25}, dwarf, {canBe:ctx.canBe, maxExpand:800});
  assert(deep.ok===false && deep.reason==='blocked-end',
    'goal deep in the west cave-in is rejected (no snap / clip through the lip)');
  const lip=Nav.planRoute({x:20.25,y:22.25},{x:16.25,y:22.25}, dwarf, {canBe:ctx.canBe, maxExpand:800});
  assert(lip.ok===true && lip.path.every(p=>p.x>=15.12-1e-9),
    'a standable goal east of the lip never enters the cave-in');
}

/* pilot pick: pordoom first; Noz / fleeTo excluded */
{
  const pord=Object.assign({}, dwarf, {col:{key:'pordoom'}});
  const fend={team:'party', hero:0, dead:0, crushed:0, sleeping:0, tied:0, hidden:0,
    kind:'dwarf', col:{key:'fendur'}, name:'FENDUR'};
  const noz={team:'party', hero:0, dead:0, kind:'gnome', nozCamp:1, name:'NOZ', col:{key:'noz'}};
  const fleer=Object.assign({}, fend, {col:{key:'orbo'}, fleeTo:{x:1,y:1}});
  assert(Nav.pickPilot([mac, pord, fend])===pord, 'pilot is living pordoom');
  assert(Nav.isPilot(pord, [mac, pord, fend])===true, 'isPilot matches pordoom');
  assert(Nav.isPilot(fend, [mac, pord, fend])===false, 'second kin is not the pilot');
  assert(Nav.pickPilot([mac, noz, fleer])===null, 'Noz and fleeTo kin are outside this system');
  assert(Nav.isStoryLocked(noz) && Nav.isStoryLocked(fleer), 'story-locked helper covers Noz / fleeTo');
}

/* flag off: tickFollower does not handle (legacy trail/form) */
{
  Nav.FLAG=false;
  const r=Nav.tickFollower(dwarf, mac, 0.016, {canBe(){ return true; }, steerWalk(){ return 0; }});
  assert(r.handled===false && Nav.use()===false, '?nav=0 / FLAG off leaves the host trail path');
  Nav.FLAG=true;
}

/* host still preserves fleeTo before the party brain */
{
  const idxFlee=html.indexOf('if(e.fleeTo){');
  const idxPilot=html.indexOf('Navigation.isPilot');
  assert(idxFlee>=0 && idxPilot>idxFlee, 'fleeTo is handled before the nav pilot');
}

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nnavigation / one-follower pilot checks passed');

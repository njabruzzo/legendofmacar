'use strict';
/**
 * Party dwarves face the way they walk: sheets are iso SE, canvas-flipped for SW.
 * Each dwarf uses its own travel vector. Ghosts do not inherit Macar heading.
 * Run: node src/combat/DwarfFacing.test.js
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

assert(/const DWARF_FACE_SX=\{/.test(html), 'native sheet-facing table exists');
assert(/function wantsSpriteFlip\(e\)\{/.test(html), 'wantsSpriteFlip uses the facing table');
assert(/function moveHeadingSX\(e\)\{/.test(html), 'iso screen-x heading is ix-iy');
assert(/wantsSpriteFlip\(e\)/.test(html.match(/function drawEnt\(g,e\)\{[\s\S]*?g\.scale\(flip/)[0]),
  'drawEnt flips from the facing table, not a hardcoded heading>0');
assert(!/function facingRef\(e\)\{/.test(html),
  'ghosts do not inherit Macar heading via facingRef');
assert(/Each dwarf uses its own ix\/iy/.test(html),
  'comment records that ghosts follow their own travel vector');

['macar','macar_axe','pordoom','pordoom_ghost','fendur','fendur_ghost','orbo','orbo_ghost','talpor','talpor_ghost']
  .forEach(k=>assert(new RegExp(k+':1').test(html), k+' sheet is painted iso SE (screen-right)'));

function extract(name){
  const re=new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}');
  const m=html.match(re);
  if(!m) throw new Error('missing '+name);
  return m[0];
}
const table=html.match(/const DWARF_FACE_SX=\{[\s\S]*?\n\};/)[0];
const ctx={};
vm.createContext(ctx);
vm.runInContext(table, ctx);
vm.runInContext(extract('sheetFaceSX'), ctx);
vm.runInContext(extract('moveHeadingSX'), ctx);
vm.runInContext('function entSpriteKey(e){ return e.k; }\n'+extract('wantsSpriteFlip'), ctx);

const {sheetFaceSX, moveHeadingSX, wantsSpriteFlip}=ctx;
assert(sheetFaceSX('macar')===1 && sheetFaceSX('orbo_ghost_w1')===1, 'walk frames inherit the kin facing');
assert(sheetFaceSX('talpor_ghost_back')===1, 'back frames inherit the kin facing');

function headingOf(ix,iy){ return moveHeadingSX({moving:1, ix, iy, fdx:0, fdy:0}); }
assert(headingOf(-0.7,0.7)<0, 'A / screen-left is negative heading (iso SW)');
assert(headingOf(0.7,-0.7)>0, 'D / screen-right is positive heading (iso SE)');

const leftMacar={k:'macar', moving:1, ix:-0.7, iy:0.7, fdx:-0.7, fdy:0.7};
const rightMacar={k:'macar', moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7};
const leftGhost={k:'orbo_ghost', moving:1, ix:-0.7, iy:0.7, fdx:-0.7, fdy:0.7};
const rightGhost={k:'talpor_ghost', moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7};
assert(wantsSpriteFlip(leftMacar), 'Macar walking left mirrors the SE sheet (faces the walk)');
assert(!wantsSpriteFlip(rightMacar), 'Macar walking right keeps the SE sheet');
assert(wantsSpriteFlip(leftGhost), 'ghost kin walking left face left');
assert(!wantsSpriteFlip(rightGhost), 'ghost kin walking right face right');
assert(!wantsSpriteFlip({k:'fendur_ghost', dead:1, moving:1, ix:-0.7, iy:0.7}), 'corpses are not flipped');

const ghostGoingRight={k:'pordoom_ghost', team:'party', ghost:1, moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7};
const macarGoingLeft={k:'macar', hero:1, moving:1, ix:-0.7, iy:0.7, fdx:-0.7, fdy:0.7};
assert(!wantsSpriteFlip(ghostGoingRight),
  'a ghost still walking right faces right even if Macar already turned left');
assert(wantsSpriteFlip(macarGoingLeft), 'Macar left and a lagging ghost right stay independent');

const root=path.join(__dirname,'../../assets/creatures');
['dwarf_macar_w2.png','dwarf_fendur_ghost.png','dwarf_orbo_ghost_w1.png','dwarf_talpor_ghost.png','dwarf_pordoom_w1.png']
  .forEach(f=>assert(fs.existsSync(path.join(root,f)), f+' exists'));

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\ndwarf facing checks passed');

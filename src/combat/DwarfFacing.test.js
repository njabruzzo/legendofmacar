'use strict';
/**
 * Party dwarves face the way they walk: sheets are iso SW, canvas-flipped for SE.
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

['macar','macar_axe','pordoom','pordoom_ghost','fendur','fendur_ghost','orbo','orbo_ghost','talpor','talpor_ghost']
  .forEach(k=>assert(new RegExp(k+':-1').test(html), k+' sheet is painted iso SW (screen-left)'));

function extract(name){
  const re=new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}');
  const m=html.match(re);
  if(!m) throw new Error('missing '+name);
  return m[0];
}
const table=html.match(/const DWARF_FACE_SX=\{[\s\S]*?\n\};/)[0];
const facingSrc=html.match(/function facingRef\(e\)\{[\s\S]*?\n  return e;\n\}/)[0];
const ctx={};
vm.createContext(ctx);
vm.runInContext('function player(){ return null; }', ctx);
vm.runInContext(table, ctx);
vm.runInContext(facingSrc, ctx);
vm.runInContext(extract('sheetFaceSX'), ctx);
vm.runInContext(extract('moveHeadingSX'), ctx);
vm.runInContext('function entSpriteKey(e){ return e.k; }\n'+extract('wantsSpriteFlip'), ctx);

const {sheetFaceSX, moveHeadingSX, wantsSpriteFlip, facingRef}=ctx;
assert(typeof facingRef==='function', 'ghosts share Macar heading via facingRef');
assert(sheetFaceSX('macar')===-1 && sheetFaceSX('orbo_ghost_w1')===-1, 'walk frames inherit the kin facing');
assert(sheetFaceSX('talpor_ghost_back')===-1, 'back frames inherit the kin facing');

function headingOf(ix,iy){ return moveHeadingSX({moving:1, ix, iy, fdx:0, fdy:0}); }
assert(headingOf(-0.7,0.7)<0, 'A / screen-left is negative heading (iso SW)');
assert(headingOf(0.7,-0.7)>0, 'D / screen-right is positive heading (iso SE)');

const leftMacar={k:'macar', moving:1, ix:-0.7, iy:0.7, fdx:-0.7, fdy:0.7};
const rightMacar={k:'macar', moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7};
const leftGhost={k:'orbo_ghost', moving:1, ix:-0.7, iy:0.7, fdx:-0.7, fdy:0.7};
const rightGhost={k:'talpor_ghost', moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7};
assert(!wantsSpriteFlip(leftMacar), 'Macar walking left keeps the SW sheet (no moonwalk flip)');
assert(wantsSpriteFlip(rightMacar), 'Macar walking right mirrors the SW sheet');
assert(!wantsSpriteFlip(leftGhost), 'ghost kin walking left face left');
assert(wantsSpriteFlip(rightGhost), 'ghost kin walking right face right');
assert(!wantsSpriteFlip({k:'fendur_ghost', dead:1, moving:1, ix:0.7, iy:-0.7}), 'corpses are not flipped');

const root=path.join(__dirname,'../../assets/creatures');
['dwarf_macar_w2.png','dwarf_fendur_ghost.png','dwarf_orbo_ghost_w1.png','dwarf_talpor_ghost.png']
  .forEach(f=>assert(fs.existsSync(path.join(root,f)), f+' exists after the SW sheet pass'));

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\ndwarf facing checks passed');

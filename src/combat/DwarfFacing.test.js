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
assert(/function faceToward\(/.test(html) && /function faceVec\(/.test(html),
  'attack and walk heading share one face vector');
assert(/function entAnimKey\(/.test(html), 'flip uses the current animation frame, not only the kin idle');
assert(/function moveHeadingSX\(e\)\{/.test(html), 'iso screen-x heading is ix-iy');
assert(/blitFacing\(g,img,dx,dy,W,H,flip\)/.test(html),
  'billboard mirrors with negative-width drawImage, not a context scale the hero path can drop');
assert(/function blitFacing\(g,img,dx,dy,W,H,flip\)\{/.test(html) &&
  /drawImage\(img, dx\+W, dy, -W, H\)/.test(html),
  'left-heading flip is a negative destination width');
assert(/away < -0\.55 && side < 0\.72/.test(html),
  'back view is iso north only — west walk keeps the front sheet');
assert(!/function facingRef\(e\)\{/.test(html),
  'ghosts do not inherit Macar heading via facingRef');
assert(/Each dwarf uses its own ix\/iy/.test(html),
  'comment records that ghosts follow their own travel vector');

assert(/macar:1/.test(html) && /macar_w1:1/.test(html), 'Macar idle and w1 are painted iso SE');
assert(/macar_w2:-1/.test(html), 'Macar w2 is painted iso SW — flip it when walking right');
assert(/macar_axe:-1/.test(html) && /macar_axe_w1:-1/.test(html),
  'cleaver sheets are painted iso SW');
assert(/faceToward\(p, foe\.x, foe\.y\)/.test(html), 'Attack snaps Macar toward the foe');
assert(/e\.fdx=dx; e\.fdy=dy/.test(html), 'walk snaps facing to the travel vector');
assert(/k==='v'\) fire\('wall'\)/.test(html) && !/k==='d'\) fire\('wall'\)/.test(html),
  'D is walk-right, not Defend — V raises the shield');

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
const sheetFaceSX=ctx.sheetFaceSX;
function faceVec(e){
  if(!e) return {dx:0,dy:0};
  if(e.atk>0 && e.aim && !e.aim.dead && e.aim.x!=null){
    const dx=e.aim.x-e.x, dy=e.aim.y-e.y;
    if(dx||dy) return {dx,dy};
  }
  if(e.moving && ((e.ix||0)||(e.iy||0))) return {dx:e.ix||0, dy:e.iy||0};
  return {dx:e.fdx||0, dy:e.fdy||0};
}
function moveHeadingSX(e){ const v=faceVec(e); return (v.dx||0)-(v.dy||0); }
function wantsSpriteFlip(e){
  if(!e||e.crushed||e.dead) return false;
  return moveHeadingSX(e)*sheetFaceSX(e.animKey||e.k) < -0.02;
}
function wantsBackView(e){
  if(!e||e.dead||e.crushed||e.sleeping) return false;
  if(e.defending) return true;
  const v=faceVec(e);
  const away=(v.dx||0)+(v.dy||0);
  const side=Math.abs((v.dx||0)-(v.dy||0));
  return away < -0.55 && side < 0.72;
}
assert(sheetFaceSX('macar')===1 && sheetFaceSX('macar_w2')===-1, 'Macar walk frames keep their own painted facing');
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
assert(!wantsBackView({fdx:-0.7, fdy:0.7}), 'iso west / arrow-left keeps the front sheet');
assert(!wantsBackView({fdx:0, fdy:1}), 'iso SW / screen bottom-left keeps the front sheet');
assert(wantsBackView({fdx:-0.7, fdy:-0.7}), 'iso north uses the back sheet');
assert(!wantsBackView({fdx:-1, fdy:0}), 'world -x (NW-west) does not swap in a top-right back pose');

const w2Right={k:'macar', animKey:'macar_w2', moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7};
const w2Left={k:'macar', animKey:'macar_w2', moving:1, ix:-0.7, iy:0.7, fdx:-0.7, fdy:0.7};
assert(wantsSpriteFlip(w2Right), 'left-painted w2 flips when walking screen-right');
assert(!wantsSpriteFlip(w2Left), 'left-painted w2 stays as-is when walking screen-left');

const atkLeft={k:'macar', x:10, y:10, atk:0.5, aim:{x:9,y:11,dead:0}, fdx:0.7, fdy:-0.7, moving:0, ix:0, iy:0};
const atkRight={k:'macar', x:10, y:10, atk:0.5, aim:{x:11,y:9,dead:0}, fdx:-0.7, fdy:0.7, moving:0, ix:0, iy:0};
assert(wantsSpriteFlip(atkLeft), 'melee toward screen-left faces left even if last walk was right');
assert(!wantsSpriteFlip(atkRight), 'melee toward screen-right faces right even if last walk was left');
assert(wantsBackView({atk:0.4, aim:{x:9,y:9,dead:0}, x:10, y:10, fdx:0, fdy:1}),
  'attack toward iso north uses the back sheet');

const root=path.join(__dirname,'../../assets/creatures');
['dwarf_macar_w2.png','dwarf_fendur_ghost.png','dwarf_orbo_ghost_w1.png','dwarf_talpor_ghost.png','dwarf_pordoom_w1.png']
  .forEach(f=>assert(fs.existsSync(path.join(root,f)), f+' exists'));

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\ndwarf facing checks passed');

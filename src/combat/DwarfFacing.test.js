'use strict';
/**
 * Party dwarves face the way they walk: painted east sheets for D, flipped for A,
 * back sheets for W, south sheets for S. Followers copy Macar heading.
 * Run: node src/combat/DwarfFacing.test.js
 */
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(/function screenCardinal\(e\)\{/.test(html), 'screen cardinal is dx-dy vs dx+dy, not a per-frame table');
assert(!/const DWARF_FACE_SX=\{/.test(html), 'old native-facing table is gone');
assert(/function wantsSpriteFlip\(e\)\{/.test(html), 'billboard still mirrors west from the east sheet');
assert(/function faceToward\(/.test(html) && /function faceVec\(/.test(html),
  'attack and walk heading share one face vector');
assert(/function dwarfAngleKey\(/.test(html) && /function entAnimKey\(/.test(html),
  'walk picks a painted east/south/back sheet from the cardinal');
assert(/function moveHeadingSX\(e\)\{/.test(html), 'iso screen-x heading is ix-iy');
assert(/blitFacing\(g,img,dx,dy,W,H,flip\)/.test(html),
  'billboard mirrors with negative-width drawImage, not a context scale the hero path can drop');
assert(/function blitFacing\(g,img,dx,dy,W,H,flip\)\{/.test(html) &&
  /drawImage\(img, dx\+W, dy, -W, H\)/.test(html),
  'left-heading flip is a negative destination width');
assert(/return screenCardinal\(e\)==='n'/.test(html),
  'back view is iso north only — west walk keeps the side sheet');
assert(/Party kin share Macar heading/.test(html),
  'followers face Macar while they trail, not their scramble vector');
assert(/lead\.fdx!=null\?lead\.fdx/.test(html),
  'Macar heading uses fdx even when it is 0 (south/north)');
assert(/e\.fdx=p\.fdx; e\.fdy=p\.fdy/.test(html),
  'followers snap to Macar heading instead of turnToward scramble');
assert(!/Each dwarf uses its own ix\/iy/.test(html),
  'old per-dwarf scramble facing comment is gone');
assert(/k\+'_e_w1'/.test(html) && /k\+'_s_w1'/.test(html) && /k\+'_ghost_e_w1'/.test(html),
  'east and south walk sheets are registered for Macar and ghost kin');
assert(/faceToward\(p, foe\.x, foe\.y\)/.test(html), 'Attack snaps Macar toward the foe');
assert(/e\.fdx=dx; e\.fdy=dy/.test(html), 'walk snaps facing to the travel vector');
assert(/k==='v'\) fire\('wall'\)/.test(html) && !/k==='d'\) fire\('wall'\)/.test(html),
  'D is walk-right, not Defend — V raises the shield');
assert(/key\.indexOf\('_e_'\)>=0/.test(html) && /return card==='w'/.test(html),
  'east sheets flip only for screen-west; they stay as painted on D');

function faceVec(e, lead){
  if(!e) return {dx:0,dy:0};
  if(e.atk>0 && e.aim && !e.aim.dead && e.aim.x!=null){
    const dx=e.aim.x-e.x, dy=e.aim.y-e.y;
    if(dx||dy) return {dx,dy};
  }
  if(e.team==='party' && !e.hero && lead && !e.defending && !(e.atk>0)){
    const hx=lead.fdx!=null?lead.fdx:(lead.ix||0);
    const hy=lead.fdy!=null?lead.fdy:(lead.iy||0);
    if(hx||hy) return {dx:hx, dy:hy};
  }
  if(e.moving && ((e.ix||0)||(e.iy||0))) return {dx:e.ix||0, dy:e.iy||0};
  return {dx:e.fdx||0, dy:e.fdy||0};
}
function screenCardinal(e, lead){
  const v=faceVec(e, lead);
  const sx=(v.dx||0)-(v.dy||0);
  const sy=(v.dx||0)+(v.dy||0);
  if(Math.abs(sx)>=Math.abs(sy)) return sx>=0?'e':'w';
  return sy>=0?'s':'n';
}
function wantsSpriteFlip(e, lead){
  if(!e||e.crushed||e.dead) return false;
  const card=screenCardinal(e, lead);
  const key=e.animKey||'macar_e_w1';
  if(key.indexOf('_e_')>=0 || /_e$/.test(key)) return card==='w';
  if(key.indexOf('_s_')>=0 || /_s$/.test(key) || key.indexOf('_back')>=0) return false;
  return card==='w';
}
function wantsBackView(e, lead){
  if(!e||e.dead||e.crushed||e.sleeping) return false;
  if(e.defending) return true;
  return screenCardinal(e, lead)==='n';
}

assert(screenCardinal({moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7})==='e',
  'D / screen-right is the east cardinal');
assert(screenCardinal({moving:1, ix:-0.7, iy:0.7, fdx:-0.7, fdy:0.7})==='w',
  'A / screen-left is the west cardinal');
assert(screenCardinal({moving:1, ix:-0.7, iy:-0.7, fdx:-0.7, fdy:-0.7})==='n',
  'W / screen-up is the north cardinal');
assert(screenCardinal({moving:1, ix:0.7, iy:0.7, fdx:0.7, fdy:0.7})==='s',
  'S / screen-down is the south cardinal');
assert(screenCardinal({moving:0, ix:0, iy:0, fdx:0, fdy:1})==='w' ||
       screenCardinal({moving:0, ix:0, iy:0, fdx:0, fdy:1})==='s',
  'fdx===0 is still a real heading, not a missing fallback');

const leftMacar={k:'macar', animKey:'macar_e_w1', moving:1, ix:-0.7, iy:0.7, fdx:-0.7, fdy:0.7};
const rightMacar={k:'macar', animKey:'macar_e_w1', moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7};
const leftGhost={k:'orbo_ghost', animKey:'orbo_ghost_e_w1', moving:1, ix:-0.7, iy:0.7, fdx:-0.7, fdy:0.7};
const rightGhost={k:'talpor_ghost', animKey:'talpor_ghost_e_w1', moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7};
assert(wantsSpriteFlip(leftMacar), 'Macar walking left mirrors the painted-right sheet');
assert(!wantsSpriteFlip(rightMacar), 'Macar walking right keeps the painted-right sheet');
assert(wantsSpriteFlip(leftGhost), 'ghost kin walking left face left');
assert(!wantsSpriteFlip(rightGhost), 'ghost kin walking right face right');
assert(!wantsSpriteFlip({k:'fendur_ghost', dead:1, moving:1, ix:-0.7, iy:0.7}), 'corpses are not flipped');

const ghostGoingRight={k:'pordoom_ghost', team:'party', ghost:1, moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7, animKey:'pordoom_ghost_e_w1'};
const macarGoingLeft={k:'macar', hero:1, moving:1, ix:-0.7, iy:0.7, fdx:-0.7, fdy:0.7};
assert(wantsSpriteFlip(ghostGoingRight, macarGoingLeft),
  'a lagging ghost still faces Macar left, not its scramble right');
const ghostIdleScramble={k:'orbo_ghost', team:'party', ghost:1, moving:0, ix:0, iy:0, fdx:0.7, fdy:-0.7, animKey:'orbo_ghost_e_w1'};
assert(wantsSpriteFlip(ghostIdleScramble, macarGoingLeft),
  'a stopped ghost still faces Macar, not the last scramble heading');
assert(wantsSpriteFlip(macarGoingLeft), 'Macar walking left faces left');

assert(!wantsBackView({fdx:-0.7, fdy:0.7}), 'iso west / arrow-left keeps the side sheet');
assert(!wantsBackView({fdx:0, fdy:1}), 'iso SW / screen bottom-left keeps the side sheet');
assert(wantsBackView({fdx:-0.7, fdy:-0.7}), 'iso north uses the back sheet');
assert(!wantsBackView({fdx:-1, fdy:0}), 'world -x (NW-west) does not swap in a top-right back pose');

assert(!wantsSpriteFlip({k:'macar', animKey:'macar_s_w1', moving:1, ix:0.7, iy:0.7, fdx:0.7, fdy:0.7}),
  'south walk is painted toward the camera and is not flipped');
assert(!wantsSpriteFlip({k:'macar', animKey:'macar_back_w1', moving:1, ix:-0.7, iy:-0.7, fdx:-0.7, fdy:-0.7}),
  'back walk is not canvas-flipped');

const atkLeft={k:'macar', x:10, y:10, atk:0.5, aim:{x:9,y:11,dead:0}, fdx:0.7, fdy:-0.7, moving:0, ix:0, iy:0, animKey:'macar_e_atk'};
const atkRight={k:'macar', x:10, y:10, atk:0.5, aim:{x:11,y:9,dead:0}, fdx:-0.7, fdy:0.7, moving:0, ix:0, iy:0, animKey:'macar_e_atk'};
assert(wantsSpriteFlip(atkLeft), 'melee toward screen-left faces left even if last walk was right');
assert(!wantsSpriteFlip(atkRight), 'melee toward screen-right faces right even if last walk was left');
assert(wantsBackView({atk:0.4, aim:{x:9,y:9,dead:0}, x:10, y:10, fdx:0, fdy:1}),
  'attack toward iso north uses the back sheet');

const root=path.join(__dirname,'../../assets/creatures');
['dwarf_macar_e_w1.png','dwarf_macar_e_w2.png','dwarf_macar_s_w1.png','dwarf_macar_s_w2.png',
 'dwarf_orbo_ghost_e_w1.png','dwarf_fendur_ghost_e_w1.png','dwarf_pordoom_ghost_e_w1.png','dwarf_talpor_ghost_e_w1.png',
 'dwarf_orbo_ghost_s_w1.png','dwarf_fendur_ghost_s_w1.png','dwarf_pordoom_ghost_s_w1.png','dwarf_talpor_ghost_s_w1.png',
 'dwarf_orbo_e_w1.png','dwarf_fendur_e_w1.png','dwarf_pordoom_e_w1.png','dwarf_talpor_e_w1.png']
  .forEach(f=>assert(fs.existsSync(path.join(root,f)), f+' exists'));

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\ndwarf facing checks passed');

'use strict';
/**
 * Party dwarves face the way they walk. Living Macar front idle/w1/w2 invert
 * the blit so D / gold-right is not a moonwalk. Ghost kin keep painted-east
 * sheets, baked-mirror for screen-left (A / left-stick / SW / NW).
 * NW painted sheets face upper-right and must not be used for west.
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

assert(/function screenOctant\(e\)\{/.test(html), 'walk uses 8 iso octants, not a 4-way snap');
assert(!/const DWARF_FACE_SX=\{/.test(html), 'old native-facing table is gone');
assert(/function wantsSpriteFlip\(e\)\{/.test(html), 'billboard still mirrors west from the east sheet');
assert(/function faceToward\(/.test(html) && /function faceVec\(/.test(html),
  'attack and walk heading share one face vector');
assert(/function dwarfAngleKey\(/.test(html) && /oct==='w'\|\|oct==='sw'\|\|oct==='nw'/.test(html),
  'screen-left octants (A / SW / NW) share the east-painted walk');
assert(/function moveHeadingSX\(e\)\{/.test(html), 'iso screen-x heading is ix-iy');
assert(/function flippedSprite\(img\)\{/.test(html) && /function blitFacing\(/.test(html),
  'west facing bakes a mirrored canvas instead of relying on negative dest width');
assert(/if\(e\.hero && !e\.ghost\) return sx > 0\.02/.test(html),
  'living Macar inverts the front-sheet flip so east walk is not a moonwalk');
assert(/return sx < -0\.02/.test(html),
  'kin / ghosts still flip any screen-left heading, not only oct===w');
assert(/return screenOctant\(e\)==='n'/.test(html),
  'full back view is screen-up only');
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
assert(/The _nw_ sheets are painted walking upper-right/.test(html),
  'NW moonwalk is called out: those sheets are not selected for west');
assert(/macar_title/.test(html) && /dwarf_macar_title\.png/.test(html),
  'title still sheet stays registered for later binary-alpha');
assert(/blitLivingMacar\(SPR\.macar\)/.test(html.match(/function drawTitleCavern\(g\)\{[\s\S]*?\n\}/)[0]),
  'title fallback blits the blitLivingMacar idle pipe');

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
function screenOctant(e, lead){
  const v=faceVec(e, lead);
  const sx=(v.dx||0)-(v.dy||0);
  const sy=(v.dx||0)+(v.dy||0);
  if(!(sx||sy)) return 's';
  const deg=((Math.atan2(sy,sx)*180/Math.PI)+360)%360;
  const bin=Math.round(deg/45)%8;
  return ['e','se','s','sw','w','nw','n','ne'][bin];
}
function moveHeadingSX(e, lead){
  const v=faceVec(e, lead);
  return (v.dx||0)-(v.dy||0);
}
function wantsSpriteFlip(e, lead){
  if(!e||e.crushed||e.dead) return false;
  const key=e.animKey||'macar_e_w1';
  if(key.indexOf('_back')>=0) return false;
  if(key.indexOf('_s_')>=0 || /_s$/.test(key)) return false;
  if(key.indexOf('_ne_')>=0) return false;
  const sx=moveHeadingSX(e, lead);
  if(e.hero && !e.ghost) return sx > 0.02;
  return sx < -0.02;
}
function wantsBackView(e, lead){
  if(!e||e.dead||e.crushed||e.sleeping) return false;
  if(e.defending) return true;
  return screenOctant(e, lead)==='n';
}

assert(screenOctant({moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7})==='e',
  'D / screen-right is east');
assert(screenOctant({moving:1, ix:-0.7, iy:0.7, fdx:-0.7, fdy:0.7})==='w',
  'A / screen-left is west');
assert(screenOctant({moving:1, ix:-0.7, iy:-0.7, fdx:-0.7, fdy:-0.7})==='n',
  'W / screen-up is north');
assert(screenOctant({moving:1, ix:0.7, iy:0.7, fdx:0.7, fdy:0.7})==='s',
  'S / screen-down is south');
assert(screenOctant({moving:1, ix:-1, iy:0, fdx:-1, fdy:0})==='nw',
  'W+A / world -x is northwest (screen top-left)');
assert(screenOctant({moving:1, ix:0, iy:-1, fdx:0, fdy:-1})==='ne',
  'W+D / world -y is northeast');
assert(screenOctant({moving:1, ix:0, iy:1, fdx:0, fdy:1})==='sw',
  'S+A / world +y is southwest');
assert(screenOctant({moving:1, ix:1, iy:0, fdx:1, fdy:0})==='se',
  'S+D / world +x is southeast');

const leftMacar={k:'macar', hero:1, animKey:'macar_w1', moving:1, ix:-0.7, iy:0.7, fdx:-0.7, fdy:0.7};
const rightMacar={k:'macar', hero:1, animKey:'macar_w1', moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7};
const leftGhost={k:'orbo_ghost', animKey:'orbo_ghost_e_w1', moving:1, ix:-0.7, iy:0.7, fdx:-0.7, fdy:0.7};
const rightGhost={k:'talpor_ghost', animKey:'talpor_ghost_e_w1', moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7};
assert(!wantsSpriteFlip(leftMacar), 'Macar walking left keeps the front 3/4 (reads west)');
assert(wantsSpriteFlip(rightMacar), 'Macar walking right flips the front 3/4 so beard leads east');
assert(wantsSpriteFlip(leftGhost), 'ghost kin walking left face left');
assert(!wantsSpriteFlip(rightGhost), 'ghost kin walking right face right');
assert(!wantsSpriteFlip({k:'fendur_ghost', dead:1, moving:1, ix:-0.7, iy:0.7}), 'corpses are not flipped');

const nwMacar={k:'macar', hero:1, animKey:'macar_w1', moving:1, ix:-1, iy:0, fdx:-1, fdy:0};
assert(!wantsSpriteFlip(nwMacar), 'NW / W+A keeps the living-Macar front sheet unflipped');
const swMacar={k:'macar', hero:1, animKey:'macar_w1', moving:1, ix:0, iy:1, fdx:0, fdy:1};
assert(!wantsSpriteFlip(swMacar), 'SW / S+A keeps the living-Macar front sheet unflipped');

const ghostGoingRight={k:'pordoom_ghost', team:'party', ghost:1, moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7, animKey:'pordoom_ghost_e_w1'};
const macarGoingLeft={k:'macar', hero:1, moving:1, ix:-0.7, iy:0.7, fdx:-0.7, fdy:0.7};
assert(wantsSpriteFlip(ghostGoingRight, macarGoingLeft),
  'a lagging ghost still faces Macar left, not its scramble right');
const ghostIdleScramble={k:'orbo_ghost', team:'party', ghost:1, moving:0, ix:0, iy:0, fdx:0.7, fdy:-0.7, animKey:'orbo_ghost_e_w1'};
assert(wantsSpriteFlip(ghostIdleScramble, macarGoingLeft),
  'a stopped ghost still faces Macar, not the last scramble heading');
assert(!wantsSpriteFlip(macarGoingLeft), 'Macar walking left faces left without a second flip');

assert(!wantsBackView({fdx:-0.7, fdy:0.7}), 'iso west / arrow-left keeps the side sheet');
assert(!wantsBackView({fdx:0, fdy:1}), 'iso SW / screen bottom-left keeps the side sheet');
assert(wantsBackView({fdx:-0.7, fdy:-0.7}), 'iso north uses the back sheet');
assert(!wantsBackView({fdx:-1, fdy:0}), 'world -x (NW-west) does not swap in a top-right back pose');

assert(!wantsSpriteFlip({k:'macar', animKey:'macar_s_w1', moving:1, ix:0.7, iy:0.7, fdx:0.7, fdy:0.7}),
  'south walk is painted toward the camera and is not flipped');
assert(!wantsSpriteFlip({k:'macar', animKey:'macar_back_w1', moving:1, ix:-0.7, iy:-0.7, fdx:-0.7, fdy:-0.7}),
  'back walk is not canvas-flipped');

const atkLeft={k:'macar', hero:1, x:10, y:10, atk:0.5, aim:{x:9,y:11,dead:0}, fdx:0.7, fdy:-0.7, moving:0, ix:0, iy:0, animKey:'macar_atk'};
const atkRight={k:'macar', hero:1, x:10, y:10, atk:0.5, aim:{x:11,y:9,dead:0}, fdx:-0.7, fdy:0.7, moving:0, ix:0, iy:0, animKey:'macar_atk'};
assert(!wantsSpriteFlip(atkLeft), 'melee toward screen-left keeps the front sheet (reads left)');
assert(wantsSpriteFlip(atkRight), 'melee toward screen-right flips the front sheet so the hammer leads');
assert(wantsBackView({atk:0.4, aim:{x:9,y:9,dead:0}, x:10, y:10, fdx:0, fdy:1}),
  'attack toward iso north uses the back sheet');

const root=path.join(__dirname,'../../assets/creatures');
['dwarf_macar_e_w1.png','dwarf_macar_e_w2.png','dwarf_macar_s_w1.png','dwarf_macar_s_w2.png',
 'dwarf_macar_title.png',
 'dwarf_orbo_ghost_e_w1.png','dwarf_fendur_ghost_e_w1.png','dwarf_pordoom_ghost_e_w1.png','dwarf_talpor_ghost_e_w1.png',
 'dwarf_orbo_ghost_s_w1.png','dwarf_fendur_ghost_s_w1.png','dwarf_pordoom_ghost_s_w1.png','dwarf_talpor_ghost_s_w1.png',
 'dwarf_orbo_e_w1.png','dwarf_fendur_e_w1.png','dwarf_pordoom_e_w1.png','dwarf_talpor_e_w1.png']
  .forEach(f=>assert(fs.existsSync(path.join(root,f)), f+' exists'));

const ui=path.join(__dirname,'../../assets/ui');
['title_splash.jpg','intro_ch1.jpg'].forEach(f=>assert(fs.existsSync(path.join(ui,f)), f+' exists'));

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\ndwarf facing checks passed');

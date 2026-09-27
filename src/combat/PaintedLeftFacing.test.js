'use strict';
/**
 * Rat, beetle and goblin sheets are painted facing screen-left.
 * Straight north and south keep the last horizontal facing.
 * Run: node src/combat/PaintedLeftFacing.test.js
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

const table=html.match(/const SPRITE_PAINTED_LEFT=\{[^}]*\};/);
assert(table && table[0]==='const SPRITE_PAINTED_LEFT={rat:1,beetle:1,goblin:1};',
  'painted-left is one object literal: rat, beetle, goblin');
assert(html.indexOf('SPRITE_PAINTED_LEFT')===html.lastIndexOf('SPRITE_PAINTED_LEFT={')
  || (html.match(/SPRITE_PAINTED_LEFT=\{/g)||[]).length===1,
  'the painted-left table is declared once');

const SPR={};
['rat','beetle','goblin','undead'].forEach(k=>{
  SPR[k]={width:8};
  SPR[k+'_w1']={width:8};
  SPR[k+'_w2']={width:8};
  SPR[k+'_atk']={width:8};
});
const ctx={
  SPR,
  TW:80, TH:40,
  sprReady(k){ return !!(k && SPR[k] && SPR[k].width); },
  player(){ return null; },
  entSpriteKey(e){ return e.sprite||e.kind; },
  singlePoseLocked(){ return false; },
  wantsMeleePose(){ return false; },
  wantsMeleeRecover(){ return false; }
};
vm.createContext(ctx);
vm.runInContext(
  table[0]+'\n'
  +extractFn('walkCycleKey')+'\n'
  +extractFn('faceVec')+'\n'
  +extractFn('moveHeadingSX')+'\n'
  +extractFn('screenOctant')+'\n'
  +extractFn('screenCardinal')+'\n'
  +extractFn('wantsBackView')+'\n'
  +extractFn('wantsSpriteFlip')+'\n'
  +extractFn('entAnimKey')+'\n'
  +extractFn('toyScreenFace')+'\n'
  +'this.wantsSpriteFlip=wantsSpriteFlip; this.entAnimKey=entAnimKey; this.toyScreenFace=toyScreenFace;',
  ctx
);

function mover(kind, ix, iy, gait){
  return {
    kind, sprite:kind, team:'foe', dead:0, crushed:0, hero:0, ghost:0,
    moving:1, defending:0, atk:0, gait:gait==null?0.12:gait,
    ix, iy, fdx:ix, fdy:iy
  };
}

['rat','beetle','goblin'].forEach(kind=>{
  const east=mover(kind, 0.7, -0.7);
  const west=mover(kind, -0.7, 0.7);
  assert(ctx.wantsSpriteFlip(east)===true, kind+' moving screen-east mirrors the left-painted sheet');
  assert(ctx.wantsSpriteFlip(west)===false, kind+' moving screen-west keeps the left-painted sheet');
  const stoppedWest=mover(kind, 0, 0);
  stoppedWest.moving=0;
  stoppedWest.fdx=-0.7; stoppedWest.fdy=0.7;
  assert(ctx.wantsSpriteFlip(stoppedWest)===false, kind+' stopped facing west stays unflipped');
  const north=ctx.entAnimKey(mover(kind, -0.7, -0.7, 0.12));
  const north2=ctx.entAnimKey(mover(kind, -0.7, -0.7, 0.8));
  assert(north===kind+'_w1' && north2===kind+'_w2', kind+' moving north keeps the walk cycle ('+north+' / '+north2+')');
  const ne=ctx.entAnimKey(mover(kind, 0, -1, 0.2));
  const nw=ctx.entAnimKey(mover(kind, -1, 0, 0.2));
  assert(ne===kind+'_w1' && nw===kind+'_w1', kind+' moving NE and NW keeps the walk cycle');
});

function turn(kind, from, to){
  const e=mover(kind, from[0], from[1], 0.2);
  const before=ctx.wantsSpriteFlip(e);
  e.ix=to[0]; e.iy=to[1]; e.fdx=to[0]; e.fdy=to[1]; e.gait=0.7;
  const after=ctx.wantsSpriteFlip(e);
  return {before, after, e};
}
['rat','goblin'].forEach(kind=>{
  const wn=turn(kind, [-0.7, 0.7], [-0.7, -0.7]);
  assert(wn.before===false && wn.after===false,
    kind+' walking west then north does not flip toward the east');
  const en=turn(kind, [0.7, -0.7], [-0.7, -0.7]);
  assert(en.before===true && en.after===true,
    kind+' walking east then north stays mirrored');
  const ws=turn(kind, [-0.7, 0.7], [0.7, 0.7]);
  assert(ws.before===false && ws.after===false,
    kind+' walking west then south does not flip toward the east');
  const es=turn(kind, [0.7, -0.7], [0.7, 0.7]);
  assert(es.before===true && es.after===true,
    kind+' walking east then south stays mirrored');
});

const rightPainted=mover('undead', -0.7, 0.7);
assert(ctx.wantsSpriteFlip(rightPainted)===true, 'a right-painted foe still flips for screen-west');

assert(ctx.toyScreenFace(1, -1, 1)===1, 'toy screen-east (dx-dy > 0) faces right');
assert(ctx.toyScreenFace(-1, 1, 1)===-1, 'toy screen-west (dx-dy < 0) faces left');
assert(ctx.toyScreenFace(0.38, 0.92, 1)===-1, 'toy world +x that is screen-left faces left');
assert(ctx.toyScreenFace(0.7, 0.7, -1)===-1, 'toy straight south keeps the last face');
assert(ctx.toyScreenFace(-0.7, -0.7, 1)===1, 'toy straight north keeps the last face');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\npainted-left facing checks passed');

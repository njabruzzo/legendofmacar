'use strict';
/**
 * Worn bone crown seats on each frame's head top (the old H*0.15 anchor).
 * The open middle is not filled. From frame to frame the crown stays
 * within 2px of that head top, standing through swing.
 * Run: node src/combat/WornCrownSeat.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {readRgba}=require('../qa/pngRgba');

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

const table=html.match(/const WORN_CROWN_HEAD=\{[\s\S]*?\n\};/);
assert(table, 'worn-crown head table is present');
const ctx={};
vm.createContext(ctx);
vm.runInContext(
  table[0]+'\n'
  +extractFn('wornCrownMotionKey')+'\n'
  +extractFn('wornCrownSeat')+'\n'
  +'this.WORN_CROWN_HEAD=WORN_CROWN_HEAD; this.wornCrownMotionKey=wornCrownMotionKey; this.wornCrownSeat=wornCrownSeat;',
  ctx
);

const draw=extractFn('drawWornBoneCrown');
assert(!/dy\+H\*0\.15/.test(draw), 'the fixed H*0.15 anchor is gone');
assert(!/crownHoleColored|crownInteriorMask|macarScalpColor/.test(html), 'the crown middle is not filled in code');
assert(/crownSprite\(/.test(draw), 'wear still draws the painted crown');
assert((draw.match(/g\.drawImage\(img/g)||[]).length===1, 'exactly one crown image is drawn');
assert(ctx.wornCrownMotionKey('macar')===true, 'standing idle seats on its own head top');

/* Topmost opaque pixel near the head's x. That is the frame's head top. */
function alphaHeadTop(rgba, hx){
  const w=rgba.w, h=rgba.h, data=rgba.data;
  const x0=Math.max(0, Math.floor((hx-0.08)*w));
  const x1=Math.min(w-1, Math.ceil((hx+0.08)*w));
  for(let y=0;y<h;y++){
    for(let x=x0;x<=x1;x++){
      const o=(y*w+x)*4;
      if(data[o+3]>40 && (data[o]|data[o+1]|data[o+2])!==0) return y;
    }
  }
  return -1;
}

const FILE={
  macar:'dwarf_macar.png',
  macar_w1:'dwarf_macar_w1.png',
  macar_w2:'dwarf_macar_w2.png',
  macar_e_w1:'dwarf_macar_e_w1.png',
  macar_e_w2:'dwarf_macar_e_w2.png',
  macar_se_w1:'dwarf_macar_se_w1.png',
  macar_se_w2:'dwarf_macar_se_w2.png',
  macar_ne_w1:'dwarf_macar_ne_w1.png',
  macar_ne_w2:'dwarf_macar_ne_w2.png',
  macar_back_w1:'dwarf_macar_back_w1.png',
  macar_back_w2:'dwarf_macar_back_w2.png',
  macar_atk:'dwarf_macar_atk.png',
  macar_atk_contact:'dwarf_macar_atk_contact.png'
};
const DIRS={
  s:['macar_w1','macar_w2'],
  e:['macar_e_w1','macar_e_w2'],
  w:['macar_e_w1','macar_e_w2'],
  se:['macar_se_w1','macar_se_w2'],
  sw:['macar_se_w1','macar_se_w2'],
  ne:['macar_ne_w1','macar_ne_w2'],
  nw:['macar_ne_w1','macar_ne_w2'],
  n:['macar_back_w1','macar_back_w2']
};
const FLIP={w:1, sw:1, nw:1};
const SWING=['macar_atk','macar_atk_contact'];
const cache={};

function sheet(key){
  if(!cache[key]) cache[key]=readRgba(path.join(__dirname,'../../assets/creatures/'+FILE[key]));
  return cache[key];
}

/* Crown landmark minus this frame's head top, in destination pixels.
   Same blit height for every frame, so a pop shows up as pixels. */
function headOffset(key, destH){
  const head=ctx.WORN_CROWN_HEAD[key];
  const rgba=sheet(key);
  const alpha=alphaHeadTop(rgba, head.x);
  const dy=-destH;
  const seat=ctx.wornCrownSeat(80, destH, -40, dy, false, head, 682/414);
  const headY=dy+destH*(alpha/rgba.h);
  return seat.cy-headY;
}

function check(dir, key, flip){
  const head=ctx.WORN_CROWN_HEAD[key];
  assert(head && ctx.wornCrownMotionKey(key)===true, dir+' '+key+' has a head anchor');
  const rgba=sheet(key);
  const W=rgba.w, H=rgba.h, dx=-W*0.5, dy=-H;
  const seat=ctx.wornCrownSeat(W, H, dx, dy, !!flip, head, 682/414);
  const headY=dy+H*head.y;
  const top=alphaHeadTop(rgba, head.x);
  assert(Math.abs(seat.cy-headY)<=0.01, dir+' '+key+' seat is the head-top anchor');
  assert(top>=0 && Math.abs((seat.cy-dy)-top)<=2,
    dir+' '+key+' anchor within 2px of the alpha head top (cy '+((seat.cy-dy).toFixed(1))+' head '+top+')');
  if(flip){
    const unflipped=ctx.wornCrownSeat(W, H, dx, dy, false, head, 682/414);
    assert(Math.abs(seat.cy-unflipped.cy)<=1, dir+' '+key+' mirror keeps the crown on the same row');
  }
}

Object.keys(DIRS).forEach(dir=>{
  DIRS[dir].forEach(key=>check(dir, key, FLIP[dir]));
});
check('stand', 'macar', false);
['e','w','n','s','ne','nw','se','sw'].forEach(dir=>{
  SWING.forEach(key=>check(dir+'-swing', key, FLIP[dir]));
});

/* Standing, both walk steps, and both swing sheets, at one blit height. */
const DRIFT_KEYS=['macar','macar_w1','macar_w2','macar_e_w1','macar_e_w2',
  'macar_se_w1','macar_se_w2','macar_ne_w1','macar_ne_w2',
  'macar_back_w1','macar_back_w2','macar_atk','macar_atk_contact'];
[80, 140].forEach(destH=>{
  const offs=DRIFT_KEYS.map(key=>({key, off:headOffset(key, destH)}));
  const values=offs.map(o=>o.off);
  const drift=Math.max.apply(null, values)-Math.min.apply(null, values);
  assert(drift<=2, 'crown stays within 2px of the head top across frames at H='+destH+' (drift '+drift.toFixed(2)+'px)');
});

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nworn crown seat checks passed');

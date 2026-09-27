'use strict';
/**
 * Worn bone crown: on every walk and strike sheet the band's bottom
 * sits on that frame's head top (alpha), within a few pixels.
 * Standing idle keeps the wrapped seat. Run: node src/combat/WornCrownSeat.test.js
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

assert(ctx.wornCrownMotionKey('macar')===false, 'standing idle is not a motion seat');
assert(/dy\+H\*0\.15/.test(extractFn('drawWornBoneCrown')), 'standing idle keeps the wrapped crown seat');
assert(/crownHoleColored\(/.test(extractFn('drawWornBoneCrown')), 'walk and strike frames can fill the open middle');
assert(/crownSprite\(/.test(extractFn('drawWornBoneCrown')), 'wear still draws the painted crown');

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

function check(dir, key, flip){
  const head=ctx.WORN_CROWN_HEAD[key];
  assert(head && ctx.wornCrownMotionKey(key)===true, dir+' '+key+' is a seated motion frame');
  const rgba=sheet(key);
  const W=rgba.w, H=rgba.h, dx=-W*0.5, dy=-H;
  const seat=ctx.wornCrownSeat(W, H, dx, dy, !!flip, head, 682/414);
  const headY=dy+H*head.y;
  const top=alphaHeadTop(rgba, head.x);
  const bandPx=seat.bandY-dy;
  assert(Math.abs(seat.bandY-headY)<=2, dir+' '+key+' band bottom is the seated head row');
  assert(top>=0 && Math.abs(bandPx-top)<=4,
    dir+' '+key+' band bottom within a few px of the alpha head top (band '+bandPx.toFixed(1)+' head '+top+')');
  if(flip){
    const unflipped=ctx.wornCrownSeat(W, H, dx, dy, false, head, 682/414);
    assert(Math.abs(seat.bandY-unflipped.bandY)<=1, dir+' '+key+' mirror keeps the band on the same row');
  }
}

Object.keys(DIRS).forEach(dir=>{
  DIRS[dir].forEach(key=>check(dir, key, FLIP[dir]));
});
['e','w','n','s','ne','nw','se','sw'].forEach(dir=>{
  SWING.forEach(key=>check(dir+'-swing', key, FLIP[dir]));
});

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nworn crown seat checks passed');

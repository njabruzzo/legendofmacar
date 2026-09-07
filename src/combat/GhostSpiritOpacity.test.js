'use strict';
/**
 * Ghost kin must read as paler / more solid spirits without the #204
 * solid↔flash: never punch mid-alpha to 255, never lighter-on-hit.
 * Run: node src/combat/GhostSpiritOpacity.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const {readRgba}=require('../qa/pngRgba');

const root=path.join(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const creatures=path.join(root,'assets/creatures');

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

assert(/const GHOST_DRAW_ALPHA=0\.96/.test(html), 'draw alpha is 0.96 (was 0.84)');
assert(!/e\.ghost && !e\.dead\) g\.globalAlpha=0\.84/.test(html),
  'old half-transparent 0.84 multiply is gone');
assert(/e\.ghost && !e\.dead\) g\.globalAlpha=GHOST_DRAW_ALPHA/.test(html),
  'drawEnt uses the named ghost draw alpha');
assert(/const GHOST_ALPHA_CAP=228/.test(html) && /const GHOST_ALPHA_LIFT=1\.52/.test(html),
  'lift remaps mid-alpha toward ~228, never 255');
assert(/function liftGhostAlpha\(/.test(html) && /function liftGhostSpirit\(/.test(html),
  'pixel lift is a dedicated ghost pipe');
assert(/if\(e\.ghost\) return liftGhostSpirit\(img\)/.test(extractFn('solidDwarfSprite')),
  'party ghosts bake through liftGhostSpirit');
assert(/const punch=!e\.ghost/.test(html)
  && /blitFacing\(g,img,dx,dy,W,H,flip,party,punch\)/.test(html),
  'west flip still skips the living a=255 punch');
assert(/punch!==false/.test(extractFn('flippedSprite'))
  && /Ghost sheets[\s\S]*solid/.test(extractFn('flippedSprite')),
  'flippedSprite documents why ghosts must not punch to opaque');
assert(/Mid-alpha ghost \+ lighter/.test(html)
  && /g\.globalCompositeOperation='source-over'/.test(html)
  && /g\.globalAlpha=clamp\(e\.flash\*1\.2,0,0\.34\)/.test(html),
  'hit rim stays a soft source-over stroke');
assert(/g\.globalAlpha=clamp\(e\.flash\*1\.2,0,0\.34\)/.test(html)
  && /g\.globalAlpha=clamp\(e\.flash\*3,0,1\)/.test(html)
  && /g\.fillStyle='#ffb894'/.test(html),
  'ghost rim is flash*1.2; living foes keep the flash*3 fill');

const ctx={
  GHOST_ALPHA_LO:40,
  GHOST_ALPHA_CAP:228,
  GHOST_ALPHA_LIFT:1.52,
  GHOST_WHITE_LIFT:0.48
};
vm.createContext(ctx);
vm.runInContext(
  'const GHOST_ALPHA_LO=40,GHOST_ALPHA_CAP=228,GHOST_ALPHA_LIFT=1.52,GHOST_WHITE_LIFT=0.48;'
  +extractFn('liftGhostAlpha'),
  ctx
);

function liftCopy(rgba){
  const d=new Uint8ClampedArray(rgba);
  ctx.liftGhostAlpha(d);
  return d;
}

const mid140=new Uint8ClampedArray([90,80,70,140]);
const out140=liftCopy(mid140);
assert(out140[3]===213 && out140[3]<255 && out140[3]<=228,
  'walk/atk stamp a=140 lifts to 213 (still mid-alpha)');
assert(out140[0]>90 && out140[1]>80 && out140[2]>70,
  'dark mid-alpha RGB lifts toward white');
assert(out140[0]<255 && out140[1]<255 && out140[2]<255,
  'white lift does not blow the silhouette to paper-white');

const mid150=new Uint8ClampedArray([100,88,82,150]);
const out150=liftCopy(mid150);
assert(out150[3]===228 && out150[3]!==255,
  'idle stamp a=150 lifts to CAP 228, not opaque 255');

const already=new Uint8ClampedArray([200,200,200,255]);
const out255=liftCopy(already);
assert(out255[3]===228, 'a source a=255 is capped — west flip cannot go solid');

const fringe=new Uint8ClampedArray([40,30,20,30, 10,10,10,40]);
const outFringe=liftCopy(fringe);
assert(outFringe[3]===0 && outFringe[7]===0, 'a<=40 fringe is cleared (not lifted)');

const oldEff=150*0.84/255;
const newEff=228*0.96/255;
assert(newEff>0.82 && newEff<0.90 && newEff>oldEff*1.6,
  'readable opacity is ~0.86 vs the old ~0.49 multiply');

['dwarf_pordoom_ghost.png','dwarf_fendur_ghost.png',
 'dwarf_orbo_ghost.png','dwarf_talpor_ghost.png'].forEach(f=>{
  const {data}=readRgba(path.join(creatures,f));
  let mid=0, n=0, sum=0, a255=0;
  for(let i=3;i<data.length;i+=4){
    const a=data[i];
    if(a===0) continue;
    n++; sum+=a;
    if(a===255) a255++;
    else mid++;
  }
  const mean=n?sum/n:0;
  assert(a255===0 && mid===n && mean>130 && mean<160,
    f+' is a flat mid-alpha stamp (mean '+mean.toFixed(1)+', a255='+a255+')');
});
['dwarf_pordoom_ghost_w1.png','dwarf_orbo_ghost_atk.png'].forEach(f=>{
  const {data}=readRgba(path.join(creatures,f));
  let n=0, sum=0, a255=0;
  for(let i=3;i<data.length;i+=4){
    const a=data[i];
    if(a===0) continue;
    n++; sum+=a;
    if(a===255) a255++;
  }
  const mean=n?sum/n:0;
  assert(a255===0 && mean>130 && mean<150,
    f+' walk/atk stamp stays mid-alpha (mean '+mean.toFixed(1)+') — lift, do not punch');
});

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nghost spirit opacity checks passed');

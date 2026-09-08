'use strict';
/**
 * Ghost kin must read as Limner α168 cool spirits — no chalk-white remesh,
 * never punch mid-alpha to 255, never lighter-on-hit.
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

assert(/const GHOST_DRAW_ALPHA=1;/.test(html), 'draw alpha is 1 — baked α168 is the spirit');
assert(!/e\.ghost && !e\.dead\) g\.globalAlpha=0\.84/.test(html),
  'old half-transparent 0.84 multiply is gone');
assert(!/const GHOST_DRAW_ALPHA=0\.96/.test(html)
  && !/const GHOST_WHITE_LIFT=0\.48/.test(html)
  && !/const GHOST_WHITE_LIFT=0\.06/.test(html),
  'chalk-white 0.96/0.48 and 0.06 washes are gone');
assert(/e\.ghost && !e\.dead\) g\.globalAlpha=GHOST_DRAW_ALPHA/.test(html),
  'drawEnt uses the named ghost draw alpha');
assert(/const GHOST_ALPHA_CAP=200/.test(html) && /const GHOST_ALPHA_LIFT=1;/.test(html)
  && /const GHOST_WHITE_LIFT=0;/.test(html) && /const GHOST_COOL_LIFT=0;/.test(html),
  'lift passes Limner α168 through — CAP 200, no white/cool remesh');
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
  GHOST_ALPHA_CAP:200,
  GHOST_ALPHA_LIFT:1,
  GHOST_WHITE_LIFT:0,
  GHOST_COOL_LIFT:0
};
vm.createContext(ctx);
vm.runInContext(
  'const GHOST_ALPHA_LO=40,GHOST_ALPHA_CAP=200,GHOST_ALPHA_LIFT=1,'
  +'GHOST_WHITE_LIFT=0,GHOST_COOL_LIFT=0;'
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
assert(out140[3]===140 && out140[3]<255 && out140[3]<=200,
  'mid-alpha a=140 is passed through (still mid-alpha)');
assert(out140[0]===90 && out140[1]===80 && out140[2]===70,
  'signed RGB is not remeshed — Limner cool stays');

const mid168=new Uint8ClampedArray([82,78,89,168]);
const out168=liftCopy(mid168);
assert(out168[3]===168 && out168[0]===82 && out168[1]===78 && out168[2]===89,
  'α168 cool spirit is not bleached or inflated');

const chalk=new Uint8ClampedArray([220,220,220,168]);
const outChalk=liftCopy(chalk);
assert(outChalk[0]===220 && outChalk[1]===220 && outChalk[2]===220 && outChalk[3]===168,
  'a near-white dither pixel is not washed further toward paper');

const denser=new Uint8ClampedArray([110,96,88,195]);
const out195=liftCopy(denser);
assert(out195[3]===195 && out195[3]!==255,
  'a leftover denser stamp stays mid-alpha, not opaque 255');

const already=new Uint8ClampedArray([200,200,200,255]);
const out255=liftCopy(already);
assert(out255[3]===200, 'a source a=255 is capped — west flip cannot go solid');

const fringe=new Uint8ClampedArray([40,30,20,30, 10,10,10,40]);
const outFringe=liftCopy(fringe);
assert(outFringe[3]===0 && outFringe[7]===0, 'a<=40 fringe is cleared (not lifted)');

const oldChalk=228*0.96/255;
const newEff=168*1/255;
assert(newEff>0.60 && newEff<0.72 && newEff<oldChalk,
  'readable opacity is baked α168 (~0.66) vs the chalk ~0.86 multiply');

const BIND=['','_w1','_w2','_atk','_atk_recover'];
const KIN=['pordoom','fendur','orbo','talpor'];
KIN.forEach(k=>{
  BIND.forEach(suf=>{
    const f='dwarf_'+k+'_ghost'+(suf||'')+'.png';
    const {data}=readRgba(path.join(creatures,f));
    let n=0, sum=0, a255=0;
    for(let i=3;i<data.length;i+=4){
      const a=data[i];
      if(a===0) continue;
      n++; sum+=a;
      if(a===255) a255++;
    }
    const mean=n?sum/n:0;
    assert(a255===0 && mean>160 && mean<176,
      f+' is a signed α168 cool stamp (mean '+mean.toFixed(1)+', a255='+a255+')');
  });
});

const crypto=require('crypto');
const IDLE_SHA={
  'dwarf_fendur_ghost.png':'1c6f22bd',
  'dwarf_orbo_ghost.png':'2056057d',
  'dwarf_pordoom_ghost.png':'84878c34',
  'dwarf_talpor_ghost.png':'24e13ec6'
};
Object.keys(IDLE_SHA).forEach(f=>{
  const buf=fs.readFileSync(path.join(creatures,f));
  const sha=crypto.createHash('sha256').update(buf).digest('hex');
  assert(sha.indexOf(IDLE_SHA[f])===0, f+' idle sha is Limner SIGNED '+IDLE_SHA[f]);
});

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nghost spirit opacity checks passed');

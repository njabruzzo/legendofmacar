'use strict';
/**
 * Ghost atk lifts from the signed α168 gray-blue stamp to spectral white.
 * Nick-GOOD idle and front walk w1/w2 are already icy blue-white and are not lifted.
 * Cool, not warm dust. Shade stays so the kit does not flatten to chalk.
 * A thin cool line traces the silhouette and the main luminance ridge
 * (face, beard, helm, weapon) without punching the spirit opaque.
 * Never punch mid-alpha to 255, never lighter-on-hit.
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

assert(/const GHOST_DRAW_ALPHA=1;/.test(html), 'draw alpha is 1 — no second multiply on the spirit');
assert(!/e\.ghost && !e\.dead\) g\.globalAlpha=0\.84/.test(html),
  'old half-transparent 0.84 multiply is gone');
assert(!/const GHOST_DRAW_ALPHA=0\.96/.test(html)
  && !/const GHOST_WHITE_LIFT=0\.48/.test(html)
  && !/const GHOST_WHITE_LIFT=0\.06/.test(html)
  && !/const GHOST_WHITE_LIFT=0;/.test(html),
  'chalk-white 0.96/0.48/0.06 washes and the zero white-lift are gone');
assert(/e\.ghost && !e\.dead\) g\.globalAlpha=GHOST_DRAW_ALPHA/.test(html),
  'drawEnt uses the named ghost draw alpha');
assert(/const GHOST_ALPHA_CAP=224/.test(html) && /const GHOST_ALPHA_LIFT=1\.28;/.test(html)
  && /const GHOST_WHITE_LIFT=0\.76;/.test(html) && /const GHOST_COOL_LIFT=0\.40;/.test(html)
  && /const GHOST_SHADE_KEEP=0\.62;/.test(html),
  'lift is spectral white — cool mix, shade kept, cap under 255');
assert(/function liftGhostAlpha\(/.test(html) && /function liftGhostSpirit\(/.test(html)
  && /function inkGhostFeatureEdges\(/.test(html),
  'pixel lift is a dedicated ghost pipe with a feature-edge pass');
assert(/inkGhostFeatureEdges\(id\.data, src/.test(extractFn('liftGhostSpirit')),
  'liftGhostSpirit inks key-feature edges after the white lift');
assert(/nickSpectralGhostSheet\(img\)\) return img/.test(extractFn('solidDwarfSprite'))
  && /return liftGhostSpirit\(img\)/.test(extractFn('solidDwarfSprite')),
  'Nick spectral idle and front walk blit as painted; atk/back still lift');
assert(/pordoom_ghost_w1/.test(extractFn('nickSpectralGhostSheet'))
  && /img===SPR\.pordoom_ghost\|\|img===SPR\.fendur_ghost\|\|img===SPR\.orbo_ghost/.test(extractFn('nickSpectralGhostSheet'))
  && !/SPR\.talpor_ghost/.test(extractFn('nickSpectralGhostSheet'))
  && /assets\/creatures\/dwarf_talpor_ghost\.png/.test(extractFn('nickSpectralGhostSheet')),
  'Talpor is off the painted skip list so the spectral lift runs; drop-in file is named');
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

const ctx={};
vm.createContext(ctx);
vm.runInContext(
  'const GHOST_ALPHA_LO=40,GHOST_ALPHA_CAP=224,GHOST_ALPHA_LIFT=1.28,'
  +'GHOST_WHITE_LIFT=0.76,GHOST_COOL_LIFT=0.40,'
  +'GHOST_SHADE_KEEP=0.62,GHOST_SHADE_PIVOT=82,'
  +'GHOST_EDGE_BLUR=10,GHOST_EDGE_CUT=0.50,'
  +'GHOST_SIL_BLUR=6,GHOST_SIL_CUT=0.45,GHOST_EDGE_DILATE=1;'
  +extractFn('liftGhostAlpha')
  +extractFn('ghostBoxBlur')
  +extractFn('inkGhostFeatureEdges'),
  ctx
);

function liftCopy(rgba){
  const d=new Uint8ClampedArray(rgba);
  ctx.liftGhostAlpha(d);
  return d;
}

const mid140=new Uint8ClampedArray([90,80,70,140]);
const out140=liftCopy(mid140);
assert(out140[3]>140 && out140[3]<224 && out140[3]!==255,
  'a=140 rises but stays translucent (got a='+out140[3]+')');
assert(out140[0]>180 && out140[2]>out140[0],
  'a gray-brown pixel becomes cool white, not warm dust');

const mid168=new Uint8ClampedArray([82,78,89,168]);
const out168=liftCopy(mid168);
assert(out168[3]===215 && out168[3]<255,
  'α168 lifts to 215 and does not punch opaque');
assert(out168[0]>=210 && out168[1]>=210 && out168[2]>=210 && out168[2]>=out168[0],
  'α168 gray-blue becomes spectral white (got '+out168[0]+','+out168[1]+','+out168[2]+')');

const shadow=new Uint8ClampedArray([49,40,59,168]);
const outShadow=liftCopy(shadow);
const hi=new Uint8ClampedArray([161,152,196,168]);
const outHi=liftCopy(hi);
const yOf=px=>px[0]*0.3+px[1]*0.59+px[2]*0.11;
assert(yOf(outHi)-yOf(outShadow)>18,
  'kit folds survive — highlight stays lighter than shadow');
assert(yOf(outShadow)>170,
  'even the shadow fold is white, not gray dust');

const warm=new Uint8ClampedArray([120,90,60,168]);
const outWarm=liftCopy(warm);
assert(outWarm[0]>210 && outWarm[1]>210 && outWarm[2]>210
  && (outWarm[0]-outWarm[2])<16,
  'a warm dust pixel is lifted into white (got '+outWarm[0]+','+outWarm[1]+','+outWarm[2]+')');

const chalk=new Uint8ClampedArray([220,220,220,168]);
const outChalk=liftCopy(chalk);
assert(outChalk[0]>=230 && outChalk[1]>=230 && outChalk[2]>=230 && outChalk[3]<255,
  'a near-white dither pixel stays white and translucent');

const denser=new Uint8ClampedArray([110,96,88,195]);
const out195=liftCopy(denser);
assert(out195[3]===224 && out195[3]!==255,
  'a denser stamp caps under opaque 255');

const already=new Uint8ClampedArray([200,200,200,255]);
const out255=liftCopy(already);
assert(out255[3]===224, 'a source a=255 is capped — west flip cannot go solid');

const fringe=new Uint8ClampedArray([40,30,20,30, 10,10,10,40]);
const outFringe=liftCopy(fringe);
assert(outFringe[3]===0 && outFringe[7]===0, 'a<=40 fringe is cleared (not lifted)');

/* A dark half beside a light half: the ridge between them is a thin cool
   line. The middle of each half stays spectral fill, and alpha stays capped. */
{
  const W=64, H=64;
  const src=new Uint8ClampedArray(W*H*4);
  for(let y=8;y<56;y++) for(let x=8;x<56;x++){
    const p=(y*W+x)*4;
    const light=x>=32;
    src[p]=light?150:48; src[p+1]=light?140:42; src[p+2]=light?170:60; src[p+3]=168;
  }
  const dst=new Uint8ClampedArray(src);
  ctx.liftGhostAlpha(dst);
  const fill=dst.slice();
  ctx.inkGhostFeatureEdges(dst, src, W, H);
  const at=(x,y)=>((y*W+x)*4);
  const lum=p=>(dst[p]*30+dst[p+1]*59+dst[p+2]*11)/100;
  const interior=at(18,32);
  assert(dst[interior]===fill[interior] && dst[interior+3]===fill[interior+3] && dst[interior+3]<255,
    'the middle of a flat fold is untouched spectral fill');
  let ridge=0, ink=0, opaque=0, cool=0, darker=0, a255=0;
  for(let y=1;y<H-1;y++) for(let x=1;x<W-1;x++){
    const p=at(x,y);
    if(dst[p+3]===0) continue;
    opaque++;
    if(dst[p+3]===255) a255++;
    const changed=dst[p]!==fill[p] || dst[p+1]!==fill[p+1] || dst[p+2]!==fill[p+2];
    if(!changed) continue;
    ink++;
    if(dst[p+2]>=dst[p]) cool++;
    if(lum(p)+12< (fill[p]*30+fill[p+1]*59+fill[p+2]*11)/100) darker++;
    if(x>=30 && x<=34) ridge++;
  }
  assert(a255===0, 'feature lines do not punch the spirit to opaque');
  assert(ridge>8, 'the light/dark ridge is outlined (got '+ridge+' px)');
  assert(ink>ridge && ink<opaque*0.45,
    'the line is thin — ink is '+ink+' of '+opaque+' opaque px');
  assert(cool===ink && darker>ink*0.8,
    'every feature line is cooler and darker than the white fill');
}

{
  const {w,h,data}=readRgba(path.join(creatures,'dwarf_pordoom_ghost_atk.png'));
  const src=new Uint8ClampedArray(data);
  const dst=new Uint8ClampedArray(data);
  ctx.liftGhostAlpha(dst);
  const fill=dst.slice();
  ctx.inkGhostFeatureEdges(dst, src, w, h);
  let opaque=0, ink=0, cool=0, a255=0, yFill=0, yInk=0;
  for(let i=0,p=0;i<w*h;i++,p+=4){
    if(dst[p+3]===0) continue;
    opaque++;
    if(dst[p+3]===255) a255++;
    const changed=dst[p]!==fill[p] || dst[p+1]!==fill[p+1] || dst[p+2]!==fill[p+2];
    if(!changed){ yFill+=fill[p]*0.3+fill[p+1]*0.59+fill[p+2]*0.11; continue; }
    ink++;
    yInk+=dst[p]*0.3+dst[p+1]*0.59+dst[p+2]*0.11;
    if(dst[p+2]>=dst[p]) cool++;
  }
  const frac=ink/opaque;
  assert(a255===0 && frac>0.04 && frac<0.32,
    'pordoom ghost atk lines cover the figure thinly (frac '+(frac*100).toFixed(1)+'%)');
  assert(cool===ink && (yInk/ink)+14<(yFill/(opaque-ink)),
    'pordoom atk feature lines read darker and cool against the spectral fill');
}

const oldChalk=228*0.96/255;
const newEff=215/255;
assert(newEff>0.80 && newEff<oldChalk,
  'spirit alpha sits above baked α168 and under the old chalk multiply');

const STAMP=['_atk','_atk_recover'];
const KIN=['pordoom','fendur','orbo','talpor'];
KIN.forEach(k=>{
  STAMP.forEach(suf=>{
    const f='dwarf_'+k+'_ghost'+suf+'.png';
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
  'dwarf_fendur_ghost.png':'efbc2623',
  'dwarf_orbo_ghost.png':'a077fef6',
  'dwarf_pordoom_ghost.png':'6ef58ed6',
  'dwarf_talpor_ghost.png':'c73fa0ad'
};
const IDLE_DIM={
  'dwarf_fendur_ghost.png':[470,512],
  'dwarf_orbo_ghost.png':[480,512],
  'dwarf_pordoom_ghost.png':[470,512],
  'dwarf_talpor_ghost.png':[674,512]
};
const WALK_SHA={
  'dwarf_fendur_ghost_w1.png':'4e7b7e25',
  'dwarf_fendur_ghost_w2.png':'74fee963',
  'dwarf_orbo_ghost_w1.png':'2a5d1c8b',
  'dwarf_orbo_ghost_w2.png':'db0716ea',
  'dwarf_pordoom_ghost_w1.png':'e66b2a10',
  'dwarf_pordoom_ghost_w2.png':'a243e040',
  'dwarf_talpor_ghost_w1.png':'20180a39',
  'dwarf_talpor_ghost_w2.png':'a901092a'
};
const WALK_DIM={
  'dwarf_fendur_ghost_w1.png':[593,512],
  'dwarf_fendur_ghost_w2.png':[527,512],
  'dwarf_orbo_ghost_w1.png':[480,512],
  'dwarf_orbo_ghost_w2.png':[480,512],
  'dwarf_pordoom_ghost_w1.png':[470,512],
  'dwarf_pordoom_ghost_w2.png':[692,512],
  'dwarf_talpor_ghost_w1.png':[589,512],
  'dwarf_talpor_ghost_w2.png':[504,512]
};
Object.keys(IDLE_SHA).forEach(f=>{
  const full=path.join(creatures,f);
  const buf=fs.readFileSync(full);
  const sha=crypto.createHash('sha256').update(buf).digest('hex');
  assert(sha.indexOf(IDLE_SHA[f])===0, f+' idle sha is Nick-GOOD spectral '+IDLE_SHA[f]);
  const {w,h,data}=readRgba(full);
  assert(w===IDLE_DIM[f][0] && h===IDLE_DIM[f][1], f+' keeps Nick canvas '+w+'x'+h);
  let clear=0, n=0, cool=0;
  for(let i=0;i<data.length;i+=4){
    const a=data[i+3];
    if(a===0){ clear++; continue; }
    if(a<=40) continue;
    n++;
    if(data[i+2]>data[i]) cool++;
  }
  assert(clear>8000 && n>1000 && cool/n>0.85,
    f+' keeps alpha and icy blue paint (clear '+clear+', cool '+((cool/n)*100).toFixed(1)+'%)');
});
Object.keys(WALK_SHA).forEach(f=>{
  const full=path.join(creatures,f);
  const buf=fs.readFileSync(full);
  const sha=crypto.createHash('sha256').update(buf).digest('hex');
  assert(sha.indexOf(WALK_SHA[f])===0, f+' walk sha is Nick-GOOD spectral '+WALK_SHA[f]);
  const {w,h,data}=readRgba(full);
  assert(w===WALK_DIM[f][0] && h===WALK_DIM[f][1], f+' keeps Nick canvas '+w+'x'+h);
  let clear=0, n=0, cool=0, a255=0;
  for(let i=0;i<data.length;i+=4){
    const a=data[i+3];
    if(a===0){ clear++; continue; }
    if(a===255) a255++;
    if(a<=40) continue;
    n++;
    if(data[i+2]>data[i]) cool++;
  }
  assert(clear>8000 && n>1000 && a255>1000 && cool/n>0.85,
    f+' is icy spectral walk, not an α168 stamp (clear '+clear+', a255 '+a255+', cool '+((cool/n)*100).toFixed(1)+'%)');
});

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nghost spirit opacity checks passed');

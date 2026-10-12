'use strict';
/**
 * Red dragon PAINT v1c bind: 41 keys on disk at the locked v4k canvas,
 * rig ground point anchor, 4-frame walks, downscale-only scale, no gold.
 * Run: node src/combat/RedDragon8Dir.test.js
 */
const fs=require('fs');
const path=require('path');
const {readRgba}=require('../qa/pngRgba');
const M=require('./Monster8Dir');

const root=path.join(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
let failed=0;
function assert(c,m){ if(!c){failed++;console.error('FAIL  '+m);} else console.log('ok    '+m); }

const p=M.plan('reddragon');
assert(!!p && M.bound('reddragon'), 'reddragon plan is bound');
assert(p.canvasW===798 && p.canvasH===496, 'canvas is the v4k 798x496');
assert(p.footX===399 && p.baselineRow===387, 'anchor is the v4k rig ground point (399, 387)');
assert(!p.paintedLeft && !p.legShift && !p.magentaCleanup, 'painted right, no leg shift, no magenta punch');
['s','se','e','ne','back'].forEach(v=>assert(p.walkFrames[v]===4, v+' walk is 4 frames'));
assert(M.walkPoses(4).join()==='w1,pass_a,w2,pass_b', '4-frame walk order');

const keys=M.keys('reddragon');
assert(keys.length===41, '41 keys (5 facings x 8 + dead), got '+keys.length);
const files=M.register({});
let canvasOk=true, alphaOk=true, goldPx=0, below=0, missing=[];
keys.forEach(k=>{
  const rel=files[k];
  const abs=path.join(root,rel);
  if(!fs.existsSync(abs)){ missing.push(rel); return; }
  const im=readRgba(abs);
  if(im.w!==798||im.h!==496) canvasOk=false;
  const d=im.data;
  let low=-1;
  for(let i=0;i<d.length;i+=4){
    const a=d[i+3];
    if(a!==0&&a!==255) alphaOk=false;
    if(!a) continue;
    const y=Math.floor((i/4)/im.w); if(y>low) low=y;
    const r=d[i],g=d[i+1],b=d[i+2];
    // Gold: bright yellow, R and G both high, B well below.
    if(r>170&&g>140&&b<90&&Math.abs(r-g)<70) goldPx++;
  }
  if(!/_dead$/.test(k) && low<387) below++;
});
assert(!missing.length, 'every key file is on disk '+missing.slice(0,3).join(','));
assert(canvasOk, 'every key is 798x496');
assert(alphaOk, 'alpha is binary {0,255}');
assert(goldPx===0, 'no gold px (found '+goldPx+')');
assert(below===0, 'every living key reaches the ground row 387');
const manifest=fs.readFileSync(path.join(root,'src/assets/asset-manifest.js'),'utf8');
assert(keys.every(k=>manifest.includes('"'+files[k]+'"')), 'manifest lists every red dragon key');

// Downscale only: boss base 128 x scale x ZOOM must never exceed the canvas.
const drawH=z=>128*z*p.scale;
assert(drawH(1.38)<=496 && drawH(1.38)>=495, 'laptop ZOOM 1.38 draws 496 px = 1:1 ('+drawH(1.38).toFixed(2)+')');
assert(drawH(0.78)<496, 'phone ZOOM 0.78 downscales ('+drawH(0.78).toFixed(1)+')');
const zMax=/ZOOM = clamp\(Math\.min\(VW,VH\*1\.5\)\/780, 0\.78, 1\.38\)/.test(html);
assert(zMax, 'ZOOM is still clamped at 1.38, so no upscale');
const a=M.anchor(p);
assert(Math.abs(a.footX-0.5)<1e-9 && Math.abs(a.baselineFrac-388/496)<1e-9, 'anchor fractions');

// Selection: dead, idle, walk, attack, mirrored west.
const e={sprite:'reddragon',moving:true,gait:0.3,atk:0};
assert(M.select('reddragon',e,'e')==='reddragon_e_pass_a', 'walk gait 0.3 -> pass_a');
assert(M.select('reddragon',e,'w')==='reddragon_e_pass_a' && M.flips('w'), 'w uses e mirrored');
assert(M.select('reddragon',{sprite:'reddragon',moving:false},'n')==='reddragon_back_idle', 'n idle -> back');
assert(M.select('reddragon',{sprite:'reddragon',atk:0.1,atkMax:0.42},'se')==='reddragon_se_atk_recover', 'late attack -> recover');
assert(M.select('reddragon',{sprite:'reddragon',dead:true},'s')==='reddragon_dead', 'dead');
// Thin One plan unchanged.
const t=M.plan('thinone');
assert(t.scale===2.065 && t.baselineRow===399 && t.canvasW===512, 'thinone plan unchanged');

if(failed){ console.error(failed+' failed'); process.exit(1); }
console.log('all red dragon bind checks passed');

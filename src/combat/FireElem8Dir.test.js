'use strict';
/**
 * Fire elemental PAINT v3b bind: 36 keys at the v6 canvas, ground-row anchor,
 * 4-frame walks, 2-key attack, downscale-only scale, engine bob off.
 * Run: node src/combat/FireElem8Dir.test.js
 */
const fs=require('fs');
const path=require('path');
const {readRgba}=require('../qa/pngRgba');
const M=require('./Monster8Dir');

const root=path.join(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
let failed=0;
function assert(c,m){ if(!c){failed++;console.error('FAIL  '+m);} else console.log('ok    '+m); }

const p=M.plan('fireelem');
assert(!!p && M.bound('fireelem'), 'fireelem plan is bound');
assert(p.canvasW===472 && p.canvasH===617, 'canvas is the v6 472x617');
assert(p.footX===236 && p.baselineRow===600, 'anchor is ground row 600 at centre x 236');
assert(!p.paintedLeft && !p.legShift && !p.magentaCleanup, 'painted right, no leg shift, no magenta punch');
['s','se','e','ne','back'].forEach(v=>assert(p.walkFrames[v]===4, v+' walk is 4 frames'));
assert(p.attack===2, 'attack is 2 keys');

const keys=M.keys('fireelem');
assert(keys.length===36, '36 keys (5 facings x 7 + dead), got '+keys.length);
assert(!keys.some(k=>/atk_recover/.test(k)), 'no atk_recover key is requested');
const files=M.register({});
let canvasOk=true, alphaOk=true, groundOk=true, missing=[];
keys.forEach(k=>{
  const abs=path.join(root,files[k]);
  if(!fs.existsSync(abs)){ missing.push(files[k]); return; }
  const im=readRgba(abs);
  if(im.w!==472||im.h!==617) canvasOk=false;
  let low=-1;
  for(let i=3;i<im.data.length;i+=4){
    const a=im.data[i];
    if(a!==0&&a!==255) alphaOk=false;
    if(a){ const y=Math.floor((i>>2)/im.w); if(y>low) low=y; }
  }
  if(/_idle$/.test(k) && low!==600) groundOk=false;
});
assert(!missing.length, 'every key file is on disk '+missing.slice(0,3).join(','));
assert(canvasOk, 'every key is 472x617');
assert(alphaOk, 'alpha is binary {0,255}');
assert(groundOk, 'every idle key sits on row 600');
const manifest=fs.readFileSync(path.join(root,'src/assets/asset-manifest.js'),'utf8');
assert(keys.every(k=>manifest.includes('"'+files[k]+'"')), 'manifest lists every fire elemental key');

// Downscale only. Not in an entSpriteH kind list, so base 70.
const drawH=z=>70*z*p.scale;
const lap=drawH(1.38), phn=drawH(0.78);
assert(Math.abs(lap/617-0.48834)<0.0005, 'laptop px per src = 0.48834 ('+(lap/617).toFixed(5)+', '+lap.toFixed(1)+' px)');
assert(Math.abs(phn/617-0.27642)<0.0005, 'phone px per src ~ 0.27642 ('+(phn/617).toFixed(5)+')');
assert(lap<617 && phn<617, 'never upscaled at either ZOOM bound');
assert(/ZOOM = clamp\(Math\.min\(VW,VH\*1\.5\)\/780, 0\.78, 1\.38\)/.test(html), 'ZOOM is still clamped at 1.38');
assert(!/fireelem/.test(html.slice(html.indexOf('function entSpriteH('), html.indexOf('function propSpriteKey('))), 'entSpriteH has no fireelem case (base 70)');
assert(!/FOE\.fireelem|kind:'fireelem'/.test(html), 'no spawn added');

// Bob off for this plan; other plans keep the engine bob.
assert(M.bob(0.3,4,1.38,p)===0 && M.bob(0.8,4,1.38,p)===0, 'fireelem engine bob is 0');
assert(M.bob(0.3,4,1.38,M.plan('thinone'))>0, 'thinone keeps the engine bob');
assert(M.bob(0.3,4,1.38)>0, 'bob without a plan is unchanged');
assert(/Monster8Dir\.bob\(e\.gait, Monster8Dir\.walkCount\(eight, [^)]*\)\), z, eight\)/.test(html), 'draw passes the plan to bob');

// Selection.
assert(M.select('fireelem',{sprite:'fireelem',moving:true,gait:0.3},'e')==='fireelem_e_pass_a', 'walk gait 0.3 -> pass_a');
assert(M.select('fireelem',{sprite:'fireelem',atk:0.4,atkMax:0.42},'se')==='fireelem_se_atk', 'windup -> atk');
assert(M.select('fireelem',{sprite:'fireelem',atk:0.2,atkMax:0.42},'se')==='fireelem_se_atk_contact', 'contact');
assert(M.select('fireelem',{sprite:'fireelem',atk:0.05,atkMax:0.42},'se')==='fireelem_se_atk', 'recover beat reuses atk');
assert(M.select('thinone',{sprite:'thinone',atk:0.05,atkMax:0.42},'se')==='thinone_se_atk_recover', 'thinone keeps atk_recover');
assert(M.select('fireelem',{sprite:'fireelem',moving:false},'nw')==='fireelem_ne_idle' && M.flips('nw'), 'nw uses ne mirrored');
assert(M.select('fireelem',{sprite:'fireelem',dead:true},'s')==='fireelem_dead', 'dead');
const t=M.plan('thinone');
assert(t.scale===2.065 && t.baselineRow===399 && t.canvasW===512, 'thinone plan unchanged');

if(failed){ console.error(failed+' failed'); process.exit(1); }
console.log('all fire elemental bind checks passed');

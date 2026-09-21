'use strict';
/**
 * Quilt34 maul / cleaver walk must plant at idle scale so the shaft cannot
 * shrink on w1/w2. Code lock — do not invent new painted art.
 * Run: node src/combat/MacarWeaponLock.test.js
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

assert(/function livingMacarPlantFit\(/.test(html), 'livingMacarPlantFit exists');
assert(/ignoreGapUntil/.test(extractFn('spriteBounds'))
  && /\*0\.42\)/.test(extractFn('spriteBounds')),
  'spread-stance crown walk ignores the inter-boot gap so the helmet is the crown');
const plantSrc=extractFn('livingMacarPlantFit');
assert(/return heroFigureFit\(e, idle\)/.test(plantSrc)
  && !/frameH\/idleH/.test(plantSrc)
  && !/idleH\/frameH/.test(plantSrc),
  'dest H is the equipped idle plant — a 540 canvas cannot scale blitH');
assert(/function bootPlantFrac\(/.test(html) && /bootCx:bootCx/.test(html),
  'spriteBounds records a boot cluster separate from the maul-averaged foot');
assert(/function livingMacarPlantX\(/.test(html)
  && /livingMacarPlantX\(footCx, bootCx, idleFoot\)/.test(extractFn('drawLivingMacar')),
  'living blit picks the foot sample closer to the idle plant');
assert(/livingMacarPlantFit\(e, blitKey\|\|key, img\)/.test(extractFn('drawLivingMacar')),
  'after-grain blit uses the plant lock, not the bake-canvas frameFit');
assert(/liveKey\?livingMacarPlantFit\(e,liveKey,img\):frameFit\(e,img\)/.test(html),
  'billboard safety net uses the same plant lock');
assert(/\*MACAR_FOOT_WIDEN;/.test(extractFn('drawLivingMacar'))
  && !/strike\?1\.16:1/.test(extractFn('drawLivingMacar')),
  'strike width is sheet aspect + foot widen, not a 1.16 body fatten');

function sheetBounds(file){
  const {w,h,data}=readRgba(path.join(creatures,file));
  let lo=w, hi=-1, top=h, bot=-1;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    const p=(y*w+x)*4;
    if(data[p+3]<=30 || (data[p]|data[p+1]|data[p+2])===0) continue;
    if(x<lo) lo=x; if(x>hi) hi=x; if(y<top) top=y; if(y>bot) bot=y;
  }
  const cut=top+Math.floor((bot-top+1)*0.82);
  let footX=0, footN=0;
  for(let y=cut;y<=bot;y++) for(let x=lo;x<=hi;x++){
    const p=(y*w+x)*4;
    if(data[p+3]<=30 || (data[p]|data[p+1]|data[p+2])===0) continue;
    footX+=x; footN++;
  }
  const fcx=footN?Math.round(footX/footN):Math.round((lo+hi)/2);
  const half=Math.max(6, Math.round((hi-lo+1)*0.16));
  const ignoreGapUntil=top+Math.floor((bot-top+1)*0.42);
  let crown=bot, gaps=0;
  for(let y=bot;y>=top;y--){
    let hit=false;
    const x0=Math.max(0,fcx-half), x1=Math.min(w-1,fcx+half);
    for(let x=x0;x<=x1;x++){
      const p=(y*w+x)*4;
      if(data[p+3]>30 && (data[p]|data[p+1]|data[p+2])!==0){ hit=true; break; }
    }
    if(hit){ crown=y; gaps=0; }
    else { gaps++; if(gaps>2 && y<ignoreGapUntil) break; }
  }
  return {
    ok:true, w, h,
    y0:top/h, y1:(bot+1)/h, personY0:crown/h,
    boxH:bot-top+1
  };
}

const macarB=sheetBounds('dwarf_macar.png');
const w1B=sheetBounds('dwarf_macar_w1.png');
const w2B=sheetBounds('dwarf_macar_w2.png');
const axeB=sheetBounds('dwarf_macar_axe.png');
const axeW1B=sheetBounds('dwarf_macar_axe_w1.png');
const axeW2B=sheetBounds('dwarf_macar_axe_w2.png');

const SPR={
  macar:{width:macarB.w, height:macarB.h, _b:macarB},
  macar_w1:{width:w1B.w, height:w1B.h, _b:w1B},
  macar_w2:{width:w2B.w, height:w2B.h, _b:w2B},
  macar_axe:{width:axeB.w, height:axeB.h, _b:axeB},
  macar_axe_w1:{width:axeW1B.w, height:axeW1B.h, _b:axeW1B},
  macar_axe_w2:{width:axeW2B.w, height:axeW2B.h, _b:axeW2B}
};
const ctx={
  SPR,
  MACAR_IDLE_FRAC:0.986,
  clamp:(v,a,b)=>v<a?a:v>b?b:v,
  spriteBounds:(img)=>img&&img._b,
  livingMacarIdleKey(){
    if(ctx._xbow) return 'macar_xbow';
    return ctx._axe?'macar_axe':'macar';
  },
  frameFit(e,img){ return ctx.heroFigureFit(e,img); }
};
vm.createContext(ctx);
vm.runInContext('const MACAR_IDLE_FRAC=0.986;', ctx);
vm.runInContext(extractFn('figurePersonFrac')+extractFn('heroFigureFit')+extractFn('livingMacarPlantFit')
  +extractFn('bootPlantFrac')+extractFn('livingMacarPlantX'), ctx);

const mac={hero:1, dead:0, ghost:0};
ctx._axe=false;
const idleFit=ctx.livingMacarPlantFit(mac, 'macar', SPR.macar);
const w1Fit=ctx.livingMacarPlantFit(mac, 'macar_w1', SPR.macar_w1);
const w2Fit=ctx.livingMacarPlantFit(mac, 'macar_w2', SPR.macar_w2);
const unlockedW1=ctx.heroFigureFit(mac, SPR.macar_w1);

assert(Math.abs(w1Fit-idleFit)<1e-9 && Math.abs(w2Fit-idleFit)<1e-9,
  'maul w1/w2 plant at idle scale (lock '+idleFit.toFixed(3)+')');
assert(Math.abs(unlockedW1-idleFit)<0.06,
  'freearm v8 maul w1 unlocked plant stays near idle (unlocked '
  +unlockedW1.toFixed(3)+' vs idle '+idleFit.toFixed(3)+')');

const idleScreen=macarB.boxH*idleFit/macarB.h;
const w1Screen=w1B.boxH*w1Fit/w1B.h;
const w2Screen=w2B.boxH*w2Fit/w2B.h;
assert(Math.abs(w1Screen-idleScreen)/idleScreen<0.02
  && Math.abs(w2Screen-idleScreen)/idleScreen<0.02,
  'on-screen maul box height matches idle (idle '+idleScreen.toFixed(3)
  +', w1 '+w1Screen.toFixed(3)+', w2 '+w2Screen.toFixed(3)+')');

ctx._axe=true;
const axeFit=ctx.livingMacarPlantFit(mac, 'macar_axe', SPR.macar_axe);
const axeW1Fit=ctx.livingMacarPlantFit(mac, 'macar_axe_w1', SPR.macar_axe_w1);
const axeW2Fit=ctx.livingMacarPlantFit(mac, 'macar_axe_w2', SPR.macar_axe_w2);
assert(Math.abs(axeW1Fit-axeFit)<1e-9 && Math.abs(axeW2Fit-axeFit)<1e-9,
  'cleaver w1/w2 plant at axe-idle scale');
const unlockedAxeW1=ctx.heroFigureFit(mac, SPR.macar_axe_w1);
assert(Math.abs(unlockedAxeW1-axeFit)>0.02,
  'without the lock, cleaver w1 personY0 miss would shrink the shaft (unlocked '
  +unlockedAxeW1.toFixed(3)+' vs axe idle '+axeFit.toFixed(3)+')');
const axeScreen=axeB.boxH*axeFit/axeB.h;
const axeW1Screen=axeW1B.boxH*axeW1Fit/axeW1B.h;
assert(Math.abs(axeW1Screen-axeScreen)/axeScreen<0.02,
  'on-screen cleaver box height matches axe idle');

ctx._axe=false;
const windB=sheetBounds('dwarf_macar_atk.png');
const hitB=sheetBounds('dwarf_macar_atk_contact.png');
SPR.macar_atk={width:windB.w, height:windB.h, _b:windB};
SPR.macar_atk_contact={width:hitB.w, height:hitB.h, _b:hitB};
assert(windB.personY0<0.45,
  'windup crown is the helmet, not the boots (personY0='+windB.personY0.toFixed(3)+')');
assert(hitB.personY0<0.45,
  'contact crown is the helmet, not the boots (personY0='+hitB.personY0.toFixed(3)+')');

const windPlant=ctx.livingMacarPlantFit(mac, 'macar_atk', SPR.macar_atk);
const hitPlant=ctx.livingMacarPlantFit(mac, 'macar_atk_contact', SPR.macar_atk_contact);
const unlockedWind=ctx.heroFigureFit(mac, SPR.macar_atk);
const unlockedHit=ctx.heroFigureFit(mac, SPR.macar_atk_contact);
const entH=78;
function blitH(fit){ return entH*fit; }
const idleBlith=blitH(idleFit);
const w1Blith=blitH(w1Fit);
const w2Blith=blitH(w2Fit);
const windBlith=blitH(windPlant);
const hitBlith=blitH(hitPlant);
assert(Math.abs(windPlant-idleFit)<1e-9 && Math.abs(hitPlant-idleFit)<1e-9,
  'windup/contact plant is the idle plant, not frameH/idleH (idle '
  +idleFit.toFixed(3)+' wind '+windPlant.toFixed(3)+' hit '+hitPlant.toFixed(3)+')');
assert(Math.abs(w1Blith-idleBlith)/idleBlith<0.02
  && Math.abs(w2Blith-idleBlith)/idleBlith<0.02
  && Math.abs(windBlith-idleBlith)/idleBlith<0.02
  && Math.abs(hitBlith-idleBlith)/idleBlith<0.02,
  'idle/w1/w2/atk/contact blitH match (idle '+idleBlith.toFixed(3)
  +' w1 '+w1Blith.toFixed(3)+' w2 '+w2Blith.toFixed(3)
  +' wind '+windBlith.toFixed(3)+' hit '+hitBlith.toFixed(3)+')');
assert(windB.h>macarB.h && windBlith<=idleBlith+1e-6 && hitBlith<=idleBlith+1e-6,
  'frameH '+windB.h+' cannot increase blitH vs idle '+macarB.h
  +' (wind '+windBlith.toFixed(3)+' hit '+hitBlith.toFixed(3)
  +' idle '+idleBlith.toFixed(3)+')');
const grown=idleFit*(windB.h/macarB.h);
assert(blitH(grown)>idleBlith*1.04,
  'the old frameH/idleH ratio would have grown blitH (old '+blitH(grown).toFixed(3)
  +' vs locked '+idleBlith.toFixed(3)+')');
assert(Math.abs(unlockedWind-idleFit)>0.10,
  'without the lock, windup figure frac would change dest H (unlocked '
  +unlockedWind.toFixed(3)+' vs idle '+idleFit.toFixed(3)+')');
const idlePx=idleBlith/macarB.h;
const hitPx=hitBlith/hitB.h;
assert(hitPx<=idlePx+1e-9,
  'contact pixels are not enlarged (px '+hitPx.toFixed(5)+' vs idle '+idlePx.toFixed(5)+')');
const widthRatio=hitB.w/macarB.w;
assert(hitPx<idlePx*widthRatio*0.7,
  'contact body scale is not the 893 sheet width (px ratio '
  +(hitPx/idlePx).toFixed(3)+' vs width ratio '+widthRatio.toFixed(3)+')');
assert(windB.h!==macarB.h || hitB.w!==macarB.w,
  'strike canvases may differ; the lock is dest H, not 470×512');
assert(Math.abs((hitB.w/hitB.h)*hitPlant - (macarB.w/macarB.h)*idleFit)>0.20,
  'contact billboard may widen for maul overhang (aspect*fit idle '
  +((macarB.w/macarB.h)*idleFit).toFixed(3)+' hit '
  +((hitB.w/hitB.h)*hitPlant).toFixed(3)+')');

ctx._axe=true;
const axeIdleBlith=blitH(ctx.livingMacarPlantFit(mac, 'macar_axe', SPR.macar_axe));
const axeTall={width:axeB.w, height:540, _b:axeB};
const axeTallBlith=blitH(ctx.livingMacarPlantFit(mac, 'macar_axe_atk', axeTall));
assert(Math.abs(axeTallBlith-axeIdleBlith)/axeIdleBlith<0.02
  && axeTallBlith<=axeIdleBlith+1e-6,
  'axe strike blitH matches axe idle even when the sheet is 540 (axe '
  +axeIdleBlith.toFixed(3)+' strike '+axeTallBlith.toFixed(3)+')');
ctx._axe=false;

const xbowB=sheetBounds('dwarf_macar_xbow.png');
const xbowAtkB=sheetBounds('dwarf_macar_xbow_atk.png');
SPR.macar_xbow={width:xbowB.w, height:xbowB.h, _b:xbowB};
SPR.macar_xbow_atk={width:xbowAtkB.w, height:xbowAtkB.h, _b:xbowAtkB};
ctx._xbow=true;
const xbowIdleBlith=blitH(ctx.livingMacarPlantFit(mac, 'macar_xbow', SPR.macar_xbow));
const xbowAtkBlith=blitH(ctx.livingMacarPlantFit(mac, 'macar_xbow_atk', SPR.macar_xbow_atk));
const xbowTall={width:xbowAtkB.w, height:540, _b:xbowAtkB};
const xbowTallBlith=blitH(ctx.livingMacarPlantFit(mac, 'macar_xbow_atk', xbowTall));
assert(Math.abs(xbowAtkBlith-xbowIdleBlith)/xbowIdleBlith<0.02
  && Math.abs(xbowTallBlith-xbowIdleBlith)/xbowIdleBlith<0.02
  && xbowTallBlith<=xbowIdleBlith+1e-6,
  'xbow strike blitH matches xbow idle (idle '+xbowIdleBlith.toFixed(3)
  +' atk '+xbowAtkBlith.toFixed(3)+' tall '+xbowTallBlith.toFixed(3)+')');
ctx._xbow=false;

assert(Math.abs(ctx.livingMacarPlantX(0.346, 0.556, 0.497)-0.556)<1e-9,
  'contact prefers the boot cluster over the maul-averaged foot');
assert(Math.abs(ctx.livingMacarPlantX(0.555, 0.773, 0.497)-0.555)<1e-9,
  'windup keeps the plant that is already closer to idle');

function footHists(file){
  const {w,h,data}=readRgba(path.join(creatures,file));
  let top=h, bot=-1;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    const p=(y*w+x)*4;
    if(data[p+3]<=30 || (data[p]|data[p+1]|data[p+2])===0) continue;
    if(y<top) top=y; if(y>bot) bot=y;
  }
  const cut=top+Math.floor((bot-top+1)*0.82);
  const midY=top+Math.floor((bot-top+1)*0.55);
  const foot=new Array(w).fill(0), upper=new Array(w).fill(0);
  let footX=0, footN=0;
  for(let y=top;y<=bot;y++) for(let x=0;x<w;x++){
    const p=(y*w+x)*4;
    if(data[p+3]<=30 || (data[p]|data[p+1]|data[p+2])===0) continue;
    if(y>=cut){ foot[x]++; footX+=x; footN++; }
    if(y<=midY) upper[x]++;
  }
  const avg=footN?footX/footN/w:0.5;
  return {w, avg, boot:ctx.bootPlantFrac(foot, upper, w, avg)};
}
const contactFeet=footHists('dwarf_macar_atk_contact.png');
assert(contactFeet.avg<0.42 && contactFeet.boot>0.48 && contactFeet.boot<0.70,
  'contact boot cluster is the body, not the maul average (avg '
  +contactFeet.avg.toFixed(3)+' boot '+contactFeet.boot.toFixed(3)+')');
const idleFeet=footHists('dwarf_macar.png');
assert(Math.abs(ctx.livingMacarPlantX(contactFeet.avg, contactFeet.boot, idleFeet.avg)-contactFeet.boot)<1e-9,
  'contact plants on boots so the maul overhangs (idle foot '
  +idleFeet.avg.toFixed(3)+' contact foot '+contactFeet.avg.toFixed(3)
  +' boot '+contactFeet.boot.toFixed(3)+')');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nMacar weapon length-lock checks passed');

'use strict';
/**
 * Runs the real HUD layout from index.html inside a vm, so layout tests
 * measure the shipped geometry instead of a hand-copied simulation.
 *   const H=require('./HudHarness');
 *   const L=H.layout({vw:390, vh:844, inset:{t:47,r:0,b:34,l:0}, touch:true, cards:5});
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

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
function extractConsts(){
  const a=html.indexOf('const HUD_TAP=');
  const b=html.indexOf('function hitRect(');
  if(a<0||b<0||b<a) throw new Error('HUD constant block not found');
  return html.slice(a,b).replace(/\bconst /g,'var ');
}
const hudBlock=html.match(/const HUDSKILLS=\[[\s\S]*?\];/)[0].replace(/^const /,'var ');

const FNS=['btnBox','btnGap','circleRectGap','rectsMeet','partyPortraitFrame','partyOrderAnchor',
  'layoutSpecialtyCluster','layoutPartyOrders','layoutUI','landscapePartyOrderSeat',
  'placePartyOrderRow','btnAt'];

const ctx={UIBTN:[], UI:{}, IS_TOUCH:true, PORT:false, VW:0, VH:0, UIS:1,
  G:{ents:[], hudMore:0}, Math};
ctx.clamp=(v,a,b)=>v<a?a:v>b?b:v;
ctx.safeInsets=()=>ctx._inset;
ctx.partyPortraitList=()=>Array.from({length:ctx._n},(_,i)=>({team:'party', col:{key:'k'+i}, hero:i===0}));
vm.createContext(ctx);
vm.runInContext(hudBlock+'\n'+extractConsts(), ctx);
FNS.forEach(n=>vm.runInContext(extractFn(n)+';', ctx));

function layout(o){
  ctx.UIBTN.length=0;
  ctx.UI={};
  ctx.VW=o.vw; ctx.VH=o.vh;
  ctx.IS_TOUCH=o.touch!==false;
  ctx.PORT=o.vh>o.vw;
  ctx.UIS=ctx.clamp(Math.min(o.vw,o.vh)/(ctx.PORT?430:700), 0.66, 1.30);
  ctx._inset=o.inset||{t:0,r:0,b:0,l:0};
  ctx._n=o.cards==null?5:o.cards;
  ctx.layoutUI();
  const btns=ctx.UIBTN.slice();
  return {
    btns,
    find:k=>btns.find(b=>b.key===k),
    chips:btns.filter(b=>b.chip),
    orders:btns.filter(b=>b.order),
    UI:ctx.UI,
    frame:ctx.partyPortraitFrame(),
    btnAt:(x,y)=>ctx.btnAt(x,y),
    touch:ctx.IS_TOUCH, port:ctx.PORT, vw:o.vw, vh:o.vh, inset:ctx._inset
  };
}
function box(b){
  const w=b.w||b.r*2, h=b.h||b.r*2;
  return {x:b.x-w/2, y:b.y-h/2, w, h};
}
/* Edge-to-edge gap between two buttons (negative = overlap). */
function gap(a,b){
  if(!a.w && !b.w) return Math.hypot(a.x-b.x,a.y-b.y)-a.r-b.r;
  if(a.w && b.w){
    const A=box(a), B=box(b);
    const dx=Math.max(B.x-(A.x+A.w), A.x-(B.x+B.w), 0);
    const dy=Math.max(B.y-(A.y+A.h), A.y-(B.y+B.h), 0);
    if(dx===0 && dy===0) return -Math.min(A.x+A.w-B.x, B.x+B.w-A.x, A.y+A.h-B.y, B.y+B.h-A.y);
    return Math.hypot(dx,dy);
  }
  const c=a.w?b:a, r=a.w?a:b;
  return ctx.circleRectGap(c, box(r));
}
module.exports={html, extractFn, layout, box, gap, ctx};

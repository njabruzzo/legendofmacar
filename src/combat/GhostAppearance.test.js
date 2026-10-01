'use strict';
const assert=require('assert'),path=require('path'),fs=require('fs'),vm=require('vm');
const {normalize}=require('./GhostAppearance');
const {readRgba}=require('../qa/pngRgba');
// Equivalent paint at different exposure/opacity must converge, without filling background.
function gradient(factor,alpha){
 const d=new Uint8ClampedArray(20*20*4);
 for(let y=2;y<18;y++)for(let x=2;x<18;x++){const p=(y*20+x)*4,v=(30+x*6)*factor;d.set([v,v,v,alpha],p);}
 return d;
}
const a=gradient(1,168),b=gradient(1.5,255);normalize(a,20,20);normalize(b,20,20);
assert.deepStrictEqual(a,b,'exposure and alpha differences converge onto one appearance');
assert.deepStrictEqual([...a.slice((2*20+2)*4,(2*20+2)*4+4)],[10,35,48,224],'one-pixel boundary uses the shared rim');
assert.strictEqual(a[3],0,'background stays transparent');
assert(a[(8*20+12)*4+2]>a[(8*20+4)*4+2],'painted shading survives grading');
const empty=new Uint8ClampedArray(16);normalize(empty,2,2);assert(empty.every(v=>v===0));
// Check shipped compass frames rather than generated substitutes.
let frames=0;const medians=[];
for(const k of ['pordoom','fendur','orbo','talpor'])for(const dir of ['e','s','ne','se','back'])for(const gait of [1,2]){
 const p=readRgba(path.join(__dirname,'../../assets/creatures/dwarf_'+k+'_ghost_'+dir+'_w'+gait+'.png'));
 const original=Buffer.from(p.data),paint=new Uint8ClampedArray(p.data);normalize(paint,p.w,p.h);
 assert.deepStrictEqual(p.data,original,'source art is untouched');
 const luminance=[];
 for(let i=0;i<paint.length;i+=4){
  assert(paint[i+3]===0||paint[i+3]===224,'consistent translucent opacity');
  if(paint[i+3])luminance.push(paint[i]*.30+paint[i+1]*.59+paint[i+2]*.11);
 }
 luminance.sort((a,b)=>a-b);medians.push(luminance[Math.floor(luminance.length/2)]);frames++;
}
assert(Math.max(...medians)-Math.min(...medians)<8,'all kin and gait frames have consistent median brightness');
// Source routing uses that same kin and pose; late art readiness can replace fallback.
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const fn=html.match(/function ghostPaintSource\([\s\S]*?\n\}/)[0];
const SPR={orbo_ghost_atk:{width:512},orbo_atk:{width:512},talpor_ghost_atk_recover:{width:512},talpor_atk_recover:{width:512}};
const ctx={SPR,sprReady:k=>!!SPR[k]};vm.createContext(ctx);vm.runInContext(fn,ctx);
assert.strictEqual(ctx.ghostPaintSource(SPR.orbo_ghost_atk),SPR.orbo_atk,'ghost strike retains dark armor from exact original strike');
assert.strictEqual(ctx.ghostPaintSource(SPR.talpor_ghost_atk_recover),SPR.talpor_atk_recover,'recover keeps its own pose and kin');
const absent={width:512};SPR.fendur_ghost_atk=absent;
assert.strictEqual(ctx.ghostPaintSource(absent),absent,'unloaded clean art keeps a usable fallback');
SPR.fendur_atk={width:512};assert.strictEqual(ctx.ghostPaintSource(absent),SPR.fendur_atk,'late clean art replaces fallback');
console.log('ghost appearance passed: '+frames+' shipped directional frames');

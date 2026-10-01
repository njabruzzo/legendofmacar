'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
function fn(name){
 const start=html.indexOf('function '+name+'(');assert(start>=0,name+' exists');
 let depth=0;for(let i=html.indexOf('{',start);i<html.length;i++){
  if(html[i]==='{')depth++;else if(html[i]==='}'&&!--depth)return html.slice(start,i+1);
 }throw Error('unclosed '+name);
}
const c={G:{shots:[]},TW:116,TH:58,CAMSX:47,CAMSY:-83,ZOOM:1.5,SPR:{fx_bolt:{width:744,height:252}},TEX:{},TAU:Math.PI*2,
 ang:(x,y)=>Math.atan2(y,x),emit(){},sc(){}};
vm.createContext(c);vm.runInContext(['shoot','stepShot','shotScreenAngle','w2s','drawShot'].map(fn).join('\n'),c);
let rotations=[],lines=[],images=0;
const g={save(){},restore(){},translate(){},rotate(a){rotations.push(a);},drawImage(){images++;},beginPath(){},moveTo(x,y){lines.push([x,y]);},lineTo(x,y){lines.push([x,y]);},stroke(){},closePath(){},fill(){},rect(){},quadraticCurveTo(){}};
const close=(a,b,m)=>assert(Math.abs(a-b)<1e-9,m);
for(const ratio of [[116,58],[66,34]])for(const team of ['party','foe'])for(const dt of [1/60,.05])for(let oct=0;oct<8;oct++){
 c.TW=ratio[0];c.TH=ratio[1];
 const a=oct*Math.PI/4,from={x:30,y:22,team},target={x:from.x+Math.cos(a)*9,y:from.y+Math.sin(a)*9};
 const s=c.shoot(from,target.x,target.y,0,'bolt','#d8c49a',14),vx=s.vx,vy=s.vy;
 const origin=c.w2s(s.x,s.y),dest=c.w2s(target.x,target.y),expected=Math.atan2(dest.y-origin.y,dest.x-origin.x);
 for(let frame=0;frame<12;frame++){
  s.spin=frame*2;rotations=[];c.drawShot(g,s);
  close(Math.cos(rotations[0]+Math.atan2(156,708)),Math.cos(expected),'bolt art points along projected flight');
  close(Math.sin(rotations[0]+Math.atan2(156,708)),Math.sin(expected),'bolt tip follows target direction');
  c.stepShot(s,dt);close(s.spin,0,'bolts never accumulate spin');
  close(s.vx,vx,'horizontal velocity stays straight');close(s.vy,vy,'vertical velocity stays straight');
  close(s.x,from.x+vx*dt*(frame+1),'position follows straight trajectory');
  close(s.y,from.y+vy*dt*(frame+1),'position follows straight trajectory');
 }
 c.SPR.fx_bolt=null;rotations=[];lines=[];c.drawShot(g,s);
 close(Math.cos(rotations[0]),Math.cos(expected),'cold-art fallback points toward target');
 assert(lines.some(p=>p[0]===14*c.ZOOM&&p[1]===0),'fallback has a forward bolt tip');
 c.SPR.fx_bolt={width:744,height:252};
}
for(const kind of ['pick','web','flame']){
 const s={kind,x:0,y:0,vx:1,vy:2,life:2,spin:3};c.stepShot(s,.05);close(s.spin,3.7,kind+' retains its existing spin');
}
assert(images>0);assert(html.includes('stepShot(s,dt);'),'live update uses verified projectile step');
console.log('bolt direction and straight flight pass: 64 direction/team/frame/geometry cases, loaded and cold art');

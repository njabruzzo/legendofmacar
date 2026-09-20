'use strict';
/**
 * Chapter I entrance: cave-in rubble is a dispersed field, and crushed
 * kin stay readable among it. Run: node src/dungeon/Ch1EntranceScatter.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

function extractFn(name){
  const start=html.indexOf('function '+name+'(');
  if(start<0) throw new Error('missing '+name);
  let i=html.indexOf('{', start);
  let depth=0;
  for(; i<html.length; i++){
    const ch=html[i];
    if(ch==='{') depth++;
    else if(ch==='}'){
      depth--;
      if(depth===0) return html.slice(start, i+1);
    }
  }
  throw new Error('unclosed '+name);
}

function extractConst(name){
  const start=html.indexOf('const '+name+'=');
  if(start<0) throw new Error('missing const '+name);
  const semi=html.indexOf(';', start);
  let i=html.indexOf('{', start);
  if(i<0 || (semi>=0 && semi<i)){
    return html.slice(start, semi+1);
  }
  let depth=0;
  for(; i<html.length; i++){
    const ch=html[i];
    if(ch==='{') depth++;
    else if(ch==='}'){
      depth--;
      if(depth===0){
        const semi=html.indexOf(';', i);
        return html.slice(start, (semi>=0?semi:i)+1);
      }
    }
  }
  throw new Error('unclosed const '+name);
}

assert(/function scatterStartRubble\(/.test(html), 'scatterStartRubble still places the field');
assert(/function scatterBurialRubble\(/.test(html), 'scatterBurialRubble still dresses the burial');
assert(!/\[15\.85,17\.80,5,0\.72,0\.70\]/.test(html), 'old six-pile cluster table is gone');
assert(!/\[15\.15,19\.85,0\.38,'rubble2'\]/.test(html), 'old west-wall extra line is gone');

const grid=[];
for(let j=0;j<32;j++){
  grid[j]=[];
  for(let i=0;i<36;i++) grid[j][i]=(i>=14 && i<=31 && j>=14 && j<=29)?0:1;
}

const ctx={
  TAU:Math.PI*2,
  CRUSH_SPOTS:null,
  h3:null, h01:null
};
vm.createContext(ctx);
vm.runInContext(
  extractConst('TAU')
  +extractFn('h3')
  +extractFn('h01')
  +extractConst('CRUSH_SPOTS')
  +extractFn('nearCrush')
  +extractFn('isWalkTile')
  +extractFn('startRubbleSpr')
  +extractFn('startBackWallRubble')
  +extractFn('scatterStartRubble')
  +extractFn('scatterBurialRubble')
  +'\nthis.CRUSH_SPOTS=CRUSH_SPOTS;',
  ctx);

const L={n:1, w:36, h:32, grid};
const wall=ctx.startBackWallRubble();
const field=ctx.scatterStartRubble(L);
const burial=ctx.scatterBurialRubble();

assert(wall.some(p=>p.k==='cavein' && p.s>=1.12), 'wall lip still stamps tall cave-in');
assert(wall.some(p=>p.k==='dust'), 'wall foot still has dust');
assert(!wall.some(p=>p.k==='timber'&&p.fallen), 'wall helper still has no floor beams');

const wallY=wall.filter(p=>p.k!=='cavein').map(p=>p.y);
const wallSteps=[];
for(let i=1;i<wallY.length;i++) wallSteps.push(Math.abs(wallY[i]-wallY[i-1]));
const uniqueSteps=new Set(wallSteps.map(s=>s.toFixed(2)));
assert(uniqueSteps.size>=3, 'wall-foot y spacing is irregular, not a picket fence');

assert(field.length>=70, 'start field is a dense cave-in ('+field.length+' props)');
const stones=field.filter(p=>p.k==='rubble'||p.k==='boulder');
assert(stones.length>=52, 'dense field still has many stones ('+stones.length+')');
const chips=field.filter(p=>p.chip).length;
assert(chips>=20, 'fine chips fill gaps between larger stones ('+chips+')');
const xs=stones.map(p=>p.x);
const ys=stones.map(p=>p.y);
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
const stdev=a=>{
  const m=mean(a);
  return Math.sqrt(a.reduce((s,v)=>s+(v-m)*(v-m),0)/a.length);
};
assert(Math.min.apply(null,xs)<16.4 && Math.max.apply(null,xs)>20.5,
  'field reaches from the west lip into the chamber (x '+Math.min.apply(null,xs).toFixed(2)+'..'+Math.max.apply(null,xs).toFixed(2)+')');
assert(stdev(xs)>1.4, 'field x-spread is not a west-wall line (stdev '+stdev(xs).toFixed(2)+')');
assert(stdev(ys)>1.8, 'field y-spread is not a single clump (stdev '+stdev(ys).toFixed(2)+')');
const westBand=stones.filter(p=>p.x<18.2).length;
assert(westBand>=stones.length*0.40, 'collapse spill is heavier near the west lip');

let clump=0;
stones.forEach(a=>{
  const n=stones.filter(b=>b!==a && Math.hypot(a.x-b.x,a.y-b.y)<0.40).length;
  if(n>clump) clump=n;
});
assert(clump<=4, 'dense field still avoids neat matching piles (max close neighbors '+clump+')');

const spots=Object.keys(ctx.CRUSH_SPOTS).map(k=>ctx.CRUSH_SPOTS[k]);
assert(spots.length===4, 'four named crush spots still exist');
const onHead=stones.filter(p=>spots.some(s=>Math.hypot(p.x-s.x,p.y-s.y)<0.68)).length;
const onSpawn=stones.filter(p=>Math.hypot(p.x-20.5,p.y-22.0)<0.90).length;
assert(onHead===0, 'field stones stay off crush heads');
assert(onSpawn===0, 'field stones stay off Macar spawn');

const cover=burial.filter(p=>p.cover);
assert(cover.length>=12, 'each burial still gets cover chips');
const coverRocks=cover.filter(p=>p.k==='rubble'||p.k==='boulder');
assert(coverRocks.every(p=>p.s<=0.28), 'cover rocks on the kin stay small');
assert(coverRocks.every(p=>{
  const spot=spots.reduce((best,s)=>Math.hypot(p.x-s.x,p.y-s.y)<Math.hypot(p.x-best.x,p.y-best.y)?s:best, spots[0]);
  return p.y>=spot.y+0.20;
}), 'cover rocks sit toward the feet, not over the face');

const extras=burial.filter(p=>p.scatter && (p.k==='rubble'||p.k==='boulder'||p.k==='timber'));
assert(extras.length>=16, 'burial extras add more cave-in volume ('+extras.length+')');
const extraX=extras.map(p=>p.x);
assert(Math.max.apply(null,extraX)-Math.min.apply(null,extraX)>4.5,
  'burial extras span the chamber, not a west-wall line');
assert(wall.filter(p=>p.k==='rubble'||p.k==='boulder').length>=12,
  'wall foot has a heavier chip spill');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nChapter I entrance scatter checks passed');

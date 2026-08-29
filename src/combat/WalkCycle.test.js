'use strict';
/**
 * Walk cycles swap planted / passing / opposite-plant on gait while moving.
 * QUALITY must not freeze anyone on a single pose.
 * Run: node src/combat/WalkCycle.test.js
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
  const re=new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}');
  const m=html.match(re);
  if(!m) throw new Error('missing '+name+' in index.html');
  return m[0];
}

assert(/function walkCycleKey\(/.test(html), 'walkCycleKey exists');
assert(/gaitAdvance\(e,dt\)\{ e\.gait=\(e\.gait\|\|0\)\+Math\.max\(0,dt\)\*3\.35/.test(html),
  'gait advances on a step timer (~3.35)');
assert(/_w3\.png/.test(html) && /k\.replace\(\/_w1\$\/,'_w3'\)/.test(html),
  'optional _w3 sheets are registered from every _w1');

const liveKey=extractFn('livingMacarAnimKey');
assert(!/QUALITY/.test(liveKey), 'living Macar walk ignores QUALITY');
assert(/walkCycleKey\(e, stem\)/.test(liveKey), 'living Macar walk uses walkCycleKey');

const angled=html.match(/function dwarfAngleKey\(e,k\)\{[\s\S]*?\nfunction wantsSpriteFlip/)[0];
assert(/const moving=e\.moving && !e\.defending/.test(angled),
  'kin directional walk is not QUALITY-gated');
assert(/walkCycleKey\(e, stem\)/.test(angled), 'kin directional walk uses walkCycleKey');

assert(!/if\(QUALITY && e\.moving\)/.test(html), 'no QUALITY gate left on walk-frame pick');
assert(/walkCycleKey\(e, k\)/.test(html) && /walkCycleKey\(e, backStem\)/.test(html),
  'monster and back walks use walkCycleKey');

assert(/oct==='w'\|\|oct==='sw'\|\|oct==='nw'/.test(html),
  'west still uses the east sheet (no nw moonwalk)');
assert(/!e\.defending/.test(liveKey), 'defend keeps a planted pose');

const SPR={
  macar:{width:8}, macar_w1:{width:8}, macar_w2:{width:8}, macar_w3:{width:8},
  macar_e_w1:{width:8}, macar_e_w2:{width:8}, macar_e_w3:{width:8},
  rat:{width:8}, rat_w1:{width:8}, rat_w2:{width:8},
  warg:{width:8}, warg_w1:{width:8}, warg_w2:{width:8}, warg_w3:{width:8}
};
const ctx={
  SPR,
  sprReady(k){ return !!(k && SPR[k] && SPR[k].width); }
};
vm.createContext(ctx);
vm.runInContext(extractFn('walkCycleKey'), ctx);

function keysFor(stem, gaits){
  return gaits.map(g=>ctx.walkCycleKey({gait:g}, stem));
}

assert(ctx.walkCycleKey({gait:0.12}, 'macar')==='macar_w1', 'first half gait is plant A (w1)');
assert(ctx.walkCycleKey({gait:0.50}, 'macar')==='macar_w2', 'second half gait is opposite plant (w2)');
assert(ctx.walkCycleKey({gait:0.82}, 'macar')==='macar_w2', 'late gait stays on plant B');
assert(ctx.walkCycleKey({gait:0.12}, 'macar')!==ctx.walkCycleKey({gait:0.82}, 'macar'),
  'planted boot key swaps every half gait');
assert(!/_w3$/.test(ctx.walkCycleKey({gait:0.5}, 'macar')||''),
  'walk cycle never inserts a turned-around w3 pass');
['0.1','0.3','0.5','0.7','0.9'].forEach(g=>{
  const k=ctx.walkCycleKey({gait:+g}, 'macar_e');
  assert(k==='macar_e_w1'||k==='macar_e_w2', 'east walk stays on the east stem at gait '+g);
});

const rat2=keysFor('rat', [0.1, 0.6]);
assert(rat2[0]==='rat_w1' && rat2[1]==='rat_w2', '2-beat monster walk is w1 / w2');
assert(ctx.walkCycleKey({gait:0}, 'missing')==null, 'missing stem returns null');
assert(ctx.walkCycleKey({gait:0.2}, 'warg')==='warg_w1'
  && ctx.walkCycleKey({gait:0.5}, 'warg')==='warg_w2'
  && ctx.walkCycleKey({gait:0.9}, 'warg')==='warg_w2',
  'warg plants swap each half gait (no turned w3)');
assert(!/stem\+'_w3'/.test(extractFn('walkCycleKey')),
  'walkCycleKey source does not pick _w3');
const flipSrc=extractFn('wantsSpriteFlip');
assert(/moveHeadingSX\(e\) < -0\.02/.test(flipSrc) && !/gait/.test(flipSrc) && !/phase/.test(flipSrc),
  'flip is heading-only — never per gait frame');

/* Live D / A path: east stem only, same facing, heading flip never changes mid-gait. */
['macar_s_w1','macar_s_w2','macar_back_w1','macar_back_w2','macar_ne_w1','macar_se_w1'].forEach(k=>{
  SPR[k]={width:8};
});
function extractThrough(name, until){
  const start=html.indexOf('function '+name+'(');
  if(start<0) throw new Error('missing '+name);
  const end=html.indexOf('\nfunction '+until+'(', start);
  if(end<0) throw new Error('missing end '+until);
  return html.slice(start, end);
}
Object.assign(ctx, {
  TAU:Math.PI*2,
  player(){ return null; },
  wantsMeleePose(){ return false; },
  wantsMeleeRecover(){ return false; },
  entAnimKey(e){ return ctx.livingMacarAnimKey?ctx.livingMacarAnimKey(e):'macar_e_w1'; }
});
vm.runInContext(extractThrough('faceVec','wantsSpriteFlip')+extractFn('wantsSpriteFlip')+extractFn('livingMacarAnimKey'), ctx);

function holdWalk(ix, iy){
  const samples=[];
  for(let g=0; g<1; g+=0.05){
    const e={
      hero:1, moving:1, defending:0, dead:0, ghost:0, crushed:0,
      atk:0, ix, iy, fdx:ix, fdy:iy, gait:g
    };
    samples.push({
      gait:+g.toFixed(2),
      oct:ctx.screenOctant(e),
      key:ctx.livingMacarAnimKey(e),
      flip:ctx.wantsSpriteFlip(e)
    });
  }
  return samples;
}
const holdD=holdWalk(0.707, -0.707);
const holdA=holdWalk(-0.707, 0.707);
assert(holdD.every(s=>s.oct==='e' && (s.key==='macar_e_w1'||s.key==='macar_e_w2') && s.flip===false && !/_w3$/.test(s.key)),
  'hold D: every gait frame is east-painted, unflipped, never w3');
assert(holdA.every(s=>s.oct==='w' && (s.key==='macar_e_w1'||s.key==='macar_e_w2') && s.flip===true && !/_w3$/.test(s.key)),
  'hold A: every gait frame is the same east sheet flipped once, never w3');
assert(new Set(holdD.map(s=>s.flip)).size===1 && new Set(holdA.map(s=>s.flip)).size===1,
  'flip does not change across the gait while heading is fixed');

const party=['dwarf_macar','dwarf_pordoom','dwarf_fendur','dwarf_orbo','dwarf_talpor'];
party.forEach(stem=>{
  ['_w1.png','_w2.png','_w3.png'].forEach(suf=>{
    const f=stem+suf;
    assert(fs.existsSync(path.join(__dirname,'../../assets/creatures/'+f)), f+' on disk');
  });
});
['pordoom','fendur','orbo','talpor'].forEach(k=>{
  const f='dwarf_'+k+'_ghost_w3.png';
  assert(fs.existsSync(path.join(__dirname,'../../assets/creatures/'+f)), f+' on disk');
});
['mon_rat_w3.png','mon_goblin_w3.png','mon_spider_w3.png','mon_greenslime_w3.png',
 'mon_warg_w1.png','mon_warg_w2.png','mon_warg_w3.png',
 'dwarf_macar_e_w3.png','dwarf_macar_s_w3.png','dwarf_macar_back_w3.png'].forEach(f=>{
  assert(fs.existsSync(path.join(__dirname,'../../assets/creatures/'+f)), f+' on disk');
});

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nwalk cycle checks passed');

'use strict';
/**
 * Crown take or destroy raises skeletal dwarves once.
 * Until dwarf_skeleton_idle.png is on disk they use mon_undead.png
 * and a single idle pose: slide, 2px bob, 6px lunge.
 * Run: node src/dungeon/SkeletalDwarf.test.js
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
  let i=html.indexOf('{', start), depth=0;
  for(;i<html.length;i++){
    if(html[i]==='{') depth++;
    else if(html[i]==='}'){ depth--; if(depth===0) return html.slice(start, i+1); }
  }
  throw new Error('unclosed '+name);
}

assert(/dwarf_skeleton_idle:'assets\/creatures\/dwarf_skeleton_idle\.png'/.test(html),
  'skeletal dwarf idle slot is registered');
assert(/dwarf_skeleton_idle_w1\.png/.test(html) && /_atk\.png/.test(html),
  'walk and attack frames are named as later drop-ins');
assert(fs.existsSync(path.join(__dirname,'../../assets/creatures/mon_undead.png')),
  'placeholder art is the existing undead sheet');
assert(!fs.existsSync(path.join(__dirname,'../../assets/creatures/dwarf_skeleton_idle.png')),
  'approved idle file is not bound until it is in the repo');
assert(/skeletalDwarf:\{[\s\S]*?spr:'undead'/.test(html),
  'the bestiary row uses the undead sprite until the idle sheet loads');
assert(/riseSkeletalDwarves\(crown\)/.test(extractFn('takeBoneCrown'))
  && /riseSkeletalDwarves\(where\)/.test(extractFn('destroyBoneCrown')),
  'take and destroy both raise the skeletal dwarves');
assert(/L\.flags\.skeletalDwarves/.test(extractFn('riseSkeletalDwarves')),
  'the raise fires once');
assert(/elapsedMs<leg\) amp=6\*\(elapsedMs\/leg\)/.test(extractFn('singlePoseOffset'))
  && /Math\.sin\(\(G\.elapsed\|\|0\)\*7\)\*2/.test(extractFn('singlePoseOffset')),
  'single pose bobs 2px and lunges 6px over 120ms');
assert(/k==='dwarf_skeleton_idle' && typeof sprReady/.test(extractFn('singlePoseLocked')),
  'own walk frames unlock the normal cycle');

const ctx={
  G:{ents:[], lvl:{flags:{}, n:1}},
  said:[],
  fights:0,
  SPR:{undead:{width:8}, dwarf_skeleton_idle:null},
  say(t){ ctx.said.push(t); },
  burst(){},
  beginFight(){ ctx.fights++; },
  player(){ return {x:5,y:5,hero:1}; },
  sprReady(k){ return !!(ctx.SPR[k] && ctx.SPR[k].width); },
  teethHordeSpots(){ return [{x:6,y:6},{x:7,y:6},{x:6,y:7},{x:7,y:7}]; },
  FOE:{skeletalDwarf(){ return {kind:'undead', sprite:'undead', team:'foe', hp:16}; }}
};
vm.createContext(ctx);
vm.runInContext(
  'const SKELETAL_DWARF_N=4;\n'
  +extractFn('riseSkeletalDwarves')+'\n'
  +extractFn('entSpriteKey')+'\n'
  +extractFn('singlePoseLocked')+'\n'
  +extractFn('singlePoseOffset')+'\n'
  +'this.riseSkeletalDwarves=riseSkeletalDwarves; this.singlePoseLocked=singlePoseLocked; this.singlePoseOffset=singlePoseOffset;',
  ctx
);

const n=ctx.riseSkeletalDwarves({x:5,y:5});
assert(n===4 && ctx.G.lvl.flags.skeletalDwarves===1 && ctx.fights===1, 'four skeletal dwarves enter combat once');
assert(ctx.G.ents.every(e=>e.singlePose===1 && e.sprite==='undead' && e.name==='Skeletal Dwarf'),
  'the placeholder keeps the undead sheet in single-pose mode');
assert(ctx.riseSkeletalDwarves({x:5,y:5})===0 && ctx.G.ents.length===4,
  'a second take or destroy does not raise another wave');

const slide={singlePose:1, sprite:'undead', kind:'undead', moving:1, dead:0, atk:0, x:1, y:1};
ctx.G.elapsed=Math.PI/2/7;
const bob=ctx.singlePoseOffset(slide);
assert(ctx.singlePoseLocked(slide) && bob && Math.abs(Math.abs(bob.y)-2)<1e-6 && bob.x===0,
  'a moving placeholder bobs 2px and does not lunge');

const mid={singlePose:1, sprite:'undead', kind:'undead', moving:0, dead:0, atk:0.24, atkMax:0.3, x:1, y:1};
const lunge=ctx.singlePoseOffset(mid);
assert(lunge && Math.abs(lunge.x-3)<1e-6, '60ms into the swing the lunge is 3px');
const peak={singlePose:1, sprite:'undead', kind:'undead', moving:0, dead:0, atk:0.18, atkMax:0.3, x:1, y:1};
assert(Math.abs(ctx.singlePoseOffset(peak).x-6)<1e-6, '120ms is the 6px peak');
const back={singlePose:1, sprite:'undead', kind:'undead', moving:0, dead:0, atk:0.12, atkMax:0.3, x:1, y:1};
assert(Math.abs(ctx.singlePoseOffset(back).x-3)<1e-6, '180ms the lunge is halfway back');

ctx.SPR.dwarf_skeleton_idle_w1={width:8};
const painted={singlePose:1, sprite:'dwarf_skeleton_idle', kind:'undead', moving:1, dead:0};
assert(ctx.singlePoseLocked(painted)===false, 'a ready walk frame leaves single-pose');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nskeletal dwarf checks passed');

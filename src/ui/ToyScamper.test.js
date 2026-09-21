'use strict';
/**
 * Brass Walker scampers 5s on toy talk end (not mid-tree),
 * steering into open floor and away from Macar.
 * Run: node src/ui/ToyScamper.test.js
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
    else if(html[i]==='}'){ depth--; if(!depth) return html.slice(start, i+1); }
  }
  throw new Error('unclosed '+name);
}

const steerFns=['toyScamperOpen','toyScamperAway','pickToyScamperDir','stepToyScamper','toyFlankBlocked',
  'windupToyProp','kickToyScamper','tickToyScamper'].map(extractFn).join('\n');

assert(/const TOY_SCAMPER_SECS=5/.test(html), 'scamper duration is 5 real seconds');
assert(!/Math\.random/.test(extractFn('kickToyScamper')), 'kick steering is scored, not a random octant');
assert(!/Math\.random/.test(extractFn('pickToyScamperDir')), 'heading score does not roll a random octant');
assert(/toyScamperOpen\(/.test(extractFn('pickToyScamperDir')), 'kick scores open floor');
assert(/toyScamperAway\(/.test(extractFn('pickToyScamperDir')), 'kick scores away from Macar');
assert(/toy\.scampT=TOY_SCAMPER_SECS/.test(html), 'kick writes a 5s timer');
assert(/A new talk-end restarts|Talk-end restarts a 5s scamper/.test(html),
  'already-running scamper restarts');
['toy_find','toy_wind','toy_grond','toy_teeth','toy_ruby','toy_froren','toy_mordain','toy_anvil'].forEach(k=>{
  assert(html.includes("key==='"+k+"'"), 'isToyTalkKey includes '+k);
});
assert(/settleToyTalk\(\)/.test(extractFn('pickTalk')), 'pickTalk settles after then()');
assert(/settleToyTalk\(\)/.test(extractFn('dismissTalkWalkOff')), 'Escape / walk-off settles');
assert(/tickToyScamper\(dt\)/.test(html.match(/function update\(dt\)\{[\s\S]*?PROMPT=null/)[0]),
  'play update ticks the scamper');
assert(/if\(isToyTalkKey\(key\)\) G\.toyTalkEnded=null/.test(extractFn('startTalk')),
  'branching startTalk does not kick');

const draw=extractFn('drawWindupToyProp');
assert(/propAnimImg\(p\)/.test(draw) && /drawBillboard\(/.test(draw),
  'scamper draws the painted idle or wound sheet');
assert(/p\.scampT>0/.test(draw), 'gait runs only while scampering');
assert(/scampDx/.test(draw) && /scampFace/.test(draw), 'facing follows the scamper');
assert(/Math\.sin\(phase\)/.test(draw) && /Math\.sin\(t\*26\)/.test(draw),
  'bob, lean, and a faster wound-key rock');
assert(!/winduptoy_w1/.test(draw) && !/winduptoy_w2/.test(html),
  'motion does not invent a walk sheet');
assert(/#b8883a/.test(draw), 'missing sprite still falls back to a brass body');
assert(/p\.k==='winduptoy'/.test(extractFn('drawProp')) && /drawWindupToyProp\(/.test(extractFn('drawProp')),
  'drawProp animates the walker on the painted sheet');

const ctx={
  G:{props:[{k:'winduptoy',x:10,y:10,s:0.82,seed:501}], talk:null, toyTalkEnded:null, talkAfter:null, paused:false},
  TOY_SCAMPER_SECS:5,
  TOY_SCAMPER_SP:2.8,
  NPC_TALK:{
    toy_wind:{who:'THE TOY', line:'Tick.', choices:[{t:'Put it down.', reply:'Tick.'}]},
    toy_grond:{who:'THE TOY', line:'Grond.', choices:[{t:'Enough.', reply:'Enough.'}]}
  },
  canBe:(x,y)=>x>=0&&x<20&&y>=0&&y<20,
  say:()=>{},
  Object
};
vm.createContext(ctx);
vm.runInContext([
  extractFn('isToyTalkKey'),
  steerFns,
  extractFn('settleToyTalk'),
  extractFn('closeTalk'),
  extractFn('startTalkObj'),
  extractFn('startTalk'),
  extractFn('pickTalk')
].join('\n'), ctx);

const toy=ctx.G.props[0];
ctx.kickToyScamper();
assert(toy.scampT===5, 'kick sets 5s');
const len=Math.hypot(toy.scampDx, toy.scampDy);
assert(Math.abs(len-1)<1e-9, 'kick direction is a unit heading');
const heldX=toy.scampDx, heldY=toy.scampDy;
ctx.tickToyScamper(0.5);
assert(Math.abs(toy.scampT-4.5)<1e-9, 'half second burns the timer');
assert(Math.hypot(toy.x-10, toy.y-10)>1.2, 'slides across walkable floor');
assert(toy.scampDx===heldX && toy.scampDy===heldY, 'open floor keeps its heading');
ctx.tickToyScamper(4.4);
assert(toy.scampT>0 && toy.scampT<0.2, 'still running just before 5s');
ctx.tickToyScamper(0.2);
assert(toy.scampT===0 && toy.scampDx===0 && toy.scampDy===0, 'halts at 5s');

ctx.kickToyScamper();
ctx.kickToyScamper();
assert(toy.scampT===5, 'mid-run kick restarts the 5s timer');
assert(Math.abs(Math.hypot(toy.scampDx, toy.scampDy)-1)<1e-9, 'restart still picks a unit heading');

toy.x=10; toy.y=10; toy.scampT=0; toy.scampDx=0; toy.scampDy=0;
ctx.G.talk={key:'toy_wind', who:'THE TOY', line:'Tick.', choices:[{t:'Put it down.', reply:'Tick.'}]};
ctx.G.toyTalkEnded=null;
ctx.pickTalk(0);
assert(!ctx.G.talk, 'put-down closes the plate');
assert(toy.scampT===5, 'talk end kicks a 5s scamper');
assert(Math.abs(Math.hypot(toy.scampDx, toy.scampDy)-1)<1e-9, 'talk-end direction is a unit heading');

toy.scampT=0; toy.scampDx=0; toy.scampDy=0;
ctx.G.talk={key:'toy_wind', who:'THE TOY', line:'Tick.',
  choices:[{t:'Who is Grond?', then:()=>ctx.startTalk('toy_grond')}]};
ctx.G.toyTalkEnded=null;
ctx.pickTalk(0);
assert(ctx.G.talk && ctx.G.talk.key==='toy_grond', 'Who is Grond stays in the tree');
assert(!ctx.G.toyTalkEnded, 'mid-tree startTalk cleared pending scamper');
assert(!(toy.scampT>0), 'mid-choice does not start the run');

const wall={
  G:{props:[{k:'winduptoy',x:10,y:10}], toyTalkEnded:null},
  TOY_SCAMPER_SECS:5,
  TOY_SCAMPER_SP:2.8,
  canBe:(x,y)=>x<=10.2 && y>=0 && y<20
};
vm.createContext(wall);
vm.runInContext(steerFns, wall);
const wtoy=wall.G.props[0];
wtoy.scampDx=1; wtoy.scampDy=0; wtoy.scampT=5;
wall.tickToyScamper(1);
assert(wtoy.x<=10.2, 'slide respects collision');
assert(wtoy.scampT===4, 'blocked slide still burns the 5s');
assert(!(wtoy.scampDx>0.9 && Math.abs(wtoy.scampDy)<0.2), 'blocked scamper re-steers off the wall');
assert(Math.hypot(wtoy.x-10, wtoy.y-10)>0.4, 're-steer recovers into walkable floor');

/* Macar stands in the open; the near walls are north and east. A random
   octant of 0 would run east into the wall. Open floor is south and west. */
const corner={
  G:{props:[{k:'winduptoy',x:6,y:6}]},
  TOY_SCAMPER_SECS:5,
  TOY_SCAMPER_SP:2.8,
  player:()=>({x:5.2,y:7.1}),
  Math:Math,
  canBe:(x,y)=>x>=0&&x<24&&y>=0&&y<24&&y>=5.15&&x<=7.25
};
vm.createContext(corner);
vm.runInContext(steerFns, corner);
corner.kickToyScamper();
const ctoy=corner.G.props[0];
assert(ctoy.scampDx<0.25 && ctoy.scampDy>-0.25,
  'near a corner, kick prefers open floor over the walls (dx='+ctoy.scampDx.toFixed(2)+' dy='+ctoy.scampDy.toFixed(2)+')');
const awayNE=ctoy.scampDx*0.62+ctoy.scampDy*-0.78;
assert(awayNE<0.2, 'open floor wins when away-from-Macar points into the corner');

/* Macar is on the wall side. Away and the open room are the same heading. */
const awayOpen={
  G:{props:[{k:'winduptoy',x:10,y:10}]},
  TOY_SCAMPER_SECS:5,
  TOY_SCAMPER_SP:2.8,
  player:()=>({x:8.5,y:10}),
  canBe:(x,y)=>x>=9.25&&x<40&&y>=0&&y<30
};
vm.createContext(awayOpen);
vm.runInContext(steerFns, awayOpen);
awayOpen.kickToyScamper();
const atoy=awayOpen.G.props[0];
assert(atoy.scampDx>0.75, 'kick runs away from Macar into the open room (dx='+atoy.scampDx.toFixed(2)+')');

/* Start hall: east chamber is the open center. South is the nearer wall.
   Macar stands northwest, so "away" alone would aim southeast at that wall. */
function hallCanBe(x,y){
  const west=x>=14.25&&x<31.75&&y>=14.25&&y<29.75;
  const east=x>=24.25&&x<51.75&&y>=7.25&&y<34.75;
  return west||east;
}
function hallKick(px,py){
  const box={
    G:{props:[{k:'winduptoy',x:28.85,y:26.55}]},
    TOY_SCAMPER_SECS:5,
    TOY_SCAMPER_SP:2.8,
    player:()=>({x:px,y:py}),
    canBe:hallCanBe
  };
  vm.createContext(box);
  vm.runInContext(steerFns, box);
  box.kickToyScamper();
  return box.G.props[0];
}
const center={x:38,y:21};
function towardCenter(t){
  const vx=center.x-t.x, vy=center.y-t.y, L=Math.hypot(vx,vy);
  return (t.scampDx*vx+t.scampDy*vy)/L;
}
const fromNw=hallKick(27.5, 25.4);
assert(towardCenter(fromNw)>0.7,
  'start hall from Macar northwest aims at the open center (dx='+fromNw.scampDx.toFixed(2)+' dy='+fromNw.scampDy.toFixed(2)+')');
assert(fromNw.scampDy<0.25, 'start hall does not run at the near south wall');
const fromEast=hallKick(30.3, 26.3);
assert(towardCenter(fromEast)>0.7,
  'when Macar stands toward the center, open floor still wins (dx='+fromEast.scampDx.toFixed(2)+' dy='+fromEast.scampDy.toFixed(2)+')');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\ntoy scamper checks passed');

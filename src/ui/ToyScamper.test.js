'use strict';
/**
 * Brass Walker scampers 5s on toy talk end (not mid-tree).
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

assert(/const TOY_SCAMPER_SECS=5/.test(html), 'scamper duration is 5 real seconds');
assert(/\(Math\.random\(\)\*8\)\|0/.test(html.match(/function kickToyScamper\(\)\{[\s\S]*?\n\}/)[0]),
  'kick picks a random octant');
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
  extractFn('windupToyProp'),
  extractFn('kickToyScamper'),
  extractFn('tickToyScamper'),
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
assert(Math.abs(len-1)<1e-9, 'kick direction is a unit octant');
ctx.tickToyScamper(4.9);
assert(toy.scampT>0 && Math.abs(toy.scampT-0.1)<1e-9, 'still running just before 5s');
assert(Math.hypot(toy.x-10, toy.y-10)>0.01, 'slides across walkable floor');
ctx.tickToyScamper(0.2);
assert(toy.scampT===0 && toy.scampDx===0 && toy.scampDy===0, 'halts at 5s');

ctx.kickToyScamper();
ctx.kickToyScamper();
assert(toy.scampT===5, 'mid-run kick restarts the 5s timer');
assert(Math.abs(Math.hypot(toy.scampDx, toy.scampDy)-1)<1e-9, 'restart still picks an octant');

toy.x=10; toy.y=10; toy.scampT=0; toy.scampDx=0; toy.scampDy=0;
ctx.G.talk={key:'toy_wind', who:'THE TOY', line:'Tick.', choices:[{t:'Put it down.', reply:'Tick.'}]};
ctx.G.toyTalkEnded=null;
ctx.pickTalk(0);
assert(!ctx.G.talk, 'put-down closes the plate');
assert(toy.scampT===5, 'talk end kicks a 5s scamper');
assert(Math.abs(Math.hypot(toy.scampDx, toy.scampDy)-1)<1e-9, 'talk-end direction is an octant');

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
vm.runInContext([
  extractFn('windupToyProp'),
  extractFn('tickToyScamper')
].join('\n'), wall);
const wtoy=wall.G.props[0];
wtoy.scampDx=1; wtoy.scampDy=0; wtoy.scampT=5;
wall.tickToyScamper(1);
assert(wtoy.x<=10.2, 'slide respects collision');
assert(wtoy.scampT===4, 'blocked slide still burns the 5s');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\ntoy scamper checks passed');

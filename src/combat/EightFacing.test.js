'use strict';
/**
 * Every sprite faces its own movement in all 8 screen directions.
 * Run: node src/combat/EightFacing.test.js
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

assert(/if\(e\.moving && \(\(e\.ix\|\|0\)\|\|\(e\.iy\|\|0\)\)\) return \{dx:e\.ix\|\|0, dy:e\.iy\|\|0\};/.test(extractFn('faceVec')),
  'a moving sprite faces its own ix/iy before any leader heading');
assert(/return moveHeadingSX\(e\) < -0\.02/.test(extractFn('wantsSpriteFlip')),
  'screen-left still flips the painted-right sheet');
assert(/return screenOctant\(e\)==='n'/.test(extractFn('wantsBackView')),
  'screen-up is the back view');

const ctx={
  lead:null,
  player(){ return ctx.lead; },
  kinCanAutoFight(){ return false; },
  entAnimKey(e){ return e.animKey||'macar_w1'; },
  TW:80, TH:40
};
vm.createContext(ctx);
vm.runInContext(
  extractFn('faceVec')+extractFn('screenOctant')+extractFn('moveHeadingSX')
  +extractFn('wantsBackView')+extractFn('wantsSpriteFlip'), ctx);

const DIRS=[
  {name:'e',  ix:0.7,  iy:-0.7,  oct:'e',  flip:false, back:false},
  {name:'se', ix:1,    iy:0,     oct:'se', flip:false, back:false},
  {name:'s',  ix:0.7,  iy:0.7,   oct:'s',  flip:false, back:false},
  {name:'sw', ix:0,    iy:1,     oct:'sw', flip:true,  back:false},
  {name:'w',  ix:-0.7, iy:0.7,   oct:'w',  flip:true,  back:false},
  {name:'nw', ix:-1,   iy:0,     oct:'nw', flip:true,  back:false},
  {name:'n',  ix:-0.7, iy:-0.7,  oct:'n',  flip:false, back:true},
  {name:'ne', ix:0,    iy:-1,    oct:'ne', flip:false, back:false}
];
function actor(kind, dir){
  const base={moving:1, ix:dir.ix, iy:dir.iy, fdx:dir.ix, fdy:dir.iy, animKey:'macar_w1', dead:0, crushed:0, atk:0};
  if(kind==='hero') return Object.assign(base, {hero:1, kind:'dwarf', team:'party'});
  if(kind==='ghost') return Object.assign(base, {hero:0, ghost:1, kind:'dwarf', team:'party', col:{key:'talpor'}});
  if(kind==='npc') return Object.assign(base, {hero:0, npc:1, kind:'dwarf', team:'neutral'});
  return Object.assign(base, {hero:0, kind:'rat', team:'foe'});
}
['hero','ghost','npc','monster'].forEach(kind=>{
  DIRS.forEach(dir=>{
    const e=actor(kind, dir);
    assert(ctx.screenOctant(e)===dir.oct, kind+' '+dir.name+' octant is '+dir.oct);
    assert(ctx.wantsSpriteFlip(e)===dir.flip, kind+' '+dir.name+(dir.flip?' flips':' stays unflipped'));
    assert(ctx.wantsBackView(e)===dir.back, kind+' '+dir.name+(dir.back?' shows its back':' does not show its back'));
  });
});

const macarLeft={hero:1, moving:1, ix:-0.7, iy:0.7, fdx:-0.7, fdy:0.7, team:'party'};
ctx.lead=macarLeft;
const ghostRight={team:'party', ghost:1, hero:0, moving:1, ix:0.7, iy:-0.7, fdx:0.7, fdy:-0.7, animKey:'talpor_ghost_w1', dead:0, crushed:0, atk:0};
assert(ctx.screenOctant(ghostRight)==='e' && ctx.wantsSpriteFlip(ghostRight)===false,
  'a moving ghost faces its own travel, not Macar');
const ghostIdle={team:'party', ghost:1, hero:0, moving:0, ix:0, iy:0, fdx:0.7, fdy:-0.7, animKey:'talpor_ghost', dead:0, crushed:0, atk:0};
assert(ctx.screenOctant(ghostIdle)==='w' && ctx.wantsSpriteFlip(ghostIdle)===true,
  'an idle follower shares Macar heading');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\neight-direction facing checks passed');

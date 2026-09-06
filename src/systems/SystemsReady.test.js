'use strict';
/**
 * MAC-05/06 systems loader: sync include path, no first-frame race.
 * Run: node src/systems/SystemsReady.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.join(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const src=fs.readFileSync(path.join(__dirname,'SystemsReady.js'),'utf8');

require('./SystemsReady.js');
const SR=globalThis.SystemsReady;

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}

assert(!!SR && typeof SR.declare==='function' && typeof SR.playReady==='function',
  'SystemsReady exports declare / playReady');
assert(SR.REQUIRED.indexOf('TimedEffects')>=0, 'TimedEffects is required');
assert(SR.SHIPPED.indexOf('Navigation')>=0, 'Navigation is the shipped Batch D slot');
assert(SR.UPCOMING.indexOf('PartyOrders')>=0 && SR.UPCOMING.indexOf('Navigation')<0,
  'PartyOrders stays upcoming; Navigation is no longer a stub slot');
assert(!/type\s*=\s*["']module["']/.test(html),
  'index.html has no type=module (deferred modules race the first frame)');
assert(!/webpack|esbuild|rollup|vite|parcel/i.test(src),
  'SystemsReady is not a second bundler');

const head=html.slice(0, html.indexOf('<script>\n"use strict";'));
assert(/src="src\/systems\/SystemsReady\.js"/.test(head),
  'SystemsReady is a classic sync tag before the inline play script');
assert(/src="src\/combat\/TimedEffects\.js"/.test(head),
  'TimedEffects stays a classic sync tag before the inline play script');
assert(/src="src\/ui\/TapGate\.js"/.test(head),
  'TapGate is a classic sync tag before the inline play script');

const sysI=head.indexOf('src="src/systems/SystemsReady.js"');
const teI=head.indexOf('src="src/combat/TimedEffects.js"');
const tapI=head.indexOf('src="src/ui/TapGate.js"');
const rotI=head.indexOf('src="src/vendor/rotjs/rot-path.js"');
const navI=head.indexOf('src="src/systems/Navigation.js"');
const inlineI=html.indexOf('<script>\n"use strict";');
assert(sysI>=0 && sysI<teI && teI<tapI && tapI<rotI && rotI<navI && navI<inlineI,
  'load order: SystemsReady → TimedEffects → TapGate → rot-path → Navigation → inline');

assert(/src="src\/systems\/Navigation\.js"/.test(html) &&
  /src="src\/vendor\/rotjs\/rot-path\.js"/.test(html),
  'Batch D Navigation + rot-path are classic sync tags');
assert(!/src="src\/systems\/PartyOrders\.js"/.test(html),
  'PartyOrders is not shipped (no order-menu plates)');
assert(/Future: PartyOrders\.js/.test(html) || /future: PartyOrders\.js/.test(html),
  'index.html documents the remaining PartyOrders sync include slot');

/* ---- declare + hold ---- */
SR.reset();
assert(SR.playReady()===false && SR.systemsHold()===true,
  'missing required module holds play');
SR.declare('TimedEffects', {kind:'haste'});
assert(SR.has('TimedEffects') && SR.get('TimedEffects').kind==='haste',
  'declare stores the module api');
assert(SR.playReady()===true && SR.systemsHold()===false,
  'sync TimedEffects makes playReady true before the first frame');

SR.markPending();
assert(SR.playReady()===false && SR.systemsHold()===true && SR.pendingCount()===1,
  'awaited loader holds update until pending settles');
SR.markSettled();
assert(SR.playReady()===true && SR.systemsHold()===false,
  'settled loader releases the hold');

SR.reset();
SR.declare('TimedEffects', {});
assert(SR.UPCOMING.every(n=>!SR.has(n)),
  'upcoming PartyOrders is not required to start play');
assert(SR.playReady()===true,
  'playReady does not require Navigation (optional shipped module)');

/* live TimedEffects declares itself when SystemsReady is present */
SR.reset();
delete globalThis.TimedEffects;
require('../combat/TimedEffects.js');
assert(SR.has('TimedEffects') && SR.get('TimedEffects')===globalThis.TimedEffects,
  'TimedEffects.declare hooks the existing module (behavior unchanged)');
assert(SR.playReady()===true, 'TimedEffects sync include satisfies playReady');

/* loadScript in Node: missing file settles and does not hang */
SR.reset();
SR.declare('TimedEffects', {});
const p=SR.loadScript(path.join(__dirname,'__no_such_module__.js'), 'Navigation');
assert(typeof p.then==='function', 'loadScript returns a promise');
return p.then(ok=>{
  assert(ok===false, 'missing async module settles false (does not hang)');
  assert(SR.pendingCount()===0 && SR.playReady()===true,
    'failed loadScript still releases the hold so the play loop can start');
  assert(!SR.has('Navigation'), 'failed load does not fake-declare Navigation');

  /* host loop / title → play stay wired */
  const loop=html.match(/function loop\([\s\S]*?\n\}/)[0];
  assert(/SystemsReady\.systemsHold\(\)/.test(loop),
    'loop holds update() while systems are not ready');
  assert(/if\(!holdingWorld && !holdingSystems\) update\(dt\)/.test(loop) ||
    /else if\(!holdingWorld && !holdingSystems\) update\(dt\)/.test(loop),
    'systems hold sits next to the existing world-art hold');
  assert(/tryEnterPlay\(\)/.test(loop) && /requestAnimationFrame\(loop\)/.test(loop),
    'play loop still rAF-ticks and tries to enter play');

  const enter=html.match(/function tryEnterPlay\([\s\S]*?\n\}/)[0];
  assert(/SystemsReady\.systemsHold\(\)/.test(enter),
    'tryEnterPlay waits on systemsHold (sync path is already ready)');
  assert(/G\.scene='play'/.test(enter), 'tryEnterPlay still promotes intro → play');
  assert(/menuBtn\(g,'Enter the Deep'[\s\S]*startChapter\(1\)/.test(html),
    'title Enter the Deep still starts Chapter I');
  assert(/function startChapter\(n\)\{/.test(html), 'startChapter is intact');

  const boot=html.slice(html.indexOf('resize();'), html.indexOf('requestAnimationFrame(loop);'));
  assert(/loadSprites/.test(boot) && /requestAnimationFrame/.test(html),
    'boot still starts the original loop after resize / sprites');

  /* extracted loop hold does not call update when held */
  const ctx={
    G:{t:0, scene:'play', hitstop:0, ch:1, _wantPlay:0},
    last:0,
    updates:0,
    SystemsReady:{ systemsHold(){ return true; } },
    worldArtReady(){ return true; },
    tickGfx(){},
    update(){ ctx.updates++; },
    tryEnterPlay(){},
    syncMusic(){},
    render(){},
    resolveTaps(){},
    requestAnimationFrame(){}
  };
  vm.createContext(ctx);
  vm.runInContext(
    'function loop(now){ let dt=(now-last)/1000; last=now; dt=Math.min(dt,.05); G.t+=dt; tickGfx(dt); const holdingWorld=G.scene===\'play\' && !worldArtReady(G.ch); const holdingSystems=typeof SystemsReady!==\'undefined\' && SystemsReady.systemsHold(); if(G.hitstop>0) G.hitstop-=dt; else if(!holdingWorld && !holdingSystems) update(dt); tryEnterPlay(); syncMusic(); render(); resolveTaps(); requestAnimationFrame(loop); } loop(16);',
    ctx
  );
  assert(ctx.updates===0, 'held systems skip update() on the first frame');
  ctx.SystemsReady.systemsHold=()=>false;
  vm.runInContext('last=0; loop(16);', ctx);
  assert(ctx.updates===1, 'ready systems run update() once');

  if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
  console.log('\nsystems-ready checks passed');
}).catch(err=>{
  console.error(err);
  process.exit(1);
});

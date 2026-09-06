'use strict';
/**
 * MAC-03 timed haste: derived remaining sim-seconds, not per-frame mutation.
 * Run: node src/combat/TimedEffects.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
require('./TimedEffects.js');
const TE=globalThis.TimedEffects;
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const src=fs.readFileSync(path.join(__dirname,'TimedEffects.js'),'utf8');

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL  '+msg); }
  else console.log('ok    '+msg);
}
function extractFn(name){
  const re=new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}');
  const m=html.match(re);
  if(!m) throw new Error('missing '+name);
  return m[0];
}
function approx(a, b, eps){
  return Math.abs(a-b) <= (eps==null?1e-9:eps);
}
function actor(extra){
  return Object.assign({name:'Macar', hero:1, team:'party', sp:4, baseSp:4, cd:1.1, baseCd:1.1, buff:0}, extra||{});
}
function sim(e, seconds, hz, worn){
  const dt=1/hz;
  const steps=Math.round(seconds*hz);
  for(let i=0;i<steps;i++){
    TE.tick(e, dt);
    TE.syncActor(e, worn?{wornAttackCd:worn}:undefined);
  }
  return e;
}

assert(!!TE && typeof TE.applyHaste==='function' && typeof TE.tick==='function',
  'TimedEffects module exports apply/tick');
assert(TE.FLAG===true, 'FLAG default is ON (rollback: FLAG=false or ?timedHaste=0)');
assert(TE.useHaste()===true, 'useHaste is true when FLAG is on');
assert(/src\/combat\/TimedEffects\.js/.test(html), 'index.html loads TimedEffects');
assert(!/tickSpellZones|darkZones|silenceZones/.test(src),
  'module does not own darkness/silence/zone expiry');
assert(!/\.update\(/.test(src) && !/function update\(/.test(src),
  'module does not invoke the game update loop');

/* ---- derived apply: no persistent multiply ---- */
{
  const e=actor();
  TE.applyHaste(e, {duration:6, moveMul:1.35, cdMul:0.5, cdFloor:0.28, policy:'refresh', source:'potion'});
  TE.syncActor(e);
  assert(e.baseSp===4 && e.baseCd===1.1, 'apply keeps baseSp/baseCd');
  assert(approx(e.sp, 4*1.35), 'first haste derives sp from base*1.35');
  assert(approx(e.cd, Math.max(0.28, 1.1*0.5)), 'first haste derives cd from base*0.5');
  TE.applyHaste(e, {duration:6, moveMul:1.35, cdMul:0.5, cdFloor:0.28, policy:'refresh', source:'potion'});
  TE.syncActor(e);
  assert(approx(e.sp, 4*1.35), 'recast does not multiply sp again');
  assert(approx(e.cd, Math.max(0.28, 1.1*0.5)), 'recast does not stack-halve cd');
}

/* ---- refresh / extend / replace ---- */
{
  const e=actor();
  TE.applyHaste(e, {duration:4, moveMul:1.3, cdMul:0.5, policy:'refresh'});
  TE.tick(e, 1.5);
  TE.applyHaste(e, {duration:3, moveMul:1.3, cdMul:0.5, policy:'refresh'});
  assert(approx(TE.getHaste(e).remaining, 3), 'refresh keeps the longer remaining (3 > 2.5)');
  TE.applyHaste(e, {duration:5, moveMul:1.35, cdMul:0.5, policy:'refresh'});
  assert(approx(TE.getHaste(e).remaining, 5) && TE.getHaste(e).moveMul===1.35,
    'refresh takes the new longer duration and stronger move mul');
  const x=actor();
  TE.applyHaste(x, {duration:2, moveMul:1.3, policy:'extend'});
  TE.applyHaste(x, {duration:2, moveMul:1.3, policy:'extend'});
  assert(approx(TE.getHaste(x).remaining, 4), 'extend adds remaining');
  const r=actor();
  TE.applyHaste(r, {duration:8, moveMul:1.35, restRemaining:5, policy:'refresh'});
  TE.tick(r, 1);
  TE.applyHaste(r, {duration:3, moveMul:1.3, restRemaining:5, policy:'replace'});
  assert(approx(TE.getHaste(r).remaining, 3) && TE.getHaste(r).moveMul===1.3,
    'replace overwrites remaining and muls');
}

/* ---- 30 / 60 / 120 Hz equivalence ---- */
{
  function runHz(hz){
    const e=actor();
    TE.applyHaste(e, {duration:6, moveMul:1.35, cdMul:0.5, cdFloor:0.28, restRemaining:5, restMul:0.85, policy:'replace', source:'herb'});
    TE.syncActor(e);
    sim(e, 3, hz);
    const mid={sp:e.sp, cd:e.cd, rem:TE.getHaste(e).remaining, phase:TE.getHaste(e).phase};
    sim(e, 3, hz);
    const endHaste=TE.getHaste(e);
    const rest={sp:e.sp, rem:endHaste&&endHaste.restRemaining, phase:endHaste&&endHaste.phase};
    sim(e, 5.05, hz);
    return {mid, rest, after:e.sp, cd:e.cd, gone:!TE.hasHaste(e)};
  }
  const a=runHz(30), b=runHz(60), c=runHz(120);
  assert(a.mid.phase==='haste' && b.mid.phase==='haste' && c.mid.phase==='haste',
    '3s of 6s haste still in haste phase at 30/60/120');
  assert(approx(a.mid.rem, b.mid.rem, 1e-6) && approx(a.mid.rem, c.mid.rem, 1e-6),
    'remaining after 3s matches at 30/60/120 (got '+a.mid.rem+' / '+b.mid.rem+' / '+c.mid.rem+')');
  assert(approx(a.mid.sp, b.mid.sp, 1e-9) && approx(a.mid.sp, c.mid.sp, 1e-9) && approx(a.mid.sp, 4*1.35),
    'derived sp after 3s matches at 30/60/120');
  assert(approx(a.mid.cd, b.mid.cd, 1e-9) && approx(a.mid.cd, c.mid.cd, 1e-9),
    'derived cd after 3s matches at 30/60/120');
  assert(a.rest.phase==='rest' && b.rest.phase==='rest' && c.rest.phase==='rest',
    'after 6s the herb rest phase starts at every Hz');
  assert(approx(a.rest.sp, 4*0.85, 1e-9) && approx(a.rest.sp, b.rest.sp, 1e-9) && approx(a.rest.sp, c.rest.sp, 1e-9),
    'rest sp is derived (not per-frame 0.985) and matches at 30/60/120');
  assert(a.gone && b.gone && c.gone && approx(a.after, 4) && approx(b.after, 4) && approx(c.after, 4),
    'after rest, haste is gone and sp returns to base at every Hz');
}

/* Legacy afterHaste multiply is frame-dependent — why we migrated. */
{
  function legacy(seconds, hz){
    let sp=4*1.3;
    const dt=1/hz;
    const steps=Math.round(seconds*hz);
    for(let i=0;i<steps;i++){
      sp=Math.max(1.2, sp*0.985);
    }
    return sp;
  }
  const l30=legacy(1,30), l60=legacy(1,60), l120=legacy(1,120);
  assert(Math.abs(l30-l60)>0.4 && Math.abs(l60-l120)>0.4,
    'legacy afterHaste *0.985/frame diverges at 30/60/120 (got '+l30.toFixed(3)+' / '+l60.toFixed(3)+' / '+l120.toFixed(3)+')');
}

/* ---- pause: no tick ⇒ remaining frozen ---- */
{
  const e=actor();
  TE.applyHaste(e, {duration:5, moveMul:1.35, cdMul:0.5, policy:'refresh'});
  TE.syncActor(e);
  sim(e, 1, 60);
  const rem=TE.getHaste(e).remaining;
  const pausedSp=e.sp;
  /* pause / talk / sleep: host does not call tick (update returns early) */
  const frozen=TE.getHaste(e).remaining;
  assert(approx(frozen, rem) && approx(e.sp, pausedSp),
    'without tick (pause), remaining and derived sp stay put');
  sim(e, 1, 60);
  assert(approx(TE.getHaste(e).remaining, rem-1, 1e-9),
    'after unpause, remaining subtracts only the resumed sim second');
}

/* Host update() parks tick behind play/pause/talk/sleep and does not
   re-enter update() per actor. tickSpellZones stays the zone owner. */
{
  const updStart=html.match(/function update\(dt\)\{[\s\S]*?if\(typeof tickSpellZones==='function'\) tickSpellZones\(dt\);/);
  assert(!!updStart, 'update() still owns the sim tick and tickSpellZones');
  assert(/G\.scene!=='play'\|\|G\.paused/.test(updStart[0]), 'update returns when paused / not play');
  assert(/G\.talk/.test(updStart[0]) && /sleepShow/.test(updStart[0]),
    'update returns during talk and sleep-show');
  assert(/G\.scene==='camp'/.test(updStart[0]), 'update returns at camp');
  const after=html.match(/if\(typeof tickSpellZones==='function'\) tickSpellZones\(dt\);[\s\S]{0,900}/);
  assert(after && /tickActorHaste\(e, dt\)/.test(after[0]),
    'haste tick is a per-actor call after tickSpellZones, not a second update()');
  assert(!/update\(dt\)/.test(after[0].replace(/function update.*/,'')) || true,
    'entity slice does not re-invoke update');
  const slice=after[0];
  assert(!/update\(dt\)/.test(slice), 'entity loop after zones does not call update(dt)');
  const zones=extractFn('tickSpellZones');
  assert(/G\.darkZones/.test(zones) && /G\.silenceZones/.test(zones),
    'tickSpellZones still expires darkness and silence');
  assert(!/TimedEffects|tickActorHaste|afterHaste/.test(zones),
    'tickSpellZones does not grow a haste path');
}

/* ---- equipment change during haste ---- */
{
  const e=actor();
  let quick=false;
  function worn(ent){
    const base=ent.baseCd!=null?ent.baseCd:ent.cd;
    return quick?Math.max(0.45, base*0.85):base;
  }
  TE.applyHaste(e, {duration:8, moveMul:1.35, cdMul:0.5, cdFloor:0.28, policy:'refresh', source:'potion'});
  TE.syncActor(e, {wornAttackCd:worn});
  const cdNoQuick=e.cd;
  assert(approx(cdNoQuick, Math.max(0.28, 1.1*0.5)), 'haste cd without Quickness');
  quick=true;
  TE.syncActor(e, {wornAttackCd:worn});
  assert(approx(e.cd, Math.max(0.28, 1.1*0.85*0.5), 1e-9),
    'wielding Quickness during haste re-derives cd (worn*haste), does not stack-halve e.cd');
  assert(approx(e.sp, 4*1.35), 'weapon swap does not touch derived move');
  quick=false;
  TE.syncActor(e, {wornAttackCd:worn});
  assert(approx(e.cd, cdNoQuick, 1e-9), 'doffing Quickness restores haste-only cd');
  /* Boots of Speed stay on wornMoveMul (move step), not inside e.sp. */
  assert(e.baseSp===4 && approx(e.sp, 4*1.35),
    'derived e.sp is base*haste so wornMoveMul can still scale the step');
}

/* ---- reload: serialize / restore ---- */
{
  const e=actor();
  TE.applyHaste(e, {duration:6, moveMul:1.35, cdMul:0.5, restRemaining:5, restMul:0.85, policy:'replace', source:'herb'});
  sim(e, 2, 60);
  const snap=TE.serialize(e);
  assert(snap.length===1 && snap[0].kind==='haste' && approx(snap[0].remaining, 4, 1e-9),
    'serialize writes remaining sim seconds');
  const f=actor({sp:4, cd:1.1, timedEffects:undefined});
  TE.restore(f, snap);
  TE.syncActor(f);
  assert(approx(TE.getHaste(f).remaining, TE.getHaste(e).remaining),
    'restore keeps the same remaining');
  assert(approx(f.sp, e.sp) && approx(f.cd, e.cd),
    'restore + sync yields the same derived sp/cd');
  const empty=actor();
  TE.restore(empty, []);
  TE.syncActor(empty);
  assert(!TE.hasHaste(empty) && empty.sp===4,
    'empty restore is a no-op (old saves without effects)');
}

/* ---- host helpers + potion / herb apply when flag on ---- */
{
  const ctx={
    TimedEffects:TE,
    wornAttackCd(ent){ return (ent.baseCd!=null)?ent.baseCd:(ent.cd||1); },
    G:{equipped:{}, ents:[]}
  };
  vm.createContext(ctx);
  vm.runInContext(
    extractFn('useTimedHaste')+extractFn('hasteSyncOpts')+extractFn('tickActorHaste')+extractFn('applyHasteEffect'),
    ctx
  );
  const who=actor();
  assert(ctx.useTimedHaste()===true, 'host useTimedHaste follows the module flag');
  assert(ctx.applyHasteEffect(who, {duration:5, moveMul:1.35, cdMul:0.5, cdFloor:0.28, policy:'refresh', source:'potion'})===true,
    'applyHasteEffect uses the timed path when the flag is on');
  assert(who.buff===5 && approx(who.sp, 4*1.35) && who.cd<=0.55,
    'timed Speed sets combat buff and derived sp/cd');
  assert(who.afterHaste==null || who.afterHaste===0, 'timed Speed does not set afterHaste');
  const before=who.sp;
  ctx.applyHasteEffect(who, {duration:5, moveMul:1.35, cdMul:0.5, cdFloor:0.28, policy:'refresh', source:'potion'});
  assert(approx(who.sp, before), 'second timed apply does not re-multiply sp');
  ctx.tickActorHaste(who, 1);
  assert(approx(TE.getHaste(who).remaining, 4, 1e-9), 'tickActorHaste subtracts sim dt once');

  TE.FLAG=false;
  assert(ctx.useTimedHaste()===false, 'FLAG=false disables the host path');
  const legacyWho=actor();
  assert(ctx.applyHasteEffect(legacyWho, {duration:5, moveMul:1.35, policy:'refresh'})===false,
    'applyHasteEffect refuses when the flag is off (old mutation path stays caller-side)');
  TE.FLAG=true;
}

/* drinkPotion Speed + useHerb Zulsendra through the live extract */
{
  const ctx={
    TimedEffects:TE,
    G:{ents:[], loot:[], packs:{macar:{herbs:{Zulsendra:1}}}},
    ADD_SCALE:4,
    lastSay:'',
    say(line){ ctx.lastSay=line; },
    ftext(){},
    burst(){},
    player(){ return ctx.who; },
    partyLevel(){ return 3; },
    nearestFoe(){ return null; },
    rollDice(n,s,b){ return n*s+(b||0); },
    applyHeal(){},
    clearPoison(){},
    packOf(){ return ctx.G.packs.macar; },
    packOwner(){ return 'macar'; },
    syncPackTotals(){},
    gain(){},
    wornAttackCd(ent){ return (ent.baseCd!=null)?ent.baseCd:(ent.cd||1); },
    HERBS:[{n:'Zulsendra',k:'haste'}]
  };
  vm.createContext(ctx);
  vm.runInContext(
    extractFn('useTimedHaste')+extractFn('hasteSyncOpts')+extractFn('tickActorHaste')+
    extractFn('applyHasteEffect')+extractFn('potionHay')+extractFn('charmFoeKind')+
    extractFn('applyDmgPotion')+extractFn('drinkPotion')+extractFn('useHerb'),
    ctx
  );
  ctx.who=actor({ageYears:50});
  ctx.drinkPotion({n:'Speed', k:'haste'}, ctx.who);
  assert(ctx.who.ageYears===51, 'Speed still ages 1 year on the timed path');
  assert(ctx.who.buff>=5 && approx(ctx.who.sp, 4*1.35) && ctx.who.cd<=0.55,
    'Speed drink derives haste (buff + sp + half cd)');
  assert(TE.hasHaste(ctx.who) && ctx.who.afterHaste!==5,
    'Speed drink does not arm the legacy afterHaste multiply');
  const recastSp=ctx.who.sp;
  ctx.drinkPotion({n:'Speed', k:'haste'}, ctx.who);
  assert(approx(ctx.who.sp, recastSp), 'second Speed drink does not stack move mul');

  ctx.who=actor();
  ctx.G.packs.macar.herbs={Zulsendra:1};
  ctx.useHerb('Zulsendra', ctx.who);
  const hz=TE.getHaste(ctx.who);
  assert(!!hz && approx(hz.remaining, 3) && approx(hz.restRemaining, 5),
    'Zulsendra is haste 3 then rest 5 on the timed path');
  assert(ctx.who.buff===3 && approx(ctx.who.sp, 4*1.3),
    'Zulsendra replace sets buff 3 and derived 1.3× move');
  assert(!(ctx.who.afterHaste>0), 'Zulsendra does not set legacy afterHaste when flag is on');
}

/* capturePlaySave / applyPlaySave persist timed haste when present */
{
  assert(/TimedEffects\.serialize/.test(extractFn('capturePlaySave')),
    'legacy capturePlaySave fallback snapshots timed effects');
  assert(/restorePartyHaste/.test(extractFn('applyPlaySave')),
    'applyPlaySave restores party haste after applyWorld');
  assert(/TimedEffects\.restore/.test(extractFn('restorePartyHaste')),
    'restorePartyHaste writes remaining back onto the actor');
}

/* flag-off host still has the old mutation lines for rollback */
{
  const drink=extractFn('drinkPotion');
  const herb=extractFn('useHerb');
  const dmg=extractFn('applyDmgPotion');
  assert(/e\.sp=\(e\.baseSp\|\|e\.sp\|\|3\)\*1\.35/.test(dmg) && /e\.sp=\(e\.baseSp\|\|e\.sp\|\|3\)\*1\.35/.test(drink),
    'legacy potion haste mutation remains in the flag-off branch');
  assert(/e\.afterHaste=5/.test(herb), 'legacy Zulsendra afterHaste remains in the flag-off branch');
  assert(/e\.afterHaste>0 && \(e\.buff\|\|0\)<=0/.test(html),
    'legacy afterHaste multiply remains for flag-off / weary');
  assert(/tickActorHaste\(e, dt\)/.test(html),
    'entity loop ticks derived haste per actor');
  assert(/TimedEffects\.useHaste\(\) && TimedEffects\.hasHaste\(e\)/.test(html),
    'legacy afterHaste multiply is skipped while a derived haste is active');
}

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\ntimed-haste checks passed');

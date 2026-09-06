'use strict';
/**
 * Batch E: melee pursuer intent + reach / visibility + retreat ≠ boss win.
 * Run: node src/systems/EnemyIntent.test.js
 *
 * Balance: atkMax stays 0.42, impact at atkMax*0.55 (~0.189s), one swung
 * impact. Recover is stand-still while atk>0 — e.cd / e.atkMax are unchanged.
 * Leash 11 (boss 18) replaces infinite chase.
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.join(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

require('./SystemsReady.js');
require('./EnemyIntent.js');
const EI=globalThis.EnemyIntent;
const SR=globalThis.SystemsReady;

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
function extractThrough(name, until){
  const start=html.indexOf('function '+name+'(');
  if(start<0) throw new Error('missing '+name);
  const end=html.indexOf('\nfunction '+until+'(', start);
  if(end<0) throw new Error('missing end '+until);
  return html.slice(start, end);
}

/* ---- module / flag / host ---- */
assert(!!EI && typeof EI.decide==='function' && typeof EI.meleeClear==='function',
  'EnemyIntent exports decide / meleeClear');
assert(typeof EI.canSee==='function' && typeof EI.missileClear==='function' &&
  typeof EI.canWalkAt==='function' && typeof EI.inMeleeWant==='function',
  'separate predicates: visibility, missile, melee reach, walking');
assert(EI.FLAG===true, 'FLAG default is ON (rollback: FLAG=false or ?intent=0)');
assert(EI.use()===true, 'use() is true when FLAG is on');
assert(EI.DEFAULT_ATK_MAX===0.42 && EI.IMPACT_FRAC===0.55,
  'default swing 0.42s, impact at 0.55 of atkMax (~0.189s)');
assert(SR.has('EnemyIntent') && SR.get('EnemyIntent')===EI,
  'EnemyIntent declares on SystemsReady');
assert(SR.SHIPPED.indexOf('EnemyIntent')>=0, 'EnemyIntent is a shipped optional module');
assert(!/type\s*=\s*["']module["']/.test(html), 'index.html still has no type=module');
assert(!/Navigation\.(planRoute|tickFollower)/.test(fs.readFileSync(path.join(__dirname,'EnemyIntent.js'),'utf8')),
  'EnemyIntent does not call Navigation (foes stay on steerWalk)');
assert(!/beginFight\s*\(/.test(fs.readFileSync(path.join(__dirname,'EnemyIntent.js'),'utf8')),
  'EnemyIntent never calls beginFight');
assert(/src="src\/systems\/EnemyIntent\.js"/.test(html),
  'EnemyIntent is a classic sync tag');
assert(/function applyEnemyIntent\(/.test(html) && /function intentHost\(/.test(html),
  'host applies intent through existing steerWalk / atk machinery');
assert(/EnemyIntent\.decide\(e, dt, intentHost\(\)\)/.test(html),
  'only the foe decision branch consults EnemyIntent');
assert(/ASSET_VER='93'/.test(html), 'ASSET_VER is unchanged');

const head=html.slice(0, html.indexOf('<script>\n"use strict";'));
const navI=head.indexOf('src="src/systems/Navigation.js"');
const intentI=head.indexOf('src="src/systems/EnemyIntent.js"');
const inlineI=html.indexOf('<script>\n"use strict";');
assert(navI>=0 && intentI>navI && intentI<inlineI,
  'load order: Navigation → EnemyIntent → inline play loop');

assert(/atkMax:\.42/.test(html), 'ent() default atkMax remains 0.42');
assert(/!e\.swung&&e\.atk<e\.atkMax\*\.55/.test(html),
  'one impact when atk drops below 55% of atkMax');
assert(/e\.swung=1/.test(html) && /e\.swung=0/.test(html),
  'swung impact guard is still set and cleared');
assert(/e\._attack=\{fdx:e\.fdx, fdy:e\.fdy\}/.test(html),
  'attack start commits _attack facing');
assert(/e\._attack&&e\.atk>0\?e\._attack/.test(html) || /af=e\._attack&&e\.atk>0/.test(html),
  'meleeSwing uses committed _attack facing');
assert(/if\(e\.atk<=0\)\{ e\.swung=0; e\._attack=null; \}/.test(html),
  'swing end clears swung and _attack');

/* ---- predicates: nav clearance ≠ LOS ---- */
function makeGrid(w, h, fill){
  const g=[];
  for(let j=0;j<h;j++){
    g[j]=[];
    for(let i=0;i<w;i++) g[j][i]=fill==null?0:fill;
  }
  return g;
}
function collisionCtx(grid, extras){
  const ctx=Object.assign({
    G:{lvl:{w:grid[0].length, h:grid.length, grid}, ch:1, topologyRev:0},
    startCaveInBlocks(){ return false; }
  }, extras||{});
  vm.createContext(ctx);
  vm.runInContext(extractThrough('walk','move'), ctx);
  vm.runInContext(extractFn('tileBlocksSight')+extractFn('hasLOS'), ctx);
  return ctx;
}

const gob={team:'foe', kind:'goblin', dead:0, npc:0, ranged:0, web:0,
  r:0.3, range:0.8, aggro:7.5, x:2.5, y:3.5, sp:3.4, atk:0, atkMax:0.42,
  ct:0, swung:0, cd:0.8, fdx:1, fdy:0, name:'Goblin'};
const mac={team:'party', hero:1, dead:0, r:0.38, x:8.5, y:3.5, hp:40, maxhp:40};

{
  const grid=makeGrid(12, 8, 0);
  for(let j=0;j<8;j++) grid[j][5]=1;
  const ctx=collisionCtx(grid);
  const host={
    hasLOS:ctx.hasLOS, walk:ctx.walk, canBe:ctx.canBe,
    dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),
    inDarkZone(){ return false; },
    inSilence(){ return false; },
    ents:[gob, mac]
  };
  const from={x:3.5,y:3.5}, to={x:8.5,y:3.5};
  assert(ctx.hasLOS(from.x,from.y,to.x,to.y)===false, 'wall blocks LOS');
  assert(EI.canSee(from, to, host)===false, 'visibility follows LOS, not canBe');
  assert(EI.missileClear(from, to, host)===false, 'missile clearance follows walk(), not LOS');
  assert(EI.meleeClear(from, to, host)===false, 'melee reach is blocked through a wall');
  assert(ctx.canBe(3.5,3.5,0.3,gob)===true && ctx.canBe(8.5,3.5,0.38,mac)===true,
    'both ends are standable — walking ≠ seeing');
  assert(EI.canWalkAt(3.5, 3.5, gob, host)===true, 'canWalkAt uses canBe');
  assert(EI.canWalkAt(5.5, 3.5, gob, host)===false, 'canWalkAt refuses the wall cell');
}

{
  const grid=makeGrid(10, 8, 0);
  const ctx=collisionCtx(grid);
  const host={
    hasLOS:ctx.hasLOS, walk:ctx.walk, canBe:ctx.canBe,
    dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),
    inDarkZone(){ return false; }
  };
  const a={x:2.5,y:3.5}, b={x:6.5,y:3.5};
  assert(EI.canSee(a,b,host)===true, 'open hall is visible');
  assert(EI.missileClear(a,b,host)===true, 'open hall is missile-clear');
  assert(EI.meleeClear(a,b,host)===true, 'open hall is melee-clear');
}

/* dark zone: existing inDarkZone, close sense only */
{
  const grid=makeGrid(10, 8, 0);
  const ctx=collisionCtx(grid);
  const host={
    hasLOS:ctx.hasLOS, walk:ctx.walk,
    dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),
    inDarkZone(e){ return !!(e && e.dark); }
  };
  const from={x:2.5,y:3.5};
  const far={x:6.5,y:3.5, dark:1};
  const near={x:3.4,y:3.5, dark:1};
  assert(EI.canSee(from, far, host)===false, 'dark target beyond HEAR_R is not visible');
  assert(EI.canSee(from, near, host)===true, 'dark target inside HEAR_R is still sensed');
}

/* meleeSwing skips a through-wall target; attack math is unchanged */
{
  const grid=makeGrid(10, 8, 0);
  for(let j=0;j<8;j++) grid[j][4]=1;
  const ctx=collisionCtx(grid);
  const hits=[];
  const swingCtx=Object.assign({
    TAU:Math.PI*2,
    ang:(x,y)=>Math.atan2(y,x),
    dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),
    addAttack(){ hits.push('hit'); return 8; },
    damage(){},
    onHitFx(a,o,d){ return d; },
    wear(){},
    burst(){},
    ftext(){},
    shake(){},
    EnemyIntent:EI,
    G:{ents:[], hitstop:0, lvl:ctx.G.lvl}
  }, ctx);
  vm.createContext(swingCtx);
  vm.runInContext(extractFn('meleeSwing'), swingCtx);
  const atk={x:3.35,y:3.5,fdx:1,fdy:0,team:'foe',range:1.2,atk:0.2,atkMax:0.42,
    _attack:{fdx:1,fdy:0}, dmg:7};
  const def={x:5.15,y:3.5,team:'party',r:0.38,dead:0,npc:0,sleeping:0,kx:0,ky:0};
  swingCtx.G.ents=[atk, def];
  const d=Math.hypot(def.x-atk.x, def.y-atk.y);
  assert(d<=(atk.range+0.35+0.2+def.r), 'bodies are inside the existing swing radius');
  assert(swingCtx.hasLOS(atk.x,atk.y,def.x,def.y)===false, 'a wall sits between the bodies');
  swingCtx.meleeSwing(atk, 1.9, atk.range+0.35, atk.dmg);
  assert(hits.length===0, 'meleeSwing does not hit through a wall');

  const openGrid=makeGrid(10, 8, 0);
  const open=collisionCtx(openGrid);
  swingCtx.G.lvl=open.G.lvl;
  swingCtx.hasLOS=open.hasLOS;
  swingCtx.walk=open.walk;
  hits.length=0;
  swingCtx.meleeSwing(atk, 1.9, atk.range+0.35, atk.dmg);
  assert(hits.length===1, 'open floor still rolls addAttack once (math unchanged)');
}

/* ---- state machine: idle → pursue → attack → recover → return ---- */
function openHost(ents, extras){
  const grid=makeGrid(24, 16, 0);
  const ctx=collisionCtx(grid);
  return Object.assign({
    hasLOS:ctx.hasLOS, walk:ctx.walk, canBe:ctx.canBe,
    dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),
    inDarkZone(){ return false; },
    inSilence(){ return false; },
    ents:ents,
    nearestAlly(e){
      let b=null, bd=1e9;
      for(const o of ents){
        if(!o||o.team!=='party'||o.dead) continue;
        const d=Math.hypot(e.x-o.x,e.y-o.y);
        if(d<bd){ bd=d; b=o; }
      }
      return b;
    }
  }, extras||{});
}

function freshGob(x,y){
  return Object.assign({}, gob, {
    x:x, y:y, homeX:x, homeY:y, intent:null, intentAge:0, engaged:0,
    atk:0, ct:0, swung:0, lastSeenX:null, lastSeenY:null
  });
}

{
  const e=freshGob(2.5, 4.5);
  const p=Object.assign({}, mac, {x:20.5,y:4.5});
  const host=openHost([e,p]);
  const r=EI.decide(e, 0.016, host);
  assert(r.handled===true && r.act==='idle' && !r.attack,
    'far idle does not pursue and does not attack');
  assert(r.beginFight===false, 'idle suspicion does not request beginFight');
}

{
  const e=freshGob(2.5, 4.5);
  const p=Object.assign({}, mac, {x:5.2,y:4.5});
  const host=openHost([e,p]);
  const r=EI.decide(e, 0.016, host);
  assert(r.handled===true && r.act==='pursue' && r.move,
    'visible target inside aggro → pursue');
  assert(r.beginFight===false && !r.attack, 'pursue does not call beginFight or swing');
  assert(e.intent==='pursue', 'state is pursue');
}

{
  const e=freshGob(4.5, 4.5);
  const p=Object.assign({}, mac, {x:5.1,y:4.5});
  const host=openHost([e,p]);
  const r=EI.decide(e, 0.016, host);
  assert(r.act==='attack' && r.attack===p, 'in melee want + clear + ct ready → attack');
  assert(r.beginFight===false, 'attack intent still does not call beginFight');
}

{
  const e=freshGob(4.5, 4.5);
  e.atk=0.30; e.atkMax=0.42; e.swung=0;
  const p=Object.assign({}, mac, {x:8.5,y:4.5});
  const host=openHost([e,p]);
  const r=EI.decide(e, 0.016, host);
  assert(r.act==='recover' && r.holdFacing===true && !r.move && !r.attack,
    'live swing is a recover hold (commitment window)');
}

/* timing: 0.42s swing, one impact at ~0.189s, no extra cd */
{
  const atkMax=0.42;
  const impactAt=atkMax*(1-0.55);
  assert(Math.abs(atkMax*0.45-0.189)<0.002, 'impact elapsed is ~0.189s');
  let atk=atkMax, swung=0, impacts=0;
  const hzList=[30,60,120];
  hzList.forEach(hz=>{
    atk=atkMax; swung=0; impacts=0;
    const dt=1/hz;
    let t=0;
    while(t<0.50){
      atk-=dt;
      if(!swung && atk<atkMax*0.55){ swung=1; impacts++; }
      if(atk<=0){ swung=0; break; }
      t+=dt;
    }
    assert(impacts===1, hz+' Hz: exactly one impact per swing');
  });
  assert(EI.DEFAULT_ATK_MAX===0.42, 'pilot does not retune atkMax');
  const e=freshGob(4.5,4.5);
  e.cd=0.8; e.atk=0.2; e.atkMax=0.42;
  const p=Object.assign({}, mac, {x:5.0,y:4.5});
  const r=EI.decide(e, 1/60, openHost([e,p]));
  assert(r.act==='recover', 'recover does not start a second swing');
  assert(e.cd===0.8 && e.atkMax===0.42, 'recover does not mutate cd or atkMax');
}

/* 30/60/120 Hz: same elapsed time → same pursue/return hop */
{
  function runFor(total, dt){
    const e=freshGob(2.5, 4.5);
    const p=Object.assign({}, mac, {x:5.0,y:4.5});
    const host=openHost([e,p]);
    let last=null, t=0;
    while(t<total){
      last=EI.decide(e, dt, host);
      t+=dt;
    }
    return {e, last};
  }
  const a=runFor(0.20, 1/30);
  const b=runFor(0.20, 1/60);
  const c=runFor(0.20, 1/120);
  assert(a.e.intent==='pursue' && b.e.intent==='pursue' && c.e.intent==='pursue',
    '30/60/120 Hz stay in pursue after the same elapsed time');
}

/* lost LOS → investigate last-seen, then return home (no teleport) */
{
  const e=freshGob(2.5, 4.5);
  const p=Object.assign({}, mac, {x:5.0,y:4.5});
  const host=openHost([e,p]);
  EI.decide(e, 0.016, host);
  assert(e.intent==='pursue' && e.lastSeenX===p.x, 'pursue records last-seen');
  host.hasLOS=()=>false;
  host.canSee=undefined;
  let t=0, last=null;
  while(t<EI.LOST_T+0.05){
    last=EI.decide(e, 0.05, host);
    t+=0.05;
  }
  assert(e.intent==='investigate' && last.move,
    'lost LOS for LOST_T → investigate last-seen');
  e.x=e.lastSeenX; e.y=e.lastSeenY;
  last=EI.decide(e, 0.016, host);
  assert(e.intent==='return' && last.move && last.move.dx===e.homeX,
    'arrive last-seen without sight → return home');
  assert(e.x!==e.homeX || last.move, 'return walks — no coordinate assign');
}

/* leash: far chase flips to return */
{
  const e=freshGob(2.5, 4.5);
  const p=Object.assign({}, mac, {x:15.2,y:4.5});
  e.x=14.0; e.engaged=1; e.intent='pursue';
  const host=openHost([e,p]);
  const r=EI.decide(e, 0.016, host);
  assert(r.act==='return', 'beyond leash the pursuer returns (bounded)');
}

/* flag off */
{
  EI.FLAG=false;
  const r=EI.decide(freshGob(2.5,4.5), 0.016, openHost([]));
  assert(r.handled===false && EI.use()===false, '?intent=0 / FLAG off leaves legacy chase');
  EI.FLAG=true;
}

assert(EI.isMeleePursuer({team:'foe', ranged:1})===false, 'ranged foes are not this archetype');
assert(EI.isMeleePursuer({team:'foe', web:1})===false, 'web spitters stay on the host mix');
assert(EI.isMeleePursuer({team:'foe', fleeTo:{x:1,y:1}})===false, 'fleeTo / story path is excluded');
assert(EI.isMeleePursuer({team:'foe', npc:1})===false, 'neutral NPCs are excluded');
assert(EI.isMeleePursuer(gob)===true, 'a cave goblin is the melee pursuer');

/* ---- retreat ≠ boss victory; reload / return / genuine death ---- */
{
  const endSrc=extractFn('endFightIfClear');
  assert(/const bossWin=!!G\.fightBossDead/.test(endSrc),
    'bossWin requires fightBossDead, not fightWasBoss');
  assert(/won=\!\!\(G\.fightGotKill\|\|bossWin\)/.test(endSrc),
    'sting still uses fightGotKill||bossWin (bloodless flee is silent)');
  assert(/G\.fightBossDead=1/.test(html.match(/if\(e\.boss\)\{[\s\S]*?endFightIfClear/)[0]),
    'confirmed boss death sets fightBossDead');
  assert(/G\.fightBossDead=0/.test(extractFn('beginFight')),
    'beginFight clears fightBossDead (no leftover victory)');

  function fightVm(){
    const ctx={
      G:{fightOn:1, fightWasBoss:1, fightBossDead:0, fightGotKill:0, fightMercy:0,
        mercyTalk:0, mercyGoblinId:null, ents:[]},
      sfx:{stopBed(){ ctx.stopped=1; }, horn(k){ ctx.horn=k; }},
      bgm:{playSting(k){ ctx.sting=k; return true; }},
      syncMusic(){ ctx.synced=1; },
      player(){ return ctx.p; },
      dist(a,b){ return Math.hypot((a.x||0)-(b.x||0),(a.y||0)-(b.y||0)); }
    };
    vm.createContext(ctx);
    vm.runInContext(extractFn('livingFightFoes')+endSrc, ctx);
    return ctx;
  }

  const p={x:2,y:2,hero:1};
  const boss={team:'foe', boss:1, dead:0, npc:0, x:40, y:2, name:'RUBY WARDEN', hp:10};
  const minion={team:'foe', boss:0, dead:0, npc:0, x:40, y:3};

  /* retreat without a death */
  {
    const ctx=fightVm();
    ctx.p=p; ctx.G.ents=[boss, minion];
    ctx.endFightIfClear();
    assert(ctx.G.fightOn===0, 'retreat past livingFightFoes ends the clash');
    assert(ctx.sting==null && ctx.horn==null, 'retreat does not play boss/pack victory');
    assert(ctx.synced===1, 'retreat just resumes explore music');
    assert(boss.dead===0 && boss.hp===10, 'retreat does not kill or loot the boss');
  }

  /* reload: fight flags reset, boss still alive — no leftover win */
  {
    const saved={dead:boss.dead, hp:boss.hp, x:boss.x, y:boss.y, boss:1};
    const ctx=fightVm();
    ctx.G.fightOn=0; ctx.G.fightWasBoss=0; ctx.G.fightBossDead=0; ctx.G.fightGotKill=0;
    ctx.G.ents=[{team:'foe', boss:saved.boss, dead:saved.dead, npc:0,
      x:saved.x, y:saved.y, hp:saved.hp}];
    ctx.endFightIfClear();
    assert(ctx.sting==null && ctx.G.ents[0].dead===0,
      'reload after retreat: living boss, no victory');
  }

  /* return: close again, fight can restart; still no win until death */
  {
    const ctx=fightVm();
    ctx.p={x:39.5,y:2.2}; ctx.G.ents=[Object.assign({}, boss, {x:40,y:2,dead:0})];
    ctx.endFightIfClear();
    assert(ctx.G.fightOn===1, 'return to a living nearby boss keeps the fight open');
    assert(ctx.sting==null, 'return without death is not a boss win');
  }

  /* genuine death */
  {
    const ctx=fightVm();
    ctx.p=p;
    ctx.G.fightBossDead=1;
    ctx.G.fightGotKill=1;
    ctx.G.ents=[{team:'foe', boss:1, dead:1, npc:0, x:40, y:2}];
    ctx.endFightIfClear();
    assert(ctx.sting==='bossWin' && ctx.horn==='boss',
      'confirmed boss death awards boss victory sting / horn');
  }

  /* minion kill + retreat from a living boss is a pack win, not boss */
  {
    const ctx=fightVm();
    ctx.p=p;
    ctx.G.fightGotKill=1;
    ctx.G.fightBossDead=0;
    ctx.G.ents=[{team:'foe', boss:1, dead:0, npc:0, x:40, y:2}];
    ctx.endFightIfClear();
    assert(ctx.sting==='packWin' && ctx.horn==='pack',
      'killing a minion then leaving a living boss is a pack sting, not boss');
  }
}

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nenemy-intent melee pursuer checks passed');

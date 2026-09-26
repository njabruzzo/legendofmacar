'use strict';
/**
 * Dig and Search spend dungeon turns. AD&D 1e DMG: 1 on 1d6 every 3 turns.
 * Run: node src/dungeon/WanderCheck.test.js
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
function extractConst(name){
  const start=html.indexOf('const '+name+'=');
  if(start<0) throw new Error('missing '+name);
  let i=html.indexOf('{', start), depth=0;
  for(;i<html.length;i++){
    if(html[i]==='{') depth++;
    else if(html[i]==='}'){ depth--; if(depth===0) return html.slice(start, i+1); }
  }
  throw new Error('unclosed '+name);
}

assert(/AD&D 1st Edition Dungeon Masters Guide/.test(html), 'DMG wandering rule is cited');
assert(/p\.98/.test(html) && /p\.190/.test(html) && /check every three turns as normally/.test(html)
  && /Do not use the p\.47/.test(html),
  'the dungeon check cites p.98 and p.190 and refuses the outdoor rates');
assert(/RULING: digging is noisy/.test(html) && /RULING: herb Search is quiet/.test(html),
  'dig noise and herb time are marked as rulings');
assert(/const ENCOUNTER_RULES=/.test(html),
  'frequency, chance, and action costs live on ENCOUNTER_RULES');
assert(/everyTurns:3/.test(html) && /noisyEveryTurns:1/.test(html) && /restEveryTurns:6/.test(html)
  && /die:6/.test(html)
  && /encounterOn:1/.test(html) && /chance:1\/6/.test(html) && /turnMinutes:10/.test(html)
  && /loose:1/.test(html) && /packed:3/.test(html) && /softRock:6/.test(html)
  && /herbTurnsPer10ft:1/.test(html),
  'referee numbers are 1-in-6, every 3 turns, noisy every dig turn, rest every 6, dig 1/3/6, herb 1');
assert(/RULING \(Sage, 1e DMG Keeping Track of Time; Nick may override\)/.test(html),
  'the hourly camp-rest check is marked as Sage\'s ruling');
assert(/function completeDigSquare\(L\)/.test(html)
  && /const i=dig\.i, j=dig\.j;/.test(extractFn('completeDigSquare'))
  && /G\.dig=null;/.test(extractFn('completeDigSquare'))
  && extractFn('completeDigSquare').indexOf('const i=dig.i')<extractFn('completeDigSquare').indexOf('G.dig=null'),
  'a finished dig reads the square before clearing it');
assert(!/G\.dig=null;[\s\S]{0,120}G\.dig\.i/.test(html),
  'nothing reads G.dig after it is cleared');
assert(!/L\.wanderT>20/.test(html),
  'chapter 3 has no 20-second realtime wandering roll');
assert(/function forageHerbs\(src\)\{[\s\S]*?advanceDungeonTurns\(ENCOUNTER_RULES\.herbTurnsPer10ft\)/.test(html),
  'herb search spends one quiet turn per 10-foot area');
assert(/G\.secretSearch && \(p\.secretCd\|\|0\)<=0\)\{[\s\S]*?advanceDungeonTurns\(ENCOUNTER_RULES\.herbTurnsPer10ft\)/.test(html),
  'secret search spends the same quiet turn');
assert(/Wandering check: rolled /.test(extractFn('logWanderCheck')),
  'each roll is written for the combat log');

const ctx={
  G:{dungeonTurns:0, log:[], ents:[]},
  rolls:[],
  spawned:0,
  elf:0,
  lines:[],
  ri(){ const n=ctx.rolls.shift(); if(n==null) throw new Error('rng exhausted'); return n; },
  say(t){ ctx.lines.push(t); },
  player(){ return {x:10, y:10, hero:1}; },
  spawnWanderers(){ ctx.spawned++; return ['Rat','Rat']; },
  wearingElvenkind(){ return !!ctx.elf; }
};
vm.createContext(ctx);
vm.runInContext(
  extractConst('ENCOUNTER_RULES')+';\n'+
  extractFn('digTerrainAt')+'\n'+
  extractFn('digTerrainTurns')+'\n'+
  extractFn('wanderCheckHits')+'\n'+
  extractFn('logWanderCheck')+'\n'+
  extractFn('advanceDungeonTurns')+'\n'+
  'this.advanceDungeonTurns=advanceDungeonTurns; this.ENCOUNTER_RULES=ENCOUNTER_RULES; this.digTerrainTurns=digTerrainTurns; this.digTerrainAt=digTerrainAt;',
  ctx
);

const rules=ctx.ENCOUNTER_RULES;
assert(rules.everyTurns===3 && rules.noisyEveryTurns===1 && rules.restEveryTurns===6 && rules.die===6
  && rules.encounterOn===1 && Math.abs(rules.chance-1/6)<1e-9
  && rules.digTurns.loose===1 && rules.digTurns.packed===3 && rules.digTurns.softRock===6
  && rules.herbTurnsPer10ft===1 && rules.turnMinutes===10,
  'seeded checks use the referee 1-in-6 rules');
assert(ctx.digTerrainAt({},0,0)==='loose' && ctx.digTerrainTurns('loose')===1
  && ctx.digTerrainTurns('packed')===3 && ctx.digTerrainTurns('softRock')===6,
  'dig time defaults to loose and keeps packed and soft rock');

ctx.advanceDungeonTurns(rules.herbTurnsPer10ft);
ctx.advanceDungeonTurns(rules.herbTurnsPer10ft);
assert(ctx.G.dungeonTurns===2 && ctx.lines.length===0 && ctx.spawned===0,
  'two quiet herb turns bank without a check');

ctx.rolls=[4];
ctx.advanceDungeonTurns(rules.herbTurnsPer10ft);
assert(ctx.lines[0]==='Wandering check: rolled 4 on d6, no encounter',
  'the third herb turn logs a miss');
assert(ctx.spawned===0 && ctx.G.dungeonTurns===0, 'a miss does not spawn and clears the quiet bank');

ctx.lines=[];
ctx.rolls=[3];
ctx.advanceDungeonTurns(ctx.digTerrainTurns('loose'), 'noisy');
assert(ctx.lines[0]==='Wandering check: rolled 3 on d6, no encounter' && ctx.G.noisyTurns===0,
  'one loose dig checks immediately and does not touch the quiet bank');
assert(ctx.G.dungeonTurns===0, 'a noisy dig does not spend the quiet bank');

ctx.lines=[];
ctx.rolls=[2,5,6];
ctx.advanceDungeonTurns(ctx.digTerrainTurns('packed'), 'noisy');
assert(ctx.lines.length===3, 'packed earth checks once per turn, three times');

ctx.lines=[];
ctx.rolls=[4,4,4,4,4,1];
const spawnedBefore=ctx.spawned;
ctx.advanceDungeonTurns(ctx.digTerrainTurns('softRock'), 'noisy');
assert(ctx.lines.length===6 && ctx.spawned===spawnedBefore+1
  && /encounter: Rat, Rat/.test(ctx.lines[5]),
  'soft rock checks six times and the last 1 spawns');

ctx.lines=[];
ctx.rolls=[6];
for(let i=0;i<5;i++) ctx.advanceDungeonTurns(0.5);
assert(ctx.lines.length===0 && Math.abs(ctx.G.dungeonTurns-2.5)<1e-9,
  'short actions accumulate under three turns');
ctx.advanceDungeonTurns(0.5);
assert(ctx.lines[0]==='Wandering check: rolled 6 on d6, no encounter',
  'the accumulated half-turns still reach a check');

ctx.lines=[];
ctx.rolls=[1];
const quietSpawn=ctx.spawned;
ctx.advanceDungeonTurns(3);
assert(ctx.spawned===quietSpawn+1 && ctx.lines[0]==='Wandering check: rolled 1 on d6, encounter: Rat, Rat',
  'a 1 spawns from the wander table and logs the encounter');

ctx.elf=1;
ctx.lines=[];
ctx.rolls=[1];
const before=ctx.spawned;
ctx.advanceDungeonTurns(3);
assert(ctx.spawned===before && /rolled 1 on d6, no encounter/.test(ctx.lines[0]),
  'Elvenkind still spends the check and does not spawn');

ctx.rolls=[2,5];
ctx.elf=0;
ctx.lines=[];
ctx.G.dungeonTurns=0;
ctx.advanceDungeonTurns(6);
assert(ctx.lines.length===2
  && ctx.lines[0]==='Wandering check: rolled 2 on d6, no encounter'
  && ctx.lines[1]==='Wandering check: rolled 5 on d6, no encounter',
  'six turns roll twice and keep the seeded order');

ctx.broke=null;
ctx.breakRock=function(L,i,j){ ctx.broke=[i,j]; };
ctx.G.dig={i:3, j:8};
ctx.G.digBoost=1;
ctx.G.lvl={n:1, digTerrain:{}};
ctx.lines=[];
ctx.rolls=[4];
vm.runInContext(extractFn('completeDigSquare')+'\nthis.completeDigSquare=completeDigSquare;', ctx);
const spent=ctx.completeDigSquare(ctx.G.lvl);
assert(spent===1 && ctx.broke[0]===3 && ctx.broke[1]===8 && ctx.G.dig===null && ctx.G.digBoost===0,
  'completeDigSquare reads the square, breaks it, then clears the dig');
assert(ctx.lines.indexOf('Wandering check: rolled 4 on d6, no encounter')>=0,
  'the finished dig runs the noisy wandering roll');
assert(ctx.completeDigSquare(ctx.G.lvl)===0, 'a cleared dig does not throw');

ctx.G.restTurns=4;
ctx.G.dungeonTurns=2;
ctx.G.noisyTurns=1;
ctx.lines=[];
ctx.rolls=[3];
ctx.advanceDungeonTurns(rules.restEveryTurns, 'rest');
assert(ctx.lines.length===1 && ctx.G.restTurns===4
  && ctx.G.dungeonTurns===2 && ctx.G.noisyTurns===1,
  'a rest hour spends only the rest clock and keeps its leftover');
ctx.lines=[];
ctx.rolls=[2];
ctx.G.dungeonTurns=0;
ctx.G.noisyTurns=0;
ctx.advanceDungeonTurns(rules.herbTurnsPer10ft);
ctx.advanceDungeonTurns(ctx.digTerrainTurns('loose'), 'noisy');
assert(ctx.G.restTurns===4 && ctx.G.dungeonTurns===1 && ctx.G.noisyTurns===0
  && ctx.lines.length===1,
  'herb search and dig do not spend the rest clock');

ctx.G.restTurns=0;
ctx.G.dungeonTurns=2;
ctx.G.noisyTurns=1;
ctx.G.sleepShow=null;
ctx.G.fightOn=0;
ctx.G.day=3;
ctx.G.ents=[{team:'party', dead:0, hp:8, maxhp:8}];
ctx.nearestFoe=()=>null;
ctx.openPassagesAt=()=>true;
ctx.hint=()=>{};
ctx.clearPoison=()=>{};
ctx.restoreBorrowedGear=()=>0;
ctx.tryPordoomGifts=()=>{};
ctx.writeGameSave=()=>{};
ctx.shake=()=>{};
ctx.lines=[];
ctx.rolls=[4,4,4,4,4,4,4,4];
vm.runInContext(
  extractFn('restTurnsForHours')+'\n'+
  extractFn('campRestChecks')+'\n'+
  extractFn('campRest')+'\n'+
  'this.campRest=campRest; this.restTurnsForHours=restTurnsForHours;',
  ctx
);
assert(ctx.restTurnsForHours(8)===48 && ctx.restTurnsForHours(1)===6,
  'an hour of rest is 6 turns and a night is 48');
ctx.campRest();
const restRolls=ctx.lines.filter(l=>/^Wandering check: rolled /.test(l));
assert(restRolls.length===8 && restRolls.every(l=>/rolled 4 on d6, no encounter/.test(l)),
  'an 8-hour rest rolls once an hour, eight times');
assert(ctx.G.dungeonTurns===2 && ctx.G.noisyTurns===1 && ctx.G.restTurns===0 && ctx.G.day===4,
  'the night does not spend dig or herb time, and the rest leftover is zero');
assert(ctx.lines.some(l=>l==='The night passes. Nothing comes down the tunnel.'),
  'a quiet night still finishes the rest');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nwander check passed');

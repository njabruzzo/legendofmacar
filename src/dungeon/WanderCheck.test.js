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

assert(/AD&D 1st Edition Dungeon Masters Guide/.test(html), 'DMG wandering rule is cited as the placeholder source');
assert(/const ENCOUNTER_RULES=/.test(html) && /Placeholder encounter clock/.test(html),
  'frequency, chance, and action costs live on ENCOUNTER_RULES');
assert(/checkEveryTurns:3/.test(html) && /die:6/.test(html) && /encounterOn:1/.test(html)
  && /turnMinutes:10/.test(html) && /digTurns:1/.test(html) && /searchTurns:1/.test(html),
  'placeholder is 1-in-6 every 3 turns, one turn per Dig and herb Search');
assert(/advanceDungeonTurns\(ENCOUNTER_RULES\.digTurns\)/.test(html),
  'a finished dig spends dungeon turns');
assert(/function forageHerbs\(src\)\{[\s\S]*?advanceDungeonTurns\(ENCOUNTER_RULES\.searchTurns\)/.test(html),
  'herb search spends dungeon turns');
assert(/G\.secretSearch && \(p\.secretCd\|\|0\)<=0\)\{[\s\S]*?advanceDungeonTurns\(ENCOUNTER_RULES\.searchTurns\)/.test(html),
  'secret search spends dungeon turns');
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
  extractFn('wanderCheckHits')+'\n'+
  extractFn('logWanderCheck')+'\n'+
  extractFn('advanceDungeonTurns')+'\n'+
  'this.advanceDungeonTurns=advanceDungeonTurns; this.ENCOUNTER_RULES=ENCOUNTER_RULES;',
  ctx
);

assert(ctx.ENCOUNTER_RULES.checkEveryTurns===3 && ctx.ENCOUNTER_RULES.die===6
  && ctx.ENCOUNTER_RULES.encounterOn===1 && ctx.ENCOUNTER_RULES.digTurns===1
  && ctx.ENCOUNTER_RULES.searchTurns===1,
  'seeded checks use the placeholder 3-turn, 1-in-6 rules');

ctx.advanceDungeonTurns(1);
ctx.advanceDungeonTurns(1);
assert(ctx.G.dungeonTurns===2 && ctx.lines.length===0 && ctx.spawned===0,
  'two turns bank without a check');

ctx.rolls=[4];
ctx.advanceDungeonTurns(ctx.ENCOUNTER_RULES.digTurns);
assert(ctx.lines[0]==='Wandering check: rolled 4 on d6, no encounter',
  'the third dig turn logs a miss');
assert(ctx.spawned===0 && ctx.G.dungeonTurns===0, 'a miss does not spawn and clears the bank');

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
ctx.advanceDungeonTurns(3);
assert(ctx.spawned===1 && ctx.lines[0]==='Wandering check: rolled 1 on d6, encounter: Rat, Rat',
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

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nwander check passed');

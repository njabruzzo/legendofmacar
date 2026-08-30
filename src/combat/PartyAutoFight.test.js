'use strict';
/**
 * Living party kin close and attack when a foe is in the fight.
 * They do not wait for Macar to stand still and swing.
 * Run: node src/combat/PartyAutoFight.test.js
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
  if(!m) throw new Error('missing '+name);
  return m[0];
}

assert(/function kinCanAutoFight\(/.test(html), 'living-kin fight gate exists');
assert(/function foeInTheFight\(/.test(html), 'party threat helper exists');
assert(!/macarFighting/.test(html), 'kin no longer wait for Macar to stand and swing');
assert(/kinCanAutoFight\(e\)&&foeInTheFight\(\)/.test(html),
  'every living party dwarf auto-closes once a foe is in the fight');
assert(/e\.ranged\?9:6\.2/.test(html), 'auto-fight search is wide enough to walk into a pack');
assert(/e\.aim=foe/.test(html), 'closing kin keep the foe as aim so they face it');
assert(/threat && kinCanAutoFight\(e\)\) continue/.test(html),
  'fight heading lock no longer copies Macar facing onto swinging kin');
assert(/e\.sleeping\|\|e\.crushed\|\|e\.tied/.test(html),
  'crushed / sleeping / tied kin do not walk or swing');
assert(/Ghosts stay ghosts/.test(extractFn('kinCanAutoFight')),
  'Book I ghosts may auto-fight but stay ghosts');
assert(/noz\.team='neutral'/.test(html) && /noz\.npc=1/.test(html),
  'Noz after Untie stays ally/neutral, not a party fighter');
assert(/if\(e\.npc && e\.team!=='party'\)/.test(html),
  'neutral NPCs still skip the party combat brain');

const can=extractFn('kinCanAutoFight');
assert(/!e\.hero/.test(can) && /!e\.dead/.test(can) && /!e\.crushed/.test(can)
  && /!e\.sleeping/.test(can) && /!e\.tied/.test(can) && /!e\.hidden/.test(can),
  'auto-fight refuses hero / dead / crushed / sleeping / tied / hidden');

const threat=extractFn('foeInTheFight');
assert(/G\.fightOn/.test(threat) && /tileVisible/.test(threat) && /d<1\.45/.test(threat),
  'a foe counts if visible in radius, fightOn, or adjacent to the party');
assert(/o\.npc/.test(threat), 'neutral NPCs are not party threats');

const face=extractFn('faceVec');
assert(/kinCanAutoFight\(e\)/.test(face) && /e\.aim\.team==='foe'/.test(face),
  'closing kin face the foe, not Macar walk heading');
assert(/Party kin share Macar heading while they follow/.test(html),
  'out of combat they still form on Macar facing');

const ctx={
  G:{fightOn:0, ents:[]},
  dist(a,b){ return Math.hypot((a.x||0)-(b.x||0),(a.y||0)-(b.y||0)); },
  tileVisible(){ return true; }
};
vm.createContext(ctx);
vm.runInContext(extractFn('kinCanAutoFight')+extractFn('foeInTheFight'), ctx);

const mac={team:'party',hero:1,dead:0,ghost:0,x:10,y:10};
const pord={team:'party',hero:0,dead:0,ghost:0,crushed:0,sleeping:0,tied:0,hidden:0,x:10.4,y:10.2};
const ghost={team:'party',hero:0,dead:0,ghost:1,x:10.2,y:10.3};
const noz={team:'neutral',npc:1,name:'Noz',dead:0,x:11,y:10};
const gob={team:'foe',dead:0,npc:0,x:12.2,y:10.1};
ctx.G.ents=[mac,pord,ghost,noz,gob];

assert(ctx.kinCanAutoFight(pord)===true, 'living Pordum can auto-fight');
assert(ctx.kinCanAutoFight(mac)===false, 'Macar is not an auto-fight kin');
assert(ctx.kinCanAutoFight(ghost)===true, 'an up ghost kin still auto-closes (and stays a ghost)');
assert(ghost.ghost===1, 'auto-fight does not clear the ghost flag');
assert(ctx.kinCanAutoFight({team:'party',hero:0,tied:1})===false, 'tied kin do not auto-fight');
assert(ctx.kinCanAutoFight({team:'party',hero:0,sleeping:1})===false, 'sleeping kin do not auto-fight');
assert(ctx.kinCanAutoFight({team:'party',hero:0,crushed:1})===false, 'crushed kin do not auto-fight');
assert(ctx.kinCanAutoFight({team:'party',hero:0,dead:1})===false, 'dead kin do not auto-fight');

assert(ctx.foeInTheFight()===true, 'a visible goblin in radius is a fight');
gob.x=40; gob.y=40;
assert(ctx.foeInTheFight()===false, 'a distant unseen pack is not a fight');
gob.x=11.1; gob.y=10.2;
ctx.tileVisible=()=>false;
assert(ctx.foeInTheFight()===true, 'an adjacent goblin counts even if LOS is blocked');
gob.x=14; gob.y=10;
ctx.G.fightOn=1;
assert(ctx.foeInTheFight()===true, 'fightOn keeps kin closing while the pack is near');
ctx.G.fightOn=0;
ctx.tileVisible=()=>false;
assert(ctx.foeInTheFight()===false, 'a mid-range hidden foe without fightOn is not a fight');
noz.team='foe';
assert(ctx.foeInTheFight()===false, 'Noz tagged npc is not a foe-in-the-fight');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nparty auto-fight checks passed');

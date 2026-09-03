'use strict';
/**
 * Boots of Speed / Striding scale move(); Elvenkind boots+cloak share surprise hide.
 * Run: node src/combat/ElvenkindBoots.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
require('../packs/EquipmentSlots.js');
const Eq=globalThis.EquipmentSlots;
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

assert(/ASSET_VER='84'/.test(html), 'ASSET_VER is unchanged');
assert(/function wornMoveMul\(/.test(html) && /function moveStep\(/.test(html),
  'wornMoveMul and moveStep exist (extract of move())');
assert(/function wearingElvenkind\(/.test(html), 'shared wearingElvenkind helper exists');
assert(/wearingElvenkind/.test(extractFn('beginFight')),
  'beginFight hooks the existing surprise path through wearingElvenkind');
assert(/wearingElvenkind/.test(extractFn('wanderCheckHits')),
  'wanderCheckHits treats Elvenkind as silent');
assert(/wornMoveMul/.test(extractFn('moveStep')),
  'moveStep multiplies the existing e.sp step by wornMoveMul');
assert(!/e\.cd/.test(extractFn('wornMoveMul')) && !/e\.cd/.test(extractFn('moveStep')),
  'boot speed is not potion haste (no e.cd chop)');
assert(!/e\.invis\s*=/.test(extractFn('wearingElvenkind')),
  'Elvenkind does not set potion-style e.invis');
assert(!/specialtyHitBonus|specialtyInBand|SPECIALTY/.test(extractFn('wearingElvenkind')),
  'Elvenkind does not enter Specialty tot');

const ctx={
  G:{equipped:{}, ents:[]},
  lastSay:'',
  lines:[],
  rolls:[],
  player(){ return ctx.mac; },
  canBe(){ return true; },
  say(line){ ctx.lastSay=line; ctx.lines.push(line); },
  ri(){ return ctx.rolls.shift(); },
  entityAbil(){ return {dex:10,str:10}; },
  effectiveDex(){ return 10; },
  dexAttackAdj(){ return 0; },
  syncMusic(){},
  bgm:{cancelSting(){}},
  sfx:{startBed(){}},
  wearingElvenkind:null,
  wornMoveMul:null,
  moveStep:null,
  move:null,
  wanderCheckHits:null,
  beginFight:null
};
vm.createContext(ctx);
['wornMoveMul','wearingElvenkind','wearingLevitation','isHovering','moveStep','move','wanderCheckHits','beginFight'].forEach(n=>{
  vm.runInContext(extractFn(n), ctx);
});

const mac={name:'Macar', hero:1, team:'party', x:0, y:0, r:0.3, sp:3, cd:1.1, hp:80, maxhp:80, stun:0, ct:1};
ctx.mac=mac;
ctx.G.ents=[mac];

ctx.G.equipped={boots:{n:'Leather Boots', id:'macar_boots', k:'armor'}};
assert(ctx.wornMoveMul(mac)===1, 'starting Leather Boots stay 1×');
let step=ctx.moveStep(mac, mac.sp, 0, 1);
assert(step.x===3 && step.y===0, 'leather step is 1× e.sp (3)');

ctx.G.equipped={boots:{n:'Boots of Speed', k:'misc'}};
assert(ctx.wornMoveMul(mac)===2, 'Boots of Speed are 2×');
step=ctx.moveStep(mac, mac.sp, 0, 1);
assert(step.x===6 && step.y===0, 'Speed step is 2× e.sp (6)');
assert(mac.sp===3 && mac.cd===1.1, 'Speed does not mutate e.sp or e.cd');

mac.x=0; mac.y=0;
ctx.move(mac, mac.sp, 0, 1);
assert(mac.x===6, 'move() applies the Speed step');

ctx.G.equipped={boots:{n:'Leather Boots', id:'macar_boots'}};
mac.x=0;
ctx.move(mac, mac.sp, 0, 1);
assert(mac.x===3, 'doff Speed (Leather Boots) restores 1×');

ctx.G.equipped={boots:{n:'Boots of Striding and Springing', k:'misc'}};
assert(ctx.wornMoveMul(mac)===1.5, 'Striding is a modest 1.5× bump');
mac.x=0;
step=ctx.moveStep(mac, mac.sp, 0, 1);
assert(step.x===4.5, 'Striding step is 1.5× e.sp (4.5)');

ctx.G.equipped={boots:{n:'Boots of Levitation', k:'misc'}};
assert(ctx.wornMoveMul(mac)===1, 'Levitation does not add a fly move mul (no 3D jump)');
assert(ctx.wearingLevitation(mac) && ctx.isHovering(mac),
  'Levitation is a hover flag (pit skip), not a 3D jump');

ctx.G.equipped={boots:{n:'Boots of Elvenkind', k:'misc'}};
assert(ctx.wornMoveMul(mac)===1, 'Elvenkind boots do not double move');
assert(ctx.wearingElvenkind(mac)===true, 'Boots of Elvenkind count as hide');

ctx.G.equipped={necklace:{n:'Cloak of Elvenkind', k:'misc'}};
assert(ctx.wearingElvenkind(mac)===true, 'Cloak of Elvenkind counts as hide');

ctx.G.equipped={
  boots:{n:'Boots of Elvenkind', k:'misc'},
  necklace:{n:'Cloak of Elvenkind', k:'misc'}
};
assert(ctx.wearingElvenkind(mac)===true, 'boots+cloak share one hide (boolean, no stack)');

ctx.G.equipped={boots:{n:'Boots of Speed', k:'misc'}, necklace:{n:'Cloak of Displacement', k:'misc', plus:2}};
assert(ctx.wearingElvenkind(mac)===false, 'Speed + Displacement is not Elvenkind');

ctx.G.equipped={necklace:{n:'Cloak of Elvenkind', k:'misc'}};
ctx.rolls=[1,1];
const silent=ctx.wanderCheckHits();
assert(silent.hit===false && silent.silent===1,
  'Elvenkind is silent — wander checks miss');
ctx.G.equipped={boots:{n:'Leather Boots'}};
ctx.rolls=[1];
assert(ctx.wanderCheckHits().hit===true, 'without Elvenkind a 1 still hits a wander');
ctx.rolls=[2];
assert(ctx.wanderCheckHits().hit===false, 'without Elvenkind a 2 misses a wander');

function fightWith(eq, segs){
  ctx.G.equipped=eq;
  ctx.G.fightOn=0;
  mac.stun=0; mac.ct=1;
  const foe={name:'Goblin', team:'foe', dead:0, stun:0, sa:''};
  ctx.G.ents=[mac, foe];
  ctx.lines=[];
  ctx.rolls=segs.slice();
  ctx.beginFight(foe);
  return {lines:ctx.lines.slice(), macStun:mac.stun, foeStun:foe.stun};
}

/* pSeg=2, fSeg=2 would surprise both sides (1–2). Init 6 vs 1 is ours. */
const both=fightWith({boots:{n:'Leather Boots'}}, [2,2,6,1]);
assert(both.lines.some(l=>/Both sides are caught off-guard/.test(l)),
  'no Elvenkind: 2 and 2 is mutual surprise');

const hide=fightWith({boots:{n:'Boots of Elvenkind', k:'misc'}}, [2,2,6,1]);
assert(hide.lines.some(l=>/Surprise — you have/.test(l)),
  'Elvenkind skips being surprised and still surprises on 2 (elf 1–4)');
assert(!hide.lines.some(l=>/they have/.test(l)),
  'Elvenkind wearer is not surprised on a 2');
assert(hide.foeStun>0 && hide.macStun===0, 'Elvenkind grants the party the surprise segments');

const cloakHide=fightWith({necklace:{n:'Cloak of Elvenkind', k:'misc'}}, [2,5,4,4]);
assert(!cloakHide.lines.some(l=>/Surprise/.test(l)),
  'cloak skip-surprise: party 2 is ignored; foe 5 is outside elf 1–4');

const pair=fightWith({
  boots:{n:'Boots of Elvenkind', k:'misc'},
  necklace:{n:'Cloak of Elvenkind', k:'misc'}
}, [2,3,4,4]);
assert(pair.lines.some(l=>/Surprise — you have 3/.test(l)),
  'boots+cloak still one hide: foe 3 is an elf surprise, not a double bonus');

const sneak=fightWith({boots:{n:'Leather Boots'}}, [2,2,4,4]);
assert(sneak.lines.some(l=>/Both sides|Surprise/.test(l)), 'plain surprise path still runs');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nElvenkind / boot-speed checks passed');

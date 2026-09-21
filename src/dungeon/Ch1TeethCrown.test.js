'use strict';
/**
 * Chapter I east-corridor north-wall teeth chapel: secret placement, bone crown take/destroy,
 * 5000 XP, fanged-skeleton stats, one-thrall animate dead.
 * Run: node src/dungeon/Ch1TeethCrown.test.js
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

const ch1=html.match(/if\(n===1\)\{[\s\S]*?if\(n===2\)\{/)[0];
assert(/L\.w=132/.test(ch1), 'Ch1 canvas grows east for the teeth chapel');
assert(/kind:'teeth'/.test(ch1) && /face:'n'/.test(ch1),
  'teeth secret is on the north wall of the east corridor');
assert(/i:105,j:15,w:3,h:1/.test(ch1),
  'secret seals the north face of the east hall');
assert(/x:106\.5,y:15\.05/.test(ch1), 'SEARCH stand point is on the north wall');
assert(/north wall of the east corridor/.test(ch1),
  'hint names the north wall of the east corridor');
assert(!/far east wall of the drift/.test(ch1),
  'hint no longer points at the far-east dead-end');
assert(!/kind:'teeth'[\s\S]{0,180}face:'s'/.test(ch1),
  'teeth secret is not a south face');
assert(/kind:'treasure'/.test(ch1) && /face:'n'/.test(ch1),
  'north treasure secret stays');

assert(/function buildTeethCrownRoom\(/.test(html), 'teeth chapel builder exists');
assert(/function takeBoneCrown\(/.test(html) && /function destroyBoneCrown\(/.test(html),
  'take and destroy crown paths exist');
assert(/BONE_CROWN_DESTROY_XP=5000/.test(html), 'destroy awards 5000 XP');
assert(/FANGED_SKELETON_HORDE=8/.test(html), 'teeth rise as a horde');
assert(/HOUSE: Bone Crown animate dead/.test(html),
  'HOUSE comment records one-thrall animate-dead law');
assert(/one thrall at a time/.test(html) && /Once per corpse/.test(html),
  'HOUSE law is one thrall, once per corpse');
assert(/follow \/ fight nearest foe \/ stay/.test(html),
  'thrall commands are follow, fight nearest foe, stay');
assert(/ASSET_VER='103'/.test(html) && !/ASSET_VER='104'/.test(html),
  'ASSET_VER is 103 — bone crown and tooth props bound');
assert(/bone_crown:'assets\/props\/prop_bone_crown\.png'/.test(html),
  'bone_crown is registered to the painted prop');
assert(/tooth:'assets\/props\/prop_tooth\.png'/.test(html)
  && /tooth_2:'assets\/props\/prop_tooth_2\.png'/.test(html)
  && /tooth_3:'assets\/props\/prop_tooth_3\.png'/.test(html),
  'tooth sprites are registered');
['prop_bone_crown.png','prop_tooth.png','prop_tooth_2.png','prop_tooth_3.png'].forEach(n=>{
  assert(fs.existsSync(path.join(__dirname,'../../assets/props/'+n)), n+' on disk');
});
assert(/function drawProceduralFang\(/.test(html) && /function crownSprite\(/.test(html)
  && /function toothSprite\(/.test(html),
  'crown and tooth share a painted fallback path');
assert(/SPR\.demon_dwarfface\|\|SPR\.demonface\|\|SPR\.dwarfface/.test(html),
  'demon face hooks Disney SIGNED, falls back to dwarfface');
assert(/SPR\.bone_crown\|\|SPR\.bone_crown_signed/.test(html)
  || /function crownSprite\(/.test(html),
  'bone crown hooks the painted sheet when it lands');
assert(/k:'altar'/.test(extractFn('buildTeethCrownRoom')) && /k:'bonecrown'/.test(extractFn('buildTeethCrownRoom')),
  'chapel plants the existing altar and a bone crown');
assert(/k:'demonface'/.test(extractFn('buildTeethCrownRoom')),
  'back wall gets a demonic dwarven face');
assert(/const x0=101, y0=2, rw=12, rh=12/.test(extractFn('buildTeethCrownRoom')),
  'chapel is carved north of the east-hall door');
assert(/wall:'n'/.test(extractFn('buildTeethCrownRoom')),
  'demon face sits on the chapel north wall');
assert(!/x0=116, y0=16/.test(extractFn('buildTeethCrownRoom')),
  'old east-of-door chapel coords are gone');
assert(/sec\.kind==='teeth'/.test(html) && /buildTeethCrownRoom\(L, sec\)/.test(html),
  'openSecret branches to the teeth chapel');
assert(/Take the bone crown/.test(html) && /Animate the dead/.test(html),
  'TAKE and animate-dead prompts exist');
assert(/Attack the bone crown/.test(html), 'ATTACK crown prompt exists');
assert(/crownTouched/.test(html) && /teethRisen/.test(html) && /crownDestroyed/.test(html),
  'Sage one-shot flags are crownTouched / teethRisen / crownDestroyed');
assert(/tryStrikeBoneCrown/.test(extractFn('meleeSwing')),
  'ATTACK can smash the crown');

const fang=html.match(/fangedSkeleton:\{[^}]+\}/)[0];
assert(/hd:2/.test(fang), 'fanged skeleton is 2 HD');
assert(/ac:7/.test(fang), 'fanged skeleton AC 7');
assert(/mv:12/.test(fang) && /at:1/.test(fang), 'fanged skeleton MV 12, AT 1');
assert(/tt:'Nil'/.test(fang), 'fanged skeleton tt is Nil (coins-always still applies)');
assert(/dmg:4\.5/.test(fang) && /dice:'1d6\+1'/.test(fang),
  'fanged skeleton damage is d6+1');
assert(/n:'Fanged Skeleton'/.test(fang), 'Nick name is Fanged Skeleton');
assert(/k:'undead'/.test(fang), 'fanged skeleton is undead');
assert(/awardPartyXp\(monsterXpValue\(e\)/.test(html),
  'kills use monsterXpValue (2 HD table)');

let eid=1;
const ctx={
  G:{equipped:{}, ents:[], props:[], lvl:{n:1,flags:{},w:132,h:90,grid:null}, packs:{macar:{magic:[]}}},
  BONE_CROWN_DESTROY_XP:5000,
  FANGED_SKELETON_HORDE:8,
  FOE:{fangedSkeleton(){ return {id:eid++, kind:'undead', name:'Fanged Skeleton', team:'foe', x:0,y:0, hp:16, maxhp:16, dead:0, hd:2, ac:7, dmg:4.5, dice:'1d6+1'}; }},
  lines:[],
  hints:[],
  xpAwards:[],
  Math,
  Object,
  dist(a,b){ return Math.hypot((a.x||0)-(b.x||0),(a.y||0)-(b.y||0)); },
  say(t){ ctx.lines.push(t); },
  hint(t){ ctx.hints.push(t); },
  burst(){},
  shake(){},
  ftext(){},
  awardPartyXp(n, why, where){ ctx.xpAwards.push({n, why, where}); return n; },
  stowPackItem(it){ ctx.G.packs.macar.magic.push(it); return it; },
  equipPackItem(it){ ctx.G.equipped.helmet=it; return 'helmet'; },
  h2(){ return 0.4; },
  corridor(){},
  carvePath(){},
  rect(){},
  player(){ return (ctx.G.ents||[]).find(e=>e&&e.hero)||ctx.G.ents[0]; }
};
vm.createContext(ctx);
ctx.beginFight=function(){};
[
  'teethBounds','isTeethFloor','makeBoneCrownItem','wearingBoneCrown','nearestBoneCrown',
  'livingThrall','releaseThrall','isAnimateDeadEligible','corpseIsBones','nearestAnimatableCorpse',
  'collapseCrownThrall','setThrallStay','tryAnimateDead','riseTeethHorde','takeBoneCrown','awardCrownDestroyXp',
  'destroyBoneCrown','tryStrikeBoneCrown','smashWornBoneCrown','doffBoneCrownAtCamp',
  'buildTeethCrownRoom','tryTalporTurnThrall'
].forEach(n=>vm.runInContext(extractFn(n)+';', ctx));

const crownItem=ctx.makeBoneCrownItem();
assert(crownItem.boneCrown===1 && crownItem.slot==='helmet', 'crown item is a worn helm');
assert(ctx.wearingBoneCrown({helmet:crownItem})===true, 'wearingBoneCrown reads the item');
assert(ctx.wearingBoneCrown({helmet:{n:'Iron Helm'}})===false, 'iron helm is not the bone crown');

const altarCrown={x:125,y:21,k:'bonecrown',gone:0};
ctx.G.props=[altarCrown];
ctx.G.ents=[{id:1, hero:1, name:'Macar', team:'party', col:{key:'macar'}, x:124, y:21, hp:80, maxhp:80}];
const take=ctx.takeBoneCrown(altarCrown);
assert(take.ok===1 && take.worn===1, 'TAKE seats the crown');
assert(altarCrown.gone===1 && ctx.G.lvl.flags.crownTaken===1, 'taken crown is spent');
assert(ctx.G.lvl.flags.crownTouched===1, 'TAKE sets crownTouched');
assert(ctx.G.equipped.helmet && ctx.G.equipped.helmet.boneCrown, 'crown is on Macar\'s head');
assert(ctx.G.lvl.flags.teethRisen===1, 'TAKE raises the teeth horde');
assert(ctx.G.ents.filter(e=>e.name==='Fanged Skeleton').length===8,
  'TAKE horde is eight fanged skeletons');
assert(ctx.xpAwards.length===0, 'TAKE does not award the destroy XP');

ctx.G.lvl.flags={};
ctx.G.ents=[{id:1, hero:1, name:'Macar', team:'party', col:{key:'macar'}, x:124, y:21, hp:80, maxhp:80}];
ctx.G.equipped={};
ctx.G.props=[];
ctx.xpAwards=[];
const smash={x:125,y:21,k:'bonecrown',gone:0};
const dest=ctx.destroyBoneCrown(smash);
assert(dest.ok===1 && dest.xp===5000, 'ATTACK/DESTROY awards 5000 XP');
assert(smash.gone===1 && smash.destroyed===1, 'destroyed crown is gone');
assert(ctx.G.lvl.flags.crownDestroyed===1, 'destroy flag is set');
assert(ctx.xpAwards[0] && ctx.xpAwards[0].n===5000, 'awardPartyXp got 5000');
assert(/Bone Crown destroyed/.test(ctx.xpAwards[0].why), 'XP reason names the crown');
assert(ctx.G.equipped.helmet==null, 'destroy does not wear the crown');
assert(ctx.G.ents.filter(e=>e.name==='Fanged Skeleton').length===8,
  'DESTROY still raises the same horde');

const sk=ctx.FOE.fangedSkeleton();
assert(sk.hd===2 && sk.ac===7 && sk.dmg===4.5 && sk.dice==='1d6+1',
  'spawned skeleton carries Nick stats');

ctx.G.thrallId=null;
ctx.G.equipped={helmet:crownItem};
const beetle={id:39, name:'Cave Beetle', kind:'beetle', team:'foe', dead:1, corpse:1, x:125, y:21, hp:0, maxhp:40};
assert(ctx.isAnimateDeadEligible(beetle)===false, 'beetle corpses are not humanoid bones');
assert(ctx.tryAnimateDead(ctx.G.ents[0], beetle).reason==='ineligible', 'beetle is refused');
const body={id:40, name:'Goblin', kind:'goblin', team:'foe', dead:1, corpse:1, x:125, y:21, hp:0, maxhp:22};
ctx.G.ents=[ctx.G.ents[0], body];
const raised=ctx.tryAnimateDead(ctx.G.ents[0], body);
assert(raised.ok===1 && body.thrall===1 && body.team==='party', 'crown raises one thrall');
assert(raised.form==='zombie', 'flesh corpse rises as a zombie');
assert(ctx.G.thrallId===40 && ctx.livingThrall()===body, 'thrall occupies the one slot');
assert(ctx.setThrallStay(1).stay===true && body.thrallStay===1, 'thrall can stay');
assert(ctx.setThrallStay(0).stay===false && !body.thrallStay, 'thrall can follow again');
const body2={id:41, name:'Orc', kind:'orc', team:'foe', dead:1, corpse:1, x:126, y:21, hp:0, maxhp:42};
ctx.G.ents.push(body2);
const blocked=ctx.tryAnimateDead(ctx.G.ents[0], body2);
assert(blocked.ok===0 && blocked.reason==='slot-full', 'second animate is refused');
body.dead=1; body.hp=0;
ctx.releaseThrall(body);
assert(ctx.livingThrall()===null && ctx.G.thrallId==null, 'thrall death frees the slot');
assert(ctx.tryAnimateDead(ctx.G.ents[0], body).reason==='spent',
  'the same corpse cannot be raised twice');
const again=ctx.tryAnimateDead(ctx.G.ents[0], body2);
assert(again.ok===1 && ctx.G.thrallId===41, 'a new corpse can be raised after the slot frees');
assert(ctx.tryAnimateDead(ctx.G.ents[0], {id:9, hero:1, col:{key:'macar'}, dead:1, corpse:1}).reason==='kin',
  'kin corpses are not animated');

ctx.G.equipped={helmet:crownItem};
ctx.G.thrallId=41;
const pet={id:41, name:'Orc', kind:'orc', team:'party', dead:0, thrall:1, x:126, y:21, hp:42, maxhp:42};
ctx.G.ents=[
  {id:1, hero:1, name:'Macar', team:'party', col:{key:'macar'}, x:124, y:21, hp:80, maxhp:80},
  pet,
  {id:7, col:{key:'talpor'}, name:'TALPOR', team:'party', x:126, y:21, dead:0}
];
const turned=ctx.tryTalporTurnThrall();
assert(turned.ok===1 && ctx.G.thrallId==null && pet.dead===1, 'Talpor can turn Macar\'s own crown pet');

ctx.G.equipped={helmet:crownItem};
ctx.G.lvl.flags={crownXp:1};
ctx.xpAwards=[];
const smashWorn=ctx.smashWornBoneCrown();
assert(smashWorn.ok===1, 'worn crown can be shattered');
assert(ctx.xpAwards.length===0, 'destroy XP awards only once');
assert(ctx.G.equipped.helmet==null, 'smash clears the worn helm');

ctx.G.equipped={helmet:crownItem};
ctx.G.thrallId=null;
const skel={id:50, name:'Fanged Skeleton', kind:'undead', team:'foe', dead:1, corpse:1, x:125, y:21, hp:0, maxhp:16};
ctx.G.ents=[ctx.G.ents[0], skel];
const boneRaise=ctx.tryAnimateDead(ctx.G.ents[0], skel);
assert(boneRaise.ok===1 && boneRaise.form==='skeleton', 'bone corpse rises as a skeleton');
ctx.G.packs={macar:{magic:[]}};
const doff=ctx.doffBoneCrownAtCamp();
assert(doff.ok===1 && ctx.G.equipped.helmet==null, 'camp doffs the crown in one turn');
assert(ctx.G.thrallId==null, 'doff collapses the commanded dead');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nch1 teeth crown checks passed');

'use strict';
/**
 * Leftover table magic that already had an engine hook: Vorpal, Bag of Holding,
 * levitation/fly hover, Arrow of Slaying, Javelin of Lightning, Quickness, Life Stealer.
 * Run: node src/combat/LeftoverMagic.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
require('../packs/EquipmentSlots.js');
require('../props/DwarfMouth.js');
const Eq=globalThis.EquipmentSlots;
const M=globalThis.DwarfMouth;
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

assert(/ASSET_VER='85'/.test(html), 'ASSET_VER is unchanged');
assert(!/id:'vorpal'|id:'bag_of_holding'|id:'arrow_of_slaying'|id:'javelin_of_lightning'/.test(html),
  'no invented leftover-magic item ids');

assert(/function applyVorpalHit\(/.test(html) && /function applyLifeStealHit\(/.test(html),
  'vorpal and life-steal hit helpers exist');
assert(/function wornAttackCd\(/.test(html) && /function isHovering\(/.test(html),
  'quickness cd and hover helpers exist');
assert(/function packItemCap\(/.test(html) && /function packHasHolding\(/.test(html),
  'bag-of-holding pack helpers exist');
assert(/No pack item\/weight cap exists/.test(html),
  'packItemCap documents that no cap exists — skip raising one');

assert(/applyVorpalHit\(atk, def, roll\)/.test(extractFn('addAttack')),
  'addAttack hooks vorpal on a confirmed hit');
assert(/applyLifeStealHit\(atk\)/.test(extractFn('addAttack')),
  'addAttack hooks life steal on a confirmed hit');
assert(/macE\.cd=wornAttackCd\(macE\)/.test(extractFn('applyEquipped')),
  'applyEquipped lowers e.cd while Quickness is wielded');
assert(/applyHoverFlags\(macE\)/.test(extractFn('applyEquipped')),
  'applyEquipped sets hover/fly from Levitation boots');
assert(/e\.fly=1; e\.hover=1; e\.flyPotion=1/.test(extractFn('drinkPotion')),
  'fly potion sets e.fly / hover (no z-height on this mover)');
assert(/isHovering\(e\)/.test(html) && /hovers over the pit/.test(html),
  'hover skips pit tiles that use fall damage');
assert(/fallDamageAmt\(e,16\)/.test(html),
  'Feather Falling still zeros pit fall through fallDamageAmt');
assert(/wornAttackCd\(e\)/.test(html.match(/e\.atk=e\.atkMax; e\.ct=[\s\S]*?e\.swung=0/)[0]),
  'swing cooldown reads wornAttackCd');
assert(!/e\.cd=\(.*\*0\.5/.test(extractFn('wornAttackCd')),
  'quickness is not full potion haste (no half-cd)');
assert(/bag of holding/i.test(extractFn('useMagicItem')) && !/bag of holding[\s\S]{0,120}applyHeal/.test(extractFn('useMagicItem')),
  'Bag of Holding use says capacity; does not buff+heal');

/* No pack item/weight/count cap exists in this engine. Bag of Holding cannot
   raise one while packed. packItemCap stays 0; use only says the extra room. */
assert(/return 0;/.test(extractFn('packItemCap')),
  'packItemCap returns 0 — no cap to raise (skip)');

const vorpalRow=html.match(/\{a:89,b:90,n:'Vorpal Sword'[^}]+\}/);
assert(!!vorpalRow && /plus:3/.test(vorpalRow[0]) && !/id:'/.test(vorpalRow[0]) && !/vs:/.test(vorpalRow[0]),
  'Vorpal table row stays plus:3 with no invented id or vs token');
assert(/n:'Short Sword of Quickness \+2',k:'weapon',plus:2/.test(html),
  'Quickness table row stays plus:2');
assert(/n:'Sword of Life Stealing',k:'weapon',plus:2/.test(html),
  'Life Stealer table row stays plus:2');
assert(/n:'Bag of Holding',k:'misc'/.test(html) && !/Bag of Holding'[^}]*id:'/.test(html),
  'Bag of Holding table row stays k:misc with no invented id');
assert(/n:'Arrow of Slaying',k:'ammo',plus:3/.test(html),
  'Arrow of Slaying table row stays k:ammo plus:3');
assert(/n:'Javelin of Lightning',k:'ammo',plus:2/.test(html),
  'Javelin of Lightning table row stays k:ammo plus:2');
assert(/n:'Long Sword \+1, Luck Blade'[^}]*plus:1/.test(html) && !/function applyWish|wishes-as-chat/.test(html),
  'Luck Blade stays plus-only (no wishes-as-chat)');
assert(/Nine Lives Stealer'[^}]*plus:2/.test(html),
  'Nine Lives Stealer stays plus-only on this slice');

const ctx={
  G:{equipped:{}, ents:[], packs:{macar:{magic:[]}}},
  ADD_SCALE:4,
  EquipmentSlots:Eq,
  DwarfMouth:M,
  lastSay:'',
  says:[],
  healed:0,
  healN:0,
  dmg:0,
  say(line){ ctx.lastSay=line; ctx.says.push(line); },
  ftext(){},
  burst(){},
  player(){ return ctx.who; },
  nearestFoe(){ return ctx.foe; },
  rollDice(n,s,b){ return n*s+(b||0); },
  damage(t, dmg){ ctx.dmg+=(dmg||0); if(t&&t.hp!=null) t.hp-=(dmg||0); },
  applyHeal(e, n){
    ctx.healN+=(n||0);
    const amt=Math.round((n||0)*ctx.ADD_SCALE);
    ctx.healed+=amt;
    if(e) e.hp=Math.min(e.maxhp||999, (e.hp||0)+amt);
    return amt;
  },
  isUndeadFoe(e){ return !!(M&&M.isUndeadFoe&&M.isUndeadFoe(e)); },
  wepMult(){ return 1; }
};
vm.createContext(ctx);
[
  'wearingLevitation','isHovering','applyHoverFlags','wornPrimaryWeapon',
  'isVorpalWeapon','isQuicknessWeapon','isLifeStealerWeapon','isLivingFoe',
  'maxWeaponDice','applyVorpalHit','applyLifeStealHit','wornAttackCd','wornMoveMul',
  'packItemCap','packHasHolding','slayingTypeFromName','foeMatchesSlayingType'
].forEach(n=>vm.runInContext(extractFn(n), ctx));

assert(ctx.maxWeaponDice('1d8')===8 && ctx.maxWeaponDice('2d6')===12, 'max weapon dice reads NdS');
assert(ctx.packItemCap({})===0, 'packItemCap is 0 — no item/weight cap to raise');
assert(ctx.packHasHolding({magic:[{n:'Bag of Holding', k:'misc'}]}), 'packHasHolding sees a packed bag');
assert(!ctx.packHasHolding({magic:[{n:'Alchemy Jug', k:'misc'}]}), 'other misc is not a holding bag');

const who={name:'Macar', hero:1, team:'party', hp:40, maxhp:80, cd:1.05, baseCd:1.05, dice:'1d8', x:1, y:1};
ctx.who=who;
ctx.G.ents=[who];

const vorpal={n:'Vorpal Sword', k:'weapon', plus:3, dice:'1d8'};
ctx.G.equipped={primary:vorpal, weapon:vorpal};
const gob={name:'Goblin', kind:'goblin', team:'foe', hp:44, maxhp:44, boss:0, x:2, y:1};
assert(ctx.isLivingFoe(gob), 'goblin is living');
assert(ctx.applyVorpalHit(who, gob, 18)===0 && gob.hp===44, 'vorpal on a non-20 does nothing');
const vExtra=ctx.applyVorpalHit(who, gob, 20);
assert(gob.hp===0, 'vorpal nat-20 vs living non-boss sets hp=0');
assert(vExtra===16, 'vorpal extra is max dice ×2 (8×2) even on a kill (got '+vExtra+')');
assert(/neck severs/.test(ctx.lastSay), 'vorpal kill speaks the sever line');

const boss={name:'RUBY WARDEN', kind:'warden', team:'foe', hp:640, maxhp:640, boss:1, x:3, y:1};
const bExtra=ctx.applyVorpalHit(who, boss, 20);
assert(boss.hp===640, 'vorpal vs boss does not instakill');
assert(bExtra===16, 'vorpal vs boss is extra max-dice ×2 only');

const wight={name:'Dead Kin', kind:'undead', team:'foe', hp:52, maxhp:52, boss:0};
assert(!ctx.isLivingFoe(wight), 'undead is not living');
assert(ctx.applyVorpalHit(who, wight, 20)===16 && wight.hp===52, 'vorpal vs undead is extra only');

const golem={name:'Brass Guardian', kind:'golem', team:'foe', hp:180, maxhp:180, boss:0};
assert(!ctx.isLivingFoe(golem), 'golem/construct is not living');
assert(ctx.applyVorpalHit(who, golem, 20)===16 && golem.hp===180, 'vorpal vs construct is extra only');

who.ranged=1;
assert(ctx.applyVorpalHit(who, gob, 20)===0, 'vorpal does not fire on a missile');
who.ranged=0;

const hammer={n:"Macar's War Hammer", k:'weapon', plus:0, dice:'1d8'};
ctx.G.equipped={primary:hammer, weapon:hammer};
const gob2={name:'Goblin', kind:'goblin', hp:44, boss:0};
assert(ctx.applyVorpalHit(who, gob2, 20)===0 && gob2.hp===44, 'mundane hammer is not vorpal');

const steal={n:'Sword of Life Stealing', k:'weapon', plus:2};
ctx.G.equipped={primary:steal, weapon:steal};
who.hp=40; ctx.healed=0; ctx.healN=0;
const band=ctx.applyLifeStealHit(who);
assert(ctx.healN===1, 'Life Stealer heals 1 band');
assert(band===4 && who.hp===44, '1 band is applyHeal(e,1) → 4 hp at ADD_SCALE 4');
who.ranged=1; ctx.healN=0; who.hp=40;
assert(ctx.applyLifeStealHit(who)===0 && ctx.healN===0, 'Life Stealer does not heal on a missile');
who.ranged=0;
ctx.G.equipped={primary:hammer, weapon:hammer};
ctx.healN=0;
assert(ctx.applyLifeStealHit(who)===0, 'mundane hammer is not a life stealer');

const quick={n:'Short Sword of Quickness +2', k:'weapon', plus:2};
ctx.G.equipped={primary:quick, weapon:quick};
const qcd=ctx.wornAttackCd(who);
assert(qcd<who.baseCd && qcd>=0.45 && qcd>who.baseCd*0.5,
  'Quickness is a mild e.cd trim (got '+qcd+' from base '+who.baseCd+')');
assert(Math.abs(qcd-who.baseCd*0.85)<1e-9, 'Quickness is 85% of base cd, not potion half');
ctx.G.equipped={primary:hammer, weapon:hammer};
assert(ctx.wornAttackCd(who)===who.baseCd, 'doffing Quickness restores base cd');

ctx.G.equipped={boots:{n:'Boots of Levitation', k:'misc'}};
assert(ctx.wearingLevitation(who), 'Levitation boots count as worn hover');
assert(ctx.isHovering(who), 'wearing Levitation is hovering');
ctx.applyHoverFlags(who);
assert(who.hover===1 && who.fly===1, 'applyHoverFlags sets e.hover and e.fly');
ctx.G.equipped={boots:{n:'Leather Boots'}};
ctx.applyHoverFlags(who);
assert(!who.hover && !who.fly, 'doffing Levitation clears hover/fly');
ctx.G.equipped={boots:{n:'Boots of Levitation', k:'misc'}};
assert(ctx.wornMoveMul(who)===1, 'Levitation hover is not a move mul');

who.fly=0; who.hover=0; who.flyPotion=0; who._fromLevi=0;
who.fly=1; who.hover=1; who.flyPotion=1;
assert(ctx.isHovering(who), 'fly potion hover flag skips pits');
ctx.G.equipped={boots:{n:'Leather Boots'}};
ctx.applyHoverFlags(who);
assert(who.fly===1 && who.hover===1, 'fly-potion hover survives doffing leather boots');

assert(ctx.slayingTypeFromName('Arrow of Slaying')==='', 'plain slaying arrow has no named type');
assert(ctx.slayingTypeFromName('Arrow of Slaying, Dragon')==='dragon', 'name with dragon is a type');
assert(ctx.slayingTypeFromName('Arrow of Undead Slaying')==='undead', 'name with undead is a type');
assert(ctx.foeMatchesSlayingType({kind:'shadowdragon', name:'Shadow Dragon'}, 'dragon'),
  'dragon type matches a wyrm');
assert(ctx.foeMatchesSlayingType({kind:'undead', name:'Wight'}, 'undead'),
  'undead type matches a wight');
assert(!ctx.foeMatchesSlayingType({kind:'goblin', name:'Goblin'}, 'dragon'),
  'goblin is not a dragon slaying type');

const useCtx={
  G:{equipped:{}},
  ADD_SCALE:4,
  EquipmentSlots:Eq,
  DwarfMouth:M,
  lastSay:'',
  says:[],
  healed:0,
  dmg:0,
  donned:null,
  say(line){ useCtx.lastSay=line; useCtx.says.push(line); },
  player(){ return useCtx.who; },
  isEquipWeapon(){ return false; },
  isEquipArmor(){ return false; },
  equipPackItem(it){ useCtx.donned=it; return Eq.itemSlot(it)||'necklace'; },
  applyEquipped(){},
  nearestFoe(){ return useCtx.foe; },
  rollDice(n,s,b){ return n*s+(b||0); },
  damage(t, dmg){ useCtx.dmg+=(dmg||0); if(t&&t.hp!=null) t.hp-=(dmg||0); },
  burst(){},
  applyHeal(e, n){ useCtx.healed+=(n||0); if(e) e.hp=Math.min(e.maxhp||999, (e.hp||0)+n); },
  clearPoison(){},
  packOf(){ return useCtx.pack; },
  slayingTypeFromName:ctx.slayingTypeFromName,
  foeMatchesSlayingType:ctx.foeMatchesSlayingType,
  isPlusShotAmmo(it){ return !!(it&&it.k==='ammo'&&(it.plus|0)&&!/slaying|javelin/i.test(it.n||'')); }
};
useCtx.who={name:'Macar', hero:1, team:'party', hp:10, maxhp:80, buff:0};
useCtx.foe={name:'Goblin', kind:'goblin', x:2, y:1, team:'foe', hp:40};
useCtx.pack={magic:[]};
vm.createContext(useCtx);
vm.runInContext(extractFn('useWandByName')+extractFn('useMagicItem'), useCtx);

useCtx.healed=0; useCtx.dmg=0; useCtx.who.buff=0;
useCtx.useMagicItem({n:'Bag of Holding', k:'misc'}, useCtx.who);
assert(useCtx.healed===0 && useCtx.who.buff===0 && useCtx.donned==null,
  'use Bag of Holding does not don or buff+heal');
assert(/extra room|fraction/i.test(useCtx.lastSay), 'use Bag of Holding says extra capacity');

useCtx.dmg=0; useCtx.foe.hp=40;
const slayRet=useCtx.useMagicItem({n:'Arrow of Slaying', k:'ammo', plus:3}, useCtx.who);
assert(slayRet==='spent' && useCtx.dmg===24, 'plain slaying arrow is +6×ADD_SCALE once');
assert(useCtx.foe.hp===16, ' +6 ammo once subtracts 24 from the current target');

useCtx.dmg=0; useCtx.foe={name:'Shadow Dragon', kind:'shadowdragon', hp:80, x:2, y:1, team:'foe'};
const typed=useCtx.useMagicItem({n:'Arrow of Slaying, Dragon', k:'ammo', plus:3}, useCtx.who);
assert(typed==='spent', 'typed slaying arrow is spent');
assert(useCtx.foe.hp<=0, 'typed slaying arrow vs a matching dragon kills');

useCtx.dmg=0; useCtx.foe={name:'Goblin', kind:'goblin', hp:40, x:2, y:1, team:'foe'};
useCtx.useMagicItem({n:'Javelin of Lightning', k:'ammo', plus:2}, useCtx.who);
assert(useCtx.dmg===144, 'javelin 6d6 zap is the one ammo that may zap');

const drinkCtx={
  G:{},
  ADD_SCALE:4,
  lastSay:'',
  say(line){ drinkCtx.lastSay=line; },
  ftext(){},
  burst(){},
  applyHeal(){},
  clearPoison(){},
  partyLevel(){ return 3; },
  nearestFoe(){ return null; },
  rollExpr(){ return 4; },
  damage(){},
  ri(){ return 1; },
  player(){ return drinkCtx.who; }
};
vm.createContext(drinkCtx);
vm.runInContext(extractFn('drinkPotion'), drinkCtx);
drinkCtx.who={name:'Macar', hero:1, hp:40, maxhp:80, sp:4.3, buff:0};
drinkCtx.drinkPotion({n:'Fly', k:'fly'}, drinkCtx.who);
assert(drinkCtx.who.fly===1 && drinkCtx.who.hover===1 && drinkCtx.who.flyPotion===1,
  'Fly potion sets e.fly / hover without a z-height');
assert(drinkCtx.who.sp>=5.2, 'Fly potion still raises e.sp');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nleftover magic checks passed');

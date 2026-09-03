'use strict';
/**
 * Staff of Curing heals; Cloak of Displacement dons. Other wands stay 6d6 zaps.
 * Run: node src/combat/UseMagicItem.test.js
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

const curingRow=html.match(/\{a:25,b:27,n:'Staff of Curing'[^}]+\}/);
assert(!!curingRow && /k:'wand'/.test(curingRow[0]) && /charges:16/.test(curingRow[0]),
  'Staff of Curing table row stays k:wand charges:16');
assert(!/id:'/.test(curingRow[0]), 'Staff of Curing does not invent an id');

const cloakRow=html.match(/\{a:34,b:37,n:'Cloak of Displacement'[^}]+\}/);
assert(!!cloakRow && /k:'misc'/.test(cloakRow[0]) && /plus:2/.test(cloakRow[0]),
  'Cloak of Displacement table row stays k:misc plus:2');
assert(!/id:'/.test(cloakRow[0]), 'Cloak of Displacement does not invent an id');

const useFn=extractFn('useMagicItem');
assert(/Staff of Curing/i.test(useFn) && /applyHeal\(e, 18\)/.test(useFn) && /clearPoison\(e\)/.test(useFn),
  'Staff of Curing uses the existing heal-18 + clearPoison pipe');
assert(/rollDice\(6,6,0\)/.test(useFn), 'other wands still roll 6d6');
assert(!/it\.k==='ammo'[\s\S]*rollDice\(6,6/.test(useFn),
  'k:ammo no longer 6d6-zaps');
assert(/nocked|stays packed/.test(useFn), 'ammo use is nock/ready or a no-op say');
assert(/slaying|javelin of lightning/i.test(useFn),
  'Arrow of Slaying and Javelin of Lightning stay stub');
assert(/EquipmentSlots\.isEquippable\(it\)/.test(useFn),
  'wearable misc (Displacement) dons through isEquippable before the generic buff+heal');

assert(/ASSET_VER='75'/.test(html), 'ASSET_VER is unchanged');

const ctx={
  G:{equipped:{}},
  ADD_SCALE:4,
  EquipmentSlots:Eq,
  lastSay:'',
  healed:0,
  dmg:0,
  cleared:0,
  donned:null,
  donSlot:null,
  foe:{name:'Goblin', x:2, y:1, team:'foe'},
  say(line){ ctx.lastSay=line; },
  player(){ return ctx.who; },
  isEquipWeapon(){ return false; },
  isEquipArmor(){ return false; },
  equipPackItem(it){ ctx.donned=it; ctx.donSlot=Eq.itemSlot(it)||'necklace'; return ctx.donSlot; },
  applyEquipped(){},
  nearestFoe(){ return ctx.foe; },
  rollDice(n,s,b){ return n*s+(b||0); },
  damage(t, dmg){ ctx.dmg+=(dmg||0); },
  burst(){},
  applyHeal(e, n){ ctx.healed+=(n||0); if(e) e.hp=Math.min(e.maxhp||999, (e.hp||0)+n); },
  clearPoison(e){ if(e) e.poisonT=0; ctx.cleared=1; }
};
vm.createContext(ctx);
vm.runInContext(extractFn('isPlusShotAmmo')+useFn, ctx);

const who={name:'Macar', hero:1, team:'party', hp:10, maxhp:80, poisonT:4};
ctx.who=who;

const staff={n:'Staff of Curing', k:'wand', charges:16, d:'Cure serious wounds.'};
ctx.useMagicItem(staff, who);
assert(ctx.healed===18, 'Staff of Curing heals 18 (existing k:heal band)');
assert(ctx.cleared===1 && who.poisonT===0, 'Staff of Curing clears poison');
assert(ctx.dmg===0, 'Staff of Curing never 6d6-zaps a foe');
assert(staff.charges===15, 'Staff of Curing spends 1 charge');

ctx.healed=0; ctx.cleared=0; ctx.dmg=0;
staff.charges=1;
const last=ctx.useMagicItem(staff, who);
assert(staff.charges===0, 'last charge decrements to 0');
assert(last!=='spent', 'zero-charge staff is spent like other wands (not spliced as k:heal)');

ctx.healed=0; ctx.cleared=0; ctx.dmg=0;
['Rod of Absorption','Staff of the Magi','Wand of Fire','Wand of Lightning'].forEach(n=>{
  ctx.healed=0; ctx.dmg=0;
  const wand={n, k:'wand', charges:20};
  ctx.useMagicItem(wand, who);
  assert(ctx.healed===0 && ctx.dmg===36*4, n+' still 6d6 charge-zaps (got heal='+ctx.healed+' dmg='+ctx.dmg+')');
  assert(wand.charges===19, n+' still spends 1 charge');
});

ctx.healed=0; ctx.dmg=0; ctx.donned=null;
const cloak={n:'Cloak of Displacement', k:'misc', plus:2, d:'First attack misses.'};
assert(Eq.isEquippable(cloak), 'Displacement is equippable so useMagicItem dons it');
ctx.useMagicItem(cloak, who);
assert(ctx.donned===cloak && ctx.donSlot==='necklace', 'using the cloak from pack dons it');
assert(ctx.healed===0, 'using the cloak does not buff+heal 6');

ctx.healed=0; ctx.donned=null;
const bag={n:'Bag of Holding', k:'misc'};
who.buff=0;
ctx.useMagicItem(bag, who);
assert(ctx.donned==null && ctx.healed===6 && who.buff>=10, 'other unequippable misc still buff+heal 6');

ctx.healed=0; ctx.dmg=0; ctx.donned=null; ctx.donSlot=null; who.buff=0;
const ogre={n:'Gauntlets of Ogre Power', k:'misc', d:'Strength 18/00.'};
assert(Eq.isEquippable(ogre), 'ogre gauntlets are equippable so useMagicItem dons them');
ctx.useMagicItem(ogre, who);
assert(ctx.donned===ogre && ctx.donSlot==='gloves', 'using ogre gauntlets from pack dons gloves');
assert(ctx.healed===0 && who.buff===0, 'using ogre gauntlets does not buff+heal');

ctx.healed=0; ctx.dmg=0; ctx.donned=null; ctx.donSlot=null; who.buff=0;
const dexG={n:'Gauntlets of Dexterity', k:'misc', d:'Dexterity 18.'};
assert(Eq.isEquippable(dexG), 'dex gauntlets are equippable so useMagicItem dons them');
ctx.useMagicItem(dexG, who);
assert(ctx.donned===dexG && ctx.donSlot==='gloves', 'using dex gauntlets from pack dons gloves');
assert(ctx.healed===0 && who.buff===0, 'using dex gauntlets does not buff+heal');

ctx.healed=0; ctx.dmg=0; ctx.donned=null; ctx.donSlot=null; who.stun=0;
const fumble={n:'Gauntlets of Fumbling', k:'cursed', cursed:1, d:'Seem helpful.'};
assert(Eq.isEquippable(fumble), 'fumbling gauntlets are equippable');
ctx.useMagicItem(fumble, who);
assert(ctx.donned===fumble && ctx.donSlot==='gloves', 'using fumbling gauntlets dons and binds');
assert(ctx.healed===0 && ctx.dmg===0, 'cursed equippable gauntlets don instead of the stun+damage fallback');
assert(/The curse binds/.test(ctx.lastSay), 'fumbling use speaks the curse bind line');

ctx.healed=0; ctx.dmg=0; who.buff=0;
const arrows={n:'Arrows +1 (2d6)', k:'ammo', plus:1, qty:7, d:'2d6 arrows +1.'};
const ammoUsed=ctx.useMagicItem(arrows, who);
assert(ammoUsed!=='spent', 'using +N arrows does not spend the bundle');
assert(ctx.dmg===0 && ctx.healed===0, 'using +N arrows does not 6d6-zap');
assert(/nocked/i.test(ctx.lastSay), 'using +N arrows nocks them for the next shot');
assert(arrows.qty===7, 'nock does not decrement the bundle');

ctx.dmg=0; ctx.healed=0;
['Arrow of Slaying','Javelin of Lightning'].forEach(n=>{
  ctx.dmg=0; ctx.healed=0;
  const stub={n, k:'ammo', plus:3};
  const ret=ctx.useMagicItem(stub, who);
  assert(ret!=='spent' && ctx.dmg===0 && ctx.healed===0, n+' stays stub (no 6d6, not spent)');
});

const boltRow=html.match(/n:'Bolts \+/);
assert(!boltRow, 'no invented Bolts +N table row (arrows only)');
assert(/n:'Arrows \+1 \(2d6\)',k:'ammo',plus:1/.test(html), 'Arrows +1 table row stays plus:1');
assert(/n:'Arrows \+2 \(1d6\)',k:'ammo',plus:2/.test(html), 'Arrows +2 table row stays plus:2');
assert(/n:'Arrows \+3 \(1d4\)',k:'ammo',plus:3/.test(html), 'Arrows +3 table row stays plus:3');
assert(!/it\.k==='ammo'/.test(html.match(/const consume=it\.k==='scroll'[\s\S]*?;/)[0]),
  'pack use no longer auto-splices k:ammo as a one-shot');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nuseMagicItem checks passed');

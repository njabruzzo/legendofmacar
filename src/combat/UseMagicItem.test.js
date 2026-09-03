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
const wandFn=extractFn('useWandByName');
assert(/Staff of Curing/i.test(wandFn) && /applyHeal\(e, 18\)/.test(wandFn) && /clearPoison\(e\)/.test(wandFn),
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
  says:[],
  healed:0,
  dmg:0,
  cleared:0,
  donned:null,
  donSlot:null,
  foe:{name:'Goblin', x:2, y:1, team:'foe'},
  say(line){ ctx.lastSay=line; ctx.says.push(line); },
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
  clearPoison(e){ if(e) e.poisonT=0; ctx.cleared=1; },
  packOf(){ return ctx.pack; }
};
ctx.pack={magic:[]};
vm.createContext(ctx);
vm.runInContext(extractFn('isPlusShotAmmo')+extractFn('cancelOneMagicItem')+wandFn+useFn, ctx);

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
['Rod of Absorption','Staff of the Magi','Staff of Power','Wand of Fire','Wand of Lightning','Wand of Magic Missiles'].forEach(n=>{
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

function assertDonNoHeal(it, slot, label){
  ctx.healed=0; ctx.dmg=0; ctx.donned=null; ctx.donSlot=null; who.buff=0; who.stun=0; who.invis=0;
  assert(Eq.isEquippable(it), label+' is equippable so useMagicItem dons it');
  ctx.useMagicItem(it, who);
  assert(ctx.donned===it && ctx.donSlot===slot, 'using '+label+' from pack dons '+slot);
  assert(ctx.healed===0 && who.buff===0, 'using '+label+' does not buff+heal 6');
  assert(!who.invis, 'using '+label+' does not set potion invis');
}

assertDonNoHeal({n:'Boots of Speed', k:'misc', d:'Double movement.'}, 'boots', 'Boots of Speed');
assertDonNoHeal({n:'Boots of Elvenkind', k:'misc', d:'Surprise as an elf.'}, 'boots', 'Boots of Elvenkind');
assertDonNoHeal({n:'Boots of Striding and Springing', k:'misc', d:'Stride far.'}, 'boots', 'Boots of Striding and Springing');
assertDonNoHeal({n:'Boots of Levitation', k:'misc', d:'Levitate as the spell.'}, 'boots', 'Boots of Levitation');
assertDonNoHeal({n:'Cloak of Elvenkind', k:'misc', d:'Camouflage.'}, 'necklace', 'Cloak of Elvenkind');
assertDonNoHeal({n:'Robe of the Archmagi', k:'misc', plus:5, d:'AC 5, +5% MR.'}, 'chest', 'Robe of the Archmagi');
assertDonNoHeal({n:'Ring of Fire Resistance', k:'resist', d:'+4 vs fire saves.'}, 'necklace', 'Ring of Fire Resistance');
assertDonNoHeal({n:'Ring of Warmth', k:'resist', d:'Comfort in cold.'}, 'necklace', 'Ring of Warmth');
assertDonNoHeal({n:'Ring of Feather Falling', k:'buff', d:'No falling damage.'}, 'necklace', 'Ring of Feather Falling');
assertDonNoHeal({n:'Periapt of Proof against Poison', k:'misc', d:'+4 vs poison.'}, 'necklace', 'Periapt of Proof against Poison');
assertDonNoHeal({n:'Periapt of Wound Closure', k:'misc', d:'Wounds close.'}, 'necklace', 'Periapt of Wound Closure');
assertDonNoHeal({n:'Periapt of Health', k:'misc', d:'Immune to disease.'}, 'necklace', 'Periapt of Health');
assertDonNoHeal({n:'Ring of Free Action', k:'buff', d:'Move in web or hold.'}, 'necklace', 'Ring of Free Action');

ctx.healed=0; ctx.dmg=0; ctx.donned=null; who.buff=0; who.stun=0;
const cancel={n:'Rod of Cancellation', k:'wand', charges:1, d:'One touch drains a magic item forever.'};
const cursedRing={n:'Ring of Weakness', k:'cursed', cursed:1, plus:-1};
ctx.G.equipped={necklace:cursedRing};
ctx.pack={magic:[cursedRing]};
ctx.useMagicItem(cancel, who);
assert(ctx.dmg===0 && ctx.healed===0, 'Rod of Cancellation never 6d6-zaps');
assert(cancel.charges===0, 'Rod of Cancellation spends its 1 charge');
assert(cursedRing.plus===0 && cursedRing.charges===0, 'cancellation strips plus/charges from the worst cursed item');

ctx.dmg=0; ctx.healed=0;
['Wand of Enemy Detection','Wand of Magic Detection','Wand of Secret Door and Trap Detection'].forEach(n=>{
  ctx.dmg=0; ctx.healed=0; ctx.says=[];
  const wand={n, k:'wand', charges:20};
  ctx.useMagicItem(wand, who);
  assert(ctx.dmg===0 && ctx.healed===0, n+' detects; never 6d6');
  assert(wand.charges===19, n+' spends 1 charge');
  assert(/points|glows|pulses|still|dark|hostile|magic|secret|trap/i.test(ctx.says.join('\n')), n+' says a detect line');
});

ctx.dmg=0; ctx.foe.stun=0;
['Wand of Paralyzation','Wand of Fear'].forEach(n=>{
  ctx.dmg=0; ctx.healed=0; ctx.foe.stun=0;
  const wand={n, k:'wand', charges:20};
  ctx.useMagicItem(wand, who);
  assert(ctx.dmg===0 && ctx.healed===0, n+' never 6d6');
  assert(ctx.foe.stun>=3, n+' stuns the nearest foe');
  assert(wand.charges===19, n+' spends 1 charge');
});

ctx.dmg=0; who.trueSee=0; who.glow=null;
const lamp={n:'Wand of Illumination', k:'wand', charges:20};
ctx.useMagicItem(lamp, who);
assert(ctx.dmg===0, 'Wand of Illumination never 6d6');
assert(who.trueSee>=20 || who.glow, 'Illumination sets trueSee or a glow/light flag');
assert(lamp.charges===19, 'Illumination spends 1 charge');

ctx.healed=0; ctx.dmg=0; who.guardT=0; who.mr=0; who.poisonT=4;
const protScroll={n:'Scroll of Protection from Magic', k:'prot', d:'A 5-foot anti-magic shell.'};
const protRet=ctx.useMagicItem(protScroll, who);
assert(protRet==='spent' && who.guardT>=8 && who.mr===1 && ctx.healed===8,
  'Protection from * scroll still guard+MR+heal 8');
assert(ctx.dmg===0, 'Protection scroll never 6d6');

ctx.healed=0; who.guardT=0; who.mr=0;
const spellScroll={n:'Scroll of 1 Spell', k:'scroll', d:'One spell, cast at 6th level.'};
ctx.useMagicItem(spellScroll, who);
assert(who.guardT>=8 && ctx.healed===8, 'named-count spell scroll keeps the guard+heal stub');
assert(!/magic missile|fireball|wish/i.test(useFn), 'useMagicItem does not parse a full MU spell list');

ctx.healed=0; ctx.cleared=0; who.poisonT=3; who.guardT=0; who.mr=0;
const cureScroll={n:'Scroll of Cure Serious Wounds', k:'scroll', d:'Cure serious wounds.'};
ctx.useMagicItem(cureScroll, who);
assert(ctx.healed===18 && ctx.cleared===1, 'a heal/cure-named scroll uses the heal pipe');

ctx.healed=0; ctx.dmg=0; who.stun=0;
const cursedScroll={n:'Cursed Scroll', k:'cursed', cursed:1, d:'Reading unleashes a curse.'};
assert(!Eq.isEquippable(cursedScroll), 'Cursed Scroll is not wearable');
ctx.useMagicItem(cursedScroll, who);
assert(who.stun>=2 && ctx.dmg>0, 'Cursed Scroll still stuns');

const powerRow=html.match(/\{a:32,b:35,n:'Staff of Power'[^}]+\}/);
assert(!!powerRow && /k:'wand'/.test(powerRow[0]) && /plus:2/.test(powerRow[0]) && /charges:20/.test(powerRow[0]) && !/id:'/.test(powerRow[0]),
  'Staff of Power table row stays k:wand plus:2 charges:20 with no invented id');
assert(Eq.itemSlot({n:'Staff of Power', k:'wand', plus:2})==='primary',
  'Staff of Power is wieldable as +2 melee');
assert(cancel.charges===0, 'cancellation charge already spent above');
assert(!/n:'Wand of Illumination'/.test(html), 'no invented Wand of Illumination table row');

assert(!/Periapt of Wound/.test(useFn) || !/Periapt of Wound[\s\S]{0,80}applyHeal\(e, 18\)/.test(useFn),
  'Periapt of Wound Closure is not the one-shot heal-18 pack-use path');

ctx.healed=0; ctx.dmg=0; ctx.donned=null; ctx.donSlot=null; who.stun=0; who.buff=0;
const dancing={n:'Boots of Dancing', k:'cursed', cursed:1, d:'The wearer dances.'};
assert(Eq.isEquippable(dancing), 'Dancing boots are equippable');
ctx.useMagicItem(dancing, who);
assert(ctx.donned===dancing && ctx.donSlot==='boots', 'using Dancing boots dons and binds');
assert(ctx.healed===0 && ctx.dmg===0, 'cursed Dancing boots don instead of the stun+damage fallback');
assert(/The curse binds/.test(ctx.lastSay), 'Dancing use speaks the curse bind line');

const speedRow=html.match(/\{a:80,b:84,n:'Boots of Speed'[^}]+\}/);
assert(!!speedRow && /k:'misc'/.test(speedRow[0]) && !/id:'/.test(speedRow[0]),
  'Boots of Speed table row stays k:misc with no invented id');
const elfBootRow=html.match(/\{a:71,b:76,n:'Boots of Elvenkind'[^}]+\}/);
assert(!!elfBootRow && /k:'misc'/.test(elfBootRow[0]) && !/id:'/.test(elfBootRow[0]),
  'Boots of Elvenkind table row stays k:misc with no invented id');
const strideRow=html.match(/\{a:85,b:89,n:'Boots of Striding and Springing'[^}]+\}/);
assert(!!strideRow && /k:'misc'/.test(strideRow[0]) && !/id:'/.test(strideRow[0]),
  'Boots of Striding table row stays k:misc with no invented id');
const leviRow=html.match(/\{a:77,b:79,n:'Boots of Levitation'[^}]+\}/);
assert(!!leviRow && /k:'misc'/.test(leviRow[0]) && !/id:'/.test(leviRow[0]),
  'Boots of Levitation table row stays k:misc with no invented id');
const danceRow=html.match(/\{a:68,b:70,n:'Boots of Dancing'[^}]+\}/);
assert(!!danceRow && /k:'cursed'/.test(danceRow[0]) && /cursed:1/.test(danceRow[0]) && !/id:'/.test(danceRow[0]),
  'Boots of Dancing table row stays cursed with no invented id');
const elfCloakRow=html.match(/\{a:38,b:44,n:'Cloak of Elvenkind'[^}]+\}/);
assert(!!elfCloakRow && /k:'misc'/.test(elfCloakRow[0]) && !/id:'/.test(elfCloakRow[0]),
  'Cloak of Elvenkind table row stays k:misc with no invented id');
const robeRow=html.match(/\{a:49,b:51,n:'Robe of the Archmagi'[^}]+\}/);
assert(!!robeRow && /k:'misc'/.test(robeRow[0]) && /plus:5/.test(robeRow[0]) && !/id:'/.test(robeRow[0]),
  'Robe of the Archmagi table row stays k:misc plus:5 with no invented id');
const fireRow=html.match(/\{a:22,b:27,n:'Ring of Fire Resistance'[^}]+\}/);
assert(!!fireRow && /k:'resist'/.test(fireRow[0]) && !/id:'/.test(fireRow[0]),
  'Ring of Fire Resistance table row stays k:resist with no invented id');
const warmRow=html.match(/\{a:81,b:85,n:'Ring of Warmth'[^}]+\}/);
assert(!!warmRow && /k:'resist'/.test(warmRow[0]) && !/id:'/.test(warmRow[0]),
  'Ring of Warmth table row stays k:resist with no invented id');
const fallRow=html.match(/\{a:15,b:21,n:'Ring of Feather Falling'[^}]+\}/);
assert(!!fallRow && /k:'buff'/.test(fallRow[0]) && !/id:'/.test(fallRow[0]),
  'Ring of Feather Falling table row stays k:buff with no invented id');
const proofRow=html.match(/\{a:22,b:25,n:'Periapt of Proof against Poison'[^}]+\}/);
assert(!!proofRow && /k:'misc'/.test(proofRow[0]) && !/id:'/.test(proofRow[0]),
  'Periapt of Proof against Poison table row stays k:misc with no invented id');
const woundRow=html.match(/\{a:26,b:28,n:'Periapt of Wound Closure'[^}]+\}/);
assert(!!woundRow && /k:'misc'/.test(woundRow[0]) && !/id:'/.test(woundRow[0]),
  'Periapt of Wound Closure table row stays k:misc with no invented id');
const healthRow=html.match(/\{a:18,b:21,n:'Periapt of Health'[^}]+\}/);
assert(!!healthRow && /k:'misc'/.test(healthRow[0]) && !/id:'/.test(healthRow[0]),
  'Periapt of Health table row stays k:misc with no invented id');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nuseMagicItem checks passed');

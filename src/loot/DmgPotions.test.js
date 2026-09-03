'use strict';
/**
 * Treasure potions are 1e DMG Table III.A. drinkPotion applies the DMG text.
 * Run: node src/loot/DmgPotions.test.js
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
require('./DmgPotions.js');
const DP=globalThis.DmgPotions;
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

assert(!!DP && DP.TABLE.length===35, 'DMG Table III.A has 35 potion rows');
assert(DP.byRoll(1).n==='Animal Control' && DP.byRoll(3).n==='Animal Control', '01–03 Animal Control');
assert(DP.byRoll(13).n==='Delusion' && DP.byRoll(42).n==='Healing' && DP.byRoll(47).n==='Healing',
  'Healing is 42–47');
assert(DP.byRoll(24).n==='Extra-Healing' && DP.byRoll(82).n==='Poison' && DP.byRoll(85).n==='Speed',
  'Extra-Healing, Poison, Speed sit on the printed bands');
assert(DP.byRoll(97).n==='Water Breathing' && DP.byRoll(100).n==='Water Breathing',
  '97–00 Water Breathing');
assert(!DP.names().some(n=>/Cure Light|Juice|Skaven|Unearthed/i.test(n)),
  'DMG drop table is not the UA kitchen-sink list');

assert(/src\/loot\/DmgPotions\.js/.test(html), 'index.html loads DmgPotions');
assert(/function rollPotion\(\)\{ return rollDmgPotion\(\); \}/.test(html),
  'live rollPotion is DMG Table III.A');
assert(/function rollCampaignPotion\(\)\{ return potionByRoll\(d10000\(\)\); \}/.test(html),
  'campaign d10,000 list stays callable for tests');
assert(/const POTIONS=\[/.test(html) && /a:10000,b:10000/.test(html),
  'unused POTIONS[] d10,000 data is left in place');
assert(/RAW 1e DMG Table III\.A/.test(html), 'drop path comments the edition fork');

const magicFn=extractFn('rollMagicItem');
assert(/rollPotion\(\)/.test(magicFn) && !/rollCampaignPotion/.test(magicFn),
  'potion category on any treasure type rolls DMG, not UA');
assert(/letter==='S'/.test(html) && /magKind:'potion'/.test(html.match(/letter==='S'[\s\S]{0,120}/)[0])
  && /chanceOk\(40\)/.test(html.match(/letter==='S'[\s\S]{0,120}/)[0]),
  'type S still 40% for 1–8 potions');

const ctx={
  G:{ents:[], loot:[]},
  ADD_SCALE:4,
  lastSay:'',
  says:[],
  healed:0,
  healN:0,
  dmg:0,
  say(line){ ctx.lastSay=line; ctx.says.push(line); },
  ftext(){},
  burst(){},
  player(){ return ctx.who; },
  partyLevel(){ return 3; },
  nearestFoe(){ return ctx.foe; },
  rollDice(n,s,b){ return n*s+(b||0); },
  rollDmgPotion(r){ return DP.byRoll(r==null?42:r); },
  savingThrow(e, kind){ ctx.lastSave=kind; return !!ctx.saveOk; },
  damage(t, n){ ctx.dmg+=(n||0); if(t&&t.hp!=null) t.hp-=(n||0); },
  applyHeal(e, n){
    ctx.healN+=(n||0);
    const amt=Math.round((n||0)*ctx.ADD_SCALE);
    ctx.healed+=amt;
    if(e) e.hp=Math.min(e.maxhp||999, (e.hp||0)+amt);
    return amt;
  },
  clearPoison(e){ if(e){ e.poisonT=0; e._pt=0; e.slowT=0; } ctx.cleared=1; },
  ri(a){ return a; },
  DmgPotions:DP
};
vm.createContext(ctx);
vm.runInContext(
  extractFn('potionHay')+extractFn('charmFoeKind')+extractFn('applyDmgPotion')+extractFn('drinkPotion'),
  ctx
);

function fresh(){
  ctx.who={name:'Macar', hero:1, hp:20, maxhp:80, sp:4, buff:0, cd:1, poisonT:3};
  ctx.healed=0; ctx.healN=0; ctx.dmg=0; ctx.cleared=0; ctx.says=[]; ctx.saveOk=false;
  ctx.foe={name:'Goblin', kind:'goblin', hp:20, stun:0, aggro:6};
  return ctx.who;
}

let who=fresh();
ctx.drinkPotion({n:'Healing', k:'heal'}, who);
assert(ctx.healN===2*4+2, 'Healing is RAW 2d4+2 (got '+ctx.healN+')');

who=fresh();
ctx.drinkPotion({n:'Extra-Healing', k:'extraheal'}, who);
assert(ctx.healN===3*8+3, 'Extra-Healing is RAW 3d8+3 (got '+ctx.healN+')');

who=fresh(); ctx.saveOk=false;
ctx.drinkPotion({n:'Poison', k:'poison'}, who);
assert(who.hp<=0 && ctx.lastSave==='poison', 'Poison: fail save vs poison or die');

who=fresh(); ctx.saveOk=true; who.hp=20;
ctx.drinkPotion({n:'Poison', k:'poison'}, who);
assert(who.hp===20, 'Poison: made save lives');

who=fresh();
ctx.drinkPotion({n:'Delusion', k:'delusion'}, who);
assert(who.delusion && ctx.healN===0 && who.hp===20, 'Delusion applies no heal');
assert(/tastes like/.test(ctx.lastSay), 'Delusion names a believed potion');

who=fresh();
ctx.drinkPotion({n:'Diminution', k:'diminish'}, who);
assert(who.tiny===1 && who.tinyT>0, 'Diminution shrinks');

who=fresh();
ctx.drinkPotion({n:'Speed', k:'haste'}, who);
assert(who.ageYears===51 && who.cd<=0.5 && who.buff>0, 'Speed is haste and ages 1 year');

who=fresh();
ctx.drinkPotion({n:'Flying', k:'fly'}, who);
assert(who.fly===1 && who.hover===1 && who.flyPotion===1, 'Flying sets fly/hover');

who=fresh();
ctx.drinkPotion({n:'Invisibility', k:'invis'}, who);
assert(who.invis>0, 'Invisibility sets e.invis');

who=fresh();
ctx.drinkPotion({n:'Invulnerability', k:'invuln'}, who);
assert(who.guardT>0, 'Invulnerability sets guard');

who=fresh();
ctx.drinkPotion({n:'Giant Strength', k:'giantstr'}, who);
assert(who.strMul===2, 'Giant Strength doubles blows');

who=fresh();
ctx.drinkPotion({n:'Sweet Water', k:'sweetwater'}, who);
assert(ctx.cleared===1 && who.poisonT===0, 'Sweet Water clears poison');

who=fresh();
ctx.drinkPotion({n:'Fire Resistance', k:'fireres'}, who);
assert(who.potionFireRes>0, 'Fire Resistance sets a potion flag');

who=fresh();
ctx.drinkPotion({n:'Giant Control', k:'giantctrl'}, who);
assert(ctx.foe.stun===0, 'Giant Control does not thrall a goblin');

who=fresh();
ctx.foe={name:'Hill Giant', kind:'giant', hp:40, stun:0, aggro:6};
ctx.drinkPotion({n:'Giant Control', k:'giantctrl'}, who);
assert(ctx.foe.charmed===1 && ctx.foe.stun>=8, 'Giant Control holds a giant');

ctx.foe={name:'Goblin', kind:'goblin', hp:20, stun:0, aggro:6};
who=fresh();
ctx.drinkPotion({n:'Human Control', k:'humanctrl'}, who);
assert(ctx.foe.charmed===1, 'Human Control holds a goblin');

who=fresh();
ctx.drinkPotion({n:'Oil of Slipperiness', k:'slip'}, who);
assert(who.slip===1, 'Slipperiness sets e.slip');

const names=DP.names();
names.forEach(n=>{
  const row=DP.TABLE.find(r=>r.n===n);
  who=fresh(); ctx.foe={name:'Goblin', kind:'goblin', hp:20, stun:0, aggro:6}; ctx.saveOk=true;
  ctx.drinkPotion({n:row.n, k:row.k}, who);
  const stub=/buff\+heal 6|does nothing/.test(ctx.lastSay);
  assert(!stub, row.n+' drink is not a say-only stub');
});

assert(/e\.fly=1; e\.hover=1; e\.flyPotion=1/.test(extractFn('drinkPotion')),
  'drinkPotion still contains the leftover fly flags');

if(failed){ console.error('\n'+failed+' failed'); process.exit(1); }
console.log('\nDMG potion checks passed');

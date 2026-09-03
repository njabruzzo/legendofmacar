'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

function extract(name){
  const re=new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}');
  const m=html.match(re);
  if(!m) throw new Error('missing '+name+' in index.html');
  return m[0];
}

const sheets={};
const ctx={ entityAbil(e){ return (e&&e.abil)||(e&&e.col&&sheets[e.col.key])||null; } };
vm.createContext(ctx);
['isDwarf','dwarfConSaveAdj','dwarfSaveCon','dwarfSaveBonus'].forEach(n=>vm.runInContext(extract(n), ctx));
const {dwarfConSaveAdj,dwarfSaveBonus}=ctx;

let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL', msg); }
}

const table=[[3,0],[4,1],[6,1],[7,2],[10,2],[11,3],[13,3],[14,4],[17,4],[18,5],[19,5]];
table.forEach(([con,want])=>{
  assert(dwarfConSaveAdj(con)===want, 'CON '+con+' => +'+want+' (got '+dwarfConSaveAdj(con)+')');
});

const macar={race:'dwarf', kind:'dwarf', abil:{con:18}};
assert(dwarfSaveBonus(macar,'poison')===5, 'Macar CON 18 poison +5');
assert(dwarfSaveBonus(macar,'rod')===5, 'Macar CON 18 rod +5');
assert(dwarfSaveBonus(macar,'spell')===5, 'Macar CON 18 spell +5');
assert(dwarfSaveBonus(macar,'breath')===0, 'no racial vs breath');
assert(dwarfSaveBonus(macar,'petrify')===0, 'no racial vs petrify');
assert(dwarfSaveBonus(macar,'death')===0, 'racial is vs poison, not death magic');
assert(dwarfSaveBonus({kind:'gnome',team:'party',abil:{con:16}},'poison')===0, 'gnomes are not dwarves');
assert(dwarfSaveBonus({race:'dwarf'},'poison')===3, 'dwarf min CON 12 => +3');

const lord=html.match(/spiderLord:\{[^}]+\}/);
assert(lord, 'spiderLord bestiary row');
assert(/hp:44/.test(lord[0]), 'level-one giant spider has double HP (44)');
assert(/killPoison:1/.test(lord[0]), 'spider lord poison is lethal');
assert(!/slowPoison/.test(lord[0]), 'spider lord no longer uses slow poison');
assert(/killPoison:b\.killPoison/.test(html), 'killPoison is copied onto spawned foes');

assert(/savingThrow\(mac,'spell'\)/.test(html) && /savingThrow\(tal,'spell'\)/.test(html),
  'Hold Person and Silence use save vs spell');
assert(/dwarfSaveBonus\(e, kind\)/.test(html.match(/function saveNeed[\s\S]*?\n\}/)[0]),
  'spell saves still subtract dwarfSaveBonus');
assert(/function wornProtectionPlus\(/.test(html), 'Protection save helper exists');
assert(/saveNeed\(e,kind\)-\(e\.juice\|\|0\)-wornProtectionPlus\(e\)-wornDisplacementPlus\(e\)-wornResistSavePlus\(e,kind\)/.test(html.match(/function savingThrow[\s\S]*?\n\}/)[0]),
  'savingThrow lowers the target by Protection, Displacement, and resist-item plus (same math as juice)');
assert(/function wornResistSavePlus\(/.test(html), 'resist-item save helper exists');
assert(/if\(it\.dexPlus\) return 0/.test(extract('wornProtectionPlus')),
  'dexPlus never counts as a Protection save ward');
assert(/function wornDisplacementPlus\(/.test(html), 'Displacement save helper exists');
assert(/cloak of displacement/i.test(extract('wornDisplacementPlus')),
  'Displacement helper is name-gated, not a Protection ring');

const saveCtx={
  G:{equipped:{}},
  d20:()=>14,
  ftext:()=>{},
  saveNeed:()=>16
};
vm.createContext(saveCtx);
vm.runInContext(extract('wornProtectionPlus')+extract('wornDisplacementPlus')+extract('wornResistSavePlus')+extract('savingThrow'), saveCtx);

const mac={hero:1, team:'party', x:1, y:1, juice:0};
saveCtx.G.equipped={necklace:{n:'Ring of Protection +1', k:'ring', plus:1}};
assert(saveCtx.wornProtectionPlus(mac)===1, 'Ring of Protection +1 is +1 to saves');
assert(saveCtx.savingThrow(mac,'spell')===false, 'need 16-1=15; roll 14 still fails');
saveCtx.d20=()=>15;
assert(saveCtx.savingThrow(mac,'spell')===true, 'need 15; roll 15 saves (plus lowered the target)');

saveCtx.G.equipped={necklace:{n:'Cloak of Protection +2', k:'ring', plus:2}};
assert(saveCtx.wornProtectionPlus(mac)===2, 'Cloak of Protection plus feeds saves');

saveCtx.G.equipped={necklace:{n:'Ring of Dexterity +1', k:'dex', dexPlus:1}};
assert(saveCtx.wornProtectionPlus(mac)===0, 'Dexterity ring does not improve saves');

saveCtx.G.equipped={necklace:{n:'Ring of Dexterity +1', k:'dex', dexPlus:1, plus:1}};
assert(saveCtx.wornProtectionPlus(mac)===0, 'leftover plus on a dex ring is still not a ward');

saveCtx.G.equipped={necklace:{n:'Ring of Protection +4 on AC 5 or better', k:'ring', plus:4}};
assert(saveCtx.wornProtectionPlus(mac)===4, 'gated +4 ring still stores plus:4 for saves');

saveCtx.G.equipped={necklace:{n:'Cloak of Displacement', k:'misc', plus:2}};
assert(saveCtx.wornProtectionPlus(mac)===0, 'Displacement plus is not a Protection ward');
assert(saveCtx.wornDisplacementPlus(mac)===2, 'Cloak of Displacement plus feeds saves');
saveCtx.saveNeed=()=>16;
saveCtx.d20=()=>13;
assert(saveCtx.savingThrow(mac,'spell')===false, 'need 16-2=14; roll 13 still fails');
saveCtx.d20=()=>14;
assert(saveCtx.savingThrow(mac,'spell')===true, 'need 14; roll 14 saves (Displacement lowered the target)');

saveCtx.G.equipped={necklace:{n:'Ring of Dexterity +1', k:'dex', dexPlus:1, plus:1}};
assert(saveCtx.wornDisplacementPlus(mac)===0, 'Dexterity ring is not Displacement');

saveCtx.G.equipped={gloves:{n:'Gauntlets of Dexterity', k:'misc'}, necklace:{n:'Ring of Protection +1', k:'ring', plus:1}};
assert(saveCtx.wornProtectionPlus(mac)===1, 'dex gauntlets do not replace Protection save plus');
saveCtx.G.equipped={gloves:{n:'Gauntlets of Ogre Power', k:'misc'}};
assert(saveCtx.wornProtectionPlus(mac)===0 && saveCtx.wornDisplacementPlus(mac)===0,
  'ogre gauntlets are not a Protection or Displacement ward');

saveCtx.G.equipped={necklace:{n:'Ring of Fire Resistance', k:'resist'}};
assert(saveCtx.wornProtectionPlus(mac)===0, 'fire resist is not a Protection ward');
assert(saveCtx.wornResistSavePlus(mac,'breath')===4, 'fire resist is +4 vs breath (fire-ish)');
assert(saveCtx.wornResistSavePlus(mac,'spell')===0, 'fire resist does not blanket-bonus spell');
assert(saveCtx.wornResistSavePlus(mac,'poison')===0, 'fire resist is not a poison ward');
saveCtx.saveNeed=()=>16;
saveCtx.d20=()=>11;
assert(saveCtx.savingThrow(mac,'breath')===false, 'need 16-4=12; roll 11 still fails');
saveCtx.d20=()=>12;
assert(saveCtx.savingThrow(mac,'breath')===true, 'need 12; roll 12 saves (fire resist lowered the target)');

saveCtx.G.equipped={necklace:{n:'Ring of Warmth', k:'resist'}};
assert(saveCtx.wornResistSavePlus(mac,'breath')===2, 'warmth is +2 vs breath (no cold save kind)');
assert(saveCtx.wornProtectionPlus(mac)===0, 'warmth is not a Protection ward');

saveCtx.G.equipped={necklace:{n:'Periapt of Proof against Poison', k:'misc'}};
assert(saveCtx.wornResistSavePlus(mac,'poison')===4, 'poison periapt is +4 vs poison');
assert(saveCtx.wornResistSavePlus(mac,'breath')===0, 'poison periapt is not a breath ward');
saveCtx.saveNeed=()=>16;
saveCtx.d20=()=>11;
assert(saveCtx.savingThrow(mac,'poison')===false, 'need 16-4=12; roll 11 still fails poison');
saveCtx.d20=()=>12;
assert(saveCtx.savingThrow(mac,'poison')===true, 'need 12; roll 12 saves (poison periapt lowered the target)');

saveCtx.G.equipped={necklace:{n:'Ring of Dexterity +1', k:'dex', dexPlus:1, plus:1}};
assert(saveCtx.wornResistSavePlus(mac,'breath')===0 && saveCtx.wornResistSavePlus(mac,'poison')===0,
  'dex ring isolation still holds for resist-item saves');

saveCtx.G.equipped={chest:{n:'Robe of the Archmagi', k:'misc', plus:5}};
assert(saveCtx.wornProtectionPlus(mac)===0 && saveCtx.wornResistSavePlus(mac,'spell')===0,
  'robe plus:5 is not a save ward');

const mrCtx={
  G:{equipped:{}},
  d100:()=>100,
  ri:()=>100
};
vm.createContext(mrCtx);
vm.runInContext(extract('wornMagicResistPct')+extract('magicResist'), mrCtx);
assert(mrCtx.wornMagicResistPct(mac)===0, 'no jewelry is 0% MR');
mrCtx.G.equipped={necklace:{n:'Ring of Protection +1', k:'ring', plus:1}};
assert(mrCtx.wornMagicResistPct(mac)===0, '+1 Protection ring grants no MR');
mrCtx.G.equipped={necklace:{n:'Ring of Protection +2', k:'ring', plus:2}};
assert(mrCtx.wornMagicResistPct(mac)===10, '+2 Protection ring is 10% MR');
mrCtx.G.equipped={necklace:{n:'Ring of Protection +3', k:'ring', plus:3}};
assert(mrCtx.wornMagicResistPct(mac)===15, '+3 Protection ring is 15% MR');
mrCtx.G.equipped={necklace:{n:'Ring of Protection +4 on AC 5 or better', k:'ring', plus:4}};
assert(mrCtx.wornMagicResistPct(mac)===0, 'gated +4 Protection ring grants no MR');
mrCtx.G.equipped={necklace:{n:'Ring of Dexterity +1', k:'dex', dexPlus:1}};
assert(mrCtx.wornMagicResistPct(mac)===0, 'Dexterity ring never grants MR');
mrCtx.G.equipped={necklace:{n:'Cloak of Displacement', k:'misc', plus:2}};
assert(mrCtx.wornMagicResistPct(mac)===0, 'Displacement cloak never grants MR');
mrCtx.G.equipped={gloves:{n:'Gauntlets of Dexterity', k:'misc'}};
assert(mrCtx.wornMagicResistPct(mac)===0, 'dex gauntlets never grant MR');

mrCtx.G.equipped={necklace:{n:'Ring of Protection +2', k:'ring', plus:2}};
mrCtx.d100=()=>10;
assert(mrCtx.magicResist(mac)===true, 'targeted-spell helper: +2 ring resists on d100 10');
mrCtx.d100=()=>11;
assert(mrCtx.magicResist(mac)===false, 'targeted-spell helper: +2 ring fails on d100 11');
mrCtx.G.equipped={necklace:{n:'Ring of Protection +3', k:'ring', plus:3}};
mrCtx.d100=()=>15;
assert(mrCtx.magicResist(mac)===true, 'targeted-spell helper: +3 ring resists on d100 15');
mrCtx.d100=()=>16;
assert(mrCtx.magicResist(mac)===false, 'targeted-spell helper: +3 ring fails on d100 16');
mac.mr=1;
mrCtx.d100=()=>100;
assert(mrCtx.magicResist(mac)===true, 'potion/scroll e.mr=1 is full resist while the flag is on');
mac.mr=0;
mrCtx.G.equipped={necklace:{n:'Ring of Protection +1', k:'ring', plus:1}};
assert(mrCtx.magicResist(mac)===false, '+1 ring still has no MR after the e.mr flag drops');

assert(/magicResist\(o\)/.test(html.match(/if\(\(typeof magicResist[\s\S]*?savingThrow\(o,'spell'\)/)[0]),
  'onHitFx targeted spells honor magicResist the same way they honored e.mr');
assert(/magicResist\(mac\)/.test(html) && /magicResist\(tal\)/.test(html),
  'Hold Person and Silence Talpor use the targeted-spell MR helper');

mrCtx.G.equipped={chest:{n:'Robe of the Archmagi', k:'misc', plus:5}};
assert(mrCtx.wornMagicResistPct(mac)===5, 'robe alone is 5% MR');
mrCtx.d100=()=>5;
assert(mrCtx.magicResist(mac)===true, 'robe resists on d100 5');
mrCtx.d100=()=>6;
assert(mrCtx.magicResist(mac)===false, 'robe fails on d100 6');
mrCtx.G.equipped={
  chest:{n:'Leather Armor', k:'armor'},
  robe:{n:'Robe of the Archmagi', k:'misc', plus:5},
  necklace:{n:'Ring of Protection +2', k:'ring', plus:2}
};
assert(mrCtx.wornMagicResistPct(mac)===15, 'robe 5% stacks with Protection +2 10%');
mrCtx.G.equipped={
  chest:{n:'Robe of the Archmagi', k:'misc', plus:5},
  necklace:{n:'Ring of Protection +3', k:'ring', plus:3}
};
assert(mrCtx.wornMagicResistPct(mac)===20, 'robe 5% stacks with Protection +3 15%');
mrCtx.G.equipped={chest:{n:'Robe of the Archmagi', k:'misc', plus:5}, necklace:{n:'Ring of Dexterity +1', k:'dex', dexPlus:1}};
assert(mrCtx.wornMagicResistPct(mac)===5, 'dex ring does not add MR; robe 5% remains');
mrCtx.G.equipped={necklace:{n:'Robe of the Archmagi', k:'misc', plus:5}};
assert(mrCtx.wornMagicResistPct(mac)===0, 'robe plus:5 on the necklace is not Protection MR');

const resistCtx={
  G:{equipped:{}},
  d20:()=>20,
  ftext:()=>{},
  saveNeed:()=>16
};
vm.createContext(resistCtx);
['wornNecklaceItem','wearingFireResistance','wearingWarmth','wearingFeatherFalling','wearingWoundClosure','wearingHealthPeriapt','fallDamageAmt','tickWoundClosure','clearWornDisease','resistSrcHay','isFireishSrc','isMundaneFlameSrc','isMagicalFireSrc','isColdishSrc','isFallSrc','applyResistDamage'].forEach(n=>{
  vm.runInContext(extract(n), resistCtx);
});
const macR={hero:1, team:'party', hp:10, maxhp:80};
resistCtx.G.equipped={necklace:{n:'Ring of Fire Resistance', k:'resist'}};
assert(resistCtx.applyResistDamage(macR, 20, {kind:'flame'})===0, 'mundane flame is ignored');
assert(resistCtx.applyResistDamage(macR, 20, {magic:1,kind:'wand',n:'Wand of Fire'})===10, 'magical fire (wand) is halved');
assert(resistCtx.applyResistDamage(macR, 20, {magic:1,kind:'wand',n:'Wand of Lightning'})===20, 'lightning wand is not fire');
assert(resistCtx.applyResistDamage(macR, 20, {kind:'firegiant', sa:'Breath'})===10, 'breath fire is halved after the save');
resistCtx.G.equipped={necklace:{n:'Ring of Warmth', k:'resist'}};
assert(resistCtx.applyResistDamage(macR, 20, {kind:'bolt'})===20, 'warmth is comfort-only when no cold src');
assert(resistCtx.applyResistDamage(macR, 20, {kind:'cold', magic:1})===10, 'cold src is halved if one exists');
resistCtx.G.equipped={necklace:{n:'Ring of Feather Falling', k:'buff'}};
assert(resistCtx.fallDamageAmt(macR, 16)===0, 'feather falling zeroes fall/pit hp loss');
assert(resistCtx.applyResistDamage(macR, 16, {kind:'pit',fall:1})===0, 'pit src is 0 while feather falling is worn');
assert(resistCtx.applyResistDamage(macR, 11, {kind:'trap'})===11, 'spike trap is not a fall');
assert(/kind:'pit'/.test(html) && /fallDamageAmt\(e,16\)/.test(html),
  'pit trap path uses the fall helper (fall/pit damage exists)');
resistCtx.G.equipped={necklace:{n:'Periapt of Wound Closure', k:'misc'}};
resistCtx.tickWoundClosure(macR, 1);
assert(macR.hp===12.2, 'wound-closure tick matches potionRegen 2.2 hp/sec while worn');
resistCtx.tickWoundClosure(macR, 1);
assert(macR.hp===14.4, 'wound-closure keeps ticking when not camped');
resistCtx.G.equipped={};
resistCtx.tickWoundClosure(macR, 1);
assert(macR.hp===14.4, 'doffing wound-closure stops the tick');
resistCtx.G.equipped={necklace:{n:'Periapt of Health', k:'misc'}};
macR.disease=1; macR.diseaseT=4;
resistCtx.clearWornDisease(macR);
assert(macR.disease===0 && macR.diseaseT===0, 'health periapt clears a disease flag when one exists');
resistCtx.G.equipped={};
macR.disease=1;
resistCtx.clearWornDisease(macR);
assert(macR.disease===1, 'without the periapt, disease is a no-op');
const sham=html.match(/goblinShaman:\{[^}]+\}/);
assert(sham && /cls:'c'/.test(sham[0]) && /wis:14/.test(sham[0]) && /lvl:7/.test(sham[0]),
  'shaman is a 7th-level evil cleric, WIS 14');
assert(/spellSlots=e\.spellSlots\|\|\{1:5,2:3,3:2,4:1\}/.test(html), 'slots 5/3/2/1');

if(failed){ console.error(failed+' failed'); process.exit(1); }
console.log('DwarfSaves + spider lord tests passed');

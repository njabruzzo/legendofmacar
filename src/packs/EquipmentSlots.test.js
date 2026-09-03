/**
 * Node checks for AD&D 1e paper-doll slots and starting kit.
 * Run: node src/packs/EquipmentSlots.test.js
 */
'use strict';
require('./EquipmentSlots.js');
const Eq = globalThis.EquipmentSlots;

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error('FAIL  ' + msg);
  } else {
    console.log('ok    ' + msg);
  }
}

assert(Eq.ARMOR_AC.leather === 8, '1e leather is AC 8');
assert(Eq.ARMOR_AC.chain === 5, '1e chain is AC 5');
assert(Eq.ARMOR_AC.plate === 3, '1e plate is AC 3');
assert(Eq.ARMOR_AC.studded === 7 && Eq.ARMOR_AC.scale === 6 && Eq.ARMOR_AC.splint === 4, '1e mid-weight armor table');

assert(Eq.itemSlot({n:'Iron Helm', k:'armor'}) === 'helmet', 'helm → helmet');
assert(Eq.itemSlot({n:'Necklace of Adaptation', k:'misc'}) === 'necklace', 'necklace');
assert(Eq.itemSlot({n:'Leather Armor', k:'armor', cat:'Armor/Shield'}) === 'chest', 'leather → chest');
assert(!Eq.isShield({n:'Leather Armor', cat:'Armor/Shield'}), 'Armor/Shield category is not a shield');
assert(Eq.itemSlot({n:'Chain Mail +1', k:'armor'}) === 'chest', 'chain → chest');
assert(Eq.itemSlot({n:'Bracers of Defense', k:'misc'}) === 'bracers', 'bracers');
assert(Eq.itemSlot({n:'Gauntlets of Ogre Power', k:'misc'}) === 'gloves', 'gauntlets → gloves');
assert(Eq.itemSlot({n:'Wool Trousers', slot:'pants'}) === 'pants', 'pants');
assert(Eq.itemSlot({n:'Boots of Speed', k:'misc'}) === 'boots', 'boots');
assert(Eq.itemSlot({n:"Macar's War Hammer", k:'weapon'}) === 'primary', 'hammer → primary');
assert(Eq.itemSlot({n:'Shadow Cleaver', k:'weapon'}) === 'primary', 'cleaver → primary');
assert(Eq.itemSlot({n:'Light Crossbow', k:'weapon'}) === 'secondary', 'crossbow → secondary');
assert(Eq.itemSlot({n:'Crossbow of Accuracy +3', k:'weapon'}) === 'secondary', 'magic crossbow → secondary');
assert(Eq.itemSlot({n:'Shield +1', k:'armor'}) === 'secondary', 'shield → off hand');
assert(Eq.itemSlot({n:'Bolt Quiver', k:'ammo'}) === 'quiver', 'quiver');
assert(Eq.itemSlot({n:'Ring of Protection +1', k:'ring', cat:'Ring'}) === 'necklace', 'ring → jewelry slot');
assert(Eq.itemSlot({n:'Cloak of Displacement', k:'misc', plus:2}) === 'necklace',
  'Cloak of Displacement → necklace (same family as Cloak of Protection)');
assert(Eq.isEquippable({n:'Cloak of Displacement', k:'misc', plus:2}),
  'Cloak of Displacement is wearable');
assert(Eq.itemSlot({n:'Cloak of Protection +2', k:'ring', plus:2}) === 'necklace',
  'Cloak of Protection still maps to necklace');
assert(Eq.itemSlot({n:'Cloak of Elvenkind', k:'misc'}) == null,
  'Cloak of Elvenkind is not a jewelry slot');
assert(Eq.itemSlot({n:'Cloak of Manta Ray', k:'misc'}) == null,
  'Cloak of Manta Ray is not a jewelry slot');
assert(Eq.itemSlot({n:'Ring of Dexterity +1', k:'dex', cat:'Ring', dexPlus:1}) === 'necklace',
  'dex ring → jewelry slot');
assert(Eq.itemSlot({n:'Arrows +1 (2d6)', k:'ammo'}) == null, 'loose arrows are not a worn slot');

assert(Eq.inferArmorType('Leather Armor +1') === 'leather', 'infer leather');
assert(Eq.inferArmorType('Hide Cloak') === 'leather', 'hide cloak is leather AC 8');
assert(Eq.ARMOR_AC.leather === 8, 'leather / hide AC is 8');
const hide=Eq.annotate({n:'Hide Cloak', k:'armor', cat:'Armor/Shield'});
assert(hide.armorType==='leather' && hide.ac===8, 'station Hide Cloak annotates as leather AC 8');
assert(Eq.inferArmorType('Studded Leather +1') === 'studded', 'infer studded');
assert(Eq.inferArmorType('Plate Mail +3') === 'plate', 'infer plate');
assert(Eq.inferArmorType('Ring Mail +1') === 'ring', 'infer ring mail');

const start = Eq.startingItems();
const byId = {};
start.forEach(it => { byId[it.id] = it; });
assert(byId.macar_leather.ac === 8 && byId.macar_leather.armorType === 'leather', 'starting leather AC 8');
assert(byId.macar_helm.acBonus === 1, 'starting helm is +1 AC');
assert(byId.macar_pants.slot === 'pants' && byId.macar_boots.slot === 'boots', 'pants and normal boots');
assert(byId.macar_hammer.slot === 'primary', 'starting hammer is primary');
assert(byId.macar_crossbow.slot === 'secondary', 'starting crossbow is secondary');
assert(byId.macar_quiver.slot === 'quiver', 'starting quiver');
assert(byId.macar_helm.spr === 'icon_helm', 'helm uses helm graphic');
assert(byId.macar_leather.spr === 'icon_chest', 'leather uses chest graphic');
assert(byId.macar_pants.spr === 'icon_pants', 'trousers use pants graphic');
assert(byId.macar_boots.spr === 'icon_boots', 'boots use boots graphic');
assert(byId.macar_quiver.spr === 'icon_quiver', 'quiver uses quiver graphic');
assert(Eq.slotIcon('helmet') === 'icon_helm' && Eq.slotIcon('quiver') === 'icon_quiver', 'slot icon map');

const cellSq = Eq.slotCell('helmet', 100, 50, 32);
assert(isFinite(cellSq.x) && isFinite(cellSq.y) && isFinite(cellSq.w) && isFinite(cellSq.h), 'slotCell without height is finite');
assert(cellSq.y === 34 && cellSq.h === 32, 'missing height defaults to width');
const cellRect = Eq.slotCell('quiver', 100, 50, 40, 20);
assert(cellRect.h === 20 && cellRect.y === 40, 'explicit height is used');
const cellBad = Eq.slotCell('chest', 10, 10, 24, undefined);
assert(isFinite(cellBad.y) && cellBad.h === 24, 'undefined height does not produce NaN');

let eq = Eq.emptyEquipped();
start.forEach(it => {
  if (Eq.START_WORN.indexOf(it.slot) >= 0) eq = Eq.equip(eq, it).equipped;
});
assert(eq.primary && eq.primary.id === 'macar_hammer', 'primary is the hammer');
assert(eq.weapon === eq.primary, 'legacy weapon alias tracks primary');
assert(eq.chest.id === 'macar_leather' && eq.armor === eq.chest, 'legacy armor alias tracks chest');
assert(eq.secondary.id === 'macar_crossbow', 'secondary is the crossbow');
assert(Eq.computeWornAC(eq) === 7, 'leather 8 + helm +1 => AC 7');
assert(Eq.describeAC(eq).note.indexOf('leather') >= 0, 'AC note names leather');
assert(Eq.describeAC(eq).note.indexOf('helm') >= 0, 'AC note names helm');

const stripped = Eq.unequip(eq, 'helmet');
assert(stripped.ok && Eq.computeWornAC(stripped.equipped) === 8, 'doff helm → leather AC 8');
const bare = Eq.unequip(stripped.equipped, 'chest');
assert(bare.ok && Eq.computeWornAC(bare.equipped) === 10, 'no armor → AC 10');

const mail = Eq.annotate({n:'Chain Mail +1', k:'armor', plus:1});
assert(mail.armorType === 'chain' && mail.ac === 5 && mail.slot === 'chest', 'loot chain is annotated');
let magic = Eq.equip(Eq.emptyEquipped(), mail).equipped;
assert(Eq.computeWornAC(magic) === 4, 'chain 5 +1 => AC 4');

const helmLoot = Eq.annotate({n:'Helm of Telepathy', k:'misc'});
assert(helmLoot.slot === 'helmet', 'loot helm maps to helmet');
assert(helmLoot.acBonus == null && !helmLoot.plus, 'Helm of * does not get a free acBonus');
magic = Eq.equip(magic, helmLoot).equipped;
assert(Eq.computeWornAC(magic) === 4, 'Helm of Telepathy does not add AC to chain +1');

const ironHelm = Eq.annotate({n:'Iron Helm', k:'armor', acBonus:1});
assert(ironHelm.acBonus === 1 && Eq.helmAcBonus(ironHelm) === 1, 'Iron Helm keeps house acBonus:1');
let ironEq = Eq.equip(Eq.emptyEquipped(), Eq.annotate({n:'Leather Armor', k:'armor'})).equipped;
ironEq = Eq.equip(ironEq, ironHelm).equipped;
assert(Eq.computeWornAC(ironEq) === 7, 'Iron Helm still +1 AC on leather 8');

const helmPlus = Eq.annotate({n:'Helm of Brilliance', k:'misc', plus:1});
assert(helmPlus.acBonus === 1, 'Helm of * with an explicit plus still gets that AC');

const sh = Eq.annotate({n:'Shield +1', k:'armor', plus:1});
assert(sh.slot === 'secondary', 'loot shield maps to off hand');
magic = Eq.equip(magic, sh).equipped;
assert(Eq.computeWornAC(magic) === 2, 'mail+Telepathy helm+shield +1 => AC 2 (no free helm AC)');

const gateRing = Eq.annotate({n:'Ring of Protection +4 on AC 5 or better', k:'ring', cat:'Ring', plus:4});
assert(Eq.isAc5GateRing(gateRing) && gateRing.plus === 4, 'gated ring keeps plus:4');
let leatherGate = Eq.equip(Eq.emptyEquipped(), Eq.annotate({n:'Leather Armor', k:'armor'})).equipped;
assert(Eq.computeWornAC(leatherGate) === 8, 'leather alone is AC 8 (worse than 5)');
leatherGate = Eq.equip(leatherGate, gateRing).equipped;
assert(Eq.computeWornAC(leatherGate) === 8, 'gated +4 does not apply when worn AC is worse than 5');

let chainGate = Eq.equip(Eq.emptyEquipped(), Eq.annotate({n:'Chain Mail', k:'armor'})).equipped;
assert(Eq.computeWornAC(chainGate) === 5, 'chain alone is AC 5');
chainGate = Eq.equip(chainGate, gateRing).equipped;
assert(Eq.computeWornAC(chainGate) === 1, 'gated +4 applies when worn AC is already 5');

const prot1 = Eq.annotate({n:'Ring of Protection +1', k:'ring', cat:'Ring', plus:1});
let leatherProt = Eq.equip(Eq.emptyEquipped(), Eq.annotate({n:'Leather Armor', k:'armor'})).equipped;
leatherProt = Eq.equip(leatherProt, prot1).equipped;
assert(Eq.computeWornAC(leatherProt) === 7, 'ordinary Protection +1 still stacks on leather');

const cloakDisp = Eq.annotate({n:'Cloak of Displacement', k:'misc', plus:2});
assert(cloakDisp.slot === 'necklace', 'Displacement annotates as necklace');
assert(Eq.jewelryAcPlus(cloakDisp, 8) === 2, 'Displacement plus:2 is jewelry AC (not a dex ring)');
let leatherDisp = Eq.equip(Eq.emptyEquipped(), Eq.annotate({n:'Leather Armor', k:'armor'})).equipped;
leatherDisp = Eq.equip(leatherDisp, cloakDisp).equipped;
assert(Eq.computeWornAC(leatherDisp) === 6, 'leather 8 + Displacement +2 => AC 6');
assert(leatherDisp.necklace && leatherDisp.necklace.n === 'Cloak of Displacement',
  'Displacement sits in the necklace slot');
assert(leatherDisp.ring !== cloakDisp, 'Displacement is not stored as a Protection ring');

const dexRing = {n:'Ring of Dexterity +1', k:'dex', cat:'Ring', dexPlus:1};
Eq.annotate(dexRing);
assert(Eq.isDexRing(dexRing) && Eq.jewelryAcPlus(dexRing, 8) === 0,
  'dex ring does not stack as Protection AC');

const cursed = {n:'Cursed Armor -1', k:'cursed', cat:'Armor/Shield', plus:-1, cursed:1};
Eq.annotate(cursed);
eq = Eq.equip(Eq.emptyEquipped(), cursed).equipped;
assert(Eq.computeWornAC(eq) === 6, 'cursed −1 on default chain 5 => AC 6');
const stay = Eq.unequip(eq, 'chest');
assert(!stay.ok && stay.reason === 'cursed', 'cursed armor will not doff');

const boots = Eq.annotate({n:'Boots of Elvenkind', k:'misc'});
assert(Eq.itemSlot(boots) === 'boots', 'pack boots map to feet');

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');

const leather = Eq.annotate({n:'Leather Armor', k:'armor'});
const missSh = Eq.annotate({n:'Shield, large, +1, +4 vs missiles', k:'armor', plus:1, missilePlus:4,
  d:'+1 large shield, +4 vs missiles.'});
assert(missSh.slot === 'secondary', 'large +4 vs missiles shield maps to off hand');
assert(Eq.shieldMissilePlus(missSh) === 4, 'large shield missile plus is +4');
assert(Eq.shieldMissilePlus({n:'Shield +1', plus:1}) === 0, 'ordinary +1 shield has no missile extra');
let leatherSh = Eq.equip(Eq.emptyEquipped(), leather).equipped;
leatherSh = Eq.equip(leatherSh, missSh).equipped;
assert(Eq.computeWornAC(leatherSh) === 6, 'leather + large shield melee AC 6 (8 −1 −1)');
assert(Eq.computeWornAC(leatherSh, {missile:true}) === 2, 'leather + large shield missile AC 2 (melee 6 −4)');
const parsedSh = Eq.annotate({n:'Shield, large, +1, +4 vs missiles', k:'armor', plus:1,
  d:'+1 large shield, +4 vs missiles.'});
assert(Eq.shieldMissilePlus(parsedSh) === 4, 'parses +4 vs missiles from n/d when missilePlus is omitted');
let leatherPlain = Eq.equip(Eq.emptyEquipped(), leather).equipped;
leatherPlain = Eq.equip(leatherPlain, Eq.annotate({n:'Shield +1', k:'armor', plus:1})).equipped;
assert(Eq.computeWornAC(leatherPlain) === 6, 'leather + ordinary +1 shield melee AC 6');
assert(Eq.computeWornAC(leatherPlain, {missile:true}) === 6, 'ordinary +1 shield missile AC stays 6');
let leatherPri = Eq.equip(Eq.emptyEquipped(), leather).equipped;
leatherPri.primary = missSh;
assert(Eq.computeWornAC(leatherPri) === 6 && Eq.computeWornAC(leatherPri, {missile:true}) === 2,
  'missile shield in primary hand still grants +4 vs missiles');
const gateRow = html.match(/n:'Ring of Protection \+4 on AC 5 or better',k:'ring',plus:(\d+)/);
assert(gateRow && gateRow[1] === '4', 'table stores Ring of Protection +4 as plus:4');
assert(/function rollDmgRing\(/.test(html) && /plus:r\.plus/.test(html.match(/function rollDmgRing\([\s\S]*?\n\}/)[0]),
  'ring loot path copies table plus');
assert(/src\/packs\/EquipmentSlots\.js/.test(html), 'index.html loads EquipmentSlots');
assert(/drawEquipDoll|drawPaperDoll/.test(html), 'pack screen draws the paper doll');
assert(/ensureMacarStartingGear/.test(html), 'Macar is seeded with starting kit');
assert(/computeWornAC/.test(html), 'party AC uses worn 1e values');
assert(/missile:!!opts\.missile/.test(html.match(/function partyAC\([\s\S]*?\nfunction isRearAttack/)[0]),
  'partyAC forwards missile to computeWornAC');
assert(/atk&&atk\.ranged/.test(html.match(/function effectiveAC\([\s\S]*?\nconst SPECIALTY/)[0]),
  'effectiveAC marks incoming ranged attacks as missiles');

function extractFn(name){
  const re=new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}');
  const m=html.match(re);
  if(!m) throw new Error('missing '+name);
  return m[0];
}
const acCtx={
  G:{equipped:leatherSh},
  EquipmentSlots:Eq,
  clamp:(v,a,b)=>v<a?a:v>b?b:v,
  entityAbil:()=>({dex:10,str:10}),
  dexDefAdj:()=>0,
  effectiveDex:()=>10,
  isRearAttack:()=>false
};
vm.createContext(acCtx);
vm.runInContext(extractFn('partyAC')+extractFn('effectiveAC'), acCtx);
const mac={hero:1, team:'party', stun:0, prone:0, held:0};
assert(acCtx.partyAC(mac)===6, 'partyAC leather+missile-shield melee is 6');
assert(acCtx.partyAC(mac,{missile:1})===2, 'partyAC leather+missile-shield vs missiles is 2');
assert(acCtx.effectiveAC(mac,{ranged:0})===6, 'melee against party ignores missile shield extra');
assert(acCtx.effectiveAC(mac,{ranged:1})===2, 'ranged against party applies +4 vs missiles');
assert(acCtx.effectiveAC(mac)===6, 'HUD effectiveAC with no attacker stays melee');
assert(/icon_helm/.test(html) && /icon_quiver/.test(html) && /icon_doll/.test(html), 'inventory slot graphics are registered');
const dollFn=html.match(/function drawEquipDoll\(g, x, y, w, h\)\{[\s\S]*?\nfunction drawPack/);
assert(!!dollFn && /blitLivingMacar\(SPR\[livingMacarIdleKey\(\)\]\|\|SPR\.macar\)/.test(dollFn[0]),
  'paper doll blits the blitLivingMacar idle pipe, not a separate kettle-hat');
assert(!!dollFn && /livingMacarIdleKey\(\)/.test(dollFn[0]),
  'paper doll swaps to the punched axe sheet when Shadow Cleaver is wielded');
assert(/ph\.key==='macar'/.test(html) && /openPackMenu\('play'\)/.test(html), 'Macar portrait opens the pack doll');
assert(/GEAR/.test(html), 'Macar portrait marks the gear screen');
assert(/if\(!slot\) return null/.test(html.match(/function maybeAutoEquip[\s\S]*?\n\}/)[0])
  && /if\(G\.equipped\[slot\]\) return null/.test(html.match(/function maybeAutoEquip[\s\S]*?\n\}/)[0]),
  'maybeAutoEquip still dons empty slots only (does not steal an occupied necklace)');

if (failed) {
  console.error('\n' + failed + ' failed');
  process.exit(1);
}
console.log('\nall checks passed');

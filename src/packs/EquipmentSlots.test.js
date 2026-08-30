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
assert(helmLoot.slot === 'helmet' && helmLoot.acBonus === 1, 'loot helm maps and gets +1 AC');
magic = Eq.equip(magic, helmLoot).equipped;
assert(Eq.computeWornAC(magic) === 3, 'chain +1 and helm +1 => AC 3');

const sh = Eq.annotate({n:'Shield +1', k:'armor', plus:1});
assert(sh.slot === 'secondary', 'loot shield maps to off hand');
magic = Eq.equip(magic, sh).equipped;
assert(Eq.computeWornAC(magic) === 1, 'mail+helm+shield +1 => AC 1');

const cursed = {n:'Cursed Armor -1', k:'cursed', cat:'Armor/Shield', plus:-1, cursed:1};
Eq.annotate(cursed);
eq = Eq.equip(Eq.emptyEquipped(), cursed).equipped;
assert(Eq.computeWornAC(eq) === 6, 'cursed −1 on default chain 5 => AC 6');
const stay = Eq.unequip(eq, 'chest');
assert(!stay.ok && stay.reason === 'cursed', 'cursed armor will not doff');

const boots = Eq.annotate({n:'Boots of Elvenkind', k:'misc'});
assert(Eq.itemSlot(boots) === 'boots', 'pack boots map to feet');

const html = require('fs').readFileSync(require('path').join(__dirname, '../../index.html'), 'utf8');
assert(/src\/packs\/EquipmentSlots\.js/.test(html), 'index.html loads EquipmentSlots');
assert(/drawEquipDoll|drawPaperDoll/.test(html), 'pack screen draws the paper doll');
assert(/ensureMacarStartingGear/.test(html), 'Macar is seeded with starting kit');
assert(/computeWornAC/.test(html), 'party AC uses worn 1e values');
assert(/icon_helm/.test(html) && /icon_quiver/.test(html) && /icon_doll/.test(html), 'inventory slot graphics are registered');
const dollFn=html.match(/function drawEquipDoll\(g, x, y, w, h\)\{[\s\S]*?\nfunction drawPack/);
assert(!!dollFn && /blitLivingMacar\(SPR\.macar\)/.test(dollFn[0]),
  'paper doll blits the blitLivingMacar idle pipe, not a separate kettle-hat');
assert(!!dollFn && !/macar_axe/.test(dollFn[0]) && !/wieldsShadowCleaver\(/.test(dollFn[0]),
  'paper doll does not swap to the axe sheet until that sheet is binary-alpha');
assert(/ph\.key==='macar'/.test(html) && /openPackMenu\('play'\)/.test(html), 'Macar portrait opens the pack doll');
assert(/GEAR/.test(html), 'Macar portrait marks the gear screen');

if (failed) {
  console.error('\n' + failed + ' failed');
  process.exit(1);
}
console.log('\nall checks passed');

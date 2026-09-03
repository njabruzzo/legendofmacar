'use strict';
const path=require('path');
require('./DwarfMouth.js');
const M=globalThis.DwarfMouth;
let failed=0;
function assert(cond, msg){
  if(!cond){ failed++; console.error('FAIL', msg); }
}

assert(M.isGuardianRuby({guardian:1}), 'tagged guardian ruby');
assert(M.isGuardianRuby({d:'A blood-red shard from a ruby guardian. Worth 400 gp.'}), 'text guardian ruby');
assert(!M.isGuardianRuby({n:'Ruby', d:'A pretty stone.'}), 'plain ruby is not guardian');

assert(M.isSpiderFoe({kind:'spider', name:'Spider Lord'}), 'spider lord');
assert(M.isSpiderFoe({kind:'spider', name:'Cave Spider'}), 'cave spider');
assert(M.isUndeadFoe({kind:'undead'}), 'undead kind');
assert(M.isUndeadFoe({kind:'wraith', name:'Mine Wraith'}), 'wraith');
assert(!M.isUndeadFoe({kind:'goblin'}), 'goblin is not undead');

const axe=M.shadowCleaverItem();
assert(axe.n==='Shadow Cleaver' && axe.plus===2 && axe.vsDouble===1, 'cleaver stats');
assert(M.isShadowCleaver(axe), 'cleaver id matches');
assert(M.isShadowCleaver({n:'Shadow Cleaver'}), 'cleaver name matches');
assert(!M.isShadowCleaver(M.macarHammerItem()), 'hammer is not the cleaver');
assert(M.findShadowCleaver({macar:{magic:[axe]}}, {weapon:null})===axe, 'finds cleaver in pack');
assert(M.findShadowCleaver({macar:{magic:[]}}, {weapon:axe})===axe, 'finds equipped cleaver');
assert(!M.findShadowCleaver({macar:{magic:[]}}, {weapon:null}), 'missing cleaver is null');
assert(M.weaponVsDouble(axe,{kind:'spider'}), 'double vs spider');
assert(M.weaponVsDouble(axe,{kind:'undead'}), 'double vs undead');
assert(!M.weaponVsDouble(axe,{kind:'goblin'}), 'no double vs goblin');
assert(M.weaponVsPlus(axe,{kind:'spider'})===0 && M.weaponVsPlus(axe,{kind:'undead'})===0,
  'Shadow Cleaver stays vsDouble, never vsPlus');
assert(axe.plus===2 && !axe.vsPlus, 'cleaver remains plus:2 with no vsPlus field');

assert(M.isMagicFoe({kind:'drow', name:'Drow Blade'}), 'kind drow is magic-using');
assert(M.isMagicFoe({kind:'goblin', name:'Goblin Shaman', shaman:1}), 'shaman name/flag is magic');
assert(M.isMagicFoe({kind:'mage', name:'Cave Wizard'}), 'mage/wizard is magic');
assert(M.isMagicFoe({name:'Enchanted Statue'}), 'enchanted name is magic');
assert(!M.isMagicFoe({kind:'goblin', name:'Goblin'}), 'plain goblin is not magic');
assert(M.isLycanFoe({name:'Werewolf', kind:'lycan'}), 'were/lycan');
assert(M.isLycanFoe({name:'Shape Changer'}), 'shape-changer');
assert(M.isRegenFoe({kind:'troll', name:'Cave Troll'}), 'troll is regen');
assert(M.isRegenFoe({kind:'beast', regen:1}), 'regen flag');
assert(M.isReptileFoe({kind:'kobold', name:'Kobold'}), 'kobold is 1e reptile-kin');
assert(M.isReptileFoe({kind:'lizard', name:'Lizard Man'}), 'lizard');
assert(M.isReptileFoe({kind:'naga'}), 'naga');
assert(M.isReptileFoe({kind:'dragonkin', name:'Dragon-kin Scout'}), 'dragon-kin is reptile, not dragon');
assert(!M.isReptileFoe({kind:'shadowdragon', name:'Shadow Dragon'}), 'true dragon is not reptile');
assert(M.isDragonFoe({kind:'shadowdragon', name:'Shadow Dragon'}), 'shadow dragon is dragon');
assert(M.isDragonFoe({kind:'deepdragon', name:'Deep Dragon Wyrm'}), 'wyrm is dragon');
assert(M.isDragonFoe({kind:'wyvern', name:'Wyvern'}), 'wyvern is dragon');
assert(!M.isDragonFoe({kind:'dragonkin', name:'Dragon-kin Scout'}), 'dragon-kin is not vs:dragon');
assert(M.isGiantFoe({kind:'stonegiant', name:'Stone Giant'}), 'stone giant');
assert(M.isGiantFoe({kind:'ogre', name:'Ogre'}), 'ogre is giant-kin');
assert(!M.isGiantFoe({kind:'giantslug', name:'Giant Slug'}), 'giant slug is not a giant');

const magicSw={n:'Long Sword +1, +2 vs magic-using and enchanted creatures',plus:1,vs:'magic',vsPlus:1};
const lycanSw={n:'Long Sword +1, +3 vs lycanthropes and shape changers',plus:1,vs:'lycan',vsPlus:2};
const regenSw={n:'Long Sword +1, +3 vs regenerating creatures',plus:1,vs:'regen',vsPlus:2};
const reptileSw={n:'Long Sword +1, +4 vs reptiles',plus:1,vs:'reptile',vsPlus:3};
const dragonSw={n:'Long Sword +2, Dragon Slayer',plus:2,vs:'dragon',vsPlus:2,d:'+2, +4 vs a chosen dragon type. A wyrm\'s bane.'};
const giantSw={n:'Long Sword +3, Giant Slayer',plus:3,vs:'giant',vsPlus:3,d:'+3, +6 vs giants and giant-kin.'};

assert(M.weaponVsPlus(magicSw,{kind:'drow'})===1 && !M.weaponVsDouble(magicSw,{kind:'drow'}),
  'magic sword extra +1, not double');
assert(M.weaponVsPlus(lycanSw,{name:'Werewolf'})===2, 'lycan extra +2');
assert(M.weaponVsPlus(regenSw,{kind:'troll'})===2, 'regen extra +2');
assert(M.weaponVsPlus(reptileSw,{kind:'kobold'})===3, 'reptile extra +3 vs kobold');
assert(M.weaponVsPlus(reptileSw,{kind:'shadowdragon'})===0, 'reptile sword skips true dragons');
assert(M.weaponVsPlus(dragonSw,{kind:'shadowdragon'})===2, 'dragon slayer extra +2 (tot +4)');
assert(M.weaponVsPlus(giantSw,{kind:'stonegiant'})===3, 'giant slayer extra +3 (tot +6)');
assert(M.weaponVsPlus(magicSw,{kind:'goblin'})===0, 'vs strings add nothing vs the wrong foe');
assert(!M.weaponVsDouble(magicSw,{kind:'spider'}) && !M.weaponVsDouble(lycanSw,{kind:'undead'}),
  'table vs tokens never trip weaponVsDouble');

const parsedOnly={n:'Long Sword +1, +3 vs lycanthropes and shape changers',plus:1,vs:'lycan',
  d:'+1, +3 vs lycanthropes and other shape-changers.'};
assert(M.weaponVsPlus(parsedOnly,{name:'Werewolf'})===2, 'parses +3 vs extra from n/d when vsPlus is omitted');

const ham=M.macarHammerItem();
assert(ham.id==='macar_hammer' && ham.dice==='1d8' && ham.slot==='primary', 'hammer item is primary');
assert(M.dwarfMouthKey().k==='key', 'mouth key');

const ruby={n:'Ruby', guardian:1, d:'A blood-red shard from a ruby guardian.'};
const no={n:'Ruby', d:'A pretty stone.'};
const first=M.resolveMouthDrop(ruby, false);
assert(first.ok && first.yum && first.spit.length===2, 'first guardian ruby pays key and axe');
assert(first.spit[0].k==='key' && first.spit[1].n==='Shadow Cleaver', 'spit order key then cleaver');
assert(M.shouldWieldMouthAxe(first.spit[1], {weapon:ham, primary:ham}), 'cleaver is better than the hammer — wield it');
assert(M.shouldWieldMouthAxe(first.spit[1], {weapon:null}), 'wield the cleaver when the hand is empty');
assert(!M.shouldWieldMouthAxe(first.spit[1], {weapon:axe, primary:axe}), 'already-wielded cleaver stays');
assert(!M.shouldWieldMouthAxe(ham, {weapon:null}), 'hammer is not the mouth axe');
const again=M.resolveMouthDrop(ruby, true);
assert(again.ok && again.yum && again.spit.length===0, 'later rubies yum but do not pay again');
assert(!M.resolveMouthDrop(no, false).ok, 'plain ruby rejected');
assert(!M.resolveMouthDrop(null, false).ok, 'empty drop rejected');

const gems=[ruby, {n:'other'}];
assert(M.takeGemByRef(gems, ruby)===ruby && gems.length===1 && gems[0].n==='other', 'remove ruby by reference');
assert(M.takeGemByRef(gems, ruby)===null, 'missing gem is a no-op');

const fs=require('fs');
const html=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
assert(/k:'dwarfface'/.test(html), 'chapter places dwarfface');
assert(/prop_dwarfface\.png/.test(html), 'face sprite registered');
assert(/timberOnDwarfMouthLane/.test(html) && /billboardCoversDwarfMouth/.test(html),
  'T-post cannot sit on the open mouth');
assert(!/\{x:43,y:14,k:'lantern'\}/.test(html), 'old face-line lantern is gone');
assert(/loot_shadowcleaver\.png/.test(html), 'axe sprite registered');
assert(fs.existsSync(path.join(__dirname,'../../assets/creatures/dwarf_macar_axe.png')), 'idle axe PNG on disk');
assert(fs.existsSync(path.join(__dirname,'../../assets/creatures/dwarf_macar_axe_atk.png')), 'swing axe PNG on disk');
assert(fs.existsSync(path.join(__dirname,'../../assets/creatures/dwarf_macar_axe_atk_recover.png')), 'axe follow-through PNG on disk');
assert(fs.existsSync(path.join(__dirname,'../../assets/creatures/dwarf_macar_axe_back.png')), 'axe back PNG on disk');
assert(/dwarf_macar_axe\.png/.test(html), 'Macar idle axe sprite registered');
assert(/dwarf_macar_axe_atk\.png/.test(html) || /macar_axe_atk/.test(html), 'Macar swing axe sprite registered');
assert(/dwarf_macar_axe_atk_recover\.png/.test(html), 'Macar axe recover sprite registered');
assert(/wieldsShadowCleaver/.test(html), 'sprite key swaps when the cleaver is wielded');
assert(/ensureShadowCleaverWielded/.test(html), 'attack wields the cleaver if Macar has it');
assert(/vs:'magic',vsPlus:1/.test(html), 'magic-using sword stores vsPlus:1');
assert(/vs:'lycan',vsPlus:2/.test(html), 'lycan sword stores vsPlus:2');
assert(/vs:'regen',vsPlus:2/.test(html), 'regen sword stores vsPlus:2');
assert(/vs:'reptile',vsPlus:3/.test(html), 'reptile sword stores vsPlus:3');
assert(/vs:'dragon',vsPlus:2/.test(html), 'dragon slayer stores vsPlus:2');
assert(/vs:'giant',vsPlus:3/.test(html), 'giant slayer stores vsPlus:3');
assert(/missilePlus:4/.test(html) && /Shield, large, \+1, \+4 vs missiles/.test(html),
  'large shield stores missilePlus:4 on the existing row');
assert(/if\(o\.vsPlus!=null\) raw\.vsPlus=o\.vsPlus/.test(html), 'magItem copies table vsPlus');
assert(/vsPlus:r\.vsPlus/.test(html), 'rollDmgSword copies vsPlus');
assert(/missilePlus:r\.missilePlus/.test(html), 'rollDmgArmor copies missilePlus');
assert(/function weaponVsPlus\(/.test(html), 'index wraps weaponVsPlus');
assert(/loot_dwarfkey\.png/.test(html), 'key sprite registered');
assert(/The mouth is open\. Old work\. Hungry work\./.test(html), 'touch dialogue');
assert(/Offer it something\./.test(html), 'offer question');
assert(/The jaws wait\. Drop it in\?/.test(html), 'drop confirm');
assert(/YUM!/.test(html), 'yum line');
assert(/takeLoot\(pile, true\)/.test(html), 'mouth spit is claimed into the pack, not left as a dead floor prop');
assert(/into MACAR\\?'s pack/.test(html), 'hint says the axe went into the pack');
assert(/if\(p\)\{ x=p\.x\+dx\*0\.4; y=p\.y\+0\.2; \}/.test(html),
  'if a pile remains it lands at Macar\'s feet for walk-over');

if(failed){ console.error(failed+' failed'); process.exit(1); }
console.log('DwarfMouth tests passed');

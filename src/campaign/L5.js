/**
 * Level 5 encounters, monster stat blocks, and loot.
 * Data only. Not loaded by index.html.
 *
 * Numbers are the L5 rows in MACAR_10_LEVEL_RULES (1.5, 1.11, 1.14,
 * section 5) and the DMG XP bands in section 1.0. The map is maps/l5.json.
 * A field marked open is a 1e choice the RULES do not print.
 * A field marked verify is stored as the RULES print it.
 */
(function (root) {
  'use strict';

  var table = root.CampaignTable;
  if (!table && typeof module === 'object' && module.exports) table = require('./CampaignTable');
  if (!table || !table.poisonSave) throw new Error('L5 needs CampaignTable.poisonSave');

  function formula(base, perHp, hp, terms) {
    var parts = terms || [];
    var xp = base + perHp * hp;
    for (var i = 0; i < parts.length; i++) xp += parts[i].xp;
    return { base: base, perHp: perHp, hp: hp, terms: parts, xp: xp };
  }

  function art(key, file, standIn, standInFor) {
    return {
      key: key,
      file: file,
      standIn: !!standIn,
      standInFor: standInFor || null,
      newArt: false
    };
  }

  var DROW_ART = art('drow', 'assets/creatures/mon_drow.png', false, null);
  var MAGE_ART = art('drowMage', 'assets/creatures/mon_drow_mage.png', false, null);
  var MATRON_ART = art('drowMatron', 'assets/creatures/mon_drow_matron.png', false, null);

  var INNATE_BASE = ['dancing lights', 'faerie fire', 'darkness'];
  var INNATE_FOURTH = ['levitate', 'know alignment', 'detect magic'];
  var INNATE_FEMALE = ['clairvoyance', 'detect lie', 'suggestion', 'dispel magic'];

  /**
   * Printed XP from rules 1.5 and guardian V from 1.11.
   * hp on a formula is the figure that makes the printed total,
   * except the priestess, whose cell is approximate.
   */
  var MONSTERS = {
    drow: {
      key: 'drow',
      name: 'Drow warrior',
      source: 'FF Elf, Drow pp.34-35 (verify); F2',
      hd: 2,
      hp: 11,
      level: 2,
      ac: 3,
      acVerify: true,
      mv: '12"',
      attacks: [
        { n: 1, form: 'short sword +1', damage: '1d6+1' },
        { n: 1, form: 'hand crossbow', damage: '1d3', plus: 'sleep poison' }
      ],
      specials: ['MR 52%', 'innate set', 'sleep poison'],
      mr: 52,
      innate: INNATE_BASE.slice(),
      female: false,
      xp: 140,
      xpFormula: formula(20, 2, 11, [
        { kind: 'EA', reason: 'magic resistance', xp: 45 },
        { kind: 'EA', reason: 'poison', xp: 45 },
        { kind: 'SA', reason: 'innate', xp: 8 }
      ]),
      tt: 'FF',
      ttVerify: true,
      art: DROW_ART
    },
    drowMage: {
      key: 'drowMage',
      name: 'Drow mage',
      source: 'FF; MU5',
      hd: 5,
      hp: 14,
      level: 5,
      ac: 4,
      mv: '12"',
      attacks: [{ n: 1, form: 'dagger +1', damage: '1d4+1' }],
      specials: ['MR 60%', 'MU5 spells'],
      mr: 60,
      female: false,
      innate: INNATE_BASE.concat(INNATE_FOURTH),
      xp: 350,
      xpFormula: formula(90, 5, 14, [
        { kind: 'EA', reason: 'printed', xp: 75 },
        { kind: 'EA', reason: 'printed', xp: 75 },
        { kind: 'SA', reason: 'printed', xp: 40 }
      ]),
      tt: 'FF',
      ttVerify: true,
      art: MAGE_ART
    },
    drowPriestess: {
      key: 'drowPriestess',
      name: 'Drow priestess',
      source: 'FF; C5',
      hd: 5,
      hp: 24,
      level: 5,
      ac: 3,
      mv: '12"',
      attacks: [{ n: 1, form: 'mace +1', damage: '1d6+2' }],
      specials: ['MR 60%', 'C5 spells'],
      mr: 60,
      female: true,
      innate: INNATE_BASE.concat(INNATE_FOURTH).concat(INNATE_FEMALE),
      innateFemaleVerify: true,
      xp: 380,
      xpApprox: true,
      bandXp: 400,
      xpFormula: formula(90, 5, 24, [
        { kind: 'EA', reason: 'magic resistance', xp: 75 },
        { kind: 'EA', reason: 'spell use', xp: 75 },
        { kind: 'SA', reason: 'innate abilities', xp: 40 }
      ]),
      tt: 'FF',
      ttVerify: true,
      art: art('drowMatron', 'assets/creatures/mon_drow_matron.png', true, 'Drow priestess')
    },
    drowMatron: {
      key: 'drowMatron',
      name: 'Drow Matron',
      source: 'FF priestess rank: RULING C7',
      hd: 7,
      hp: 32,
      level: 7,
      ac: 1,
      mv: '12"',
      attacks: [{ n: 1, form: 'snake-whip', damage: '1d4', extra: '1d4' }],
      specials: ['MR 64%', 'C7 spells'],
      mr: 64,
      casterLevel: 7,
      female: true,
      innate: INNATE_BASE.concat(INNATE_FOURTH).concat(INNATE_FEMALE),
      innateFemaleVerify: true,
      bossFlagOnIndividual: false,
      xp: 956,
      xpFormula: formula(225, 8, 32, [
        { kind: 'EA', reason: 'printed', xp: 175 },
        { kind: 'EA', reason: 'printed', xp: 175 },
        { kind: 'SA', reason: 'printed', xp: 125 }
      ]),
      tt: 'U',
      lair: 'FF',
      lairVerify: true,
      art: MATRON_ART
    },
    rubyGuardian: {
      key: 'rubyGuardian',
      name: 'Ruby Guardian V',
      source: 'RULING 1.11',
      tier: 5,
      hd: 10,
      hp: 60,
      ac: 2,
      mv: '6"',
      attacks: [{ n: 1, form: 'slam', damage: '2d10' }],
      specials: [
        'construct immunities: sleep, charm, hold, poison, fear',
        'never checks morale',
        'shard cone as IV',
        'hit only by +1 weapons'
      ],
      cone: { damage: '2d6', range: '3"', save: 'vs breath for half', everySec: 4, minTiles: 2 },
      hitOnlyBy: 1,
      xp: 2640,
      xpFormula: formula(900, 14, 60, [
        { kind: 'SA', reason: 'shard cone', xp: 450 },
        { kind: 'SA', reason: 'hit only by +1', xp: 450 }
      ]),
      ruby: { gp: 1250, band: '~1250' },
      art: art('construct', 'assets/creatures/mon_construct.png', true, 'Ruby Guardian V')
    }
  };

  var TRAITS = {
    source: 'FF Elf, Drow pp.34-35 (verify)',
    mrBase: 50,
    mrPerLevel: 2,
    savesVsMagic: 2,
    infravision: '12"',
    surprise: '1 in 8',
    innateOncePerDay: true,
    gearPlus: '1 to 3',
    gearMetal: 'adamantite',
    sunlight: { present: false, gearKeepsPower: true }
  };

  var MAGE = {
    level: 5,
    klass: 'MU',
    slots: { 1: 4, 2: 2, 3: 1 },
    list: ['Magic Missile', 'Magic Missile', 'Shield', 'Sleep', 'Web', 'Mirror Image', 'Lightning Bolt'],
    sleep: {
      spell: 'Sleep',
      affects: '4+1 HD or less',
      macar: 'unaffected at F6-F7',
      ghosts: 'immune',
      ghostsRule: '1.13'
    },
    spellEverySec: 2
  };

  var PRIESTESS = {
    level: 5,
    klass: 'C',
    slots: { 1: 3, 2: 3, 3: 1 },
    wis: null,
    list: ['Command', 'Cause Light Wounds', 'Darkness', 'Hold Person', 'Hold Person', "Silence 15' r.", 'Cause Blindness'],
    spellEverySec: 2
  };

  var MATRON = {
    key: 'drowMatron',
    separateFromGuardian: true,
    bossFlagOnIndividual: false,
    level: 7,
    klass: 'C',
    slots: { 1: 3, 2: 3, 3: 2, 4: 1 },
    wis: null,
    list: [
      'Command', 'Cause Fear', 'Cause Light Wounds',
      'Hold Person', 'Hold Person', "Silence 15' r.",
      'Dispel Magic', 'Cause Blindness',
      'Cause Serious Wounds'
    ],
    checkEverySec: 1,
    spellEverySec: 2,
    darkness: { innate: true, perDay: 1, center: 'Macar', attackMod: -4 },
    holdPerson: { target: 'Macar', save: 'vs spell', dwarfBonus: true, freeActionImmune: true },
    silence: { range: "15'", target: 'kin cluster', stops: 'voice abilities' },
    causeSerious: { when: 'adjacent', damage: '2d8+1' },
    dispel: { when: 'Macar has a battle buff', buffs: ['pixie dust', 'golden egg'] },
    levitateBelowHpFraction: 0.3,
    priority: [
      'Round 1: darkness centered on Macar, innate, once per day. Attacks into or out of it are at -4.',
      'Hold Person on Macar. The dwarf bonus applies, and Free Action makes him immune. Then Silence 15\' r. on the kin cluster.',
      'While Macar is held, warriors close with swords and crossbowmen shoot sleep darts. Darts do not affect ghosts, so the targets skip ghosts.',
      'Cause Serious Wounds, touch 2d8+1, when adjacent. Dispel Magic if Macar has a battle buff.',
      'Below 30% HP she levitates to a ledge, and the mage covers her with Lightning Bolt.'
    ]
  };

  /**
   * Drow sleep is the 1.5 ruling, not the spider H1 damage.
   * CampaignTable.poisonSave stays pointed at for the spider sizes.
   * Those mods are not applied: the dart has no size row, and the FF modifier is verify.
   */
  var POISON = {
    kind: 'sleep',
    ruling: '1.5',
    save: 'vs poison',
    ffModifier: null,
    ffModifierVerify: true,
    spiderTable: table.poisonSave,
    usesSpiderTable: false,
    h1Damage: false,
    h1Note: 'D5-B H1 is the failed spider save. A failed drow save sleeps the target.',
    durationTurns: '2d4',
    secondsPerTurn: 5,
    doesNothing: true,
    autoHit: true,
    wakeOnDamage: true,
    rawSlay: false,
    ghostsImmune: true,
    ghostsRule: '1.13',
    antitoxinPlus: 4,
    antitoxinFirstUseful: 5,
    saveFloor: 2,
    floorRule: '6 #12'
  };

  var SWORD = {
    id: 'drow_short_sword_plus_2',
    name: 'Drow +2 short sword',
    plus: 2,
    damage: '1d6+2',
    bearer: 'matron-guard',
    always: true,
    count: 1,
    usableByMacar: 'Y',
    coversHitOnlyBy: 1,
    sunlight: false,
    keepsPower: true
  };

  var WANDER = [
    { slot: 1, key: 'drow', count: '1d3' },
    { slot: 2, key: 'drow', count: '1d3' },
    { slot: 3, key: 'drow', count: '1d3' },
    { slot: 4, key: 'drowMage', count: '1+1 warrior' },
    { slot: 5, key: 'drowPriestess', count: '1+2 warriors' },
    { slot: 6, key: 'drow', count: '1d4' }
  ];

  var LOOT = {
    individual: {
      U: {
        coins: { cp: '10-80', sp: '10-60', gp: '5-30' },
        gems: { chance: 90, dice: '2-16' },
        jewelry: { chance: 80, dice: '1-6' },
        magic: { chance: 55, count: 1, kind: 'any' },
        decision: 'D1-A'
      }
    },
    lair: {
      letter: null,
      source: 'FF',
      verify: true,
      onCorpse: false,
      decision: 'D2-A'
    },
    caches: {
      count: 16,
      level: 5,
      table: 'DMG Appendix A Table V',
      row: {
        cp: { chance: 5, min: 4, max: 24, times: 1000 },
        sp: { chance: 10, min: 4, max: 24, times: 100 },
        ep: { chance: 25, min: 1, max: 10, times: 100 },
        gp: { chance: 50, min: 4, max: 24, times: 100 },
        pp: { chance: 25, min: 1, max: 4, times: 100 },
        gems: { chance: 30, min: 1, max: 12 },
        jewelry: { chance: 15, min: 1, max: 3 },
        magic: { chance: 15, count: 2, kind: 'any' }
      }
    },
    corpseBand: {
      warrior: 'FF',
      mage: 'FF',
      priestess: 'FF',
      matron: 'U',
      guardian: 'ruby only'
    },
    magicFilter: '2.2 usable by a dwarf fighter',
    armorRefit: 'D12-B',
    components: {
      drow_adamantite: { perWarrior: 0.5, guardAlways: 2 }
    },
    drops: [
      { id: 'drow_adamantite', from: 'drow', chance: 0.5 },
      { id: 'drow_adamantite', from: 'matron-guard', count: 2, always: true },
      { id: 'drow_short_sword_plus_2', from: 'matron-guard', count: 1, always: true }
    ],
    usable: [
      { name: 'Coins, gems', usableByMacar: 'Y' },
      { name: 'Rolled magic', usableByMacar: 'Y', filter: '2.2' },
      { name: 'Drow +1/+2 short sword, mace, dagger', usableByMacar: 'Y' },
      { name: 'Drow chain mail +1 to +3', usableByMacar: 'Y', raw: 'elf-sized, no', after: 'D12-B forge refit' },
      { name: 'Drow cloak or boots', usableByMacar: 'Y' },
      { name: 'Hand crossbow', usableByMacar: 'Y' },
      { name: 'Adamantite', usableByMacar: 'Y' },
      { name: 'Electrum Tooth 5', usableByMacar: 'Y' }
    ],
    questItems: [
      { id: 'grond_tooth_electrum_5', usableByMacar: 'Y', cursed: true, countsForRitual: true, countsForTeethCarried: true }
    ]
  };

  var XP = {
    drow: 140,
    drowMage: 350,
    drowPriestess: 380,
    drowMatron: 956,
    rubyGuardian: 2640
  };

  /** 1.12 prints 5,270 with no pack annotation. Section 6 says stat blocks win. */
  var FORECAST_BOSS_GUARDIAN_XP = 5270;

  var OPEN = [
    {
      id: 'warrior-ac',
      note: 'The warrior cell prints AC 3 and marks it verify. AC 3 is stored. (open)'
    },
    {
      id: 'warrior-mr',
      note: 'The shared line is 50% magic resistance plus 2% per level, which is 54 at 2nd level. The warrior cell prints 52. The cell is stored. (open)'
    },
    {
      id: 'priestess-xp',
      note: 'The 4+1 to 5 band at 24 hp, with magic resistance, spell use, and innate abilities, sums to 400. The cell prints about 380. The cell is stored as 380. (open)'
    },
    {
      id: 'priestess-plus',
      note: 'The priestess mace is printed as 1d6+2. A mace +1 is 1d6+1, and the extra +1 is not named. (open)'
    },
    {
      id: 'female-innate',
      note: 'Females also get clairvoyance, detect lie, suggestion, and dispel magic. The RULES mark that list verify. It is stored as written. (open)'
    },
    {
      id: 'spell-segments',
      note: 'The house cadence is one spell per 2 s. Casting segments for the drow lists are not printed. (open)'
    },
    {
      id: 'sleep-modifier',
      note: 'The dart save is vs poison, and the FF modifier is verify. CampaignTable.poisonSave is the spider size table, so those mods are not applied. (open)'
    },
    {
      id: 'band-count',
      note: 'Placed bands follow the section 5 shapes: a mage and one warrior, a priestess and two warriors, plus patrols of three and two. The FF number appearing is not printed. (open)'
    },
    {
      id: 'no-slaves',
      note: 'No slave races are placed. Section 1.5 says to verify that the FF entry prints none. (open)'
    },
    {
      id: 'treasure-ff',
      note: 'Warriors, the mage, and the priestess print treasure type FF, marked verify. No DMG letter is stored for those corpses. (open)'
    },
    {
      id: 'lair-letter',
      note: 'The Matron chest is a D2 lair chest. The cell says lair FF, verify, and the live LAIR table has no FF row, so the dice are not stored. (open)'
    },
    {
      id: 'map-rooms',
      note: 'Level 5 is a new floor. The RULES print no room coordinates. (open)'
    },
    {
      id: 'tooth-face',
      note: 'Electrum tooth 5 is on the Matron hall north wall at (88, 32). The RULES print the tooth and no coordinate. (open)'
    },
    {
      id: 'ruby-band',
      note: 'Guardian V\'s ruby is stored as 1250 gp. Section 1.11 prints ~1,250 and no range. (open)'
    },
    {
      id: 'priestess-art',
      note: 'No priestess sheet exists. She uses the matron sheet. (open)'
    },
    {
      id: 'guardian-art',
      note: 'No ruby-guardian sheet exists. Guardian V uses the construct sheet. (open)'
    },
    {
      id: 'cache-places',
      note: 'Sixteen level-5 caches are placed on the new floor. The RULES print the count and no coordinates. (open)'
    },
    {
      id: 'sword-guard',
      note: 'One warrior beside the Matron carries the +2 short sword and always drops 2 adamantite. The RULES say the Matron\'s guard and print no headcount. (open)'
    },
    {
      id: 'mage-cover',
      note: 'Below 30% HP the Matron levitates and the mage covers her with Lightning Bolt. The RULES do not name which mage. (open)'
    },
    {
      id: 'darkness-duration',
      note: 'Innate darkness is once per day and attacks through it are at -4. The duration is not printed. (open)'
    },
    {
      id: 'matron-addends',
      note: 'The Matron XP cell prints +175 +175 +125 and does not name the abilities. The amounts match two exceptional abilities and one special ability on the 7 HD band. (open)'
    },
    {
      id: 'chain-plus',
      note: 'Drow chain is +1 to +3. Which plus a corpse rolls is not printed. D12-B refits it for Macar. (open)'
    }
  ];

  function printedXp(mon) {
    return formula(mon.xpFormula.base, mon.xpFormula.perHp, mon.xpFormula.hp, mon.xpFormula.terms).xp;
  }

  function bossGuardianXp() {
    return XP.rubyGuardian + XP.drowMatron;
  }

  function ingredientIds() {
    return ['drow_adamantite'];
  }

  function itemIds() {
    return LOOT.questItems.map(function (row) { return row.id; });
  }

  var api = {
    MONSTERS: MONSTERS,
    TRAITS: TRAITS,
    MAGE: MAGE,
    PRIESTESS: PRIESTESS,
    MATRON: MATRON,
    POISON: POISON,
    SWORD: SWORD,
    WANDER: WANDER,
    LOOT: LOOT,
    XP: XP,
    FORECAST_BOSS_GUARDIAN_XP: FORECAST_BOSS_GUARDIAN_XP,
    OPEN: OPEN,
    printedXp: printedXp,
    bossGuardianXp: bossGuardianXp,
    ingredientIds: ingredientIds,
    itemIds: itemIds,
    wired: false
  };

  root.L5 = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

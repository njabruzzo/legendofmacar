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
   * hp on a formula is the figure that makes the printed total.
   * The priestess cell is the formula, 400.
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
      mv: '12"',
      attacks: [
        { n: 1, form: 'short sword +1', damage: '1d6+1' },
        { n: 1, form: 'hand crossbow', damage: '1d3', plus: 'sleep poison' }
      ],
      specials: ['MR 54%', 'innate set', 'sleep poison'],
      mr: 54,
      innate: INNATE_BASE.slice(),
      female: false,
      xp: 140,
      xpFormula: formula(20, 2, 11, [
        { kind: 'EA', reason: 'magic resistance', xp: 45 },
        { kind: 'EA', reason: 'poison', xp: 45 },
        { kind: 'SA', reason: 'innate', xp: 8 }
      ]),
      tt: 'N×5, Q×2',
      corpseLetters: { N: 5, Q: 2 },
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
      tt: 'N×5, Q×2',
      corpseLetters: { N: 5, Q: 2 },
      wearsChain: false,
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
      xp: 400,
      xpFormula: formula(90, 5, 24, [
        { kind: 'EA', reason: 'magic resistance', xp: 75 },
        { kind: 'EA', reason: 'spell use', xp: 75 },
        { kind: 'SA', reason: 'innate abilities', xp: 40 }
      ]),
      tt: 'N×5, Q×2',
      corpseLetters: { N: 5, Q: 2 },
      adamantite: 3,
      chain: { plus: 1, dropChance: 0.1 },
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
      ruby: { gp: 1250 },
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
    segments: {
      'Magic Missile': 0.1,
      'Shield': 0.1,
      'Sleep': 0.1,
      'Web': 0.2,
      'Mirror Image': 0.2,
      'Lightning Bolt': 0.3
    },
    innateSegment: 0.1,
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
    spellEverySec: 2,
    segments: {
      'Command': 0.1,
      'Cause Light Wounds': 0.5,
      'Hold Person': 0.5,
      "Silence 15' r.": 0.5,
      'Cause Blindness': 1.0
    },
    innateSegment: 0.1
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
    segments: {
      'Command': 0.1,
      'Cause Fear': 0.1,
      'Cause Light Wounds': 0.5,
      'Hold Person': 0.5,
      "Silence 15' r.": 0.5,
      'Dispel Magic': 0.6,
      'Cause Blindness': 1.0,
      'Cause Serious Wounds': 0.7
    },
    checkEverySec: 1,
    spellEverySec: 2,
    darkness: { innate: true, perDay: 1, center: 'Macar', attackMod: -4, durationSec: '10 + 1 per level' },
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
      'Below 30% HP, the floor mage in the mage gallery, if alive, walks to the Matron hall and casts Lightning Bolt once when she is in range. If the mage is dead, she only levitates.'
    ]
  };

  /**
   * Drow sleep is the 1.5 ruling, not the spider H1 damage.
   * CampaignTable.poisonSave stays pointed at for the spider sizes.
   * Those mods are not applied: the dart has no size row. The FF modifier is -4.
   */
  var POISON = {
    kind: 'sleep',
    ruling: '1.5',
    save: 'vs poison',
    ffModifier: -4,
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
      present: false,
      source: 'FF',
      reason: '0% in lair, no lair letter',
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
      warrior: 'N×5, Q×2',
      mage: 'N×5, Q×2',
      priestess: 'N×5, Q×2',
      matron: 'U',
      guardian: 'ruby only'
    },
    magicFilter: '2.2 usable by a dwarf fighter',
    armorRefit: 'D12-B',
    components: {
      drow_adamantite: { perWarrior: 0.5, guardAlways: 2, priestessAlways: 3 },
      drow_chain: { plus: 1, chance: 0.1, from: ['drow', 'matron-guard', 'drowPriestess'] }
    },
    drops: [
      { id: 'drow_adamantite', from: 'drow', chance: 0.5 },
      { id: 'drow_adamantite', from: 'matron-guard', count: 2, always: true },
      { id: 'drow_adamantite', from: 'drowPriestess', count: 3, always: true },
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
    drowPriestess: 400,
    drowMatron: 956,
    rubyGuardian: 2640
  };

  /** Refreshed 1.12 column is the stat-block sum. */
  var FORECAST_BOSS_GUARDIAN_XP = 3596;

  var OPEN = [
    {
      id: 'warrior-ac',
      note: 'Resolved by §7.3. The warrior stays AC 3.'
    },
    {
      id: 'warrior-mr',
      note: 'Resolved by §7.3. The warrior magic resistance is 54%.'
    },
    {
      id: 'priestess-xp',
      note: 'Resolved by §7.3. The priestess XP is 400. The 380 figure is retired.'
    },
    {
      id: 'priestess-plus',
      note: 'Resolved by §7.3. The priestess mace stays 1d6+2.'
    },
    {
      id: 'female-innate',
      note: 'Resolved by §7.3. Females keep clairvoyance, detect lie, suggestion, and dispel magic. Only dispel magic is wired.'
    },
    {
      id: 'spell-segments',
      note: 'Resolved by §7.3. Wind-up is the casting time times 0.1 s. Innate abilities take 0.1 s.'
    },
    {
      id: 'sleep-modifier',
      note: 'Resolved by §7.3. The dart save is vs poison at -4. The spider size table is not used.'
    },
    {
      id: 'band-count',
      note: 'Resolved by §7.3. The placed bands stay as they are.'
    },
    {
      id: 'no-slaves',
      note: 'Resolved by §7.3. The FF drow entry prints no slaves, so none are placed.'
    },
    {
      id: 'treasure-ff',
      note: 'Resolved by §7.3. Every non-boss drow corpse rolls N×5 and Q×2. The Matron rolls U.'
    },
    {
      id: 'lair-letter',
      note: 'Resolved by §7.3. FF drow print no lair letter, so there is no L5 chest.'
    },
    {
      id: 'nick-chest',
      note: 'Nick has not decided whether to add a replacement chest on L5. No chest is stored. (open)'
    },
    {
      id: 'map-rooms',
      note: 'Resolved by §7.3. The Level 5 rooms stay as placed.'
    },
    {
      id: 'tooth-face',
      note: 'Resolved by §7.3. Electrum tooth 5 stays at (88, 32).'
    },
    {
      id: 'ruby-band',
      note: 'Resolved by §7.0. Guardian V ruby is exactly 1,250 gp.'
    },
    {
      id: 'priestess-art',
      note: 'Resolved by §7.3. The priestess uses the matron sheet.'
    },
    {
      id: 'guardian-art',
      note: 'Resolved by §7.3. Guardian V uses the construct sheet.'
    },
    {
      id: 'cache-places',
      note: 'Resolved by §7.3. Sixteen level-5 caches stay as placed.'
    },
    {
      id: 'sword-guard',
      note: 'Resolved by §7.3. One guard carries the +2 short sword and always drops 2 adamantite.'
    },
    {
      id: 'mage-cover',
      note: 'Resolved by §7.3. Below 30% HP the floor mage, if alive, walks to the hall and casts Lightning Bolt once. If she is dead, the Matron only levitates.'
    },
    {
      id: 'darkness-duration',
      note: 'Resolved by §7.3. Innate darkness lasts 10 s plus 1 s per drow level.'
    },
    {
      id: 'matron-addends',
      note: 'Resolved by §7.3. The Matron addends are spells 175, magic resistance 175, and innate abilities 125.'
    },
    {
      id: 'chain-plus',
      note: 'Resolved by §7.3. A drow chain drop is +1 only, at 10% per armored drow. The mage wears none.'
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

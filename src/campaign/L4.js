/**
 * Level 4 encounters, monster stat blocks, and loot.
 * Data only. Not loaded by index.html.
 *
 * Numbers are the L4 rows in MACAR_10_LEVEL_RULES (1.4, 1.11, 1.14,
 * 1.15, section 5) and the DMG XP bands in section 1.0. The ogre cave
 * facts come from OgreCave.js. The map is maps/l4.json.
 * A field marked open is a 1e choice the RULES do not print.
 * A field marked verify is stored as the RULES print it.
 */
(function (root) {
  'use strict';

  var Cave = root.OgreCave;
  if (!Cave && typeof module === 'object' && module.exports) Cave = require('./OgreCave');
  if (!Cave || !Cave.OGRE_CAVE) throw new Error('L4 needs OgreCave');

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

  var ORC_ART = art('orc', 'assets/creatures/mon_orc.png', false, null);
  var ORC_STAND = art('orc', 'assets/creatures/mon_orc.png', true, 'no separate sheet');
  var WARG_ART = art('warg', 'assets/creatures/mon_warg.png', false, null);

  /**
   * Printed XP from rules 1.4 and guardian IV from 1.11.
   * hp on the formula is the figure that makes the printed total.
   */
  var MONSTERS = {
    orc: {
      key: 'orc',
      name: 'Orc',
      source: 'MM1 Orc p.76',
      hd: 1,
      ac: 6,
      mv: '9"',
      attacks: [{ n: 1, form: 'weapon', damage: '1d8' }],
      specials: ['-1 to hit in sunlight; none underground'],
      xp: 15,
      xpFormula: formula(10, 1, 5, []),
      tt: 'L',
      lairTt: 'C, O, Qx10, S',
      art: ORC_ART
    },
    orcLeader: {
      key: 'orcLeader',
      name: 'Orc leader',
      source: 'MM1 Orc p.76; 1 leader and 2 assistants, HD 1, 8 hp',
      hd: 1,
      hp: 8,
      ac: 6,
      mv: '9"',
      attacks: [{ n: 1, form: 'weapon', damage: '1d8' }],
      specials: [],
      xp: 18,
      xpFormula: formula(10, 1, 8, []),
      tt: 'L',
      art: ORC_STAND
    },
    orcGuard: {
      key: 'orcGuard',
      name: 'Orc chief guard',
      source: 'MM1 Orc p.76 lair guards; AC 4, 15 hp, attack as 3 HD',
      hd: 3,
      hp: 15,
      ac: 4,
      mv: '9"',
      attacks: [{ n: 1, form: 'weapon', damage: '2d4' }],
      specials: [],
      xp: 80,
      xpFormula: formula(35, 3, 15, []),
      tt: 'L',
      art: ORC_STAND
    },
    warg: {
      key: 'warg',
      name: 'Worg',
      source: 'MM1 Wolf p.101',
      hd: '3+3',
      ac: 6,
      mv: '18"',
      attacks: [{ n: 1, form: 'bite', damage: '2d4' }],
      specials: [],
      xp: 126,
      xpFormula: formula(60, 4, 16.5, []),
      tt: 'Nil',
      corpseBand: 'mid',
      movedFrom: 'L2',
      art: WARG_ART
    },
    wolf: {
      key: 'wolf',
      name: 'Wolf',
      source: 'MM1 Wolf p.101',
      hd: '2+2',
      ac: 7,
      mv: '18"',
      attacks: [{ n: 1, form: 'bite', damage: '1d4+1' }],
      specials: [],
      xp: 68,
      xpFormula: formula(35, 3, 11, []),
      tt: 'Nil',
      art: art('warg', 'assets/creatures/mon_warg.png', true, 'Wolf')
    },
    orcShaman: {
      key: 'orcShaman',
      name: 'Orc shaman',
      source: 'DMG humanoid shamans; HOUSE 7th level; D15-A',
      hd: 7,
      hp: 32,
      ac: 5,
      mv: '9"',
      attacks: [{ n: 1, form: 'mace', damage: '1d6+1' }],
      specials: ['spells'],
      casterLevel: 7,
      wis: 14,
      decision: 'D15-A',
      movedFrom: 'L2 7th-level goblin shaman',
      xp: 656,
      xpFormula: formula(225, 8, 32, [{ kind: 'EA', reason: 'spell use', xp: 175 }]),
      tt: 'L',
      art: ORC_STAND
    },
    orcChief: {
      key: 'orcChief',
      name: 'Orc chief',
      source: 'MM1 orc chief, scaled up: RULING',
      hd: 5,
      hp: 33,
      ac: 3,
      mv: '9"',
      str: '18/50',
      toHit: 1,
      attacks: [{ n: 1, form: 'battle axe', damage: '1d8+3', toHit: 1 }],
      specials: ['Specialty Attack, house bands, whole round'],
      xp: 255,
      xpFormula: formula(90, 5, 33, []),
      tt: 'U',
      lair: 'C, O, Qx10, S',
      bossFlagOnIndividual: false,
      art: ORC_STAND
    },
    ogress: {
      key: 'ogress',
      name: 'Ogress',
      source: 'MM1 Ogre p.75',
      hd: '4+1',
      ac: 5,
      mv: '9"',
      attacks: [],
      specials: ['flees', 'never fights'],
      fights: false,
      hostile: false,
      targetable: false,
      xp: 185,
      xpFormula: formula(90, 5, 19, []),
      tt: 'not rolled',
      art: art('ogress', null, true, 'no ogre sheet')
    },
    rubyGuardian: {
      key: 'rubyGuardian',
      name: 'Ruby Guardian IV',
      source: 'RULING 1.11',
      tier: 4,
      hd: 8,
      hp: 48,
      ac: 3,
      mv: '6"',
      attacks: [{ n: 1, form: 'slam', damage: '2d8' }],
      specials: [
        'construct immunities: sleep, charm, hold, poison, fear',
        'never checks morale',
        'shard cone 3", 2d6, save vs breath for half'
      ],
      cone: { damage: '2d6', range: '3"', save: 'vs breath for half', everySec: 4, minTiles: 2 },
      hitOnlyBy: 0,
      xp: 1030,
      xpFormula: formula(375, 10, 48, [{ kind: 'SA', reason: 'shard cone', xp: 175 }]),
      ruby: { gp: 1000 },
      art: art('construct', 'assets/creatures/mon_construct.png', true, 'Ruby Guardian IV')
    }
  };

  var SHAMAN = {
    level: 7,
    wis: 14,
    decision: 'D15-A',
    /* §1.2. PHB 7th-level cleric is 3/3/2/1. WIS 14 adds two 1st-level slots. */
    slots: { 1: 5, 2: 3, 3: 2, 4: 1 },
    emptySlots: [3, 4],
    houseList: [
      'Bless',
      'Cause Fear',
      'Darkness',
      'Cause Light Wounds',
      'Cause Light Wounds',
      'Hold Person',
      "Silence 15' r."
    ],
    bless: { range: '5"', bonus: 1, rounds: 6, targets: 'orcs' },
    holdPerson: { target: 'Macar', save: 'vs spell', dwarfBonus: true, freeActionImmune: true },
    silence: { range: "15'", target: 'kin', stops: 'voice abilities' },
    spellEverySec: 2,
    /* Casting time × 0.1 s. PHB cleric spells. */
    segments: {
      'Bless': 1.0,
      'Cause Fear': 0.1,
      'Darkness': 0.4,
      'Cause Light Wounds': 0.5,
      'Hold Person': 0.5,
      "Silence 15' r.": 0.5
    }
  };

  var CHIEF = {
    key: 'orcChief',
    separateFromGuardian: true,
    bossFlagOnIndividual: false,
    checkEverySec: 1,
    specialty: 'house bands, whole round, when adjacent',
    helplessHitsLand: true,
    moraleBelowHpFraction: 0.25,
    morale: { roll: 'd100', holdOnOrUnder: 65, once: true },
    fallback: 'ogre-cave',
    corpse: 'U',
    lairChest: 'C, O, Qx10, S',
    priority: [
      'On the first round he roars, and the shaman casts Bless on all orcs within 5 inches: +1 to hit and morale for 6 rounds.',
      'While the shaman lives, the shaman tries Hold Person on Macar, then Silence 15\' r. on a kin. At most one spell per 2 s.',
      'When adjacent to Macar he uses the Specialty Attack. If Macar is held, every hit lands.',
      'Below 25% HP he rolls morale once. He holds on d100 of 65 or less. On a failure, he and his guards fall back to the boulder cave.'
    ]
  };

  var EGGS = {
    count: Cave.OGRE_CAVE.goldenEggs.count,
    id: 'golden_egg',
    k: 'egg',
    rule: '1.15',
    acDelta: Cave.OGRE_CAVE.goldenEggs.acDelta,
    descending: true,
    note: 'AC 4 becomes AC 0',
    battles: 1,
    decision: 'D11-A',
    oneAtATime: true,
    armedOrActive: 'only one',
    section6: 2,
    stacksWith: ['armor', 'shields', 'rings', 'protection'],
    sellGp: Cave.OGRE_CAVE.goldenEggs.sellGp,
    sellWhere: 'Noz',
    treasureXpOnlyIfSold: true,
    removedWhenBattleEnds: true
  };

  var WANDER = [
    { slot: 1, key: 'orc', count: '1d6' },
    { slot: 2, key: 'orc', count: '1d6' },
    { slot: 3, key: 'warg', count: '1d3' },
    { slot: 4, key: 'wolf', count: '1d4' },
    { slot: 5, key: 'orcLeader', count: '1+1d4 orcs' },
    { slot: 6, key: 'warg', count: '1+1d4 orcs' }
  ];

  var LOOT = {
    individual: {
      L: { coins: { ep: '2d6' } },
      U: {
        coins: { cp: '10-80', sp: '10-60', gp: '5-30' },
        gems: { chance: 90, dice: '2-16' },
        jewelry: { chance: 80, dice: '1-6' },
        magic: { chance: 55, count: 1, kind: 'any' },
        decision: 'D1-A'
      }
    },
    lair: {
      letters: ['C', 'O', 'Q', 'S'],
      qTimes: 10,
      onCorpse: false,
      decision: 'D2-A',
      C: {
        letter: 'C',
        cp: { chance: 20, dice: '1d12', times: 1000 },
        sp: { chance: 30, dice: '1d6', times: 1000 },
        ep: null,
        gp: null,
        pp: null,
        gems: { chance: 25, dice: '1d6' },
        jewelry: { chance: 20, dice: '1d3' },
        magic: { chance: 10, count: 2, kind: 'any' }
      },
      S: { chance: 40, count: '1-8', kind: 'potions' },
      O: {
        letter: 'O',
        cp: { chance: 25, dice: '1d4', times: 1000 },
        sp: { chance: 20, dice: '1d3', times: 1000 }
      },
      Q: {
        letter: 'Q',
        times: 10,
        gems: { chance: 50, dice: '1d4' }
      }
    },
    caches: {
      count: 16,
      level: 4,
      table: 'DMG Appendix A Table V',
      row: {
        cp: { chance: 10, min: 3, max: 18, times: 1000 },
        sp: { chance: 15, min: 3, max: 18, times: 100 },
        ep: { chance: 25, min: 1, max: 8, times: 100 },
        gp: { chance: 50, min: 3, max: 18, times: 100 },
        pp: { chance: 25, min: 1, max: 2, times: 100 },
        gems: { chance: 20, min: 1, max: 10 },
        jewelry: { chance: 10, min: 1, max: 2 },
        magic: { chance: 12, count: 1, kind: 'any' }
      }
    },
    corpseBand: {
      orc: 'L',
      chief: 'U',
      wolf: 'Nil',
      warg: 'mid',
      ogress: 'not rolled',
      guardian: 'ruby only'
    },
    magicFilter: '2.2 usable by a dwarf fighter',
    components: {
      worg_pelt: { perKill: 1, from: ['warg', 'wolf'] },
      hide: { source: 'worg_pelt' }
    },
    drops: [
      { id: 'worg_pelt', from: 'warg', count: 1 },
      { id: 'worg_pelt', from: 'wolf', count: 1 }
    ],
    questItems: [
      { id: 'grond_tooth_electrum_4', usableByMacar: 'Y', cursed: true, countsForRitual: true, countsForTeethCarried: true },
      { id: 'golden_egg', usableByMacar: 'Y', kind: 'consumable', count: 3 }
    ]
  };

  var XP = {
    orc: 15,
    orcLeader: 18,
    orcGuard: 80,
    warg: 126,
    wolf: 68,
    orcShaman: 656,
    orcChief: 255,
    ogress: 185,
    rubyGuardian: 1030
  };

  /** Refreshed 1.12 column is the stat-block sum, 1,285. */
  var FORECAST_BOSS_GUARDIAN_XP = 1285;
  var FORECAST_PACK = {
    chief: 1,
    shaman: 1,
    guards: 6,
    worgs: 4,
    orcs: 8,
    guardian: 1
  };

  var OPEN = [
    {
      id: 'orc-hp',
      note: 'Resolved by §7.2. Orc XP stays 15, at 5 hp.'
    },
    {
      id: 'guard-count',
      note: 'Resolved by §7.2. Six chief bodyguards stay. MM1 lair prints 5-30.'
    },
    {
      id: 'assistant-count',
      note: 'Resolved by §7.2. The three placed leaders are 1 leader and 2 assistants. No new placement was added.'
    },
    {
      id: 'leader-gnoll',
      note: 'Resolved by §7.2. Leaders and assistants are HD 1, 8 hp, AC 6, weapon 1d8, XP 18.'
    },
    {
      id: 'guard-gnoll',
      note: 'Resolved by §7.2. Chief guards are AC 4, 15 hp, attack as 3 HD, 2d4, XP 80.'
    },
    {
      id: 'chief-to-hit',
      note: 'Resolved by §7.2. STR 18/50 gives +1 to hit, stored with the printed +3 damage.'
    },
    {
      id: 'chief-morale',
      note: 'Resolved by §7.2. Below 25% HP he holds on d100 of 65 or less, rolled once.'
    },
    {
      id: 'shaman-wis-bonus',
      note: 'Resolved by §1.2. A 7th-level cleric is 3/3/2/1, and WIS 14 adds two 1st-level slots, so the row is 5/3/2/1. The 3rd and 4th slots stay empty under the house list.'
    },
    {
      id: 'shaman-list-versus-slots',
      note: 'Resolved by §1.2. Bless, Cause Fear, Darkness, and Cause Light Wounds twice are the five locked 1st-level spells, and they fill the five 1st-level slots.'
    },
    {
      id: 'shaman-segments',
      note: 'Resolved by §7.2. Wind-up is the casting time times 0.1 s: Bless 1.0, Cause Fear 0.1, Darkness 0.4, Cause Light Wounds 0.5, Hold Person 0.5, Silence 0.5.'
    },
    {
      id: 'wolf-count',
      note: 'Resolved by §7.2. Two wolves stay. MM1 prints 2-20.'
    },
    {
      id: 'warg-transplant',
      note: 'Resolved by §7.2. Nine worgs stay where they were placed. MM1 prints 3-12 per group.'
    },
    {
      id: 'cut-companions',
      note: 'Resolved by §7.2. Drow, spiders, the bugbear, and the beetle are not L4 residents.'
    },
    {
      id: 'ogre-cave-room',
      note: 'Resolved by §7.2. The ogre cave stays the south annex at (32, 50).'
    },
    {
      id: 'ogress-path',
      note: 'Resolved by §7.2. The ogress flees to (28, 76) and despawns.'
    },
    {
      id: 'tooth-face',
      note: 'Resolved by §7.2. Electrum tooth 4 stays at (46, 14).'
    },
    {
      id: 'ruby-band',
      note: 'Resolved by §7.0. Guardian IV ruby is exactly 1,000 gp.'
    },
    {
      id: 'chief-art',
      note: 'Resolved by §7.2. The chief, shaman, leaders, and guards use the orc sheet.'
    },
    {
      id: 'ogress-art',
      note: 'Resolved by §7.2. No ogre sheet exists, so the ogress binds no file.'
    },
    {
      id: 'cache-places',
      note: 'Resolved by §7.2. Sixteen caches stay: the Chapter III points plus (26, 28), (46, 20), and (48, 42).'
    },
    {
      id: 'lair-c-copper',
      note: 'Resolved by §7.2. Lair C copper is 1d12×1000 at 20%.'
    },
    {
      id: 'lair-o-q',
      note: 'Resolved by §7.2. O is cp 1d4×1000 at 25% and sp 1d3×1000 at 20%. Q×10 is ten rolls of 1d4 gems at 50%.'
    },
    {
      id: 'warg-corpse',
      note: 'Resolved by §7.2. Worg treasure is Nil. The corpse uses the house mid band.'
    },
    {
      id: 'ogre-percent',
      note: 'Resolved by §7.2. The ogre percentage is not rolled. The ogress is a prisoner.'
    },
    {
      id: 'forecast-pack',
      note: 'Resolved by §7.2. The column is 1,285. The old 2,990 annotation is retired.'
    }
  ];

  function printedXp(mon) {
    return formula(mon.xpFormula.base, mon.xpFormula.perHp, mon.xpFormula.hp, mon.xpFormula.terms).xp;
  }

  function bossGuardianXp() {
    return XP.rubyGuardian + XP.orcChief;
  }

  function forecastPackXp() {
    return XP.orcChief + XP.orcShaman + FORECAST_PACK.guards * XP.orcGuard +
      FORECAST_PACK.worgs * XP.warg + FORECAST_PACK.orcs * XP.orc + XP.rubyGuardian;
  }

  function ingredientIds() {
    return ['worg_pelt', 'hide'];
  }

  function itemIds() {
    return LOOT.questItems.map(function (row) { return row.id; });
  }

  var api = {
    MONSTERS: MONSTERS,
    SHAMAN: SHAMAN,
    CHIEF: CHIEF,
    CAVE: Cave.OGRE_CAVE,
    EGGS: EGGS,
    WANDER: WANDER,
    LOOT: LOOT,
    XP: XP,
    FORECAST_BOSS_GUARDIAN_XP: FORECAST_BOSS_GUARDIAN_XP,
    FORECAST_PACK: FORECAST_PACK,
    OPEN: OPEN,
    printedXp: printedXp,
    bossGuardianXp: bossGuardianXp,
    forecastPackXp: forecastPackXp,
    ingredientIds: ingredientIds,
    itemIds: itemIds,
    wired: false
  };

  root.L4 = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

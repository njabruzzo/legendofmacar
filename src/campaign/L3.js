/**
 * Level 3 encounters, monster stat blocks, and loot.
 * Data only. Not loaded by index.html.
 *
 * Numbers are the L3 rows in MACAR_10_LEVEL_RULES (1.3, 1.11, 1.15,
 * 1.16, section 5) and the DMG XP bands in section 1.0. The map is
 * maps/l3.json. A field marked open is a 1e choice the RULES do not print.
 * A field marked verify is stored as the RULES print it.
 */
(function (root) {
  'use strict';

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

  /**
   * Printed XP from rules 1.3 and guardian III from 1.11.
   * hp on the formula is the figure that makes the printed total.
   */
  var MONSTERS = {
    spider: {
      key: 'spider',
      name: 'Large spider',
      source: 'MM1 Spider p.90',
      hd: '1+1',
      ac: 8,
      mv: '6"*15"',
      attacks: [{ n: 1, form: 'bite', damage: '1' }],
      specials: ['poison, save at +2 (verify)'],
      poisonSave: 2,
      poisonSaveVerify: true,
      xp: 76,
      xpFormula: formula(20, 2, 5.5, [{ kind: 'EA', reason: 'poison', xp: 45 }]),
      tt: 'J-N',
      ttVerify: true,
      art: art('spider', 'assets/creatures/mon_spider.png', false, null)
    },
    spiderHuge: {
      key: 'spiderHuge',
      name: 'Huge spider',
      source: 'MM1 Spider p.90',
      hd: '2+2',
      ac: 6,
      mv: '18"',
      attacks: [{ n: 1, form: 'bite', damage: '1d6' }],
      specials: ['poison, save at +1 (verify)', 'leaps 3"', 'surprise 5 in 6'],
      poisonSave: 1,
      poisonSaveVerify: true,
      leap: '3"',
      surprise: '5 in 6',
      xp: 138,
      xpFormula: formula(35, 3, 11, [
        { kind: 'EA', reason: 'poison', xp: 55 },
        { kind: 'SA', reason: 'leap and surprise', xp: 15 }
      ]),
      tt: 'J-N, Q',
      ttVerify: true,
      art: art('spider_huge', 'assets/creatures/mon_spider_huge.png', false, null)
    },
    spiderGiant: {
      key: 'spiderGiant',
      name: 'Giant spider',
      source: 'MM1 Spider p.90',
      hd: '4+4',
      ac: 4,
      mv: '3"*12"',
      attacks: [{ n: 1, form: 'bite', damage: '2d4' }],
      specials: ['lethal poison, save with no modifier', 'webs as the Web spell'],
      poisonSave: 0,
      numberAppearing: '1-8',
      xp: 315,
      xpFormula: formula(90, 5, 22, [
        { kind: 'SA', reason: 'webs', xp: 40 },
        { kind: 'EA', reason: 'poison', xp: 75 }
      ]),
      tt: 'C',
      art: art('spider_giant', 'assets/creatures/mon_spider_giant.png', false, null)
    },
    phasespider: {
      key: 'phasespider',
      name: 'Phase spider',
      source: 'MM1 Phase Spider p.77',
      hd: '5+5',
      ac: 7,
      mv: '6"*15"',
      attacks: [{ n: 1, form: 'bite', damage: '1d6' }],
      specials: ['poison, save at -2', 'phases out; can only be hit as it bites'],
      poisonSave: -2,
      xp: 515,
      xpFormula: formula(150, 6, 27.5, [
        { kind: 'SA', reason: 'phase', xp: 75 },
        { kind: 'EA', reason: 'poison', xp: 125 }
      ]),
      tt: 'E',
      art: art('phasespider', 'assets/creatures/mon_phasespider.png', false, null)
    },
    pixie: {
      key: 'pixie',
      name: 'Pixie',
      source: 'MM1 Pixie (~p.79)',
      hd: '1/2',
      ac: 5,
      mv: '6"/12"',
      attacks: [],
      specials: ['never fights', 'freed, gives Pixie Dust, then vanishes'],
      fights: false,
      xp: 0,
      xpFormula: formula(0, 0, 0, []),
      tt: 'R, S, T, X',
      ttVerify: true,
      ttRolled: false,
      art: art('pixie', null, true, 'no pixie sheet')
    },
    spiderQueen: {
      key: 'spiderQueen',
      name: 'Spider Queen',
      source: 'RULING built on MM1 giant spider; D4-A',
      hd: '8+8',
      hp: 44,
      ac: 3,
      mv: '6"*15"',
      attacks: [{ n: 1, form: 'bite', damage: '2d6' }],
      specials: [
        'lethal poison, save at -2',
        'web shot 3", save vs spell or stuck 2 s',
        'calls brood once below 50% HP'
      ],
      poisonSave: -2,
      decision: 'D4-A',
      xp: 1828,
      xpFormula: formula(600, 12, 44, [
        { kind: 'SA', reason: 'web, brood, ceiling', xp: 300 },
        { kind: 'EA', reason: 'poison', xp: 400 }
      ]),
      tt: 'U',
      lair: 'C',
      bossFlagOnIndividual: false,
      art: art('spider_giant', 'assets/creatures/mon_spider_giant.png', true, 'Spider Queen')
    },
    rubyGuardian: {
      key: 'rubyGuardian',
      name: 'Ruby Guardian III',
      source: 'RULING 1.11',
      tier: 3,
      hd: 6,
      hp: 36,
      ac: 4,
      mv: '6"',
      attacks: [{ n: 1, form: 'slam', damage: '2d6' }],
      specials: [
        'construct immunities: sleep, charm, hold, poison, fear',
        'never checks morale',
        'ruby shard missile 1d6 at 6"'
      ],
      shard: { damage: '1d6', range: '6"', everySec: 4, minTiles: 2 },
      hitOnlyBy: 0,
      xp: 441,
      xpFormula: formula(150, 6, 36, [{ kind: 'SA', reason: 'ruby shard', xp: 75 }]),
      ruby: { gp: 750, band: '~750' },
      art: art('thinone', 'assets/creatures/mon_thinone.png', true, 'Ruby Guardian III')
    }
  };

  var POISON = {
    mode: 'h1',
    only: true,
    source: 'CampaignTable.poisonSave',
    mods: { large: 2, huge: 1, giant: 0, phase: -2, queen: -2 },
    floor: 2,
    floorRule: '6 #12',
    ghostsImmune: true,
    ghostsRule: '1.13'
  };

  var QUEEN = {
    key: 'spiderQueen',
    separateFromGuardian: true,
    bossFlagOnIndividual: false,
    checkEverySec: 1,
    poisonSave: -2,
    poisonMode: 'h1',
    web: { range: '3"', save: 'vs spell', stuckSec: 2, cooldownSec: 6 },
    brood: {
      once: true,
      belowHpFraction: 0.5,
      huge: '1d4',
      giant: 1,
      from: 'side tunnels'
    },
    ceiling: { seconds: 3, meleeReaches: false, missilesReach: true },
    ghostsImmuneToPoison: true,
    retired: ['spiderLord', 'forceLordHoard'],
    corpse: 'U',
    lairChest: 'C',
    priority: [
      'If no target is webbed and the web shot is ready (6 s cooldown), shoot a web at Macar. Range 3". Save vs spell or stuck for 2 s.',
      'If Macar is webbed or held, close and bite. Each bite forces a poison save under H1.',
      'Below 50% HP, call the brood once: 1d4 huge spiders from the side tunnels, plus 1 giant spider, and climb to the ceiling for 3 s. Melee cannot reach her. Missiles can.',
      'Otherwise bite the nearest kin or ghost. Ghosts are immune to her poison.'
    ]
  };

  var PIXIE = {
    key: 'pixie',
    fights: false,
    nick: 9,
    free: { rounds: 1, adjacentTo: 'web' },
    gives: { id: 'pixie_dust', name: 'Pixie Dust', count: 1, k: 'haste' },
    vanishes: true,
    dust: {
      rule: '1.15',
      k: 'haste',
      moveMul: 2.0,
      cdMul: 0.5,
      ageing: 0,
      decision: 'D10-A',
      stacksWithSpeed: false,
      speedRule: 'take the highest moveMul; haste does not stack with Potion of Speed or Boots of Speed',
      specialty: 'A hasted round is either two normal swings, or one Specialty Attack plus one normal swing. The Specialty Attack still takes the whole round of its own half.',
      duration: 'one battle',
      cap: 300,
      capStarts: 'beginFight',
      armedOutsideFight: true,
      endsOn: ['endFightIfClear', 'death', 'floor change', '300 s cap'],
      leavesInventory: true
    }
  };

  var WANDER = [
    { slot: 1, key: 'spider', count: '1d4' },
    { slot: 2, key: 'spider', count: '1d4' },
    { slot: 3, key: 'spiderHuge', count: '1d2' },
    { slot: 4, key: 'spiderHuge', count: '1d2' },
    { slot: 5, key: 'spiderGiant', count: '1' },
    { slot: 6, key: 'phasespider', count: '1' }
  ];

  /**
   * House individual U and lair C, as L2 stores them. Corpses never
   * take lair A-I. Web corpses keep rollWebCorpse.
   */
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
    lairC: {
      letter: 'C',
      decision: 'D2-A',
      onCorpse: false,
      cp: { chance: 20, dice: '1d10', times: 1000 },
      sp: { chance: 30, dice: '1d6', times: 1000 },
      ep: null,
      gp: null,
      pp: null,
      gems: { chance: 25, dice: '1d6' },
      jewelry: { chance: 20, dice: '1d3' },
      magic: { chance: 10, count: 2, kind: 'any' }
    },
    caches: {
      count: 16,
      level: 3,
      table: 'DMG Appendix A Table V',
      row: {
        cp: { chance: 15, min: 2, max: 12, times: 1000 },
        sp: { chance: 20, min: 2, max: 12, times: 100 },
        ep: { chance: 25, min: 1, max: 6, times: 100 },
        gp: { chance: 45, min: 2, max: 12, times: 100 },
        pp: null,
        gems: { chance: 15, min: 1, max: 8 },
        jewelry: { chance: 8, min: 1, max: 2 },
        magic: { chance: 10, count: 1, kind: 'any' }
      }
    },
    webCorpse: {
      keep: 'rollWebCorpse',
      count: '4-6',
      emptyChance: 50,
      magicLetter: { chance: 10, letter: 'S' },
      elseLetters: ['J', 'K', 'M', 'Q']
    },
    corpseBand: {
      queen: 'U',
      pixie: 'not rolled',
      guardian: 'ruby only'
    },
    magicFilter: '2.2 usable by a dwarf fighter',
    components: {
      spider_venom: { perSpider: 0.5, queen: 1, levels: [1, 3] },
      silk: { how: 'web harvest', percent: null }
    },
    drops: [
      { id: 'spider_venom', from: 'spiders', chance: 0.5 },
      { id: 'spider_venom', from: 'spiderQueen', chance: 1 },
      { id: 'silk', from: 'webs' }
    ],
    questItems: [
      { id: 'grond_tooth_electrum_3', usableByMacar: 'Y', cursed: true, countsForRitual: true, countsForTeethCarried: true },
      { id: 'pixie_dust', usableByMacar: 'Y', kind: 'consumable' }
    ]
  };

  var XP = {
    spider: 76,
    spiderHuge: 138,
    spiderGiant: 315,
    phasespider: 515,
    pixie: 0,
    spiderQueen: 1828,
    rubyGuardian: 441
  };

  /** 1.12 prints 2,681. Section 6 says the stat blocks win. */
  var FORECAST_BOSS_GUARDIAN_XP = 2681;

  var OPEN = [
    {
      id: 'ruby-room',
      note: 'The ruby door, Guardian III, the lever, and the exit elevator sit in the west disk at (16.4, 16.4). The former Spider Lord den is the Queen\'s hall. The RULES do not name the ruby room. (open)'
    },
    {
      id: 'arrival-stair',
      note: 'Arrival uses the Chapter II landing at (40, 7.55). The south stair uses the Chapter II stair at (40.1, 51.6) and opens on the boss kill. The RULES print no L3 coordinates. (open)'
    },
    {
      id: 'pixie-tile',
      note: 'The pixie hangs on the north web room\'s web prop at (26.2, 14.6). The RULES say a web room and print no tile. (open)'
    },
    {
      id: 'tooth-face',
      note: 'Electrum tooth 3 is on the queen hall\'s north wall at (10.1, 26.8). The RULES print the tooth and no coordinate. (open)'
    },
    {
      id: 'giant-count',
      note: 'One giant spider stands in the east disk. MM1 number appearing is 1-8, and the RULES do not print how many dens to place. (open)'
    },
    {
      id: 'phase-count',
      note: 'One phase spider stands in the west disk. Section 1.3 does not reprint number appearing. (open)'
    },
    {
      id: 'brood-tunnels',
      note: 'The brood comes from side tunnels at (6.4, 31) and (14.2, 31). The RULES say side tunnels and print no points. (open)'
    },
    {
      id: 'lair-letters-on-corpses',
      note: 'Giant spiders print treasure type C and phase spiders print E. Those are lair letters. A corpse does not take lair C or E. The house corpse band for those two is not printed. (open)'
    },
    {
      id: 'silk-rate',
      note: 'Spider venom is 50% per spider and 100% from the Queen. Section 3.5 names silk and prints no percent, so silk stays a web harvest. (open)'
    },
    {
      id: 'ruby-band',
      note: 'Guardian III\'s ruby is stored as 750 gp. Section 1.11 prints ~750 and no range. (open)'
    },
    {
      id: 'guardian-art',
      note: 'Ruby Guardian III uses the Thin One sheet. No guardian sheet exists, and none is bound. (open)'
    },
    {
      id: 'pixie-art',
      note: 'No pixie sheet exists. The pixie binds no file. (open)'
    },
    {
      id: 'cache-places',
      note: 'Sixteen caches use the Chapter II cache lattice, rolled on the level-3 row. The RULES require sixteen caches and print no L3 points. (open)'
    },
    {
      id: 'lair-c-copper',
      note: 'The Queen\'s chest uses the live lair-C copper die, 1d10×1000. Printed DMG type C is often 1d12×1000. (open)'
    },
    {
      id: 'phase-window',
      note: 'A phase spider can only be hit as it bites. The RULES print no length for that window. (open)'
    },
    {
      id: 'giant-web',
      note: 'A giant spider webs as the Web spell. The Queen\'s shot is stuck for 2 s. The ordinary Web duration is not reprinted. (open)'
    },
    {
      id: 'ghost-poison-gap',
      note: 'Ghosts are immune to poison in this data and in SpiderPoison. The live onHitFx still applies spider poison to ghosts. That page is not changed here. (open)'
    },
    {
      id: 'queen-chest',
      note: 'The lair C chest sits at (12.4, 32.8), off the corpse. The RULES print the chest and no coordinate. (open)'
    }
  ];

  function printedXp(mon) {
    return formula(mon.xpFormula.base, mon.xpFormula.perHp, mon.xpFormula.hp, mon.xpFormula.terms).xp;
  }

  function bossGuardianXp() {
    return XP.rubyGuardian + XP.spiderQueen;
  }

  function ingredientIds() {
    return ['spider_venom', 'silk'];
  }

  function itemIds() {
    return LOOT.questItems.map(function (row) { return row.id; });
  }

  var api = {
    MONSTERS: MONSTERS,
    POISON: POISON,
    QUEEN: QUEEN,
    PIXIE: PIXIE,
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

  root.L3 = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

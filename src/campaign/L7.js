/**
 * Level 7 encounters, monster stat blocks, and loot.
 * Data only. Not loaded by index.html.
 *
 * Numbers are the L7 rows in MACAR_10_LEVEL_RULES (1.7, 1.11, 1.14,
 * section 5) and the DMG XP bands in section 1.0. The map is maps/l7.json.
 * A field marked open is a 1e choice the RULES do not print.
 * A field marked verify is stored as the RULES print it.
 */
(function (root) {
  'use strict';

  var table = root.CampaignTable;
  if (!table && typeof module === 'object' && module.exports) table = require('./CampaignTable');
  if (!table || !table.poisonSave) throw new Error('L7 needs CampaignTable.poisonSave');

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

  var EARTH = art('earthelem', 'assets/creatures/mon_earthelem.png', false, null);
  var GROUND = { perDie: -2, minPerDie: 1, vs: 'targets not on the ground', ghosts: true, xpTerm: false };

  var MONSTERS = {
    earthElemental8: {
      key: 'earthElemental8',
      name: 'Earth elemental',
      source: 'MM1 Elemental p.38, staff-class',
      hd: 8,
      ac: 2,
      mv: '6"',
      attacks: [{ n: 1, form: 'fist', damage: '4d8' }],
      specials: ['needs a +2 weapon to hit', 'ground penalty (verify)'],
      hitOnlyBy: 2,
      groundPenalty: GROUND,
      xp: 910,
      xpFormula: formula(375, 10, 36, [{ kind: 'SA', reason: 'hit only by +2', xp: 175 }]),
      tt: 'Nil',
      corpseBand: 'high',
      art: EARTH
    },
    earthElemental12: {
      key: 'earthElemental12',
      name: 'Earth elemental',
      source: 'MM1 p.38, device-class',
      hd: 12,
      ac: 2,
      mv: '6"',
      attacks: [{ n: 1, form: 'fist', damage: '4d8' }],
      specials: ['needs a +2 weapon to hit', 'ground penalty (verify)'],
      hitOnlyBy: 2,
      groundPenalty: GROUND,
      xp: 2864,
      xpFormula: formula(1300, 16, 54, [{ kind: 'SA', reason: 'hit only by +2', xp: 700 }]),
      tt: 'Nil',
      corpseBand: 'high',
      art: EARTH
    },
    xorn: {
      key: 'xorn',
      name: 'Xorn',
      source: 'MM1 p.102',
      hd: '7+7',
      ac: -2,
      mv: '9"',
      attacks: [
        { n: 3, form: 'claw', damage: '1d3' },
        { n: 1, form: 'bite', damage: '6d4' }
      ],
      specials: ['passes through stone', 'immune to fire and cold', 'smells metal and gems'],
      immune: ['fire', 'cold'],
      phases: true,
      xp: 1280,
      xpFormula: formula(375, 10, 38, [
        { kind: 'SA', reason: 'AC below 0', xp: 175 },
        { kind: 'SA', reason: '4 attacks', xp: 175 },
        { kind: 'SA', reason: 'phasing', xp: 175 }
      ]),
      tt: 'O, P, Q×5, X',
      corpseLetters: { O: 1, P: 1, Q: 5, X: 1 },
      art: art('xorn', 'assets/creatures/mon_xorn.png', false, null)
    },
    umberhulk: {
      key: 'umberhulk',
      name: 'Umber hulk',
      source: 'MM1 p.97',
      hd: '8+8',
      ac: 2,
      mv: '6"',
      burrow: { stoneTilesPerSec: 0.2, rubbleTilesPerSec: 1.2, walk: '6"' },
      attacks: [
        { n: 2, form: 'claw', damage: '3d4' },
        { n: 1, form: 'bite', damage: '2d5' }
      ],
      specials: ['gaze: confusion, save vs spell', 'tunnels'],
      gaze: { effect: 'confusion', save: 'vs spell' },
      xp: 1828,
      xpFormula: formula(600, 12, 44, [
        { kind: 'EA', reason: 'printed', xp: 400 },
        { kind: 'SA', reason: 'printed', xp: 300 }
      ]),
      tt: 'G',
      ttLair: true,
      onCorpse: false,
      corpseBand: 'high',
      art: art('umberhulk', 'assets/creatures/mon_umberhulk.png', false, null)
    },
    stoneLord: {
      key: 'stoneLord',
      name: 'Stone Lord',
      source: 'MM1 p.38, earth elemental, 16 HD',
      hd: 16,
      hp: 72,
      ac: 2,
      mv: '6"',
      attacks: [{ n: 1, form: 'fist', damage: '4d8' }],
      specials: ['needs a +2 weapon to hit', 'ground penalty (verify)'],
      hitOnlyBy: 2,
      groundPenalty: GROUND,
      bossFlagOnIndividual: false,
      xp: 5090,
      xpFormula: formula(2400, 20, 72, [{ kind: 'SA', reason: 'hit only by +2', xp: 1250 }]),
      tt: null,
      lair: null,
      art: EARTH
    },
    rubyGuardian: {
      key: 'rubyGuardian',
      name: 'Ruby Guardian VII',
      source: 'RULING 1.11',
      tier: 7,
      hd: 14,
      hp: 84,
      ac: 0,
      mv: '6"',
      attacks: [{ n: 1, form: 'slam', damage: '3d10' }],
      specials: [
        'construct immunities: sleep, charm, hold, poison, fear',
        'never checks morale',
        'shard cone as IV',
        'hit only by +2 weapons'
      ],
      cone: { damage: '2d6', range: '3"', save: 'vs breath for half', everySec: 4, minTiles: 2 },
      hitOnlyBy: 2,
      xp: 5212,
      xpFormula: formula(1800, 18, 84, [
        { kind: 'SA', reason: 'shard cone', xp: 950 },
        { kind: 'SA', reason: 'hit only by +2', xp: 950 }
      ]),
      ruby: { gp: 1750 },
      art: art('construct', 'assets/creatures/mon_construct.png', true, 'Ruby Guardian VII')
    }
  };

  /**
   * Step 3 names a xorn. That xorn is the covering unit and stands
   * in the stone hall. The locked hulk stands there too, so lair G
   * has a boss-room minion. The ruby stays on the guardian.
   */
  var LORD = {
    key: 'stoneLord',
    separateFromGuardian: true,
    bossFlagOnIndividual: false,
    coveringUnit: { key: 'xorn', role: 'cover', inBossRoom: true, erupts: true },
    metalTie: { mostMetal: true, tie: 'nearest', stillTied: 'Macar' },
    sink: { sec: 1, surprise: '1-3 on d6', stonecunning: '1 in 6' },
    tremor: {
      belowHpFraction: 0.25,
      once: true,
      proneSec: 1,
      save: 'vs paralysis',
      ghostsImmune: true,
      knocksSelfDown: false,
      ghostRule: '1.13'
    },
    priority: [
      'It sinks into the floor for 1 s and rises under Macar. Surprise is 1-3 on d6. Dwarf stonecunning lets Macar sense it and cuts that to 1 in 6.',
      'It strikes Macar with its fist.',
      'The stone-hall xorn erupts from the wall and attacks whichever kin carries the most metal. On a tie it takes the nearest. If still tied, it takes Macar.',
      'Below 25% HP, once only, a tremor knocks every kin prone for 1 s. A save vs paralysis negates it. Ghosts are immune. The lord is not knocked down.'
    ]
  };

  var MINIONS = {
    option: 'A',
    locked: true,
    section6: 5,
    keys: ['xorn', 'umberhulk'],
    inBossRoom: true
  };

  /**
   * No L7 special is a poison save. H1 and the spider size table stay
   * available, and the floor of 2 still binds any poison save.
   */
  var POISON = {
    mode: 'h1',
    floor: 2,
    floorRule: '6 #12',
    source: 'CampaignTable.poisonSave',
    mods: table.poisonSave,
    appliesTo: [],
    residentsUsePoison: false
  };

  var WANDER = [
    { slot: 1, key: 'xorn', count: '1' },
    { slot: 2, key: 'xorn', count: '1' },
    { slot: 3, key: 'umberhulk', count: '1' },
    { slot: 4, key: 'umberhulk', count: '1' },
    { slot: 5, key: 'earthElemental8', count: '1' },
    { slot: 6, key: 'earthElemental8', count: '1' }
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
      G: {
        letter: 'G',
        onCorpse: false,
        cp: null,
        sp: null,
        ep: null,
        gp: { chance: 75, min: 2, max: 20, times: 1000 },
        pp: { chance: 25, min: 1, max: 4, times: 1000 },
        gems: { chance: 25, min: 3, max: 18 },
        jewelry: { chance: 25, min: 1, max: 10 },
        magic: { chance: 35, count: 5, kind: 'any' }
      }
    },
    bossChest: {
      letter: 'G',
      decision: 'D2',
      onCorpse: false,
      contents: 'lair-G',
      source: 'umber hulk',
      includesRuby: false,
      extraHoard: false
    },
    guardianRuby: { with: 'rubyGuardian', gp: 1750 },
    caches: {
      count: 16,
      level: 7,
      table: 'DMG Appendix A Table V',
      row: {
        cp: null,
        sp: null,
        ep: { chance: 10, min: 1, max: 12, times: 100 },
        gp: { chance: 60, min: 6, max: 36, times: 100 },
        pp: { chance: 35, min: 1, max: 8, times: 100 },
        gems: { chance: 40, min: 3, max: 18 },
        jewelry: { chance: 25, min: 1, max: 6 },
        magic: { chance: 18, count: 3, kind: 'any' }
      }
    },
    magicFilter: '2.2 usable by a dwarf fighter',
    components: {
      heartstone: { perKill: 1, from: ['earthElemental8', 'earthElemental12', 'stoneLord'] }
    },
    drops: [
      { id: 'heartstone', from: 'earthElemental8', count: 1 },
      { id: 'heartstone', from: 'earthElemental12', count: 1 },
      { id: 'heartstone', from: 'stoneLord', count: 1 }
    ],
    veins: [{ id: 'starmetal', how: 'dig' }],
    usable: [
      { name: 'Coins, gems', usableByMacar: 'Y' },
      { name: 'Rolled magic', usableByMacar: 'Y', filter: '2.2' },
      { name: 'Heartstone', usableByMacar: 'Y' },
      { name: 'Electrum Tooth 7', usableByMacar: 'Y' }
    ],
    questItems: [
      { id: 'grond_tooth_electrum_7', usableByMacar: 'Y', cursed: true, countsForRitual: true, countsForTeethCarried: true, lastTooth: true }
    ]
  };

  var XP = {
    earthElemental8: 910,
    earthElemental12: 2864,
    xorn: 1280,
    umberhulk: 1828,
    stoneLord: 5090,
    rubyGuardian: 5212
  };

  /** Refreshed 1.12 column is the stat-block sum. */
  var FORECAST_BOSS_GUARDIAN_XP = 10302;

  var OPEN = [
    {
      id: 'elemental-xp',
      note: 'Resolved by §7.5. The 8 HD elemental is 910 XP and the 12 HD elemental is 2,864. bandXp is retired.'
    },
    {
      id: 'elemental-addend',
      note: 'Resolved by §7.5. The elemental special ability is a +2 or better weapon to hit.'
    },
    {
      id: 'ground-penalty',
      note: 'Resolved by §7.5. Earth elementals take -2 per damage die, minimum 1, against targets not on the ground. Ghosts count. It has no XP term.'
    },
    {
      id: 'xorn-hp',
      note: 'Resolved by §7.5. Xorn XP stays 1,280, at 38 hp.'
    },
    {
      id: 'hulk-addends',
      note: 'Resolved by §7.5. The hulk addends are the confusing gaze 400 and tunneling 300.'
    },
    {
      id: 'band-count',
      note: 'Resolved by §7.5. The placed xorn and hulk counts stay as they are.'
    },
    {
      id: 'xorn-which',
      note: 'Resolved by §7.5. The stone-hall xorn is the one that erupts.'
    },
    {
      id: 'metal-tie',
      note: 'Resolved by §7.5. A metal tie takes the nearest kin. If still tied, it takes Macar.'
    },
    {
      id: 'map-rooms',
      note: 'Resolved by §7.5. The Level 7 rooms stay as placed.'
    },
    {
      id: 'tooth-face',
      note: 'Resolved by §7.5. Electrum tooth 7 stays at (88, 36).'
    },
    {
      id: 'ruby-band',
      note: 'Resolved by §7.0. Guardian VII ruby is exactly 1,750 gp, on the guardian.'
    },
    {
      id: 'cache-places',
      note: 'Resolved by §7.5. Sixteen level-7 caches stay as placed.'
    },
    {
      id: 'lair-off-corpse',
      note: 'Resolved by §7.5. Umber hulk G rolls only in the stone-hall chest. Other hulk corpses use the house high band.'
    },
    {
      id: 'nil-treasure',
      note: 'Resolved by §7.5. Earth elementals are Nil and use the house high band. Xorn corpses roll O, P, Q×5, and X.'
    },
    {
      id: 'vein-name',
      note: 'Resolved by §7.5. The set piece is starmetal-vein. Heartstones come from earth elementals.'
    },
    {
      id: 'burrow-rate',
      note: 'Resolved by §7.5. The hulk burrows 0.2 tiles/s through stone and 1.2 through rubble. Walking stays 6 inches.'
    },
    {
      id: 'tremor-self',
      note: 'Resolved by §7.5. The Stone Lord is not knocked down by its own tremor. Ghosts are immune to the tremor.'
    },
    {
      id: 'forecast-pack',
      note: 'Resolved by §7.5. The column is 10,302. The extra 1,280 was one xorn and is not in that column.'
    },
    {
      id: 'guardian-art',
      note: 'Resolved by §7.5. Guardian VII uses the construct sheet.'
    }
  ];

  function printedXp(mon) {
    return formula(mon.xpFormula.base, mon.xpFormula.perHp, mon.xpFormula.hp, mon.xpFormula.terms).xp;
  }

  function bossGuardianXp() {
    return XP.rubyGuardian + XP.stoneLord;
  }

  function ingredientIds() {
    return ['heartstone'];
  }

  function itemIds() {
    return LOOT.questItems.map(function (row) { return row.id; });
  }

  var api = {
    MONSTERS: MONSTERS,
    LORD: LORD,
    MINIONS: MINIONS,
    POISON: POISON,
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

  root.L7 = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

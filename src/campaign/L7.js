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
  var GROUND = { perDie: -2, vs: 'targets not on the ground', verify: true, xpTerm: false };

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
      xp: 1020,
      xpApprox: true,
      bandXp: 910,
      xpFormula: formula(375, 10, 36, [{ kind: 'SA', reason: 'hit only by +2', xp: 175 }]),
      tt: 'Nil',
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
      xp: 3080,
      xpApprox: true,
      bandXp: 2864,
      xpFormula: formula(1300, 16, 54, [{ kind: 'SA', reason: 'hit only by +2', xp: 700 }]),
      tt: 'Nil',
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
      tt: 'Nil',
      art: art('xorn', 'assets/creatures/mon_xorn.png', false, null)
    },
    umberhulk: {
      key: 'umberhulk',
      name: 'Umber hulk',
      source: 'MM1 p.97',
      hd: '8+8',
      ac: 2,
      mv: '6"',
      burrow: '1"-6"',
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
      ruby: { gp: 1750, band: '~1750' },
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
    coveringUnit: { key: 'xorn', role: 'cover', inBossRoom: true },
    sink: { sec: 1, surprise: '1-3 on d6', stonecunning: '1 in 6' },
    tremor: {
      belowHpFraction: 0.25,
      once: true,
      proneSec: 1,
      save: 'vs paralysis',
      ghostsImmune: true,
      ghostRule: '1.13'
    },
    priority: [
      'It sinks into the floor for 1 s and rises under Macar. Surprise is 1-3 on d6. Dwarf stonecunning lets Macar sense it and cuts that to 1 in 6.',
      'It strikes Macar with its fist.',
      'A xorn erupts from the wall and attacks whichever kin carries the most metal.',
      'Below 25% HP, once only, a tremor knocks every kin prone for 1 s. A save vs paralysis negates it.'
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
    guardianRuby: { with: 'rubyGuardian', gp: 1750, band: '~1750' },
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
    earthElemental8: 1020,
    earthElemental12: 3080,
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
      note: 'The 8 HD cell prints about 1,020 and the 12 HD cell prints about 3,080. At average hp (36 and 54) with one special ability for a +2 weapon, the bands are 910 and 2,864. Both figures are stored. (open)'
    },
    {
      id: 'elemental-addend',
      note: 'The elemental cells, including the Stone Lord\'s +1,250, do not name the special-ability term. Needing a +2 weapon to hit is the special ability that band prices. (open)'
    },
    {
      id: 'ground-penalty',
      note: 'Earth elementals take -2 per damage die against targets not on the ground, marked verify. That line is not given an XP term. The Stone Lord\'s exact 5,090 includes only one special ability. (open)'
    },
    {
      id: 'xorn-hp',
      note: 'Xorn XP 1,280 is 375+10 per hp at 38 hp, plus 175 three times. A 7+7 averages 38.5, and the cell prints about 1,280. (open)'
    },
    {
      id: 'hulk-addends',
      note: 'The hulk cell prints +400 and +300 and does not name them. The amounts match one exceptional ability and one special ability on the 8+8 band. (open)'
    },
    {
      id: 'band-count',
      note: 'The stone hall holds one xorn and one umber hulk with the lord. Other rooms hold one xorn, one hulk, one 8 HD elemental, and one 12 HD elemental. Number appearing is not reprinted. (open)'
    },
    {
      id: 'xorn-which',
      note: 'Step 3 says a xorn erupts from the wall. One xorn is placed in the stone hall as that unit. The RULES do not say which xorn when more than one is on the floor. (open)'
    },
    {
      id: 'metal-tie',
      note: 'The erupting xorn attacks whichever kin carries the most metal. A tie between kin is not printed. (open)'
    },
    {
      id: 'map-rooms',
      note: 'Level 7 is a new floor. The ruby court, the stone hall, the stair, and the other packs have no printed coordinates. (open)'
    },
    {
      id: 'tooth-face',
      note: 'Electrum tooth 7, the last tooth, is in the stone hall at (88, 36). The RULES print the tooth and no coordinate. (open)'
    },
    {
      id: 'ruby-band',
      note: 'Guardian VII\'s ruby is stored as 1750 gp on the guardian. Section 1.11 prints ~1,750 and no range. The boss chest does not hold it. (open)'
    },
    {
      id: 'cache-places',
      note: 'Sixteen level-7 caches are placed on this floor. The RULES print the count and no coordinates. (open)'
    },
    {
      id: 'lair-off-corpse',
      note: 'Umber hulks print G. That letter is a lair row, so it stays off the corpse. One D2 chest in the stone hall rolls G because the hulk is the boss-room minion. The RULES do not give every hulk a chest. (open)'
    },
    {
      id: 'nil-treasure',
      note: 'Xorns and earth elementals print Nil. No corpse coins are stored for them. The house high-tier line also allows O+M. (open)'
    },
    {
      id: 'vein-name',
      note: 'The campaign table names a heartstone-vein set piece. Section 1.7 prints heartstones as one per earth elemental and starmetal veins as a separate pickup. The placed landmark is a starmetal vein. (open)'
    },
    {
      id: 'burrow-rate',
      note: 'The hulk burrows at 1" to 6". Which rate it uses is not printed. (open)'
    },
    {
      id: 'tremor-self',
      note: 'The tremor knocks every kin prone. Whether the lord is knocked prone by his own tremor is not printed. (open)'
    },
    {
      id: 'forecast-pack',
      note: 'The 1.12 cell prints 11,582 and names no pack. The Stone Lord 5,090 plus Guardian VII 5,212 is 10,302, and 10,302 plus one xorn\'s 1,280 is 11,582. Whether that extra term is a xorn is not printed. (open)'
    },
    {
      id: 'guardian-art',
      note: 'No ruby-guardian sheet exists. Guardian VII uses the construct sheet. (open)'
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

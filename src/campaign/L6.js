/**
 * Level 6 encounters, monster stat blocks, and loot.
 * Data only. Not loaded by index.html.
 *
 * Numbers are the L6 rows in MACAR_10_LEVEL_RULES (1.6, 1.11, 1.14,
 * section 5) and the DMG XP bands in section 1.0. The map is maps/l6.json.
 * A field marked open is a 1e choice the RULES do not print.
 * A field marked verify is stored as the RULES print it.
 */
(function (root) {
  'use strict';

  var table = root.CampaignTable;
  if (!table && typeof module === 'object' && module.exports) table = require('./CampaignTable');
  if (!table || !table.poisonSave) throw new Error('L6 needs CampaignTable.poisonSave');

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

  var MAGMA = art('magmaelem', 'assets/creatures/mon_magmaelem.png', true, 'fire elemental');

  var MONSTERS = {
    beetle: {
      key: 'beetle',
      name: 'Fire beetle',
      source: 'MM1 Beetle, Giant (fire) p.8',
      hd: '1+2',
      ac: 4,
      mv: '12"',
      attacks: [{ n: 1, form: 'bite', damage: '2d4' }],
      specials: ['3 glowing glands'],
      glands: 3,
      xp: 32,
      xpFormula: formula(20, 2, 6, []),
      tt: 'Nil',
      art: art('beetle', 'assets/creatures/mon_beetle.png', false, null)
    },
    hellHound: {
      key: 'hellHound',
      name: 'Hell hound',
      source: 'MM1 p.51',
      hd: 5,
      hdRange: '4-7',
      hdChoice: 'use 5',
      ac: 4,
      mv: '12"',
      attacks: [{ n: 1, form: 'bite', damage: '1d10' }],
      specials: ['breath 1 hp per HD', 'detects hidden or invisible 50%'],
      breath: { damage: '1 per HD', amount: 5, save: 'vs breath for half' },
      detectHidden: 0.5,
      xp: 315,
      xpFormula: formula(90, 5, 22, [
        { kind: 'EA', reason: 'printed', xp: 75 },
        { kind: 'SA', reason: 'printed', xp: 40 }
      ]),
      tt: 'C',
      ttLair: true,
      onCorpse: false,
      corpseBand: 'high',
      art: art('warg', 'assets/creatures/mon_warg.png', true, 'Hell hound')
    },
    salamander: {
      key: 'salamander',
      name: 'Salamander',
      source: 'MM1 p.85',
      hd: '7+7',
      ac: 5,
      acHead: 5,
      acBody: 3,
      mv: '9"',
      attacks: [
        { n: 1, form: 'spear', damage: '1d6', heat: '1d6' },
        { n: 1, form: 'tail', damage: '2d6', heat: '1d6' }
      ],
      specials: ['needs a +1 weapon to hit', 'immune to fire, sleep, charm and hold'],
      hitOnlyBy: 1,
      acFacing: { attackers: 5, constricting: 3 },
      immune: ['fire', 'sleep', 'charm', 'hold'],
      xp: 1105,
      xpFormula: formula(375, 10, 38, [
        { kind: 'SA', reason: 'printed', xp: 175 },
        { kind: 'SA', reason: 'printed', xp: 175 }
      ]),
      tt: 'F',
      ttLair: true,
      onCorpse: false,
      corpseBand: 'high',
      art: art('magmaelem', 'assets/creatures/mon_magmaelem.png', true, 'Salamander')
    },
    fireElemental8: {
      key: 'fireElemental8',
      name: 'Fire elemental',
      source: 'MM1 Elemental p.38, staff-class',
      hd: 8,
      ac: 2,
      mv: '12"',
      attacks: [{ n: 1, form: 'slam', damage: '3d8' }],
      specials: ['needs a +2 weapon to hit', 'sets flammables alight', 'cannot cross water'],
      hitOnlyBy: 2,
      xp: 910,
      xpFormula: formula(375, 10, 36, [{ kind: 'SA', reason: 'printed', xp: 175 }]),
      tt: 'Nil',
      art: MAGMA
    },
    fireElemental12: {
      key: 'fireElemental12',
      name: 'Fire elemental',
      source: 'MM1 p.38, device-class',
      hd: 12,
      ac: 2,
      mv: '12"',
      attacks: [{ n: 1, form: 'slam', damage: '3d8' }],
      specials: ['needs a +2 weapon to hit', 'sets flammables alight', 'cannot cross water'],
      hitOnlyBy: 2,
      xp: 2864,
      xpFormula: formula(1300, 16, 54, [{ kind: 'SA', reason: 'printed', xp: 700 }]),
      tt: 'Nil',
      art: MAGMA
    },
    emberLord: {
      key: 'emberLord',
      name: 'Ember Lord',
      source: 'MM1 p.38, conjured-by-spell class, 16 HD',
      hd: 16,
      hp: 72,
      ac: 2,
      mv: '12"',
      attacks: [{ n: 1, form: 'slam', damage: '3d8' }],
      specials: ['needs a +2 weapon to hit', 'sets flammables alight', 'cannot cross water'],
      hitOnlyBy: 2,
      bossFlagOnIndividual: false,
      xp: 5090,
      xpFormula: formula(2400, 20, 72, [{ kind: 'SA', reason: 'printed', xp: 1250 }]),
      tt: 'U',
      lair: null,
      art: art('magmaelem', 'assets/creatures/mon_magmaelem.png', true, 'Ember Lord')
    },
    rubyGuardian: {
      key: 'rubyGuardian',
      name: 'Ruby Guardian VI',
      source: 'RULING 1.11',
      tier: 6,
      hd: 12,
      hp: 72,
      ac: 1,
      mv: '6"',
      attacks: [{ n: 1, form: 'slam', damage: '3d8' }],
      specials: [
        'construct immunities: sleep, charm, hold, poison, fear',
        'never checks morale',
        'shard cone as IV',
        'immune to fire',
        'hit only by +1 weapons'
      ],
      cone: { damage: '2d6', range: '3"', save: 'vs breath for half', everySec: 4, minTiles: 2 },
      immune: ['fire'],
      hitOnlyBy: 1,
      xp: 3852,
      xpFormula: formula(1300, 16, 72, [
        { kind: 'SA', reason: 'shard cone', xp: 700 },
        { kind: 'SA', reason: 'hit only by +1', xp: 700 }
      ]),
      ruby: { gp: 1500 },
      art: art('construct', 'assets/creatures/mon_construct.png', true, 'Ruby Guardian VI')
    }
  };

  /**
   * The four steps name the pool in this room. They do not name a
   * covering creature. Locked minions still stand in the hall.
   */
  var LORD = {
    key: 'emberLord',
    separateFromGuardian: true,
    bossFlagOnIndividual: false,
    coveringUnit: null,
    poolInRoom: true,
    cannotCrossWater: true,
    checkEverySec: 1,
    targetOrder: ['kin carrying bombs or oil', 'Macar'],
    ignite: { chance: '1 in 6', what: 'one pack bomb', which: 'one random bomb from the pack, each equally likely', damage: 'its normal damage', fireResistanceNegates: true },
    flare: { belowHpFraction: 0.25, once: true, radius: '1"', damage: '2d8', save: 'vs breath for half', hurtsSelf: false },
    priority: [
      'It never enters water tiles. A pool tile is Macar\'s safe zone and is placed in the room.',
      'It attacks the target with the most flammables first: kin carrying bombs or oil, then Macar.',
      'A hit ignites the target\'s pack bombs. There is a 1-in-6 chance one bomb detonates in the pack for its normal damage. Fire resistance negates this.',
      'Below 25% HP it flares once: a 1" radius burst for 2d8, save vs breath for half. The flare and its own fire do not hurt the lord.'
    ]
  };

  var MINIONS = {
    option: 'A',
    locked: true,
    section6: 5,
    keys: ['salamander', 'hellHound'],
    inBossRoom: true
  };

  /**
   * No L6 special is a poison save. H1 and the spider size table stay
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
    { slot: 1, key: 'beetle', count: '1d4' },
    { slot: 2, key: 'beetle', count: '1d4' },
    { slot: 3, key: 'hellHound', count: '1d2' },
    { slot: 4, key: 'hellHound', count: '1d2' },
    { slot: 5, key: 'salamander', count: '1' },
    { slot: 6, key: 'fireElemental8', count: '1' }
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
      C: {
        letter: 'C',
        onCorpse: false,
        cp: { chance: 20, dice: '1d12', times: 1000 },
        sp: { chance: 30, dice: '1d6', times: 1000 },
        ep: null,
        gp: null,
        pp: null,
        gems: { chance: 25, dice: '1d6' },
        jewelry: { chance: 20, dice: '1d3' },
        magic: { chance: 10, count: 2, kind: 'any' }
      },
      F: {
        letter: 'F',
        onCorpse: false,
        cp: null,
        sp: { chance: 20, min: 1, max: 2, times: 1000 },
        ep: { chance: 10, min: 1, max: 3, times: 1000 },
        gp: { chance: 45, min: 1, max: 10, times: 1000 },
        pp: { chance: 30, min: 500, max: 3000, times: 1 },
        gems: { chance: 20, min: 2, max: 20 },
        jewelry: { chance: 10, min: 1, max: 8 },
        magic: { chance: 30, count: 3, kind: 'anynos' }
      }
    },
    bossChest: {
      present: false,
      letter: null,
      decision: 'D2',
      onCorpse: false,
      contents: null,
      extraHoard: false
    },
    caches: {
      count: 16,
      level: 6,
      table: 'DMG Appendix A Table V',
      row: {
        cp: null,
        sp: { chance: 5, min: 5, max: 30, times: 100 },
        ep: { chance: 15, min: 1, max: 12, times: 100 },
        gp: { chance: 55, min: 5, max: 30, times: 100 },
        pp: { chance: 30, min: 1, max: 6, times: 100 },
        gems: { chance: 35, min: 2, max: 16 },
        jewelry: { chance: 20, min: 1, max: 4 },
        magic: { chance: 16, count: 2, kind: 'any' }
      }
    },
    magicFilter: '2.2 usable by a dwarf fighter',
    components: {
      fire_beetle_gland: { perKill: 3, glandsOnBeetle: 3 },
      magma_shard: { perKill: 1, from: ['fireElemental8', 'fireElemental12', 'emberLord'] }
    },
    drops: [
      { id: 'fire_beetle_gland', from: 'beetle', count: 3 },
      { id: 'magma_shard', from: 'fireElemental8', count: 1 },
      { id: 'magma_shard', from: 'fireElemental12', count: 1 },
      { id: 'magma_shard', from: 'emberLord', count: 1 }
    ],
    usable: [
      { name: 'Coins, gems', usableByMacar: 'Y' },
      { name: 'Rolled magic', usableByMacar: 'Y', filter: '2.2' },
      { name: 'Magma shard', usableByMacar: 'Y' },
      { name: 'Electrum Tooth 6', usableByMacar: 'Y' }
    ],
    questItems: [
      { id: 'grond_tooth_electrum_6', usableByMacar: 'Y', cursed: true, countsForRitual: true, countsForTeethCarried: true }
    ]
  };

  var XP = {
    beetle: 32,
    hellHound: 315,
    salamander: 1105,
    fireElemental8: 910,
    fireElemental12: 2864,
    emberLord: 5090,
    rubyGuardian: 3852
  };

  /** Refreshed 1.12 column is the stat-block sum. */
  var FORECAST_BOSS_GUARDIAN_XP = 8942;

  var OPEN = [
    {
      id: 'beetle-hp',
      note: 'Resolved by §7.4. Fire beetle XP stays 32, at 6 hp.'
    },
    {
      id: 'hound-hp',
      note: 'Resolved by §7.4. Hell hound XP stays 315, at 22 hp.'
    },
    {
      id: 'salamander-hp',
      note: 'Resolved by §7.4. Salamander XP stays 1,105, at 38 hp.'
    },
    {
      id: 'hound-addends',
      note: 'Resolved by §7.4. The hound addends are breath 75 and seeing invisible plus surprise 40.'
    },
    {
      id: 'salamander-addends',
      note: 'Resolved by §7.4. The two 175 terms are hit only by magic weapons, and heat damage.'
    },
    {
      id: 'elemental-addend',
      note: 'Resolved by §7.4. The elemental special ability is a +2 or better weapon to hit.'
    },
    {
      id: 'band-count',
      note: 'Resolved by §7.4. The ember hall keeps one salamander and one hell hound with the lord.'
    },
    {
      id: 'fire-giants',
      note: 'Resolved by §7.4. Fire giants are not placed on L6. They stand on L9.'
    },
    {
      id: 'hound-art',
      note: 'Resolved by §7.4. The hell hound uses the warg sheet.'
    },
    {
      id: 'salamander-art',
      note: 'Resolved by §7.4. The salamander uses the magma sheet.'
    },
    {
      id: 'guardian-art',
      note: 'Resolved by §7.4. Guardian VI uses the construct sheet.'
    },
    {
      id: 'map-rooms',
      note: 'Resolved by §7.4. The ember hall stays the west vestry at (8, 74).'
    },
    {
      id: 'tooth-face',
      note: 'Resolved by §7.4. Electrum tooth 6 stays at (8, 70).'
    },
    {
      id: 'ruby-band',
      note: 'Resolved by §7.0. Guardian VI ruby is exactly 1,500 gp, on the guardian.'
    },
    {
      id: 'ruby-chest',
      note: 'Resolved by §7.4. The guardian ruby is not in a chest. There is no L6 chest.'
    },
    {
      id: 'nick-chest',
      note: 'Nick has not decided whether to add a replacement chest on L6. No chest is stored. (open)'
    },
    {
      id: 'cache-places',
      note: 'Resolved by §7.4. Sixteen level-6 caches stay as placed.'
    },
    {
      id: 'lair-off-corpse',
      note: 'Resolved by §7.4. Hell hound C and salamander F are lair letters and are not rolled. Both corpses use the house high band.'
    },
    {
      id: 'beetle-glands',
      note: 'Resolved by §7.4. Each fire beetle drops 3 glands.'
    },
    {
      id: 'bomb-which',
      note: 'Resolved by §7.4. The detonating bomb is one random bomb from the pack, each equally likely.'
    },
    {
      id: 'flare-self',
      note: 'Resolved by §7.4. The Ember Lord takes no damage from its own flare or its own fire.'
    },
    {
      id: 'pool-size',
      note: 'Resolved by §7.4. The pool is 2×2 tiles at (12-13, 74-75).'
    },
    {
      id: 'ac-facing',
      note: 'Resolved by §7.4. Attackers strike AC 5. The creature being constricted strikes AC 3.'
    }
  ];

  function printedXp(mon) {
    return formula(mon.xpFormula.base, mon.xpFormula.perHp, mon.xpFormula.hp, mon.xpFormula.terms).xp;
  }

  function bossGuardianXp() {
    return XP.rubyGuardian + XP.emberLord;
  }

  function ingredientIds() {
    return ['magma_shard', 'fire_beetle_gland'];
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

  root.L6 = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

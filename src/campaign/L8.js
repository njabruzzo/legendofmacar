/**
 * Level 8 encounters, monster stat blocks, and loot.
 * Data only. Not loaded by index.html.
 *
 * Numbers are the L8 rows in MACAR_10_LEVEL_RULES (1.8, 1.11, section 5)
 * and the DMG XP bands in section 1.0. The map is maps/l8.json.
 * xp is the printed cell. bandXp, when present, is not wired into
 * boss-plus-guardian XP. A field marked open is a 1e choice the RULES
 * do not print. A field marked verify is stored as the RULES print it.
 */
(function (root) {
  'use strict';

  var table = root.CampaignTable;
  if (!table && typeof module === 'object' && module.exports) table = require('./CampaignTable');
  if (!table || !table.poisonSave) throw new Error('L8 needs CampaignTable.poisonSave');

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

  var MONSTERS = {
    beholder: {
      key: 'beholder',
      name: 'Beholder',
      source: 'MM1 p.10',
      hd: '11-12',
      hdRuling: 'MM1 prints hp, not HD. Treated as the 11-12 band.',
      hp: 60,
      hpRange: '45-75',
      hpChoice: 'use 60',
      ac: 0,
      acBody: 0,
      acCentralEye: 7,
      acEyestalk: 2,
      mv: '3"',
      floats: true,
      attacks: [{ n: 1, form: 'bite', damage: '2d4', when: 'adjacent' }],
      eyes: [
        'charm person',
        'charm monster',
        'sleep',
        'telekinesis (250 lb)',
        'flesh to stone',
        'disintegrate',
        'fear (as the wand)',
        'slow',
        'cause serious wounds',
        'death ray'
      ],
      centralEye: 'anti-magic cone',
      specials: ['anti-magic cone', 'ten eye rays', 'eyestalks'],
      bossFlagOnIndividual: false,
      xp: 7910,
      xpFormula: formula(1300, 16, 60, [
        { kind: 'SA', reason: 'AC 0 body', xp: 700 },
        { kind: 'SA', reason: '4+ attacks', xp: 700 },
        { kind: 'EA', reason: 'death ray', xp: 850 },
        { kind: 'EA', reason: 'disintegrate', xp: 850 },
        { kind: 'EA', reason: 'petrification', xp: 850 },
        { kind: 'EA', reason: 'charm', xp: 850 },
        { kind: 'EA', reason: 'anti-magic', xp: 850 }
      ]),
      tt: 'I',
      lair: 'I',
      art: art('beholder', 'assets/creatures/mon_beholder.png', false, null)
    },
    duergar: {
      key: 'duergar',
      name: 'Duergar',
      source: 'MM2 Dwarf, gray (duergar) (verify page)',
      hd: '1+2',
      ac: 4,
      mv: '6"',
      attacks: [{ n: 1, form: 'weapon', damage: '1d8' }],
      specials: ['enlarge 1/day', 'invisibility 1/day', 'immune to paralysis, illusion and poison', 'surprise 3 in 6 (verify)'],
      enlarge: { perDay: 1 },
      invisibility: { perDay: 1 },
      immune: ['paralysis', 'illusion', 'poison'],
      surprise: { chance: '3 in 6', surprisedOnly: '1 in 10' },
      saveVsMagic: 4,
      charmed: true,
      xp: 86,
      xpFormula: formula(20, 2, 6.5, [
        { kind: 'SA', reason: 'printed', xp: 8 },
        { kind: 'EA', reason: 'printed', xp: 45 }
      ]),
      tt: 'M',
      ttAlso: 'Q',
      corpseLetters: { M: 1, Q: 1 },
      art: art('duergar', 'assets/creatures/mon_duergar.png', false, null)
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
      charmed: true,
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
    orc: {
      key: 'orc',
      name: 'Orc',
      source: 'MM1 Orc p.76',
      hd: 1,
      ac: 6,
      mv: '9"',
      attacks: [{ n: 1, form: 'weapon', damage: '1d8' }],
      specials: ['-1 to hit in sunlight; none underground'],
      charmed: true,
      xp: 15,
      bandXp: 14.5,
      xpFormula: formula(10, 1, 4.5, []),
      tt: 'L',
      art: art('orc', 'assets/creatures/mon_orc.png', false, null)
    },
    rubyGuardian: {
      key: 'rubyGuardian',
      name: 'Ruby Guardian VIII',
      source: 'RULING 1.11',
      tier: 8,
      hd: 16,
      hp: 96,
      ac: -1,
      mv: '6"',
      attacks: [{ n: 1, form: 'slam', damage: '4d8' }],
      specials: [
        'construct immunities: sleep, charm, hold, poison, fear',
        'never checks morale',
        'cone 3d6',
        'hit only by +2 weapons'
      ],
      cone: { damage: '3d6', range: '3"', lengthTiles: 6, rangeFrom: '7.6', save: 'vs breath for half', everySec: 4, minTiles: 2 },
      hitOnlyBy: 2,
      xp: 8420,
      xpFormula: formula(2400, 20, 96, [
        { kind: 'SA', reason: 'printed', xp: 1250 },
        { kind: 'SA', reason: 'printed', xp: 1250 },
        { kind: 'EA', reason: 'printed', xp: 1600 }
      ]),
      ruby: { gp: 2000 },
      art: art('construct', 'assets/creatures/mon_construct.png', true, 'Ruby Guardian VIII')
    }
  };

  /**
   * The five steps name the cone, the rays, the bite, the stalks,
   * and the shaft. They do not name a covering creature. The charmed
   * thralls still stand in the lair. The ruby stays on the guardian.
   */
  var BEHOLDER = {
    key: 'beholder',
    separateFromGuardian: true,
    bossFlagOnIndividual: false,
    coveringUnit: null,
    shaftInRoom: true,
    cycleEverySec: 1,
    cone: {
      angle: 90,
      lengthTiles: 14,
      stops: ['weapon plus', 'ring plus', 'armor plus', 'spells'],
      keepMacarInside: 'while he holds a magic weapon or wears magic armor'
    },
    rays: {
      perSec: 2,
      at: 'targets outside the cone',
      cooldownSec: 3,
      order: [
        { n: 1, name: 'death ray', target: 'highest-level target in view', save: 'vs death magic' },
        { n: 2, name: 'disintegrate', target: 'Macar', save: 'vs death magic' },
        { n: 3, name: 'flesh to stone', save: 'vs petrification' },
        { n: 4, name: 'charm monster', target: 'a ghost', skip: 'ghosts are immune to charm (1.13)' },
        { n: 5, name: 'charm person', target: 'Macar', save: 'vs spell', dwarfBonus: true, walkAwaySec: 3, saveAgain: true, ruling: true },
        { n: 6, name: 'slow', effect: 'half speed, half attacks' },
        { n: 7, name: 'fear', save: 'or flee 3 s' },
        { n: 8, name: 'telekinesis', effect: 'shoves the target 2 tiles' },
        { n: 9, name: 'cause serious wounds', damage: '2d8+1' },
        { n: 10, name: 'sleep', affects: '4+1 HD or less' }
      ]
    },
    eyestalks: { specialtyTotal: 19, severs: 1, chosen: 'at random', ruling: true, rawSeparateHp: true },
    /*
     * Wiring pass: the shaft is at the lair's north entrance (50, 38).
     * A fleeing beholder retreats toward the arrival point (8, 28).
     * Do not move the shaft. The layout stays as placed.
     */
    retreat: {
      belowHpFraction: 0.3,
      mv: '3"',
      toward: 'shaft',
      wiringNote: 'The shaft is at the lair north entrance, so a fleeing beholder retreats toward the arrival. Flag for the wiring pass. Do not move the layout.'
    },
    priority: [
      'Anti-magic cone: 90 degrees, 14 tiles. Magic item bonuses and spells stop inside it. The beholder keeps Macar in the cone while he holds a magic weapon or wears magic armor.',
      'Up to 2 eye rays per second at targets outside the cone. Each eye has a 3 s cooldown, in the printed priority order.',
      'Bite 2d4 when adjacent.',
      'A Specialty Attack total of 19 or more severs one eyestalk, chosen at random.',
      'Below 30% HP it backs away at MV 3" toward the shaft and keeps firing.'
    ]
  };

  var MINIONS = {
    decision: 'D6-B',
    locked: true,
    keys: ['duergar', 'umberhulk'],
    counts: { duergar: 4, umberhulk: 1 },
    charmed: true,
    inBossRoom: true,
    onBeholderDeath: { duergar: 'flee', umberhulk: 'hostile' }
  };

  /**
   * No L8 attack is a poison save. Duergar are immune to poison.
   * H1 and the spider size table stay available, and the floor of 2
   * still binds any poison save.
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
    { slot: 1, key: 'duergar', count: '1d4', charmed: true },
    { slot: 2, key: 'duergar', count: '1d4', charmed: true },
    { slot: 3, key: 'duergar', count: '1d4', charmed: true },
    { slot: 4, key: 'orc', count: '1d6', charmed: true },
    { slot: 5, key: 'orc', count: '1d6', charmed: true },
    { slot: 6, key: 'umberhulk', count: '1', charmed: true }
  ];

  var HAMMER = {
    id: 'holy_hammer',
    name: 'Holy Hammer',
    plus: 3,
    decision: 'D18-A',
    basis: 'Hammer +3, Dwarven Thrower',
    pageVerify: true,
    behindBoss: true,
    usableByMacar: 'Y',
    thrown: {
      range: '6"',
      rangeTiles: 12,
      returns: true,
      wielder: 'dwarf fighter',
      multiplier: { normal: 2, giants: 3, giantsInclude: ['ogre', 'ogre magi', 'troll', 'ettin'] },
      plusAfterMultiply: 3,
      otherHands: { plus: 2, throw: false },
      page: 'DMG p.168'
    },
    quest: { smashTeethOn: 'holy_anvil', countsAsPlus: 3, forGuardian: 10 }
  };

  var LOOT = {
    individual: {
      U: {
        coins: { cp: '10-80', sp: '10-60', gp: '5-30' },
        gems: { chance: 90, dice: '2-16' },
        jewelry: { chance: 80, dice: '1-6' },
        magic: { chance: 55, count: 1, kind: 'any' },
        decision: 'D1-A'
      },
      M: { letter: 'M', onCorpse: true, gp: '2d4' },
      Q: { letter: 'Q', onCorpse: true, gems: { chance: 50, dice: '1d4' } }
    },
    lair: {
      I: {
        letter: 'I',
        onCorpse: false,
        cp: null,
        sp: null,
        ep: null,
        gp: null,
        pp: { chance: 30, min: 1, max: 6, times: 1000 },
        gems: { chance: 55, min: 2, max: 16 },
        jewelry: { chance: 50, min: 1, max: 8 },
        magic: { chance: 15, count: 1, kind: 'any' }
      }
    },
    bossChest: {
      letter: 'I',
      decision: 'D2',
      onCorpse: false,
      contents: 'lair-I',
      quest: 'holy_hammer',
      includesRuby: false,
      extraHoard: false
    },
    guardianRuby: { with: 'rubyGuardian', gp: 2000 },
    caches: {
      count: 16,
      level: 8,
      table: 'DMG Appendix A Table V',
      row: {
        cp: null,
        sp: null,
        ep: null,
        gp: { chance: 65, min: 8, max: 48, times: 100 },
        pp: { chance: 40, min: 1, max: 10, times: 100 },
        gems: { chance: 45, min: 4, max: 24 },
        jewelry: { chance: 30, min: 1, max: 8 },
        magic: { chance: 20, count: 4, kind: 'any' }
      }
    },
    magicFilter: '2.2 usable by a dwarf fighter',
    usable: [
      { name: 'Coins, gems', usableByMacar: 'Y' },
      { name: 'Rolled magic and lair I magic', usableByMacar: 'Y', filter: '2.2' },
      { name: 'Holy Hammer +3', usableByMacar: 'Y' }
    ],
    questItems: [HAMMER]
  };

  /** Printed cells only. orc's 14.5 band stays on the monster as bandXp. */
  var XP = {
    beholder: 7910,
    duergar: 86,
    umberhulk: 1828,
    orc: 15,
    rubyGuardian: 8420
  };

  /** Refreshed 1.12 column is the stat-block sum. */
  var FORECAST_BOSS_GUARDIAN_XP = 16330;

  var OPEN = [
    {
      id: 'orc-band',
      note: 'Resolved by §7.6. The orc wired xp stays 15. The 14.5 band stays a side field.'
    },
    {
      id: 'duergar-addends',
      note: 'Resolved by §7.6. The 8 is infravision and surprise. The 45 is enlarge, invisibility, and poison and paralysis immunity.'
    },
    {
      id: 'duergar-tt',
      note: 'Resolved by §7.6. A duergar corpse rolls M and Q. Lair B and F are not rolled.'
    },
    {
      id: 'beholder-letters',
      note: 'MM1 beholder treasure is I, S, T. I is the chest. S and T are not rolled. Nick has not decided that flag. (open)'
    },
    {
      id: 'ac-facing',
      note: 'Resolved by §7.6. Every attack hits body AC 0. Eyestalks at AC 2 are the 19+ Specialty sever. The central eye is not a separate target.'
    },
    {
      id: 'cone-range',
      note: 'Resolved by §7.6. Guardian VIII\'s cone is 3 inches, 6 tiles.'
    },
    {
      id: 'guardian-addends',
      note: 'Resolved by §7.6. The two 1,250 terms are a +2 weapon to hit and AC -1. The 1,600 is the cone.'
    },
    {
      id: 'ruby-band',
      note: 'Resolved by §7.0. Guardian VIII ruby is exactly 2,000 gp, on the guardian.'
    },
    {
      id: 'hammer-roll',
      note: 'Resolved by §7.6. The Holy Hammer is added to the chest, and lair I rolls in full.'
    },
    {
      id: 'throw-mult',
      note: 'Resolved by §7.6. A dwarf fighter throws it at ×2, or ×3 against giants, ogres, trolls, and ettins, then adds +3.'
    },
    {
      id: 'hammer-page',
      note: 'Resolved by §7.6. The hammer is DMG p.168, Hammer +3, Dwarven Thrower.'
    },
    {
      id: 'shaft-spot',
      note: 'Resolved by §7.6. The shaft tile stays in the lair at (50, 38).'
    },
    {
      id: 'map-rooms',
      note: 'Resolved by §7.6. The lair stays at (52, 42).'
    },
    {
      id: 'cache-places',
      note: 'Resolved by §7.6. Sixteen level-8 caches stay as placed.'
    },
    {
      id: 'hulk-lair',
      note: 'Resolved by §7.6. G is not a second chest. The hulk corpse uses the house high band.'
    },
    {
      id: 'wander-place',
      note: 'Resolved by §7.6. Wander packs are not also placed as rooms. The wandering hulk is charmed.'
    },
    {
      id: 'forecast-pack',
      note: 'Resolved by §7.6. The column is 16,330. Four duergar and one hulk make 2,172, and 18,502 rounds to the printed 18,500, which is not added.'
    },
    {
      id: 'guardian-art',
      note: 'Resolved by §7.6. Guardian VIII uses the construct sheet.'
    },
    {
      id: 'surprise-verify',
      note: 'Resolved by §7.6. Duergar surprise on 3 in 6, and they are surprised only 1 in 10.'
    }
  ];

  function printedXp(mon) {
    return formula(mon.xpFormula.base, mon.xpFormula.perHp, mon.xpFormula.hp, mon.xpFormula.terms).xp;
  }

  function bossGuardianXp() {
    return XP.rubyGuardian + XP.beholder;
  }

  function ingredientIds() {
    return [];
  }

  function itemIds() {
    return ['holy_hammer'];
  }

  var api = {
    MONSTERS: MONSTERS,
    BEHOLDER: BEHOLDER,
    MINIONS: MINIONS,
    POISON: POISON,
    WANDER: WANDER,
    HAMMER: HAMMER,
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

  root.L8 = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

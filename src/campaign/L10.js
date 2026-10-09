/**
 * Level 10 encounters, the Undying King, and the temple ritual.
 * Data only. Not loaded by index.html.
 *
 * Numbers are the L10 rows in MACAR_10_LEVEL_RULES (1.10, 1.11, 1.14,
 * section 5) and the DMG XP bands in section 1.0. The map is maps/l10.json.
 * xp is the printed cell. bandXp is a side field and is not wired into
 * boss-plus-guardian XP.
 * A field marked open is a 1e choice the RULES do not print.
 * A field marked verify is stored as the RULES print it.
 */
(function (root) {
  'use strict';

  var table = root.CampaignTable;
  if (!table && typeof module === 'object' && module.exports) table = require('./CampaignTable');
  if (!table || !table.poisonSave) throw new Error('L10 needs CampaignTable.poisonSave');

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

  var UNDEAD_ART = art('undead', 'assets/creatures/mon_undead.png', true, 'Undead');

  var MONSTERS = {
    skeleton: {
      key: 'skeleton',
      name: 'Skeleton',
      source: 'MM1 p.87',
      hd: 1,
      ac: 7,
      mv: '12"',
      attacks: [{ n: 1, form: 'weapon', damage: '1d6' }],
      specials: ['half damage from sharp weapons', 'immune to sleep, charm, hold and cold'],
      immune: ['sleep', 'charm', 'hold', 'cold'],
      sharpWeaponDamage: 'half',
      xp: 15,
      bandXp: 14.5,
      xpFormula: formula(10, 1, 4.5, []),
      tt: 'Nil',
      art: UNDEAD_ART
    },
    zombie: {
      key: 'zombie',
      name: 'Zombie',
      source: 'MM1 p.103',
      hd: 2,
      ac: 8,
      mv: '6"',
      attacks: [{ n: 1, form: 'strike', damage: '1d8' }],
      specials: ['always strikes last', 'immunities as skeleton'],
      strikesLast: true,
      immune: ['sleep', 'charm', 'hold', 'cold'],
      xp: 38,
      xpFormula: formula(20, 2, 9, []),
      tt: 'Nil',
      art: UNDEAD_ART
    },
    ghoul: {
      key: 'ghoul',
      name: 'Ghoul',
      source: 'MM1 p.43',
      hd: 2,
      ac: 6,
      mv: '9"',
      attacks: [
        { n: 1, form: 'claw', damage: '1d3' },
        { n: 1, form: 'claw', damage: '1d3' },
        { n: 1, form: 'bite', damage: '1d6' }
      ],
      specials: ['touch paralyzes', 'save vs paralysis', 'elves are immune', 'dwarves are not'],
      paralysis: { save: 'vs paralysis', elvesImmune: true, dwarvesImmune: false },
      xp: 83,
      xpFormula: formula(20, 2, 9, [
        { kind: 'EA', reason: 'paralysis', xp: 45 }
      ]),
      tt: 'B',
      art: UNDEAD_ART
    },
    wight: {
      key: 'wight',
      name: 'Wight',
      source: 'MM1 p.100',
      hd: '4+3',
      ac: 5,
      mv: '12"',
      attacks: [{ n: 1, form: 'touch', damage: '1d4' }],
      specials: ['level drain', 'needs silver or a magic weapon'],
      drain: { levels: 1, decision: 'D14-B', until: 'next camp rest' },
      hitOnlyBy: 'silver or magic',
      xp: 310,
      xpFormula: formula(90, 5, 21, [
        { kind: 'SA', reason: 'silver or magic weapon', xp: 40 },
        { kind: 'EA', reason: 'level drain', xp: 75 }
      ]),
      tt: 'B',
      art: UNDEAD_ART
    },
    wraith: {
      key: 'wraith',
      name: 'Wraith',
      source: 'MM1 p.102',
      hd: '5+3',
      ac: 4,
      mv: '12"/24"',
      attacks: [{ n: 1, form: 'touch', damage: '1d6' }],
      specials: ['level drain', 'silver does half damage', 'needs a magic weapon'],
      drain: { levels: 1, decision: 'D14-B', until: 'next camp rest' },
      silverDamage: 'half',
      hitOnlyBy: 'magic',
      xp: 503,
      xpFormula: formula(150, 6, 25.5, [
        { kind: 'SA', reason: 'magic weapon', xp: 75 },
        { kind: 'EA', reason: 'level drain', xp: 125 }
      ]),
      tt: 'E',
      art: art('wraith', 'assets/creatures/mon_wraith.png', false, null)
    },
    spectre: {
      key: 'spectre',
      name: 'Spectre',
      source: 'MM1 p.89',
      hd: '7+3',
      ac: 2,
      mv: '15"/30"',
      attacks: [{ n: 1, form: 'touch', damage: '1d8' }],
      specials: ['drains 2 levels', 'needs a +1 weapon'],
      drain: { levels: 2, decision: 'D14-B', until: 'next camp rest' },
      hitOnlyBy: 1,
      xp: 1170,
      xpFormula: formula(375, 10, 34.5, [
        { kind: 'SA', reason: '+1 weapon', xp: 175 },
        { kind: 'EA', reason: 'drains 2 levels', xp: 275 }
      ]),
      tt: 'Q',
      ttTimes: 3,
      ttVerify: true,
      art: UNDEAD_ART
    },
    duergar: {
      key: 'duergar',
      name: 'Duergar',
      source: 'MM2 Dwarf, gray (duergar) (verify page)',
      pageVerify: true,
      hd: '1+2',
      ac: 4,
      mv: '6"',
      attacks: [{ n: 1, form: 'weapon', damage: '1d8' }],
      specials: ['enlarge 1/day', 'invisibility 1/day', 'immune to paralysis, illusion and poison', 'surprise 3 in 6'],
      enlarge: { perDay: 1 },
      invisibility: { perDay: 1 },
      immune: ['paralysis', 'illusion', 'poison'],
      surprise: { chance: '3 in 6', surprisedOnly: '1 in 10' },
      saveVsMagic: 4,
      xp: 86,
      xpFormula: formula(20, 2, 6.5, [
        { kind: 'SA', reason: 'infravision and surprise', xp: 8 },
        { kind: 'EA', reason: 'enlarge, invisibility, poison and paralysis immunity', xp: 45 }
      ]),
      tt: 'M',
      ttAlso: 'Q',
      art: art('duergar', 'assets/creatures/mon_duergar.png', false, null)
    },
    duergarPriest: {
      key: 'duergarPriest',
      name: 'Duergar priest',
      source: 'RULING: MM2 duergar with HOUSE cleric 5',
      hd: 5,
      ac: 3,
      mv: '6"',
      attacks: [{ n: 1, form: 'weapon', damage: '1d8+1' }],
      specials: ['C5 spells'],
      slots: { 1: 3, 2: 3, 3: 1 },
      spells: ['Command', 'Cause Light Wounds', 'Cause Light Wounds', 'Hold Person', 'Hold Person', 'Silence', 'Animate Dead'],
      xp: 400,
      bandXp: 277.5,
      xpFormula: formula(90, 5, 22.5, [
        { kind: 'EA', reason: 'spell use', xp: 75 }
      ]),
      tt: 'M',
      art: art('duergar', 'assets/creatures/mon_duergar.png', true, 'Duergar priest')
    },
    king: {
      key: 'king',
      name: 'Undying King',
      role: 'champion',
      source: 'HOUSE creature. RULING from MM1 wight, wraith and spectre at king scale.',
      hd: 12,
      hp: 72,
      ac: 0,
      mv: '9"',
      attacks: [
        { n: 1, form: 'axe', damage: '1d10+3' },
        { n: 1, form: 'touch', damage: '1d8' }
      ],
      specials: [
        'needs a +1 weapon to hit',
        'regenerates 2 HP per round while any ritual brazier burns',
        'immune to sleep, charm, hold, poison and cold',
        'Animate Dead raises 1d4 skeletons once per 10 s',
        'level drain'
      ],
      hitOnlyBy: 1,
      regeneration: { hpPerRound: 2, while: 'any ritual brazier burns' },
      unslayableWhile: 'any brazier burns',
      atZeroHp: { dropSec: 5, risesAtHpFraction: 0.25 },
      immune: ['sleep', 'charm', 'hold', 'poison', 'cold'],
      animateDead: { count: '1d4', kind: 'skeleton', cooldownSec: 10, when: 'fewer than 4 undead are alive' },
      drain: { decision: 'D14-B', until: 'next camp rest' },
      decision: 'D14-B',
      bossFlagOnIndividual: false,
      xp: 5552,
      xpFormula: formula(1300, 16, 72, [
        { kind: 'SA', reason: 'magic weapons', xp: 700 },
        { kind: 'SA', reason: 'regeneration', xp: 700 },
        { kind: 'EA', reason: 'drain', xp: 850 },
        { kind: 'EA', reason: 'spells', xp: 850 }
      ]),
      tt: 'U',
      lair: 'Chapter V hoard',
      art: art('king', 'assets/creatures/mon_king.png', false, null)
    },
    rubyGuardian: {
      key: 'rubyGuardian',
      name: 'Ruby Guardian X',
      source: 'RULING 1.11',
      tier: 10,
      hd: 20,
      hp: 120,
      ac: -3,
      mv: '6"',
      attacks: [{ n: 2, form: 'slam', damage: '3d10' }],
      specials: [
        'construct immunities: sleep, charm, hold, poison, fear',
        'never checks morale',
        'cone 4d6',
        'hit only by +3 weapons',
        'only the Holy Hammer qualifies'
      ],
      cone: { damage: '4d6', range: '3"', rangeFrom: '7.6', save: 'vs breath for half', everySec: 4, minTiles: 2 },
      hitOnlyBy: 3,
      qualifyingWeapon: 'holy_hammer',
      xp: 16800,
      xpFormula: formula(4000, 30, 120, [
        { kind: 'SA', reason: 'printed', xp: 2100 },
        { kind: 'SA', reason: 'printed', xp: 2100 },
        { kind: 'EA', reason: 'printed', xp: 2500 },
        { kind: 'EA', reason: 'printed', xp: 2500 }
      ]),
      ruby: { gp: 2500, band: '2500' },
      art: art('construct', 'assets/creatures/mon_construct.png', true, 'Ruby Guardian X')
    }
  };

  /**
   * The five steps name Macar at the anvil, Animate Dead, the touch,
   * the axe, and the throne room. They do not name a covering creature.
   * The locked wight and wraith guard still stand in that room.
   */
  var KING = {
    key: 'king',
    separateFromGuardian: true,
    bossFlagOnIndividual: false,
    coveringUnit: null,
    room: 'throne-room',
    neverLeaves: true,
    priority: [
      'If Macar is channeling at the anvil, the King attacks him, to interrupt.',
      'If fewer than 4 undead are alive, he casts Animate Dead. The cooldown is 10 s. It raises 1d4 skeletons.',
      'He touch-drains whoever is adjacent, preferring Macar.',
      'He axes the highest-level kin.',
      'He never leaves the throne room.'
    ]
  };

  /**
   * Section 6 locks the unnumbered recommendation: C is his guard,
   * B is the level population, and A is the spell he casts.
   * The RULES print no counts for the guard or the population.
   */
  var MINIONS = {
    locked: true,
    recommendation: 'C as his guard, plus B as the level population',
    guard: {
      choice: 'C',
      keys: ['wight', 'wraith'],
      counts: { wight: 2, wraith: 2 },
      role: 'minion',
      inBossRoom: true,
      source: 'MM1 wight and wraith servants'
    },
    population: {
      choice: 'B',
      keys: ['duergar', 'duergarPriest'],
      counts: { duergar: 4, duergarPriest: 1 },
      role: 'population',
      inBossRoom: false,
      room: 'south-court',
      source: 'MM2 duergar'
    },
    animated: {
      choice: 'A',
      key: 'skeleton',
      count: '1d4',
      placed: false,
      source: 'Animate Dead'
    }
  };

  /**
   * No L10 attack is a poison save. Undead and duergar are immune to poison.
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
    { slot: 1, key: 'skeleton', count: '2d4' },
    { slot: 2, key: 'zombie', count: '1d6' },
    { slot: 3, key: 'ghoul', count: '1d4' },
    { slot: 4, key: 'duergar', count: '1d4' },
    { slot: 5, key: 'wight', count: '1' },
    { slot: 6, key: 'wraith', count: '1' }
  ];

  /**
   * Plan: Macar places the anvil on the temple altar and smashes each
   * of the 7 electrum teeth with the hammer.
   * Section 1.10 adds the seven braziers and the mortal-king kill.
   * Section 6 #7 sets the award at 10,000, once.
   */
  var RITUAL = {
    id: 'temple-ritual',
    name: 'Temple ritual',
    kind: 'ritual',
    behindBoss: true,
    usableByMacar: 'Y',
    xpOnce: 10000,
    xpRuledBy: '6 #7',
    site: 'altar',
    alsoCalled: 'throne dais',
    teeth: 7,
    toothIds: [
      'grond_tooth_electrum',
      'grond_tooth_electrum_2',
      'grond_tooth_electrum_3',
      'grond_tooth_electrum_4',
      'grond_tooth_electrum_5',
      'grond_tooth_electrum_6',
      'grond_tooth_electrum_7'
    ],
    hammer: { id: 'holy_hammer', from: 'L8' },
    anvil: { id: 'holy_anvil', from: 'L9' },
    channel: { rounds: 1, interruptedIfHit: true },
    perSmash: ['puts out one brazier', 'lowers teethCarried by one'],
    onSeventh: ['the curse ends', 'the King becomes mortal', '10000 XP once'],
    win: 'Killing the mortal King wins.',
    steps: [
      'Seven braziers burn. While any burns, the King regenerates and cannot be slain.',
      'Macar sets the Holy Anvil on the altar.',
      'Each Holy Hammer smash spends one round and puts out one brazier.',
      'Each smash lowers teethCarried by one.',
      'The seventh smash ends the curse and makes the King mortal.',
      'Killing the mortal King wins.'
    ]
  };

  var LOOT = {
    individual: {
      U: {
        coins: { cp: '10-80', sp: '10-60', gp: '5-30' },
        magic: { chance: 55, count: 1, kind: 'any' },
        decision: 'D1-A',
        on: 'king'
      }
    },
    bossChest: {
      letter: null,
      decision: 'D2',
      onCorpse: false,
      contents: 'chapter-v-hoard',
      quest: null,
      includesRuby: false,
      extraHoard: false
    },
    guardianRuby: { with: 'rubyGuardian', gp: 2500, band: '2500' },
    caches: {
      count: 16,
      level: 8,
      floor: 10,
      table: 'DMG Appendix A Table V',
      rowNote: 'L10 uses the level-8 row',
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
      { name: 'Rolled magic', usableByMacar: 'Y', filter: '2.2' }
    ]
  };

  /** Printed cells only. Skeleton and priest bandXp stay off this sum. */
  var XP = {
    skeleton: 15,
    zombie: 38,
    ghoul: 83,
    wight: 310,
    wraith: 503,
    spectre: 1170,
    duergar: 86,
    duergarPriest: 400,
    king: 5552,
    rubyGuardian: 16800
  };

  /**
   * The refreshed 1.12 cell is the stat-block sum, 22,352, plus the
   * ritual. The sources line also names undead of about 8,000.
   */
  var FORECAST_BOSS_GUARDIAN_XP = 22352;

  /**
   * Cumulative after L9 is 410,000. The L10 row is 500,000, so the
   * clear on this floor is 90,000. The ritual adds 10,000 once.
   * 410,000 + 90,000 + 10,000 = 510,000.
   */
  var PATH = {
    throughL9: 410000,
    l10Cumulative: 500000,
    l10Clear: 90000,
    ritual: 10000,
    total: 510000
  };

  var OPEN = [
    {
      id: 'skeleton-xp',
      note: 'The skeleton cell prints about 15. At average hp 4.5 the 1 HD band is 14.5, with the sharp-weapon special left out. The wired xp is 15. The 14.5 is a side field. (open)'
    },
    {
      id: 'priest-xp',
      note: 'The duergar priest prints about 400. At 5 HD and 22.5 hp, one exceptional ability for spell use is 277.5. The wired xp is 400. The 277.5 is a side field. (open)'
    },
    {
      id: 'spectre-tt',
      note: 'Spectre treasure is Q times 3, marked verify. It is stored as three individual Q rolls. (open)'
    },
    {
      id: 'duergar-page',
      note: 'The duergar source line marks the MM2 page verify. The letters stored are M and Q. (open)'
    },
    {
      id: 'guard-count',
      note: 'Choice C locks wights and wraiths as the King\'s guard and prints no count. Two of each stand in the throne room. (open)'
    },
    {
      id: 'population-count',
      note: 'Choice B locks duergar as the level population and prints no count. Four duergar and one priest stand in the south court. (open)'
    },
    {
      id: 'hoard-letter',
      note: 'The King is a house creature and has no MM lair letter. The chest is the Chapter V hoard. No letter is stored. The ruby is not in it. (open)'
    },
    {
      id: 'anvil-shared',
      note: 'Adamantine Chain +2 takes the Holy Anvil as an ingredient, and the ritual also places that anvil on the altar. Whether the forge spends it is not printed. (open)'
    },
    {
      id: 'king-order',
      note: 'The plan says the King dies before the ritual. Section 1.10 says the seventh smash makes him mortal and the kill after that wins. The encoded steps follow 1.10. (open)'
    },
    {
      id: 'anvil-site',
      note: 'The plan says the temple altar. Section 1.10 says the throne dais. The anvil is placed on the altar at (29, 14.5). The throne stands at (29, 10). (open)'
    },
    {
      id: 'final-exit',
      note: 'The live chapter has no stair. The win is the King. Section 6 still opens the campaign stair on that kill. (open)'
    },
    {
      id: 'elevator-next',
      note: 'L10 still has the guardian elevator and the Chapter V card. No next floor is printed. (open)'
    },
    {
      id: 'cache-places',
      note: 'Sixteen caches use the level-8 row, as printed for L10. The RULES print the row and no coordinates. (open)'
    },
    {
      id: 'map-rooms',
      note: 'The King, the altar, and the throne keep the Chapter V points. The ruby court has no printed coordinate. (open)'
    },
    {
      id: 'wander-place',
      note: 'Section 5 is the wander table. The placed retinue is the locked guard and the duergar population. Wander packs are not also placed as rooms. (open)'
    },
    {
      id: 'forecast-pack',
      note: 'The 1.12 cell is 22,352, the King 5,552 plus Guardian X 16,800. The sources line also says undead about 8,000. That pack is not named in the boss-plus-guardian cell, so it is not added. (open)'
    },
    {
      id: 'guardian-addends',
      note: 'Guardian X prints 2,100 twice and 2,500 twice and does not name them. (open)'
    },
    {
      id: 'brazier-places',
      note: 'Seven braziers are required. The Chapter V map has seven brazier props. Four ring the throne room and three stand in side chapels. (open)'
    },
    {
      id: 'undead-art',
      note: 'No skeleton, zombie, ghoul, wight, or spectre sheet exists. They use the undead sheet. (open)'
    },
    {
      id: 'priest-art',
      note: 'No duergar-priest sheet exists. The priest uses the duergar sheet. (open)'
    },
    {
      id: 'nil-band',
      note: 'Skeleton and zombie print Nil. Ghoul and wight print B, and the wraith prints E. Those letters are lair letters and are not a second chest. Which house corpse band they use is not printed on the L10 line. (open)'
    }
  ];

  function printedXp(mon) {
    return formula(mon.xpFormula.base, mon.xpFormula.perHp, mon.xpFormula.hp, mon.xpFormula.terms).xp;
  }

  function bossGuardianXp() {
    return XP.rubyGuardian + XP.king;
  }

  function ingredientIds() {
    return [];
  }

  function itemIds() {
    return ['temple-ritual'];
  }

  var api = {
    MONSTERS: MONSTERS,
    KING: KING,
    MINIONS: MINIONS,
    POISON: POISON,
    WANDER: WANDER,
    RITUAL: RITUAL,
    LOOT: LOOT,
    XP: XP,
    FORECAST_BOSS_GUARDIAN_XP: FORECAST_BOSS_GUARDIAN_XP,
    PATH: PATH,
    OPEN: OPEN,
    printedXp: printedXp,
    bossGuardianXp: bossGuardianXp,
    ingredientIds: ingredientIds,
    itemIds: itemIds,
    wired: false
  };

  root.L10 = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

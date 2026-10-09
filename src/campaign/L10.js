/**
 * Level 10 encounters, the Undying King, and the temple ritual.
 * Data only. Not loaded by index.html.
 *
 * Numbers are the L10 rows in MACAR_10_LEVEL_RULES (1.10, 1.11, 1.14,
 * section 5) and the DMG XP bands in section 1.0. The map is maps/l10.json.
 * xp is the ruled cell. Half points round up when wired.
 * bandXp is retired on this floor.
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
      specials: ['half damage from sharp weapons', 'immune to sleep, charm, hold, cold and poison'],
      immune: ['sleep', 'charm', 'hold', 'cold', 'poison'],
      sharpWeaponDamage: 'half',
      xp: 19,
      xpFormula: formula(10, 1, 4.5, [
        { kind: 'SA', reason: 'sharp weapons do half damage', xp: 4 }
      ]),
      tt: 'Nil',
      corpseBand: 'mid',
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
      immune: ['sleep', 'charm', 'hold', 'cold', 'poison'],
      xp: 38,
      xpFormula: formula(20, 2, 9, []),
      tt: 'Nil',
      corpseBand: 'mid',
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
      specials: ['touch paralyzes', 'save vs paralysis', 'elves are immune', 'dwarves are not', 'immune to poison'],
      paralysis: { save: 'vs paralysis', elvesImmune: true, dwarvesImmune: false },
      immune: ['poison'],
      xp: 83,
      xpFormula: formula(20, 2, 9, [
        { kind: 'EA', reason: 'paralysis', xp: 45 }
      ]),
      tt: 'B, T',
      ttLair: 'B',
      corpseLetters: { T: 1 },
      corpseBand: 'mid',
      bandCoinsOnly: true,
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
      immune: ['poison'],
      xp: 310,
      xpFormula: formula(90, 5, 21, [
        { kind: 'SA', reason: 'silver or magic weapon', xp: 40 },
        { kind: 'EA', reason: 'level drain', xp: 75 }
      ]),
      tt: 'B',
      ttLair: true,
      onCorpse: false,
      corpseBand: 'high',
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
      immune: ['poison'],
      xp: 503,
      xpFormula: formula(150, 6, 25.5, [
        { kind: 'SA', reason: 'magic weapon', xp: 75 },
        { kind: 'EA', reason: 'level drain', xp: 125 }
      ]),
      tt: 'E',
      ttLair: true,
      onCorpse: false,
      corpseBand: 'high',
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
      specials: ['drains 2 levels', 'needs a +1 weapon', 'immune to poison'],
      drain: { levels: 2, decision: 'D14-B', until: 'next camp rest' },
      hitOnlyBy: 1,
      immune: ['poison'],
      xp: 1170,
      xpFormula: formula(375, 10, 34.5, [
        { kind: 'SA', reason: '+1 weapon', xp: 175 },
        { kind: 'EA', reason: 'drains 2 levels', xp: 275 }
      ]),
      tt: ['Q', 'Q', 'Q', 'X', 'Y'],
      onCorpse: true,
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
      corpseLetters: { M: 1, Q: 1 },
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
      specials: ['C5 spells', 'immune to paralysis, illusion and poison'],
      slots: { 1: 3, 2: 3, 3: 1 },
      spells: ['Command', 'Cause Light Wounds', 'Cause Light Wounds', 'Hold Person', 'Hold Person', 'Silence', 'Animate Dead'],
      immune: ['paralysis', 'illusion', 'poison'],
      xp: 393,
      xpFormula: formula(90, 5, 22.5, [
        { kind: 'SA', reason: 'infravision and surprise', xp: 40 },
        { kind: 'EA', reason: 'enlarge, invisibility, immunities', xp: 75 },
        { kind: 'EA', reason: 'C5 spells', xp: 75 }
      ]),
      tt: 'M',
      ttAlso: 'Q',
      corpseLetters: { M: 1, Q: 1 },
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
      ruby: { gp: 2500 },
      art: art('construct', 'assets/creatures/mon_construct.png', true, 'Ruby Guardian X')
    }
  };

  /**
   * The King dies before the ritual. The four steps are Animate Dead,
   * the touch, the axe, and the throne room. They do not interrupt a smash
   * and they do not name a covering creature.
   */
  var KING = {
    key: 'king',
    separateFromGuardian: true,
    bossFlagOnIndividual: false,
    coveringUnit: null,
    room: 'throne-room',
    neverLeaves: true,
    diesBeforeRitual: true,
    priority: [
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
   * No L10 attack is a poison save. Poison is on every undead immune
   * list, and on the King, the duergar, and the priest. H1 and the
   * spider size table stay available, and the floor of 2 still binds
   * any poison save.
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
   * The King dies first. Then Macar sets the anvil on the temple altar
   * and smashes the 7 teeth. The ritual XP is xpOnce, and it is the only copy.
   */
  var HINT = 'The curse still holds. Smash the teeth on the altar.';
  var TOOTH_IDS = [
    'grond_tooth_electrum',
    'grond_tooth_electrum_2',
    'grond_tooth_electrum_3',
    'grond_tooth_electrum_4',
    'grond_tooth_electrum_5',
    'grond_tooth_electrum_6',
    'grond_tooth_electrum_7'
  ];
  var RITUAL = {
    id: 'temple-ritual',
    name: 'Temple ritual',
    kind: 'ritual',
    behindBoss: true,
    usableByMacar: 'Y',
    xpOnce: 10000,
    xpRuledBy: '6 #7',
    xpReadFrom: 'RITUAL.xpOnce',
    site: 'altar',
    altar: { x: 29, y: 14.5 },
    unlocksOn: 'kingKill',
    kingDiesBefore: true,
    teeth: 7,
    toothIds: TOOTH_IDS,
    teethCounted: ['party', 'altar'],
    hammer: { id: 'holy_hammer', from: 'L8', tool: true, consumed: false },
    anvil: { id: 'holy_anvil', from: 'L9', tool: true, consumed: false },
    questLock: {
      until: 'ritual ends',
      cannot: ['sell', 'drop', 'break', 'recipe'],
      ids: ['holy_anvil', 'holy_hammer'].concat(TOOTH_IDS),
      teethMayMoveBetweenPacks: true
    },
    unclaimedTooth: {
      when: 'Macar leaves its floor',
      goesTo: { level: 10, site: 'altar', x: 29, y: 14.5 },
      reason: 'the curse draws it home'
    },
    smash: {
      sec: 1,
      interruptedBy: 'any hit',
      putsOut: 'nearest brazier',
      lowers: 'teethCarried',
      by: 1
    },
    onSeventh: ['the curse ends', 'the ritual XP once', 'the run is won'],
    win: 'ritualComplete',
    steps: [
      'The King fights and dies in the throne room. His kill opens the stair and unlocks the altar.',
      'Macar sets the Holy Anvil on the temple altar at (29, 14.5).',
      'Each Holy Hammer smash takes 1 s. Any hit interrupts it.',
      'Each smash puts out the nearest brazier and lowers teethCarried by 1.',
      'The seventh smash ends the curse, grants the ritual XP once, and wins.'
    ]
  };

  var EXIT = {
    win: 'ritualComplete',
    altarUnlocksOn: 'kingKill',
    stair: { opensOn: 'bossKill', next: null, beforeWin: HINT },
    elevator: { gate: 'guardian', next: null, beforeWin: HINT }
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
      once: true,
      quest: null,
      includesRuby: false,
      extraHoard: false,
      x: 28,
      y: 12,
      room: 'throne-room'
    },
    guardianRuby: { with: 'rubyGuardian', gp: 2500 },
    corpseCoinRule: table.corpseCoinRule,
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

  /** Ruled cells. Skeleton 19 and priest 393 stay off the boss-plus-guardian sum. */
  var XP = {
    skeleton: 19,
    zombie: 38,
    ghoul: 83,
    wight: 310,
    wraith: 503,
    spectre: 1170,
    duergar: 86,
    duergarPriest: 393,
    king: 5552,
    rubyGuardian: 16800
  };

  /**
   * The refreshed 1.12 cell is the stat-block sum, 22,352, plus the
   * ritual. The sources line also names undead of about 8,000.
   */
  var FORECAST_BOSS_GUARDIAN_XP = 22352;

  /**
   * Cumulative after L9 is 406,800. The L10 row is the clear only, 491,800,
   * so this floor adds 85,000. PATH.total adds RITUAL.xpOnce once.
   */
  var PATH = {
    throughL9: 406800,
    l10Cumulative: 491800,
    l10Clear: 85000,
    total: 501800
  };

  var OPEN = [
    {
      id: 'skeleton-xp',
      note: 'Resolved by §7.10. Skeleton XP is 19. The sharp-weapon special is the 4-point term. bandXp is retired.'
    },
    {
      id: 'priest-xp',
      note: 'Resolved by §7.10. The duergar priest is 393 XP. bandXp is retired. The corpse rolls M and Q.'
    },
    {
      id: 'spectre-tt',
      note: 'Resolved by §7.10. Spectre treasure is Q, Q, Q, X, and Y, all on the corpse.'
    },
    {
      id: 'duergar-page',
      note: 'Resolved by §7.10. Individuals roll M and Q on the corpse. Lair B and F are not rolled. pageVerify stays.'
    },
    {
      id: 'guard-count',
      note: 'Resolved by §7.10. Two wights and two wraiths stay as the King\'s guard.'
    },
    {
      id: 'population-count',
      note: 'Resolved by §7.10. Four duergar and one priest stay in the south court.'
    },
    {
      id: 'hoard-letter',
      note: 'Resolved by §7.10. The boss chest rolls the Chapter V hoard once, without the ruby.'
    },
    {
      id: 'anvil-shared',
      note: 'Resolved by §7.10. The Holy Anvil is a tool. Adamantine Chain +2 requires it and does not spend it.'
    },
    {
      id: 'king-order',
      note: 'Resolved by §7.10. The King dies before the ritual. He is not unslayable, and he does not interrupt a smash.'
    },
    {
      id: 'anvil-site',
      note: 'Resolved by §7.10. The teeth are smashed on the temple altar at (29, 14.5).'
    },
    {
      id: 'final-exit',
      note: 'Resolved by §7.10. The win is ritualComplete. The King\'s kill opens the stair and unlocks the altar.'
    },
    {
      id: 'elevator-next',
      note: 'Resolved by §7.10. The stair and the elevator both have next null. Before the win they show the altar hint.'
    },
    {
      id: 'cache-places',
      note: 'Resolved by §7.10. Sixteen caches stay on the level-8 row, on floor tiles.'
    },
    {
      id: 'map-rooms',
      note: 'Resolved by §7.10. The King, the altar, and the throne stay at the Chapter V points.'
    },
    {
      id: 'wander-place',
      note: 'Resolved by §7.10. Wander packs are not also placed as rooms.'
    },
    {
      id: 'forecast-pack',
      note: 'Resolved by §7.10. The column stays 22,352. Undead of about 8,000 stay in the cumulative kills.'
    },
    {
      id: 'guardian-addends',
      note: 'Resolved by §7.10. The two 2,100 terms are a +3 weapon and AC -3. The two 2,500 terms are the cone and the two attacks.'
    },
    {
      id: 'brazier-places',
      note: 'Resolved by §7.10. The braziers at (70, 18), (92, 18), and (86, 12) are side chapels.'
    },
    {
      id: 'undead-art',
      note: 'Resolved by §7.10. Skeleton, zombie, ghoul, wight, and spectre use the undead sheet.'
    },
    {
      id: 'priest-art',
      note: 'Resolved by §7.10. The priest uses the duergar sheet.'
    },
    {
      id: 'nil-band',
      note: 'Resolved by §7.10. Skeletons and zombies use the mid band. A ghoul corpse rolls T plus mid-band coins. Wights and wraiths use O+M. Guardian X\'s ruby is exactly 2,500 gp.'
    },
    {
      id: 'undying-rise',
      note: 'Nick has not decided whether the King rises once at 25% HP before the ritual. He dies at 0 HP. (open)'
    },
    {
      id: 'elevator-epilogue',
      note: 'Nick has not decided whether the elevator plays an epilogue card. No card is stored. (open)'
    }
  ];

  function printedXp(mon) {
    var raw = formula(mon.xpFormula.base, mon.xpFormula.perHp, mon.xpFormula.hp, mon.xpFormula.terms).xp;
    return Math.round(raw);
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
    EXIT: EXIT,
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

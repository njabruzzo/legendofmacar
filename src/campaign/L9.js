/**
 * Level 9 encounters, monster stat blocks, and loot.
 * Data only. Not loaded by index.html.
 *
 * Numbers are the L9 rows in MACAR_10_LEVEL_RULES (1.9, 1.11, section 5)
 * and the DMG XP bands in section 1.0. The map is maps/l9.json.
 * xp is the printed cell. bandXp and speakingXp are side fields and are
 * not wired into boss-plus-guardian XP.
 * A field marked open is a 1e choice the RULES do not print.
 * A field marked verify is stored as the RULES print it.
 */
(function (root) {
  'use strict';

  var table = root.CampaignTable;
  if (!table && typeof module === 'object' && module.exports) table = require('./CampaignTable');
  if (!table || !table.poisonSave) throw new Error('L9 needs CampaignTable.poisonSave');

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
    redDragon: {
      key: 'redDragon',
      name: 'Red Dragon',
      source: 'MM1 p.33',
      hd: 11,
      hdRange: '9-11',
      age: 'old',
      decision: 'D8-B',
      hp: 66,
      ac: -1,
      mv: '9"/24"',
      attacks: [
        { n: 1, form: 'claw', damage: '1d8' },
        { n: 1, form: 'claw', damage: '1d8' },
        { n: 1, form: 'bite', damage: '3d10' }
      ],
      breath: {
        shape: 'cone',
        length: '9"',
        widthAtEnd: '3"',
        shapeVerify: true,
        damage: 'current HP',
        codeDamage: 'current game HP',
        applyDmgG: false,
        save: 'vs breath for half',
        perDay: 3,
        fireResistance: 'halves again after the save',
        cadence: 'never two consecutive 3 s windows'
      },
      speaks: null,
      casts: null,
      specials: ['breath', 'some reds talk and cast spells'],
      bossFlagOnIndividual: false,
      xp: 3906,
      speakingXp: 4756,
      xpFormula: formula(1300, 16, 66, [
        { kind: 'SA', reason: 'AC -1', xp: 700 },
        { kind: 'EA', reason: 'breath', xp: 850 }
      ]),
      tt: 'H',
      lair: 'H',
      art: art('deepdragon', 'assets/creatures/mon_deepdragon.png', true, 'Red dragon')
    },
    firegiant: {
      key: 'firegiant',
      name: 'Fire giant',
      source: 'MM1 p.45',
      hd: '11+3',
      hdRange: '11+2-5',
      hdChoice: '11+3',
      ac: 3,
      mv: '12"',
      attacks: [
        { n: 1, form: 'weapon', damage: '5d6' },
        { n: 1, form: 'hurl rocks', damage: '2d10' }
      ],
      specials: ['immune to fire'],
      immune: ['fire'],
      count: 2,
      xp: 2960,
      bandXp: 2840,
      xpFormula: formula(1300, 16, 52.5, [
        { kind: 'SA', reason: 'immune to fire', xp: 700 }
      ]),
      tt: null,
      art: art('firegiant', 'assets/creatures/mon_firegiant.png', false, null)
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
      specials: ['breath equal to HP', 'detects hidden or invisible 50%'],
      breath: { damage: 'equal to HP', save: 'vs breath for half' },
      detectHidden: 0.5,
      count: 2,
      xp: 315,
      xpFormula: formula(90, 5, 22, [
        { kind: 'EA', reason: 'printed', xp: 75 },
        { kind: 'SA', reason: 'printed', xp: 40 }
      ]),
      tt: 'C',
      art: art('warg', 'assets/creatures/mon_warg.png', true, 'Hell hound')
    },
    beetle: {
      key: 'beetle',
      name: 'Fire beetle',
      source: 'MM1 Beetle, Giant (fire) p.8',
      hd: '1+2',
      ac: 4,
      mv: '12"',
      attacks: [{ n: 1, form: 'bite', damage: '2d4' }],
      specials: ['glowing glands'],
      xp: 32,
      xpFormula: formula(20, 2, 6, []),
      tt: 'Nil',
      art: art('beetle', 'assets/creatures/mon_beetle.png', false, null)
    },
    rubyGuardian: {
      key: 'rubyGuardian',
      name: 'Ruby Guardian IX',
      source: 'RULING 1.11',
      tier: 9,
      hd: 18,
      hp: 108,
      ac: -2,
      mv: '6"',
      attacks: [{ n: 1, form: 'slam', damage: '4d10' }],
      specials: [
        'construct immunities: sleep, charm, hold, poison, fear',
        'never checks morale',
        'cone 3d6',
        'hit only by +2 weapons'
      ],
      cone: { damage: '3d6', range: '3"', rangeFrom: 'tier IV', save: 'vs breath for half', everySec: 4, minTiles: 2 },
      hitOnlyBy: 2,
      xp: 10800,
      xpFormula: formula(3000, 25, 108, [
        { kind: 'SA', reason: 'printed', xp: 1550 },
        { kind: 'SA', reason: 'printed', xp: 1550 },
        { kind: 'EA', reason: 'printed', xp: 2000 }
      ]),
      ruby: { gp: 2250, band: '~2250' },
      art: art('construct', 'assets/creatures/mon_construct.png', true, 'Ruby Guardian IX')
    }
  };

  /**
   * The four steps name the breath, the claws, the takeoff, and the
   * lair. They do not name a covering creature. The thrown Holy Hammer
   * is Macar's weapon from L8, not a unit in this room. The locked
   * giants and hounds still stand in the lair. The ruby stays on the guardian.
   */
  var DRAGON = {
    key: 'redDragon',
    separateFromGuardian: true,
    bossFlagOnIndividual: false,
    coveringUnit: null,
    breathsPerDay: 3,
    cadence: 'never two consecutive 3 s windows',
    takeoff: {
      belowHpFraction: 0.5,
      sec: 3,
      meleeCanReach: false,
      stillCanHit: ['missiles', 'thrown Holy Hammer']
    },
    subdual: false,
    fightsToTheDeath: true,
    inLair: true,
    priority: [
      'Opening move: it breathes if Macar is in the cone, or if 2 or more kin are. It has 3 breaths a day and never breathes in two consecutive 3 s windows.',
      'Adjacent: claw, claw, bite on its highest-damage target.',
      'At 50% HP it takes off, so melee cannot reach it for 3 s. Missiles and the thrown Holy Hammer still can. Then it breathes if any breath is left.',
      'It fights to the death in its lair. Subdual is not offered.'
    ]
  };

  var MINIONS = {
    decision: 'D7-B',
    locked: true,
    keys: ['firegiant', 'hellHound'],
    counts: { firegiant: 2, hellHound: 2 },
    inBossRoom: true,
    tie: 'MM1 fire giant entry ties hell hounds to fire giants'
  };

  /**
   * Breath is a save vs breath, not a poison save. H1 and the spider
   * size table stay available, and the floor of 2 still binds any poison save.
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
    { slot: 1, key: 'hellHound', count: '1d3' },
    { slot: 2, key: 'hellHound', count: '1d3' },
    { slot: 3, key: 'hellHound', count: '1d3' },
    { slot: 4, key: 'beetle', count: '1d4' },
    { slot: 5, key: 'beetle', count: '1d4' },
    { slot: 6, key: 'firegiant', count: '1' }
  ];

  var ANVIL = {
    id: 'holy_anvil',
    name: 'Holy Anvil of Truth',
    displayName: 'Holy Anvil of Truth',
    kind: 'quest',
    behindBoss: true,
    forgeTier: 'top',
    recipe: '3.4g',
    ritualSite: 'L10',
    usableByMacar: 'Y'
  };

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
      H: {
        letter: 'H',
        onCorpse: false,
        gpAbout: 64000,
        cp: { chance: 25, min: 3, max: 18, times: 1000 },
        sp: { chance: 50, min: 1, max: 30, times: 1000 },
        ep: { chance: 50, min: 1, max: 10, times: 1000 },
        gp: { chance: 55, min: 1, max: 60, times: 1000 },
        pp: { chance: 25, min: 500, max: 4000, times: 1 },
        gems: { chance: 50, min: 1, max: 100 },
        jewelry: { chance: 50, min: 10, max: 40 },
        magic: {
          chance: 15,
          items: 4,
          potion: 1,
          scroll: 1,
          scrollFilter: 'protection',
          kind: 'anyps'
        }
      }
    },
    bossChest: {
      letter: 'H',
      decision: 'D2',
      onCorpse: false,
      contents: 'lair-H',
      quest: 'holy_anvil',
      includesRuby: false,
      extraHoard: false
    },
    guardianRuby: { with: 'rubyGuardian', gp: 2250, band: '~2250' },
    caches: {
      count: 16,
      level: 8,
      floor: 9,
      table: 'DMG Appendix A Table V',
      rowNote: 'L9 uses the level-8 row',
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
    components: {
      dragon_scale: { perKill: 3, from: ['redDragon'], on: 'corpse' }
    },
    drops: [
      { id: 'dragon_scale', from: 'redDragon', count: 3 }
    ],
    usable: [
      { name: 'Coins, gems, jewelry', usableByMacar: 'Y' },
      { name: 'Rolled magic and lair H magic', usableByMacar: 'Y', filter: '2.2' },
      { name: 'Holy Anvil', usableByMacar: 'Y' }
    ],
    questItems: [ANVIL]
  };

  /** Printed cells only. speakingXp and fire-giant bandXp stay off this sum. */
  var XP = {
    redDragon: 3906,
    firegiant: 2960,
    hellHound: 315,
    beetle: 32,
    rubyGuardian: 10800
  };

  /** Refreshed 1.12 column is the stat-block sum. */
  var FORECAST_BOSS_GUARDIAN_XP = 14706;

  var OPEN = [
    {
      id: 'speak-cast',
      note: 'The age table prints 4,756 if an old red speaks and casts. MM1 percentages are not printed here. The wired xp is 3,906. The 4,756 is a side field. (open)'
    },
    {
      id: 'breath-shape',
      note: 'The breath cone is 9" long and 3" wide at the end, marked verify. (open)'
    },
    {
      id: 'giant-hd',
      note: 'Fire giants are 11+2-5 HD. The campaign table uses 11+3. The cell does not pick the bonus. (open)'
    },
    {
      id: 'giant-xp',
      note: 'Each fire giant prints about 2,960, and that is the wired xp. At 11+3 the average is 52.5 hp, and one special ability for fire immunity is 2,840. The 2,840 is a side field. (open)'
    },
    {
      id: 'giant-tt',
      note: 'The L9 fire-giant sentence prints no treasure letter. No corpse letter is stored. (open)'
    },
    {
      id: 'hound-lair',
      note: 'Hell hounds print C on their MM line. The L9 treasure sentence prints one lair chest, letter H. C is not placed as a second chest. (open)'
    },
    {
      id: 'cone-range',
      note: 'Guardian IX\'s cone damage is 3d6. The 3" range belongs to the tier IV cone and is not reprinted on the IX line. (open)'
    },
    {
      id: 'guardian-addends',
      note: 'Guardian IX prints 1,550 twice and 2,000 once and does not name them. (open)'
    },
    {
      id: 'ruby-band',
      note: 'Guardian IX\'s ruby is stored as 2250 gp on the guardian. Section 1.11 prints ~2,250 and no range. The boss chest does not hold it. (open)'
    },
    {
      id: 'hoard-gp',
      note: 'Lair H is printed as about 64,000 gp. The cell does not show the roll that makes that average. (open)'
    },
    {
      id: 'anvil-roll',
      note: 'The Holy Anvil lies in the dragon hoard, and the chest also rolls lair H. Whether the anvil replaces one of H\'s magic items is not printed. (open)'
    },
    {
      id: 'map-rooms',
      note: 'Level 9 is a new floor. Fire giants are the reused creature. The ruby court, the lair, and the stair have no printed coordinates. (open)'
    },
    {
      id: 'cache-places',
      note: 'Sixteen caches use the level-8 row, as printed for L9. The RULES print the row and no coordinates. (open)'
    },
    {
      id: 'wander-place',
      note: 'Section 5 is the wander table. The placed minions are the printed 2 fire giants and 2 hell hounds. Wander packs are not also placed as rooms. (open)'
    },
    {
      id: 'forecast-pack',
      note: 'The 1.12 cell prints 21,260 and names no pack. The old red 3,906 plus Guardian IX 10,800 is 14,706. Two giants at 2,960 plus two hounds at 315 is 6,550. Those together are 21,256, which is 4 under 21,260. The cell does not name that pack, so it is not added. (open)'
    },
    {
      id: 'guardian-art',
      note: 'No ruby-guardian sheet exists. Guardian IX uses the construct sheet. (open)'
    },
    {
      id: 'dragon-art',
      note: 'No red-dragon sheet exists. The deep-dragon sheet stands in until red dragon art passes. (open)'
    }
  ];

  function printedXp(mon) {
    return formula(mon.xpFormula.base, mon.xpFormula.perHp, mon.xpFormula.hp, mon.xpFormula.terms).xp;
  }

  function bossGuardianXp() {
    return XP.rubyGuardian + XP.redDragon;
  }

  function ingredientIds() {
    return ['dragon_scale'];
  }

  function itemIds() {
    return ['holy_anvil'];
  }

  var api = {
    MONSTERS: MONSTERS,
    DRAGON: DRAGON,
    MINIONS: MINIONS,
    POISON: POISON,
    WANDER: WANDER,
    ANVIL: ANVIL,
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

  root.L9 = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

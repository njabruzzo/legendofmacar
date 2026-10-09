/**
 * Level 9 encounters, monster stat blocks, and loot.
 * Data only. Not loaded by index.html.
 *
 * Numbers are the L9 rows in MACAR_10_LEVEL_RULES (1.9, 1.11, section 5)
 * and the DMG XP bands in section 1.0. The map is maps/l9.json.
 * xp is the ruled cell. speakingXp is the caster result of the 30% roll.
 * It is not wired into boss-plus-guardian XP.
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
        lengthTiles: 18,
        widthAtEndTiles: 6,
        widthAtMouthTiles: 1,
        damage: 'current HP',
        codeDamage: 'current game HP',
        applyDmgG: false,
        save: 'vs breath for half',
        perDay: 3,
        hitsAllies: true,
        avoidsAllies: false,
        fireGiants: 'immune',
        hellHounds: { damage: 'full', save: 'vs breath for half' },
        fireResistance: 'halves again after the save',
        cadence: 'never two consecutive 3 s windows'
      },
      speakCast: {
        roll: 'once per L9 load',
        chance: 0.30,
        speak: 0.75,
        castIfSpeaking: 0.40,
        saveField: 'l9SpeakCast',
        casterXp: 4756,
        otherwiseXp: 3906,
        spells: [
          { name: 'Magic Missile', n: 2, level: 1, windupSec: 0.1 },
          { name: 'Mirror Image', level: 2, windupSec: 0.2 },
          { name: 'Web', level: 2, windupSec: 0.2 },
          { name: 'Slow', level: 3, windupSec: 0.3 },
          { name: 'Hold Person', level: 3, windupSec: 0.3, dwarfSaveBonus: true, freeActionImmune: true }
        ],
        cadence: '1 cast per 2 s, never in the same 1 s as a breath'
      },
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
      specials: ['immune to fire, even red dragon breath'],
      immune: ['fire', 'red dragon breath'],
      count: 2,
      xp: 2840,
      xpFormula: formula(1300, 16, 52.5, [
        { kind: 'SA', reason: 'immune to fire', xp: 700 }
      ]),
      tt: 'E',
      ttLair: true,
      onCorpse: false,
      corpseBand: 'high',
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
      specials: ['breath 1 hp per HD', 'detects hidden or invisible 50%'],
      breath: { damage: '1 per HD', amount: 5, save: 'vs breath for half', takesDragonBreath: true, dragonBreathSave: 'vs breath for half' },
      detectHidden: 0.5,
      count: 2,
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
      cone: { damage: '3d6', range: '3"', lengthTiles: 6, rangeFrom: '7.6', save: 'vs breath for half', everySec: 4, minTiles: 2 },
      hitOnlyBy: 2,
      xp: 10800,
      xpFormula: formula(3000, 25, 108, [
        { kind: 'SA', reason: '+2 weapon to hit', xp: 1550 },
        { kind: 'SA', reason: 'AC -2', xp: 1550 },
        { kind: 'EA', reason: 'cone', xp: 2000 }
      ]),
      ruby: { gp: 2250 },
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
    guardianRuby: { with: 'rubyGuardian', gp: 2250 },
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

  /** Ruled cells. speakingXp stays off the boss-plus-guardian sum. */
  var XP = {
    redDragon: 3906,
    firegiant: 2840,
    hellHound: 315,
    beetle: 32,
    rubyGuardian: 10800
  };

  /** Refreshed 1.12 column is the stat-block sum. */
  var FORECAST_BOSS_GUARDIAN_XP = 14706;

  var OPEN = [
    {
      id: 'dragon-letters',
      note: 'MM1 red treasure is H, S, T. H is the chest. S and T are not rolled. Nick has not decided that flag. (open)'
    },
    {
      id: 'difficulty-dip',
      note: 'The boss-plus-guardian column stays 14,706. Nick has not decided whether boss-room minions count in that column. (open)'
    },
    {
      id: 'speak-cast',
      note: 'The 30% talk-and-cast roll is stored as ruled and is unconfirmed. Nick has not picked it. Until he does, the dragon stays a non-caster at 3,906 XP. (open)'
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

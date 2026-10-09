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
      source: 'MM1 Orc p.76; fight as gnolls (verify per-band counts)',
      hd: 2,
      ac: 5,
      mv: '9"',
      attacks: [{ n: 1, form: 'weapon', damage: '1d10' }],
      specials: [],
      countVerify: true,
      xp: 38,
      xpFormula: formula(20, 2, 9, []),
      tt: 'L',
      art: ORC_STAND
    },
    orcGuard: {
      key: 'orcGuard',
      name: 'Orc chief guard',
      source: 'MM1 Orc p.76 lair guards (verify)',
      hd: 2,
      ac: 4,
      mv: '9"',
      attacks: [{ n: 1, form: 'weapon', damage: '2d4' }],
      specials: [],
      countVerify: true,
      xp: 38,
      xpFormula: formula(20, 2, 9, []),
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
      tt: 'B',
      ttVerify: true,
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
      attacks: [{ n: 1, form: 'bite', damage: '2d4' }],
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
      attacks: [{ n: 1, form: 'battle axe', damage: '1d8+3' }],
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
      ruby: { gp: 1000, band: '~1000' },
      art: art('construct', 'assets/creatures/mon_construct.png', true, 'Ruby Guardian IV')
    }
  };

  var SHAMAN = {
    level: 7,
    wis: 14,
    decision: 'D15-A',
    slots: { 1: 3, 2: 3, 3: 2, 4: 1 },
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
    spellEverySec: 2
  };

  var CHIEF = {
    key: 'orcChief',
    separateFromGuardian: true,
    bossFlagOnIndividual: false,
    checkEverySec: 1,
    specialty: 'house bands, whole round, when adjacent',
    helplessHitsLand: true,
    moraleBelowHpFraction: 0.25,
    fallback: 'ogre-cave',
    corpse: 'U',
    lairChest: 'C, O, Qx10, S',
    priority: [
      'On the first round he roars, and the shaman casts Bless on all orcs within 5 inches: +1 to hit and morale for 6 rounds.',
      'While the shaman lives, the shaman tries Hold Person on Macar, then Silence 15\' r. on a kin. At most one spell per 2 s.',
      'When adjacent to Macar he uses the Specialty Attack. If Macar is held, every hit lands.',
      'Below 25% HP he rolls morale. On a failure, he and his guards fall back to the boulder cave.'
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
        cp: { chance: 20, dice: '1d10', times: 1000 },
        sp: { chance: 30, dice: '1d6', times: 1000 },
        ep: null,
        gp: null,
        pp: null,
        gems: { chance: 25, dice: '1d6' },
        jewelry: { chance: 20, dice: '1d3' },
        magic: { chance: 10, count: 2, kind: 'any' }
      },
      S: { chance: 40, count: '1-8', kind: 'potions' },
      O: null,
      Q: null
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
    orcLeader: 38,
    orcGuard: 38,
    warg: 126,
    wolf: 68,
    orcShaman: 656,
    orcChief: 255,
    ogress: 185,
    rubyGuardian: 1030
  };

  /** 1.12 prints 2,990 for the annotated pack. Section 6 says stat blocks win. */
  var FORECAST_BOSS_GUARDIAN_XP = 2990;
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
      note: 'Orc XP 15 is 10+1 per hp at 5 hp. A 1d8 averages 4.5, and the RULES print about 15. (open)'
    },
    {
      id: 'guard-count',
      note: 'The chief hall places 6 guards, the count in the 1.12 annotation. Section 1.4 says to verify the MM lair-guard count. (open)'
    },
    {
      id: 'assistant-count',
      note: 'One leader stands in the Hall of Names. Section 1.4 says to verify per-band assistant counts, so no assistant number is placed. (open)'
    },
    {
      id: 'leader-gnoll',
      note: 'Leaders stay at the written HD 2, AC 5, and 1d10. The RULES mark "fight as gnolls" as verify. (open)'
    },
    {
      id: 'guard-gnoll',
      note: 'Guards stay at the written HD 2, AC 4, and 2d4. The RULES mark the lair-guard line as verify. (open)'
    },
    {
      id: 'chief-to-hit',
      note: 'The chief\'s STR 18/50 is printed as damage 1d8+3. The 1e to-hit bonus is not printed. (open)'
    },
    {
      id: 'chief-morale',
      note: 'Below 25% HP he rolls morale. MM1 prints no morale score, so the target number is unset. (open)'
    },
    {
      id: 'shaman-wis-bonus',
      note: 'The shaman row prints 3/3/2/1 slots plus a WIS 14 bonus, and leaves the 3rd and 4th slots empty. The bonus spell count is not printed. (open)'
    },
    {
      id: 'shaman-list-versus-slots',
      note: 'The house list names Bless, Cause Fear, Darkness, Cause Light Wounds twice, Hold Person, and Silence. That is more 1st-level preparations than the 3 base 1st-level slots. Both are stored as written. (open)'
    },
    {
      id: 'shaman-segments',
      note: 'Bless, Hold Person, and Silence have the effects printed in 1.4. Casting segments for the orc shaman are not printed. (open)'
    },
    {
      id: 'wolf-count',
      note: 'Two wolves stand at (12, 74). Section 1.4 does not reprint number appearing. The wander slot is 1d4. (open)'
    },
    {
      id: 'warg-transplant',
      note: 'Worg packs removed from L2 keep their Chapter II points on this ruin map: (40.1, 70.2), (122.1, 30.1), and (120.1, 62.1), plus the Chapter III warg at (88, 102). The 1.12 annotation says 4 worgs. (open)'
    },
    {
      id: 'cut-companions',
      note: 'Drow, spiders, the bugbear, and the beetle that shared live orc and warg packs are not L4 residents. The orc and warg counts from those packs stay. (open)'
    },
    {
      id: 'ogre-cave-room',
      note: 'The ogre cave is the south annex at (32, 50), where live orcs already stand. The RULES do not name the room. (open)'
    },
    {
      id: 'ogress-path',
      note: 'She flees along a scripted path to (28, 76) and despawns. OgreCave names an exit tile and prints no path. (open)'
    },
    {
      id: 'tooth-face',
      note: 'Electrum tooth 4 is on the Hall of Names north wall at (46, 14). The RULES print the tooth and no coordinate. (open)'
    },
    {
      id: 'ruby-band',
      note: 'Guardian IV\'s ruby is stored as 1000 gp. Section 1.11 prints ~1,000 and no range. (open)'
    },
    {
      id: 'chief-art',
      note: 'The chief, shaman, leaders, and guards use the orc sheet. No separate sheets are bound. (open)'
    },
    {
      id: 'ogress-art',
      note: 'No ogre sheet exists. The ogress binds no file. (open)'
    },
    {
      id: 'cache-places',
      note: 'Thirteen caches are the Chapter III points. Three more, at (26, 28), (46, 20), and (48, 42), bring the count to 16. (open)'
    },
    {
      id: 'lair-c-copper',
      note: 'The chief\'s type C row uses the live lair-C copper die, 1d10×1000. Printed DMG type C is often 1d12×1000. (open)'
    },
    {
      id: 'lair-o-q',
      note: 'The chest names lair O and Q×10. The live LAIR table has no O or Q row, so those dice are not stored. (open)'
    },
    {
      id: 'warg-corpse',
      note: 'Worgs print treasure type B, marked verify. Type B is a lair letter, so it stays off the corpse. The corpse band is not printed. (open)'
    },
    {
      id: 'ogre-percent',
      note: 'MM1 mentions ogres as possible orc lair allies and says to verify the percentage. Nick\'s lock uses the ogress as a prisoner, so that percentage is not rolled. (open)'
    },
    {
      id: 'forecast-pack',
      note: 'The 1.12 cell prints 2,990 and annotates 1 chief, 1 shaman, 6 guards, 4 worgs, 8 orcs, and Guardian IV. Those XP figures sum to 2,793, not 2,990. Placement follows the live packs, not that annotation. (open)'
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

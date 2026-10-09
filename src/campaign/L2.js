/**
 * Level 2 encounters, monster stat blocks, and loot.
 * Data only. Not loaded by index.html.
 *
 * Numbers are the L2 rows in MACAR_10_LEVEL_RULES (1.2, 1.11, section 5)
 * and the DMG XP bands in section 1.0. The map is maps/l2.json.
 * A field marked open is a 1e choice the RULES do not print.
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

  var GOBLIN_ART = art('goblin', 'assets/creatures/mon_goblin.png', false, null);
  var GOBLIN_STAND = art('goblin', 'assets/creatures/mon_goblin.png', true, 'no separate sheet');

  /**
   * Printed XP from rules 1.2 and guardian II from 1.11.
   * hp on the formula is the figure that makes the printed total.
   */
  var MONSTERS = {
    goblin: {
      key: 'goblin',
      name: 'Goblin',
      source: 'MM1 Goblin p.47',
      hd: '1-1',
      ac: 6,
      mv: '6"',
      attacks: [{ n: 1, form: 'weapon', damage: '1d6' }],
      specials: ['-1 to hit in daylight; none underground', 'infravision 6"'],
      xp: 13,
      xpFormula: formula(10, 1, 3, []),
      tt: 'K',
      lairTt: 'C',
      alignment: 'lawful evil',
      size: 'S',
      intelligence: 'average (low)',
      dialogue: 'insults-only',
      parley: false,
      bargain: false,
      art: GOBLIN_ART
    },
    goblinLeader: {
      key: 'goblinLeader',
      name: 'Goblin leader',
      source: 'MM1 Goblin p.47; one leader and 4 assistants per 40 goblins; they fight as hobgoblins',
      hd: '1+1',
      ac: 6,
      mv: '9"',
      attacks: [{ n: 1, form: 'weapon', damage: '1d8' }],
      specials: [],
      xp: 31,
      xpFormula: formula(20, 2, 5.5, []),
      tt: 'K',
      art: GOBLIN_STAND
    },
    goblinBoss: {
      key: 'goblinBoss',
      name: 'Goblin chief bodyguard',
      source: 'MM1 Goblin p.47 lair guards',
      hd: 2,
      ac: 5,
      mv: '9"',
      attacks: [{ n: 1, form: 'weapon', damage: '2d4' }],
      specials: [],
      xp: 38,
      xpFormula: formula(20, 2, 9, []),
      tt: 'K',
      art: GOBLIN_STAND
    },
    rat: {
      key: 'rat',
      name: 'Giant Rat',
      source: 'MM1 Rat, Giant p.81',
      hd: '1/2',
      ac: 7,
      mv: '12"//6"',
      attacks: [{ n: 1, form: 'bite', damage: '1d3' }],
      specials: ['disease 5% per bite'],
      xp: 8,
      xpFormula: formula(5, 1, 3, []),
      tt: 'C',
      art: art('rat', 'assets/creatures/mon_rat.png', false, null)
    },
    goblinShaman: {
      key: 'goblinShaman',
      name: 'Low-level goblin shaman',
      source: 'DMG humanoid shamans; HOUSE cap; rules 1.2',
      hd: 2,
      hp: 9,
      ac: 6,
      mv: '6"',
      attacks: [{ n: 1, form: 'staff', damage: '1d6' }],
      specials: ['spells'],
      casterLevel: 2,
      wis: 12,
      kingHall: false,
      places: ['camp', 'warrens'],
      xp: 83,
      xpFormula: formula(20, 2, 9, [{ kind: 'EA', reason: 'spell use', xp: 45 }]),
      tt: 'K',
      art: art('goblin', 'assets/creatures/mon_goblin.png', true, 'goblin shaman')
    },
    goblinKing: {
      key: 'goblinKing',
      name: 'Goblin King',
      source: 'MM1 goblin chief, scaled up: RULING',
      hd: '4+1',
      hp: 26,
      ac: 3,
      armor: 'chain and shield',
      mv: '9"',
      str: 18,
      attacks: [{ n: 1, form: 'weapon', damage: '1d8+2' }],
      specials: ['commands', 'morale break', 'Specialty Attack, house bands, whole round'],
      xp: 260,
      xpFormula: formula(90, 5, 26, [{ kind: 'SA', reason: 'specialty and command', xp: 40 }]),
      tt: 'U',
      lair: 'C',
      bossFlagOnIndividual: false,
      art: art('goblin_king', 'assets/creatures/mon_goblin_king.png', false, null)
    },
    rubyGuardian: {
      key: 'rubyGuardian',
      name: 'Ruby Guardian II',
      source: 'RULING 1.11',
      tier: 2,
      hd: 4,
      hp: 24,
      ac: 5,
      mv: '6"',
      attacks: [{ n: 1, form: 'slam', damage: '1d10' }],
      specials: ['construct immunities: sleep, charm, hold, poison, fear', 'never checks morale', 'no shard; shards start at tier III'],
      hitOnlyBy: 0,
      xp: 181,
      xpFormula: formula(60, 4, 24, [{ kind: 'SA', reason: 'construct', xp: 25 }]),
      ruby: { id: 'ruby_guardian_2', gp: 500, band: '400-600' },
      art: art('thinone', 'assets/creatures/mon_thinone.png', true, 'Ruby Guardian II')
    }
  };

  var SHAMAN = {
    level: 2,
    wis: 12,
    bonusSpells: 0,
    slots: { 1: 2 },
    kingHall: false,
    places: ['camp', 'warrens'],
    memorized: [
      {
        name: 'Command',
        level: 1,
        segments: 1,
        windupSec: 0.1,
        effect: 'Halt! The target loses 1 round.',
        save: 'vs spell if INT 13+ or 6+ HD/levels',
        stunSec: 1,
        neverTargets: 'a kin who already holds a Command'
      },
      {
        name: 'Cause Light Wounds',
        level: 1,
        segments: 5,
        windupSec: 0.5,
        range: 'touch',
        damage: '1d8'
      }
    ],
    swap: [
      {
        name: 'Darkness',
        level: 1,
        segments: 4,
        windupSec: 0.4,
        area: '2" globe',
        attackPenalty: -4,
        note: 'attacks into or out of the globe are at -4'
      },
      {
        name: 'Cause Fear',
        level: 1,
        segments: 4,
        windupSec: 0.4,
        range: 'touch',
        save: 'vs spell',
        flee: '1 round per level'
      }
    ],
    cadence: [
      'When Macar is within 6 tiles and visible, cast Command first: 0.1 s wind-up, then Macar is stunned 1 s. Command never targets a kin who already holds a Command.',
      'Close to melee only after Command, then cast Cause Light Wounds on the next touch: 0.5 s wind-up, then the touch.',
      'With both spells spent, fight with the staff and flee at 50% HP.',
      'At most one spell per 2 s.'
    ],
    spellEverySec: 2,
    fleeAtHpFraction: 0.5
  };

  var KING = {
    key: 'goblinKing',
    separateFromGuardian: true,
    bossFlagOnIndividual: false,
    checkEverySec: 1,
    priority: [
      'Below 30% HP, roll goblin morale. On a failure, flee to the throne door and call 1d4 goblins from the room\'s existing spawns. Never invent spawns.',
      'If a goblin shaman is alive and Macar is within 6 tiles, shout so the shaman casts Command first.',
      'If Macar is in reach, use the Specialty Attack: house bands, a real 1e matrix check, the whole round.',
      'If a ghost or kin is closer than Macar, attack it only when Macar is more than 4 tiles away.',
      'Otherwise advance on Macar.'
    ],
    inventsSpawns: false,
    corpse: 'U',
    lairChest: 'C'
  };

  var DIALOGUE = {
    mode: 'insults-only',
    parley: false,
    bargain: false,
    mercyBeg: false,
    falseSurrender: false,
    retired: ['maybeGoblinMercy']
  };

  var WANDER = [
    { slot: 1, key: 'goblin', count: '1d6' },
    { slot: 2, key: 'goblin', count: '1d6' },
    { slot: 3, key: 'rat', count: '2d4' },
    { slot: 4, key: 'rat', count: '2d4' },
    { slot: 5, key: 'goblinLeader', count: '1+1d4 goblins' },
    { slot: 6, key: 'goblinShaman', count: '1+1d3 goblins' }
  ];

  /**
   * House individual letters as rollIndividual prints them, and lair C
   * as the live LAIR.C row. Corpses never take lair A-I (rules 1.0).
   */
  var LOOT = {
    individual: {
      J: { coins: { cp: '3d8' } },
      K: { coins: { sp: '3d6' } },
      M: { coins: { gp: '2d4' } },
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
      level: 2,
      table: 'DMG Appendix A Table V',
      row: {
        cp: { chance: 20, dice: '1d8', times: 1000 },
        sp: { chance: 25, dice: '1d8', times: 100 },
        ep: { chance: 25, dice: '1d4', times: 100 },
        gp: { chance: 40, dice: '1d8', times: 100 },
        pp: null,
        gems: { chance: 10, dice: '1d6' },
        jewelry: { chance: 5, dice: '1' },
        magic: { chance: 8, count: 1, kind: 'any' }
      }
    },
    corpseBand: {
      goblin: 'mid: J+K, 35% M, 20% house Q',
      rat: 'vermin: J, 40% K, 10% house Q',
      king: 'U',
      guardian: 'ruby only'
    },
    magicFilter: '2.2 usable by a dwarf fighter',
    dig: [
      { id: 'barley', firstLevel: 2 },
      { id: 'starmetal', firstLevel: 2 },
      { id: 'resin', firstLevel: 1 },
      { id: 'powder', firstLevel: 1 },
      { id: 'ironstone', firstLevel: 1 },
      { id: 'timber', firstLevel: 1 },
      { id: 'bone', firstLevel: 1 }
    ],
    drops: [
      { id: 'ruby_guardian_2', from: 'rubyGuardian', count: 1 }
    ],
    questItems: [
      { id: 'grond_tooth_electrum_2', usableByMacar: 'Y' },
      { id: 'grond_tooth_bronze', usableByMacar: 'Y', countsForRitual: false, countsForTeethCarried: false, cursed: false }
    ]
  };

  var XP = {
    goblin: 13,
    goblinLeader: 31,
    goblinBoss: 38,
    rat: 8,
    goblinShaman: 83,
    goblinKing: 260,
    rubyGuardian: 181
  };

  /**
   * Details the RULES leave open. Each note is the 1e-faithful pick used here.
   */
  var OPEN = [
    {
      id: 'ruby-room',
      note: 'The ruby door, Guardian II, the lever, and the exit elevator sit in the former Spider Lord den at (10, 31). The RULES do not name that room. (open)'
    },
    {
      id: 'replacement-dens',
      note: 'Kobold, orc, and warg dens are restocked with the same count of goblins or giant rats. The RULES remove those monsters and do not print a replacement. (open)'
    },
    {
      id: 'warren-pin',
      note: 'The live warren is seed-built. This map pins the shaman den at (52, 50) and the stair at (66, 62). The shaman has 2 goblins, the mean of 1d3. (open)'
    },
    {
      id: 'bodyguard-count',
      note: 'The king hall places 6 bodyguards. MM1 prints 5-8 and the RULES say to verify the count. (open)'
    },
    {
      id: 'leader-cell',
      note: 'One leader and 4 assistants stand in the hall. The printed ratio is one cell per 40 goblins, and this floor does not field the MM 40-400 band. (open)'
    },
    {
      id: 'goblin-hp',
      note: 'Goblin XP 13 is 10+1 per hp at 3 hp. A 1d8-1 roll averages 3.5. (open)'
    },
    {
      id: 'rat-hp',
      note: 'Giant rat XP 8 is 5+1 per hp at 3 hp. A 1d4 averages 2.5, and the RULES print about 8. (open)'
    },
    {
      id: 'rat-disease',
      note: 'The bite is 5% disease, as printed. The save and the disease effect are not printed. (open)'
    },
    {
      id: 'bodyguard-gnoll',
      note: 'Bodyguards stay at the written HD 2, AC 5, and 2d4. The RULES mark "fight as gnolls" as verify. (open)'
    },
    {
      id: 'king-to-hit',
      note: 'The king\'s STR 18 is printed as damage 1d8+2. The 1e +1 to hit for STR 18 is not printed. (open)'
    },
    {
      id: 'king-morale',
      note: 'Below 30% HP he rolls goblin morale. MM1 prints no morale score, so the target number is unset. (open)'
    },
    {
      id: 'throne-door',
      note: 'On a failed morale roll he flees to the hall entrance at (62.4, 64.2). The RULES say "throne door" and give no coordinate. (open)'
    },
    {
      id: 'shaman-sets',
      note: 'The camp shaman memorizes Command and Cause Light Wounds. The warren shaman memorizes Darkness and Cause Fear. The ruling says to pick per spawn. (open)'
    },
    {
      id: 'darkness-duration',
      note: 'Darkness uses the PHB Light duration, 6 turns + 1 per level, so 8 turns at level 2. The RULES print the globe and the -4 and not the duration. (open)'
    },
    {
      id: 'command-range',
      note: 'The cadence fires inside 6 tiles, as printed. The PHB range of Command is 1 inch and is not reprinted. (open)'
    },
    {
      id: 'cause-light-wounds-save',
      note: 'Cause Light Wounds is a touch for 1d8 with no separate save, which is the PHB touch. The RULES do not say whether a save applies. (open)'
    },
    {
      id: 'guardian-art',
      note: 'Ruby Guardian II uses the Thin One sheet as a stand-in. No guardian sheet exists, and none is bound. (open)'
    },
    {
      id: 'insults',
      note: 'Goblins insult and never parley or bargain. The RULES do not print the insult lines, so none are stored. (open)'
    },
    {
      id: 'lair-c-copper',
      note: 'The king\'s chest uses the live LAIR.C row: 20% of 1d10×1000 cp. Printed DMG type C is often 1d12×1000. (open)'
    },
    {
      id: 'bronze-door-secret',
      note: 'The treasure secret by the bronze door is kept from Chapter II. The RULES name the hourglass secret and do not mention this one. (open)'
    },
    {
      id: 'rat-corpse-letter',
      note: 'The L2 rat row prints treasure type C. A rat corpse uses the 1.0 vermin band, and lair C stays off the corpse, matching the L1 rat note. (open)'
    }
  ];

  function printedXp(mon) {
    return formula(mon.xpFormula.base, mon.xpFormula.perHp, mon.xpFormula.hp, mon.xpFormula.terms).xp;
  }

  function bossGuardianXp() {
    return XP.rubyGuardian + XP.goblinKing;
  }

  function ingredientIds() {
    var ids = LOOT.dig.map(function (row) { return row.id; });
    LOOT.drops.forEach(function (row) { ids.push(row.id); });
    return ids;
  }

  function itemIds() {
    return LOOT.questItems.map(function (row) { return row.id; });
  }

  var api = {
    MONSTERS: MONSTERS,
    SHAMAN: SHAMAN,
    KING: KING,
    DIALOGUE: DIALOGUE,
    WANDER: WANDER,
    LOOT: LOOT,
    XP: XP,
    OPEN: OPEN,
    printedXp: printedXp,
    bossGuardianXp: bossGuardianXp,
    ingredientIds: ingredientIds,
    itemIds: itemIds,
    wired: false
  };

  root.L2 = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

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
      hpRoll: '1d8-1',
      hpMin: 1,
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
      hpRoll: '1d8+1',
      hpMin: 1,
      hitAsHd: 1.25,
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
      hpRoll: '2d8',
      hpMin: 1,
      hitAsHd: 2,
      attacks: [{ n: 1, form: 'weapon', damage: '2d4' }],
      specials: ['hits as 2 HD on the monster matrix'],
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
      hpRoll: '1d4',
      hpMin: 1,
      attacks: [{ n: 1, form: 'bite', damage: '1d3' }],
      disease: {
        perBite: 5,
        save: 'poison',
        name: 'rat fever',
        toHit: -1,
        blocksRegen: true,
        blocksRest: true,
        campSec: 360,
        cure: 'Cure Disease',
        lethal: false
      },
      specials: ['disease 5% per bite; save vs poison negates; rat fever never kills'],
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
      hitAsHd: 2,
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
      hitAsHd: 4.25,
      hp: 26,
      ac: 3,
      armor: 'chain and shield',
      mv: '9"',
      str: 18,
      toHit: 1,
      attacks: [{ n: 1, form: 'weapon', damage: '1d8+2', toHit: 1 }],
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
      ruby: { id: 'ruby_guardian_2', gp: 500 },
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
        rangeTiles: 2,
        durationSec: 1,
        save: 'vs spell only if the target is level 6 or higher',
        saveLevel: 6,
        stunSec: 1,
        neverTargets: 'a kin who already holds a Command'
      },
      {
        name: 'Cause Light Wounds',
        level: 1,
        segments: 5,
        windupSec: 0.5,
        range: 'touch',
        damage: '1d8',
        save: false,
        touchHit: true
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
        durationSec: 80,
        note: 'attacks into or out of the globe are at -4'
      },
      {
        name: 'Cause Fear',
        level: 1,
        segments: 4,
        windupSec: 0.4,
        range: 'touch',
        save: 'vs spell',
        touchHit: true,
        durationSec: 2,
        fleeSec: 2,
        flee: '2 s'
      }
    ],
    cadence: [
      'When Macar is within 6 tiles the shaman closes in. Command reaches 2 tiles: 0.1 s wind-up, then a 1 s stun. Macar saves vs spell only at level 6 or higher. Command never targets a kin who already holds a Command.',
      'After Command, the next touch is Cause Light Wounds: 0.5 s wind-up, a matrix touch hit, no save, then 1d8.',
      'With both spells spent, fight with the staff and flee at 50% HP.',
      'At most one spell per 2 s.'
    ],
    commandRangeTiles: 2,
    closeTiles: 6,
    spellEverySec: 2,
    fleeAtHpFraction: 0.5
  };

  var KING = {
    key: 'goblinKing',
    separateFromGuardian: true,
    bossFlagOnIndividual: false,
    checkEverySec: 1,
    morale: { belowHpFraction: 0.3, roll: 'd100', holdOnOrUnder: 55, once: true },
    call: '1d4',
    throneDoor: { x: 78, y: 58, wall: 'n' },
    cornerRoom: { x: 76, y: 50, w: 6, h: 8 },
    corner: { x: 78, y: 53 },
    throne: { x: 74, y: 64.4 },
    priority: [
      'Below 30% HP, roll morale once. He holds on d100 <= 55. On a failure, call 1d4 goblins from the room\'s existing spawns, once, then flee through the throne door. In the room behind it he is cornered: no more morale checks, and he fights to the death.',
      'If a goblin shaman is alive and Macar is within 6 tiles, shout so the shaman closes and casts Command.',
      'If Macar is in reach, use the Specialty Attack: house bands, a real 1e matrix check, the whole round.',
      'Otherwise advance on Macar. If a ghost or kin is closer than Macar, attack it only when Macar is more than 4 tiles away.'
    ],
    inventsSpawns: false,
    corpse: 'U',
    lairChest: 'C'
  };

  var LINES = [
    'Stumpy! Your beard drags in our dung!',
    'Dig, dig, little mole. Dig a grave!',
    'Rock ate your brothers. You next!',
    'Short legs! Can\'t run! Can\'t hide!',
    'Shiny beard-man. We take your shiny.',
    'You smell like old cheese and sad.',
    'Big hammer, small brain!',
    'Come closer, stubby. Knives hungry.',
    'Dwarf gold is goblin gold now!',
    'Beard so long, you trip! Ha!',
    'Go home, stub. Oh wait. No home!',
    'Your ghosts are see-through. Like you!',
    'Boo! Ha! Dead dwarfs can\'t scare us!',
    'Ghost friends? Real friends all died.',
    'Hey ghosty! You forgot your body!',
    'Tiny king of a dead hole!',
    'We pick our teeth with dwarf bones!',
    'Who you calling? Your mama mountain?',
    'Hit like a pebble! Pebble-dwarf!',
    'Stone-head! Rust-beard! Lump!'
  ];

  var DIALOGUE = {
    mode: 'insults-only',
    parley: false,
    bargain: false,
    mercyBeg: false,
    falseSurrender: false,
    retired: ['maybeGoblinMercy'],
    barkEverySec: 6,
    lines: LINES,
    ghostFrom: 12,
    ghostTo: 15,
    shaman: {
      command: ['Maglubiyet says: GROVEL!', 'Kneel, stubby! A god commands!'],
      causeLightWounds: ['Maglubiyet bites your beard!', 'Bleed, little rock-man!']
    },
    king: {
      taunt: 'Bow to the king, stubby!',
      hurt: 'You scratched the KING?!',
      flee: 'Guards! GUARDS! King is busy!',
      death: 'Not... my... crown...'
    }
  };

  /* Back wall of the king hall. The hall floor starts at y=58, so (74, 59)
     is the first interior row, against that wall, and Macar can stand on it. */
  /* cursed is the 2026-10-08 coin curse: coins convert once, and each
     extra tooth speeds the strain. It is not a bind. */
  var TOOTH = {
    id: 'grond_tooth_electrum_2',
    tile: { x: 74, y: 59 },
    wall: 'n',
    prop: { x: 74, y: 59.2 },
    cursed: true,
    curse: 'coin',
    bind: false
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
      cp: { chance: 20, dice: '1d12', times: 1000 },
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
      { id: 'grond_tooth_electrum_2', usableByMacar: 'Y', cursed: true, curse: 'coin', bind: false },
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
      id: 'shaman-sets',
      note: 'The camp shaman memorizes Command and Cause Light Wounds. The warren shaman memorizes Darkness and Cause Fear. The ruling says to pick per spawn. (open)'
    },
    {
      id: 'guardian-art',
      note: 'Ruby Guardian II uses the Thin One sheet as a stand-in. No guardian sheet exists, and none is bound. (open)'
    },
    {
      id: 'lair-c-copper',
      note: 'Resolved by §7.1. Lair C copper is 1d12×1000 at 20%.'
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
    TOOTH: TOOTH,
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

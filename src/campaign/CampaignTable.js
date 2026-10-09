/**
 * 10-level campaign table. Data only.
 * Not loaded by index.html. Nothing here runs during play.
 *
 * Numbers are Sage's MACAR_10_LEVEL_RULES (signed 2026-10-08).
 * Where that file marks a figure "(verify)", the figure is stored as written.
 */
(function (root) {
  'use strict';

  var LOCKED = {
    signed: '2026-10-08',
    poisonMode: 'h1',
    decisions: {
      D1: 'A', D2: 'A', D3: 'B', D4: 'A', D5: 'B',
      D6: 'B', D7: 'B', D8: 'B', D9: 'A', D10: 'A',
      D11: 'A', D12: 'B', D13: 'A', D14: 'B', D15: 'A',
      D16: 'A', D17: 'A', D18: 'A'
    },
    /* Sage locked every unnumbered recommendation as written. */
    recommendationsLocked: true
  };

  var FIGHTER_XP = {
    F4: 8001, F5: 18001, F6: 35001, F7: 70001,
    F8: 125001, F9: 250001, F10: 500001
  };

  /* Rules 1.16. Subtracted from the fighter poison base. Not an amount added on top. */
  var POISON_SAVE = { large: 2, huge: 1, giant: 0, phase: -2, queen: -2 };

  function gxp(base, perHp, hp, terms) {
    var xp = base + perHp * hp;
    for (var i = 0; i < terms.length; i++) xp += terms[i];
    return { base: base, perHp: perHp, hp: hp, terms: terms, xp: xp };
  }

  /* Section 1.11. xp is the printed DMG total; formula parts must sum to it. */
  var GUARDIANS = [
    { tier: 1, level: 1, count: 6, key: 'thinOne', name: 'Ruby Guardian I', hd: 2, hp: 12, ac: 6, mv: 6, attack: '1d8', special: 'none', hitOnlyBy: 0, rubyGp: '200-999', bossFlagOnIndividual: false, formula: gxp(20, 2, 12, [8]) },
    { tier: 2, level: 2, count: 1, key: 'rubyGuardian', name: 'Ruby Guardian II', hd: 4, hp: 24, ac: 5, mv: 6, attack: '1d10', special: 'none', hitOnlyBy: 0, rubyGp: 500, formula: gxp(60, 4, 24, [25]) },
    { tier: 3, level: 3, count: 1, key: 'rubyGuardian', name: 'Ruby Guardian III', hd: 6, hp: 36, ac: 4, mv: 6, attack: '2d6', special: 'ruby shard 1d6, range 6"', hitOnlyBy: 0, rubyGp: 750, formula: gxp(150, 6, 36, [75]) },
    { tier: 4, level: 4, count: 1, key: 'rubyGuardian', name: 'Ruby Guardian IV', hd: 8, hp: 48, ac: 3, mv: 6, attack: '2d8', special: 'shard cone 3", 2d6, save vs breath for half', hitOnlyBy: 0, rubyGp: 1000, formula: gxp(375, 10, 48, [175]) },
    { tier: 5, level: 5, count: 1, key: 'rubyGuardian', name: 'Ruby Guardian V', hd: 10, hp: 60, ac: 2, mv: 6, attack: '2d10', special: 'shard cone as IV', hitOnlyBy: 1, rubyGp: 1250, formula: gxp(900, 14, 60, [900]) },
    { tier: 6, level: 6, count: 1, key: 'rubyGuardian', name: 'Ruby Guardian VI', hd: 12, hp: 72, ac: 1, mv: 6, attack: '3d8', special: 'shard cone; immune to fire', hitOnlyBy: 1, rubyGp: 1500, formula: gxp(1300, 16, 72, [1400]) },
    { tier: 7, level: 7, count: 1, key: 'rubyGuardian', name: 'Ruby Guardian VII', hd: 14, hp: 84, ac: 0, mv: 6, attack: '3d10', special: 'shard cone as IV', hitOnlyBy: 2, rubyGp: 1750, formula: gxp(1800, 18, 84, [1900]) },
    { tier: 8, level: 8, count: 1, key: 'rubyGuardian', name: 'Ruby Guardian VIII', hd: 16, hp: 96, ac: -1, mv: 6, attack: '4d8', special: 'cone 3d6', hitOnlyBy: 2, rubyGp: 2000, formula: gxp(2400, 20, 96, [2500, 1600]) },
    { tier: 9, level: 9, count: 1, key: 'rubyGuardian', name: 'Ruby Guardian IX', hd: 18, hp: 108, ac: -2, mv: 6, attack: '4d10', special: 'cone 3d6', hitOnlyBy: 2, rubyGp: 2250, formula: gxp(3000, 25, 108, [3100, 2000]) },
    { tier: 10, level: 10, count: 1, key: 'rubyGuardian', name: 'Ruby Guardian X', hd: 20, hp: 120, ac: -3, mv: 6, attack: '2 x 3d10', special: 'cone 4d6', hitOnlyBy: 3, rubyGp: 2500, formula: gxp(4000, 30, 120, [4200, 5000]) }
  ];

  function tooth(n) {
    return {
      kind: 'electrum-tooth',
      n: n,
      id: n === 1 ? 'grond_tooth_electrum' : ('grond_tooth_electrum_' + n),
      name: 'Electrum Tooth ' + n,
      cursed: true,
      countsForRitual: true,
      countsForTeethCarried: true,
      usableByMacar: 'Y'
    };
  }

  function mon(key, name, hd, ac, xp, extra) {
    var row = { key: key, name: name, hd: hd, ac: ac, xp: xp };
    if (extra) {
      var k;
      for (k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) row[k] = extra[k];
    }
    return row;
  }

  function door() {
    return { present: true, touchWakes: 'rubyGuardian' };
  }

  function lever() {
    /* D3-B. The lever needs the guardian. It does not need the boss. */
    return { enablesWhen: 'rubyGuardianDead', needsBoss: false, decision: 'D3-B' };
  }

  function elevator(artKey, standInFor, note) {
    var row = {
      auto: true,
      showsTransitionCard: true,
      transitionCard: artKey,
      standIn: true,
      standInFor: standInFor || null,
      newArt: false
    };
    if (note) row.note = note;
    return row;
  }

  var LEVELS = [
    {
      level: 1,
      id: 'L1',
      name: 'The Rubble and the Ruby',
      theme: 'Cave-in, buried kin, ruby door, Bone Crown chapel',
      builtFrom: { chapter: 1, anchor: 'makeChapter n===1' },
      reuse: { kept: ['all'], cutOrMoved: [], cutAsChapter: false },
      /* The six Thin Ones are the ruby guardian. None wears a boss flag. L1 has no boss. The lever opens the stairs. */
      boss: null,
      stairsOpenOn: 'lever',
      residents: [
        mon('rat', 'Cave Rat', '1/2', 7, 8, { tt: 'C' }),
        mon('centipede', 'Giant Centipede', '1/4', 9, 32, { poisonSave: 4, xpNote: 'verify' }),
        mon('spider', 'Cave Spider', '1+1', 8, 76, { poisonSave: POISON_SAVE.large, tt: 'J-N' }),
        mon('spiderHuge', 'Huge Spider', '2+2', 6, 138, { poisonSave: POISON_SAVE.huge }),
        mon('beetle', 'Fire Beetle', '1+2', 4, 32),
        mon('beetleBoring', 'Boring Beetle', 5, 3, 202, { printedPoison: false }),
        mon('kobold', 'Kobold', '1/2', 7, 7),
        mon('koboldChief', 'Kobold Chief', '1+1', 5, 30),
        mon('goblin', 'Goblin', '1-1', 6, 13),
        mon('fangedSkeleton', 'Fanged Skeleton', 2, 7, 46, { count: 8 })
      ],
      minions: [],
      wander: [
        { slot: 1, key: 'rat', count: '1d6' },
        { slot: 2, key: 'centipede', count: '1d3' },
        { slot: 3, key: 'spider', count: '1d2' },
        { slot: 4, key: 'beetle', count: '1d3' },
        { slot: 5, key: 'kobold', count: '1d4' },
        { slot: 6, key: 'spiderHuge', count: '1' }
      ],
      rubyDoor: door(),
      lever: lever(),
      elevator: elevator('assets/ui/intro_ch1.jpg', 'Chapter I intro card'),
      quest: tooth(1),
      pacing: { cumulativeXp: 13000, macar: 'F4', avgHp1e: 30, avgHpGame: 120, toHitAc0: 18, attacksPerRound: 1, hitOnlyBy: 0, ghostLevel: 'G3', ghostXp: 4500, keyItems: ['Shadow Cleaver +2', 'Ring of Dexterity +1', 'Bone Crown'] },
      setPieces: ['kin-boulders', 'bone-crown', 'chapel-tooth', 'dwarf-mouth']
    },
    {
      level: 2,
      id: 'L2',
      name: 'Noz and the Goblin King',
      theme: 'Goblins, rats, a low-level shaman, insults only',
      builtFrom: { chapter: 2, anchor: 'makeChapter n===2 and the goblin warrens' },
      reuse: {
        kept: ['Noz', 'camp', 'warrens', 'King hall', 'hourglass secret', '16 caches'],
        cutOrMoved: ['spiders and Spider Lord to L3', 'kobolds cut', 'orcs and wargs to L4', '7th-level shaman to L4', 'goblin beg cut'],
        cutAsChapter: false
      },
      boss: mon('goblinKing', 'Goblin King', '4+1', 3, 260, { hp: 26, lair: 'C' }),
      residents: [
        mon('goblin', 'Goblin', '1-1', 6, 13, { dialogue: 'insults-only' }),
        mon('goblinLeader', 'Goblin leader', '1+1', 6, 31),
        mon('goblinBoss', 'Goblin chief bodyguard', 2, 5, 38),
        mon('rat', 'Giant Rat', '1/2', 7, 8),
        mon('goblinShaman', 'Low-level goblin shaman', 2, 6, 83, { hp: 9, casterLevel: 2, places: ['camp', 'warrens'], kingHall: false, spells: ['Command', 'Cause Light Wounds'] })
      ],
      minions: [
        mon('goblinLeader', 'Goblin leader and assistants', '1+1', 6, 31, { source: 'MM1 goblin p.47' }),
        mon('goblinBoss', 'Chief bodyguards', 2, 5, 38, { source: 'MM1 goblin p.47' })
      ],
      wander: [
        { slot: 1, key: 'goblin', count: '1d6' },
        { slot: 2, key: 'goblin', count: '1d6' },
        { slot: 3, key: 'rat', count: '2d4' },
        { slot: 4, key: 'rat', count: '2d4' },
        { slot: 5, key: 'goblinLeader', count: '1+1d4 goblins' },
        { slot: 6, key: 'goblinShaman', count: '1+1d3 goblins' }
      ],
      rubyDoor: door(),
      lever: lever(),
      elevator: elevator('assets/ui/intro_ch2.jpg', 'Chapter II intro card'),
      quest: tooth(2),
      optionalQuest: { id: 'grond_tooth_bronze', name: 'Bronze Tooth', kind: 'bronze-tooth', cursed: false, countsForRitual: false, countsForTeethCarried: false, level: 2, where: 'hourglass secret', usableByMacar: 'Y' },
      pacing: { cumulativeXp: 19000, macar: 'F5', avgHp1e: 37.5, avgHpGame: 150, toHitAc0: 16, attacksPerRound: 1, hitOnlyBy: 0, ghostLevel: 'G3', ghostXp: 7500, keyItems: ['Star-Peen Hammer +1', 'Potion of Healing recipe'] },
      setPieces: ['noz', 'bronze-hourglass']
    },
    {
      level: 3,
      id: 'L3',
      name: 'The Webbed Deep and the Spider Queen',
      theme: 'Spider packs from Chapter II, a trapped pixie, the Queen',
      builtFrom: { chapter: null, movedFrom: 2, note: 'Spider packs, web corpses, and spider art leave L2' },
      reuse: { kept: ['spider packs', 'web corpses'], cutOrMoved: ['Spider Lord retired'], cutAsChapter: false },
      boss: mon('spiderQueen', 'Spider Queen', '8+8', 3, 1828, { hp: 44, decision: 'D4-A', lair: 'C', poisonSave: POISON_SAVE.queen, artStandIn: 'spiderGiant' }),
      residents: [
        mon('spider', 'Large spider', '1+1', 8, 76, { poisonSave: POISON_SAVE.large }),
        mon('spiderHuge', 'Huge spider', '2+2', 6, 138, { poisonSave: POISON_SAVE.huge }),
        mon('spiderGiant', 'Giant spider', '4+4', 4, 315, { poisonSave: POISON_SAVE.giant }),
        mon('phasespider', 'Phase spider', '5+5', 7, 515, { poisonSave: POISON_SAVE.phase }),
        mon('pixie', 'Pixie', '1/2', 5, 0, { fights: false, gives: 'pixie-dust' })
      ],
      minions: [
        { key: 'spiderHuge', count: '1d4', source: 'MM1 huge spider number appearing' },
        { key: 'spiderGiant', count: '1', source: 'MM1 giant spider number appearing' }
      ],
      wander: [
        { slot: 1, key: 'spider', count: '1d4' },
        { slot: 2, key: 'spider', count: '1d4' },
        { slot: 3, key: 'spiderHuge', count: '1d2' },
        { slot: 4, key: 'spiderHuge', count: '1d2' },
        { slot: 5, key: 'spiderGiant', count: '1' },
        { slot: 6, key: 'phasespider', count: '1' }
      ],
      rubyDoor: door(),
      lever: lever(),
      elevator: elevator('assets/creatures/mon_spider_giant.png', 'Giant spider art stands in for the Queen'),
      quest: tooth(3),
      pacing: { cumulativeXp: 32000, macar: 'F5', avgHp1e: 37.5, avgHpGame: 150, toHitAc0: 16, attacksPerRound: 1, hitOnlyBy: 0, ghostLevel: 'G4', ghostXp: 14000, keyItems: ['Pixie Dust', 'Antitoxin', "Alchemist's Fire"] },
      setPieces: ['trapped-pixie']
    },
    {
      level: 4,
      id: 'L4',
      name: 'Orc Hold and the Ogre Cave',
      theme: 'Orcs, an orc shaman, wolves and worgs, the ogress cave',
      builtFrom: { chapter: 3, anchor: 'makeChapter n===3 orc packs and halls', cutAsChapter: true },
      reuse: {
        kept: ['orc packs', 'orc halls'],
        cutOrMoved: ['Chapter III story cut', 'Ruin Guard art becomes a ruby-guardian stand-in'],
        cutAsChapter: true,
        fromChapter: 3
      },
      boss: mon('orcChief', 'Orc chief', 5, 3, 255, { hp: 33, lair: 'C, O, Qx10, S' }),
      residents: [
        mon('orc', 'Orc', 1, 6, 15),
        mon('orcLeader', 'Orc leader', 2, 5, 38),
        mon('orcGuard', 'Orc chief guard', 2, 4, 38),
        mon('warg', 'Worg', '3+3', 6, 126, { artStandIn: 'warg' }),
        mon('wolf', 'Wolf', '2+2', 7, 68, { artStandIn: 'warg' }),
        mon('orcShaman', 'Orc shaman', 7, 5, 656, { hp: 32, casterLevel: 7, decision: 'D15-A', spells: ['Bless', 'Cause Fear', 'Darkness', 'Cause Light Wounds', 'Hold Person', 'Silence 15\' r.'] })
      ],
      minions: [
        mon('orcLeader', 'Orc leaders and assistants', 2, 5, 38, { source: 'MM1 orc p.76' }),
        mon('orcGuard', 'Chief guards', 2, 4, 38, { source: 'MM1 orc p.76' })
      ],
      wander: [
        { slot: 1, key: 'orc', count: '1d6' },
        { slot: 2, key: 'orc', count: '1d6' },
        { slot: 3, key: 'warg', count: '1d3' },
        { slot: 4, key: 'wolf', count: '1d4' },
        { slot: 5, key: 'orcLeader', count: '1+1d4 orcs' },
        { slot: 6, key: 'warg', count: '1+1d4 orcs' }
      ],
      rubyDoor: door(),
      lever: lever(),
      elevator: elevator('assets/creatures/mon_orc.png', 'Orc art stands in for the orc hold'),
      quest: tooth(4),
      pacing: { cumulativeXp: 51000, macar: 'F6', avgHp1e: 45, avgHpGame: 180, toHitAc0: 16, attacksPerRound: 1, hitOnlyBy: 0, ghostLevel: 'G5', ghostXp: 23500, keyItems: ['Golden eggs x3', 'Shield +1 recipe'] },
      setPieces: ['ogre-cave']
    },
    {
      level: 5,
      id: 'L5',
      name: 'The Drow Deep',
      theme: 'Drow warriors, mages, and priestesses; sleep poison and spells',
      builtFrom: { chapter: null, note: 'New floor. Drow keys already exist in the bestiary.' },
      reuse: { kept: [], cutOrMoved: [], cutAsChapter: false },
      boss: mon('drowMatron', 'Drow Matron', 7, 1, 956, { hp: 32, casterLevel: 7, mr: 64 }),
      residents: [
        mon('drow', 'Drow warrior', 2, 3, 140, { hp: 11, mr: 52, poison: 'sleep' }),
        mon('drowMage', 'Drow mage', 5, 4, 350, { hp: 14, mr: 60 }),
        mon('drowPriestess', 'Drow priestess', 5, 3, 380, { hp: 24, mr: 60 })
      ],
      minions: [
        { key: 'drow', role: 'fighter', source: 'Fiend Folio drow bands' },
        { key: 'drowMage', role: 'mage', source: 'Fiend Folio drow bands' },
        { key: 'drowPriestess', role: 'priestess', source: 'Fiend Folio drow bands' }
      ],
      wander: [
        { slot: 1, key: 'drow', count: '1d3' },
        { slot: 2, key: 'drow', count: '1d3' },
        { slot: 3, key: 'drow', count: '1d3' },
        { slot: 4, key: 'drowMage', count: '1+1 warrior' },
        { slot: 5, key: 'drowPriestess', count: '1+2 warriors' },
        { slot: 6, key: 'drow', count: '1d4' }
      ],
      rubyDoor: door(),
      lever: lever(),
      elevator: elevator('assets/creatures/mon_drow.png', 'Drow art stands in for the drow deep'),
      quest: tooth(5),
      pacing: { cumulativeXp: 78000, macar: 'F7', avgHp1e: 52.5, avgHpGame: 210, toHitAc0: 14, attacksPerRound: 1.5, hitOnlyBy: 1, ghostLevel: 'G6', ghostXp: 37000, keyItems: ['Drow +2 sword', 'Rune Hammer +2 recipe', 'Adamantine Armor recipe'] },
      setPieces: ['drow-plus-two-sword']
    },
    {
      level: 6,
      id: 'L6',
      name: 'The Burning Halls',
      theme: 'Fire beetles, hell hounds, salamanders, fire elementals',
      builtFrom: { chapter: 5, note: 'Reuses Chapter V fire content. New floor.' },
      reuse: { kept: ['fire giants and hounds as later minion stock'], cutOrMoved: [], cutAsChapter: false },
      boss: mon('emberLord', 'Ember Lord', 16, 2, 5090, { hp: 72, hitOnlyBy: 2, artStandIn: 'magmaelem' }),
      residents: [
        mon('beetle', 'Fire beetle', '1+2', 4, 32),
        mon('hellHound', 'Hell hound', 5, 4, 315, { hdRange: '4-7' }),
        mon('salamander', 'Salamander', '7+7', 5, 1105, { hitOnlyBy: 1 }),
        mon('fireElemental8', 'Fire elemental', 8, 2, 910, { hitOnlyBy: 2, artStandIn: 'magmaelem' }),
        mon('fireElemental12', 'Fire elemental', 12, 2, 2864, { hitOnlyBy: 2, artStandIn: 'magmaelem' })
      ],
      minions: [
        { key: 'salamander', option: 'A', locked: true, source: 'MM1 salamander, Plane of Fire' },
        { key: 'hellHound', option: 'A', locked: true, source: 'MM1 hell hound' }
      ],
      wander: [
        { slot: 1, key: 'beetle', count: '1d4' },
        { slot: 2, key: 'beetle', count: '1d4' },
        { slot: 3, key: 'hellHound', count: '1d2' },
        { slot: 4, key: 'hellHound', count: '1d2' },
        { slot: 5, key: 'salamander', count: '1' },
        { slot: 6, key: 'fireElemental8', count: '1' }
      ],
      rubyDoor: door(),
      lever: lever(),
      elevator: elevator('assets/creatures/mon_magmaelem.png', 'Magma elemental art stands in for fire elementals'),
      quest: tooth(6),
      pacing: { cumulativeXp: 123000, macar: 'F7', avgHp1e: 52.5, avgHpGame: 210, toHitAc0: 14, attacksPerRound: 1.5, hitOnlyBy: 2, guardianHitOnlyBy: 1, ghostLevel: 'G6', ghostXp: 59500, keyItems: ['Potion of Fire Resistance recipe'] },
      setPieces: ['water-pool']
    },
    {
      level: 7,
      id: 'L7',
      name: 'The Deep Stone',
      theme: 'Earth elementals, xorns, umber hulks',
      builtFrom: { chapter: null, note: 'New floor. Earth-elemental keys already exist.' },
      reuse: { kept: [], cutOrMoved: [], cutAsChapter: false },
      boss: mon('stoneLord', 'Stone Lord', 16, 2, 5090, { hp: 72, hitOnlyBy: 2, artStandIn: 'earthelem' }),
      residents: [
        mon('earthElemental8', 'Earth elemental', 8, 2, 1020, { hitOnlyBy: 2, artStandIn: 'earthelem' }),
        mon('earthElemental12', 'Earth elemental', 12, 2, 3080, { hitOnlyBy: 2, artStandIn: 'earthelem' }),
        mon('xorn', 'Xorn', '7+7', -2, 1280),
        mon('umberhulk', 'Umber hulk', '8+8', 2, 1828)
      ],
      minions: [
        { key: 'xorn', option: 'A', locked: true, source: 'MM1 xorn, Plane of Earth' },
        { key: 'umberhulk', option: 'A', locked: true, source: 'MM1 umber hulk' }
      ],
      wander: [
        { slot: 1, key: 'xorn', count: '1' },
        { slot: 2, key: 'xorn', count: '1' },
        { slot: 3, key: 'umberhulk', count: '1' },
        { slot: 4, key: 'umberhulk', count: '1' },
        { slot: 5, key: 'earthElemental8', count: '1' },
        { slot: 6, key: 'earthElemental8', count: '1' }
      ],
      rubyDoor: door(),
      lever: lever(),
      elevator: elevator('assets/creatures/mon_earthelem.png', 'Earth elemental art'),
      quest: tooth(7),
      pacing: { cumulativeXp: 185000, macar: 'F8', avgHp1e: 60, avgHpGame: 240, toHitAc0: 14, attacksPerRound: 1.5, hitOnlyBy: 2, ghostLevel: 'G7', ghostXp: 90500, keyItems: ['Bolts +1', 'Greater Healing'] },
      setPieces: ['heartstone-vein']
    },
    {
      level: 8,
      id: 'L8',
      name: 'The Eye Tyrant and the Holy Hammer',
      theme: 'Beholder, charmed thralls, the Holy Hammer in the hoard',
      builtFrom: { chapter: 4, anchor: 'makeChapter n===4 lair', cutAsChapter: true },
      reuse: {
        kept: ['lair map', 'death-tyrant art'],
        cutOrMoved: ['Elder Brain cut'],
        cutAsChapter: true,
        fromChapter: 4
      },
      boss: mon('beholder', 'Beholder', '11-12', 0, 7910, { hp: 60, lair: 'I' }),
      residents: [
        mon('duergar', 'Charmed duergar', '1+2', 4, 86, { charmed: true, count: 4, artStandIn: 'duergar' }),
        mon('umberhulk', 'Charmed umber hulk', '8+8', 2, 1828, { charmed: true, count: 1 })
      ],
      minions: [
        { key: 'duergar', count: 4, charmed: true, decision: 'D6-B', source: 'MM1 beholder charm eyes' },
        { key: 'umberhulk', count: 1, charmed: true, decision: 'D6-B', source: 'MM1 beholder charm monster' }
      ],
      wander: [
        { slot: 1, key: 'duergar', count: '1d4', charmed: true },
        { slot: 2, key: 'duergar', count: '1d4', charmed: true },
        { slot: 3, key: 'duergar', count: '1d4', charmed: true },
        { slot: 4, key: 'orc', count: '1d6', charmed: true },
        { slot: 5, key: 'orc', count: '1d6', charmed: true },
        { slot: 6, key: 'umberhulk', count: '1' }
      ],
      rubyDoor: door(),
      lever: lever(),
      elevator: elevator('assets/creatures/mon_beholder.png', 'Beholder art; death-tyrant sheet is the lair reuse'),
      quest: { kind: 'weapon', id: 'holy_hammer', name: 'Holy Hammer', plus: 3, basis: 'Hammer +3, Dwarven Thrower', decision: 'D18-A', behindBoss: true, usableByMacar: 'Y' },
      pacing: { cumulativeXp: 270000, macar: 'F9', avgHp1e: 67.5, avgHpGame: 270, toHitAc0: 12, attacksPerRound: 1.5, hitOnlyBy: 2, ghostLevel: 'G8', ghostXp: 133000, keyItems: ['Holy Hammer +3'] },
      setPieces: ['beholder-hoard']
    },
    {
      level: 9,
      id: 'L9',
      name: 'The Red Dragon and the Holy Anvil',
      theme: 'Old red dragon, fire giants, hell hounds, the Holy Anvil',
      builtFrom: { chapter: null, note: 'New floor. Fire giants are reused from Chapter V.' },
      reuse: { kept: ['firegiant'], cutOrMoved: [], cutAsChapter: false },
      boss: mon('redDragon', 'Red Dragon', 11, -1, 3906, { hp: 66, age: 'old', decision: 'D8-B', lair: 'H', speakingXp: 4756, artStandIn: 'deepdragon' }),
      residents: [
        mon('firegiant', 'Fire giant', '11+3', 3, 2960, { count: 2 }),
        mon('hellHound', 'Hell hound', 5, 4, 315, { count: 2 })
      ],
      minions: [
        { key: 'firegiant', count: 2, decision: 'D7-B', source: 'MM1 fire giant' },
        { key: 'hellHound', count: 2, decision: 'D7-B', source: 'MM1 fire giant hell hounds' }
      ],
      wander: [
        { slot: 1, key: 'hellHound', count: '1d3' },
        { slot: 2, key: 'hellHound', count: '1d3' },
        { slot: 3, key: 'hellHound', count: '1d3' },
        { slot: 4, key: 'beetle', count: '1d4' },
        { slot: 5, key: 'beetle', count: '1d4' },
        { slot: 6, key: 'firegiant', count: '1' }
      ],
      rubyDoor: door(),
      lever: lever(),
      elevator: elevator(
        'assets/creatures/mon_deepdragon.png',
        'Deep dragon art stands in for the red dragon',
        'Keep this deep-dragon stand-in on the L9 card until red dragon art passes.'
      ),
      quest: { kind: 'quest', id: 'holy_anvil', name: 'Holy Anvil of Truth', displayName: 'Holy Anvil of Truth', behindBoss: true, forgeTier: 'top', usableByMacar: 'Y' },
      pacing: { cumulativeXp: 410000, macar: 'F9', avgHp1e: 67.5, avgHpGame: 270, toHitAc0: 12, attacksPerRound: 1.5, hitOnlyBy: 2, ghostLevel: 'G8', ghostXp: 203000, keyItems: ['Holy Anvil of Truth'] },
      setPieces: ['dragon-hoard']
    },
    {
      level: 10,
      id: 'L10',
      name: 'The Undying King and the Ritual',
      theme: 'Evil dwarf temple, undead, the King, then the tooth ritual',
      builtFrom: { chapter: 5, anchor: 'makeChapter n===5, FOE.king, the win', cutAsChapter: false },
      reuse: {
        kept: ['Chapter V finale', 'Undying King', 'win'],
        cutOrMoved: ['Chapter III and IV undead become rank and file', 'Ruin Guard art stands in for Ruby Guardian X'],
        cutAsChapter: false,
        alsoFromChapters: [3, 4]
      },
      boss: mon('king', 'Undying King', 12, 0, 5552, { hp: 72, hitOnlyBy: 1, decision: 'D14-B' }),
      residents: [
        mon('skeleton', 'Skeleton', 1, 7, 15),
        mon('zombie', 'Zombie', 2, 8, 38),
        mon('ghoul', 'Ghoul', 2, 6, 83),
        mon('wight', 'Wight', '4+3', 5, 310),
        mon('wraith', 'Wraith', '5+3', 4, 503),
        mon('spectre', 'Spectre', '7+3', 2, 1170),
        mon('duergar', 'Duergar', '1+2', 4, 86, { artStandIn: 'duergar' }),
        mon('duergarPriest', 'Duergar priest', 5, 3, 400)
      ],
      minions: [
        { key: 'wight', role: 'guard', choice: 'C', locked: true, source: 'MM1 wight servants' },
        { key: 'wraith', role: 'guard', choice: 'C', locked: true, source: 'MM1 wraith servants' },
        { key: 'duergar', role: 'population', choice: 'B', locked: true, source: 'MM2 duergar' },
        { key: 'skeleton', role: 'animated', choice: 'A', locked: true, source: 'Animate Dead' }
      ],
      wander: [
        { slot: 1, key: 'skeleton', count: '2d4' },
        { slot: 2, key: 'zombie', count: '1d6' },
        { slot: 3, key: 'ghoul', count: '1d4' },
        { slot: 4, key: 'duergar', count: '1d4' },
        { slot: 5, key: 'wight', count: '1' },
        { slot: 6, key: 'wraith', count: '1' }
      ],
      rubyDoor: door(),
      lever: lever(),
      elevator: elevator('assets/ui/intro_ch5.jpg', 'Chapter V intro card stands in for the temple'),
      quest: {
        kind: 'ritual',
        id: 'temple-ritual',
        name: 'Temple ritual',
        item: false,
        behindBoss: true,
        usableByMacar: 'Y',
        xpOnce: 10000,
        steps: [
          'Seven braziers burn. While any burns, the King regenerates and cannot be slain.',
          'Macar sets the Holy Anvil on the throne dais.',
          'Each Holy Hammer smash spends one round and puts out one brazier.',
          'Each smash lowers teethCarried by one.',
          'The seventh smash ends the curse and makes the King mortal.',
          'Killing the mortal King wins.'
        ]
      },
      pacing: { cumulativeXp: 500000, macar: 'F10', avgHp1e: 70.5, avgHpGame: 282, toHitAc0: 12, attacksPerRound: 1.5, ritualXp: 10000, hitOnlyBy: 3, ghostLevel: 'G8', ghostXp: 248000, keyItems: ['ritual complete'] },
      setPieces: ['ritual-braziers', 'throne-dais']
    }
  ];

  /**
   * Boss-plus-guardian XP is the stat-block total, not the 1.12 forecast.
   * L1 has no boss. The six Thin Ones are the guardian, so their XP is that line only.
   */
  function statBossGuardianXp(lvl) {
    var g = lvl.rubyGuardian;
    var xp = g.formula.xp * g.count;
    if (lvl.boss && typeof lvl.boss.xp === 'number') xp += lvl.boss.xp;
    return xp;
  }

  LEVELS.forEach(function (lvl, i) {
    lvl.rubyGuardian = GUARDIANS[i];
    if (lvl.stairsOpenOn == null) lvl.stairsOpenOn = 'bossKill';
    lvl.pacing.bossPlusGuardianXp = statBossGuardianXp(lvl);
    lvl.pacing.bossPlusGuardianSource = 'stat-block';
    lvl.wired = false;
  });

  var CUT_CHAPTERS = [
    {
      chapter: 3,
      name: 'The Ruin',
      cutAsChapter: true,
      reusedOn: [4, 10],
      note: 'Orc packs and halls become L4. Undead and the Ruin Guard art are reused on L10. The Ruin Guard construct is a ruby-guardian stand-in.'
    },
    {
      chapter: 4,
      name: 'The Dead City',
      cutAsChapter: true,
      reusedOn: [8, 10],
      note: 'The lair and death-tyrant art become L8. The Elder Brain is cut. Undead closet stock joins L10.'
    }
  ];

  function level(n) {
    return LEVELS[n - 1] || null;
  }

  function formulaXp(formula) {
    return gxp(formula.base, formula.perHp, formula.hp, formula.terms).xp;
  }

  /**
   * Running clear through L10, then the ritual. Nothing raises the sum to the F10 line.
   */
  function pathXp() {
    var total = 0;
    var prev = 0;
    for (var i = 0; i < LEVELS.length; i++) {
      var at = LEVELS[i].pacing.cumulativeXp;
      total += at - prev;
      prev = at;
    }
    total += LEVELS[9].quest.xpOnce;
    return total;
  }

  var api = {
    LOCKED: LOCKED,
    FIGHTER_XP: FIGHTER_XP,
    poisonSave: POISON_SAVE,
    GUARDIANS: GUARDIANS,
    LEVELS: LEVELS,
    CUT_CHAPTERS: CUT_CHAPTERS,
    level: level,
    formulaXp: formulaXp,
    statBossGuardianXp: statBossGuardianXp,
    pathXp: pathXp,
    wired: false
  };

  root.CampaignTable = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

/**
 * Exit and stair rules as data. Not loaded by index.html.
 * Does not change useChapterDescent, floorTravelReady, or throwCh1LiftLever.
 * Open PR #319 owns the live chapter stair.
 *
 * Nick, on the campaign floors: the ruby guardian and the floor boss are
 * separate encounters. Beating the guardian unlocks the lever and the
 * elevator. A living boss never blocks the elevator. Killing the boss
 * opens the stairs. L1 is the one exception: it has no boss, the six
 * Thin Ones are only the ruby guardian, and the lever opens the stairs.
 * On L8-L10 the quest item sits behind the boss, so that requirement
 * is a quest gate, not an elevator gate. No creature wears a boss flag.
 */
(function (root) {
  'use strict';

  var NICK_STAIR = {
    id: 'nick-boss-kill',
    opensOn: 'bossKill',
    wired: false,
    ownsLiveChapters: false
  };

  var CAMPAIGN_GATE = {
    id: 'nick-separate-exits',
    decision: 'D3-B',
    ruling: 'Nick: guardian and boss are separate encounters',
    leverRequires: ['rubyGuardianDead'],
    elevatorRequires: ['leverPulled'],
    elevator: 'guardian',
    stairs: 'bossKill',
    stairsException: { level: 1, stairsOpenOn: 'lever' },
    elevatorAuto: true,
    showsTransitionCard: true,
    bossRequiredForLever: false,
    livingBossBlocksElevator: false,
    questBehindBossFrom: 8
  };

  var LIVE = {
    1: {
      chapter: 1,
      exit: 'Elevator ride after the six Thin Ones die and the lever is thrown.',
      flag: 'elevReady',
      bossRequired: false,
      allFoesRequired: false,
      rubyGuardianRequired: true,
      stair: { kind: 'elevator', x: 36.5, y: 21.5 },
      replace: false
    },
    2: {
      chapter: 2,
      exit: 'South stair after the floor ruby is activated. The Goblin King is optional.',
      flag: 'floorRubyActivated',
      bossRequired: false,
      allFoesRequired: false,
      rubyGuardianRequired: false,
      stair: { kind: 'stairs', x: 40.1, y: 51.6 },
      replace: false
    },
    3: {
      chapter: 3,
      exit: 'South stair after every foe is dead and the ruby is activated.',
      flag: 'done',
      bossRequired: false,
      allFoesRequired: true,
      rubyGuardianRequired: false,
      stair: { kind: 'stairs', x: 48.1, y: 61.4 },
      replace: false
    },
    4: {
      chapter: 4,
      exit: 'South stair after every foe is dead and the ruby is activated.',
      flag: 'done',
      bossRequired: false,
      allFoesRequired: true,
      rubyGuardianRequired: false,
      stair: { kind: 'stairs', x: 50.1, y: 61.2 },
      replace: false
    },
    5: {
      chapter: 5,
      exit: 'No stair. The win is the Undying King.',
      flag: null,
      bossRequired: false,
      allFoesRequired: false,
      stair: null,
      replace: false
    }
  };

  function forLevel(level) {
    var behindBoss = level >= 8 && level <= 10;
    var leverStairs = level === 1;
    return {
      level: level,
      separateEncounters: !leverStairs,
      elevator: 'guardian',
      stairs: leverStairs ? 'lever' : 'bossKill',
      stairsOpenOn: leverStairs ? 'lever' : 'bossKill',
      questItemBehindBoss: behindBoss,
      bossOptionalForElevator: true,
      livingBossBlocksElevator: false,
      nick: NICK_STAIR,
      campaign: CAMPAIGN_GATE,
      authoritativeLeverGate: 'rubyGuardian',
      boss: leverStairs ? null : { status: 'set', separateFromGuardian: true, bossFlagOnIndividual: false },
      guardian: leverStairs ? { key: 'thinOne', count: 6, bossFlagOnIndividual: false } : null,
      appliedToPlay: false
    };
  }

  var LEVELS = [];
  for (var n = 1; n <= 10; n++) LEVELS.push(forLevel(n));

  function liveChapter(n) {
    return LIVE[n] || null;
  }

  /**
   * A level may omit its boss only when stairsOpenOn is 'lever', and only
   * L1 may set that exception. Every other level needs a boss, and its
   * stairs open on the boss kill. A boss flag on one creature, a last-death
   * guardian group, or a boss-gated elevator is an error.
   */
  function validate(rows) {
    var list = rows || LEVELS;
    var errors = [];
    if (!list || list.length !== 10) errors.push('expected one row for each of 10 levels');
    for (var i = 0; i < (list ? list.length : 0); i++) {
      var row = list[i];
      var id = row && row.level;
      var leverStairs = row && row.stairsOpenOn === 'lever';
      if (!row || row.elevator !== 'guardian') errors.push('L' + id + ' elevator must be the guardian');
      if (!row || row.livingBossBlocksElevator !== false) errors.push('L' + id + ' a living boss must not block the elevator');
      if (!row || row.bossOptionalForElevator !== true) errors.push('L' + id + ' boss must stay optional for the elevator');
      if (!row || row.questItemBehindBoss !== (id >= 8)) errors.push('L' + id + ' questItemBehindBoss');
      if (row && (row.elevator === 'boss' || row.authoritativeLeverGate === 'boss')) {
        errors.push('L' + id + ' must not use the boss as the elevator gate');
      }
      if (row && row.boss && row.boss.bossFlagOnIndividual) {
        errors.push('L' + id + ' no single creature wears a boss flag');
      }
      if (row && row.guardian && row.guardian.bossFlagOnIndividual) {
        errors.push('L' + id + ' no single creature wears a boss flag');
      }
      if (row && row.boss && (row.boss.sameAsGuardian || row.boss.firesWhen === 'lastDies' || row.boss.status === 'tbd' || row.boss.pending === 'Sage')) {
        errors.push('L' + id + ' boss is not a last-death guardian group and is not TBD');
      }
      if (leverStairs) {
        if (id !== 1) errors.push('L' + id + ' stairs may open on the lever only on L1');
        if (!row || row.stairs !== 'lever') errors.push('L' + id + ' stairs must open on the lever');
        if (!row || row.boss != null) errors.push('L' + id + ' a lever-stair level has no boss');
      } else if (!row || row.boss == null) {
        errors.push('L' + id + ' stairs require a boss unless stairsOpenOn is lever');
      } else if (!row || row.stairs !== 'bossKill' || row.stairsOpenOn !== 'bossKill') {
        errors.push('L' + id + ' stairs must open on the boss kill');
      }
      if (id === 1) {
        var guardian = row && row.guardian;
        if (!row || row.stairsOpenOn !== 'lever' || row.stairs !== 'lever') errors.push('L1 stairs open on the lever');
        if (!row || row.boss != null) errors.push('L1 has no boss');
        if (!row || row.separateEncounters !== false) errors.push('L1 has no separate boss encounter');
        if (!guardian || guardian.key !== 'thinOne' || guardian.count !== 6 || guardian.bossFlagOnIndividual !== false) {
          errors.push('L1 guardian is the six Thin Ones and none wears a boss flag');
        }
      } else if (!row || row.separateEncounters !== true) {
        errors.push('L' + id + ' guardian and boss must stay separate encounters');
      }
    }
    return errors;
  }

  var api = {
    NICK_STAIR: NICK_STAIR,
    CAMPAIGN_GATE: CAMPAIGN_GATE,
    LIVE: LIVE,
    LEVELS: LEVELS,
    forLevel: forLevel,
    liveChapter: liveChapter,
    validate: validate,
    wired: false
  };

  root.ExitRules = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

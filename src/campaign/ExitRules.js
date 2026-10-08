/**
 * Exit and stair rules as data. Not loaded by index.html.
 * Does not change useChapterDescent, floorTravelReady, or throwCh1LiftLever.
 * Open PR #319 owns the live chapter stair.
 *
 * Nick, on the campaign floors: the ruby guardian and the floor boss are
 * separate encounters. Beating the guardian unlocks the lever and the
 * elevator. A living boss never blocks the elevator. Killing the boss
 * opens the stairs. On L8-L10 the quest item sits behind the boss, so
 * that requirement is a quest gate, not an elevator gate. L1's boss is
 * still TBD, pending Sage (one of the Thin Ones), and is not the guardian.
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
    return {
      level: level,
      separateEncounters: true,
      elevator: 'guardian',
      stairs: 'bossKill',
      questItemBehindBoss: behindBoss,
      bossOptionalForElevator: true,
      livingBossBlocksElevator: false,
      nick: NICK_STAIR,
      campaign: CAMPAIGN_GATE,
      authoritativeLeverGate: 'rubyGuardian',
      boss: level === 1
        ? { status: 'tbd', pending: 'Sage', candidate: 'one of the Thin Ones', mergedWithGuardian: false }
        : { status: 'set', mergedWithGuardian: false },
      appliedToPlay: false
    };
  }

  var LEVELS = [];
  for (var n = 1; n <= 10; n++) LEVELS.push(forLevel(n));

  function liveChapter(n) {
    return LIVE[n] || null;
  }

  /**
   * A TBD L1 boss is valid. A missing key on that row is not an error.
   * Merging the boss into the elevator gate is an error on every level.
   */
  function validate(rows) {
    var list = rows || LEVELS;
    var errors = [];
    if (!list || list.length !== 10) errors.push('expected one row for each of 10 levels');
    for (var i = 0; i < (list ? list.length : 0); i++) {
      var row = list[i];
      var id = row && row.level;
      if (!row || row.separateEncounters !== true) errors.push('L' + id + ' guardian and boss must stay separate encounters');
      if (!row || row.elevator !== 'guardian') errors.push('L' + id + ' elevator must be the guardian');
      if (!row || row.stairs !== 'bossKill') errors.push('L' + id + ' stairs must open on the boss kill');
      if (!row || row.livingBossBlocksElevator !== false) errors.push('L' + id + ' a living boss must not block the elevator');
      if (!row || row.bossOptionalForElevator !== true) errors.push('L' + id + ' boss must stay optional for the elevator');
      if (!row || row.questItemBehindBoss !== (id >= 8)) errors.push('L' + id + ' questItemBehindBoss');
      if (row && (row.elevator === 'boss' || row.authoritativeLeverGate === 'boss')) {
        errors.push('L' + id + ' must not use the boss as the elevator gate');
      }
      if (id === 1) {
        if (!row.boss || row.boss.status !== 'tbd' || row.boss.pending !== 'Sage') {
          errors.push('L1 boss must be TBD pending Sage');
        } else if (row.boss.mergedWithGuardian) {
          errors.push('L1 boss must not be merged with the guardian');
        }
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

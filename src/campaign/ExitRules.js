/**
 * Exit and stair rules as data. Not loaded by index.html.
 * Does not change useChapterDescent, floorTravelReady, or throwCh1LiftLever.
 * Open PR #319 owns the live chapter stair.
 *
 * Nick: a floor's exit opens on its boss kill.
 * New levels (D3-B, locked): the ruby guardian gates the lever, and the
 * lever gates the auto-elevator. The boss is not required for that lever.
 * L8-L10 still keep the quest item behind the boss.
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
    id: 'd3-b',
    decision: 'D3-B',
    leverRequires: ['rubyGuardianDead'],
    elevatorRequires: ['leverPulled'],
    elevatorAuto: true,
    showsTransitionCard: true,
    bossRequiredForLever: false,
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
    return {
      level: level,
      nick: NICK_STAIR,
      campaign: CAMPAIGN_GATE,
      authoritativeLeverGate: 'rubyGuardian',
      bossKillVacuous: level === 1,
      questRequiresBoss: level >= CAMPAIGN_GATE.questBehindBossFrom,
      appliedToPlay: false
    };
  }

  function liveChapter(n) {
    return LIVE[n] || null;
  }

  var api = {
    NICK_STAIR: NICK_STAIR,
    CAMPAIGN_GATE: CAMPAIGN_GATE,
    LIVE: LIVE,
    forLevel: forLevel,
    liveChapter: liveChapter,
    wired: false
  };

  root.ExitRules = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
